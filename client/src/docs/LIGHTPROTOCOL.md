Stateless.js API Reference Guide
The @lightprotocol/stateless.js library lets you build Javascript clients that interact with the ZK Compression primitive via the ZK Compression JSON RPC API.

Installation
Package Manager
Command
NPM

Copy
npm install --save \
    @lightprotocol/stateless.js \
    @lightprotocol/compressed-token \
    @solana/web3.js \
    @lightprotocol/zk-compression-cli
Yarn

Copy
yarn add \
    @lightprotocol/stateless.js \
    @solana/web3.js \
    @lightprotocol/zk-compression-cli
Basics
Rpc
Source Documentation

The Rpc connection is used to interact with the ZK Compression JSON RPC. It's a thin wrapper extending Solana's web3.js Connection class with compression-related endpoints, such as getCompressedAccount, getCompressedTokenBalancesByOwner, and more.

Example Usage with Devnet

Copy
const stateless = require("@lightprotocol/stateless.js");


/// Helius exposes Solana and compression RPC endpoints through a single URL
const RPC_ENDPOINT = "https://devnet.helius-rpc.com?api-key=<api_key>";
const COMPRESSION_RPC_ENDPOINT = RPC_ENDPOINT;
const PROVER_ENDPOINT = RPC_ENDPOINT
const connection: Rpc = createRpc(RPC_ENDPOINT, COMPRESSION_RPC_ENDPOINT, PROVER_ENDPOINT)

async function main() {
  let slot = await connection.getSlot();
  console.log(slot);

  let health = await connection.getIndexerHealth(slot);
  console.log(health);
  // "Ok"
}

main();
Visit the JSON RPC Methods section for the full list of compression endpoints supported in Rpc .

Quickstart
Starting the test-validator for Local Development
Copy
light test-validator 
The command above will start a single-node Solana cluster, an RPC node, and a prover node at ports 8899, 8784, and 3001.

Creating and Sending Transactions
Creating, Minting, and Transferring a Compressed Token
This example uses the compressed token program, which is built using ZK Compression and offers an SPL-compatible token layout.

Copy
import {
  LightSystemProgram,
  Rpc,
  confirmTx,
  createRpc,
} from "@lightprotocol/stateless.js";
import { createMint, mintTo, transfer } from "@lightprotocol/compressed-token";
import { Keypair } from "@solana/web3.js";

const payer = Keypair.generate();
const tokenRecipient = Keypair.generate();

/// Localnet 
const connection: Rpc = createRpc();

const main = async () => {
  /// Airdrop lamports to pay fees
  await confirmTx(
    connection,
    await connection.requestAirdrop(payer.publicKey, 10e9)
  );

  await confirmTx(
    connection,
    await connection.requestAirdrop(tokenRecipient.publicKey, 1e6)
  );

  /// Create a compressed token mint
  const { mint, transactionSignature } = await createMint(
    connection,
    payer,
    payer.publicKey,
    9 // Number of decimals
  );

  console.log(`create-mint  success! txId: ${transactionSignature}`);

  /// Mint compressed tokens to the payer's account
  const mintToTxId = await mintTo(
    connection,
    payer,
    mint,
    payer.publicKey, // Destination
    payer,
    1e9 // Amount
  );

  console.log(`Minted 1e9 tokens to ${payer.publicKey} was a success!`);
  console.log(`txId: ${mintToTxId}`);

  /// Transfer compressed tokens
  const transferTxId = await transfer(
    connection,
    payer,
    mint,
    7e8, // Amount
    payer, // Owner
    tokenRecipient.publicKey // To address
  );

  console.log(`Transfer of 7e8 ${mint} to ${tokenRecipient.publicKey} was a success!`);
  console.log(`txId: ${transferTxId}`);
};

main();
Creating Lookup Tables
For public networks, we provide shared lookup tables for Light's common program IDs and accounts

Copy
import { Rpc, confirmTx, createRpc } from "@lightprotocol/stateless.js";
import { createTokenProgramLookupTable } from "@lightprotocol/compressed-token";
import { Keypair, PublicKey} from "@solana/web3.js";
import { RPC_ENDPOINT } from "./constants";
const payer = Keypair.generate();
const authority = payer;
const additionalTokenMints : PublicKey[] = [];
const additionalAccounts : PublicKey[] = [];

// Localnet
const connection: Rpc = createRpc();

const main = async () => {
  /// airdrop lamports to pay gas and rent
  await confirmTx(
    connection,
    await connection.requestAirdrop(payer.publicKey, 1e7)
  );

  /// Create LUT
  const { address } = await createTokenProgramLookupTable(
    connection,
    payer,
    authority,
    additionalTokenMints,
    additionalAccounts
  );

  console.log("Created lookup table:", address.toBase58());
};

