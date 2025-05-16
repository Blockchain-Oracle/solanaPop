import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { createQR, encodeURL, findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';

// Types for QR code generation options
export type SolanaPayQROptions = {
  tokenId: number;
  baseUrl: string;
  label?: string;
  message?: string;
  recipient?: string; // Recipient wallet address if using transfer request
};

// Create a QR code for transaction request
export function createTokenClaimQR(options: SolanaPayQROptions) {
  try {
    const { tokenId, baseUrl, label, message, recipient } = options;
    
    let url;
    
    if (recipient) {
      // Create a transfer request (simpler, non-interactive)
      // This is for the "solana:<recipient>?..." format
      try {
        const recipientPublicKey = new PublicKey(recipient);
        
        // Create a reference to track this specific transaction
        const reference = new Uint8Array(32);
        // Use tokenId as a reference for this transaction
        reference.set(Buffer.from(tokenId.toString().padStart(32, '0')));
        
        // Convert to PublicKey and put in array
        const referencePublicKey = new PublicKey(reference);
        
        // Create a Solana Pay transfer URL
        url = encodeURL({
          recipient: recipientPublicKey,
          reference: [referencePublicKey], // Array of PublicKeys
          label: label || "Claim Token",
          message: message || `Scan to claim your token`
        });
      } catch (error) {
        console.error("Error creating transfer request:", error);
        // Fall back to transaction request
        const apiUrl = new URL(`${baseUrl}/api/solana-pay/token/${tokenId}`);
        console.log(apiUrl,"apiUrl");
        url = encodeURL({
          link: apiUrl,
          label: label || "Claim Token",
          message: message || "Scan to claim your token"
        });
      }
    } else {
      // Create a transaction request (interactive)
      // This is for the "solana:<link>" format
      const apiUrl = new URL(`${baseUrl}/api/solana-pay/token/${tokenId}`);
      console.log(apiUrl,"apiUrl");
      url = encodeURL({
        link: apiUrl,
        label: label || "Claim Token",
        message: message || "Scan to claim your token"
      });
    }
    
    // Generate QR code from the URL
    const qrCode = createQR(url);
    
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

// Function to verify a transaction using reference
export async function verifyTransaction(
  connection: Connection,
  reference: PublicKey,
  recipient?: PublicKey, 
  amount?: BigNumber
) {
  try {
    // Find the transaction with the reference
    const signatureInfo = await findReference(connection, reference, { finality: 'confirmed' });
    
    // If no recipient or amount provided, just confirm the transaction exists
    if (!recipient && !amount) {
      return { signature: signatureInfo.signature, status: 'confirmed' };
    }
    
    // Validate that the transaction has the expected parameters
    if (recipient && amount) {
      const response = await validateTransfer(
        connection,
        signatureInfo.signature,
        {
          recipient,
          amount,
          reference
        },
        { commitment: 'confirmed' }
      );
    }
    
    return { signature: signatureInfo.signature, status: 'validated' };
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