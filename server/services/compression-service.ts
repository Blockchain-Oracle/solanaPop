import { Rpc, createRpc, bn, selectStateTreeInfo, buildAndSignTx, sendAndConfirmTx, dedupeSigner } from '@lightprotocol/stateless.js';
import { 
  CompressedTokenProgram, 
  createMint as createCompressedMint,
  getTokenPoolInfos,
  selectTokenPoolInfo,
  selectMinCompressedTokenAccountsForTransfer
} from '@lightprotocol/compressed-token';
import { Keypair, PublicKey, ComputeBudgetProgram } from '@solana/web3.js';
import { Token } from '@shared/schema';
import { KeyService } from './keys-service';

interface TokenPoolInfo {
  address: PublicKey;
  stateTreeId: string;
  tokenPoolPda: string;
}

interface CompressedAccount {
  hash: string;
}

interface CompressedTokenAccount {
  compressedAccount: CompressedAccount;
  mint: string;
  owner: string;
  amount: string;
}

interface TokenBalance {
  mint: string;
  balance: number;
  decimals: number;
}

interface TokenBalanceResponse {
  value: TokenBalance[];
  cursor: string;
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
      // Create the mint
      const { mint, transactionSignature } = await createCompressedMint(
        this.connection,
        this.payer,
        this.payer.publicKey,
        decimals
      );

      console.log("Created mint:", mint.toBase58());

      // Get token pool info before minting
      const tokenPoolInfos = await getTokenPoolInfos(this.connection, mint);
      const tokenPoolInfo = selectTokenPoolInfo(tokenPoolInfos);

      // Get state tree info
      const stateTreeInfos = await this.connection.getStateTreeInfos();
      const stateTreeInfo = selectStateTreeInfo(stateTreeInfos);

      // Mint the initial supply using CompressedTokenProgram directly
      const mintToIx = await CompressedTokenProgram.mintTo({
        feePayer: this.payer.publicKey,
        authority: this.payer.publicKey,
        mint,
        toPubkey: this.payer.publicKey,
        amount: bn(supply),
        outputStateTreeInfo: stateTreeInfo,
        tokenPoolInfo
      });

      // Add compute budget instruction
      const instructions = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        mintToIx
      ];

      // Sign and send transaction
      const { blockhash } = await this.connection.getLatestBlockhash();
      const tx = buildAndSignTx(
        instructions,
        this.payer,
        blockhash,
        [this.payer]
      );

      const mintToSignature = await sendAndConfirmTx(this.connection, tx);
      console.log("Minted tokens with signature:", mintToSignature);

      // Verify the tokens were minted by checking balance
      const balance = await this.getCompressedTokenBalance(
        this.payer.publicKey.toBase58(),
        mint.toBase58()
      );
      console.log("New token balance:", balance);

      return {
        success: true,
        mint: mint.toBase58(),
        signature: transactionSignature,
        mintToSignature,
        tokenPoolId: tokenPoolInfo.tokenPoolPda,
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
      const stateTreeInfos = await this.connection.getStateTreeInfos();
      const tokenPoolInfos = await getTokenPoolInfos(this.connection, mint);
      
      const mintToTxId = await CompressedTokenProgram.mintTo({
        feePayer: this.payer.publicKey,
        authority: this.payer.publicKey,
        mint,
        toPubkey: this.payer.publicKey,
        amount: bn(amount),
        outputStateTreeInfo: selectStateTreeInfo(stateTreeInfos),
        tokenPoolInfo: selectTokenPoolInfo(tokenPoolInfos)
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

      const balances = await this.connection.getCompressedTokenBalancesByOwnerV2(
          owner,
          { mint }
      ) as unknown as TokenBalanceResponse;

      // Find the balance for the specific mint
      const balance = balances.value.find((b: TokenBalance) => b.mint === mintAddress)?.balance ?? 0;

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
      console.log("MINT ADDRESS", mintAddress);
      console.log("RECIPIENT ADDRESS", recipientAddress);
      console.log("AMOUNT", amount);
      console.log("PAYER PUBLIC KEY", this.payer.publicKey);
      const accounts = await this.connection.getCompressedTokenAccountsByOwner(
        this.payer.publicKey,
        { mint }
      );
      console.log("ACCOUNTS", accounts);
      const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
        accounts.items,
        bn(amount)
      );
      console.log("INPUT ACCOUNTS", inputAccounts);
      const proof = await this.connection.getValidityProof(
        inputAccounts.map(account => account.compressedAccount.hash)
      );

      // Get the lookup table for the network
      const lookupTableAddress = new PublicKey(
        process.env.SOLANA_NETWORK === 'mainnet' 
          ? '9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ'  // Mainnet
          : 'qAJZMgnQJ8G6vA3WRcjD9Jan1wtKkaCFWLWskxJrR5V'   // Devnet
      );
      const lookupTableAccount = (
        await this.connection.getAddressLookupTable(lookupTableAddress)
      ).value!;

      // Create transfer instruction
      const transferIx = await CompressedTokenProgram.transfer({
        payer: this.payer.publicKey,
        inputCompressedTokenAccounts: inputAccounts,
        toAddress: recipient,
        amount: bn(amount),
        recentInputStateRootIndices: proof.rootIndices,
        recentValidityProof: proof.compressedProof,
      });
      console.log("TRANSFER IX", transferIx);
      // Add compute budget instruction
      const instructions = [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        transferIx
      ];

      // Get recent blockhash and sign transaction
      const { blockhash } = await this.connection.getLatestBlockhash();
      const additionalSigners = dedupeSigner(this.payer, [this.payer]);
      
      const tx = buildAndSignTx(
        instructions,
        this.payer,
        blockhash,
        additionalSigners,
        [lookupTableAccount] // Add lookup table
      );

      // Send and confirm transaction
      const signature = await sendAndConfirmTx(this.connection, tx);

      return {
        success: true,
        signature,
        explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${process.env.SOLANA_NETWORK || 'devnet'}`
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