main();
Examples
To get started building with examples, check out these GitHub repositories:

Web Example Client

Node Example Client

Token Escrow Program Example


Creating Airdrops with Compressed Tokens
ZK Compression is the most efficient way to distribute your SPL tokens. 

By the end of this guide, you'll have built a fully functioning, programmatic airdrop.

Key benefits of compressed tokens:

Up to 5000x cheaper than regular tokens

Supported by leading Solana wallets, including Phantom and Backpack

Compatible with existing programs via atomic compression and decompression between SPL <> Compressed tokens

Airdropping SPL Tokens
Airship by Helius Labs is an excellent no-code airdrop tool. Airship uses compressed tokens under the hood.

For programmatic airdrops with more control, keep reading. 👇

The high-level overview is this:

Mint and send the to-be-airdropped SPL tokens to a wallet you control.

Create batches of instructions based on a list of recipients and amounts.

Build transactions from these instruction batches, then sign, send, and confirm them.

The code snippets work! You can copy + paste them into your IDE.

1. Install the SDK
npm
yarn
pnpm
Copy
pnpm add \
    @lightprotocol/stateless.js \
    @lightprotocol/compressed-token \
    @solana/web3.js \
    @solana/spl-token \ 
    bs58 \
    dotenv
2. Mint SPL tokens to yourself
Default
With `createMint` helper
If you create a new mint, you can use the createMint helper from @lightprotocol/compressed-token. It creates the mint and registers it for compression.

Copy
import { Keypair } from '@solana/web3.js';
import { createRpc } from '@lightprotocol/stateless.js';
import { createMint } from '@lightprotocol/compressed-token';
import {
    getOrCreateAssociatedTokenAccount,
    mintTo,
} from "@solana/spl-token";
import bs58 from "bs58";
import dotenv from "dotenv";
dotenv.config();

// Set these values in your .env file
const RPC_ENDPOINT = process.env.RPC_ENDPOINT!;
const PAYER = Keypair.fromSecretKey(
  bs58.decode(process.env.PAYER_KEYPAIR!)
);
// Create Rpc endpoint
const connection = createRpc(RPC_ENDPOINT);


(async() => {
   
    /// Create an SPL mint + register it for compression.
    const { mint, transactionSignature } = await createMint(
        connection,
        PAYER,
        PAYER.publicKey,
        9,
    );
    console.log(`create-mint success! txId: ${transactionSignature}`);


    /// Create an associated SPL token account for the sender (PAYER)
    const ata = await getOrCreateAssociatedTokenAccount(
        connection,
        PAYER,
        mint,
        PAYER.publicKey
    );
    console.log(`ATA: ${ata.address.toBase58()}`);



    /// Mint SPL tokens to the sender
    const mintToTxId = await mintTo(
        connection,
        PAYER,
        mint,
        ata.address,
        PAYER.publicKey,
        1e9 * 1e9 // 1b * decimals
      );
    console.log(`mint-to success! txId: ${mintToTxId}`);
})();
You now have a regular SPL token account owned by PAYER that holds all minted tokens.

3. Distribute the tokens
Next, you want to distribute the SPL tokens from your distributor to all recipients.

Ensure you have the latest @lightprotocol/stateless.js and @lightprotocol/compressed-token versions ≥ 0.21.0!

A. Simple version
Copy
import { Keypair, PublicKey, ComputeBudgetProgram } from "@solana/web3.js";
import {
  CompressedTokenProgram,
  getTokenPoolInfos,
  selectTokenPoolInfo,
} from "@lightprotocol/compressed-token";
import {
  bn,
  buildAndSignTx,
  calculateComputeUnitPrice,
  createRpc,
  dedupeSigner,
  Rpc,
  selectStateTreeInfo,
  sendAndConfirmTx,
} from "@lightprotocol/stateless.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import dotenv from "dotenv";
import bs58 from "bs58";
dotenv.config();

// Set these values in your .env file
const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
const MINT_ADDRESS = new PublicKey(process.env.MINT_ADDRESS!);
const PAYER_KEYPAIR = Keypair.fromSecretKey(
  bs58.decode(process.env.PAYER_KEYPAIR!)
);

