import express from 'express';
import multer from 'multer';
import { storage } from '../storage';
import { createToken } from '../services/token-service';
import { uploadTokenMetadata } from '../services/metadata-service';
import { compressionService } from '../services/compression-service';

const router = express.Router();

// Set up multer for memory storage (files stored in memory not disk)
const upload = multer({ storage: multer.memoryStorage() });

interface TokenResult {
  success: boolean;
  mint?: string;
  mintAddress?: string;
  signature?: string;
  tokenPoolId?: string;
  error?: string;
}

// Create token endpoint
router.post('/api/tokens', upload.single('image'), async (req, res) => {
  try {
    const { 
      name, 
      symbol, 
      description, 
      supply, 
      decimals, 
      creatorId, 
      creatorAddress, 
      whitelistEnabled,
      isCompressed
    } = req.body;
    
    // Basic validation
    if (!name || !symbol || !description || !supply) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Check if image is provided
    // if (!req.file) {
    //   return res.status(400).json({ error: 'Token image is required' });
    // }
    
    // 1. Upload metadata
    // const metadataResult = await uploadTokenMetadata(
    //   name,
    //   symbol,
    //   description,
    //   req.file.buffer
    // );
    
    // if (!metadataResult.success) {
    //   return res.status(500).json({ error: metadataResult.error });
    // }
    
    let tokenResult: TokenResult;
    if (isCompressed === 'true') {
      console.log("COMPRESSING TOKEN");
      const compressedResult = await compressionService.createCompressedToken(
        name,
        symbol,
        parseInt(decimals) || 9,
        parseInt(supply)
      );
      console.log("COMPRESSED RESULT", compressedResult);
      tokenResult = {
        success: true,
        mint: compressedResult.mint,
        signature: compressedResult.signature,
        tokenPoolId: compressedResult.tokenPoolId.toString()
      };
    } else {
      console.log("CREATING UNCOMPRESSED TOKEN");
      tokenResult = await createToken(
        name,
        symbol,
        /*metadataResult.metadataUri*/  '',
        parseInt(decimals) || 6,
        parseInt(supply)
      );
      console.log("UNCOMPRESSED TOKEN RESULT", tokenResult);
    }
    
    if (!tokenResult.success || tokenResult.error) {
      return res.status(500).json({ error: tokenResult.error || 'Token creation failed' });
    }
    
    // // 3. Store token in database
    // const newToken = await storage.createToken({
    //   name,
    //   symbol, 
    //   description,
    //   supply: parseInt(supply),
    //   creatorId: parseInt(creatorId),
    //   creatorAddress,
    //   mintAddress: tokenResult.mint || tokenResult.mintAddress || '',
    //   metadataUri: /*metadataResult.metadataUri*/ '',
    //   whitelistEnabled: whitelistEnabled === 'true',
    //   isCompressed: isCompressed === 'true',
    //   compressionState: isCompressed === 'true' ? 'compressed' : 'uncompressed',
    //   tokenPoolId: tokenResult.tokenPoolId || null,
    // });
    
    return res.status(201).json({
      success: true,
      token: {
        // ...newToken,
        mintAddress: tokenResult.mint || tokenResult.mintAddress || '',
        metadataUri: /*metadataResult.metadataUri*/ '',
        signature: tokenResult.signature || '',
      }
    });
  } catch (error) {
    console.error("Token creation API error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error occurred" });
  }
});

// Get token by ID
router.get('/api/tokens/:id', async (req, res) => {
  try {
    console.log("GET TOKEN BY ID");
    const tokenId = parseInt(req.params.id);
    console.log("TOKEN ID", tokenId);
    if (isNaN(tokenId)) {
      return res.status(400).json({ error: "Invalid token ID" });
    }
    
    const token = await storage.getToken(tokenId);
    if (!token) {
      return res.status(404).json({ error: "Token not found" });
    }
    
    return res.status(200).json(token);
  } catch (error) {
    console.error("Error fetching token:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error occurred" });
  }
});

// Get all tokens
router.get('/api/tokens', async (req, res) => {
  try {
    const { creatorId, walletAddress } = req.query;
    
    let tokens;
    if (creatorId) {
      tokens = await storage.getTokensByCreator(parseInt(creatorId as string));
    } else if (walletAddress) {
      tokens = await storage.getTokensByCreatorWallet(walletAddress as string);
    } else {
      tokens = await storage.getAllTokens();
    }
    
    return res.status(200).json(tokens);
  } catch (error) {
    console.error("Error fetching tokens:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error occurred" });
  }
});

// Transfer compressed token endpoint
router.post('/api/tokens/transfer/compressed', async (req, res) => {
  try {
    const { mintAddress, recipientAddress, amount } = req.body;
    
    // Basic validation
    if (!mintAddress || !recipientAddress || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if token exists and is compressed
    // const token = await storage.getTokenByMintAddress(mintAddress);
    // if (!token) {
    //   return res.status(404).json({ error: 'Token not found' });
    // }
    // if (!token.isCompressed) {
    //   return res.status(400).json({ error: 'Token is not compressed' });
    // }

    // Execute transfer
    const result = await compressionService.transferCompressedTokens(
      mintAddress,
      recipientAddress,
      amount
    );

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      signature: result.signature,
      explorerUrl: result.explorerUrl
    });

  } catch (error) {
    console.error('Error transferring compressed token:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

router.post('/api/tokens/mint/compressed', async (req, res) => {
  try {
    const { mintAddress, amount } = req.body;
    
    if (!mintAddress || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Basic validation
    const result = await compressionService.mintCompressedTokens(
      mintAddress,
      amount
    );
    return res.status(200).json({
      success: true,
      signature: result.signature,
      mintToSignature: result.signature
    });
  } catch (error) {
    console.error('Error minting compressed token:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});



export default router; 