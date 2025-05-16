#!/usr/bin/env ts-node
import { PublicKey, Keypair } from "@solana/web3.js";
import { transferToken } from "../server/services/transfer-service";
import * as dotenv from "dotenv";
import * as readline from "readline";

// Load environment variables
dotenv.config();

/**
 * Interactive CLI tool for testing token transfers
 * 
 * Usage:
 * ts-node scripts/token-transfer-cli.ts
 * 
 * Or make executable:
 * chmod +x scripts/token-transfer-cli.ts
 * ./scripts/token-transfer-cli.ts
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log("=== Solana Token Transfer CLI ===");
    console.log("This tool will help you test token transfers using the transfer-service");
    console.log("Press Ctrl+C at any time to exit\n");
    
    // 1. Get the mint address
    let mintAddress = process.env.TEST_TOKEN_MINT_ADDRESS || "";
    if (!mintAddress) {
      mintAddress = await question("Enter token mint address: ");
      if (!mintAddress) {
        throw new Error("Mint address is required");
      }
    } else {
      console.log(`Using mint address from .env: ${mintAddress}`);
      const confirm = await question("Continue with this address? (y/n): ");
      if (confirm.toLowerCase() !== 'y') {
        mintAddress = await question("Enter token mint address: ");
        if (!mintAddress) {
          throw new Error("Mint address is required");
        }
      }
    }

    // Validate mint address
    try {
      new PublicKey(mintAddress);
    } catch (error) {
      throw new Error("Invalid mint address format");
    }
    
    // 2. Get the recipient address
    let recipientAddress = process.env.TEST_RECIPIENT_ADDRESS || "";
    if (!recipientAddress) {
      recipientAddress = await question("Enter recipient wallet address: ");
      if (!recipientAddress) {
        throw new Error("Recipient address is required");
      }
    } else {
      console.log(`Using recipient address from .env: ${recipientAddress}`);
      const confirm = await question("Continue with this address? (y/n): ");
      if (confirm.toLowerCase() !== 'y') {
        recipientAddress = await question("Enter recipient wallet address: ");
        if (!recipientAddress) {
          throw new Error("Recipient address is required");
        }
      }
    }

    // Validate recipient address
    try {
      new PublicKey(recipientAddress);
    } catch (error) {
      throw new Error("Invalid recipient address format");
    }
    
    // 3. Get the amount
    let amountStr = await question("Enter amount to transfer: ");
    let amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }
    
    // 4. Generate a reference key
    const referenceKey = Keypair.generate().publicKey;
    console.log(`Generated reference key: ${referenceKey.toString()}`);
    
    // 5. Confirm transfer
    console.log("\nTransfer Details:");
    console.log(`- Mint Address: ${mintAddress}`);
    console.log(`- Recipient: ${recipientAddress}`);
    console.log(`- Amount: ${amount}`);
    console.log(`- Reference Key: ${referenceKey.toString()}`);
    
    const confirmTransfer = await question("\nConfirm transfer? (y/n): ");
    if (confirmTransfer.toLowerCase() !== 'y') {
      throw new Error("Transfer cancelled by user");
    }
    
    // 6. Execute transfer
    console.log("\nExecuting transfer...");
    const result = await transferToken(
      mintAddress,
      recipientAddress,
      amount,
      referenceKey
    );
    
    // 7. Show results
    if (result.success) {
      console.log("\n✅ Transfer successful!");
      console.log(`Transaction Signature: ${result.signature}`);
      console.log(`Explorer URL: ${result.explorerUrl}`);
    } else {
      console.error("\n❌ Transfer failed:", result.error);
    }
    
  } catch (error) {
    console.error("\n⚠️ Error:", error instanceof Error ? error.message : error);
  } finally {
    rl.close();
  }
}

// Run the CLI
main()
  .then(() => console.log("\nCLI completed"))
  .catch(err => console.error("\nCLI failed:", err)); 