# Wallet Integration Documentation

This document provides an overview of the wallet integration in the SolanaPOP application.

## Architecture

The wallet integration follows a layered approach:

1. **Wallet Provider Layer**: Configures and provides wallet adapter context.
2. **Hook Layer**: Custom hooks that wrap the underlying wallet functionality.
3. **Component Layer**: UI components that use the hooks to interact with wallets.

## Components

### WalletProvider

Location: `src/components/walletProvider.tsx`

This component wraps the Solana wallet adapter providers:

- `ConnectionProvider`: Manages connection to the Solana network.
- `SolanaWalletProvider`: Handles wallet adapter state.
- `WalletModalProvider`: Provides the wallet selection modal.

It also configures:
- Available wallets (Phantom, Solflare, etc.)
- Error handling
- Connection persistence

### Wallet Button

Location: `src/components/ui/wallet-button.tsx`

A reusable button component for wallet connection actions:
- Connect wallet
- Disconnect wallet
- Display connected wallet address

## Hooks

### useWallet

Location: `src/hooks/use-wallet.ts`

A simplified API for wallet interactions:
- `connected`: Boolean indicating if a wallet is connected
- `connecting`: Boolean indicating if a connection is in progress
- `walletAddress`: Formatted wallet address for display
- `publicKey`: Raw public key of the connected wallet
- `connectWallet()`: Function to initiate wallet connection
- `disconnectWallet()`: Function to disconnect wallet

### useSolanaConnection (internal)

Location: `src/hooks/use-solana-wallet.ts`

Advanced hook providing detailed wallet functionality:
- Balance checking
- Address validation
- Airdrop request
- Connection status management

## Error Handling

The wallet integration includes robust error handling:

1. **Wallet Adapter Errors**: Handled by the `onError` callback in the wallet provider.
2. **Connection Errors**: Captured in the connection methods with user feedback.
3. **UI Feedback**: Visual indicators for different connection states.

## Usage Examples

### Basic wallet connection in components

```tsx
import { useWallet } from "@/hooks/use-wallet";

function MyComponent() {
  const { connected, connecting, connectWallet, disconnectWallet, walletAddress } = useWallet();
  
  return (
    <div>
      {connected ? (
        <button onClick={disconnectWallet}>
          Disconnect {walletAddress}
        </button>
      ) : (
        <button onClick={connectWallet} disabled={connecting}>
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </div>
  );
}
```

### Using wallet for transactions

```tsx
import { useWallet } from "@/hooks/use-wallet";
import { useConnection } from "@solana/wallet-adapter-react";
import { Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

function SendTransaction() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  
  const sendSol = async () => {
    if (!publicKey || !connection) return;
    
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: RECIPIENT_PUBKEY,
          lamports: 0.1 * LAMPORTS_PER_SOL,
        })
      );
      
      const signature = await sendTransaction(transaction, connection);
      console.log("Transaction signature", signature);
    } catch (error) {
      console.error("Transaction error", error);
    }
  };
  
  return (
    <button disabled={!connected} onClick={sendSol}>
      Send SOL
    </button>
  );
}
```

## Wallet Support

The application currently supports the following wallets:

- Phantom
- Solflare
- Coinbase Wallet
- Torus
- Clover 