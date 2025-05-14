'use client';

import { ReactNode, useMemo, useCallback } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork, WalletError } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
  CoinbaseWalletAdapter
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useToast } from "@/hooks/use-toast";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

// Wallet Provider component 
export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  
  // Set up the Solana network connection (devnet for development)
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Setup supported wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new BackpackWalletAdapter(),
      new CoinbaseWalletAdapter()
    ],
    [network]
  );

  // Handle wallet errors
  const onError = useCallback((error: WalletError) => {
    console.error("Wallet error:", error);
    
    let message: string;
    if (error.name === "WalletNotReadyError") {
      message = "Please install and enable a Solana wallet extension";
    } else if (error.name === "WalletConnectionError") {
      message = "Failed to connect to wallet. Please try again";
    } else {
      message = error.message || "An unknown wallet error occurred";
    }
    
    toast({
      title: "Wallet Error",
      description: message,
      variant: "destructive",
    });
  }, [toast]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        onError={onError}
        autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