(async () => {
  const connection: Rpc = createRpc(RPC_ENDPOINT);
  const mintAddress = MINT_ADDRESS;
  const payer = PAYER_KEYPAIR;
  const owner = payer;

  /// Select a new tree for each transaction.
  const activeStateTrees = await connection.getStateTreeInfos();
  const treeInfo = selectStateTreeInfo(activeStateTrees);

  /// Select a tokenpool info
  const infos = await getTokenPoolInfos(connection, mintAddress);
  const info = selectTokenPoolInfo(infos);

  const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintAddress,
    payer.publicKey
  );

  // Airdrop to example recipient
  // 1 recipient = 120_000 CU
  // 5 recipients = 170_000 CU
  const airDropAddresses = ["GMPWaPPrCeZPse5kwSR3WUrqYAPrVZBSVwymqh7auNW7"].map(
    (address) => new PublicKey(address)
  );

  const amount = bn(111);

  const instructions = [];
  instructions.push(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 120_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({
      // Replace this with a dynamic priority_fee based on network conditions.
      microLamports: calculateComputeUnitPrice(20_000, 120_000),
    })
  );

  const compressInstruction = await CompressedTokenProgram.compress({
    payer: payer.publicKey,
    owner: owner.publicKey,
    source: sourceTokenAccount.address,
    toAddress: airDropAddresses,
    amount: airDropAddresses.map(() => amount),
    mint: mintAddress,
    tokenPoolInfo: info,
    outputStateTreeInfo: treeInfo,
  });
  instructions.push(compressInstruction);

  const additionalSigners = dedupeSigner(payer, [owner]);
  const { blockhash } = await connection.getLatestBlockhash();

  const tx = buildAndSignTx(instructions, payer, blockhash, additionalSigners);

  const txId = await sendAndConfirmTx(connection, tx);
  console.log(`txId: ${txId}`);
})();
B. Optimized For large-scale airdrops
First, create a helper that takes recipients and amounts and returns batches of instructions:

Copy
// create-instructions.ts
import {
  CompressedTokenProgram,
  TokenPoolInfo,
} from "@lightprotocol/compressed-token";
import {
  bn,
  selectStateTreeInfo,
  StateTreeInfo,
} from "@lightprotocol/stateless.js";
import {
  ComputeBudgetProgram,
  TransactionInstruction,
  PublicKey,
} from "@solana/web3.js";

interface CreateAirdropInstructionsParams {
  amount: number | bigint;
  recipients: PublicKey[];
  payer: PublicKey;
  sourceTokenAccount: PublicKey;
  mint: PublicKey;
  stateTreeInfos: StateTreeInfo[];
  tokenPoolInfos: TokenPoolInfo[];
  maxRecipientsPerInstruction?: number;
  maxInstructionsPerTransaction?: number;
  computeUnitLimit?: number;
  computeUnitPrice?: number | undefined;
}

export type InstructionBatch = TransactionInstruction[];

export async function createAirdropInstructions({
  amount,
  recipients,
  payer,
  sourceTokenAccount,
  mint,
  stateTreeInfos,
  tokenPoolInfos,
  maxRecipientsPerInstruction = 5,
  maxInstructionsPerTransaction = 3,
  computeUnitLimit = 500_000,
  computeUnitPrice = undefined,
}: CreateAirdropInstructionsParams): Promise<InstructionBatch[]> {
  const instructionBatches: InstructionBatch[] = [];
  const amountBn = bn(amount.toString());

  // Process recipients in chunks
  for (
    let i = 0;
    i < recipients.length;
    i += maxRecipientsPerInstruction * maxInstructionsPerTransaction
  ) {
    const instructions: TransactionInstruction[] = [];

    instructions.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit })
    );
    if (computeUnitPrice) {
      instructions.push(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: computeUnitPrice,
        })
      );
    }

    const treeInfo = selectStateTreeInfo(stateTreeInfos);
    const tokenPoolInfo = selectTokenPoolInfo(tokenPoolInfos);
    
    for (let j = 0; j < maxInstructionsPerTransaction; j++) {
      const startIdx = i + j * maxRecipientsPerInstruction;
      const recipientBatch = recipients.slice(
        startIdx,
        startIdx + maxRecipientsPerInstruction
      );

      if (recipientBatch.length === 0) break;

      const compressIx = await CompressedTokenProgram.compress({
        payer,
        owner: payer,
        source: sourceTokenAccount,
        toAddress: recipientBatch,
        amount: recipientBatch.map(() => amountBn),
        mint,
        tokenPoolInfo,
        outputStateTreeInfo: treeInfo,
      });

      instructions.push(compressIx);
    }

    if (
      (computeUnitPrice && instructions.length > 2) ||
      (!computeUnitPrice && instructions.length > 1)
    ) {
      instructionBatches.push(instructions);
    }
  }

  return instructionBatches;
}
Now, you can create the logic that signs and sends transactions in batches. For this, first add a helper method that refreshes Solana blockhashes in the background:

Copy
// update-blockhash.ts
import { Rpc } from "@lightprotocol/stateless.js";

export let currentBlockhash: string;

