import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { TransactionModal } from "@/components/transaction-modal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Wallet, Shield, Award, CheckCircle } from "lucide-react";

interface ClaimProps {
  params: {
    id: string;
  };
}

export default function Claim({ params }: ClaimProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { connected, walletAddress, connectWallet } = useWallet();
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const tokenId = parseInt(params.id);
  
  // Get token data
  const { data: token, isLoading, error } = useQuery({
    queryKey: ["/api/tokens", tokenId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/tokens/${tokenId}`);
        if (!response.ok) throw new Error("Token not found");
        return response.json();
      } catch (error) {
        console.error("Error fetching token:", error);
        throw error;
      }
    },
    enabled: !isNaN(tokenId),
    retry: 1,
  });
  
  // Check if wallet is already connected
  useEffect(() => {
    if (!connected && token) {
      toast({
        title: "Connect wallet",
        description: "Connect your wallet to claim this token",
      });
    }
  }, [connected, token, toast]);
  
  // Handle claim button click
  const handleClaim = () => {
    if (!connected) {
      connectWallet();
      return;
    }
    
    if (token) {
      setShowTransactionModal(true);
    }
  };
  
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Header onReturnHome={() => navigate("/")} />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 text-solana-green animate-spin" />
          <span className="ml-2 text-lg">Loading token information...</span>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (error || !token) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Header onReturnHome={() => navigate("/")} />
        <Card className="max-w-md mx-auto glass border-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold font-space mb-2">Invalid Token</h2>
            <p className="text-white/70 mb-6 text-center">This token doesn't exist or has expired.</p>
            <Button 
              className="button-gradient"
              onClick={() => navigate("/")}
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Header onReturnHome={() => navigate("/")} />
      
      <div className="max-w-md mx-auto">
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="font-space text-center">{token.name}</CardTitle>
            <CardDescription className="text-center">
              <span className="inline-block bg-solana-darker/60 text-solana-green px-2 py-0.5 rounded text-xs">
                {token.symbol}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="w-24 h-24 mb-4 bg-gradient-to-br from-solana-green/20 to-solana-purple/20 rounded-full flex items-center justify-center">
              <Award className="h-12 w-12 text-solana-green" />
            </div>
            
            <h3 className="font-bold text-xl mb-2">Claim Your Token</h3>
            <p className="text-white/70 text-center mb-6">{token.description}</p>
            
            <div className="w-full space-y-4">
              <div className="flex items-center p-3 bg-solana-darker/40 rounded-lg">
                <Shield className="h-5 w-5 text-solana-purple mr-3" />
                <div>
                  <div className="text-sm text-white/70">Token Supply</div>
                  <div className="text-white">
                    <span className="font-medium">{token.supply}</span>
                    <span className="text-xs text-white/60 ml-1">tokens</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center p-3 bg-solana-darker/40 rounded-lg">
                <CheckCircle className="h-5 w-5 text-solana-green mr-3" />
                <div>
                  <div className="text-sm text-white/70">Claims</div>
                  <div className="text-white">
                    <span className="font-medium">{token.claimed || 0}</span>
                    <span className="text-xs text-white/60 ml-1">of {token.supply}</span>
                  </div>
                </div>
              </div>
              
              {walletAddress && (
                <div className="flex items-center p-3 bg-solana-darker/40 rounded-lg">
                  <Wallet className="h-5 w-5 text-solana-green mr-3" />
                  <div>
                    <div className="text-sm text-white/70">Your Wallet</div>
                    <div className="text-white font-mono text-xs truncate" style={{ maxWidth: "240px" }}>
                      {walletAddress}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="button-gradient w-full"
              onClick={handleClaim}
            >
              {!connected ? (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet to Claim
                </>
              ) : (
                <>
                  <Award className="mr-2 h-4 w-4" />
                  Claim Token
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Footer />
      
      {/* Transaction Modal */}
      {showTransactionModal && token && (
        <TransactionModal 
          token={token} 
          onClose={() => setShowTransactionModal(false)} 
        />
      )}
    </div>
  );
}