/**
 * FlipText Component
 * Based on Aceternity UI Layout Text Flip
 * @see https://ui.aceternity.com/components/layout-text-flip
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

interface FlipTextProps {
  staticText?: string;
  words?: string[];
  duration?: number;
  className?: string;
  flipClassName?: string;
}

export const FlipText: React.FC<FlipTextProps> = ({
  staticText = "BotCriptoFy",
  words = ["Trading", "Automation", "Analytics", "Performance"],
  duration = 3000,
  className = "",
  flipClassName = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, duration);

    return () => clearInterval(interval);
  }, [words.length, duration]);

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {/* Static Text */}
      {staticText && (
        <motion.span
          layoutId="static-text"
          className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-extra-tight text-white"
        >
          {staticText}
        </motion.span>
      )}

      {/* Flipping Word */}
      <motion.span
        layout
        className={cn(
          "relative inline-block overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-cyan-400 to-cyan-600",
          "px-6 py-3 md:px-8 md:py-4",
          "shadow-lg shadow-cyan-500/50",
          "ring-2 ring-cyan-400/20",
          flipClassName
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
              ease: [0.16, 1, 0.3, 1], // Custom easing
            }}
            className={cn(
              "inline-block text-5xl md:text-7xl lg:text-8xl",
              "font-bold tracking-tight text-black"
            )}
          >
            {words[currentIndex]}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </div>
  );
};

/**
 * Alternative version with year badge
 */
interface FlipTextWithYearProps extends FlipTextProps {
  year?: string;
}

export const FlipTextWithYear: React.FC<FlipTextWithYearProps> = ({
  staticText = "BotCriptoFy",
  words = ["Trading", "Automation"],
  year = "2025",
  duration = 3000,
  className = "",
  flipClassName = "",
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, duration);

    return () => clearInterval(interval);
  }, [words.length, duration]);

  return (
    <h1
      className={cn(
        "text-6xl md:text-8xl lg:text-9xl font-bold mb-12",
        "leading-none tracking-extra-tight",
        className
      )}
    >
      {/* First Line: Static Text */}
      <span className="text-white block mb-2">{staticText}</span>

      {/* Second Line: Flipping Word + Year */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Flipping Word */}
        <motion.span
          layout
          className={cn(
            "relative inline-block overflow-hidden rounded-2xl",
            "bg-gradient-to-br from-cyan-400 to-cyan-600",
            "px-6 py-3 md:px-8 md:py-4",
            "shadow-2xl shadow-cyan-500/50",
            "ring-2 ring-cyan-400/30",
            flipClassName
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
              className="inline-block text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-black"
            >
              {words[currentIndex]}
            </motion.span>
          </AnimatePresence>
        </motion.span>

        {/* Year Badge */}
        <span
          className={cn(
            "relative inline-block",
            "text-5xl md:text-7xl lg:text-8xl font-bold",
            "px-6 py-2 md:px-8 md:py-3",
            "rounded-2xl",
            "bg-gradient-to-br from-neon-500 to-neon-600",
            "text-black",
            "shadow-2xl shadow-neon-500/50",
            "ring-2 ring-neon-400/30",
            "before:absolute before:inset-0",
            "before:rounded-2xl",
            "before:bg-gradient-to-br before:from-white/20 before:to-transparent",
            "before:pointer-events-none"
          )}
        >
          {year}
        </span>
      </div>
    </h1>
  );
};