export async function updateBlockhash(
  connection: Rpc,
  signal: AbortSignal
): Promise<void> {
  try {
    const { blockhash } = await connection.getLatestBlockhash();
    currentBlockhash = blockhash;
    console.log(`Initial blockhash: ${currentBlockhash}`);
  } catch (error) {
    console.error("Failed to fetch initial blockhash:", error);
    return;
  }

  // Update blockhash in the background
  (function updateInBackground() {
    if (signal.aborted) return;
    const timeoutId = setTimeout(async () => {
      if (signal.aborted) return;
      try {
        const { blockhash } = await connection.getLatestBlockhash();
        currentBlockhash = blockhash;
        console.log(`Updated blockhash: ${currentBlockhash}`);
      } catch (error) {
        console.error("Failed to update blockhash:", error);
      }
      updateInBackground();
    }, 30_000);

    signal.addEventListener("abort", () => clearTimeout(timeoutId));
  })();
}
Then, add the helper that signs and sends the transactions using recent blockhashes.

Copy
// sign-and-send.ts
import { Rpc, sendAndConfirmTx } from "@lightprotocol/stateless.js";
import {
  Keypair,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { InstructionBatch } from "./create-instructions";
import { currentBlockhash, updateBlockhash } from "./update-blockhash";
import bs58 from "bs58";

export enum BatchResultType {
  Success = "success",
  Error = "error",
}

export type BatchResult =
  | { type: BatchResultType.Success; index: number; signature: string }
  | { type: BatchResultType.Error; index: number; error: string };

export async function* signAndSendAirdropBatches(
  batches: InstructionBatch[],
  payer: Keypair,
  connection: Rpc,
  maxRetries = 3
): AsyncGenerator<BatchResult> {
  const abortController = new AbortController();
  const { signal } = abortController;

  await updateBlockhash(connection, signal);

  const statusMap = new Array(batches.length).fill(0); // Initialize all as pending (0)

  // Use zk-compression LUT for your network
  // https://www.zkcompression.com/developers/protocol-addresses-and-urls#lookup-tables
  const lookupTableAddress = new PublicKey(
    "9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ"
  );

  // Get the lookup table account
  const lookupTableAccount = (
    await connection.getAddressLookupTable(lookupTableAddress)
  ).value!;

  while (statusMap.includes(0)) {
    // Continue until all are confirmed or errored
    const pendingBatches = statusMap.filter((status) => status === 0).length;
    console.log(`Sending ${pendingBatches} transactions`);

    const sends = statusMap.map(async (status, index) => {
      if (status !== 0) return; // Skip non-pending batches

      let retries = 0;
      while (retries < maxRetries && statusMap[index] === 0) {
        if (!currentBlockhash) {
          console.warn("Waiting for blockhash to be set...");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        try {
          const tx = new VersionedTransaction(
            new TransactionMessage({
              payerKey: payer.publicKey,
              recentBlockhash: currentBlockhash,
              instructions: batches[index],
            }).compileToV0Message([lookupTableAccount])
          );
          tx.sign([payer]);

          const sig = bs58.encode(tx.signatures[0]);
          console.log(`Batch ${index} signature: ${sig}`);

          const confirmedSig = await sendAndConfirmTx(connection, tx, {
            skipPreflight: true,
            commitment: "confirmed",
          });

          if (confirmedSig) {
            statusMap[index] = 1; // Mark as confirmed
            return {
              type: BatchResultType.Success,
              index,
              signature: confirmedSig,
            };
          }
        } catch (e) {
          retries++;
          console.warn(`Retrying batch ${index}, attempt ${retries + 1}`);
          if (retries >= maxRetries) {
            statusMap[index] = `err: ${(e as Error).message}`; // Mark as error
            return {
              type: BatchResultType.Error,
              index,
              error: (e as Error).message,
            };
          }
        }
      }
    });

    const results = await Promise.all(sends);
    for (const result of results) {
      if (result) yield result as BatchResult;
    }
  }

  // Stop the blockhash update loop
  abortController.abort();
}
Finally, put it all together in your main file:

Copy
// airdrop.ts
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  calculateComputeUnitPrice,
  createRpc,
  Rpc,
} from "@lightprotocol/stateless.js";
import { createMint, getTokenPoolInfos } from "@lightprotocol/compressed-token";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { createAirdropInstructions } from "./create-instructions";
import { BatchResultType, signAndSendAirdropBatches } from "./sign-and-send";
import dotenv from "dotenv";
import bs58 from "bs58";
dotenv.config();

const RPC_ENDPOINT = `https://mainnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`;
const connection: Rpc = createRpc(RPC_ENDPOINT);
const PAYER = Keypair.fromSecretKey(bs58.decode(process.env.PAYER_KEYPAIR!));

// These are 20 example Solana Pubkeys
const recipients = [
  "GMPWaPPrCeZPse5kwSR3WUrqYAPrVZBSVwymqh7auNW7",
  "GySGrTgPtPfMtYoYTmwUdUDFwVJbFMfip7QZdhgXp8dy",
  "Bk1r2vcgX2uTzwV3AUyfRbSfGKktoQrQufBSrHzere74",
  "8BvkadZ6ycFNmQF7S1MHRvEVNb1wvDBFdjkAUnxjK9Ug",
  "EmxcvFKXsWLzUho8AhV9LCKeKRFHg5gAs4sKNJwhe5PF",
  "6mqdHkSpcvNexmECjp5XLt9V9KnSQre9TvbMLGr6sEPM",
  "3k4MViTWXBjFvoUZiJcNGPvzrqnTa41gcrbWCMMnV6ys",
  "2k6BfYRUZQHquPtpkyJpUx3DzM7W3K6H95igtJk8ztpd",
  "89jPyNNLCcqWn1RZThSS4jSqU5VCJkR5mAaSaVzuuqH4",
  "3MzSRLf9jSt6d1MFFMMtPfUcDY6XziRxTB8C5mfvgxXG",
  "9A1H6f3N8mpAPSdfqvYRD4cM1NwDZoMe3yF5DwibL2R2",
  "PtUAhLvUsVcoesDacw198SsnMoFNVskR5pT3QvsBSQw",
  "6C6W6WpgFK8TzTTMNCPMz2t9RaMs4XnkfB6jotrWWzYJ",
  "8sLy9Jy8WSh6boq9xgDeBaTznn1wb1uFpyXphG3oNjL5",
  "GTsQu2XCgkUczigdBFTWKrdDgNKLs885jKguyhkqdPgV",
  "85UK4bjC71Jwpyn8mPSaW3oYyEAiHPbESByq9s5wLcke",
  "9aEJT4CYHEUWwwSQwueZc9EUjhWSLD6AAbpVmmKDeP7H",
  "CY8QjRio1zd9bYWMKiVRrDbwVenf3JzsGf5km5zLgY9n",
  "CeHbdxgYifYhpB6sXGonKzmaejqEfq2ym5utTmB6XMVv",
  "4z1qss12DjUzGUkK1fFesqrUwrEVJJvzPMNkwqYnbAR5",
].map((address) => new PublicKey(address));

(async () => {
  /// Create an SPL mint + register it for compression.
  const { mint, transactionSignature } = await createMint(
    connection,
    PAYER,
    PAYER.publicKey,
    9
  );
  console.log(
    `create-mint success! txId: ${transactionSignature}, mint: ${mint.toBase58()}`
  );

  /// Create an associated SPL token account for the sender (PAYER)
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    PAYER,
    mint,
    PAYER.publicKey
  );
  console.log(`ATA: ${ata.address.toBase58()}`);

  /// Mint SPL tokens to the sender
  const mintToTxId = await mintTo(
    connection,
    PAYER,
    mint,
    ata.address,
    PAYER.publicKey,
    10e9 * LAMPORTS_PER_SOL // 10B tokens * decimals
  );
  console.log(`mint-to success! txId: ${mintToTxId}`);

  const stateTreeInfos = await connection.getStateTreeInfos();

  const tokenPoolInfos = await getTokenPoolInfos(connection, mint);

  const instructionBatches = await createAirdropInstructions({
    amount: 1e6,
    recipients,
    payer: PAYER.publicKey,
    sourceTokenAccount: ata.address,
    mint,
    stateTreeInfos,
    tokenPoolInfos,
    computeUnitPrice: calculateComputeUnitPrice(10_000, 500_000),
  });

  for await (const result of signAndSendAirdropBatches(
    instructionBatches,
    PAYER,
    connection
  )) {
    if (result.type === BatchResultType.Success) {
      console.log(`Batch ${result.index} confirmed: ${result.signature}`);
    } else if (result.type === BatchResultType.Error) {
      console.log(`Batch ${result.index} failed: ${result.error}`);
      // Use result.index to access the specific batch in instructionBatches
      const failedBatch = instructionBatches[result.index];
      console.log(`Failed batch instructions:`, failedBatch);
      // Additional logic to handle failed instructions
    }
  }

  console.log("Airdrop process complete.");
})();
Ensure that you have all the necessary .env variables set up. You can now run your code and execute the airdrop!

