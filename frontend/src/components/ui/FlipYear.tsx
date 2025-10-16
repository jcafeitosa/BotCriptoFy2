/**
 * FlipYear Component
 * Simple year flip animation for badges
 * Based on Aceternity UI Layout Text Flip
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface FlipYearProps {
  years?: string[];
  duration?: number;
  className?: string;
}

export const FlipYear: React.FC<FlipYearProps> = ({
  years = ["2025", "2024", "2023", "2025"],
  duration = 3000,
  className = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % years.length);
    }, duration);

    return () => clearInterval(interval);
  }, [years.length, duration]);

  return (
    <motion.span
      layout
      className={cn(
        "relative inline-block overflow-hidden rounded-xl",
        "bg-gradient-to-br from-neon-500 to-neon-600",
        "px-4 py-2 md:px-6 md:py-3 lg:px-8 lg:py-4",
        "shadow-2xl shadow-neon-500/50",
        "ring-2 ring-neon-400/30",
        "before:absolute before:inset-0",
        "before:rounded-xl",
        "before:bg-gradient-to-br before:from-white/20 before:to-transparent",
        "before:pointer-events-none",
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={currentIndex}
          initial={{ y: -60, filter: "blur(10px)", opacity: 0 }}
          animate={{
            y: 0,
            filter: "blur(0px)",
            opacity: 1,
          }}
          exit={{ y: 60, filter: "blur(10px)", opacity: 0 }}
          transition={{
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="inline-block text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white"
        >
          {years[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
};
