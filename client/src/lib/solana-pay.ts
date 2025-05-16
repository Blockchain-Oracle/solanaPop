import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { createQR, encodeURL, findReference, validateTransfer } from '@solana/pay';
import BigNumber from 'bignumber.js';

// Types for QR code generation options
export type SolanaPayQROptions = {
  tokenId: number;
  baseUrl: string;
  userWallet: string; // User wallet address for unique reference creation
  label?: string;
  message?: string;
  reference?: string;
  recipient?: string; // Recipient wallet address if using transfer request

};

// Create a consistent reference from tokenId and user wallet
export function createReferenceFromTokenId(
  tokenId: number, 
  userWallet: string
): { referenceKey: PublicKey, referenceString: string } {
  // Create a reference buffer with a consistent hash
  const reference = new Uint8Array(32);
  
  // Create a deterministic identifier by hashing tokenId and userWallet
  const uniqueIdentifier = `token:${tokenId}:wallet:${userWallet}`;
  
  // Use a simple hash function to create a deterministic reference
  // This ensures the same reference is generated for the same tokenId and wallet
  const hashBuffer = new TextEncoder().encode(uniqueIdentifier);
  
  // Apply simple hash by XORing the bytes repeatedly
  let hash = 0;
  for (let i = 0; i < hashBuffer.length; i++) {
    hash = ((hash << 5) - hash) + hashBuffer[i];
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert the hash to a byte array
  for (let i = 0; i < 32; i++) {
    reference[i] = (hash >> (i * 8)) & 0xff;
  }
  
  // Convert to PublicKey
  const referenceKey = new PublicKey(reference);
  
  // Also return as string for component state
  const referenceString = referenceKey.toString();
  
  console.log(`Generated reference for token ${tokenId} and wallet ${userWallet}:`, referenceString);
  
  return { referenceKey, referenceString };
}

// Create a QR code for transaction request
export function createTokenClaimQR(options: SolanaPayQROptions) {
  try {
    const { tokenId, baseUrl, label, message, recipient, userWallet } = options;
    
    let url;
     
    // Create a reference from tokenId and user wallet
    const { referenceKey: referencePublicKey } = createReferenceFromTokenId(tokenId, userWallet);
        
    if (recipient) {
      // Create a transfer request (simpler, non-interactive)
      // This is for the "solana:<recipient>?..." format
      try {
        const recipientPublicKey = new PublicKey(recipient);
        
        // Create a Solana Pay transfer URL
        url = encodeURL({
          recipient: recipientPublicKey,
          reference: [referencePublicKey], // Array of PublicKeys
          label: label || "Claim Token",
          message: message || `Scan to claim your token`,
        });
        console.log("URL:", url);
        console.log("Created transfer URL with reference:", referencePublicKey.toString());
      } catch (error) {
        console.error("Error creating transfer request:", error);
        // Fall back to transaction request
        const apiUrl = new URL(`${baseUrl}/api/solana-pay/token/${tokenId}`);
        url = encodeURL({
          link: apiUrl,
          label: label || "Claim Token",
          message: message || "Scan to claim your token",
          reference: [referencePublicKey] // Include reference in fallback
        });
        console.log("Created fallback URL with reference:", referencePublicKey.toString());
      }
    } else {
      // Create a transaction request (interactive)
      // This is for the "solana:<link>" format
      const apiUrl = new URL(`${baseUrl}/api/solana-pay/token/${tokenId}`);
      url = encodeURL({
        link: apiUrl,
        label: label || "Claim Token",
        message: message || "Scan to claim your token",
        reference: [referencePublicKey] // Always include reference
      });
      console.log("Created transaction request URL with reference:", referencePublicKey.toString());
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

// OKAY LETS UPDATE THE COMPONETS SINCE WE UPDATED LOTS OF STUFF IN THE API

// WHICH INCLUDES UPLOADING TOKEN USER CAN NOW ADD IMAGES