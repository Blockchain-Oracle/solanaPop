import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Button } from './ui/button';
import { X, Camera, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isScanning: boolean;
}

export function QRCodeScanner({ onScan, onClose, isScanning }: QRCodeScannerProps) {
  const { toast } = useToast();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle successful scan
  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      // The library returns an array of detected codes
      const qrData = result[0].rawValue;
      console.log("QR Data detected:", qrData);
      onScan(qrData);
    }
  };

  // Handle errors
  const handleError = (error: any) => {
    console.error('QR Scanner error:', error);
    setHasError(true);
    
    if (error?.name === 'NotAllowedError') {
      setErrorMessage("Camera access was denied. Please grant permission and try again.");
    } else if (error?.name === 'NotFoundError') {
      setErrorMessage("No camera was found on your device.");
    } else if (error?.name === 'NotReadableError') {
      setErrorMessage("The camera is in use by another application.");
    } else {
      setErrorMessage("Could not access camera. Please check permissions and try again.");
    }
    
    toast({
      title: 'Camera Access Issue',
      description: errorMessage || 'Could not access your camera.',
      variant: 'destructive'
    });
  };

  // Handle retry
  const handleRetry = () => {
    setHasError(false);
    setErrorMessage(null);
    // The Scanner component will automatically try again when remounted
  };

  return (
    <div className="qr-scanner">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Scan QR Code</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="text-white/70 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {hasError ? (
        <div className="permission-prompt text-center py-8">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-destructive/70" />
          <p className="mb-4 text-white/70">{errorMessage || "Camera access is required for scanning QR codes"}</p>
          <Button 
            className="button-gradient"
            onClick={handleRetry}
          >
            <Camera className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-xl mb-3 aspect-square">
            {isScanning && (
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{ 
                  facingMode: 'environment',
                  width: { ideal: 1280 },
                  height: { ideal: 720 }
                }}
                styles={{
                  container: { 
                    width: '100%', 
                    height: '100%' 
                  },
                  video: { 
                    width: '100%', 
                    height: '100%',
                    objectFit: 'cover'
                  }
                }}
                components={{
                  finder: true
                }}
              />
            )}
          </div>
          
          <p className="text-sm text-white/70 text-center">
            Position the QR code within the square and hold steady
          </p>
        </>
      )}
    </div>
  );
} 