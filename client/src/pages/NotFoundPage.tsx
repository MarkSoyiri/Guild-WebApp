import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Crosshair, Home, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 text-center">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(600px_320px_at_50%_38%,black,transparent)]" aria-hidden />
      <div className="corner-brackets pointer-events-none absolute inset-4 rounded-xl sm:inset-8" aria-hidden />
      <motion.div
        className="relative flex flex-col items-center"
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <div className="corner-brackets mb-6 flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-surface text-accent" aria-hidden>
          <Crosshair size={28} strokeWidth={1.75} />
        </div>
        <p className="font-mono text-[64px] font-bold leading-none tracking-[-0.04em] text-accent sm:text-[96px]">404</p>
        <h1 className="mt-3 font-display text-[26px] font-bold tracking-[-0.02em] text-text sm:text-[34px]">
          You got flanked.
        </h1>
        <p className="mt-3 max-w-[340px] text-[14px] leading-relaxed text-muted">
          This zone isn't on the map — the page was moved, or never dropped here. Regroup and head back to base.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/app">
            <Button size="lg" icon={<Home size={16} />}>
              Return to base
            </Button>
          </Link>
          <Link to="/app/search">
            <Button size="lg" variant="secondary" icon={<Search size={16} />}>
              Search the guild
            </Button>
          </Link>
        </div>
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Kings Only · lost transmission</p>
      </motion.div>
    </div>
  );
}
