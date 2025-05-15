import express from 'express';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import crypto from 'crypto';
import { storage } from '../storage';
import { hasUserClaimedToken } from '../storage';

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
    
    // Return label and icon for the wallet UI
    return res.status(200).json({
      label: `Claim ${token.name} (${token.symbol})`,
      icon: "https://yourdomain.com/logo.png" // Replace with your logo URL
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
    
    const walletAddress = new PublicKey(account);
    
    // Get token details
    const token = await storage.getToken(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
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
    
    // Create a transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    
    // Create reference for tracking this transaction
    const reference = new Keypair().publicKey;
    
    const transaction = new Transaction({
      feePayer: walletAddress,
      blockhash,
      lastValidBlockHeight,
    });
    
    // If you have a token mint address, you'd add a token transfer instruction here
    // For now, we'll use a simple system instruction as a placeholder
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: walletAddress,
        toPubkey: walletAddress, // Self-transfer as a placeholder
        lamports: 0, // 0 SOL
      })
    );
    
    // Add reference to transaction for tracking
    transaction.add(
      new TransactionInstruction({
        keys: [{ pubkey: reference, isSigner: false, isWritable: false }],
        programId: SystemProgram.programId,
        data: Buffer.from([])
      })
    );
    
    // Serialize transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
    });
    
    const base64Transaction = serializedTransaction.toString('base64');
    
    // Return transaction for signing
    return res.status(200).json({
      transaction: base64Transaction,
      message: `Claim your ${token.symbol} token!`
    });
    
  } catch (error) {
    console.error("Error in POST handler:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Verification endpoint - This can be polled after the transaction is submitted
router.post('/api/solana-pay/verify', async (req, res) => {
  try {
    const { signature, tokenId, walletAddress } = req.body;
    
    if (!signature || !tokenId || !walletAddress) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    
    // Verify transaction on-chain
    const transactionStatus = await connection.getSignatureStatus(signature);
    if (!transactionStatus.value || transactionStatus.value.err) {
      return res.status(400).json({ error: "Invalid transaction" });
    }
    
    // Create token claim in database
    const claim = await storage.createTokenClaim({
      tokenId: parseInt(tokenId),
      userId: 0, // System user or derive from wallet
      walletAddress,
      transactionId: signature
    });
    
    return res.status(200).json({ success: true, claim });
  } catch (error) {
    console.error("Error verifying transaction:", error);
    return res.status(500).json({ error: "Failed to verify transaction" });
  }
});

export default router; 