import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
  index?: number;
  children: ReactNode;
}

export function Reveal({ index = 0, children }: RevealProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut', delay: Math.min(index * 0.06, 0.45) }}
    >
      {children}
    </motion.div>
  );
}
