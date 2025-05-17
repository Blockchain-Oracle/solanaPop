import { Keypair } from "@solana/web3.js";

/**
 * Service class to manage different keypairs for different purposes
 */
export class KeyService {
  /**
   * Loads the regular service wallet keypair from environment variables
   * This keypair is used for signing regular token transfers
   */
  static getServiceKeypair(): Keypair {
    const privateKeyString = process.env.SERVICE_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error("SERVICE_PRIVATE_KEY not found in environment variables");
    }
    
    const privateKeyArray = JSON.parse(privateKeyString);
    return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
  }

  /**
   * Loads the compression service wallet keypair
   * This keypair is used specifically for compressed token operations
   */
  static getCompressionKeypair(): Keypair {
    const privateKeyString = process.env.COMPRESSION_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error("COMPRESSION_PRIVATE_KEY not found in environment variables");
    }
    
    const privateKeyArray = JSON.parse(privateKeyString);
    return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
  }

  /**
   * For development/testing, generates new keypairs for both services
   */
  static generateAndLogKeypairs(): {
    service: { publicKey: string; privateKeyArray: number[] };
    compression: { publicKey: string; privateKeyArray: number[] };
  } {
    // Generate regular service keypair
    const serviceKeypair = Keypair.generate();
    const servicePrivateKeyArray = Array.from(serviceKeypair.secretKey);
    
    // Generate compression service keypair
    const compressionKeypair = Keypair.generate();
    const compressionPrivateKeyArray = Array.from(compressionKeypair.secretKey);
    
    console.log('\n=== Regular Service Keypair ===');
    console.log('Public key:', serviceKeypair.publicKey.toString());
    console.log('Private key array (add to .env as SERVICE_PRIVATE_KEY):', 
      JSON.stringify(servicePrivateKeyArray));
    
    console.log('\n=== Compression Service Keypair ===');
    console.log('Public key:', compressionKeypair.publicKey.toString());
    console.log('Private key array (add to .env as COMPRESSION_PRIVATE_KEY):', 
      JSON.stringify(compressionPrivateKeyArray));
    
    return {
      service: {
        publicKey: serviceKeypair.publicKey.toString(),
        privateKeyArray: servicePrivateKeyArray
      },
      compression: {
        publicKey: compressionKeypair.publicKey.toString(),
        privateKeyArray: compressionPrivateKeyArray
      }
    };
  }

  /**
   * Helper to check if compression keypair is properly configured
   */
  static isCompressionKeypairConfigured(): boolean {
    try {
      this.getCompressionKeypair();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Helper to fund a keypair with SOL for gas fees
   */
  static async fundKeypair(connection: any, keypair: Keypair, amount: number = 1): Promise<string> {
    try {
      const signature = await connection.requestAirdrop(
        keypair.publicKey,
        amount * 1_000_000_000 // Convert SOL to lamports
      );
      await connection.confirmTransaction(signature);
      return signature;
    } catch (error) {
      console.error('Error funding keypair:', error);
      throw error;
    }
  }
}

// For backwards compatibility
export function getServiceKeypair(): Keypair {
  return KeyService.getServiceKeypair();
}

export function getCompressionKeypair(): Keypair {
  return KeyService.getCompressionKeypair();
}

export function generateAndLogKeypair(): { publicKey: string, privateKeyArray: number[] } {
  const { service } = KeyService.generateAndLogKeypairs();
  return service;
} 