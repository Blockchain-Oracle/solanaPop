import { useState, useRef, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWallet } from "@/hooks/use-wallet";
import { Token } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CalendarIcon, QrCode, Share, Image as ImageIcon, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface CreatorViewProps {
  onShowQR: (token: Token) => void;
}

// Form schema for token creation with extended validation
const createTokenSchema = z.object({
  name: z.string()
    .min(3, { message: "Token name must be at least 3 characters." })
    .max(50, { message: "Token name cannot exceed 50 characters." }),
  symbol: z.string()
    .min(2, { message: "Symbol must be at least 2 characters." })
    .max(10, { message: "Symbol cannot exceed 10 characters." })
    .regex(/^[A-Z0-9]+$/, { message: "Symbol must contain only uppercase letters and numbers." }),
  description: z.string()
    .min(10, { message: "Please provide a more detailed description." })
    .max(250, { message: "Description cannot exceed 250 characters." }),
  supply: z.number()
    .min(1, { message: "Supply must be at least 1." })
    .max(10000, { message: "Supply cannot exceed 10,000 for this type of token." }),
  decimals: z.number().min(0).max(9).default(6),
  compressed: z.boolean().default(false),
  expiryDate: z.date().optional(),
  category: z.string().optional(),
});

export default function CreatorView({ onShowQR }: CreatorViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connected, walletAddress, publicKey } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form setup
  const form = useForm<z.infer<typeof createTokenSchema>>({
    resolver: zodResolver(createTokenSchema),
    defaultValues: {
      name: "",
      symbol: "",
      description: "",
      supply: 100,
      decimals: 6,
      compressed: false,
      category: "event",
    },
  });
  
  // Get creator's tokens
  const { data: tokens, isLoading } = useQuery<Token[]>({
    queryKey: ["/api/tokens", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      const response = await apiRequest("GET", `/api/tokens?walletAddress=${walletAddress}`);
      return await response.json();
    },
    enabled: connected && !!walletAddress, // Only fetch if wallet is connected
  });
  
  // Handle image selection
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Create token mutation
  const createTokenMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof createTokenSchema>) => {
      setIsSubmitting(true);
      
      if (!selectedImage) {
        throw new Error("Please upload an image for your token");
      }
      
      try {
        // First get or create user with wallet address
        const userResponse = await apiRequest("POST", "/api/users", {
          username: publicKey?.toString().slice(0, 8) || "anonymous",
          password: "placeholder", // In a real app, use proper auth
          walletAddress: publicKey?.toString(),
        });
        const userData = await userResponse.json();
        
        // Create form data for multipart/form-data submission
        const submitData = new FormData();
        submitData.append('name', formData.name);
        submitData.append('symbol', formData.symbol);
        submitData.append('description', formData.description);
        submitData.append('supply', formData.supply.toString());
        submitData.append('decimals', formData.decimals.toString());
        submitData.append('isCompressed', formData.compressed.toString());
        submitData.append('creatorId', userData.id.toString());
        submitData.append('creatorAddress', publicKey?.toString() || '');
        submitData.append('whitelistEnabled', 'false');
        
        if (formData.expiryDate) {
          submitData.append('expiryDate', formData.expiryDate.toISOString());
        }
        
        if (formData.category) {
          submitData.append('category', formData.category);
        }
        
        // Append the image file
        submitData.append('image', selectedImage);
        
        // Send the request with FormData
        const response = await fetch('/api/tokens', {
          method: 'POST',
          body: submitData,
          // Don't set Content-Type header, browser will set it with boundary for multipart/form-data
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create token");
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error creating token:", error);
        throw error instanceof Error ? error : new Error("Failed to create token");
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      // Clear form and show success message
      form.reset();
      setSelectedImage(null);
      setImagePreview(null);
      toast({
        title: "Token created",
        description: "Your experience token has been created successfully!",
      });
      
      // Invalidate token query to refresh list
      queryClient.invalidateQueries({ queryKey: ["/api/tokens", walletAddress] });
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "Failed to create token. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: z.infer<typeof createTokenSchema>) => {
    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create tokens.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedImage) {
      toast({
        title: "Image required",
        description: "Please upload an image for your token.",
        variant: "destructive",
      });
      return;
    }
    
    createTokenMutation.mutate(data);
  };

  return (
    <div className="mb-12">
      {/* Welcome Section */}
      <div className="glass rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-space font-bold mb-3">Create Participation Tokens</h2>
        <p className="text-white/70 mb-4">Generate and distribute experience tokens (cTokens) for your events on Solana blockchain.</p>
        
        <div className="flex items-center space-x-2 p-3 bg-solana-darker/40 rounded-lg w-fit">
          <div className={`h-2 w-2 rounded-full ${connected ? "bg-solana-green" : "bg-destructive"}`}></div>
          <span className="text-sm text-white/90">
            {connected 
              ? "Connected to Solana Network" 
              : "Wallet not connected"}
          </span>
        </div>
      </div>
      
      {/* Token Creation Form */}
      <div className="glass rounded-xl p-6 mb-8">
        <h3 className="text-xl font-space font-bold mb-4">Mint New Experience Token</h3>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Image Upload Section */}
            <div className="mb-6">
              <FormLabel>Token Image</FormLabel>
              <div 
                className={`mt-2 flex justify-center rounded-lg border border-dashed border-white/20 px-6 py-10 bg-solana-darker/40 cursor-pointer hover:bg-solana-darker/60 transition-colors ${imagePreview ? 'border-solana-green' : ''}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  {imagePreview ? (
                    <div className="flex flex-col items-center">
                      <img 
                        src={imagePreview} 
                        alt="Token preview" 
                        className="w-32 h-32 object-cover rounded-lg mb-4"
                      />
                      <p className="text-sm text-white/70">Click to change image</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-white/40" />
                      <div className="mt-4 flex text-sm leading-6">
                        <label className="relative font-semibold text-solana-green hover:underline cursor-pointer">
                          <span>Upload token image</span>
                          <span className="sr-only"> file</span>
                        </label>
                      </div>
                      <p className="text-xs text-white/50 mt-2">
                        PNG, JPG, WebP up to 5MB
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                  />
                </div>
              </div>
              {!selectedImage && (
                <p className="mt-1 text-xs text-white/50">
                  Image is required for token creation
                </p>
              )}
            </div>
            
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Solana Hacker House - NYC" 
                        className="bg-solana-darker/40 border-white/10" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Symbol</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="SHNYC" 
                          className="bg-solana-darker/40 border-white/10 uppercase" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-solana-darker/40 border-white/10">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-solana-darker border-white/10">
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="conference">Conference</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="hackathon">Hackathon</SelectItem>
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Proof of participation for Solana Hacker House NYC 2023" 
                        className="bg-solana-darker/40 border-white/10 h-24 resize-none" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="supply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supply</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="100" 
                          className="bg-solana-darker/40 border-white/10" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          min={1}
                          max={10000}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="decimals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decimals</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="6" 
                          className="bg-solana-darker/40 border-white/10" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          min={0}
                          max={9}
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-white/50">
                        Decimal places (usually 6-9)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="compressed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/10 p-3 shadow-sm bg-solana-darker/40">
                      <div className="space-y-0.5">
                        <FormLabel>Compressed Token</FormLabel>
                        <FormDescription className="text-xs text-white/50">
                          Lower fees, higher scalability
                        </FormDescription>
                      </div>
                      <FormControl>
                        <div 
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 ${field.value ? 'bg-solana-green' : 'bg-white/20'}`}
                          onClick={() => field.onChange(!field.value)}
                          role="switch"
                          aria-checked={field.value}
                        >
                          <span 
                            className={`${field.value ? 'translate-x-6 bg-solana-darker' : 'translate-x-1 bg-white'} pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition duration-200 ease-in-out`} 
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Token Expiry (Optional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "bg-solana-darker/40 border-white/10 w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-solana-darker border-white/10" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full button-gradient hover:opacity-90" 
              disabled={isSubmitting || !connected || !selectedImage}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Token...
                </>
              ) : (
                "Create Token"
              )}
            </Button>
          </form>
        </Form>
      </div>
      
      {/* Tokens Section */}
      <div className="glass rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-space font-bold">Your Tokens</h3>
          <div className="text-xs px-3 py-1 rounded-full bg-solana-darker/40 text-white/70">
            {isLoading ? "Loading..." : `${tokens?.length || 0} Active Tokens`}
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8 text-white/70">Loading your tokens...</div>
        ) : tokens?.length ? (
          <div className="space-y-4">
            {tokens.map((token: Token) => (
              <div key={token.id} className="gradient-border">
                <div className="glass rounded-xl p-5">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                      <h4 className="font-space font-bold text-lg">{token.name}</h4>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-xs bg-solana-darker/60 text-solana-green px-2 py-0.5 rounded">{token.symbol}</span>
                        <span className="text-xs text-white/70">Supply: {token.supply}</span>
                        <span className="text-xs text-white/70">Claimed: {token.claimed}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        className="text-sm bg-solana-darker/40 text-white/90 border-white/10"
                        onClick={() => onShowQR(token)}
                      >
                        <QrCode className="mr-2 h-4 w-4" /> Show QR
                      </Button>
                      <Button 
                        variant="outline" 
                        className="text-sm bg-solana-darker/40 text-white/90 border-white/10"
                      >
                        <Share className="mr-2 h-4 w-4" /> Share
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-solana-darker/40 border-0">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-white/70 mb-4">No tokens created yet</p>
              <Button className="button-gradient" onClick={() => window.scrollTo(0, 0)}>
                Create Your First Token
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
