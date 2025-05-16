import { percentAmount, signerIdentity, createSignerFromKeypair, generateSigner } from '@metaplex-foundation/umi';
import { TokenStandard, createAndMint, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { getServiceKeypair } from './keys-service';
import { PublicKey } from '@solana/web3.js';

/**
 * Creates a new token on the Solana blockchain using the service wallet
 */
export async function createToken(
  name: string,
  symbol: string,
  metadataUri: string,
  decimals = 6,
  amount = 1000000 // Default supply
): Promise<{
  success: boolean;
  mintAddress?: string;
  signature?: string;
  explorerUrl?: string;
  error?: string;
}> {
  try {
    const keypair = getServiceKeypair();
    const endpoint = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const umi = createUmi(endpoint);
    
    // Create service signer from keypair
    const serviceSigner = createSignerFromKeypair(
      umi, 
      umi.eddsa.createKeypairFromSecretKey(keypair.secretKey)
    );
    
    // Configure umi
    umi.use(signerIdentity(serviceSigner));
    umi.use(mplTokenMetadata());
    
    // Generate a mint signer instead of just a keypair
    const mint = generateSigner(umi);
    
    // Create and mint tokens
    const result = await createAndMint(umi, {
      mint,
      authority: umi.identity,
      name: name,
      symbol: symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(0),
      decimals: decimals,
      amount: amount * Math.pow(10, decimals),
      tokenOwner: umi.payer.publicKey,
      tokenStandard: TokenStandard.Fungible,
    }).sendAndConfirm(umi);
    
    const network = process.env.SOLANA_NETWORK || 'devnet';
    
    return {
      success: true,
      mintAddress: mint.publicKey.toString(),
      signature: result?.signature.toString() || '',
      explorerUrl: `https://explorer.solana.com/tx/${result?.signature.toString()}?cluster=${network}`
    };
  } catch (error) {
    console.error("Token creation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
} 