import { useState, useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";

// Different content themes for each token
const tokenContent = [
  {
    title: "Connect",
    description: "Connect your wallet securely",
    icon: "🔗",
    color: "from-emerald-400 to-teal-600",
  },
  {
    title: "Create",
    description: "Design your digital presence",
    icon: "🎨",
    color: "from-indigo-400 to-blue-600",
  },
  {
    title: "Verify",
    description: "Establish on-chain proof",
    icon: "✅",
    color: "from-teal-400 to-emerald-600",
  },
  {
    title: "Collect",
    description: "Gather your achievements",
    icon: "🏆",
    color: "from-violet-400 to-purple-600",
  },
  {
    title: "Share",
    description: "Showcase your journey",
    icon: "🚀",
    color: "from-emerald-400 to-teal-600",
  },
];

interface AnimatedTokenProps {
  index: number;
}

export default function AnimatedToken({ index }: AnimatedTokenProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const rotationRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  
  const controls = useAnimation();
  const glowControls = useAnimation();
  const iconControls = useAnimation();
  const rotateControls = useAnimation();
  
  const content = tokenContent[index % tokenContent.length];

  // Auto-flip each token once after a delay based on index
  useEffect(() => {
    const initialDelay = 2000 + (index * 500);
    const autoFlipTimer = setTimeout(() => {
      setIsFlipped(true);
      // Flip back after 2 seconds
      setTimeout(() => {
        setIsFlipped(false);
      }, 2000);
    }, initialDelay);

    return () => clearTimeout(autoFlipTimer);
  }, [index]);

  // Handle hover effects
  useEffect(() => {
    if (isHovered) {
      // Auto-flip on hover
      setIsFlipped(true);
      
      // Show particle effect
      setShowParticles(true);
      
      // Enable 3D rotation
      setIsRotating(true);
      
      // Just flip to 180 degrees and stay there
      rotateControls.start({
        rotateY: 180,
        transition: {
          duration: 0.5,
          ease: "easeOut"
        }
      });
      
      // Floating animation on hover
      controls.start({
        y: [0, -8, 0],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
      
      // Pulsing glow effect
      glowControls.start({
        opacity: [0.2, 0.8, 0.2],
        scale: [1, 1.1, 1],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
      
      // Animate icon on back
      iconControls.start({
        scale: [1, 1.2, 1],
        rotate: [0, 10, 0, -10, 0],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
    } else {
      // Revert to original state when not hovered
      setIsFlipped(false);
      setShowParticles(false);
      setIsRotating(false);
      
      // Stop rotation
      rotateControls.stop();
      rotateControls.start({ rotateY: 0 });
      
      controls.stop();
      controls.start({ y: 0, scale: 1 });
      glowControls.stop();
      glowControls.start({ opacity: 0, scale: 1 });
      iconControls.stop();
      iconControls.start({ scale: 1, rotate: 0 });
    }
  }, [isHovered, controls, glowControls, iconControls, rotateControls]);

  // Handle mousemove for 3D rotation effect
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isRotating || !cardRef.current) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;
    
    // Calculate rotation based on mouse position relative to card center
    const rotateY = ((e.clientX - cardCenterX) / (rect.width / 2)) * 15;
    const rotateX = ((e.clientY - cardCenterY) / (rect.height / 2)) * -15;
    
    rotationRef.current = { x: rotateX, y: rotateY };
  };

  // Generate particle elements
  const renderParticles = () => {
    if (!showParticles) return null;
    
    return Array.from({ length: 6 }).map((_, i) => (
      <span 
        key={i} 
        className="absolute w-1.5 h-1.5 rounded-full bg-white/60" 
        style={{ 
          left: `${35 + Math.random() * 30}%`,
          animation: `particles ${1 + Math.random()}s infinite ${i * 0.1}s`,
          opacity: 0
        }} 
      />
    ));
  };

  return (
    <div className="relative w-full h-full perspective cursor-pointer">
      {/* Glow effect */}
      <motion.div 
        className="absolute -inset-2 rounded-xl blur-md z-0"
        style={{ 
          background: `linear-gradient(135deg, 
            ${index % 2 === 0 ? 'rgba(20, 230, 130, 0.4)' : 'rgba(150, 60, 255, 0.4)'}, 
            transparent)` 
        }}
        animate={glowControls}
      />
      
      <motion.div 
        ref={cardRef}
        className="relative w-full h-full perspective aspect-square"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseMove={handleMouseMove}
        onClick={() => setIsFlipped(!isFlipped)}
        animate={controls}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none particles">
          {renderParticles()}
        </div>
        
        <motion.div
          className="w-full h-full relative preserve-3d"
          animate={rotateControls}
          style={{
            rotateX: isRotating ? rotationRef.current.x : 0,
            rotateY: isFlipped ? 180 : 0
          }}
          transition={{ 
            duration: 0.6, 
            type: "spring", 
            stiffness: 300, 
            damping: 20 
          }}
        >
          {/* Front side */}
          <div className={`absolute w-full h-full backface-hidden rounded-lg flex items-center justify-center ${
            index % 2 === 0 ? 'bg-solana-green/10' : 'bg-solana-purple/10'
          } border border-white/5 backdrop-blur-sm overflow-hidden`}>
            {/* Shimmer effect on hover */}
            {isHovered && (
              <div className="absolute inset-0 shimmer opacity-30 pointer-events-none" />
            )}
            
            <div className={`w-12 h-12 rounded-full ${
              index % 2 === 0 ? 'bg-solana-green/20' : 'bg-solana-purple/20'
            } flex items-center justify-center z-10`}>
              <span className="text-white font-bold">{index + 1}</span>
            </div>
          </div>

          {/* Back side */}
          <div 
            className={`absolute w-full h-full backface-hidden rounded-lg flex flex-col items-center justify-center rotateY-180 bg-gradient-to-br ${content.color} p-3 border border-white/10 overflow-hidden`}
          >
            {/* Shimmer effect on back */}
            {isHovered && (
              <div className="absolute inset-0 shimmer opacity-30 pointer-events-none" />
            )}
            
            <motion.div 
              className="text-2xl mb-1 relative z-10"
              animate={iconControls}
            >
              {content.icon}
            </motion.div>
            <h3 className="text-white font-semibold text-center mb-1 relative z-10">{content.title}</h3>
            <p className="text-white/80 text-xs text-center relative z-10">{content.description}</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
} 