'use client';

import { useConnection, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useCallback } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useToast } from './use-toast';

export const useSolanaConnection = () => {
  const { connection } = useConnection();
  const { publicKey, connected } = useSolanaWallet();
  const { toast } = useToast();

  /**
   * Request an airdrop of SOL to the connected wallet (only works on devnet and testnet)
   */
  const requestAirdrop = useCallback(async (amount = 1) => {
    if (!publicKey || !connection) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return false;
    }

    try {
      const signature = await connection.requestAirdrop(
        publicKey,
        amount * LAMPORTS_PER_SOL
      );
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      
      const confirmResult = await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });

      if (confirmResult.value.err) {
        toast({
          title: "Airdrop failed",
          description: "Failed to confirm transaction",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Airdrop successful",
        description: `${amount} SOL added to your wallet`,
      });
      return true;
    } catch (error) {
      console.error("Airdrop error:", error);
      toast({
        title: "Airdrop failed",
        description: "Error requesting airdrop. You may be rate limited.",
        variant: "destructive",
      });
      return false;
    }
  }, [connection, publicKey, toast]);

  /**
   * Get the balance of the connected wallet in SOL
   */
  const getBalance = useCallback(async () => {
    if (!publicKey || !connection) return 0;

    try {
      const balance = await connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error("Get balance error:", error);
      return 0;
    }
  }, [connection, publicKey]);

  /**
   * Format a wallet address for display
   */
  const formatWalletAddress = useCallback((address?: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, []);

  return {
    connection,
    publicKey,
    connected,
    requestAirdrop,
    getBalance,
    formatWalletAddress,
  };
};

// Export wallet hooks from solana wallet adapter
export { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'; 