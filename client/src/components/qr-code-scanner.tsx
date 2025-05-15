import React, { useState, useRef, useEffect } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Button } from './ui/button';
import { Camera, X, RotateCcw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isScanning: boolean;
}

export function QRCodeScanner({ onScan, onClose, isScanning }: QRCodeScannerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const codeReader = new BrowserQRCodeReader();
  
  useEffect(() => {
    let mounted = true;
    
    const getAvailableCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        if (mounted) {
          setCameras(videoDevices);
          // Select the back camera by default on mobile if available
          if (isMobile && videoDevices.length > 1) {
            // Back cameras typically have "environment" in the label or are the second in the list
            const backCamera = videoDevices.find(device => 
              device.label.toLowerCase().includes('back') || 
              device.label.toLowerCase().includes('environment')
            );
            
            if (backCamera) {
              setSelectedCamera(backCamera.deviceId);
            } else {
              setSelectedCamera(videoDevices[videoDevices.length - 1].deviceId);
            }
          } else if (videoDevices.length > 0) {
            setSelectedCamera(videoDevices[0].deviceId);
          } else {
            setCameraError("No cameras found on your device");
          }
        }
      } catch (error) {
        console.error('Error getting cameras:', error);
        setCameraError("Could not access device cameras");
      }
    };
    
    getAvailableCameras();
    
    return () => {
      mounted = false;
    };
  }, [isMobile]);
  
  useEffect(() => {
    if (!isScanning || !selectedCamera) return;
    
    const startScanner = async () => {
      try {
        if (!videoRef.current) return;
        
        // Request camera permissions
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
            facingMode: isMobile ? 'environment' : undefined
          }
        });
        
        setHasPermission(true);
        setCameraError(null);
        videoRef.current.srcObject = stream;
        
        // Start scanning for QR codes
        controlsRef.current = await codeReader.decodeFromVideoDevice(
          selectedCamera,
          videoRef.current,
          (result, error) => {
            if (result) {
              try {
                // Parse the QR data and validate format
                const qrData = result.getText();
                onScan(qrData);
              } catch (e) {
                console.error('Error parsing QR data:', e);
                toast({
                  title: 'Invalid QR Code',
                  description: 'The QR code does not contain valid token data',
                  variant: 'destructive'
                });
              }
            }
            if (error && !(error instanceof Error && error.message.includes('No MultiFormat Readers'))) {
              console.error('QR Scan error:', error);
            }
          }
        );
      } catch (err) {
        console.error('Error starting QR scanner:', err);
        setHasPermission(false);
        
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            setCameraError("Camera access was denied. Please grant permission and try again.");
          } else if (err.name === 'NotFoundError') {
            setCameraError("No camera was found on your device.");
          } else if (err.name === 'NotReadableError') {
            setCameraError("The camera is in use by another application.");
          } else {
            setCameraError(`Camera error: ${err.message}`);
          }
        } else {
          setCameraError("An unknown camera error occurred");
        }
        
        toast({
          title: 'Camera Access Issue',
          description: 'Could not access your camera. Please check permissions.',
          variant: 'destructive'
        });
      }
    };
    
    startScanner();
    
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      // Stop all video tracks
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanning, selectedCamera, onScan, toast, isMobile, codeReader]);
  
  const handleCameraChange = (deviceId: string) => {
    // Stop current stream
    if (controlsRef.current) {
      controlsRef.current.stop();
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    
    // Set new camera
    setSelectedCamera(deviceId);
  };
  
  const handleRetry = () => {
    setHasPermission(null);
    setCameraError(null);
    // Re-trigger camera access
    if (selectedCamera) {
      const currentCamera = selectedCamera;
      setSelectedCamera('');
      setTimeout(() => setSelectedCamera(currentCamera), 100);
    }
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
      
      {hasPermission === false || cameraError ? (
        <div className="permission-prompt text-center py-8">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-destructive/70" />
          <p className="mb-4 text-white/70">{cameraError || "Camera access is required for scanning QR codes"}</p>
          <Button 
            className="button-gradient"
            onClick={handleRetry}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-xl mb-3 aspect-square">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <div className="scanner-overlay absolute inset-0 flex items-center justify-center">
              <div className="scan-region w-3/5 h-3/5 border-2 border-solana-green rounded-lg"></div>
            </div>
            
            {/* Show animated scan line */}
            <div className="absolute left-[20%] right-[20%] h-0.5 bg-solana-green/60"
                 style={{
                   top: '40%',
                   animation: 'qrScanLine 2s linear infinite',
                   boxShadow: '0 0 10px rgba(132, 255, 132, 0.8)'
                 }}></div>
          </div>
          
          {cameras.length > 1 && (
            <div className="mb-3">
              <select
                className="w-full p-2 rounded-md bg-solana-darker/60 border border-white/10 text-white/90"
                value={selectedCamera}
                onChange={(e) => handleCameraChange(e.target.value)}
              >
                {cameras.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <p className="text-sm text-white/70 text-center">
            Position the QR code within the square and hold steady
          </p>
          
          <style>
          {`
            @keyframes qrScanLine {
              0% {
                top: 30%;
              }
              50% {
                top: 70%;
              }
              100% {
                top: 30%;
              }
            }
          `}
          </style>
        </>
      )}
    </div>
  );
} 