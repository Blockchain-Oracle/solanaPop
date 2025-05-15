import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Calendar, MapPin, Users, QrCode, Trash2, Edit, Share2, ExternalLink } from "lucide-react";
import { Event, Token } from "@shared/schema";

// Define Event interface to match API response
interface EventResponse {
  id: number;
  name: string;
  description: string;
  date: string | Date;
  endDate: string | Date | null;
  location: string;
  capacity: number | null;
  eventType: string;
  creatorId: number;
  tokenId: number | null;
  isPrivate: boolean | null;
  accessCode: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Define Token interface to match API response
interface TokenResponse {
  id: number;
  name: string;
  symbol: string;
  description: string;
  supply: number;
  claimed: number;
  creatorId: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  expiryDate: string | Date | null;
}

export default function EventDetail() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/event/:id");
  const { connected, publicKey } = useWallet();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const eventId = params?.id ? parseInt(params.id) : null;

  // Redirect if not connected
  useEffect(() => {
    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to view event details",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [connected, navigate, toast]);

  // Fetch event details
  const { 
    data: event, 
    isLoading: isLoadingEvent,
    error: eventError
  } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      if (!eventId) throw new Error("Event ID is required");
      try {
        const response = await apiRequest("GET", `/api/events/${eventId}`);
        return await response.json() as EventResponse;
      } catch (error) {
        console.error("Error fetching event:", error);
        throw new Error("Failed to fetch event details");
      }
    },
    enabled: !!eventId && connected,
    retry: false,
  });

  // Handle event fetch error
  useEffect(() => {
    if (eventError) {
      toast({
        title: "Error",
        description: eventError instanceof Error 
          ? eventError.message 
          : "Failed to load event details",
        variant: "destructive",
      });
      navigate("/dashboard");
    }
  }, [eventError, toast, navigate]);

  // Fetch linked token if available
  const { data: token } = useQuery({
    queryKey: ["token", event?.tokenId],
    queryFn: async () => {
      if (!event?.tokenId) throw new Error("No linked token");
      const response = await apiRequest("GET", `/api/tokens/${event.tokenId}`);
      return await response.json() as TokenResponse;
    },
    enabled: !!event?.tokenId && connected,
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error("Event ID is required");
      await apiRequest("DELETE", `/api/events/${eventId}`);
    },
    onSuccess: () => {
      toast({
        title: "Event deleted",
        description: "The event has been successfully deleted",
      });
      navigate("/dashboard");
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  // Format date for display
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "N/A";
    const date = dateString instanceof Date ? dateString : new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle delete event
  const handleDeleteEvent = () => {
    deleteEventMutation.mutate();
    setShowDeleteDialog(false);
  };

  // Handle share event
  const handleShareEvent = () => {
    if (!event) return;
    
    if (navigator.share) {
      navigator.share({
        title: event.name || "Event",
        text: `Check out this event: ${event.name}`,
        url: window.location.href,
      }).catch((error) => console.error("Error sharing:", error));
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Event link copied to clipboard",
      });
    }
  };

  if (isLoadingEvent) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Header onReturnHome={() => navigate("/")} />
        <div className="flex justify-center items-center min-h-[50vh]">
          <p className="text-white/70">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Header onReturnHome={() => navigate("/")} />
        <div className="flex justify-center items-center min-h-[50vh]">
          <p className="text-white/70">Event not found</p>
        </div>
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
          <h1 className="text-2xl font-space font-bold">{event.name}</h1>
          <p className="text-white/70">Event Management</p>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Event Details */}
        <Card className="glass border-0 md:col-span-2">
          <CardHeader>
            <CardTitle className="font-space">Event Details</CardTitle>
            <CardDescription>
              <span className="text-xs bg-solana-darker/60 text-solana-green px-2 py-0.5 rounded mr-2">
                {event.eventType}
              </span>
              <span className="text-xs text-white/70">
                {event.isPrivate ? "Private Event" : "Public Event"}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-solana-green mt-0.5" />
              <div>
                <h3 className="font-medium">Date & Time</h3>
                <p className="text-sm text-white/70">{formatDate(event.date)}</p>
                {event.endDate && (
                  <p className="text-sm text-white/70">
                    End: {formatDate(event.endDate)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-solana-green mt-0.5" />
              <div>
                <h3 className="font-medium">Location</h3>
                <p className="text-sm text-white/70">{event.location}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-solana-green mt-0.5" />
              <div>
                <h3 className="font-medium">Capacity</h3>
                <p className="text-sm text-white/70">{event.capacity} attendees</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-sm text-white/70 whitespace-pre-wrap">{event.description}</p>
            </div>
            
            {event.isPrivate && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">Access Code</h3>
                  <p className="text-sm bg-solana-darker/60 px-3 py-2 rounded font-mono">{event.accessCode}</p>
                  <p className="text-xs text-white/70 mt-1">Share this code with invited attendees only</p>
                </div>
              </>
            )}
            
            {token && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium mb-2">Linked Token</h3>
                  <div className="flex items-center justify-between bg-solana-darker/60 px-3 py-2 rounded">
                    <div>
                      <p className="text-sm font-medium">{token.name} ({token.symbol})</p>
                      <p className="text-xs text-white/70">{token.claimed || 0}/{token.supply} claimed</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs bg-solana-darker/40 border-white/10"
                      onClick={() => navigate(`/token/${token.id}`)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> View
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-4">
            <Button 
              variant="outline" 
              className="bg-solana-darker/40 border-white/10"
              onClick={() => navigate(`/event/${event.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" /> Edit Event
            </Button>
            <Button 
              variant="outline" 
              className="bg-solana-darker/40 border-white/10"
              onClick={handleShareEvent}
            >
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
            <Button 
              variant="destructive" 
              className="ml-auto"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </CardFooter>
        </Card>
        
        {/* QR Code Card */}
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="font-space">Event QR Code</CardTitle>
            <CardDescription>
              Share this QR code with attendees
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg mb-4">
              {/* Placeholder for QR Code - In a real app, generate a QR code with event ID */}
              <div className="w-48 h-48 bg-black/10 flex items-center justify-center">
                <QrCode className="h-24 w-24 text-black/70" />
              </div>
            </div>
            <p className="text-sm text-white/70 text-center mb-4">
              Scan this code to access the event details
            </p>
            <Button className="w-full button-gradient">
              <QrCode className="h-4 w-4 mr-2" /> Download QR Code
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="glass border-0">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this event? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              className="bg-solana-darker/40 border-white/10"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteEvent}
            >
              Delete Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
} 