import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Home, Wallet, Loader2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface HeaderProps {
  onReturnHome?: () => void;
}

export default function Header({ onReturnHome }: HeaderProps) {
  const { connected, connecting, connectWallet, disconnectWallet, walletAddress, publicKey } = useWallet();
  const [showDisconnect, setShowDisconnect] = useState(false);
  
  // Handle wallet connection
  const handleWalletClick = () => {
    if (connected) {
      // Toggle disconnect button instead of immediately disconnecting
      setShowDisconnect(!showDisconnect);
    } else {
      connectWallet();
    }
  };

  // Handle disconnect click
  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    disconnectWallet();
    setShowDisconnect(false);
  };

  return (
    <header className="flex flex-col md:flex-row justify-between items-center mb-8">
      <div className="flex items-center space-x-3 mb-4 md:mb-0">
        {/* Solana POP Logo */}
        <div 
          className="h-10 w-10 rounded-full flex items-center justify-center button-gradient cursor-pointer"
          onClick={onReturnHome}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-5 h-5 text-white"
          >
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
            <path d="M20 12v4H6a2 2 0 0 0-2 2c0 1.1.9 2 2 2h12v-4" />
          </svg>
        </div>
        <h1 
          className="text-2xl md:text-3xl font-bold font-space cursor-pointer"
          onClick={onReturnHome}
        >
          <span className="text-solana-green">Solana</span> POP
        </h1>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Home Button - Only show on sub-pages */}
        {onReturnHome && (
          <Button 
            variant="ghost" 
            className="glass px-3 py-2 rounded-full hover:bg-white/10"
            onClick={onReturnHome}
          >
            <Home className="h-4 w-4 mr-2" />
            <span className="text-sm">Home</span>
          </Button>
        )}
        
        {/* Wallet Connection */}
        <div className="relative">
          <Button 
            variant="ghost" 
            className={cn(
              "glass px-5 py-2.5 rounded-full flex items-center",
              connected ? "bg-green-600/20 hover:bg-green-600/30" : "hover:bg-white/10",
              connecting && "animate-pulse"
            )}
            onClick={handleWalletClick}
            disabled={connecting}
          >
            <span className="mr-2 text-sm">
              {connecting ? (
                "Connecting..."
              ) : connected ? (
                walletAddress
              ) : (
                "Connect Wallet"
              )}
            </span>
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
          </Button>
          
          {/* Disconnect dropdown button */}
          {connected && showDisconnect && (
            <Button
              variant="destructive"
              size="sm"
              className="absolute top-full mt-1 right-0 py-1 px-3 text-xs flex items-center gap-1"
              onClick={handleDisconnect}
            >
              <span>Disconnect</span>
              <LogOut className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
