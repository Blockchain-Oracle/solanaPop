'use client';

import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { useCallback, useMemo } from 'react';

interface WalletButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  className?: string;
  showAddress?: boolean;
}

export function WalletButton({ 
  variant = 'default', 
  className = '',
  showAddress = true
}: WalletButtonProps) {
  const { setVisible } = useWalletModal();
  const { wallet, disconnect, publicKey, connecting, connected } = useWallet();
  
  const walletAddress = useMemo(() => {
    if (!publicKey) return '';
    const address = publicKey.toBase58();
    return showAddress ? `${address.slice(0, 4)}...${address.slice(-4)}` : '';
  }, [publicKey, showAddress]);

  const handleButtonClick = useCallback(() => {
    if (connected) {
      disconnect();
    } else {
      setVisible(true);
    }
  }, [connected, disconnect, setVisible]);

  const buttonText = useMemo(() => {
    if (connecting) return 'Connecting...';
    if (connected) return showAddress ? `Disconnect ${walletAddress}` : 'Disconnect';
    return 'Connect Wallet';
  }, [connecting, connected, walletAddress, showAddress]);

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleButtonClick}
      disabled={connecting}
    >
      {buttonText}
    </Button>
  );
} 