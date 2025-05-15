import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, BarChart3, QrCode, Clock, Users, Award, MapPin, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { Token, Event } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { connected, walletAddress, publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState("tokens");

  // Redirect if not connected
  useEffect(() => {
    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to access the dashboard",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [connected, navigate, toast]);

  // Get user ID
  const { data: userData } = useQuery({
    queryKey: ["user", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return null;
      try {
        const response = await apiRequest("POST", "/api/users", {
          username: publicKey?.toString().slice(0, 8) || "anonymous",
          password: "placeholder", // In a real app, use proper auth
          walletAddress: publicKey?.toString(),
        });
        return await response.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    enabled: !!walletAddress && connected,
  });

  // Get creator's tokens
  const { data: tokens = [], isLoading: tokensLoading } = useQuery<Token[]>({
    queryKey: ["tokens", userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];
      try {
        const response = await apiRequest("GET", `/api/tokens/creator/${userData.id}`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching tokens:", error);
        return [];
      }
    },
    enabled: !!userData?.id && connected,
  });

  // Get creator's events
  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["events", userData?.id],
    queryFn: async () => {
      if (!userData?.id) return [];
      try {
        const response = await apiRequest("GET", `/api/events/creator/${userData.id}`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching events:", error);
        return [];
      }
    },
    enabled: !!userData?.id && connected,
  });

  // Get user's claimed tokens
  const { data: claims = [], isLoading: claimsLoading } = useQuery<any[]>({
    queryKey: ["claims", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      try {
        const response = await apiRequest("GET", `/api/claims/wallet/${walletAddress}/with-tokens`);
        return await response.json();
      } catch (error) {
        console.error("Error fetching claims:", error);
        return [];
      }
    },
    enabled: !!walletAddress && connected,
  });

  // Handle create new token click
  const handleCreateToken = () => {
    navigate("/create-token");
  };

  // Format date for display
  const formatDate = (dateString: string | Date) => {
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Header onReturnHome={() => navigate("/")} />
      
      {/* Dashboard Header */}
      <div className="glass rounded-xl p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-space font-bold mb-2">Dashboard</h1>
            <p className="text-white/70">
              Manage your tokens, events, and view your collection
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 mt-4 md:mt-0">
            <Button 
              className="button-gradient"
              onClick={() => navigate("/create-event")}
            >
              <Users className="mr-2 h-4 w-4" />
              Create Event
            </Button>
            <Button 
              className="button-gradient"
              onClick={handleCreateToken}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Token
            </Button>
          </div>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="glass border-0">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="h-12 w-12 rounded-full bg-solana-green/20 flex items-center justify-center mb-3">
              <Award className="h-6 w-6 text-solana-green" />
            </div>
            <p className="text-white/70 text-sm">Tokens Created</p>
            <h3 className="text-2xl font-bold font-space">{tokensLoading ? "..." : tokens?.length || 0}</h3>
          </CardContent>
        </Card>
        
        <Card className="glass border-0">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="h-12 w-12 rounded-full bg-solana-purple/20 flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-solana-purple" />
            </div>
            <p className="text-white/70 text-sm">Events Created</p>
            <h3 className="text-2xl font-bold font-space">
              {eventsLoading ? "..." : events?.length || 0}
            </h3>
          </CardContent>
        </Card>
        
        <Card className="glass border-0">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="h-12 w-12 rounded-full bg-solana-green/20 flex items-center justify-center mb-3">
              <QrCode className="h-6 w-6 text-solana-green" />
            </div>
            <p className="text-white/70 text-sm">Tokens Collected</p>
            <h3 className="text-2xl font-bold font-space">{claimsLoading ? "..." : claims?.length || 0}</h3>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for Tokens/Collection */}
      <Tabs defaultValue="tokens" className="mb-8" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass bg-solana-darker/40 border-0 p-1">
          <TabsTrigger value="tokens" className="data-[state=active]:bg-solana-green/10 data-[state=active]:text-solana-green">
            <BarChart3 className="h-4 w-4 mr-2" />
            My Tokens
          </TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-solana-green/10 data-[state=active]:text-solana-green">
            <Users className="h-4 w-4 mr-2" />
            My Events
          </TabsTrigger>
          <TabsTrigger value="collection" className="data-[state=active]:bg-solana-purple/10 data-[state=active]:text-solana-purple">
            <Award className="h-4 w-4 mr-2" />
            My Collection
          </TabsTrigger>
        </TabsList>
        
        {/* Tokens Tab */}
        <TabsContent value="tokens" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tokensLoading ? (
              <p className="text-white/70">Loading your tokens...</p>
            ) : tokens?.length > 0 ? (
              tokens.map((token: Token) => (
                <div key={token.id} className="gradient-border">
                  <Card className="glass border-0 h-full">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="font-space">{token.name}</CardTitle>
                          <CardDescription>
                            <span className="text-xs bg-solana-darker/60 text-solana-green px-2 py-0.5 rounded mr-2">{token.symbol}</span>
                            <span className="text-xs text-white/70">Created: {new Date(token.createdAt).toLocaleDateString()}</span>
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-medium text-white/90">{token.claimed || 0}/{token.supply}</span>
                          <span className="text-xs text-white/60">Claimed</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-white/70 mb-4">{token.description}</p>
                      <div className="flex justify-between">
                        <Button 
                          variant="outline" 
                          className="text-sm bg-solana-darker/40 text-white/90 border-white/10"
                          onClick={() => navigate(`/token/${token.id}`)}
                        >
                          <QrCode className="mr-2 h-4 w-4" /> Manage
                        </Button>
                        {token.expiryDate && (
                          <div className="flex items-center text-xs text-white/60">
                            <Clock className="h-3 w-3 mr-1" />
                            Expires: {new Date(token.expiryDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            ) : (
              <Card className="bg-solana-darker/40 border-0 col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-white/70 mb-4">You haven't created any tokens yet</p>
                  <Button className="button-gradient" onClick={handleCreateToken}>
                    Create Your First Token
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        
        {/* Events Tab */}
        <TabsContent value="events" className="mt-6">
          {eventsLoading ? (
            <p className="text-white/70">Loading your events...</p>
          ) : events?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map((event: Event) => (
                <div key={event.id} className="gradient-border">
                  <Card className="glass border-0 h-full">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="font-space">{event.name}</CardTitle>
                          <CardDescription>
                            <span className="text-xs bg-solana-darker/60 text-solana-green px-2 py-0.5 rounded mr-2">
                              {event.eventType}
                            </span>
                            <span className="text-xs text-white/70">
                              {event.isPrivate ? "Private Event" : "Public Event"}
                            </span>
                          </CardDescription>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1 text-solana-green" />
                          <span className="text-xs text-white/90">{formatDate(event.date)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start mb-2">
                        <MapPin className="h-4 w-4 mr-2 text-white/60 mt-0.5" />
                        <p className="text-sm text-white/70">{event.location}</p>
                      </div>
                      <p className="text-sm text-white/70 mb-4 line-clamp-2">{event.description}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1 text-white/60" />
                          <span className="text-xs text-white/70">Capacity: {event.capacity}</span>
                        </div>
                        <Button 
                          variant="outline" 
                          className="text-sm bg-solana-darker/40 text-white/90 border-white/10"
                          onClick={() => navigate(`/event/${event.id}`)}
                        >
                          Manage
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : (
            <Card className="bg-solana-darker/40 border-0">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-white/70 mb-4">You haven't created any events yet</p>
                <Button className="button-gradient" onClick={() => navigate("/create-event")}>
                  Create Your First Event
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Collection Tab */}
        <TabsContent value="collection" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {claimsLoading ? (
              <p className="text-white/70">Loading your collection...</p>
            ) : claims?.length > 0 ? (
              claims.map((claim: any) => (
                <div key={claim.id} className="gradient-border">
                  <Card className="glass border-0 h-full">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="font-space">{claim.token.name}</CardTitle>
                          <CardDescription>
                            <span className="text-xs bg-solana-darker/60 text-solana-purple px-2 py-0.5 rounded mr-2">{claim.token.symbol}</span>
                            <span className="text-xs text-white/70">Claimed: {new Date(claim.claimedAt).toLocaleDateString()}</span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-white/70 mb-4">{claim.token.description}</p>
                      <div className="flex justify-between">
                        <Button 
                          variant="outline" 
                          className="text-sm bg-solana-darker/40 text-white/90 border-white/10"
                          onClick={() => navigate(`/token/${claim.token.id}`)}
                        >
                          <QrCode className="mr-2 h-4 w-4" /> View Details
                        </Button>
                        {claim.transactionId && (
                          <Button 
                            variant="link" 
                            className="text-xs text-solana-green p-0 h-auto"
                            onClick={() => window.open(`https://explorer.solana.com/tx/${claim.transactionId}`, '_blank')}
                          >
                            View Transaction
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))
            ) : (
              <Card className="bg-solana-darker/40 border-0 col-span-2">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-white/70 mb-4">You haven't collected any tokens yet</p>
                  <Button 
                    variant="outline" 
                    className="bg-solana-darker/40 border-white/10"
                    onClick={() => setActiveTab("tokens")}
                  >
                    Browse Tokens
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      <Footer />
    </div>
  );
}