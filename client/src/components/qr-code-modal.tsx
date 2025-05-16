import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, Share2 } from "lucide-react";
import QRCode from "react-qr-code";
import { Token } from "@shared/schema";
import { encodeURL } from "@solana/pay";
import { PublicKey } from "@solana/web3.js";

interface QRCodeModalProps {
  token: Token;
  onClose: () => void;
}

export function QRCodeModal({ token, onClose }: QRCodeModalProps) {
  // Generate Solana Pay URL according to specification
  const qrValue = (() => {
    try {
      // // If there's a recipient wallet address for the token, we can create a transfer request
      // if (token.creatorAddress) {
      //   const recipient = new PublicKey(token.creatorAddress);
      //   // Create a reference to track this specific request
      //   const reference = new Uint8Array(32);
      //   // Use token.id as a reference for this transaction
      //   reference.set(Buffer.from(token.id.toString().padStart(32, '0')));
        
      //   // Convert to PublicKey and put in array
      //   const referencePublicKey = new PublicKey(reference);
        
      //   // Create a proper Solana Pay transfer URL
      //   return encodeURL({
      //     recipient,
      //     reference: [referencePublicKey], // Array of PublicKeys
      //     label: token.name,
      //     message: `Claim your ${token.symbol} token`
      //   }).toString();
      // } 
      
      // Alternatively, use transaction request format pointing to your backend
      // const generateQr = async () => {
      //   const apiUrl = `${window.location.protocol}/${window.location.host}/api/pay`;
      //   const label = 'label';
      //   const message = 'message';
      //   const url = encodeURL({ link: new URL(apiUrl), label, message });
      //   const qr = createQR(url);
      //   const qrBlob = await qr.getRawData('png');
      //   if (!qrBlob) return;
      //   const reader = new FileReader();
      //   reader.onload = (event) => {
      //     if (typeof event.target?.result === 'string') {
      //       setQrCode(event.target.result);
      //     }
      //   };
      //   reader.readAsDataURL(qrBlob);
      // }
      const apiUrl = `${window.location.protocol}/${window.location.host}/api/solana-pay/token/${token.id}`
      console.log(apiUrl);
     return encodeURL({ link: new URL(apiUrl), label: token.name, message: `Claim your ${token.symbol} token` }).toString();
    } catch (error) {
      console.error("Error creating Solana Pay URL:", error);
      return `solana:${window.location.origin}/api/solana-pay/token/${token.id}`;
    }
  })();
  
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
          <p className="text-sm text-white/70 mb-4">Scan this QR code with a Solana Pay compatible wallet to claim your token</p>
          
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
