import React from "react";
import { cn } from "../../utils/cn";

export const GradientBackground = ({ className }: { className?: string }) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-accent-500/20 to-brand-700/20 animate-gradient" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-float" />
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-accent-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-brand-600/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-float" style={{ animationDelay: '4s' }} />
    </div>
  );
};
