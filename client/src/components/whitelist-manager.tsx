import React, { useState, useCallback, useRef } from 'react';
import { useWallet } from '@/hooks/use-wallet';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Upload, Download, Trash2, Copy, Plus } from "lucide-react";
import { PublicKey } from '@solana/web3.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Type for our props
type WhitelistManagerProps = {
  tokenId?: number;
  eventId?: number;
  title?: string;
  description?: string;
};

// Type for whitelist entries
type WhitelistEntry = {
  id: number;
  tokenId?: number | null;
  eventId?: number | null;
  walletAddress: string;
  createdAt: string;
};

// Component implementation
export function WhitelistManager({ tokenId, eventId, title, description }: WhitelistManagerProps) {
  const [newAddress, setNewAddress] = useState('');
  const [bulkAddresses, setBulkAddresses] = useState('');
  const [activeTab, setActiveTab] = useState('single');
  const wallet = useWallet();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  // Fetch whitelist entries
  const { 
    data: whitelistEntries = [], 
    isLoading: isLoadingWhitelist,
    isError: isWhitelistError,
    error: whitelistError
  } = useQuery({
    queryKey: ['whitelist', { tokenId, eventId }],
    queryFn: async () => {
      const params = tokenId ? `tokenId=${tokenId}` : `eventId=${eventId}`;
      const response = await fetch(`/api/whitelist?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch whitelist');
      }
      
      return response.json() as Promise<WhitelistEntry[]>;
    },
    enabled: Boolean(tokenId || eventId),
  });
  
  // Check if current wallet is whitelisted
  const { 
    data: whitelistStatus, 
    isLoading: isCheckingWhitelist 
  } = useQuery({
    queryKey: ['whitelistCheck', { tokenId, eventId, walletAddress: wallet.walletAddress }],
    queryFn: async () => {
      if (!wallet.walletAddress) return { isWhitelisted: false };
      
      const params = new URLSearchParams();
      if (tokenId) params.append('tokenId', tokenId.toString());
      if (eventId) params.append('eventId', eventId.toString());
      params.append('walletAddress', wallet.walletAddress);
      
      const response = await fetch(`/api/whitelist/check?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check whitelist status');
      }
      
      return response.json() as Promise<{ isWhitelisted: boolean }>;
    },
    enabled: Boolean((tokenId || eventId) && wallet.walletAddress),
  });
  
  // Mutations
  const addAddressMutation = useMutation({
    mutationFn: async (walletAddress: string) => {
      const response = await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: tokenId || null,
          eventId: eventId || null,
          walletAddress,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add address to whitelist');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
      setNewAddress('');
      toast({
        title: "Address added to whitelist",
        description: "The wallet address has been successfully added to the whitelist.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add address",
        description: error instanceof Error ? error.message : "Failed to add address",
        variant: "destructive",
      });
    },
  });
  
  const bulkAddAddressesMutation = useMutation({
    mutationFn: async (addresses: string[]) => {
      const response = await fetch('/api/whitelist/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: tokenId || null,
          eventId: eventId || null,
          addresses,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add addresses to whitelist');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
      setBulkAddresses('');
      toast({
        title: "Addresses added to whitelist",
        description: `Successfully added ${data.length} addresses to the whitelist.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add addresses",
        description: error instanceof Error ? error.message : "Failed to add addresses",
        variant: "destructive",
      });
    },
  });
  
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/whitelist/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete whitelist entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
      toast({
        title: "Address removed from whitelist",
        description: "The wallet address has been successfully removed from the whitelist.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove address",
        description: error instanceof Error ? error.message : "Failed to remove address",
        variant: "destructive",
      });
    },
  });
  
  // Toggle whitelist setting
  const toggleWhitelistMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const endpoint = tokenId 
        ? `/api/tokens/${tokenId}/whitelist/toggle` 
        : `/api/events/${eventId}/whitelist/toggle`;
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update whitelist settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
      if (tokenId) {
        queryClient.invalidateQueries({ queryKey: ['token', tokenId] });
      } else if (eventId) {
        queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      }
    },
  });
  
  // Handle adding a single address
  const handleAddAddress = useCallback(() => {
    if (!newAddress) {
      toast({
        title: "Address required",
        description: "Please enter a wallet address to add to the whitelist.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Validate it's a valid Solana address
      new PublicKey(newAddress);
      addAddressMutation.mutate(newAddress);
    } catch (error) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid Solana wallet address.",
        variant: "destructive",
      });
    }
  }, [newAddress, addAddressMutation, toast]);
  
  // Handle bulk adding addresses
  const handleBulkAddAddresses = useCallback(() => {
    if (!bulkAddresses.trim()) {
      toast({
        title: "Addresses required",
        description: "Please enter at least one wallet address to add to the whitelist.",
        variant: "destructive",
      });
      return;
    }
    
    // Parse addresses (comma, newline, or space separated)
    const addressList = bulkAddresses
      .split(/[\n,\s]+/)
      .map(addr => addr.trim())
      .filter(Boolean);
    
    if (addressList.length === 0) {
      toast({
        title: "No valid addresses",
        description: "No valid addresses were found in the input.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate addresses
    const invalidAddresses: string[] = [];
    const validAddresses: string[] = [];
    
    addressList.forEach(address => {
      try {
        new PublicKey(address);
        validAddresses.push(address);
      } catch (error) {
        invalidAddresses.push(address);
      }
    });
    
    if (invalidAddresses.length > 0) {
      toast({
        title: "Some addresses are invalid",
        description: `${invalidAddresses.length} invalid addresses were skipped.`,
        variant: "destructive",
      });
    }
    
    if (validAddresses.length > 0) {
      bulkAddAddressesMutation.mutate(validAddresses);
    }
  }, [bulkAddresses, bulkAddAddressesMutation, toast]);
  
  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setBulkAddresses(content);
      setActiveTab('bulk');
    };
    reader.readAsText(file);
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  
  // Handle copying whitelist addresses
  const handleCopyAddresses = useCallback(() => {
    const addresses = whitelistEntries.map(entry => entry.walletAddress).join('\n');
    navigator.clipboard.writeText(addresses)
      .then(() => {
        toast({
          title: "Addresses copied",
          description: "All whitelist addresses have been copied to your clipboard.",
        });
      })
      .catch(error => {
        toast({
          title: "Failed to copy addresses",
          description: "Could not copy addresses to clipboard.",
          variant: "destructive",
        });
      });
  }, [whitelistEntries, toast]);
  
  // Handle download as CSV
  const handleDownloadCSV = useCallback(() => {
    const addresses = whitelistEntries.map(entry => entry.walletAddress).join('\n');
    const blob = new Blob([addresses], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whitelist-${tokenId || eventId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [whitelistEntries, tokenId, eventId]);
  
  // Handle toggle whitelist setting
  const handleToggleWhitelist = useCallback((enabled: boolean) => {
    toggleWhitelistMutation.mutate(enabled);
  }, [toggleWhitelistMutation]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || "Whitelist Management"}</CardTitle>
        <CardDescription>
          {description || "Manage wallet addresses that are allowed to claim this token or attend this event."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Label htmlFor="whitelist-enabled">Enable Whitelist</Label>
            <Switch 
              id="whitelist-enabled" 
              checked={toggleWhitelistMutation.isPending ? undefined : !!whitelistEntries.length} 
              onCheckedChange={handleToggleWhitelist}
              disabled={toggleWhitelistMutation.isPending}
            />
          </div>
          {wallet.connected && wallet.walletAddress && (
            <div className="flex items-center space-x-2">
              <span>Your wallet:</span>
              <span className="font-mono text-sm">
                {wallet.walletAddress.substring(0, 4)}...{wallet.walletAddress.substring(wallet.walletAddress.length - 4)}
              </span>
              {isCheckingWhitelist ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : whitelistStatus?.isWhitelisted ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          )}
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="single">Add Single Address</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
            <TabsTrigger value="list">View Whitelist</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single">
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter wallet address"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  disabled={addAddressMutation.isPending}
                />
                <Button 
                  onClick={handleAddAddress}
                  disabled={addAddressMutation.isPending || !newAddress}
                >
                  {addAddressMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="bulk">
            <div className="space-y-4">
              <Textarea
                placeholder="Enter multiple wallet addresses (separated by commas, spaces, or new lines)"
                value={bulkAddresses}
                onChange={(e) => setBulkAddresses(e.target.value)}
                rows={6}
                className="font-mono text-sm"
                disabled={bulkAddAddressesMutation.isPending}
              />
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={bulkAddAddressesMutation.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.csv"
                  className="hidden"
                />
                <Button 
                  onClick={handleBulkAddAddresses}
                  disabled={bulkAddAddressesMutation.isPending || !bulkAddresses.trim()}
                >
                  {bulkAddAddressesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Addresses
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="list">
            <div className="space-y-4">
              <div className="flex justify-between mb-2">
                <span>Total entries: {whitelistEntries.length}</span>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleCopyAddresses} disabled={whitelistEntries.length === 0}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadCSV} disabled={whitelistEntries.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
              </div>
              
              {isLoadingWhitelist ? (
                <div className="py-4 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : isWhitelistError ? (
                <div className="py-4 text-center text-red-500">
                  Error loading whitelist: {(whitelistError as Error).message}
                </div>
              ) : whitelistEntries.length === 0 ? (
                <div className="py-4 text-center text-gray-500">
                  No addresses in the whitelist yet.
                </div>
              ) : (
                <div className="border rounded-md divide-y">
                  {whitelistEntries.map((entry) => (
                    <div key={entry.id} className="p-2 flex justify-between items-center">
                      <span className="font-mono text-sm">{entry.walletAddress}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEntryMutation.mutate(entry.id)}
                        disabled={deleteEntryMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 