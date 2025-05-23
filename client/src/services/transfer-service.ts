import { getOrCreateAssociatedTokenAccount, createTransferInstruction } from "@solana/spl-token";
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction, ParsedAccountData } from "@solana/web3.js";
import { getServiceKeypair } from './keys-service';

/**
 * Transfers tokens from the service wallet to a recipient wallet
 */
export async function transferToken(
  mintAddress: string,
  recipientAddress: string,
  amount: number,
  isCompressed: boolean = false
): Promise<{
  success: boolean;
  signature?: string;
  explorerUrl?: string;
  error?: string;
}> {
  try {
    if (isCompressed) {
      console.log("TRANSFERRING COMPRESSED TOKEN");
      // Use compressed token transfer endpoint
      const response = await fetch('/api/tokens/transfer/compressed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mintAddress,
          recipientAddress,
          amount
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to transfer compressed token');
      }

      return await response.json();
    } else {
      // Original uncompressed token transfer logic
      console.log("MINT ADDRESS", mintAddress);
      console.log("RECIPIENT ADDRESS", recipientAddress);
      console.log("AMOUNT", amount);
      const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
      const connection = new Connection(endpoint);
      const serviceKeypair = getServiceKeypair();
      
      // Get token decimals 
      const tokenInfo = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
      let decimals = 0;
      
      if (tokenInfo.value && 'parsed' in tokenInfo.value.data) {
        decimals = (tokenInfo.value.data as ParsedAccountData).parsed.info.decimals || 0;
      }
      
      // Get source token account (service wallet)
      const sourceAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        serviceKeypair,
        new PublicKey(mintAddress),
        serviceKeypair.publicKey
      );
      
      // Get destination token account (recipient wallet)
      const destinationAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        serviceKeypair,
        new PublicKey(mintAddress),
        new PublicKey(recipientAddress)
      );
      
      // Create transfer transaction
      const tx = new Transaction();
      tx.add(createTransferInstruction(
        sourceAccount.address,
        destinationAccount.address,
        serviceKeypair.publicKey,
        amount * Math.pow(10, decimals)
      ));
      
      // Get recent blockhash and send transaction
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = latestBlockhash.blockhash;
      tx.feePayer = serviceKeypair.publicKey;
      
      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        tx,
        [serviceKeypair]
      );
      
      const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
      
      return {
        success: true,
        signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${network}`
      };
    }
  } catch (error) {
    console.error("Token transfer failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
} 