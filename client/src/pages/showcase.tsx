import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { Token, Event } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { CalendarRange, Users, Link, Clock, Zap, ArrowDownToLine, Sparkles, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function ShowcasePage() {
  const [, navigate] = useLocation();

  // Fetch all tokens
  const { data: tokens, isLoading: tokensLoading } = useQuery<Token[]>({
    queryKey: ['tokens'],
    queryFn: async () => {
      const response = await fetch('/api/tokens');
      if (!response.ok) throw new Error('Failed to fetch tokens');
      return response.json();
    },
  });

  // Fetch all events
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await fetch('/api/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
  });

  // Token Card Component
  const TokenCard = ({ token }: { token: Token }) => {
    const claimPercentage = Math.round((token.claimed || 0) / token.supply * 100);
    
    // Apply special styling for compressed tokens
    const cardClasses = token.isCompressed 
      ? "glass border-0 hover:bg-white/5 transition-all cursor-pointer relative overflow-hidden bg-gradient-to-br from-purple-900/20 to-solana-darker/40"
      : "glass border-0 hover:bg-white/5 transition-all cursor-pointer";
    
    // Fix the Progress component styling
    const progressClass = `h-2 ${token.isCompressed ? "bg-purple-950/30" : "bg-solana-darker/40"}`;
    // Remove the indicatorClassName prop and use CSS variables for styling if needed
    const progressStyle = token.isCompressed 
      ? { "--progress-foreground": "hsl(270, 75%, 60%)" } as React.CSSProperties
      : {};
    
    return (
      <Card className={cardClasses} onClick={() => navigate(`/token/${token.id}`)}>
        {token.isCompressed && (
          <div className="absolute top-0 right-0 w-24 h-24 -mt-12 -mr-12 rotate-45 bg-gradient-to-br from-purple-500/20 to-purple-900/20"></div>
        )}
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            {token.name}
            {token.isCompressed && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="bg-purple-900/60 text-purple-300 px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-lg shadow-purple-950/30">
                      <Zap className="h-3 w-3" />
                      ZK Compressed
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">ZK Compressed tokens are up to 5000x cheaper to transfer than traditional SPL tokens</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </CardTitle>
          <CardDescription>
            <div className="flex items-center gap-2">
              <span className="bg-solana-darker/60 text-solana-green px-2 py-0.5 rounded text-xs">
                {token.symbol}
              </span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-white/70 line-clamp-2">{token.description}</p>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-white/70">Claimed</span>
                <span className="text-white/90">{claimPercentage}%</span>
              </div>
              <Progress 
                value={claimPercentage} 
                className={progressClass}
                style={progressStyle}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center text-white/70">
                <Users className="h-4 w-4 mr-2" />
                {token.supply} Supply
              </div>
              {token.expiryDate && (
                <div className="flex items-center text-white/70">
                  <Clock className="h-4 w-4 mr-2" />
                  {new Date(token.expiryDate).toLocaleDateString()}
                </div>
              )}
            </div>
            
            {token.isCompressed && (
              <div className="pt-2 border-t border-purple-800/30">
                <h4 className="text-xs font-medium text-purple-300 mb-2">ZK Compression Benefits</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center text-xs text-white/70">
                    <ArrowDownToLine className="h-3 w-3 mr-1 text-purple-400" />
                    <span>Low Gas Fees</span>
                  </div>
                  <div className="flex items-center text-xs text-white/70">
                    <Sparkles className="h-3 w-3 mr-1 text-purple-400" />
                    <span>Fast Transfers</span>
                  </div>
                  <div className="flex items-center text-xs text-white/70">
                    <Coins className="h-3 w-3 mr-1 text-purple-400" />
                    <span>Eco-friendly</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Event Card Component
  const EventCard = ({ event }: { event: Event }) => {
    return (
      <Card className="glass border-0 hover:bg-white/5 transition-all cursor-pointer"
        onClick={() => navigate(`/event/${event.id}`)}>
        <CardHeader>
          <CardTitle className="text-lg">{event.name}</CardTitle>
          <CardDescription>{new Date(event.date).toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-white/70 line-clamp-2">{event.description}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center text-white/70">
                <CalendarRange className="h-4 w-4 mr-2" />
                {event.location}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Filter functionality
  const [filter, setFilter] = React.useState('all');
  
  const filteredTokens = tokens?.filter(token => {
    if (filter === 'compressed') return token.isCompressed;
    if (filter === 'standard') return !token.isCompressed;
    return true; // 'all' filter
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Header />
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Showcase</h1>
        <p className="text-white/70">Discover all tokens and events</p>
      </div>

      <Tabs defaultValue="tokens" className="mb-8">
        <TabsList className="glass border-0 bg-solana-darker/40">
          <TabsTrigger value="tokens">Tokens</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="mt-6">
          <div className="mb-6 flex flex-wrap gap-2">
            <Button 
              variant={filter === 'all' ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilter('all')}
              className="text-xs">
              All Tokens
            </Button>
            <Button 
              variant={filter === 'compressed' ? "default" : "outline"} 
              size="sm"
              onClick={() => setFilter('compressed')}
              className="text-xs bg-purple-900/60 hover:bg-purple-800/80 border-purple-800/50 text-purple-100">
              <Zap className="h-3 w-3 mr-1" /> ZK Compressed
            </Button>
            <Button 
              variant={filter === 'standard' ? "default" : "outline"}
              size="sm" 
              onClick={() => setFilter('standard')}
              className="text-xs">
              Standard SPL
            </Button>
          </div>
          
          {tokensLoading ? (
            <div className="text-center py-12 text-white/70">Loading tokens...</div>
          ) : filteredTokens?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTokens.map(token => (
                <TokenCard key={token.id} token={token} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/70">No tokens match your filter</div>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          {eventsLoading ? (
            <div className="text-center py-12 text-white/70">Loading events...</div>
          ) : events?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/70">No events available</div>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-12 p-6 bg-gradient-to-r from-purple-900/20 to-solana-darker/30 rounded-lg">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-purple-400" />
          About ZK Compressed Tokens
        </h2>
        <div className="space-y-4 text-sm text-white/80">
          <p>
            ZK Compressed tokens are a revolutionary new token format on Solana that dramatically reduces transaction costs 
            and improves scalability through zero-knowledge proof technology.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-black/20 p-4 rounded-lg">
              <h3 className="text-purple-300 font-medium mb-2 flex items-center">
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Up to 5000x Cheaper
              </h3>
              <p className="text-xs text-white/70">
                Transferring ZK Compressed tokens costs a fraction of traditional SPL tokens, 
                making micro-transactions economically viable.
              </p>
            </div>
            <div className="bg-black/20 p-4 rounded-lg">
              <h3 className="text-purple-300 font-medium mb-2 flex items-center">
                <Sparkles className="h-4 w-4 mr-2" />
                Compatible Everywhere
              </h3>
              <p className="text-xs text-white/70">
                ZK Compressed tokens work with major wallets like Phantom and can be seamlessly 
                converted between compressed and standard formats.
              </p>
            </div>
            <div className="bg-black/20 p-4 rounded-lg">
              <h3 className="text-green-300 font-medium mb-2 flex items-center">
                <Coins className="h-4 w-4 mr-2" />
                Eco-Friendly
              </h3>
              <p className="text-xs text-white/70">
                By requiring significantly less blockchain storage and computation,
                compressed tokens are more environmentally sustainable.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
} 