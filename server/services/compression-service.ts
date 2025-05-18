import { Rpc, createRpc, bn } from '@lightprotocol/stateless.js';
import { 
  CompressedTokenProgram, 
  createMint as createCompressedMint,
  getTokenPoolInfos,
  selectTokenPoolInfo,
  type StateTreeInfo,
  type TokenPoolInfo
} from '@lightprotocol/compressed-token';
import { Keypair, PublicKey } from '@solana/web3.js';
import { Token } from '@shared/schema';
import { KeyService } from './keys-service';

interface CompressedTokenAccount {
  compressedAccount: {
    hash: string;
  };
}

interface TokenBalance {
  balance: number;
}

export class CompressionService {
  private connection: Rpc;
  private readonly HELIUS_API_KEY: string;
  private payer: Keypair;

  constructor() {
    this.HELIUS_API_KEY = process.env.HELIUS_API_KEY!;
    this.connection = createRpc(
      `https://devnet.helius-rpc.com?api-key=${this.HELIUS_API_KEY}`
    );
    this.payer = KeyService.getCompressionKeypair();
  }

  async initialize() {
    try {
      const balance = await this.connection.getBalance(this.payer.publicKey);
      if (balance < 1_000_000_000) {
        await KeyService.fundKeypair(this.connection, this.payer);
        console.log('Funded compression service keypair');
      }
    } catch (error) {
      console.error('Error initializing compression service:', error);
      throw error;
    }
  }

  async createCompressedToken(
    name: string,
    symbol: string,
    decimals: number = 9,
    supply: number
  ) {
    try {
      const { mint, transactionSignature } = await createCompressedMint(
        this.connection,
        this.payer,
        this.payer.publicKey,
        decimals
      );

      const tokenPoolInfos = await getTokenPoolInfos(this.connection, mint);
      const tokenPoolInfo = selectTokenPoolInfo(tokenPoolInfos);

      return {
        success: true,
        mint: mint.toBase58(),
        signature: transactionSignature,
        tokenPoolId: tokenPoolInfo.address.toBase58(),
      };
    } catch (error) {
      console.error('Error creating compressed token:', error);
      throw error;
    }
  }

  async mintCompressedTokens(
    mintAddress: string,
    amount: number
  ) {
    try {
      const mint = new PublicKey(mintAddress);
      
      const tokenPoolInfos = await getTokenPoolInfos(this.connection, mint);
      const tokenPoolInfo = selectTokenPoolInfo(tokenPoolInfos);

      const stateTreeInfo = await this.connection.getStateTreeInfo(tokenPoolInfo.stateTreeId);
      
      const mintToTxId = await CompressedTokenProgram.mintTo({
        feePayer: this.payer.publicKey,
        authority: this.payer.publicKey,
        mint,
        toPubkey: this.payer.publicKey,
        amount: bn(amount),
        outputStateTreeInfo: stateTreeInfo,
        tokenPoolInfo
      });

      return {
        success: true,
        signature: mintToTxId
      };
    } catch (error) {
      console.error('Error minting compressed tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getCompressedTokenBalance(
    walletAddress: string,
    mintAddress: string
  ) {
    try {
      const owner = new PublicKey(walletAddress);
      const mint = new PublicKey(mintAddress);

      const balanceResponse = await this.connection.getCompressedTokenBalancesByOwnerV2(
        owner,
        { mint }
      );

      const balance = balanceResponse[0]?.balance ?? 0;

      return {
        success: true,
        balance
      };
    } catch (error) {
      console.error('Error getting compressed token balance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async transferCompressedTokens(
    mintAddress: string,
    recipientAddress: string,
    amount: number
  ) {
    try {
      const mint = new PublicKey(mintAddress);
      const recipient = new PublicKey(recipientAddress);

      const accounts = await this.connection.getCompressedTokenAccountsByOwner(
        this.payer.publicKey,
        { mint }
      );

      const inputAccounts = await CompressedTokenProgram.mergeTokenAccounts(
        accounts.items as CompressedTokenAccount[],
        bn(amount)
      );

      const proof = await this.connection.getValidityProof(
        inputAccounts.map((account: CompressedTokenAccount) => account.compressedAccount.hash)
      );

      const transferTx = await CompressedTokenProgram.transfer({
        payer: this.payer.publicKey,
        inputCompressedTokenAccounts: inputAccounts as ParsedTokenAccount[],
        toAddress: recipient,
        amount: bn(amount),
        recentInputStateRootIndices: proof.rootIndices,
        recentValidityProof: proof.compressedProof,
      });

      return {
        success: true,
        signature: transferTx
      };
    } catch (error) {
      console.error('Error transferring compressed tokens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const compressionService = new CompressionService();

compressionService.initialize().catch(console.error); 