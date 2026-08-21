import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface HudReticleProps {
  className?: string;
  label?: string;
}

export function HudReticle({ className, label }: HudReticleProps) {
  const reducedMotion = useReducedMotion();
  const draw = reducedMotion ? false : { pathLength: 0 };
  return (
    <motion.div
      aria-hidden
      className={cn('relative', className)}
      initial={reducedMotion ? false : { opacity: 0, rotate: 45, scale: 1.15 }}
      animate={{ opacity: 1, rotate: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: 'easeOut', delay: 0.3 }}
    >
      <motion.div
        initial={reducedMotion ? false : { rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, ease: 'linear', repeat: Infinity }}
      >
        <svg viewBox="0 0 64 64" fill="none" className="h-full w-full text-muted">
          <motion.circle
            cx="32"
            cy="32"
            r="13"
            stroke="currentColor"
            strokeWidth="1"
            initial={draw}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.4 }}
          />
          <motion.circle
            cx="32"
            cy="32"
            r="20"
            stroke="currentColor"
            strokeWidth="0.5"
            initial={draw}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.52 }}
          />
          <motion.line
            x1="32"
            y1="5"
            x2="32"
            y2="11"
            stroke="currentColor"
            strokeWidth="1"
            initial={draw}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.64 }}
          />
          <motion.line
            x1="59"
            y1="32"
            x2="53"
            y2="32"
            stroke="currentColor"
            strokeWidth="1"
            initial={draw}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.7 }}
          />
          <motion.line
            x1="32"
            y1="59"
            x2="32"
            y2="53"
            stroke="currentColor"
            strokeWidth="1"
            initial={draw}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.76 }}
          />
          <motion.line
            x1="5"
            y1="32"
            x2="11"
            y2="32"
            stroke="currentColor"
            strokeWidth="1"
            initial={draw}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.82 }}
          />
          <motion.circle
            cx="32"
            cy="32"
            r="1.5"
            fill="var(--color-accent)"
            initial={reducedMotion ? false : { scale: 0 }}
            animate={{ scale: [0, 1.5, 1] }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.9 }}
          />
        </svg>
      </motion.div>
      {label ? (
        <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-accent">
          {label}
        </span>
      ) : null}
    </motion.div>
  );
}