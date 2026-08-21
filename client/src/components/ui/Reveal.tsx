import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface RevealProps {
  index?: number;
  className?: string;
  children: ReactNode;
}

export function Reveal({ index = 0, className, children }: RevealProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className={cn(className)}
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut', delay: Math.min(index * 0.06, 0.45) }}
    >
      {children}
    </motion.div>
  );
}
