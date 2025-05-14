import { useState } from "react";
import Header from "@/components/header";
import CreatorView from "@/components/creator-view";
import AttendeeView from "@/components/attendee-view";
import Footer from "@/components/footer";
import { QRCodeModal } from "@/components/qr-code-modal";
import { TransactionModal } from "@/components/transaction-modal";
import { Token } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { QrCode, SunMedium } from "lucide-react";
import AnimatedToken from "@/components/animated-token";
import { motion } from "framer-motion";

export default function Home() {
  const [activeView, setActiveView] = useState<"landing" | "creator" | "attendee">("landing");
  const [showQRModal, setShowQRModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  
  // Handle view selection
  const handleViewSelect = (view: "creator" | "attendee") => {
    setActiveView(view);
  };
  
  // Show QR code modal for a specific token
  const handleShowQR = (token: Token) => {
    setSelectedToken(token);
    setShowQRModal(true);
  };
  
  // Show transaction successful modal
  const handleShowTransaction = (token: Token) => {
    setSelectedToken(token);
    setShowTransactionModal(true);
  };

  // Return to landing page
  const handleReturnHome = () => {
    setActiveView("landing");
  };

  if (activeView === "landing") {
    return (
      <div className="min-h-screen flex flex-col bg-black text-white">
        <div className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
          <Header onReturnHome={handleReturnHome} />
          
          {/* Hero Section */}
          <div className="text-center mt-16 mb-12 relative">
            {/* Abstract Decoration - Top */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-solana-green opacity-10 rounded-full blur-3xl pointer-events-none"></div>
            {/* Abstract Decoration - Right */}
            <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-solana-purple opacity-10 rounded-full blur-3xl pointer-events-none"></div>
            
            <motion.h1 
              className="text-5xl md:text-6xl font-bold font-space mb-4 relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Solana Proof-of-Participation
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-400 max-w-3xl mx-auto relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Create and claim compressed tokens (cTokens) for events and experiences on Solana
            </motion.p>
            
            {/* Hero Illustration */}
            <motion.div 
              className="mt-12 mb-8 mx-auto max-w-3xl relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-solana-green/20 to-solana-purple/20 rounded-xl blur-md"></div>
              <div className="glass p-8 rounded-xl relative">
                <div className="grid grid-cols-5 gap-4">
                  {/* Animated Token Examples */}
                  {[...Array(5)].map((_, i) => (
                    <motion.div 
                      key={i}
                      className="staggered-animation"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        duration: 0.4, 
                        delay: 0.6 + (i * 0.1),
                        type: "spring",
                        stiffness: 260,
                        damping: 20 
                      }}
                    >
                      <AnimatedToken index={i} />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Selection Cards */}
          <div className="grid md:grid-cols-2 gap-8 mt-12 max-w-4xl mx-auto">
            {/* Event Creators Card */}
            <motion.div 
              className="rounded-xl relative group"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
            >
              {/* Card glow effect on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-solana-green/30 to-solana-green/10 opacity-0 group-hover:opacity-100 rounded-xl blur-md transition duration-300"></div>
              
              {/* Card content */}
              <div className="relative glass p-8 flex flex-col items-center text-center rounded-xl">
                <h2 className="text-2xl font-bold font-space mb-2">Event Creators</h2>
                <p className="text-gray-400 mb-8">
                  Create events and mint cTokens for your attendees
                </p>
                
                <div className="bg-black/50 rounded-full w-24 h-24 flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 bg-solana-green/10 rounded-full"></div>
                  <SunMedium className="w-12 h-12 text-white" />
                </div>
                
                <p className="text-gray-400 mb-8">
                  Mint compressed tokens for your events and generate QR codes for attendees to claim
                </p>
                
                <Button 
                  className="button-gradient text-white font-medium px-8 py-6 h-auto text-lg w-full"
                  onClick={() => handleViewSelect("creator")}
                >
                  Create Event
                </Button>
              </div>
            </motion.div>
            
            {/* Event Attendees Card */}
            <motion.div 
              className="rounded-xl relative group"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
            >
              {/* Card glow effect on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-solana-purple/10 to-solana-purple/30 opacity-0 group-hover:opacity-100 rounded-xl blur-md transition duration-300"></div>
              
              {/* Card content */}
              <div className="relative glass p-8 flex flex-col items-center text-center rounded-xl">
                <h2 className="text-2xl font-bold font-space mb-2">Event Attendees</h2>
                <p className="text-gray-400 mb-8">
                  Scan QR codes to claim your participation tokens
                </p>
                
                <div className="bg-black/50 rounded-full w-24 h-24 flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 bg-solana-purple/10 rounded-full"></div>
                  <QrCode className="w-12 h-12 text-white" />
                </div>
                
                <p className="text-gray-400 mb-8">
                  Scan event QR codes to claim your proof-of-participation tokens and build your collection
                </p>
                
                <Button 
                  className="bg-white text-black hover:bg-white/90 font-medium px-8 py-6 h-auto text-lg w-full"
                  onClick={() => handleViewSelect("attendee")}
                >
                  Claim Tokens
                </Button>
              </div>
            </motion.div>
          </div>
          
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Header onReturnHome={handleReturnHome} />
      
      {/* Main Content */}
      {activeView === "creator" ? (
        <CreatorView onShowQR={handleShowQR} />
      ) : (
        <AttendeeView onShowTransaction={handleShowTransaction} />
      )}
      
      <Footer />
      
      {/* Modals */}
      {showQRModal && selectedToken && (
        <QRCodeModal 
          token={selectedToken} 
          onClose={() => setShowQRModal(false)} 
        />
      )}
      
      {showTransactionModal && selectedToken && (
        <TransactionModal 
          token={selectedToken} 
          onClose={() => setShowTransactionModal(false)} 
        />
      )}
    </div>
  );
}
