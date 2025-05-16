import { percentAmount, signerIdentity, createSignerFromKeypair } from '@metaplex-foundation/umi';
import { TokenStandard, createAndMint, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { getServiceKeypair } from './keys-service';
import { PublicKey } from '@solana/web3.js';

/**
 * Creates a new token on the Solana blockchain
 */
export async function createToken(
  name: string,
  symbol: string,
  metadataUri: string,
  recipientAddress: string,
  decimals = 6,
  amount = 1000000 // Default supply
) {
  try {
    const keypair = getServiceKeypair();
    const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const umi = createUmi(endpoint);
    
    // Create service signer from keypair
    const serviceSigner = createSignerFromKeypair(
      umi, 
      umi.eddsa.createKeypairFromSecretKey(keypair.secretKey)
    );
    
    // Configure umi
    umi.use(signerIdentity(serviceSigner));
    umi.use(mplTokenMetadata());
    
    // Generate a new keypair for the mint
    const mint = umi.eddsa.generateKeypair();
    
    // Create and mint tokens
    const result = await createAndMint(umi, {
      mint: mint,
      authority: umi.identity,
      name: name,
      symbol: symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(0),
      decimals: decimals,
      amount: amount * Math.pow(10, decimals),
      tokenOwner: new PublicKey(recipientAddress),
      tokenStandard: TokenStandard.Fungible,
    }).sendAndConfirm(umi);
    
    return {
      success: true,
      mintAddress: mint.publicKey.toString(),
      signature: result.signature,
      explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`
    };
  } catch (error) {
    console.error("Token creation failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
} 