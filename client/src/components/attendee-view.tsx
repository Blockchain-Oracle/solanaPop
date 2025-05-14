import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWallet } from "@/components/walletProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QrCodeIcon, Camera, Ticket } from "lucide-react";
import { Token } from "@shared/schema";
import { format } from "date-fns";

interface AttendeeViewProps {
  onShowTransaction: (token: Token) => void;
}

export default function AttendeeView({ onShowTransaction }: AttendeeViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connected, walletAddress } = useWallet();
  const [scanning, setScanning] = useState(false);
  
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
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/claims/wallet", walletAddress] });
      
      // For demo purposes, show a token successful claim UI
      // In a real app, we would process the QR code data
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
  
  // Handle QR code scanning
  const handleScan = () => {
    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to claim tokens",
        variant: "destructive",
      });
      return;
    }
    
    setScanning(true);
    
    // Simulate QR code scanning
    // In a real app, this would use a QR code scanner
    setTimeout(() => {
      // For demo, claim token ID 1
      claimTokenMutation.mutate(1);
    }, 1500);
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
            className={`w-full max-w-md aspect-square bg-solana-darker/40 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-white/20 mb-6 cursor-pointer transition-all ${scanning ? 'border-solana-green animate-pulse' : ''}`}
            onClick={handleScan}
          >
            <Camera className={`h-16 w-16 mb-4 text-white/50 ${scanning ? 'text-solana-green' : ''}`} />
            <p className="text-white/70 text-center max-w-xs">
              {scanning 
                ? "Scanning..." 
                : "Tap to activate camera and scan event QR code"}
            </p>
          </div>
          
          <Button 
            onClick={handleScan}
            className="button-gradient hover:opacity-90"
            disabled={scanning || !connected}
          >
            <QrCodeIcon className="mr-2 h-4 w-4" /> 
            {scanning ? "Scanning..." : "Scan QR Code"}
          </Button>
        </div>
      </div>
      
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
              <Button className="button-gradient" onClick={handleScan}>
                Scan Your First Token
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
