import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, RefreshCw } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { createTokenClaimQR, getQRCodeAsBase64 } from '@/lib/solana-pay';
import { useToast } from "@/hooks/use-toast";
import { findReference } from '@solana/pay';
import { Connection, PublicKey } from '@solana/web3.js';

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
  const { toast } = useToast();
  
  // Get the base URL (protocol + host)
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : '';
  
  // Generate QR code
  const { data: qrCode, isLoading: isGeneratingQR, refetch } = useQuery({
    queryKey: ['tokenQR', tokenId, qrTimestamp],
    queryFn: async () => {
      if (!baseUrl) return null;
      console.log(baseUrl);
      const qr = createTokenClaimQR({
        tokenId,
        baseUrl,
        label: `Claim ${tokenName} (${tokenSymbol})`,
        message: `Scan to claim your ${tokenSymbol} token`,
      });
      
      const base64 = await getQRCodeAsBase64(qr);
      return base64;
    },
    enabled: Boolean(baseUrl)
  });
  
  // For monitoring transaction completion
  const [isChecking, setIsChecking] = useState(false);
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  
  // Create a reference for tracking when generating QR code
  useEffect(() => {
    if (qrCode) {
      // Generate a unique reference for this QR session
      const reference = crypto.randomUUID();
      setTransactionRef(reference);
    }
  }, [qrCode]);
  
  // Verify transaction mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ signature }: { signature: string }) => {
      const response = await fetch('/api/solana-pay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          tokenId,
          walletAddress: window.solana?.publicKey?.toString() || '',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify transaction');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setClaimSuccess(true);
      toast({
        title: "Token claimed successfully",
        description: "Your token has been successfully claimed.",
      });
      
      if (onSuccess && data.claim?.transactionId) {
        onSuccess(data.claim.transactionId);
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to verify claim",
        description: error instanceof Error ? error.message : "Failed to verify claim",
        variant: "destructive",
      });
    },
  });
  
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
        // Transaction is confirmed! Verify it
        await verifyMutation.mutateAsync({ signature: signatureInfo.signature });
      }
    } catch (error) {
      // If findReference throws, the transaction isn't found yet
      console.log("Transaction not found yet, polling...");
    } finally {
      setIsChecking(false);
    }
  }, [transactionRef, isChecking, claimSuccess, verifyMutation]);
  
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
  
  // Check if qrCode exists and is a string to satisfy type checking
  const qrCodeContent = qrCode && typeof qrCode === 'string' ? (
    <Button variant="outline" onClick={handleDownload}>
      <Download className="h-4 w-4 mr-2" />
      Download
    </Button>
  ) : null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim Token QR Code</CardTitle>
        <CardDescription>
          Scan this QR code with a Solana Pay compatible wallet to claim your token.
          {refreshInterval > 0 && (
            <span className="block text-xs mt-1">
              QR code refreshes every {refreshInterval} seconds for security.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {isGeneratingQR ? (
          <div className="flex flex-col items-center justify-center h-48 w-48">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="mt-2 text-sm">Generating QR code...</span>
          </div>
        ) : qrCode ? (
          <div className="relative h-48 w-48 bg-white p-2 rounded-md">
            <img
              src={qrCode as string}
              alt={`QR code for claiming ${tokenSymbol || 'token'}`}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 w-48 border border-dashed rounded-md">
            <span className="text-sm text-center text-gray-500">
              Could not generate QR code. Please try refreshing.
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center space-x-2">
        <Button variant="outline" onClick={handleRefresh} disabled={isGeneratingQR}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh QR
        </Button>
        {qrCodeContent}
      </CardFooter>
    </Card>
  );
} 