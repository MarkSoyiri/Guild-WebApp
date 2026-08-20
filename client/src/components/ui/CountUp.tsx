import { useEffect, useRef } from 'react';
import { motion, useInView, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { cn } from '../../lib/cn';

interface CountUpProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
}

export function CountUp({ value, format = String, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reducedMotion = useReducedMotion();
  const spring = useSpring(0, { duration: 900, bounce: 0 });
  const display = useTransform(spring, (current) => format(Math.round(current)));

  useEffect(() => {
    if (inView) spring.jump(0);
  }, [inView, spring]);

  useEffect(() => {
    if (!inView) return;
    spring.set(value);
  }, [inView, value, spring]);

  return (
    <motion.span ref={ref} className={cn('tabular-nums', className)}>
      {reducedMotion ? format(value) : display}
    </motion.span>
  );
}