Advanced: Decompress / Claim
Compressed tokens are supported in major Solana wallets like Phantom and Backpack. Still, you can let users decompress to SPL via your Frontend (FE) to customize claims. Here's how👇

Copy
import {
  bn,
  buildAndSignTx,
  sendAndConfirmTx,
  dedupeSigner,
  Rpc,
  createRpc,
} from "@lightprotocol/stateless.js";
import { ComputeBudgetProgram, Keypair, PublicKey } from "@solana/web3.js";
import {
  CompressedTokenProgram,
  getTokenPoolInfos,
  selectMinCompressedTokenAccountsForTransfer,
  selectTokenPoolInfosForDecompression,
} from "@lightprotocol/compressed-token";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import bs58 from "bs58";
import dotenv from "dotenv";
dotenv.config();

// Set these values in your .env file
const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
const mint = new PublicKey(process.env.MINT_ADDRESS!);
const payer = Keypair.fromSecretKey(bs58.decode(process.env.PAYER_KEYPAIR!));

const owner = payer;
const amount = 1e5;
const connection: Rpc = createRpc(RPC_ENDPOINT);

(async () => {
  // 1. Create an associated token account for the user if it doesn't exist
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  // 2. Fetch compressed token accounts
  const compressedTokenAccounts =
    await connection.getCompressedTokenAccountsByOwner(owner.publicKey, {
      mint,
    });

  // 3. Select
  const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
    compressedTokenAccounts.items,
    bn(amount)
  );

  // 4. Fetch validity proof
  const proof = await connection.getValidityProof(
    inputAccounts.map((account) => account.compressedAccount.hash)
  );

  // 5. Fetch token pool infos
  const tokenPoolInfos = await getTokenPoolInfos(connection, mint);

  // 6. Select
  const selectedTokenPoolInfos = selectTokenPoolInfosForDecompression(
    tokenPoolInfos,
    amount
  );

  // 7. Build instruction
  const ix = await CompressedTokenProgram.decompress({
    payer: payer.publicKey,
    inputCompressedTokenAccounts: inputAccounts,
    toAddress: ata.address,
    amount,
    tokenPoolInfos: selectedTokenPoolInfos,
    recentInputStateRootIndices: proof.rootIndices,
    recentValidityProof: proof.compressedProof,
  });

  // 8. Sign, send, and confirm
  const { blockhash } = await connection.getLatestBlockhash();
  const additionalSigners = dedupeSigner(payer, [owner]);
  const signedTx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }), ix],
    payer,
    blockhash,
    additionalSigners
  );
  return await sendAndConfirmTx(connection, signedTx);
})();
Add Compressed Token Support to Your Wallet
The following page describes how to add compressed token support to your wallet application.

