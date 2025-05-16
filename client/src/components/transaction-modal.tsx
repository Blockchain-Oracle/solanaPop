import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Check, ExternalLink, Award, Wallet, CheckCircle } from "lucide-react";
import { Token } from "@shared/schema";

interface TransactionModalProps {
  token: Token;
  transactionId: string;
  walletAddress?: string;
  onClose: () => void;
}

export function TransactionModal({ token, transactionId, walletAddress, onClose }: TransactionModalProps) {
  // Format transaction ID for display
  const displayTxId = transactionId.length > 12 
    ? `${transactionId.substring(0, 6)}...${transactionId.substring(transactionId.length - 6)}`
    : transactionId;
  
  // Format wallet address
  const displayWallet = walletAddress && walletAddress.length > 12
    ? `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 6)}`
    : walletAddress;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="glass border-0 max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-space font-bold">{token.name} Claimed</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center py-4">
          <div className="w-24 h-24 mb-4 bg-gradient-to-br from-solana-green/20 to-solana-purple/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-solana-green" />
          </div>
          
          <h4 className="text-xl font-bold mb-2">{token.name}</h4>
          <div className="inline-block bg-solana-darker/60 text-solana-green px-3 py-1 rounded text-xs mb-4">
            {token.symbol}
          </div>
          
          <div className="w-full space-y-4 mb-6">
            <div className="flex items-center p-3 bg-solana-darker/40 rounded-lg">
              <Award className="h-5 w-5 text-solana-purple mr-3" />
              <div>
                <div className="text-sm text-white/70">Token Supply</div>
                <div className="text-white">
                  <span className="font-medium">{token.supply}</span>
                  <span className="text-xs text-white/60 ml-1">tokens</span>
                </div>
              </div>
            </div>
            
            {walletAddress && (
              <div className="flex items-center p-3 bg-solana-darker/40 rounded-lg">
                <Wallet className="h-5 w-5 text-solana-green mr-3" />
                <div>
                  <div className="text-sm text-white/70">Your Wallet</div>
                  <div className="text-white font-mono text-xs truncate" style={{ maxWidth: "240px" }}>
                    {displayWallet}
                  </div>
                </div>
              </div>
            )}
            
            {transactionId && (
              <div className="flex items-center p-3 bg-solana-darker/40 rounded-lg">
                <CheckCircle className="h-5 w-5 text-solana-green mr-3" />
                <div>
                  <div className="text-sm text-white/70">Transaction</div>
                  <div className="text-white font-mono text-xs truncate" style={{ maxWidth: "240px" }}>
                    {displayTxId}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {transactionId && (
            <Button 
              className="w-full button-gradient"
              onClick={() => window.open(`https://explorer.solana.com/tx/${transactionId}?cluster=devnet`, "_blank")}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> View on Explorer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
