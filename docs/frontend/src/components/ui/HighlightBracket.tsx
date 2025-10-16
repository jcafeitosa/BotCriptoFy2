import React from 'react';
import { cn } from '../../utils/cn';

interface HighlightBracketProps {
  children: React.ReactNode;
  color?: 'cyan' | 'neon' | 'coral' | 'brand' | 'accent';
  className?: string;
}

/**
 * HighlightBracket Component
 *
 * Creates highlighted text within brackets, inspired by OpenAI DevDay design.
 *
 * @example
 * <HighlightBracket color="neon">2025</HighlightBracket>
 * Output: [2025] (with neon green styling)
 */
export const HighlightBracket: React.FC<HighlightBracketProps> = ({
  children,
  color = 'neon',
  className,
}) => {
  const colorClasses = {
    cyan: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
    neon: 'text-neon-500 bg-neon-500/10 border-neon-500/30',
    coral: 'text-coral-400 bg-coral-400/10 border-coral-400/30',
    brand: 'text-brand-400 bg-brand-400/10 border-brand-400/30',
    accent: 'text-accent-400 bg-accent-400/10 border-accent-400/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded border font-bold',
        colorClasses[color],
        className
      )}
    >
      {children}
    </span>
  );
};

interface HighlightTextProps {
  children: React.ReactNode;
  color?: 'cyan' | 'neon' | 'coral' | 'brand' | 'accent' | 'purple' | 'green';
  className?: string;
}

/**
 * HighlightText Component
 *
 * Creates highlighted text without brackets.
 *
 * @example
 * <HighlightText color="cyan">Trading</HighlightText>
 */
export const HighlightText: React.FC<HighlightTextProps> = ({
  children,
  color = 'cyan',
  className,
}) => {
  const colorClasses = {
    cyan: 'text-cyan-400',
    neon: 'text-lime-400',
    coral: 'text-orange-400',
    brand: 'text-blue-400',
    accent: 'text-purple-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
  };

  return (
    <span className={cn('font-bold', colorClasses[color], className)}>
      {children}
    </span>
  );
};
