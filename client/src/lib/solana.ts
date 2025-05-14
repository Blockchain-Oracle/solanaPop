import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  sendAndConfirmTransaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';

// Solana connection instance (Devnet)
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

// Generate Solana keypair from private key
export const createKeypairFromPrivateKey = (privateKey: Uint8Array): Keypair => {
  return Keypair.fromSecretKey(privateKey);
};

// Request an airdrop of SOL to a wallet (for testing)
export const requestAirdrop = async (publicKey: PublicKey, amount: number = 1): Promise<string> => {
  try {
    const signature = await connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature);
    return signature;
  } catch (error) {
    console.error('Error requesting airdrop:', error);
    throw new Error('Failed to request SOL airdrop');
  }
};

// Create a new token mint
export const createTokenMint = async (
  payer: Keypair,
  decimals: number = 0  // 0 decimals for NFT-like tokens
): Promise<PublicKey> => {
  try {
    // Create mint account
    const mintAuthority = payer.publicKey;
    const freezeAuthority = payer.publicKey;
    
    const mintKeypair = Keypair.generate();
    
    const tokenMint = await createMint(
      connection,
      payer,
      mintAuthority,
      freezeAuthority,
      decimals,
      mintKeypair
    );
    
    return tokenMint;
  } catch (error) {
    console.error('Error creating token mint:', error);
    throw new Error('Failed to create token mint');
  }
};

// Mint tokens to a recipient
export const mintTokens = async (
  payer: Keypair,
  mint: PublicKey,
  recipient: PublicKey,
  amount: number = 1
): Promise<string> => {
  try {
    // Get or create associated token account for recipient
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      recipient
    );
    
    // Mint tokens to recipient
    const signature = await mintTo(
      connection,
      payer,
      mint,
      recipientTokenAccount.address,
      payer,  // Mint authority
      amount
    );
    
    return signature;
  } catch (error) {
    console.error('Error minting tokens:', error);
    throw new Error('Failed to mint tokens');
  }
};

// Send SOL to another wallet
export const sendSol = async (
  sender: Keypair,
  recipient: PublicKey,
  amount: number  // Amount in SOL
): Promise<string> => {
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: recipient,
        lamports: amount * LAMPORTS_PER_SOL
      })
    );
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [sender]
    );
    
    return signature;
  } catch (error) {
    console.error('Error sending SOL:', error);
    throw new Error('Failed to send SOL');
  }
};

// Get SOL balance for a wallet
export const getSolBalance = async (publicKey: PublicKey): Promise<number> => {
  try {
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting SOL balance:', error);
    throw new Error('Failed to get SOL balance');
  }
};
