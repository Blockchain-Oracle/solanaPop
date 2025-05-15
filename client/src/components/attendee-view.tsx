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

interface AttendeeViewProps {
  onShowTransaction: (token: Token) => void;
}

export default function AttendeeView({ onShowTransaction }: AttendeeViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connected, walletAddress } = useWallet();
  const [scanning, setScanning] = useState(false);
  const [processingQR, setProcessingQR] = useState(false);
  
  // Get claimed tokens by wallet address using the enhanced endpoint
  const { data: claims, isLoading } = useQuery({
    queryKey: ["/api/claims/wallet", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const response = await fetch(`/api/claims/wallet/${walletAddress}/with-tokens`);
      if (!response.ok) throw new Error("Failed to fetch claims");
      return response.json();
    },
    enabled: !!walletAddress && connected,
  });
  
  // Claim token mutation
  const claimTokenMutation = useMutation({
    mutationFn: async (tokenId: number) => {
      if (!walletAddress) throw new Error("Wallet not connected");
      
      const data = {
        tokenId,
        userId: 1, // Hardcoded for demo
        walletAddress,
      };
      
      const response = await apiRequest("POST", "/api/claims", data);
      
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
      queryClient.invalidateQueries({ queryKey: ["/api/claims/wallet", walletAddress] });
      
      // Show token claim success UI
      onShowTransaction(data.token);
    },
    onError: (error) => {
      toast({
        title: "Claim failed",
        description: error.message || "Failed to claim token",
        variant: "destructive",
      });
      setScanning(false);
    },
  });
  
  // Handle QR code scan result
  const handleQrScan = (qrData: string) => {
    try {
      // Set processing state to true
      setProcessingQR(true);
      
      console.log("QR Data received:", qrData);
      
      // Parse QR data
      // Expected format: solanapop://token/{tokenId}/{tokenSymbol}
      const tokenPattern = /solanapop:\/\/token\/(\d+)\/([A-Z0-9]+)/;
      const match = qrData.match(tokenPattern);
      
      if (!match) {
        toast({
          title: "Invalid QR Code",
          description: "This QR code is not a valid Solana POP token",
          variant: "destructive",
        });
        setScanning(false);
        setProcessingQR(false);
        return;
      }
      
      const tokenId = parseInt(match[1]);
      const tokenSymbol = match[2];
      
      console.log(`Token detected: ID=${tokenId}, Symbol=${tokenSymbol}`);
      
      // Play success sound
      playSuccessBeep();
      
      // Claim the token after a brief delay to show the success indicator
      setTimeout(() => {
        claimTokenMutation.mutate(tokenId);
        setProcessingQR(false);
      }, 1000);
      
    } catch (error) {
      console.error("Error parsing QR data:", error);
      toast({
        title: "Invalid QR Code",
        description: "Could not process the QR code data",
        variant: "destructive",
      });
      setProcessingQR(false);
      setScanning(false);
    }
  };

  // Handle QR code scanning
  const handleScanClick = () => {
    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to claim tokens",
        variant: "destructive",
      });
      return;
    }
    
    setScanning(true);
  };

  return (
    <div className="mb-12">
      {/* Welcome Section */}
      <div className="glass rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-space font-bold mb-3">Claim Your Tokens</h2>
        <p className="text-white/70 mb-4">Scan QR codes from events to collect proof-of-participation tokens on Solana.</p>
        
        <div className="flex items-center space-x-2 p-3 bg-solana-darker/40 rounded-lg w-fit">
          <div className={`h-2 w-2 rounded-full ${connected ? "bg-solana-green" : "bg-destructive"}`}></div>
          <span className="text-sm text-white/90">
            {connected 
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
              disabled={!connected}
            >
              <QrCodeIcon className="mr-2 h-4 w-4" /> 
              Scan QR Code
            </Button>
            
            {/* Dev testing button - remove in production */}
            <Button 
              onClick={() => handleQrScan("solanapop://token/1/DEMO")}
              variant="outline"
              className="bg-solana-darker/40 border-white/10 text-xs"
              disabled={!connected}
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
      <Dialog open={scanning} onOpenChange={(open) => !open && setScanning(false)}>
        <DialogContent className="glass border-0 max-w-md mx-4 p-6">
          {processingQR ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-16 w-16 rounded-full bg-solana-green/20 flex items-center justify-center mb-4">
                <ScanLine className="h-8 w-8 text-solana-green animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Processing QR Code</h3>
              <p className="text-white/70 text-center">Verifying token and processing claim...</p>
            </div>
          ) : (
            <QRCodeScanner 
              onScan={handleQrScan} 
              onClose={() => setScanning(false)}
              isScanning={scanning}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Collection Section */}
      <div className="glass rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-space font-bold">Your Collection</h3>
          <div className="text-xs px-3 py-1 rounded-full bg-solana-darker/40 text-white/70">
            {isLoading ? "Loading..." : `${claims?.length || 0} Tokens`}
          </div>
        </div>
        
        {!connected ? (
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
