import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { useToggleWhitelist } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarIcon, Info, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { InfoIcon } from "lucide-react";

// Token form schema with extended validation
const tokenFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required").max(6, "Symbol must be 6 characters or less"),
  description: z.string().min(1, "Description is required"),
  supply: z.coerce.number().min(1, "Supply must be at least 1"),
  expiryDate: z.date().optional(),
  includeExpiry: z.boolean().optional(),
  category: z.string().optional(),
  whitelistEnabled: z.boolean().optional(),
  isCompressed: z.boolean().optional(),
});

// Define token interface to match API response
interface Token {
  id: number;
  name: string;
  symbol: string;
  description: string;
  supply: number;
  claimed?: number;
  creatorId: string | number;
  createdAt: string | Date;
  updatedAt: string | Date;
  expiryDate?: string | Date | null;
  whitelistEnabled?: boolean;
  category?: string;
  isCompressed?: boolean;
}

interface TokenFormProps {
  token?: Token;
  isEditing?: boolean;
  onSuccess?: () => void;
}

export function TokenForm({ token, isEditing = false, onSuccess }: TokenFormProps) {
  const { toast } = useToast();
  const { connected, walletAddress } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whitelistEnabled, setWhitelistEnabled] = useState(token?.whitelistEnabled || false);
  const [isCompressed, setIsCompressed] = useState(false);
  
  // Toggle whitelist mutation
  const toggleWhitelistMutation = useToggleWhitelist();
  
  // Form setup
  const form = useForm<z.infer<typeof tokenFormSchema>>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: {
      name: token?.name || "",
      symbol: token?.symbol || "",
      description: token?.description || "",
      supply: token?.supply || 100,
      expiryDate: token?.expiryDate ? new Date(token.expiryDate) : undefined,
      category: token?.category || "event",
      whitelistEnabled: token?.whitelistEnabled || false,
      isCompressed: token?.isCompressed || false,
    },
  });
  
  // Create/Update token mutation
  const tokenMutation = useMutation({
    mutationFn: async (tokenData: z.infer<typeof tokenFormSchema>) => {
      setIsSubmitting(true);
      
      try {
        // Format the data for the API
        const data = {
          ...tokenData,
          creatorId: walletAddress,
          creatorAddress: walletAddress,
          supply: parseInt(String(tokenData.supply)),
          expiryDate: tokenData.expiryDate ? tokenData.expiryDate.toISOString() : null,
          whitelistEnabled: tokenData.whitelistEnabled,
          isCompressed: tokenData.isCompressed,
        };
        
        // Determine if we're creating or updating
        let url = "/api/tokens";
        let method = "POST";
        
        if (isEditing && token?.id) {
          url = `/api/tokens/${token.id}`;
          method = "PUT";
        }
        
        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to process token");
        }
        return {success: true};
      } catch (error) {
        console.error("Error with token operation:", error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: (data) => {
      // Show success message
      toast({
        title: isEditing ? "Token updated" : "Token created",
        description: isEditing 
          ? "Your token has been successfully updated!" 
          : "Your experience token has been created successfully!",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      console.error("Error with token operation:", error);
      toast({
        title: isEditing ? "Update failed" : "Creation failed",
        description: error instanceof Error 
          ? error.message 
          : "Failed to process token. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: z.infer<typeof tokenFormSchema>) => {
    if (!connected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to manage tokens.",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        formData.append(key, value.toString());
      } else if (typeof value === "number") {
        formData.append(key, value.toString());
      } else if (typeof value === "string") {
        formData.append(key, value);
      } else if (value instanceof Date) {
        formData.append(key, value.toISOString());
      }
    });
    
    tokenMutation.mutate(data);
  };
  
  // Handle toggling whitelist setting
  const handleToggleWhitelist = async () => {
    if (!token?.id) return;
    
    try {
      await toggleWhitelistMutation.mutateAsync({
        id: token.id,
        type: 'token',
        enabled: !whitelistEnabled,
      });
      
      setWhitelistEnabled(!whitelistEnabled);
      
      toast({
        title: "Whitelist setting updated",
        description: !whitelistEnabled 
          ? "Whitelist has been enabled for this token." 
          : "Whitelist has been disabled for this token.",
      });
    } catch (error) {
      toast({
        title: "Failed to update whitelist setting",
        description: error instanceof Error 
          ? error.message 
          : "An error occurred while updating whitelist setting.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className="glass border-0">
      <CardHeader>
        <CardTitle>
          {isEditing ? "Edit Token Details" : "Create New Token"}
        </CardTitle>
        <CardDescription>
          {isEditing 
            ? "Update your token's information and settings" 
            : "Fill out the form below to create your token"}
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
                      <SelectContent>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="collectible">Collectible</SelectItem>
                        <SelectItem value="membership">Membership</SelectItem>
                        <SelectItem value="community">Community</SelectItem>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        disabled={isEditing && (token?.claimed || 0) > 0}
                      />
                    </FormControl>
                    {isEditing && (token?.claimed || 0) > 0 && (
                      <p className="text-xs text-yellow-400">
                        Cannot modify supply after claims have been made
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiry Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "bg-solana-darker/40 border-white/10 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {isEditing && (
              <div className="space-y-4">
                <div className="flex items-center justify-between py-4 border-t border-white/10">
                  <div className="space-y-0.5">
                    <h4 className="text-base font-medium">Whitelist Access</h4>
                    <p className="text-sm text-white/60">
                      Restrict token claiming to whitelisted wallet addresses
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="whitelist-toggle"
                      checked={whitelistEnabled}
                      onCheckedChange={handleToggleWhitelist}
                      disabled={toggleWhitelistMutation.isPending}
                    />
                    <span className="text-sm">
                      {whitelistEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
                
                {whitelistEnabled && (
                  <Alert className="bg-solana-darker/40 border-solana-green/30">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      When whitelist is enabled, only wallet addresses that have been added to the whitelist can claim this token. Manage the whitelist in the "Whitelist Management" tab.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            
            {isEditing && token && (token.claimed || 0) > 0 && (
              <Alert className="bg-solana-darker/40 border-yellow-500/30">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription>
                  This token has already been claimed by users. Some fields may not be editable.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex items-center space-x-2">
              <Switch
                id="compression-toggle"
                checked={isCompressed}
                onCheckedChange={setIsCompressed}
              />
              <Label htmlFor="compression-toggle">
                Enable ZK Compression
                <span className="ml-2 text-xs text-white/50">(Up to 5000x cheaper)</span>
              </Label>
              <HoverCard>
                <HoverCardTrigger>
                  <InfoIcon className="h-4 w-4 text-white/50" />
                </HoverCardTrigger>
                <HoverCardContent>
                  <p>ZK Compression significantly reduces token storage costs on Solana.</p>
                  <p className="mt-2 text-sm text-white/70">
                    Compressed tokens are fully compatible with regular SPL tokens and can be decompressed at any time.
                  </p>
                </HoverCardContent>
              </HoverCard>
            </div>
            
            <div className="flex justify-end">
              <Button 
                type="submit" 
                className="button-gradient"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">◌</span>
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  isEditing ? "Update Token" : "Create Token"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 