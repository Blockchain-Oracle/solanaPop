import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Type for whitelist entry to add
type AddWhitelistEntryParams = {
  tokenId?: number;
  eventId?: number;
  walletAddress: string;
};

// Type for bulk whitelist addition
type BulkAddWhitelistParams = {
  tokenId?: number;
  eventId?: number;
  addresses: string[];
};

// Type for whitelist entry response
export type WhitelistEntry = {
  id: number;
  tokenId?: number | null;
  eventId?: number | null;
  walletAddress: string;
  createdAt: string;
};

// Type for toggle whitelist setting
type ToggleWhitelistParams = {
  id: number;
  type: 'token' | 'event';
  enabled: boolean;
};

// Hook to add a single address to whitelist
export function useAddToWhitelist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tokenId, eventId, walletAddress }: AddWhitelistEntryParams) => {
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
      
      return response.json() as Promise<WhitelistEntry>;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      if (variables.tokenId) {
        queryClient.invalidateQueries({ queryKey: ['whitelist', { tokenId: variables.tokenId }] });
        queryClient.invalidateQueries({ queryKey: ['token', variables.tokenId] });
      } else if (variables.eventId) {
        queryClient.invalidateQueries({ queryKey: ['whitelist', { eventId: variables.eventId }] });
        queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      }
    },
  });
}

// Hook to bulk add addresses to whitelist
export function useBulkAddToWhitelist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ tokenId, eventId, addresses }: BulkAddWhitelistParams) => {
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
      
      return response.json() as Promise<WhitelistEntry[]>;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      if (variables.tokenId) {
        queryClient.invalidateQueries({ queryKey: ['whitelist', { tokenId: variables.tokenId }] });
        queryClient.invalidateQueries({ queryKey: ['token', variables.tokenId] });
      } else if (variables.eventId) {
        queryClient.invalidateQueries({ queryKey: ['whitelist', { eventId: variables.eventId }] });
        queryClient.invalidateQueries({ queryKey: ['event', variables.eventId] });
      }
    },
  });
}

// Hook to remove address from whitelist
export function useRemoveFromWhitelist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/whitelist/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove address from whitelist');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // We don't know which token/event this belongs to, so invalidate all whitelist queries
      queryClient.invalidateQueries({ queryKey: ['whitelist'] });
    },
  });
}

// Hook to toggle whitelist setting
export function useToggleWhitelist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, type, enabled }: ToggleWhitelistParams) => {
      const endpoint = type === 'token' 
        ? `/api/tokens/${id}/whitelist/toggle` 
        : `/api/events/${id}/whitelist/toggle`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update whitelist setting');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      if (variables.type === 'token') {
        queryClient.invalidateQueries({ queryKey: ['whitelist', { tokenId: variables.id }] });
        queryClient.invalidateQueries({ queryKey: ['token', variables.id] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['whitelist', { eventId: variables.id }] });
        queryClient.invalidateQueries({ queryKey: ['event', variables.id] });
      }
    },
  });
}

// Hook to get whitelist entries
export function useWhitelistEntries(tokenId?: number, eventId?: number) {
  return useQuery({
    queryKey: ['whitelist', { tokenId, eventId }],
    queryFn: async () => {
      const params = tokenId ? `tokenId=${tokenId}` : `eventId=${eventId}`;
      const response = await fetch(`/api/whitelist?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch whitelist entries');
      }
      
      return response.json() as Promise<WhitelistEntry[]>;
    },
    enabled: Boolean(tokenId || eventId),
  });
}

// Hook to check if address is whitelisted
export function useCheckWhitelisted(tokenId?: number, eventId?: number, walletAddress?: string) {
  return useQuery({
    queryKey: ['whitelistCheck', { tokenId, eventId, walletAddress }],
    queryFn: async () => {
      if (!walletAddress) return { isWhitelisted: false };
      
      const params = new URLSearchParams();
      if (tokenId) params.append('tokenId', tokenId.toString());
      if (eventId) params.append('eventId', eventId.toString());
      params.append('walletAddress', walletAddress);
      
      const response = await fetch(`/api/whitelist/check?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check whitelist status');
      }
      
      return response.json() as Promise<{ isWhitelisted: boolean }>;
    },
    enabled: Boolean((tokenId || eventId) && walletAddress),
  });
} 