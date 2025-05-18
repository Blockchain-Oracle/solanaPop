import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { X, Camera, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QrScanner from 'qr-scanner';
import './qr-code-scanner.css';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isScanning: boolean;
}

export function QRCodeScanner({ onScan, onClose, isScanning }: QRCodeScannerProps) {
  const { toast } = useToast();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const qrRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only initialize when isScanning is true and video element is available
    if (isScanning && videoRef.current && !scannerRef.current) {
      // Initialize the scanner with the video element and success callback
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log("QR Data detected:", result.data);
          onScan(result.data);
        },
        {
          preferredCamera: 'environment', // Use back camera on mobile
          highlightScanRegion: true,
          highlightCodeOutline: true,
          overlay: qrRegionRef.current || undefined,
          onDecodeError: (error) => {
            // This is called for each frame that doesn't contain a QR code
            // We don't want to handle this as an error
          },
        }
      );

      // Start the scanner
      scannerRef.current.start()
        .then(() => {
          setHasError(false);
          setErrorMessage(null);
        })
        .catch((error) => {
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
        });
    }

    // Cleanup function to stop scanner when component unmounts or isScanning changes
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current = null;
      }
    };
  }, [isScanning, toast, onScan, errorMessage]);

  // Handle retry
  const handleRetry = () => {
    setHasError(false);
    setErrorMessage(null);
    
    // Clean up previous scanner if it exists
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current = null;
    }
    
    // The scanner will reinitialize in the useEffect
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
              <div className="qr-container h-full w-full relative">
                <video ref={videoRef} className="h-full w-full object-cover"></video>
                <div className="qr-scan-region" ref={qrRegionRef}>
                  <div className="qr-scan-frame"></div>
                </div>
              </div>
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