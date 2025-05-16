import express from 'express';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction, ParsedAccountData } from '@solana/web3.js';
import crypto from 'crypto';
import { storage } from '../storage';
import { hasUserClaimedToken } from '../storage';
import { transferToken } from '../services/transfer-service';
import { getServiceKeypair } from '../services/keys-service';
import { createReferenceFromTokenId } from '@/lib/solana-pay';
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";

const router = express.Router();

// Utility to create signed payloads
function generateSignedQrPayload(tokenId: number, expiryMinutes: number = 30): string {
  const timestamp = Date.now();
  const expiry = new Date(timestamp);
  expiry.setMinutes(expiry.getMinutes() + expiryMinutes);
  
  const payload = `${tokenId}:${timestamp}:${expiry.getTime()}`;
  const secret = process.env.QR_SIGNATURE_SECRET || "default-secret-change-me";
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  
  return `${payload}:${signature}`;
}

// Verify signed QR payload
function verifySignedQrPayload(signedPayload: string): { 
  isValid: boolean; 
  tokenId?: number; 
  isExpired?: boolean;
} {
  try {
    const [tokenIdStr, timestampStr, expiryStr, signature] = signedPayload.split(':');
    
    if (!tokenIdStr || !timestampStr || !expiryStr || !signature) {
      return { isValid: false };
    }
    
    const tokenId = parseInt(tokenIdStr);
    const expiry = parseInt(expiryStr);
    
    // Check if expired
    if (Date.now() > expiry) {
      return { isValid: false, tokenId, isExpired: true };
    }
    
    // Reconstruct payload and verify signature
    const payload = `${tokenIdStr}:${timestampStr}:${expiryStr}`;
    const secret = process.env.QR_SIGNATURE_SECRET || "default-secret-change-me";
    
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    if (signature !== expectedSignature) {
      return { isValid: false, tokenId };
    }
    
    return { isValid: true, tokenId };
  } catch (error) {
    console.error("Error verifying signed payload:", error);
    return { isValid: false };
  }
}

// Solana connection setup
const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');