Key benefits of compressed tokens:

Up to 5000x cheaper than uncompressed accounts

Compatible with existing programs via atomic compression and decompression between SPL <> Compressed tokens

Integration Steps
1. Install the SDK
Package Manager
Command
npm

Copy
npm install --save \
    @lightprotocol/stateless.js \
    @lightprotocol/compressed-token \
    @solana/web3.js
Yarn

Copy
yarn add \
    @lightprotocol/stateless.js \
    @lightprotocol/compressed-token \
    @solana/web3.js
2. Create an RPC Connection
Copy
import {
  Rpc,
  createRpc,
} from "@lightprotocol/stateless.js";

const RPC_ENDPOINT = "https://devnet.helius-rpc.com?api-key=<api_key>";
const connection: Rpc = createRpc(RPC_ENDPOINT)
3. Display Compressed Token Balances
Copy
import { Rpc, createRpc } from '@lightprotocol/stateless.js';
import { PublicKey } from '@solana/web3.js';

const RPC_ENDPOINT = 'https://devnet.helius-rpc.com?api-key=<api_key>';
const connection: Rpc = createRpc(RPC_ENDPOINT);
const publicKey = new PublicKey('CLEuMG7pzJX9xAuKCFzBP154uiG1GaNo4Fq7x6KAcAfG');

(async () => {
    // Returns balance for owner per mint
    // Can optionally apply filter: {mint, limit, cursor}
    const balances =
        await connection.getCompressedTokenBalancesByOwnerV2(publicKey);
    console.log(balances);
})();
4. Get Compression Signature History By Owner
Copy
import { Rpc, createRpc } from '@lightprotocol/stateless.js';
import { PublicKey } from '@solana/web3.js';

const RPC_ENDPOINT = 'https://devnet.helius-rpc.com?api-key=<api_key>';
const connection: Rpc = createRpc(RPC_ENDPOINT);
const publicKey = new PublicKey('CLEuMG7pzJX9xAuKCFzBP154uiG1GaNo4Fq7x6KAcAfG');

(async () => {
    // 1. Fetch signatures for the user
    //
    // Returns confirmed signatures for compression transactions involving the
    // specified account owner
    const signatures =
        await connection.getCompressionSignaturesForOwner(publicKey);
    console.log(signatures);

    // 2. Fetch transactions with compression info
    //
    // Returns pre- and post-compressed token balances grouped by owner
    const parsedTransaction = 
        await connection.getTransactionWithCompressionInfo(signatures[0].signature)
    console.log(parsedTransaction)
})();
Full JSON RPC API:

