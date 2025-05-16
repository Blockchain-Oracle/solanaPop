import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, RefreshCw, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createTokenClaimQR, getQRCodeAsBase64, createReferenceFromTokenId } from '@/lib/solana-pay';
import { useToast } from "@/hooks/use-toast";
import { findReference } from '@solana/pay';
import { Connection, PublicKey } from '@solana/web3.js';
import confetti from 'canvas-confetti';

// Helper component for QR success state
const ClaimSuccess: React.FC<{ 
  tokenSymbol: string;
  signature: string | null;
  network?: string;
}> = ({ tokenSymbol, signature, network = 'devnet' }) => (
  <div className="flex flex-col items-center justify-center h-48 w-48 bg-green-50 rounded-md">
    <CheckCircle className="h-16 w-16 text-green-500" />
    <span className="mt-4 text-sm font-medium text-center">
      Successfully claimed!
    </span>
    {signature && (
      <a 
        href={`https://explorer.solana.com/tx/${signature}?cluster=${network}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 text-xs text-blue-500 underline"
      >
        View on Explorer
      </a>
    )}
  </div>
);

// Helper component for QR loading state
const QRLoading: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-48 w-48">
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="mt-2 text-sm">Generating QR code...</span>
  </div>
);

// Helper component for QR display
const QRDisplay: React.FC<{ 
  qrCode: string;
  tokenSymbol: string;
}> = ({ qrCode, tokenSymbol }) => (
  <div className="relative h-48 w-48 bg-white p-2 rounded-md">
    <img
      src={qrCode}
      alt={`QR code for claiming ${tokenSymbol || 'token'}`}
      className="w-full h-full object-contain"
    />
  </div>
);

// Helper component for QR error state
const QRError: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-48 w-48 border border-dashed rounded-md">
    <span className="text-sm text-center text-gray-500">
      Could not generate QR code. Please try refreshing.
    </span>
  </div>
);

// Helper function to trigger confetti
export const triggerClaimConfetti = () => {
  if (typeof window !== 'undefined') {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
};

type TokenClaimQRProps = {
  tokenId: number;
  tokenName?: string;
  tokenSymbol?: string;
  expiryMinutes?: number;
  refreshInterval?: number; // in seconds
  onSuccess?: (signature: string) => void;
};

export function TokenClaimQR({
  tokenId,
  tokenName = '',
  tokenSymbol = '',
  expiryMinutes = 30,
  refreshInterval = 0, // 0 means no auto-refresh
  onSuccess
}: TokenClaimQRProps) {
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Get the base URL (protocol + host)
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : '';
  
  // Get the user's wallet address if available
  const userWalletAddress = typeof window !== 'undefined' && window.solana?.publicKey 
    ? window.solana.publicKey.toString() 
    : '';
  
  // Generate QR code
  const { data: qrCode, isLoading: isGeneratingQR, refetch } = useQuery({
    queryKey: ['tokenQR', tokenId, qrTimestamp, userWalletAddress],
    queryFn: async (): Promise<string | null> => {
      if (!baseUrl) return null;
      console.log(baseUrl);
      const qr = createTokenClaimQR({
        tokenId,
        baseUrl,
        label: `Claim ${tokenName} (${tokenSymbol})`,
        message: `Scan to claim your ${tokenSymbol} token`,
        userWallet: userWalletAddress // Pass user wallet for unique reference
      });
      
      const base64 = await getQRCodeAsBase64(qr);
      return base64 as string;
    },
    enabled: Boolean(baseUrl)
  });
  
  // For monitoring transaction completion
  const [isChecking, setIsChecking] = useState(false);
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  
  // Create a reference for tracking when generating QR code
  useEffect(() => {
    if (qrCode) {
      // Use consistent reference from tokenId and user wallet that matches the one in the QR code
      const { referenceString } = createReferenceFromTokenId(tokenId, userWalletAddress);
      setTransactionRef(referenceString);
    }
  }, [qrCode, tokenId, userWalletAddress]);
  
  // Function to check for transaction completion
  const checkForTransaction = useCallback(async () => {
    if (!transactionRef || isChecking || claimSuccess) return;
    
    try {
      setIsChecking(true);
      
      // Create connection to Solana network
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      );
      
      // Use Solana Pay's findReference to find the transaction
      const referencePubkey = new PublicKey(transactionRef);
      const signatureInfo = await findReference(connection, referencePubkey, { finality: 'confirmed' });
      
      if (signatureInfo) {
        // Transaction is confirmed! No need to verify via backend
        setClaimSuccess(true);
        setSignature(signatureInfo.signature);
        
        // Trigger confetti
        triggerClaimConfetti();
        
        toast({
          title: "Token claimed successfully",
          description: "Your token has been successfully claimed.",
        });
        
        if (onSuccess) {
          onSuccess(signatureInfo.signature);
        }
      }
    } catch (error) {
      // If findReference throws, the transaction isn't found yet
      console.log("Transaction not found yet, polling...");
    } finally {
      setIsChecking(false);
    }
  }, [transactionRef, isChecking, claimSuccess, toast, onSuccess]);
  
  // Poll for transaction completion
  useEffect(() => {
    if (!transactionRef || claimSuccess) return;
    
    const intervalId = setInterval(() => {
      checkForTransaction();
    }, 3000); // Check every 3 seconds
    
    return () => clearInterval(intervalId);
  }, [transactionRef, checkForTransaction, claimSuccess]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    setQrTimestamp(Date.now());
    setClaimSuccess(false);
    setSignature(null);
  };
  
  // Handle download QR code
  const handleDownload = () => {
    if (!qrCode) return;
    
    const a = document.createElement('a');
    a.href = qrCode as string;
    a.download = `token-claim-${tokenId}-${tokenSymbol || ''}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Determine what to show in the QR code area
  const renderQRContent = (): React.ReactNode => {
    if (isGeneratingQR) {
      return <QRLoading />;
    }
    
    if (claimSuccess) {
      return (
        <ClaimSuccess 
          tokenSymbol={tokenSymbol} 
          signature={signature} 
          network={process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'} 
        />
      );
    }
    
    if (qrCode) {
      return <QRDisplay qrCode={qrCode} tokenSymbol={tokenSymbol} />;
    }
    
    return <QRError />;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim Token QR Code</CardTitle>
        <CardDescription>
          {claimSuccess 
            ? `You've successfully claimed your ${tokenSymbol} token!` 
            : `Scan this QR code with a Solana Pay compatible wallet to claim your token.`}
          {!claimSuccess && refreshInterval > 0 && (
            <span className="block text-xs mt-1">
              QR code refreshes every {refreshInterval} seconds for security.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {renderQRContent()}
      </CardContent>
      <CardFooter className="flex justify-center space-x-2">
        {!claimSuccess && (
          <Button variant="outline" onClick={handleRefresh} disabled={isGeneratingQR}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh QR
          </Button>
        )}
        {qrCode && !claimSuccess && (
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
        {claimSuccess && (
          <Button onClick={handleRefresh}>
            Generate New Code
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 