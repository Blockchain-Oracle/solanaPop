import React, { useState, useEffect, ReactNode, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, RefreshCw, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createTokenClaimQR, getQRCodeAsBase64, createReferenceFromTokenId } from '@/lib/solana-pay';
import { useToast } from "@/hooks/use-toast";
import { findReference, validateTransfer } from '@solana/pay';
import { Connection, PublicKey } from '@solana/web3.js';
import confetti from 'canvas-confetti';
import { useWallet } from '@solana/wallet-adapter-react';

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

// We can get this from backend responses
interface SolanaPayResponse {
  transaction: string;
  message: string;
  reference?: string;
}

type TokenClaimQRProps = {
  tokenId: number;
  tokenName?: string;
  tokenSymbol?: string;
  expiryMinutes?: number;
  refreshInterval?: number; // in seconds
  onSuccess?: (signature: string) => void;
  hideTitle?: boolean;
};

export function TokenClaimQR({
  tokenId,
  tokenName = '',
  tokenSymbol = '',
  expiryMinutes = 30,
  refreshInterval = 0, // 0 means no auto-refresh
  onSuccess,
  hideTitle = false
}: TokenClaimQRProps) {
  const { toast } = useToast();
  const { wallet, publicKey, connected } = useWallet();
  const [qrCodeSrc, setQrCodeSrc] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  
  // Create the reference from the token ID and wallet address
  useEffect(() => {
    if (isInitialized || !tokenId || !publicKey) return;
    
    try {
      // Generate a deterministic reference for WebSocket monitoring
      const referenceObj = createReferenceFromTokenId(tokenId, publicKey.toString());
      setReference(referenceObj.referenceString);
      setIsInitialized(true);
      console.log("Set reference:", referenceObj.referenceString);
    } catch (error) {
      console.error("Error creating reference:", error);
    }
  }, [tokenId, publicKey, isInitialized]);
  
  // Generate QR code when wallet is connected
  useEffect(() => {
    if (!connected || !publicKey || !tokenId) {
      setQrCodeSrc(null);
      return;
    }
    
    async function generateQR() {
      try {
        setIsGeneratingQR(true);
        const baseUrl = window.location.origin;
        
        // Use string tokenId for the API URL but parse it to number for the reference
        const qrCode = createTokenClaimQR({
          recipient: publicKey?.toString() || '',
          tokenId: (tokenId),
          baseUrl,
          userWallet: publicKey?.toString() || '',
        });
        
        const qrBase64 = await getQRCodeAsBase64(qrCode);
        if (typeof qrBase64 === 'string') {
          setQrCodeSrc(qrBase64);
        }
      } catch (error) {
        console.error("Error generating QR code:", error);
        toast({
          title: "Error",
          description: "Failed to generate QR code",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingQR(false);
      }
    }
    
    generateQR();
  }, [connected, publicKey, tokenId, toast]);
  
  // Set up WebSocket for transaction tracking
  useEffect(() => {
    if (!reference || !connected || claimSuccess) return;
    
    const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(endpoint, 'confirmed');
    
    // Convert reference string back to PublicKey
    let referenceKey: PublicKey;
    try {
      referenceKey = new PublicKey(reference);
    } catch (error) {
      console.error("Invalid reference key:", error);
      return;
    }
    
    console.log("Setting up WebSocket for reference:", referenceKey.toString());
    
    // Set up WebSocket subscription
    const subscriptionId = connection.onAccountChange(
      referenceKey,
      (accountInfo, context) => {
        console.log("Account change detected for reference:", context);
        
        // Query for transactions that include our reference
        connection.getSignaturesForAddress(referenceKey, { limit: 10 })
          .then(signatures => {
            if (signatures.length > 0) {
              // Get the most recent signature
              const latestSignature = signatures[0];
              console.log("Found transaction:", latestSignature.signature);
              
              // Trigger confirmation handler
              handleTransactionConfirmed({
                signature: latestSignature.signature
              });
            }
          })
          .catch(error => {
            console.error("Error getting signatures:", error);
          });
      },
      'confirmed'
    );
    
    // Clean up subscription
    return () => {
      console.log("Cleaning up WebSocket subscription");
      connection.removeAccountChangeListener(subscriptionId)
        .catch(error => console.error("Error removing listener:", error));
    };
  }, [reference, connected, claimSuccess]);
    
  // Function to verify transaction on backend
  const verifyTransactionOnBackend = async (signature: string) => {
    try {
      console.log("Verifying transaction with backend:", signature);
      const response = await fetch('/api/solana-pay/token/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId,
          signature,
        }),
      });
      
      if (!response.ok) {
        console.error('Backend verification failed:', await response.text());
        return { success: false };
      }
      
      const data = await response.json();
      
      // Return both success state and token transfer data 
      return { 
        success: data.success,
        transferSignature: data.signature, // Signature of the actual token transfer
        explorerUrl: data.explorerUrl
      };
    } catch (error) {
      console.error('Error verifying transaction with backend:', error);
      return { success: false };
    }
  };
  
  // Handle transaction confirmed via WebSocket subscription
  const handleTransactionConfirmed = useCallback(async (signatureInfo: { signature: string }) => {
    if (claimSuccess) return;
    
    try {
      setIsChecking(true);
      
      // Create connection to Solana network to get transaction details
      const connection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
      );
      
      // Get the transaction details of the verification transaction (user-signed)
      const transaction = await connection.getTransaction(signatureInfo.signature, {
        commitment: 'confirmed',
      });
      
      if (!transaction) {
        console.error('Transaction not found despite WebSocket notification');
        return;
      }
      
      // Verify with backend and trigger the actual token transfer
      const verificationResult = await verifyTransactionOnBackend(signatureInfo.signature);
      
      if (verificationResult.success) {
        // Store the token transfer signature, not the verification signature
        setClaimSuccess(true);
        setSignature(verificationResult.transferSignature || null);
        
        // Trigger confetti
        triggerClaimConfetti();
        
        toast({
          title: "Token claimed successfully",
          description: "Your token has been successfully claimed and transferred.",
        });
        
        if (onSuccess && verificationResult.transferSignature) {
          onSuccess(verificationResult.transferSignature);
        }
      }
    } catch (error) {
      console.error("Error processing confirmed transaction:", error);
    } finally {
      setIsChecking(false);
    }
  }, [claimSuccess, toast, onSuccess, tokenId]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    setQrCodeSrc(null);
    setClaimSuccess(false);
    setSignature(null);
    setReference(null);
  };
  
  // Handle download QR code
  const handleDownload = () => {
    if (!qrCodeSrc) return;
    
    const a = document.createElement('a');
    a.href = qrCodeSrc as string;
    a.download = `token-claim-${tokenId}-${tokenSymbol || ''}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Determine what to show in the QR code area
  const renderQRContent = (): React.ReactNode => {
    if (!qrCodeSrc) {
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
    
    if (qrCodeSrc) {
      return <QRDisplay qrCode={qrCodeSrc} tokenSymbol={tokenSymbol} />;
    }
    
    return <QRError />;
  };
  
  return (
    <Card>
      {!hideTitle && (
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
      )}
      <CardContent className="flex justify-center">
        {renderQRContent()}
      </CardContent>
      <CardFooter className="flex justify-center space-x-2">
        {!claimSuccess && (
          <Button variant="outline" onClick={handleRefresh} disabled={!qrCodeSrc}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh QR
          </Button>
        )}
        {qrCodeSrc && !claimSuccess && (
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