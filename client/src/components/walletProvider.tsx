'use client';

import { ReactNode, useMemo, useCallback } from "react";
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork, WalletError } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CloverWalletAdapter,
  CoinbaseWalletAdapter,
  TorusWalletAdapter
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
      new CoinbaseWalletAdapter(),
      new CloverWalletAdapter(),
      new TorusWalletAdapter()
    ],
    [network]
  );

  // Handle wallet errors
  const onError = useCallback((error: WalletError) => {
    console.error("Wallet error:", error);
    
    let title = "Wallet Error";
    let message: string;
    
    // Handle specific error cases
    if (error.name === "WalletNotReadyError") {
      message = "Please install and enable a Solana wallet extension";
    } else if (error.name === "WalletConnectionError") {
      message = "Failed to connect to wallet. Please try again";
    } else if (error.name === "WalletDisconnectedError") {
      title = "Wallet Disconnected";
      message = "Your wallet has been disconnected. Please reconnect.";
    } else if (error.name === "WalletTimeoutError") {
      message = "Connection to wallet timed out. Please try again.";
    } else if (error.name === "WalletWindowClosedError") {
      message = "Wallet connection window was closed. Please try again.";
    } else if (error.name === "WalletWindowBlockedError") {
      message = "Wallet popup was blocked. Please allow popups for this site.";
    } else {
      message = error.message || "An unknown wallet error occurred";
    }
    
    toast({
      title,
      description: message,
      variant: "destructive",
      duration: 5000,
    });
  }, [toast]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        onError={onError}
        autoConnect={true}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
