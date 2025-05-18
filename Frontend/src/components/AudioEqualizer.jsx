import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function AudioEqualizer({ isActive = false }) {
  const [barHeights, setBarHeights] = useState([]);
  const intervalRef = useRef(null);
  const barCount = 20;
  
  useEffect(() => {
    // Generate initial random heights
    setBarHeights(Array.from({ length: barCount }, () => Math.random() * 0.5 + 0.1));
    
    // If active, animate the bars
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setBarHeights(prevHeights => 
          prevHeights.map(() => Math.random() * 0.9 + 0.1)
        );
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      // Reset to small random heights when inactive
      setBarHeights(Array.from({ length: barCount }, () => Math.random() * 0.2 + 0.05));
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);
  
  return (
    <div className="flex items-end justify-center h-20 space-x-[1px]">
      {barHeights.map((height, index) => (
        <motion.div
          key={index}
          className="equalizer-bar"
          animate={{ 
            height: `${height * 100}%`,
            opacity: isActive ? 1 : 0.4
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20
          }}
        />
      ))}
    </div>
  );
} 