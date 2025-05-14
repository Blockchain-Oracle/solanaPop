import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Check, ExternalLink } from "lucide-react";
import { Token } from "@shared/schema";

interface TransactionModalProps {
  token: Token;
  onClose: () => void;
}

export function TransactionModal({ token, onClose }: TransactionModalProps) {
  // Generate a mock transaction ID
  // In a real app, this would come from the actual Solana transaction
  const transactionId = "4Gn...3kXY";
  
  // Handle View in Explorer click
  const handleViewExplorer = () => {
    // In a real app, this would open the Solana Explorer with the transaction ID
    window.open(`https://explorer.solana.com/tx/${transactionId}?cluster=devnet`, "_blank");
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="glass border-0 max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-space font-bold">Token Claim</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center py-6">
          <div className="h-20 w-20 rounded-full button-gradient flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-white" />
          </div>
          
          <h4 className="text-lg font-bold font-space mb-2">{token.name}</h4>
          <p className="text-sm text-white/70 text-center mb-4">Token successfully claimed and added to your wallet</p>
          
          <div className="w-full bg-solana-darker/40 rounded-lg p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-white/70">Transaction ID:</span>
              <span className="text-solana-green">{transactionId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Status:</span>
              <span className="text-solana-green">Confirmed</span>
            </div>
          </div>
          
          <Button className="w-full button-gradient hover:opacity-90" onClick={handleViewExplorer}>
            <ExternalLink className="mr-2 h-4 w-4" /> View in Explorer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
