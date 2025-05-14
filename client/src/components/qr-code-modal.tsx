import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, Share2 } from "lucide-react";
import QRCode from "react-qr-code";
import { Token } from "@shared/schema";

interface QRCodeModalProps {
  token: Token;
  onClose: () => void;
}

export function QRCodeModal({ token, onClose }: QRCodeModalProps) {
  // Generate token QR code value
  // In a real app, this would encode the token ID and other data
  const qrValue = `solanapop://token/${token.id}/${token.symbol}`;
  
  // Handle download QR code
  const handleDownload = () => {
    // Create a canvas from the QR code SVG
    const svg = document.getElementById("token-qr-code");
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      
      // Download the PNG file
      const downloadLink = document.createElement("a");
      downloadLink.download = `${token.symbol}-qrcode.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };
  
  // Handle share QR code
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${token.name} - POP Token`,
          text: `Scan this QR code to claim your ${token.symbol} token`,
          url: window.location.href,
        });
      } else {
        // Fallback if Web Share API is not available
        navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="glass border-0 max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-space font-bold">{token.name}</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="bg-white p-6 rounded-lg mb-4">
          {/* QR Code */}
          <div className="aspect-square flex items-center justify-center">
            <QRCode 
              id="token-qr-code"
              value={qrValue}
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              level="H"
            />
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-white/70 mb-4">Attendees can scan this QR code to claim their participation token</p>
          
          <div className="flex gap-3">
            <Button 
              variant="outline"
              className="flex-1 px-4 py-2 text-sm bg-solana-darker/40 text-white/90 border-white/10"
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
            <Button 
              variant="outline"
              className="flex-1 px-4 py-2 text-sm bg-solana-darker/40 text-white/90 border-white/10"
              onClick={handleShare}
            >
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