JSON RPC Methods
5. Send Compressed Tokens
Copy
import { Keypair } from "@solana/web3.js";
import { Rpc, confirmTx, createRpc } from '@lightprotocol/stateless.js';
import { createMint, mintTo } from '@lightprotocol/compressed-token';

// Set these values...
const RPC_ENDPOINT = '<https://devnet.helius-rpc.com?api-key=><api_key>';
const connection: Rpc = createRpc(RPC_ENDPOINT);
const PAYER = Keypair.generate();
const PUBLIC_KEY = PAYER.publicKey;
const MINT_KEYPAIR = Keypair.generate();
const RECIPIENT_PUBLIC_KEY = Keypair.generate().publicKey.toBase58();

/// Airdrop tokens to PAYER beforehand.
(async() => {
    /// Create and register compressed-token mint
    const { mint, transactionSignature } = await createMint(
        connection,
        PAYER,
        PAYER.publicKey,
        9,
        PAYER,
    );
    console.log(`create-mint success! txId: ${transactionSignature}`);

    /// Mint compressed tokens
    const mintToTxId = await mintTo(
        connection,
        PAYER,
        mint,
        PAYER.publicKey,
        PAYER,
        1e9,
    );

    console.log(`mint-to success! txId: ${mintToTxId}`);
})();
Copy
import {
  Rpc,
  createRpc,
  bn,
  dedupeSigner,
  sendAndConfirmTx,
  buildAndSignTx,
} from "@lightprotocol/stateless.js";
import {
  CompressedTokenProgram,
  selectMinCompressedTokenAccountsForTransfer,
} from "@lightprotocol/compressed-token";
import { ComputeBudgetProgram, Keypair } from "@solana/web3.js";

// 0. Set these values
const RPC_ENDPOINT = "https://mainnet.helius-rpc.com?api-key=<api_key>";
const mint = <MINT_ADDRESS>;
const payer = <PAYER_KEYPAIR>;
const owner = payer;

const recipient = Keypair.generate();
const amount = bn(1e8);

const connection: Rpc = createRpc(RPC_ENDPOINT);

(async () => {
  // 1. Fetch latest token account state
  const compressedTokenAccounts =
    await connection.getCompressedTokenAccountsByOwner(owner.publicKey, {
      mint, 
    });

  // 2. Select accounts to transfer from based on the transfer amount
  const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
    compressedTokenAccounts.items,
    amount
  );

  // 3. Fetch recent validity proof
  const proof = await connection.getValidityProof(
    inputAccounts.map((account) => account.compressedAccount.hash)
  );

  // 4. Create transfer instruction
  const ix = await CompressedTokenProgram.transfer({
    payer: payer.publicKey,
    inputCompressedTokenAccounts: inputAccounts,
    toAddress: recipient.publicKey,
    amount,
    recentInputStateRootIndices: proof.rootIndices,
    recentValidityProof: proof.compressedProof,
  });

  // 8. Sign, send, and confirm...
  const { blockhash } = await connection.getLatestBlockhash();
  const additionalSigners = dedupeSigner(payer, [owner]);
  const signedTx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }), ix],
    payer,
    blockhash,
    additionalSigners
  );
  return await sendAndConfirmTx(connection, signedTx);
})();
Advanced Integration
Copy
import {
  bn,
  buildAndSignTx,
  sendAndConfirmTx,
  dedupeSigner,
  Rpc,
  createRpc,
} from "@lightprotocol/stateless.js";
import { ComputeBudgetProgram } from "@solana/web3.js";
import {
  CompressedTokenProgram,
  getTokenPoolInfos,
  selectMinCompressedTokenAccountsForTransfer,
  selectTokenPoolInfosForDecompression,
} from "@lightprotocol/compressed-token";

// 0. Set these values.
const connection: Rpc = createRpc("https://mainnet.helius-rpc.com?api-key=<api_key>";);
const payer = PAYER_KEYPAIR;
const owner = PAYER_KEYPAIR;
const mint = MINT_ADDRESS;
const amount = 1e5;

