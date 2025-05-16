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
  alreadyClaimed?: boolean;
}> = ({ tokenSymbol, signature, network = 'devnet', alreadyClaimed }) => (
  <div className="flex flex-col items-center justify-center h-48 w-48 bg-green-50 rounded-md">
    <CheckCircle className="h-16 w-16 text-green-500" />
    <span className="mt-4 text-sm font-medium text-center">
      {alreadyClaimed 
        ? `You've already claimed this ${tokenSymbol} token!`
        : 'Successfully claimed!'}
    </span>
    {signature && !alreadyClaimed && (
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
  
  // Function to verify transaction on backend
  const verifyTransactionOnBackend = async (signature: string) => {
    try {
      console.log("Verifying transaction with backend:", signature);
      const response = await fetch('/api/solana-pay/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId,
          signature,
        }),
      });
      
      const data = await response.json();
      
      // Handle already claimed case
      if (response.status === 409) {
        // Still return success but mark as already claimed
        return { 
          success: true,
          alreadyClaimed: true,
          message: data.error || 'Token already claimed by this wallet'
        };
      }
      
      if (!response.ok) {
        console.error('Backend verification failed:', data);
        return { success: false };
      }
      
      // Return both success state and token transfer data 
      return { 
        success: data.success,
        transferSignature: data.signature,
        explorerUrl: data.explorerUrl
      };
    } catch (error) {
      console.error('Error verifying transaction with backend:', error);
      return { success: false };
    }
  };
  
  // Handle transaction confirmed via WebSocket subscription or polling
  const handleTransactionConfirmed = useCallback(async (signatureInfo: { signature: string }) => {
    if (claimSuccess) return;
    
    try {
      setIsChecking(true);
      
      // Create connection to Solana network to get transaction details
      const connection = new Connection(
        'https://devnet.helius-rpc.com/?api-key=206916f1-2497-4852-89c5-37bba448dfdb',
        {
          commitment: 'confirmed',
          wsEndpoint: 'wss://devnet.helius-rpc.com/?api-key=206916f1-2497-4852-89c5-37bba448dfdb'
        }
      );
      
      const transaction = await connection.getTransaction(signatureInfo.signature, {
        commitment: 'confirmed',
      });
      
      if (!transaction) {
        console.error('Transaction not found despite notification');
        return;
      }
      
      // Verify with backend and trigger the actual token transfer
      const verificationResult = await verifyTransactionOnBackend(signatureInfo.signature);
      
      if (verificationResult.success) {
        setClaimSuccess(true);
        
        // Handle already claimed case
        if (verificationResult.alreadyClaimed) {
          toast({
            title: "Token Already Claimed",
            description: verificationResult.message,
            variant: "default", // or a custom variant for this case
          });
        } else {
          // Normal success case
          setSignature(verificationResult.transferSignature || null);
          triggerClaimConfetti();
          
          toast({
            title: "Token claimed successfully",
            description: "Your token has been successfully claimed and transferred.",
          });
          
          if (onSuccess && verificationResult.transferSignature) {
            onSuccess(verificationResult.transferSignature);
          }
        }
      }
    } catch (error) {
      console.error("Error processing confirmed transaction:", error);
    } finally {
      setIsChecking(false);
    }
  }, [claimSuccess, toast, onSuccess, tokenId]);
  
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
          // recipient: publicKey?.toString() || '',
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
    
    // Use your QuickNode endpoint here for more reliable WebSockets if available
    const endpoint = 'https://devnet.helius-rpc.com/?api-key=206916f1-2497-4852-89c5-37bba448dfdb';
    const connection = new Connection(endpoint, {
      commitment: 'confirmed',
      wsEndpoint: 'wss://devnet.helius-rpc.com/?api-key=206916f1-2497-4852-89c5-37bba448dfdb'
    });
    let subscriptionId: number | null = null;
    let isWebSocketActive = false;
    let pollInterval: NodeJS.Timeout | null = null;
    
    // Convert reference string back to PublicKey
    let referenceKey: PublicKey;
    try {
      referenceKey = new PublicKey(reference);
    } catch (error) {
      console.error("Invalid reference key:", error);
      return;
    }
    
    console.log("Setting up transaction monitoring for reference:", referenceKey.toString());
    
    // Function to check for transaction using polling (fallback)
    const checkForTransactionWithPolling = async () => {
      if (claimSuccess) return;
      
      try {
        console.log("Polling for signatures...");
        const signatures = await connection.getSignaturesForAddress(referenceKey, { limit: 10 });
        
        if (signatures.length > 0) {
          // Get the most recent signature
          const latestSignature = signatures[0];
          console.log("Found transaction via polling:", latestSignature.signature);
          
          // Trigger confirmation handler
          handleTransactionConfirmed({
            signature: latestSignature.signature
          });
          
          // Clear polling if successful
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      } catch (error) {
        console.error("Error polling for signatures:", error);
      }
    };
    
    // Try to set up WebSocket subscription first
    try {
      console.log("Attempting to set up WebSocket...");
      
      // Track WebSocket setup attempt
      const webSocketSetupTimeout = setTimeout(() => {
        console.log("WebSocket setup timed out, falling back to polling");
        if (!isWebSocketActive && !pollInterval) {
          pollInterval = setInterval(checkForTransactionWithPolling, 3000);
        }
      }, 5000);
      
      // Set up WebSocket subscription with error handling
      subscriptionId = connection.onAccountChange(
        referenceKey,
        (accountInfo, context) => {
          console.log("Account change detected for reference:", context);
          isWebSocketActive = true;
          clearTimeout(webSocketSetupTimeout);
          
          // Query for transactions that include our reference
          connection.getSignaturesForAddress(referenceKey, { limit: 10 })
            .then(signatures => {
              if (signatures.length > 0) {
                // Get the most recent signature
                const latestSignature = signatures[0];
                console.log("Found transaction via WebSocket:", latestSignature.signature);
                
                // Trigger confirmation handler
                handleTransactionConfirmed({
                  signature: latestSignature.signature
                });
                
                // Clear polling if it was active
                if (pollInterval) {
                  clearInterval(pollInterval);
                  pollInterval = null;
                }
              }
            })
            .catch(error => {
              console.error("Error getting signatures:", error);
            });
        },
        'confirmed'
      );
      
      console.log("WebSocket subscription set up with ID:", subscriptionId);
      
      // Set up a timer to check if WebSocket is working after 3 seconds
      setTimeout(() => {
        if (!isWebSocketActive && !claimSuccess) {
          console.log("WebSocket not active after timeout, falling back to polling");
          // Fall back to polling if WebSocket doesn't become active
          if (!pollInterval) {
            pollInterval = setInterval(checkForTransactionWithPolling, 3000);
          }
        }
      }, 3000);
    } catch (error) {
      console.error("Error setting up WebSocket, falling back to polling:", error);
      // Set up polling as fallback
      if (!pollInterval) {
        pollInterval = setInterval(checkForTransactionWithPolling, 3000);
      }
    }
    
    // Clean up subscriptions and intervals
    return () => {
      console.log("Cleaning up monitoring...");
      
      // Clean up WebSocket if it was set up
      if (subscriptionId !== null) {
        try {
          console.log("Removing WebSocket subscription:", subscriptionId);
          connection.removeAccountChangeListener(subscriptionId)
            .catch(error => console.error("Error removing WebSocket listener:", error));
        } catch (err) {
          console.error("Error during WebSocket cleanup:", err);
        }
      }
      
      // Clean up polling interval if it was set up
      if (pollInterval) {
        console.log("Clearing polling interval");
        clearInterval(pollInterval);
      }
    };
  }, [reference, connected, claimSuccess, handleTransactionConfirmed]);
  
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
          network={'devnet'}
          alreadyClaimed={!signature} // If we don't have a signature but success is true, it was already claimed
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