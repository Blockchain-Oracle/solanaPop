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
  const rotationRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  
  const controls = useAnimation();
  const glowControls = useAnimation();
  const iconControls = useAnimation();
  const rotateControls = useAnimation();
  
  const content = tokenContent[index % tokenContent.length];

  // Generate unique rotation behaviors based on token index
  const getRotationPattern = () => {
    const patterns = [
      // Pattern 1: Simple rotation along Y axis
      {
        rotateY: [0, 360],
        transition: {
          duration: 10 + index * 2, // Different duration for each token
          ease: "linear",
          repeat: Infinity
        }
      },
      // Pattern 2: Wobble rotation along X and Y
      {
        rotateY: [0, 10, 0, -10, 0],
        rotateX: [0, -5, 0, 5, 0],
        transition: {
          duration: 8 + index,
          ease: "easeInOut",
          repeat: Infinity
        }
      },
      // Pattern 3: Slow figure-8 rotation
      {
        rotateY: [0, 30, 0, -30, 0],
        rotateX: [0, 15, 0, 15, 0],
        transition: {
          duration: 12 - index,
          ease: [0.45, 0.05, 0.55, 0.95],
          repeat: Infinity
        }
      },
      // Pattern 4: Quick spins with pauses
      {
        rotateY: [0, 0, 360, 360],
        transition: {
          duration: 15,
          times: [0, 0.6, 0.8, 1],
          ease: "easeInOut",
          repeat: Infinity
        }
      },
      // Pattern 5: Continuous gentle swaying
      {
        rotateZ: [0, 5, 0, -5, 0],
        rotateY: [0, 15, 0, -15, 0],
        transition: {
          duration: 6 + index * 1.5,
          ease: "easeInOut",
          repeat: Infinity
        }
      }
    ];
    
    // Each token gets a different pattern based on its index
    return patterns[index % patterns.length];
  };

  // Auto-flip each token periodically
  useEffect(() => {
    const startFlipCycle = () => {
      // Calculate random flip timing for each token
      const flipInterval = 6000 + (index * 1000) + (Math.random() * 4000);
      const flipDuration = 1500 + (Math.random() * 1000);
      
      const timer = setTimeout(() => {
        setIsFlipped(true);
        
        // Flip back after duration
        setTimeout(() => {
          setIsFlipped(false);
          
          // Schedule next flip
          startFlipCycle();
        }, flipDuration);
      }, flipInterval);
      
      return timer;
    };
    
    const timer = startFlipCycle();
    return () => clearTimeout(timer);
  }, [index]);

  // Start automatic rotation animation on mount
  useEffect(() => {
    // Start continuous rotation effect
    rotateControls.start(getRotationPattern());
    
    // Floating animation
    controls.start({
      y: [0, -5, 0, -3, 0],
      transition: {
        duration: 5 + index, // Different duration for each token
        repeat: Infinity,
        ease: "easeInOut"
      }
    });
    
    // Subtle persistent glow effect
    glowControls.start({
      opacity: [0.1, 0.4, 0.1],
      scale: [1, 1.05, 1],
      transition: {
        duration: 4 + (index % 3),
        repeat: Infinity,
        ease: "easeInOut"
      }
    });
    
    // Subtle persistent icon animation
    iconControls.start({
      scale: [1, 1.1, 1],
      rotate: [0, 5, 0, -5, 0],
      transition: {
        duration: 4 + (index % 4),
        repeat: Infinity,
        ease: "easeInOut"
      }
    });
  }, [controls, glowControls, iconControls, rotateControls, index]);

  // Enhance hover effects
  useEffect(() => {
    if (isHovered) {
      // Flip on hover
      setIsFlipped(true);
      
      // Show particle effect
      setShowParticles(true);
      
      // Enhanced rotation on hover
      rotateControls.start({
        rotateY: [null, 360],
        transition: {
          duration: 2,
          ease: "easeInOut",
          repeat: Infinity
        }
      });
      
      // Enhanced floating animation
      controls.start({
        y: [0, -10, 0],
        scale: [null, 1.1, 1],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
      
      // Enhanced glow effect
      glowControls.start({
        opacity: [0.2, 0.8, 0.2],
        scale: [1, 1.2, 1],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
      
      // Enhanced icon animation
      iconControls.start({
        scale: [1, 1.3, 1],
        rotate: [0, 15, 0, -15, 0],
        transition: {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
    } else {
      // Revert to standard auto-animations on hover end
      setShowParticles(false);
      
      // Return to the default rotation pattern
      rotateControls.start(getRotationPattern());
      
      // Return to default floating animation
      controls.start({
        y: [0, -5, 0, -3, 0],
        scale: 1,
        transition: {
          duration: 5 + index,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
      
      // Return to default glow effect
      glowControls.start({
        opacity: [0.1, 0.4, 0.1],
        scale: [1, 1.05, 1],
        transition: {
          duration: 4 + (index % 3),
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
      
      // Return to default icon animation
      iconControls.start({
        scale: [1, 1.1, 1],
        rotate: [0, 5, 0, -5, 0],
        transition: {
          duration: 4 + (index % 4),
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
    }
  }, [isHovered, controls, glowControls, iconControls, rotateControls, index]);

  // Handle mousemove for additional 3D rotation effect
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    
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
        onMouseLeave={() => {
          setIsHovered(false);
          setIsFlipped(false);
        }}
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
            rotateX: isHovered ? rotationRef.current.x : 0,
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