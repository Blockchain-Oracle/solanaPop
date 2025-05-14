import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useWallet } from "@/components/walletProvider";
import { Token } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CalendarIcon, QrCode, Share } from "lucide-react";

interface CreatorViewProps {
  onShowQR: (token: Token) => void;
}

// Form schema for token creation
const createTokenSchema = z.object({
  name: z.string().min(3, { message: "Token name must be at least 3 characters." }),
  symbol: z.string().min(2, { message: "Symbol must be at least 2 characters." }).max(10, { message: "Symbol cannot exceed 10 characters." }),
  description: z.string().min(10, { message: "Please provide a more detailed description." }),
  supply: z.number().min(1, { message: "Supply must be at least 1." }),
  expiryDate: z.date().optional(),
});

export default function CreatorView({ onShowQR }: CreatorViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { connected, walletAddress } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form setup
  const form = useForm<z.infer<typeof createTokenSchema>>({
    resolver: zodResolver(createTokenSchema),
    defaultValues: {
      name: "",
      symbol: "",
      description: "",
      supply: 100,
    },
  });
  
  // Get creator's tokens
  const { data: tokens, isLoading } = useQuery({
    queryKey: ["/api/tokens/creator/1"], // Using hardcoded creatorId=1 for demo
    enabled: connected, // Only fetch if wallet is connected
  });
  
  // Create token mutation
  const createTokenMutation = useMutation({
    mutationFn: async (tokenData: z.infer<typeof createTokenSchema>) => {
      setIsSubmitting(true);
      
      // Add creator ID to token data (hardcoded for demo)
      const data = {
        ...tokenData,
        creatorId: 1,
        // If we had a real mint, would add mintAddress here after creating it on Solana
      };
      
      try {
        const response = await apiRequest("POST", "/api/tokens", data);
        return await response.json();
      } catch (error) {
        console.error("Error creating token:", error);
        throw new Error("Failed to create token");
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      // Clear form and show success message
      form.reset();
      toast({
        title: "Token created",
        description: "Your experience token has been created successfully!",
      });
      
      // Invalidate token query to refresh list
      queryClient.invalidateQueries({ queryKey: ["/api/tokens/creator/1"] });
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create token. Please try again.",
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
              
              <FormField
                control={form.control}
                name="symbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Symbol</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="SHNYC" 
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
                    <FormLabel>Token Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Proof of participation for Solana Hacker House NYC 2023" 
                        className="bg-solana-darker/40 border-white/10 h-24" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Expiry</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type="date" 
                          className="bg-solana-darker/40 border-white/10" 
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ""}
                          onChange={(e) => {
                            const date = e.target.value ? new Date(e.target.value) : undefined;
                            field.onChange(date);
                          }}
                        />
                        <CalendarIcon className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full button-gradient hover:opacity-90" 
              disabled={isSubmitting || !connected}
            >
              {isSubmitting ? "Creating..." : "Create Token"}
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
