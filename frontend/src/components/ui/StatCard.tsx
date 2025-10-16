import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface StatCardProps {
  value: string;
  label: string;
  color?: 'cyan' | 'neon' | 'coral' | 'brand' | 'accent';
  className?: string;
  delay?: number;
}

/**
 * StatCard Component
 *
 * Displays large, colorful statistics inspired by OpenAI DevDay design.
 *
 * @example
 * <StatCard
 *   value="103+"
 *   label="Exchanges"
 *   color="cyan"
 * />
 */
export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  color = 'cyan',
  className,
  delay = 0,
}) => {
  const colorClasses = {
    cyan: 'text-cyan-400',
    neon: 'text-neon-500',
    coral: 'text-coral-400',
    brand: 'text-brand-400',
    accent: 'text-accent-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className={cn('text-center', className)}
    >
      <div className={cn('text-6xl md:text-7xl lg:text-8xl font-bold mb-2', colorClasses[color])}>
        {value}
      </div>
      <div className="text-lg md:text-xl text-gray-300 font-medium">
        {label}
      </div>
    </motion.div>
  );
};

interface StatsGridProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * StatsGrid Component
 *
 * Container for StatCard components with responsive grid layout.
 */
export const StatsGrid: React.FC<StatsGridProps> = ({ children, className }) => {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12', className)}>
      {children}
    </div>
  );
};
