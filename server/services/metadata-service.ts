import { v4 as uuidv4 } from 'uuid';
import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import FormData from 'form-data';
import { Readable } from 'stream';

/**
 * Service for interacting with Pinata IPFS
 */
class PinataService {
  private apiClient: AxiosInstance;
  private uploadClient: AxiosInstance;
  private jwt: string;
  private gateway: string;
  private initialized = false;
  
  constructor() {
    this.jwt = process.env.PINATA_JWT || '';
    this.gateway = process.env.PINATA_GATEWAY_URL || 'gateway.pinata.cloud';
    
    // Create API client
    this.apiClient = axios.create({
      baseURL: 'https://api.pinata.cloud/v3',
      headers: {
        'Authorization': `Bearer ${this.jwt}`
      }
    });
    
    // Create upload client
    this.uploadClient = axios.create({
      baseURL: 'https://uploads.pinata.cloud/v3',
      headers: {
        'Authorization': `Bearer ${this.jwt}`
      }
    });
  }
  
  /**
   * Verify that the JWT is set and valid
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('🔍 Initializing Pinata client...');
      
      if (!this.jwt) {
        throw new Error('PINATA_JWT environment variable is not set');
      }
      
      // Test API connection
      await this.apiClient.get('/files/public');
      
      this.initialized = true;
      console.log('✅ Pinata client initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Pinata client:', error);
      throw error;
    }
  }
  
  /**
   * Store a file on IPFS via Pinata
   * @param fileBuffer Buffer containing file data
   * @param metadata Optional metadata for the file
   * @returns CID of the stored file
   */
  async storeFile(fileBuffer: Buffer, metadata?: { name: string, keyvalues: Record<string, string> }): Promise<string> {
    try {
      console.log('🔍 Storing file on IPFS via Pinata...');
      
      await this.initialize();
      
      // Create form data with file
      const formData = new FormData();
      formData.append('network', 'public'); // Use public network
      
      // Create a readable stream from buffer and append to form
      const stream = Readable.from(fileBuffer);
      formData.append('file', stream, {
        filename: metadata?.name || 'file',
        contentType: 'application/octet-stream'
      });
      
      // Add metadata if provided
      if (metadata) {
        formData.append('name', metadata.name);
        
        if (metadata.keyvalues) {
          formData.append('keyvalues', JSON.stringify(metadata.keyvalues));
        }
      }
      
      // Upload to Pinata
      const response = await this.uploadClient.post('/files', formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      
      const cid = response.data.data.cid;
      
      if (!cid) {
        throw new Error('No CID returned from Pinata');
      }
      
      console.log(`✅ File stored on IPFS with CID: ${cid}`);
      
      return cid;
    } catch (error) {
      console.error('❌ Error storing file on IPFS:', error);
      throw error;
    }
  }
  
  /**
   * Store JSON on IPFS via Pinata
   * @param jsonData JSON data to store
   * @param metadata Optional metadata for the JSON
   * @returns CID of the stored JSON
   */
  async storeJSON(jsonData: any, metadata?: { name: string, keyvalues: Record<string, string> }): Promise<string> {
    try {
      console.log('🔍 Storing JSON on IPFS via Pinata...');
      
      await this.initialize();
      
      // Create form data with JSON
      const formData = new FormData();
      formData.append('network', 'public'); // Use public network
      formData.append('file', JSON.stringify(jsonData), {
        filename: metadata?.name || 'file.json',
        contentType: 'application/json'
      });
      
      // Add metadata if provided
      if (metadata) {
        formData.append('name', metadata.name);
        
        if (metadata.keyvalues) {
          formData.append('keyvalues', JSON.stringify(metadata.keyvalues));
        }
      }
      
      // Upload to Pinata
      const response = await this.uploadClient.post('/files', formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      
      const cid = response.data.data.cid;
      
      if (!cid) {
        throw new Error('No CID returned from Pinata');
      }
      
      console.log(`✅ JSON stored on IPFS with CID: ${cid}`);
      
      return cid;
    } catch (error) {
      console.error('❌ Error storing JSON on IPFS:', error);
      throw error;
    }
  }
  
  /**
   * Get a public IPFS gateway URL for a CID
   * @param cid Content identifier
   * @returns IPFS gateway URL
   */
  getIPFSUrl(cid: string): string {
    if (!cid) {
      throw new Error('CID is required');
    }
    // Return public IPFS gateway URL through Pinata gateway
    return `https://${this.gateway}/ipfs/${cid}`;
  }
}

// Create a singleton instance
const pinataService = new PinataService();

/**
 * Uploads token metadata and image to IPFS via Pinata
 */
export async function uploadTokenMetadata(
  name: string,
  symbol: string,
  description: string,
  imageBuffer: Buffer
): Promise<{
  success: boolean;
  metadataUri?: string;
  metadata?: any;
  error?: string;
}> {
  try {
    // Validate Pinata configuration
    if (!process.env.PINATA_JWT) {
      throw new Error('PINATA_JWT environment variable is not set');
    }

    // Create a temporary file for better naming
    const tempDir = os.tmpdir();
    const imagePath = path.join(tempDir, `${uuidv4()}.png`);
    
    // Write the buffer to a temporary file
    fs.writeFileSync(imagePath, imageBuffer);
    
    // 1. Upload image to IPFS via Pinata
    const imageCid = await pinataService.storeFile(
      imageBuffer,
      {
        name: `${name} Token Image`,
        keyvalues: {
          tokenSymbol: symbol
        }
      }
    );
    
    // Clean up the temporary file 
    fs.unlinkSync(imagePath);
    
    // Get the IPFS gateway URL for the image
    const imageUrl = pinataService.getIPFSUrl(imageCid);

    // 2. Create and upload metadata JSON
    const metadata = {
      name,
      symbol,
      description,
      image: imageUrl,
      properties: {
        files: [{ uri: imageUrl, type: "image/png" }]
      }
    };

    // Upload JSON metadata to IPFS
    const metadataCid = await pinataService.storeJSON(
      metadata,
      {
        name: `${name} Token Metadata`,
        keyvalues: {
          tokenSymbol: symbol
        }
      }
    );
      
    // Get the metadata URI
    const metadataUri = pinataService.getIPFSUrl(metadataCid);

    console.log(`Uploaded token metadata to IPFS. CID: ${metadataCid}`);
    
    return {
      success: true,
      metadataUri,
      metadata
    };
  } catch (error) {
    console.error("Metadata upload to IPFS failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
} 