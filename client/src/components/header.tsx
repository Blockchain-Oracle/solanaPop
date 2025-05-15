import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Home, Wallet, Loader2, LogOut, Plus, LayoutDashboard, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLocation } from "wouter";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onReturnHome?: () => void;
}

export default function Header({ onReturnHome }: HeaderProps) {
  const { connected, connecting, connectWallet, disconnectWallet, formatedAddress } = useWallet();
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [, navigate] = useLocation();
  
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
          onClick={onReturnHome || (() => navigate("/"))}
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
          onClick={onReturnHome || (() => navigate("/"))}
        >
          <span className="text-solana-green">Solana</span> POP
        </h1>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Navigation Links - Only show when connected */}
        {connected && (
          <div className="hidden md:flex items-center gap-2 mr-2">
            <Button 
              variant="ghost" 
              className="glass px-3 py-2 rounded-full hover:bg-white/10"
              onClick={() => navigate("/dashboard")}
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              <span className="text-sm">Dashboard</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="glass px-3 py-2 rounded-full hover:bg-white/10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="text-sm">Create</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass border-0 bg-solana-darker/90 backdrop-blur-xl">
                <DropdownMenuItem 
                  className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  onClick={() => navigate("/create-token")}
                >
                  Create Token
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  onClick={() => navigate("/create-event")}
                >
                  Create Event
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
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
                formatedAddress
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
          
          {/* Connected dropdown menu */}
          {connected && showDisconnect && (
            <div className="absolute top-full mt-1 right-0 w-full z-10">
              <div className="glass border-0 bg-solana-darker/90 backdrop-blur-xl rounded-md overflow-hidden p-1">
                <Button 
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs mb-1 hover:bg-white/10"
                  onClick={() => {
                    navigate("/dashboard");
                    setShowDisconnect(false);
                  }}
                >
                  <LayoutDashboard className="h-3.5 w-3.5 mr-2" />
                  Dashboard
                </Button>
                
                <Button 
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs mb-1 hover:bg-white/10"
                  onClick={() => {
                    navigate("/create-token");
                    setShowDisconnect(false);
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Create Token
                </Button>
                
                <Button 
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs mb-1 hover:bg-white/10"
                  onClick={() => {
                    navigate("/create-event");
                    setShowDisconnect(false);
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Create Event
                </Button>
                
                <DropdownMenuSeparator className="bg-white/10 my-1" />
                
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full text-xs flex items-center justify-start"
                  onClick={handleDisconnect}
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
