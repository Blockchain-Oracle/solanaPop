import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { Token, Event } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { CalendarRange, Users, Link, Clock } from "lucide-react";

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
    
    return (
      <Card className="glass border-0 hover:bg-white/5 transition-all cursor-pointer"
        onClick={() => navigate(`/token/${token.id}`)}>
        <CardHeader>
          <CardTitle className="text-lg">{token.name}</CardTitle>
          <CardDescription>
            <div className="flex items-center gap-2">
              <span className="bg-solana-darker/60 text-solana-green px-2 py-0.5 rounded text-xs">
                {token.symbol}
              </span>
              {token.isCompressed && (
                <span className="bg-solana-darker/60 text-purple-400 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline">
                    <path d="M20 5L4 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M4 5L20 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  ZK
                </span>
              )}
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
              <Progress value={claimPercentage} className="h-2 bg-solana-darker/40" />
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
          {tokensLoading ? (
            <div className="text-center py-12 text-white/70">Loading tokens...</div>
          ) : tokens?.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tokens.map(token => (
                <TokenCard key={token.id} token={token} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/70">No tokens available</div>
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

      <Footer />
    </div>
  );
} 