import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, ArrowLeft, Users, MapPin, Clock, Info, LayoutGrid, Loader2 } from "lucide-react";

// Event creation form schema with validation
const createEventSchema = z.object({
  name: z.string()
    .min(3, { message: "Event name must be at least 3 characters." })
    .max(50, { message: "Event name cannot exceed 50 characters." }),
  date: z.date({
    required_error: "Event date is required",
  }),
  location: z.string()
    .min(3, { message: "Location must be at least 3 characters." })
    .max(100, { message: "Location cannot exceed 100 characters." }),
  description: z.string()
    .min(10, { message: "Please provide a more detailed description." })
    .max(500, { message: "Description cannot exceed 500 characters." }),
  capacity: z.number()
    .min(1, { message: "Capacity must be at least 1." })
    .max(10000, { message: "Capacity cannot exceed 10,000." }),
  eventType: z.string().min(1, { message: "Please select an event type." }),
  isPrivate: z.boolean().default(false),
  accessCode: z.string().optional(),
  tokenId: z.string().optional(),
  endDate: z.date().optional(),
});

type FormData = z.infer<typeof createEventSchema>;

export default function CreateEvent() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { connected, publicKey } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      name: "",
      location: "",
      description: "",
      capacity: 100,
      eventType: "conference",
      isPrivate: false,
      accessCode: "",
      tokenId: undefined,
    },
  });
  
  // Watch for private event toggle to show/hide access code field
  const isPrivate = form.watch("isPrivate");
  
  // Fetch user's tokens for selection
  const { data: userTokens, isLoading: isLoadingTokens } = useQuery({
    queryKey: ["userTokens"],
    queryFn: async () => {
      if (!publicKey) return [];
      
      try {
        // First get the user ID by wallet address
        const userResponse = await apiRequest("GET", `/api/users/wallet/${publicKey.toString()}`);
        const userData = await userResponse.json();
        
        if (!userData || !userData.id) return [];
        
        // Then fetch tokens created by this user
        const tokensResponse = await apiRequest("GET", `/api/tokens/creator/${userData.id}`);
        return await tokensResponse.json();
      } catch (error) {
        console.error("Error fetching user tokens:", error);
        return [];
      }
    },
    enabled: !!publicKey && connected,
  });
  
  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsSubmitting(true);
      
      try {
        // First get or create user with wallet address
        const userResponse = await apiRequest("POST", "/api/users", {
          username: publicKey?.toString().slice(0, 8) || "anonymous",
          password: "placeholder", // In a real app, use proper auth
          walletAddress: publicKey?.toString(),
        });
        const userData = await userResponse.json();
        
        // Prepare event data
        const eventData = {
          ...formData,
          creatorId: userData.id,
          // Only include tokenId if it was selected
          tokenId: formData.tokenId ? parseInt(formData.tokenId) : undefined,
          // Only include accessCode if event is private
          accessCode: formData.isPrivate ? formData.accessCode : undefined,
        };
        
        const response = await apiRequest("POST", "/api/events", eventData);
        return await response.json();
      } catch (error) {
        console.error("Error creating event:", error);
        throw new Error("Failed to create event");
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      // Show success message and redirect
      toast({
        title: "Event created",
        description: "Your event has been created successfully!",
      });
      navigate("/dashboard");
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: FormData) => {
    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create events.",
        variant: "destructive",
      });
      return;
    }
    
    createEventMutation.mutate(data);
  };

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
          <h1 className="text-2xl font-space font-bold">Create New Event</h1>
          <p className="text-white/70">Set up an event and optionally link a participation token</p>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Card */}
        <Card className="glass border-0 md:col-span-2">
          <CardHeader>
            <CardTitle className="font-space">Event Details</CardTitle>
            <CardDescription>
              Fill out the form below to create your event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Solana Hacker House NYC" 
                          className="bg-solana-darker/40 border-white/10" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="date" 
                              className="bg-solana-darker/40 border-white/10" 
                              value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                              onChange={(e) => {
                                const date = e.target.value ? new Date(e.target.value) : undefined;
                                field.onChange(date);
                              }}
                              min={new Date().toISOString().split('T')[0]}
                            />
                            <CalendarIcon className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="eventType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-solana-darker/40 border-white/10">
                              <SelectValue placeholder="Select event type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="conference">Conference</SelectItem>
                            <SelectItem value="workshop">Workshop</SelectItem>
                            <SelectItem value="hackathon">Hackathon</SelectItem>
                            <SelectItem value="meetup">Meetup</SelectItem>
                            <SelectItem value="party">Party</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123 Blockchain Street, New York, NY" 
                          className="bg-solana-darker/40 border-white/10" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your event..." 
                          className="bg-solana-darker/40 border-white/10 min-h-[120px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          className="bg-solana-darker/40 border-white/10" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>Maximum number of attendees</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator className="my-4" />
                
                <FormField
                  control={form.control}
                  name="isPrivate"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Private Event</FormLabel>
                        <FormDescription>
                          Make this event private with an access code
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {isPrivate && (
                  <FormField
                    control={form.control}
                    name="accessCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Access Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter access code for private event" 
                            className="bg-solana-darker/40 border-white/10" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Share this code with your invited attendees
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="tokenId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link Token (Optional)</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-solana-darker/40 border-white/10">
                            <SelectValue placeholder="Select a token to link (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {isLoadingTokens ? (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              <span>Loading tokens...</span>
                            </div>
                          ) : userTokens && userTokens.length > 0 ? (
                            userTokens.map((token: any) => (
                              <SelectItem key={token.id} value={token.id.toString()}>
                                {token.name} ({token.symbol})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-tokens" disabled>
                              No tokens available. Create a token first.
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Link a token that attendees can claim at this event
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting || !connected}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Event
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Info Card */}
        <Card className="glass border-0">
          <CardHeader>
            <CardTitle className="font-space">Event Information</CardTitle>
            <CardDescription>
              Tips for creating a successful event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Users className="h-5 w-5 text-solana-green mt-0.5" />
              <div>
                <h3 className="font-medium">Set a realistic capacity</h3>
                <p className="text-sm text-white/70">Consider your venue size and expected attendance.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-solana-green mt-0.5" />
              <div>
                <h3 className="font-medium">Be specific with location</h3>
                <p className="text-sm text-white/70">Include address details so attendees can find your event easily.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-solana-green mt-0.5" />
              <div>
                <h3 className="font-medium">Choose the right date</h3>
                <p className="text-sm text-white/70">Avoid conflicts with holidays or similar events.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-solana-green mt-0.5" />
              <div>
                <h3 className="font-medium">Detailed description</h3>
                <p className="text-sm text-white/70">Include agenda, speakers, and what attendees should expect.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <LayoutGrid className="h-5 w-5 text-solana-green mt-0.5" />
              <div>
                <h3 className="font-medium">Link a token</h3>
                <p className="text-sm text-white/70">Create a token first, then link it to your event for attendees to claim.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/create-token")}
            >
              Create a Token First
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
} 