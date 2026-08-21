import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface HudSweepProps {
  className?: string;
  delay?: number;
  duration?: number;
  interval?: number;
}

export function HudSweep({ className, delay = 0.3, duration = 0.6, interval }: HudSweepProps) {
  const reducedMotion = useReducedMotion();
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <motion.div
        className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent"
        initial={reducedMotion ? false : { top: '-4%', opacity: 0 }}
        animate={{ top: '104%', opacity: [0, 1, 1, 0] }}
        transition={{
          delay,
          duration,
          ease: 'easeInOut',
          ...(interval !== undefined && !reducedMotion
            ? { repeat: Infinity, repeatDelay: interval, repeatType: 'loop' as const }
            : {}),
        }}
      />
    </div>
  );
}