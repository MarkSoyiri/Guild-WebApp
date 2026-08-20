import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface ProgressBarProps {
  percent: number;
  className?: string;
  complete?: boolean;
}

export function ProgressBar({ percent, className, complete = false }: ProgressBarProps) {
  const reducedMotion = useReducedMotion();
  const clamped = Math.min(Math.max(percent, 0), 100);
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-elevated', className)} role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className={cn('h-full rounded-full', complete ? 'bg-success' : 'bg-gradient-to-r from-accent to-accent-2')}
        initial={reducedMotion ? false : { width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
}