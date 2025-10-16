import React from "react";
import { cn } from "../../utils/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className }: CardProps) => {
  return (
    <div
      className={cn(
        "rounded-2xl bg-gray-900/50 border border-gray-800 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className }: CardProps) => {
  return (
    <div className={cn("p-6 pb-0", className)}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className }: CardProps) => {
  return (
    <h2 className={cn("text-2xl font-bold text-white", className)}>
      {children}
    </h2>
  );
};

export const CardDescription = ({ children, className }: CardProps) => {
  return (
    <p className={cn("text-gray-400 mt-2", className)}>
      {children}
    </p>
  );
};

export const CardContent = ({ children, className }: CardProps) => {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className }: CardProps) => {
  return (
    <div className={cn("p-6 pt-0", className)}>
      {children}
    </div>
  );
};
