import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Share2 } from "lucide-react";
import { Token } from "@shared/schema";
import { TokenClaimQR } from "@/components/token-claim-qr";

interface QRCodeModalProps {
  token: Token;
  onClose: () => void;
}

export function QRCodeModal({ token, onClose }: QRCodeModalProps) {
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
        
        {/* Use the TokenClaimQR component instead of manually creating QR code */}
        <TokenClaimQR
          tokenId={token.id}
          tokenName={token.name}
          tokenSymbol={token.symbol}
          refreshInterval={180} // 3 minutes
        />
        
        <div className="text-center mt-4">
          <p className="text-sm text-white/70 mb-4">Scan this QR code with a Solana Pay compatible wallet to claim your token</p>
          
          <Button 
            variant="outline"
            className="px-4 py-2 text-sm bg-solana-darker/40 text-white/90 border-white/10"
            onClick={handleShare}
          >
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
