import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { createQR, encodeURL } from '@solana/pay';

// Types for QR code generation options
export type SolanaPayQROptions = {
  tokenId: number;
  baseUrl: string;
  label?: string;
  message?: string;
};

// Create a QR code for transaction request
export function createTokenClaimQR(options: SolanaPayQROptions) {
  try {
    const { tokenId, baseUrl, label, message } = options;
    
    // Create the URL for the Solana Pay transaction request
    const urlParams = new URL(`${baseUrl}/api/solana-pay/token/${tokenId}`);
    
    // Create a Solana Pay URL with the label and message
    const solanaPayUrl = encodeURL({
      link: urlParams,
      label: label || "Claim Token",
      message: message || "Scan to claim your token"
    });
    
    // Generate QR code from the Solana Pay URL
    const qrCode = createQR(solanaPayUrl);
    
    return qrCode;
  } catch (error) {
    console.error("Error creating QR code:", error);
    throw error;
  }
}

// Use with useQuery for React-Query to decode the QR code
export async function getQRCodeAsBase64(qrCode: any) {
  try {
    const qrBlob = await qrCode.getRawData('png');
    if (!qrBlob) return null;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          resolve(event.target.result);
        } else {
          reject(new Error('Failed to convert QR code to base64'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read QR code blob'));
      reader.readAsDataURL(qrBlob);
    });
  } catch (error) {
    console.error("Error converting QR to base64:", error);
    return null;
  }
}

// Function to verify a transaction after it's been submitted
export async function verifyTransaction(
  connection: Connection,
  signature: string
) {
  try {
    // Get transaction status
    const status = await connection.getSignatureStatus(signature);
    if (!status || !status.value) {
      throw new Error('Transaction not found');
    }
    
    // Check if transaction was successful
    if (status.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }
    
    return { signature, status: status.value.confirmationStatus || 'processed' };
  } catch (error) {
    console.error("Error verifying transaction:", error);
    throw error;
  }
}

// Function to parse a transaction from base64
export function parseTransactionFromBase64(transactionBase64: string): Transaction {
  const transactionBinary = Buffer.from(transactionBase64, 'base64');
  return Transaction.from(transactionBinary);
} 