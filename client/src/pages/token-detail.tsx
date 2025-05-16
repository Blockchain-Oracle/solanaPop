import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { QRCodeModal } from "@/components/qr-code-modal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  QrCode, 
  Share2, 
  Users, 
  Clock, 
  BarChart3, 
  Award, 
  InfoIcon,
  Link,
  CalendarRange,
  ShieldCheck
} from "lucide-react";
import { Token } from "@shared/schema";

interface TokenDetailProps {
  params: {
    id: string;
  };
}

export default function TokenDetail({ params }: TokenDetailProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { connected } = useWallet();
  const [showQRModal, setShowQRModal] = useState(false);
  const tokenId = parseInt(params.id);
  
  // Remove or modify this check - it's causing the redirect to home
  // Instead, show a connection prompt within the page
  useEffect(() => {
    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to view token details",
        variant: "destructive",
      });
      // Don't navigate away - just show a prompt to connect
      // navigate("/"); <- Remove this
    }
  }, [connected, toast]);
  
  // Get token data
  const { data: token, isLoading } = useQuery<Token>({
    queryKey: ["/api/tokens", tokenId],
    queryFn: async () => {
      const response = await fetch(`/api/tokens/${tokenId}`);
      if (!response.ok) throw new Error("Failed to fetch token");
      return response.json();
    },
    enabled: !isNaN(tokenId) && connected,
  });
  
  // Calculate claim percentage
  const claimPercentage = token ? Math.round((token.claimed || 0) / token.supply * 100) : 0;
  
  // Handle QR code generation
  const handleShowQR = () => {
    if (token) {
      setShowQRModal(true);
    }
  };
  
  // Share token
  const handleShare = async () => {
    if (!token) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${token.name} - Solana POP Token`,
          text: `Check out this token on Solana POP: ${token.name}`,
          url: window.location.href,
        });
      } else {
        // Fallback for browsers that don't support share API
        navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "The link has been copied to your clipboard",
        });
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Header onReturnHome={() => navigate("/")} />
        <div className="glass rounded-xl p-6 flex justify-center items-center" style={{ height: "400px" }}>
          <p className="text-white/70">Loading token details...</p>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (!token) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Header onReturnHome={() => navigate("/")} />
        <Card className="glass border-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <InfoIcon className="h-16 w-16 text-white/30 mb-4" />
            <h2 className="text-xl font-bold font-space mb-2">Token Not Found</h2>
            <p className="text-white/70 mb-6">The token you're looking for doesn't exist or has been removed.</p>
            <Button 
              className="button-gradient"
              onClick={() => navigate("/dashboard")}
            >
              Return to Dashboard
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
      
      {/* Page Header */}
      <div className="flex items-center mb-8">
        <Button 
          variant="ghost" 
          className="mr-4 p-2"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-space font-bold">{token.name}</h1>
          <div className="flex items-center">
            <span className="text-xs bg-solana-darker/60 text-solana-green px-2 py-0.5 rounded mr-3">{token.symbol}</span>
            <span className="text-white/70 text-sm">Created on {new Date(token.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Token Info Column */}
        <div className="md:col-span-2 space-y-6">
          {/* Token Stats Card */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle>Token Overview</CardTitle>
              <CardDescription>
                Key statistics and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <div className="text-xs text-white/70 mb-1">Supply</div>
                  <div className="text-2xl font-bold font-space">{token.supply}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-white/70 mb-1">Claimed</div>
                  <div className="text-2xl font-bold font-space">{token.claimed || 0}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-white/70 mb-1">Remaining</div>
                  <div className="text-2xl font-bold font-space">{token.supply - (token.claimed || 0)}</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">Claim Progress</span>
                    <span className="text-white/90">{claimPercentage}%</span>
                  </div>
                  <Progress 
                    value={claimPercentage} 
                    className="h-2 bg-solana-darker/40"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center p-3 bg-solana-darker/40 rounded-lg">
                    <ShieldCheck className="h-4 w-4 text-solana-green mr-3" />
                    <div>
                      <div className="text-white/70">Status</div>
                      <div className="text-white font-medium">
                        {token.expiryDate && new Date(token.expiryDate) < new Date() ? "Expired" : "Active"}
                      </div>
                    </div>
                  </div>
                  
                  {token.mintAddress && (
                    <div className="flex items-center p-3 bg-solana-darker/40 rounded-lg">
                      <Link className="h-4 w-4 text-solana-purple mr-3" />
                      <div>
                        <div className="text-white/70">Mint Address</div>
                        <div className="text-white font-medium truncate" style={{ maxWidth: "180px" }}>
                          {token.mintAddress}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {token.expiryDate && (
                    <div className="flex items-center p-3 bg-solana-darker/40 rounded-lg">
                      <CalendarRange className="h-4 w-4 text-solana-green mr-3" />
                      <div>
                        <div className="text-white/70">Expiry Date</div>
                        <div className="text-white font-medium">
                          {new Date(token.expiryDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Description Card */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle>About This Token</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/80">{token.description}</p>
            </CardContent>
          </Card>
          
          {/* Analytics Tabs */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>
                Token distribution and claim data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="claims">
                <TabsList className="bg-solana-darker/40 border-0">
                  <TabsTrigger value="claims">
                    <Users className="h-4 w-4 mr-2" />
                    Claims
                  </TabsTrigger>
                  <TabsTrigger value="activity">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Activity
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="claims" className="pt-4">
                  <div className="flex flex-col items-center justify-center py-6 text-white/70 text-center">
                    <Users className="h-16 w-16 text-white/30 mb-4" />
                    <p>Detailed claim analytics coming soon!</p>
                    <p className="text-sm mt-2">Check back for insights on token distribution.</p>
                  </div>
                </TabsContent>
                
                <TabsContent value="activity" className="pt-4">
                  <div className="flex flex-col items-center justify-center py-6 text-white/70 text-center">
                    <BarChart3 className="h-16 w-16 text-white/30 mb-4" />
                    <p>Activity tracking coming soon!</p>
                    <p className="text-sm mt-2">Track token activity over time with detailed charts.</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions Card */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle>Token Actions</CardTitle>
              <CardDescription>
                Manage and distribute your token
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full button-gradient justify-start"
                onClick={handleShowQR}
              >
                <QrCode className="mr-2 h-4 w-4" />
                Show QR Code
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full bg-solana-darker/40 border-white/10 justify-start"
                onClick={handleShare}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share Token
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full bg-solana-darker/40 border-white/10 justify-start"
                onClick={() => navigate(`/token/${token.id}/edit`)}
              >
                <QrCode className="mr-2 h-4 w-4" />
                Edit Token
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full bg-solana-darker/40 border-white/10 justify-start opacity-50"
                disabled
              >
                <Award className="mr-2 h-4 w-4" />
                Airdrop Tokens
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full bg-solana-darker/40 border-white/10 justify-start opacity-50"
                disabled
              >
                <Clock className="mr-2 h-4 w-4" />
                Extend Expiry
              </Button>
            </CardContent>
          </Card>
          
          {/* Tips & Info Card */}
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center">
                <InfoIcon className="h-5 w-5 mr-2 text-solana-green" />
                Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-white/70 space-y-4">
              <p>
                <span className="text-solana-green">•</span> Display the QR code prominently at your event for attendees to scan
              </p>
              <p>
                <span className="text-solana-green">•</span> Share the token details with attendees before the event
              </p>
              <p>
                <span className="text-solana-green">•</span> Consider printing QR codes for physical distribution
              </p>
              <p>
                <span className="text-solana-green">•</span> Monitor claims to track participation
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
      
      {/* QR Code Modal */}
      {showQRModal && token && (
        <QRCodeModal 
          token={token} 
          onClose={() => setShowQRModal(false)} 
        />
      )}
    </div>
  );
}