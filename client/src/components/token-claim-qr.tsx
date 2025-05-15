import React, { useState, useEffect, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createTokenClaimQR, getQRCodeAsBase64 } from '@/lib/solana-pay';

type TokenClaimQRProps = {
  tokenId: number;
  tokenName?: string;
  tokenSymbol?: string;
  expiryMinutes?: number;
  refreshInterval?: number; // in seconds
};

export function TokenClaimQR({
  tokenId,
  tokenName = '',
  tokenSymbol = '',
  expiryMinutes = 30,
  refreshInterval = 0 // 0 means no auto-refresh
}: TokenClaimQRProps) {
  const [qrTimestamp, setQrTimestamp] = useState(Date.now());
  
  // Get the base URL (protocol + host)
  const baseUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}`
    : '';
  
  // Generate QR code
  const { data: qrCode, isLoading: isGeneratingQR, refetch } = useQuery({
    queryKey: ['tokenQR', tokenId, qrTimestamp],
    queryFn: async () => {
      if (!baseUrl) return null;
      
      const qr = createTokenClaimQR({
        tokenId,
        baseUrl,
        label: `Claim ${tokenName} (${tokenSymbol})`,
        message: `Scan to claim your ${tokenSymbol} token`,
      });
      
      const base64 = await getQRCodeAsBase64(qr);
      return base64;
    },
    enabled: Boolean(baseUrl),
  });
  
  // Set up auto-refresh if enabled
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return;
    
    const intervalId = setInterval(() => {
      setQrTimestamp(Date.now());
    }, refreshInterval * 1000);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    setQrTimestamp(Date.now());
  };
  
  // Handle download QR code
  const handleDownload = () => {
    if (!qrCode) return;
    
    const a = document.createElement('a');
    a.href = qrCode as string;
    a.download = `token-claim-${tokenId}-${tokenSymbol || ''}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  // Check if qrCode exists and is a string to satisfy type checking
  const qrCodeContent = qrCode && typeof qrCode === 'string' ? (
    <Button variant="outline" onClick={handleDownload}>
      <Download className="h-4 w-4 mr-2" />
      Download
    </Button>
  ) : null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Claim Token QR Code</CardTitle>
        <CardDescription>
          Scan this QR code with a Solana Pay compatible wallet to claim your token.
          {refreshInterval > 0 && (
            <span className="block text-xs mt-1">
              QR code refreshes every {refreshInterval} seconds for security.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        {isGeneratingQR ? (
          <div className="flex flex-col items-center justify-center h-48 w-48">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="mt-2 text-sm">Generating QR code...</span>
          </div>
        ) : qrCode ? (
          <div className="relative h-48 w-48 bg-white p-2 rounded-md">
            <img
              src={qrCode as string}
              alt={`QR code for claiming ${tokenSymbol || 'token'}`}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 w-48 border border-dashed rounded-md">
            <span className="text-sm text-center text-gray-500">
              Could not generate QR code. Please try refreshing.
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center space-x-2">
        <Button variant="outline" onClick={handleRefresh} disabled={isGeneratingQR}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh QR
        </Button>
        {qrCodeContent}
      </CardFooter>
    </Card>
  );
} 