// GET handler - This gets called when a wallet scans the QR code
// Following Solana Pay Transaction Request specification
router.get('/api/solana-pay/token/:id', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    if (isNaN(tokenId)) {
      return res.status(400).json({ error: "Invalid token ID" });
    }
    
    // Get token details
    const token = await storage.getToken(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    
    // Return label and icon according to Solana Pay specification
    return res.status(200).json({
      label: `Claim ${token.name} (${token.symbol})`,
      icon: `${req.protocol}://${req.get('host')}/logo.png` // Should point to your app logo
    });
  } catch (error) {
    console.error("Error in GET handler:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST handler - This is called when a user approves the transaction in their wallet
router.post('/api/solana-pay/token/:id', async (req, res) => {
  try {
    const tokenId = parseInt(req.params.id);
    if (isNaN(tokenId)) {
      return res.status(400).json({ error: "Invalid token ID" });
    }
    
    // Get account (wallet address) from the request
    const { account } = req.body;
    if (!account) {
      return res.status(400).json({ error: "Missing required parameter: account" });
    }
    
    let walletAddress;
    try {
      walletAddress = new PublicKey(account);
    } catch (e) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }
    
    // Get token details
    const token = await storage.getToken(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    
    if (!token.mintAddress) {
      return res.status(400).json({ error: "Token has no mint address" });
    }
    
    // Check if user is whitelisted (if whitelist is enabled)
    if (token.whitelistEnabled) {
      const isWhitelisted = await storage.isAddressWhitelistedForToken(tokenId, walletAddress.toString());
      if (!isWhitelisted) {
        return res.status(403).json({ 
          error: "Not whitelisted", 
          message: "Your wallet is not whitelisted for this token" 
        });
      }
    }
    
    // Check if token has already been claimed by this wallet
    const hasAlreadyClaimed = await hasUserClaimedToken(tokenId, walletAddress.toString());
    if (hasAlreadyClaimed) {
      return res.status(400).json({ 
        error: "Already claimed", 
        message: "You have already claimed this token" 
      });
    }

    const referenceKey = createReferenceFromTokenId(tokenId, walletAddress.toString());
    const serviceKeypair = getServiceKeypair();
    
    // Create a transaction to transfer the token
    const transaction = new Transaction();
    
    // 1. Get token decimals
    const tokenInfo = await connection.getParsedAccountInfo(new PublicKey(token.mintAddress));
    let decimals = 0;
    if (tokenInfo.value && 'parsed' in tokenInfo.value.data) {
      decimals = (tokenInfo.value.data as ParsedAccountData).parsed.info.decimals || 0;
    }

    // 2. Get source token account (service wallet)
    const sourceATA = await getAssociatedTokenAddress(
      new PublicKey(token.mintAddress),
      serviceKeypair.publicKey
    );

    // 3. Get destination token account (recipient wallet)
    const destinationATA = await getAssociatedTokenAddress(
      new PublicKey(token.mintAddress),
      walletAddress
    );

    // 4. Check if destination ATA exists, if not create it
    const destinationAccount = await connection.getAccountInfo(destinationATA);
    if (!destinationAccount) {
      // Import if not already imported: import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";
      const createAtaInstruction = createAssociatedTokenAccountInstruction(
        walletAddress, // fee payer
        destinationATA, // ATA address
        walletAddress, // owner
        new PublicKey(token.mintAddress) // mint
      );
      transaction.add(createAtaInstruction);
    }

    // 5. Add memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(`Claiming token ${token.symbol} #${tokenId}`, 'utf8')
    });
    transaction.add(memoInstruction);

    // 6. Add token transfer instruction
    const transferAmount = 1 * Math.pow(10, decimals); // 1 token with correct decimals
    const transferInstruction = createTransferInstruction(
      sourceATA, // source
      destinationATA, // destination
      serviceKeypair.publicKey, // owner of source (service wallet)
      transferAmount // amount with decimals
    );
    transaction.add(transferInstruction);

    // 7. Add reference to the transaction for later verification
    const referenceInstruction = SystemProgram.transfer({
      fromPubkey: walletAddress,
      toPubkey: walletAddress,
      lamports: 0
    });
    referenceInstruction.keys.push({
      pubkey: referenceKey.referenceKey,
      isSigner: false,
      isWritable: false
    });
    transaction.add(referenceInstruction);

    // 8. Set the fee payer to the user's wallet
    transaction.feePayer = walletAddress;

    // 9. Get a recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // 10. Partially sign the transaction with the service wallet
    transaction.partialSign(serviceKeypair);
    
    // Serialize and return the unsigned transaction
    const serializedTransaction = transaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });
    const base64Transaction = serializedTransaction.toString('base64');
    
    // Return the transaction according to Solana Pay spec
    return res.status(200).json({
      transaction: base64Transaction,
      message: `Claim your ${token.symbol} token!`
    });
    
  } catch (error) {
    console.error("Error in POST handler:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Verification endpoint
router.post('/api/solana-pay/token/verify', async (req, res) => {
  try {
    const { tokenId, signature } = req.body;
    if (!tokenId || !signature) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    
    // Get token details
    const token = await storage.getToken(parseInt(tokenId));
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    
    // Verify the transaction
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed'
    });
    
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    // Get the wallet address from the transaction
    const walletAddress = transaction.transaction.message.accountKeys[0].toString();
    
    // Now just create the claim and return success
    const claim = await storage.createTokenClaim({
      tokenId: parseInt(tokenId),
      userId: 0,
      walletAddress: walletAddress,
      transactionId: signature
    });
    
    return res.status(200).json({
      success: true,
      signature: signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${process.env.SOLANA_NETWORK || 'devnet'}`,
      claim,
      message: `Successfully claimed ${token.symbol} token!`
    });
    
  } catch (error) {
    console.error("Error in verification handler:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router; 


// 1. fix the routing and add good header for it @App.tsx 

//  ✅ 2. this page is not been routed @claim.tsx this is routed insread @claim.tsx this is wrong infact delete the @claim.tsx 

// ✅ 3. the qr code should be consistent this qrcode in here @token-claim-qr.tsx should be the one used every where

// 4.after the trasaction is successfull in post('/api/solana-pay/token/:id  i need to call 

// router.post('/api/solana-pay/verify'

