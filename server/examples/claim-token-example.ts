// import express, { Request, Response } from 'express';
// import { Keypair, PublicKey } from '@solana/web3.js';
// import { transferToken } from '../services/transfer-service';
// import { storage } from '../storage';

// const router = express.Router();

// /**
//  * Example API endpoint for claiming tokens
//  * This demonstrates a real-world usage of the transfer-service in an API context
//  */
// router.post('/api/claim-token', async (req: Request, res: Response) => {
//   try {
//     const { tokenId, walletAddress, userId } = req.body;
    
//     // Validate request
//     if (!tokenId || !walletAddress || !userId) {
//       return res.status(400).json({ 
//         success: false, 
//         error: 'Missing required fields' 
//       });
//     }
    
//     // 1. Check if token exists
//     const token = await storage.getToken(parseInt(tokenId));
//     if (!token) {
//       return res.status(404).json({
//         success: false,
//         error: 'Token not found'
//       });
//     }
    
//     // 2. Check if token has a mint address (required for transfers)
//     if (!token.mintAddress) {
//       return res.status(400).json({
//         success: false,
//         error: 'Token does not have a valid mint address'
//       });
//     }
    
//     // 3. Check if user has already claimed this token
//     const tokenClaims = await storage.getTokenClaimsByWallet(walletAddress);
//     const existingClaim = tokenClaims.some(claim => claim.tokenId === parseInt(tokenId));
//     if (existingClaim) {
//       return res.status(400).json({
//         success: false,
//         error: 'Token already claimed by this wallet'
//       });
//     }
    
//     // 4. Check token supply limits
//     const claimedCount = token.claimed || 0; // Handle null case
//     if (claimedCount >= token.supply) {
//       return res.status(400).json({
//         success: false,
//         error: 'Token supply exhausted'
//       });
//     }
    
//     // 5. Generate a unique reference for this claim
//     // This will be stored in the transaction and can be used for verification
//     const reference = Keypair.generate().publicKey;
    
//     // 6. Perform the token transfer
//     const transferResult = await transferToken(
//       token.mintAddress,
//       walletAddress,
//       1, // Send 1 token
//       reference
//     );
    
//     if (!transferResult.success) {
//       return res.status(500).json({
//         success: false,
//         error: `Transfer failed: ${transferResult.error}`
//       });
//     }
    
//     // 7. Record the claim in the database
//     const claim = await storage.createTokenClaim({
//       tokenId: parseInt(tokenId),
//       userId: parseInt(userId),
//       walletAddress,
//       transactionId: transferResult.signature,
//       reference: reference.toString(),
//       status: 'completed'
//     });
    
//     // 8. Update the token claimed count
//     await storage.updateTokenClaimed(parseInt(tokenId));
    
//     // 9. Return success response with transaction details
//     return res.status(200).json({
//       success: true,
//       message: 'Token claimed successfully',
//       claim,
//       transaction: {
//         signature: transferResult.signature,
//         explorerUrl: transferResult.explorerUrl
//       }
//     });
    
//   } catch (error) {
//     console.error('Token claim error:', error);
//     return res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error occurred'
//     });
//   }
// });

// export default router;

// /**
//  * Example use case:
//  * 
//  * POST /api/claim-token
//  * {
//  *   "tokenId": "123",
//  *   "walletAddress": "8JmRdHqUJZ9Y3XKMJp14F7qWvhrPWjwFeCM7ooD7verm",
//  *   "userId": "456"
//  * }
//  * 
//  * Success Response:
//  * {
//  *   "success": true,
//  *   "message": "Token claimed successfully",
//  *   "claim": { ... claim details ... },
//  *   "transaction": {
//  *     "signature": "5UvteSfJrJF7s18NtUfVWN9xfQPmxjFRDXDSzYbNNEvBbBy5F2M5252cPfjJB1hJvSiTQGhY8zGPPUvoWUgKLnkP",
//  *     "explorerUrl": "https://explorer.solana.com/tx/5UvteSfJrJF7s18NtUfVWN9xfQPmxjFRDXDSzYbNNEvBbBy5F2M5252cPfjJB1hJvSiTQGhY8zGPPUvoWUgKLnkP?cluster=devnet"
//  *   }
//  * }
//  */ 