import { Keypair } from "@solana/web3.js";

/**
 * Loads the service wallet keypair from environment variables
 * This keypair is used for signing token transfers
 */
export function getServiceKeypair(): Keypair {
  // In production, use env variables or secure key management
  const privateKeyString = process.env.SERVICE_PRIVATE_KEY;
  if (!privateKeyString) {
    throw new Error("SERVICE_PRIVATE_KEY not found in environment variables");
  }
  
  console.log(privateKeyString,"privateKeyString");
  const privateKeyArray = JSON.parse(privateKeyString);
  return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
}

/**
 * For development/testing, generates a new keypair
 */
export function generateAndLogKeypair(): { publicKey: string, privateKeyArray: number[] } {
  const keypair = Keypair.generate();
  const privateKeyArray = Array.from(keypair.secretKey);
  
  console.log('Public key:', keypair.publicKey.toString());
  console.log('Private key array (add to .env):', JSON.stringify(privateKeyArray));
  
  return {
    publicKey: keypair.publicKey.toString(),
    privateKeyArray
  };
} 