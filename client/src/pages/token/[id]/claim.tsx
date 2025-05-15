import React, { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { Connection, PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { WhitelistManager } from '@/components/whitelist-manager';
import { TokenClaimQR } from '@/components/token-claim-qr';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useCheckWhitelisted } from '@/lib/api-client';
import { Loader2, ExternalLink, AlertCircle, InfoIcon, ArrowLeft } from 'lucide-react';
import Header from '@/components/header';
import Footer from '@/components/footer';
import { useLocation } from 'wouter';

interface TokenClaimPageProps {
  params: {
    id: string;
  };
}

export default function TokenClaimPage({ params }: TokenClaimPageProps) {
  const [, navigate] = useLocation();
  const { walletAddress, connected } = useWallet();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('claim');
  
  const tokenId = params.id ? parseInt(params.id) : undefined;
  
  // Fetch token details
  const { 
    data: token, 
    isLoading, 
    error 
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
    enabled: !!tokenId,
  });
  
  // Check if current wallet is whitelisted
  const { 
    data: whitelistStatus, 
    isLoading: isCheckingWhitelist 
  } = useCheckWhitelisted(tokenId, undefined, walletAddress);
  
  // Check if token has already been claimed by this wallet
  const { 
    data: claimStatus, 
    isLoading: isCheckingClaim 
  } = useQuery({
    queryKey: ['tokenClaimed', tokenId, walletAddress],
    queryFn: async () => {
      if (!tokenId || !walletAddress) return { claimed: false };
      
      const params = new URLSearchParams();
      params.append('tokenId', tokenId.toString());
      params.append('walletAddress', walletAddress);
      
      const response = await fetch(`/api/claims/check?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check claim status');
      }
      
      return response.json() as Promise<{ claimed: boolean }>;
    },
    enabled: !!tokenId && !!walletAddress,
  });
  
  // Mutation to verify a claim transaction
  const verifyMutation = useMutation({
    mutationFn: async ({ signature, walletAddress }: { signature: string, walletAddress: string }) => {
      const response = await fetch('/api/solana-pay/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          tokenId,
          walletAddress,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify transaction');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Token claimed successfully",
        description: "Your token has been successfully claimed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to verify claim",
        description: error instanceof Error ? error.message : "Failed to verify claim",
        variant: "destructive",
      });
    },
  });
  
  // Determine if the current user is the creator of the token
  const isCreator = token ? walletAddress === token.creatorId : false;
  
  // Determine if user can claim token
  const canClaim = connected && 
    walletAddress &&
    (!token?.whitelistEnabled || whitelistStatus?.isWhitelisted) && 
    !claimStatus?.claimed;
  
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
          <div>
            <h1 className="text-2xl font-space font-bold">
              <Skeleton className="h-8 w-48" />
            </h1>
            <div className="flex items-center">
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        
        <Card className="glass border-0 mb-8">
          <CardHeader>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Skeleton className="h-48 w-48 rounded-md" />
            <Skeleton className="h-10 w-full max-w-sm" />
          </CardContent>
        </Card>
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
  
  // Token details page with claim functionality
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
          <h1 className="text-2xl font-space font-bold">Claim {token.name}</h1>
          <div className="flex items-center">
            <span className="text-xs bg-solana-darker/60 text-solana-green px-2 py-0.5 rounded mr-3">{token.symbol}</span>
            <span className="text-white/70 text-sm">Created on {new Date(token.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      
      {/* Token Claim Summary Card */}
      <Card className="glass border-0 mb-8">
        <CardHeader>
          <CardTitle>Token Summary</CardTitle>
          <CardDescription>
            Key information about this token
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
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
          
          {token.whitelistEnabled && (
            <Alert className="bg-solana-darker/40 border-solana-green border-opacity-30">
              <AlertCircle className="h-4 w-4 text-solana-green" />
              <AlertTitle>Whitelist Enabled</AlertTitle>
              <AlertDescription>
                This token requires your wallet to be whitelisted before claiming.
                {isCheckingWhitelist ? (
                  <span className="block mt-1">Checking whitelist status...</span>
                ) : walletAddress ? (
                  <span className="block mt-1">
                    Status: {whitelistStatus?.isWhitelisted ? 'Whitelisted ✅' : 'Not whitelisted ❌'}
                  </span>
                ) : (
                  <span className="block mt-1">
                    Connect your wallet to check whitelist status
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Tabs for Claim and Whitelist Management */}
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="glass border-0 bg-solana-darker/40">
          <TabsTrigger value="claim" className="data-[state=active]:bg-solana-green/20">Claim Token</TabsTrigger>
          {isCreator && (
            <TabsTrigger value="whitelist" className="data-[state=active]:bg-solana-green/20">Manage Whitelist</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="claim" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {!connected ? (
              <Card className="glass border-0">
                <CardHeader>
                  <CardTitle>Connect Wallet</CardTitle>
                  <CardDescription>
                    Connect your wallet to claim this token.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-10">
                    <InfoIcon className="h-12 w-12 text-white/30 mb-4" />
                    <p className="text-center text-white/70 mb-6">Please connect your wallet to continue</p>
                  </div>
                </CardContent>
              </Card>
            ) : claimStatus?.claimed ? (
              <Card className="glass border-0">
                <CardHeader>
                  <CardTitle>Already Claimed</CardTitle>
                  <CardDescription>
                    You have already claimed this token.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-10">
                    <CheckIcon className="h-12 w-12 text-solana-green mb-4" />
                    <p className="text-center text-white/70 mb-6">
                      This token has been claimed by your wallet.
                    </p>
                  </div>
                </CardContent>
                {token.mintAddress && (
                  <CardFooter className="justify-center">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(`https://explorer.solana.com/address/${token.mintAddress}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on Explorer
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ) : token.whitelistEnabled && !whitelistStatus?.isWhitelisted ? (
              <Card className="glass border-0">
                <CardHeader>
                  <CardTitle>Not Whitelisted</CardTitle>
                  <CardDescription>
                    Your wallet is not on the whitelist for this token.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-10">
                    <LockIcon className="h-12 w-12 text-red-400 mb-4" />
                    <p className="text-center text-white/70 mb-6">
                      Please contact the token creator to be added to the whitelist.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <TokenClaimQR
                tokenId={tokenId!}
                tokenName={token.name}
                tokenSymbol={token.symbol}
                refreshInterval={180} // 3 minutes
              />
            )}
            
            <Card className="glass border-0">
              <CardHeader>
                <CardTitle>How to Claim</CardTitle>
                <CardDescription>
                  Follow these steps to claim your token.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-2 text-white/80">
                  <li>Connect your Solana wallet</li>
                  <li>Scan the QR code with a Solana Pay compatible wallet app</li>
                  <li>Review and approve the transaction in your wallet</li>
                  <li>Wait for the transaction to be confirmed</li>
                  <li>Your token will be recorded as claimed</li>
                </ol>
                
                <div className="mt-6 bg-solana-darker/40 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Compatible Wallets</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-white/70">
                    <div>• Phantom</div>
                    <div>• Solflare</div>
                    <div>• Backpack</div>
                    <div>• Glow</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {isCreator && (
          <TabsContent value="whitelist" className="mt-6">
            <WhitelistManager
              tokenId={tokenId}
              title={`Whitelist for ${token.name}`}
              description={`Manage wallet addresses that are allowed to claim the ${token.symbol} token.`}
            />
          </TabsContent>
        )}
      </Tabs>
      
      <Footer />
    </div>
  );
}

// Additional icons
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const LockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
); 