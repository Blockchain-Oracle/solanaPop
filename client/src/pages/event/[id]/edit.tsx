import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { WhitelistManager } from "@/components/whitelist-manager";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent,
  CardFooter 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  Calendar 
} from "lucide-react";

interface EditEventPageProps {
  params: {
    id: string;
  };
}

export default function EditEventPage({ params }: EditEventPageProps) {
  const [, navigate] = useLocation();
  const { walletAddress, connected } = useWallet();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('details');

  const eventId = parseInt(params.id);

  // Fetch event details
  const { 
    data: event, 
    isLoading,
    error,
    refetch 
  } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch event');
      return response.json();
    },
    enabled: !isNaN(eventId) && connected,
  });

  // Check if current user is the creator
  const isCreator = event ? walletAddress === event.creatorAddress : false;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    location: '',
    website: '',
  });

  // Update form when event data is loaded
  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name,
        description: event.description,
        date: new Date(event.date).toISOString().split('T')[0],
        location: event.location,
        website: event.website || '',
      });
    }
  }, [event]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update event');
      console.log("Event updated successfully");
      toast({
        title: "Event Updated",
        description: "Your event has been successfully updated.",
      });
      refetch();
    } catch (error) {
      console.error("Error updating event:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update event",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Header />
        <div className="flex justify-center items-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Header />
        <Card className="glass border-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-white/30 mb-4" />
            <h2 className="text-xl font-bold font-space mb-2">Wallet Not Connected</h2>
            <p className="text-white/70 mb-6">Please connect your wallet to edit events</p>
            <Button 
              className="button-gradient"
              onClick={() => navigate("/")}
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
        <Footer />
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Header />
        <Card className="glass border-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-16 w-16 text-white/30 mb-4" />
            <h2 className="text-xl font-bold font-space mb-2">Access Denied</h2>
            <p className="text-white/70 mb-6">You don't have permission to edit this event</p>
            <Button 
              className="button-gradient"
              onClick={() => navigate(`/event/${eventId}`)}
            >
              View Event
            </Button>
          </CardContent>
        </Card>
        <Footer />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Header />
      
      <div className="flex items-center mb-8">
        <Button 
          variant="ghost" 
          className="mr-4 p-2"
          onClick={() => navigate(`/event/${eventId}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-space font-bold">Edit Event</h1>
          <p className="text-white/70">{event?.name}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="glass border-0 bg-solana-darker/40">
          <TabsTrigger value="details">Event Details</TabsTrigger>
          <TabsTrigger value="whitelist">Whitelist Management</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <Card className="glass border-0">
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
                <CardDescription>Update your event information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-white/70">Event Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="glass border-0 bg-solana-darker/40"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm text-white/70">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="glass border-0 bg-solana-darker/40"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-white/70">Date</label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="glass border-0 bg-solana-darker/40"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm text-white/70">Location</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="glass border-0 bg-solana-darker/40"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-white/70">Website (Optional)</label>
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    className="glass border-0 bg-solana-darker/40"
                    placeholder="https://"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="button-gradient">
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="whitelist" className="mt-6">
          <WhitelistManager
            eventId={eventId}
            title={`Whitelist for ${event?.name}`}
            description="Manage wallet addresses that can participate in this event."
          />
        </TabsContent>
      </Tabs>

      <Footer />
    </div>
  );
} 