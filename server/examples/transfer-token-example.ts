// import { Keypair, PublicKey } from "@solana/web3.js";
// import { transferToken } from "../services/transfer-service";
// import * as dotenv from "dotenv";

// // Load environment variables
// dotenv.config();

// /**
//  * Example script demonstrating how to use the transferToken service
//  * 
//  * Usage:
//  * ts-node transfer-token-example.ts
//  */
// async function main() {
//   try {
//     // Example parameters
//     const mintAddress = process.env.TEST_TOKEN_MINT_ADDRESS || "YOUR_TOKEN_MINT_ADDRESS";
//     const recipientAddress = process.env.TEST_RECIPIENT_ADDRESS || "RECIPIENT_WALLET_ADDRESS";
//     const amount = 1; // Amount to transfer (will be multiplied by token decimals)
    
//     // Generate a reference key (in a real application, this could be a transaction ID or other identifier)
//     const referenceKey = Keypair.generate().publicKey;
    
//     console.log("Starting token transfer...");
//     console.log(`Mint Address: ${mintAddress}`);
//     console.log(`Recipient: ${recipientAddress}`);
//     console.log(`Amount: ${amount}`);
//     console.log(`Reference Key: ${referenceKey.toString()}`);
    
//     // Perform the transfer
//     const result = await transferToken(
//       mintAddress,
//       recipientAddress,
//       amount,
//       referenceKey
//     );
    
//     if (result.success) {
//       console.log("\n✅ Transfer successful!");
//       console.log(`Transaction Signature: ${result.signature}`);
//       console.log(`Explorer URL: ${result.explorerUrl}`);
//     } else {
//       console.error("\n❌ Transfer failed:", result.error);
//     }
//   } catch (error) {
//     console.error("Error in transfer example:", error);
//   }
// }

// // Run the example
// main()
//   .then(() => console.log("Example completed"))
//   .catch(err => console.error("Example failed:", err)); 