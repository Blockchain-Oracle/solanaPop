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

    // Generate a consistent reference key for tracking this transaction
    // This same reference will be used by the frontend to monitor transaction via WebSocket
    const referenceKey = createReferenceFromTokenId(tokenId, walletAddress.toString());
    
    // Create a simple verification transaction - NOT the actual token transfer
    // This follows the Solana Pay pattern of having users sign a lightweight transaction
    // The actual token transfer will happen in the verification endpoint
    const transaction = new Transaction();
    
    // Add a memo instruction for better on-chain visibility
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(`Claiming ${token.symbol} token #${tokenId}`, 'utf8')
    });
    transaction.add(memoInstruction);

    // Add reference to the transaction for later verification
    // This reference is used by the frontend's WebSocket subscription to detect
    // when this transaction completes
    const referenceInstruction = SystemProgram.transfer({
      fromPubkey: walletAddress,
      toPubkey: walletAddress, // Self-transfer of 0 lamports
      lamports: 0
    });
    referenceInstruction.keys.push({
      pubkey: referenceKey.referenceKey,
      isSigner: false,
      isWritable: false
    });
    transaction.add(referenceInstruction);

    // Set the fee payer to the user's wallet
    transaction.feePayer = walletAddress;

    // Get a recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    
    // Serialize and return the unsigned transaction
    const serializedTransaction = transaction.serialize({
      verifySignatures: false,
      requireAllSignatures: false,
    });
    const base64Transaction = serializedTransaction.toString('base64');
    
    // Return the transaction according to Solana Pay spec
    // Include the reference string for the frontend to track via WebSocket
    return res.status(200).json({
      transaction: base64Transaction,
      message: `Sign to claim your ${token.symbol} token!`,
      reference: referenceKey.referenceString
    });
    
  } catch (error) {
    console.error("Error in POST handler:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Verification endpoint - This is where we actually transfer the token after verifying the user's signature
router.post('/api/solana-pay/token/verify', async (req, res) => {
  try {
    const { tokenId, signature } = req.body;

    if (!tokenId || !signature) {
      return res.status(400).json({ error: 'Missing tokenId or signature' });
    }

    console.log(`Verifying transaction for token ${tokenId} with signature ${signature}`);

    // Connect to the Solana network
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');

    // Get transaction details
    const transaction = await connection.getTransaction(signature, {
      commitment: 'confirmed',
    });

    if (!transaction) {
      return res.status(400).json({ error: 'Transaction not found' });
    }

    // Get the wallet address by looking for memo instruction or reference
    const walletAddress = getWalletAddressFromTransaction(transaction, tokenId);
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Could not determine wallet address from transaction' });
    }

    console.log(`Verified transaction from wallet: ${walletAddress}`);

    // Fetch token details
    const token = await storage.getToken(parseInt(tokenId));
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }

    // Check if user is whitelisted
    const isWhitelisted = await storage.isAddressWhitelistedForToken(parseInt(tokenId), walletAddress);
    if (!isWhitelisted) {
      return res.status(403).json({ error: 'Wallet is not whitelisted for this token' });
    }

    // Check if already claimed 
    const alreadyClaimed = await hasUserClaimedToken(parseInt(tokenId), walletAddress);
    if (alreadyClaimed) {
      return res.status(409).json({ error: 'Token already claimed by this wallet' });
    }

    // Now that verification is complete, transfer the token to the user
    const transferResult = await transferToken(
      token.mintAddress,
      walletAddress,
      1  // Transfer 1 token with appropriate decimals
    );

    if (!transferResult.success) {
      return res.status(500).json({ error: 'Token transfer failed', details: transferResult.error });
    }

    // Create claim in database
    await storage.createTokenClaim({
      tokenId: parseInt(tokenId),
      userId: 0, // Default userId since we might not have a user record
      walletAddress,
      transactionId: transferResult.signature,
      reference: signature, // Store the original signature as reference
      status: 'confirmed'
    });

    // Return success response with transfer signature
    return res.status(200).json({
      success: true,
      message: 'Token claimed successfully',
      signature: transferResult.signature,
      explorerUrl: `https://explorer.solana.com/tx/${transferResult.signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`
    });
  } catch (error) {
    console.error('Error verifying transaction:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

// Helper function to extract wallet address from transaction
function getWalletAddressFromTransaction(transaction: any, tokenId: string): string | null {
  try {
    // Wallet address is the first account in the transaction
    const walletPubkey = transaction.transaction.message.accountKeys[0];
    const walletAddress = walletPubkey.toString();
    
    // Verify that the transaction contains a reference to this token
    const reference = createReferenceFromTokenId(parseInt(tokenId), walletAddress);
    
    // Look for a transaction instruction that references our reference pubkey
    const referenceExists = transaction.transaction.message.accountKeys.some((account: PublicKey) => 
      account.toString() === reference.referenceKey.toString()
    );
    
    if (!referenceExists) {
      console.error('Reference not found in transaction');
      return null;
    }
    
    return walletAddress;
  } catch (error) {
    console.error('Error extracting wallet address from transaction:', error);
    return null;
  }
}

export default router; 


// 1. fix the routing and add good header for it @App.tsx 

//  ✅ 2. this page is not been routed @claim.tsx this is routed insread @claim.tsx this is wrong infact delete the @claim.tsx 

// ✅ 3. the qr code should be consistent this qrcode in here @token-claim-qr.tsx should be the one used every where

// 4.after the trasaction is successfull in post('/api/solana-pay/token/:id  i need to call 

// router.post('/api/solana-pay/verify'