(async () => {
  // 1. Fetch compressed token accounts
  const compressedTokenAccounts =
    await connection.getCompressedTokenAccountsByOwner(owner.publicKey, {
      mint,
    });

  // 2. Select
  const [inputAccounts] = selectMinCompressedTokenAccountsForTransfer(
    compressedTokenAccounts.items,
    bn(amount)
  );

  // 3. Fetch validity proof
  const proof = await connection.getValidityProof(
    inputAccounts.map((account) => account.compressedAccount.hash)
  );

  // 4. Fetch & Select tokenPoolInfos
  const tokenPoolInfos = await getTokenPoolInfos(connection, mint);
  const selectedTokenPoolInfos = selectTokenPoolInfosForDecompression(
    tokenPoolInfos,
    amount
  );

  // 5. Build instruction
  const ix = await CompressedTokenProgram.decompress({
    payer: payer.publicKey,
    inputCompressedTokenAccounts: inputAccounts,
    toAddress: owner.publicKey,
    amount,
    tokenPoolInfos: selectedTokenPoolInfos,
    recentInputStateRootIndices: proof.rootIndices,
    recentValidityProof: proof.compressedProof,
  });
  
  
  // 6. Sign, send, and confirm.
  // Example with keypair:
  const { blockhash } = await connection.getLatestBlockhash();
  const additionalSigners = dedupeSigner(payer, [owner]);
  const signedTx = buildAndSignTx(
    [ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }), ix],
    payer,
    blockhash,
    additionalSigners
  );

  return await sendAndConfirmTx(connection, signedTx);
})();
Copy
import {
  buildAndSignTx,
  sendAndConfirmTx,
  Rpc,
  createRpc,
  selectStateTreeInfo,
} from "@lightprotocol/stateless.js";
import { ComputeBudgetProgram } from "@solana/web3.js";
import {
  CompressedTokenProgram,
  getTokenPoolInfos,
  selectTokenPoolInfo,
} from "@lightprotocol/compressed-token";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

// 0. Set these values.
const connection: Rpc = createRpc(
  "https://mainnet.helius-rpc.com?api-key=<api_key>"
);
  const payer = <PAYER_KEYPAIR>;
  const mint = <MINT_ADDRESS>;
const amount = 1e5;

(async () => {
  // 1. Get user ATA
  const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  // 2. Fetch & Select treeInfos
  const treeInfos = await connection.getStateTreeInfos();
  const treeInfo = selectStateTreeInfo(treeInfos);

  // 3. Fetch & Select tokenPoolInfo
  const tokenPoolInfos = await getTokenPoolInfos(connection, mint);
  const tokenPoolInfo = selectTokenPoolInfo(tokenPoolInfos);

  // 4. Build compress instruction
  const compressInstruction = await CompressedTokenProgram.compress({
    payer: payer.publicKey,
    owner: payer.publicKey,
    source: sourceTokenAccount.address,
    toAddress: payer.publicKey, // to self.
    amount,
    mint,
    outputStateTreeInfo: treeInfo,
    tokenPoolInfo,
  });

  // 5. Sign and send tx
  // Example with Keypair:
  const { blockhash } = await connection.getLatestBlockhash();
  const tx = buildAndSignTx(
    [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
      compressInstruction,
    ],
    payer,
    blockhash,
    [payer]
  );
  await sendAndConfirmTx(connection, tx);
})();
Best Practices
Clear UI Indicators — Provide clear visual distinctions between compressed and uncompressed SPL tokens

Transaction History — Provide detailed transaction histories for compressed tokens

Decompression and Compression — Provide a clear path for users to convert between compressed and uncompressed tokens when needed

Addresses and URLs
Mainnet URLs
Network Address (RPC)

https://mainnet.helius-rpc.com?api-key=<api_key>

Photon RPC API

https://mainnet.helius-rpc.com?api-key=<api_key>

Devnet URLs
Network Address (RPC)

https://devnet.helius-rpc.com?api-key=<api_key>

Photon RPC API

https://devnet.helius-rpc.com?api-key=<api_key>

Program IDs & Accounts
Light System Program

SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7

Compressed Token Program

cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m

Account Compression Program

compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq

Public State Tree #1

smt1NamzXdq4AMqS2fS2F1i5KTYPZRhoHgWx38d8WsT

Public Nullifier Queue #1

nfq1NvQDJ2GEgnS8zt9prAe8rjjpAW1zFkrvZoBR148

Public Address Tree #1

amt1Ayt45jfbdw5YSo7iz6WZxUmnZsQTYXy82hVwyC2

Public Address Queue #1

aq1S9z4reTSQAdgWHGD2zDaS39sjGrAxbR31vxJ2F4F

Token Escrow Owner PDA

GXtd2izAiMJPwMEjfgTRH3d7k9mjn4Jq3JrWFv9gySYy

Lookup Tables
Lookup tables reduce your transaction size. We provide pre-initialized lookup tables that cover the Light's program IDs and accounts:

Lookup Table #1 (Mainnet)

9NYFyEqPkyXUhkerbGHXUXkvb4qpzeEdHuGpgbgpH1NJ

Lookup Table #1 (Devnet)

qAJZMgnQJ8G6vA3WRcjD9Jan1wtKkaCFWLWskxJrR5V