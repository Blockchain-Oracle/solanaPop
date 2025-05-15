'use client';

import { useEffect } from 'react';
import { useWallet as useSolanaAdapterWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useToast } from '@/hooks/use-toast';

/**
 * A hook that provides wallet functionality to be used in components
 */
export function useWallet() {
  const { 
    publicKey,
    connected,
    connecting,
    wallet,
    connect,
    disconnect,
    select,
    wallets
  } = useSolanaAdapterWallet();
  
  const { setVisible } = useWalletModal();
  const { toast } = useToast();
  
  // Notify on wallet connection changes
  useEffect(() => {
    if (connected && publicKey) {
      toast({
        title: "Wallet Connected",
        description: `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`,
      });
    }
  }, [connected, publicKey, toast]);
  
  // Format wallet address for display
  const formatAddress = (address?: string) => {
    if (!address) return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };
  
  // Handle wallet connection with error handling
  const connectWallet = async () => {
    try {
      // If wallet is already selected, try connecting
      if (wallet) {
        await connect();
        return true;
      } else {
        // Otherwise open the wallet selection modal
        setVisible(true);
        return true;
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Could not connect wallet",
        variant: "destructive",
      });
      return false;
    }
  };
  
  // Handle wallet disconnection with error handling
  const disconnectWallet = async () => {
    try {
      if (disconnect) {
        await disconnect();
        toast({
          title: "Wallet Disconnected",
          description: "Your wallet has been disconnected",
        });
        return true;
      }
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      toast({
        title: "Disconnection Failed",
        description: error instanceof Error ? error.message : "Could not disconnect wallet",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    connected,
    connecting,
    wallet,
    formatedAddress: publicKey ? formatAddress(publicKey.toString()) : '',
    walletAddress: publicKey?.toString(),
    wallets,
    publicKey,
    connectWallet,
    disconnectWallet,
    select
  };
} 