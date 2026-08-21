import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn';

interface HudBracketsProps {
  className?: string;
  delay?: number;
}

const corners = [
  { className: 'left-0 top-0 border-l border-t', origin: 'left top' },
  { className: 'right-0 top-0 border-r border-t', origin: 'right top' },
  { className: 'bottom-0 left-0 border-b border-l', origin: 'left bottom' },
  { className: 'bottom-0 right-0 border-b border-r', origin: 'right bottom' },
];

export function HudBrackets({ className, delay = 0.25 }: HudBracketsProps) {
  const reducedMotion = useReducedMotion();
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0', className)}>
      {corners.map((corner, i) => (
        <motion.span
          key={corner.className}
          className={cn('absolute h-5 w-5 border-accent/50', corner.className)}
          style={{ transformOrigin: corner.origin }}
          initial={reducedMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: delay + i * 0.08 }}
        />
      ))}
    </div>
  );
}