import { v4 as uuidv4 } from 'uuid';
import { PinataSDK } from 'pinata';

// Initialize Pinata client when running in browser
const getPinataClient = () => {
  if (typeof window !== 'undefined') {
    return new PinataSDK({
      pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT || '',
      pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL || '',
    });
  }
  return null;
};

/**
 * Uploads token metadata and image to IPFS via Pinata
 * Falls back to simulation in environments where Pinata is not configured
 */
export async function uploadTokenMetadata(
  name: string,
  symbol: string,
  description: string,
  imageFile: File | Blob
): Promise<{
  success: boolean;
  metadataUri?: string;
  metadata?: any;
  error?: string;
}> {
  try {
    const pinata = getPinataClient();
    
    // If Pinata client is available and configured, use it
    if (pinata && process.env.NEXT_PUBLIC_PINATA_JWT) {
      console.log('Using Pinata for IPFS storage');
      
      // 1. Upload image to IPFS
      const imageUploadResult = await pinata.upload.public.file(imageFile)
        .addMetadata({
          name: `${name} Token Image`,
          keyvalues: {
            tokenSymbol: symbol
          }
        });
        
      // Get IPFS URL for the image
      const imageUrl = await pinata.gateways.public.convert(imageUploadResult.cid);
      
      // 2. Create and upload metadata JSON
      const metadata = {
        name,
        symbol,
        description,
        image: imageUrl,
        properties: {
          files: [{ uri: imageUrl, type: imageFile.type }]
        }
      };
      
      // Upload metadata to IPFS
      const metadataUploadResult = await pinata.upload.public.json(metadata)
        .addMetadata({
          name: `${name} Token Metadata`,
          keyvalues: {
            tokenSymbol: symbol
          }
        });
        
      // Get IPFS URI for metadata
      const metadataUri = await pinata.gateways.public.convert(metadataUploadResult.cid);
      
      return {
        success: true,
        metadataUri,
        metadata
      };
    } else {
      console.log('Pinata not configured, falling back to simulation');
      // Fall back to simulation for development
      const imageId = uuidv4();
      const imageUrl = await simulateImageUpload(imageFile, imageId);
      
      const metadata = {
        name,
        symbol,
        description,
        image: imageUrl,
        properties: {
          files: [{ uri: imageUrl, type: imageFile.type }]
        }
      };
      
      const metadataId = uuidv4();
      const metadataUri = await simulateMetadataUpload(metadata, metadataId);
      
      return {
        success: true,
        metadataUri,
        metadata
      };
    }
  } catch (error) {
    console.error("Metadata upload failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Simulates image upload and returns a URL
 * Used as fallback when Pinata is not configured
 */
async function simulateImageUpload(file: File | Blob, id: string): Promise<string> {
  return new Promise((resolve) => {
    // In production, replace this with actual upload logic
    // For demo purposes, we'll create an object URL
    if (typeof window !== 'undefined') {
      const objectUrl = URL.createObjectURL(file);
      console.log(`[DEV] Simulated image upload: ${id}`);
      
      // Simulate network delay
      setTimeout(() => {
        resolve(`https://example-storage.com/token-images/${id}`);
      }, 500);
    } else {
      resolve(`https://example-storage.com/token-images/${id}`);
    }
  });
}

/**
 * Simulates metadata upload and returns a URI
 * Used as fallback when Pinata is not configured
 */
async function simulateMetadataUpload(metadata: any, id: string): Promise<string> {
  return new Promise((resolve) => {
    // In production, replace this with actual upload logic
    console.log(`[DEV] Simulated metadata upload: ${id}`, metadata);
    
    // Simulate network delay
    setTimeout(() => {
      resolve(`https://example-storage.com/token-metadata/${id}.json`);
    }, 300);
  });
} 