"use client";
import React, { useEffect, useRef } from "react";

interface Dot {
  x: number;
  y: number;
  baseOpacity: number;
  currentOpacity: number;
  speed: number;
  phase: number;
}

interface DottedGlowBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  opacity?: number;
  gap?: number;
  radius?: number;
  colorLightVar?: string;
  glowColorLightVar?: string;
  colorDarkVar?: string;
  glowColorDarkVar?: string;
  backgroundOpacity?: number;
  speedMin?: number;
  speedMax?: number;
  speedScale?: number;
}

/**
 * DottedGlowBackground Component
 *
 * Animated canvas-based dotted background with interactive glow effects.
 * Based on Aceternity UI patterns.
 */
export const DottedGlowBackground: React.FC<DottedGlowBackgroundProps> = ({
  children,
  className = "",
  opacity = 0.6,
  gap = 12,
  radius = 2,
  colorLightVar = "--color-neutral-500",
  glowColorLightVar = "--color-neutral-600",
  colorDarkVar = "--color-neutral-500",
  glowColorDarkVar = "--color-sky-800",
  backgroundOpacity = 0,
  speedMin = 0.4,
  speedMax = 1.3,
  speedScale = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  // Get CSS variable color
  const getCSSColor = (varName: string): string => {
    if (typeof window === "undefined") return "rgba(128, 128, 128, 0.5)";

    if (varName.startsWith("--")) {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName);
      return value.trim() || "rgba(128, 128, 128, 0.5)";
    }
    return varName;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let isDark = false;

    // Check dark mode
    const updateTheme = () => {
      isDark = document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    };

    updateTheme();

    // Resize canvas to match display size
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      initializeDots(rect.width, rect.height);
    };

    // Initialize dots grid
    const initializeDots = (width: number, height: number) => {
      const dots: Dot[] = [];
      const cols = Math.ceil(width / gap) + 1;
      const rows = Math.ceil(height / gap) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const baseOpacity = Math.random() * 0.5 + 0.3;
          dots.push({
            x: i * gap,
            y: j * gap,
            baseOpacity,
            currentOpacity: baseOpacity,
            speed: (Math.random() * (speedMax - speedMin) + speedMin) * speedScale,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }

      dotsRef.current = dots;
    };

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    // Mouse leave handler
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    // Animation loop
    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      updateTheme();

      const dotColor = getCSSColor(isDark ? colorDarkVar : colorLightVar);
      const glowColor = getCSSColor(isDark ? glowColorDarkVar : glowColorLightVar);

      timeRef.current += 0.016; // ~60fps

      dotsRef.current.forEach((dot) => {
        // Animate opacity with sine wave
        const animatedOpacity = dot.baseOpacity +
          Math.sin(timeRef.current * dot.speed + dot.phase) * 0.3;
        dot.currentOpacity = Math.max(0.1, Math.min(1, animatedOpacity));

        // Calculate distance from mouse
        const dx = mouseRef.current.x - dot.x;
        const dy = mouseRef.current.y - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxGlowDistance = 250;

        // Draw glow effect with modern gradient
        if (distance < maxGlowDistance) {
          const glowIntensity = 1 - distance / maxGlowDistance;
          const glowRadius = radius + glowIntensity * 25;

          const gradient = ctx.createRadialGradient(
            dot.x,
            dot.y,
            0,
            dot.x,
            dot.y,
            glowRadius * 5
          );

          // Gradient: blue → purple → dark blue → lime green → orange
          const blueGlow = `rgba(59, 130, 246, ${glowIntensity * 0.9})`;
          const purpleGlow = `rgba(124, 58, 237, ${glowIntensity * 0.7})`;
          const darkBlueGlow = `rgba(30, 64, 175, ${glowIntensity * 0.5})`;
          const limeGlow = `rgba(132, 204, 22, ${glowIntensity * 0.4})`;
          const orangeGlow = `rgba(251, 146, 60, ${glowIntensity * 0.2})`;

          gradient.addColorStop(0, blueGlow);
          gradient.addColorStop(0.25, purpleGlow);
          gradient.addColorStop(0.5, darkBlueGlow);
          gradient.addColorStop(0.75, limeGlow);
          gradient.addColorStop(0.95, orangeGlow);
          gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, glowRadius * 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw dot
        const dotWithAlpha = dotColor.includes("rgba")
          ? dotColor.replace(/[\d.]+\)$/g, `${dot.currentOpacity * opacity})`)
          : dotColor.replace("rgb", "rgba").replace(")", `, ${dot.currentOpacity * opacity})`);

        ctx.fillStyle = dotWithAlpha;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    // Initialize
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    // Start animation
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gap, radius, opacity, colorLightVar, glowColorLightVar, colorDarkVar, glowColorDarkVar, speedMin, speedMax, speedScale]);

  return (
    <div className={`relative ${className}`} style={{ isolation: 'isolate' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{
          backgroundColor: backgroundOpacity > 0
            ? `rgba(0, 0, 0, ${backgroundOpacity})`
            : "transparent",
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      {children && <div className="relative" style={{ zIndex: 1 }}>{children}</div>}
    </div>
  );
};

// Wrapper component for full-page backgrounds
interface DottedGlowContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const DottedGlowContainer: React.FC<DottedGlowContainerProps> = ({
  children,
  className = "",
}) => {
  return (
    <DottedGlowBackground
      className={`min-h-screen w-full bg-black ${className}`}
      gap={8}
      radius={1.8}
      opacity={0.7}
      colorDarkVar="rgba(75, 85, 99, 0.25)"
      glowColorDarkVar="rgba(59, 130, 246, 0.95)"
      colorLightVar="rgba(0, 0, 0, 0.7)"
      glowColorLightVar="rgba(59, 130, 246, 0.85)"
      speedMin={1.5}
      speedMax={4.0}
      speedScale={1}
      backgroundOpacity={1}
    >
      {children}
    </DottedGlowBackground>
  );
};
