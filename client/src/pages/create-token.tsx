import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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
import { CalendarIcon, ArrowLeft, Rocket, Info, LayoutGrid, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Token creation form schema with extended validation
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

export default function CreateToken() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { connected, walletAddress, publicKey } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Redirect if not connected
  useEffect(() => {
    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create tokens",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [connected, navigate, toast]);
  
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
        submitData.append('compressed', formData.compressed.toString());
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
      // Show success message and redirect
      toast({
        title: "Token created",
        description: "Your experience token has been created successfully!",
      });
      navigate("/dashboard");
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
          <h1 className="text-2xl font-space font-bold">Create New Token</h1>
          <p className="text-white/70">Mint a new experience token for your event or project</p>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Card */}
        <Card className="glass border-0 md:col-span-2">
          <CardHeader>
            <CardTitle className="font-space">Token Details</CardTitle>
            <CardDescription>
              Fill out the form below to create your token
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                
                <CardFooter className="px-0 pt-6">
                  <div className="flex flex-col md:flex-row gap-4 w-full">
                    <Button 
                      type="button" 
                      variant="outline"
                      className="bg-solana-darker/40 border-white/10"
                      onClick={() => navigate("/dashboard")}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="button-gradient flex-1"
                      disabled={isSubmitting || !selectedImage}
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
                  </div>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Info Sidebar */}
        <div className="space-y-6">
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="h-5 w-5 mr-2 text-solana-green" />
                What are POP Tokens?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/70 mb-4">
                Proof-of-Participation (POP) tokens verify attendance or involvement in events, providing digital credentials on the Solana blockchain.
              </p>
              <Separator className="my-4 bg-white/10" />
              <h4 className="font-semibold mb-2">Token Uses:</h4>
              <ul className="text-sm text-white/70 space-y-2">
                <li className="flex items-start">
                  <span className="text-solana-green mr-2">•</span>
                  Proof of attendance at events
                </li>
                <li className="flex items-start">
                  <span className="text-solana-green mr-2">•</span>
                  Verification of community participation
                </li>
                <li className="flex items-start">
                  <span className="text-solana-green mr-2">•</span>
                  Unlocking rewards in ecosystem
                </li>
              </ul>
            </CardContent>
          </Card>
          
          <Card className="glass border-0">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Rocket className="h-5 w-5 mr-2 text-solana-purple" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-white/70 space-y-4">
                <p className="flex items-start">
                  <span className="inline-block bg-solana-darker w-5 h-5 rounded-full text-xs flex items-center justify-center mr-2 text-solana-green">1</span>
                  Create your token with a memorable name and symbol
                </p>
                <p className="flex items-start">
                  <span className="inline-block bg-solana-darker w-5 h-5 rounded-full text-xs flex items-center justify-center mr-2 text-solana-green">2</span>
                  Set supply based on expected participants
                </p>
                <p className="flex items-start">
                  <span className="inline-block bg-solana-darker w-5 h-5 rounded-full text-xs flex items-center justify-center mr-2 text-solana-green">3</span>
                  Generate QR codes to distribute at your event
                </p>
                <p className="flex items-start">
                  <span className="inline-block bg-solana-darker w-5 h-5 rounded-full text-xs flex items-center justify-center mr-2 text-solana-green">4</span>
                  Track claims through your dashboard
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-4 w-full bg-solana-darker/40 border-white/10"
                onClick={() => window.open("/documentation/USER_GUIDE.md", "_blank")}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                View Documentation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}