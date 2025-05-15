import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCodeIcon, Camera, Ticket, ScanLine } from "lucide-react";
import { Token } from "@shared/schema";
import { format } from "date-fns";
import { QRCodeScanner } from "@/components/qr-code-scanner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { playSuccessBeep } from "@/lib/sound";
import { useIsMobile } from "@/hooks/use-mobile";
import { CheckIcon } from "lucide-react";

interface AttendeeViewProps {
  onShowTransaction?: (token: Token) => void;
}

export default function AttendeeView({ onShowTransaction }: AttendeeViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wallet = useWallet();
  const isMobile = useIsMobile();
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Get claimed tokens by wallet address using the enhanced endpoint
  const { data: claims, isLoading } = useQuery({
    queryKey: ["/api/claims/wallet", wallet.walletAddress],
    queryFn: async () => {
      if (!wallet.walletAddress) return [];
      const response = await fetch(`/api/claims/wallet/${wallet.walletAddress}/with-tokens`);
      if (!response.ok) throw new Error("Failed to fetch claims");
      return response.json();
    },
    enabled: !!wallet.walletAddress && wallet.connected,
  });
  
  // Claim token mutation
  const claimTokenMutation = useMutation({
    mutationFn: async (tokenId: number) => {
      if (!wallet.walletAddress) throw new Error("Wallet not connected");
      
      const data = {
        tokenId,
        userId: 1, // Hardcoded for demo
        walletAddress: wallet.walletAddress,
      };
      
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific error cases
        if (response.status === 409) {
          if (errorData.error === 'Token already claimed') {
            throw new Error("You've already claimed this token");
          } else if (errorData.error === 'Token supply exhausted') {
            throw new Error("This token has reached its maximum supply");
          } else if (errorData.error === 'Token expired') {
            throw new Error("This token has expired and can no longer be claimed");
          }
        }
        
        throw new Error(errorData.message || "Failed to claim token");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/claims/wallet", wallet.walletAddress] });
      
      // Show token claim success UI
      toast({
        title: "Token Claimed!",
        description: `${data.token.symbol} has been added to your collection`,
      });
      
      // Trigger transaction visualization if provided
      if (onShowTransaction && data.token) {
        onShowTransaction(data.token);
      }
      
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error("Failed to claim token:", error);
      toast({
        title: "Claim Failed",
        description: error instanceof Error ? error.message : "Failed to claim token",
        variant: "destructive",
      });
      setIsScanning(false);
    },
  });
  
  // Define a helper function to extract token ID and symbol from QR data
  const parseQrData = (qrData: string): { tokenId: string; tokenSymbol: string } | null => {
    // Expected format: solanapop://token/{tokenId}/{tokenSymbol}
    const qrRegex = /solanapop:\/\/token\/([^/]+)\/([^/]+)/;
    const match = qrData.match(qrRegex);
    
    if (!match || match.length < 3) {
      return null;
    }
    
    return {
      tokenId: match[1],
      tokenSymbol: match[2]
    };
  };
  
  const handleQrScan = async (qrData: string) => {
    setIsProcessing(true);
    console.log("QR scan result:", qrData);
    
    try {
      // Parse the QR data
      const tokenData = parseQrData(qrData);
      
      if (!tokenData) {
        toast({
          title: 'Invalid QR Code',
          description: 'This QR code does not contain valid token data',
          variant: 'destructive'
        });
        setIsProcessing(false);
        return;
      }
      
      console.log(`Detected token: ID=${tokenData.tokenId}, Symbol=${tokenData.tokenSymbol}`);
      
      // Play success sound
      playSuccessBeep();
      
      // Show success state briefly
      setShowSuccess(true);
      setIsScanning(false);
      
      // Add a short delay to allow the success UI to show before claiming the token
      setTimeout(() => {
        // Claim the scanned token
        claimTokenMutation.mutate(parseInt(tokenData.tokenId));
      }, 1000);
      
    } catch (error) {
      console.error('Error handling QR scan:', error);
      toast({
        title: 'Scan Failed',
        description: 'Could not process the QR code. Please try again.',
        variant: 'destructive'
      });
      setIsProcessing(false);
    }
  };
  
  const handleScanClick = () => {
    if (!wallet.connected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to scan for tokens',
        variant: 'destructive'
      });
      return;
    }
    
    setIsScanning(true);
  };
  
  const handleCloseScanner = () => {
    setIsScanning(false);
  };
  
  // For development/testing without hardware camera
  const handleSimulateScan = () => {
    if (!wallet.connected) return;
    handleQrScan('solanapop://token/1/DEMO');
  };

  return (
    <div className="mb-12">
      {/* Welcome Section */}
      <div className="glass rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-space font-bold mb-3">Claim Your Tokens</h2>
        <p className="text-white/70 mb-4">Scan QR codes from events to collect proof-of-participation tokens on Solana.</p>
        
        <div className="flex items-center space-x-2 p-3 bg-solana-darker/40 rounded-lg w-fit">
          <div className={`h-2 w-2 rounded-full ${wallet.connected ? "bg-solana-green" : "bg-destructive"}`}></div>
          <span className="text-sm text-white/90">
            {wallet.connected 
              ? "Wallet Connected" 
              : "Wallet not connected"}
          </span>
        </div>
      </div>
      
      {/* QR Scanner */}
      <div className="glass rounded-xl p-6 mb-8">
        <h3 className="text-xl font-space font-bold mb-4">Scan QR Code</h3>
        
        <div className="flex flex-col items-center">
          <div 
            className="w-full max-w-md aspect-square bg-solana-darker/40 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-white/20 mb-6 cursor-pointer hover:border-white/30 transition-all relative overflow-hidden"
            onClick={handleScanClick}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 z-10"></div>
            <Camera className="h-16 w-16 mb-4 text-white/50 z-20" />
            <p className="text-white/70 text-center max-w-xs z-20">
              Tap to activate camera and scan event QR code
            </p>
            
            {/* Animated scanning line */}
            <div className="absolute left-0 right-0 h-1 bg-solana-green/40 z-20" 
                 style={{ 
                   top: '20%', 
                   animation: 'scanLine 2s linear infinite',
                   boxShadow: '0 0 8px rgba(132, 255, 132, 0.8)'
                 }}>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-2 w-full max-w-md">
            <Button 
              onClick={handleScanClick}
              className="button-gradient hover:opacity-90"
              disabled={!wallet.connected}
            >
              <QrCodeIcon className="mr-2 h-4 w-4" /> 
              Scan QR Code
            </Button>
            
            {/* Dev testing button - remove in production */}
            <Button 
              onClick={handleSimulateScan}
              variant="outline"
              className="bg-solana-darker/40 border-white/10 text-xs"
              disabled={!wallet.connected}
            >
              Simulate Scan (Dev Only)
            </Button>
          </div>
          
          <style>
            {`
            @keyframes scanLine {
              0% {
                top: 20%;
              }
              50% {
                top: 80%;
              }
              100% {
                top: 20%;
              }
            }
            `}
          </style>
        </div>
      </div>
      
      {/* QR Scanner Modal */}
      {isScanning && (
        <Dialog open={isScanning} onOpenChange={(open) => !open && setIsScanning(false)}>
          <DialogContent className="sm:max-w-sm p-0 bg-solana-darker border-solana-darkest">
            <QRCodeScanner 
              onScan={handleQrScan} 
              onClose={() => setIsScanning(false)}
              isScanning={isScanning}
            />
          </DialogContent>
        </Dialog>
      )}
      
      {/* Success overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="success-container text-center p-8 bg-solana-darker rounded-xl border border-solana-green/30">
            <div className="check-circle mb-4 mx-auto w-16 h-16 rounded-full bg-solana-green/20 flex items-center justify-center">
              <CheckIcon className="w-8 h-8 text-solana-green" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Token Found!</h3>
            <p className="text-white/70 mb-4">Claiming your new token...</p>
          </div>
        </div>
      )}
      
      {/* Collection Section */}
      <div className="glass rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-space font-bold">Your Collection</h3>
          <div className="text-xs px-3 py-1 rounded-full bg-solana-darker/40 text-white/70">
            {isLoading ? "Loading..." : `${claims?.length || 0} Tokens`}
          </div>
        </div>
        
        {!wallet.connected ? (
          <Card className="bg-solana-darker/40 border-0">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-white/70 mb-4">Connect your wallet to view your tokens</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="text-center py-8 text-white/70">Loading your tokens...</div>
        ) : claims?.length ? (
          <div className="space-y-4">
            {claims.map((claim: any) => (
              <div key={claim.id} className="gradient-border">
                <div className="glass rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    {/* Token Icon */}
                    <div className="h-16 w-16 rounded-lg button-gradient flex items-center justify-center">
                      <Ticket className="h-8 w-8 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-space font-bold text-lg">{claim.token.name}</h4>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs bg-solana-darker/60 text-solana-green px-2 py-0.5 rounded">{claim.token.symbol}</span>
                        <span className="text-xs text-white/70">
                          Obtained on {format(new Date(claim.claimedAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-sm text-white/60 mt-2">{claim.token.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-solana-darker/40 border-0">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-white/70 mb-4">No tokens claimed yet</p>
              <Button className="button-gradient" onClick={handleScanClick}>
                Scan Your First Token
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
