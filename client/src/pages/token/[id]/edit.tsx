import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { TokenForm } from "@/components/token-form";
import { WhitelistManager } from "@/components/whitelist-manager";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Alert, 
  AlertTitle, 
  AlertDescription 
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle 
} from "lucide-react";

interface EditTokenPageProps {
  params: {
    id: string;
  };
}

export default function EditTokenPage({ params }: EditTokenPageProps) {
  const [, navigate] = useLocation();
  const { walletAddress, connected } = useWallet();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');
  const [checkedWallet, setCheckedWallet] = useState(false);
  const mountedRef = useRef(false);
  
  // Ensure tokenId is properly parsed as a number
  const tokenId = params && params.id ? parseInt(params.id, 10) : undefined;
  console.log("Edit page - Token ID:", tokenId, "Connected:", connected, "Checked:", checkedWallet);
  
  // Fetch token details
  const { 
    data: token, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['token', tokenId],
    queryFn: async () => {
      if (!tokenId) throw new Error('Token ID is required');
      
      const response = await fetch(`/api/tokens/${tokenId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch token details');
      }
      
      return response.json();
    },
    enabled: !!tokenId && connected,
  });
  console.log(token);
  
  // Check if current user is the creator of the token using wallet address
  const isCreator = token ? walletAddress === token.creatorAddress : false;
  console.log("Creator check:", { walletAddress, tokenCreatorAddress: token?.creatorAddress, isCreator });

  // Handle component mounting flag
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  
  // Handle redirects with useEffect - only check connection once
  useEffect(() => {
    // Skip re-checking if we've already verified connection
    if (checkedWallet) return;
    
    // Delay to ensure wallet has time to initialize
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      
      console.log("Checking wallet connection:", connected);
      
      if (!connected) {
        toast({
          title: "Wallet not connected",
          description: "Please connect your wallet to edit tokens",
          variant: "destructive",
        });
        navigate("/");
      } else {
        // Only mark as checked if actually connected
        setCheckedWallet(true);
      }
    }, 500); // Increased delay to ensure wallet state is ready
    
    return () => clearTimeout(timer);
  }, [connected, navigate, toast, checkedWallet]);
  
  // Handle creator check with useEffect - only run when we have token data
  useEffect(() => {
    if (!token || isLoading || !checkedWallet) return;
    
    if (!isCreator) {
      console.log("Creator check failed:", { walletAddress, creatorAddress: token.creatorAddress });
      toast({
        title: "Access Denied",
        description: "You do not have permission to edit this token.",
        variant: "destructive",
      });
      navigate(`/token/${tokenId}`);
    }
  }, [token, isLoading, isCreator, tokenId, navigate, toast, checkedWallet, walletAddress]);
  
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Header onReturnHome={() => navigate("/")} />
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            className="mr-4 p-2"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="animate-pulse">
            <div className="h-8 bg-white/20 rounded w-48 mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-32"></div>
          </div>
        </div>
        
        <div className="flex justify-center items-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
        <Footer />
      </div>
    );
  }
  
  if (error || !token) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Header onReturnHome={() => navigate("/")} />
        <Card className="glass border-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-white/30 mb-4" />
            <h2 className="text-xl font-bold font-space mb-2">Token Not Found</h2>
            <p className="text-white/70 mb-6">
              {error instanceof Error ? error.message : 'Failed to load token details'}
            </p>
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
          onClick={() => navigate(`/token/${token.id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-space font-bold">Edit {token.name}</h1>
          <div className="flex items-center">
            <span className="text-xs bg-solana-darker/60 text-solana-green px-2 py-0.5 rounded mr-3">{token.symbol}</span>
            <span className="text-white/70 text-sm">Created on {new Date(token.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      
      {/* Tabs Navigation */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="glass border-0 bg-solana-darker/40">
          <TabsTrigger value="details" className="data-[state=active]:bg-solana-green/20">Token Details</TabsTrigger>
          <TabsTrigger value="whitelist" className="data-[state=active]:bg-solana-green/20">Whitelist Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <TokenForm 
            token={token} 
            isEditing={true} 
            onSuccess={() => {
              refetch();
              toast({
                title: "Token Updated",
                description: "Token details have been successfully updated.",
              });
            }}
          />
        </TabsContent>
        
        <TabsContent value="whitelist" className="mt-6">
          <WhitelistManager
            tokenId={tokenId}
            title={`Whitelist for ${token.name}`}
            description={`Manage wallet addresses that are allowed to claim the ${token.symbol} token.`}
          />
        </TabsContent>
      </Tabs>
      
      <Footer />
    </div>
  );
} 