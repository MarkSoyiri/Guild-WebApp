import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { POLL } from '../../lib/constants';
import { Button } from './Button';

export function UpdateBanner() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    let cancelled = false;
    let registration: ServiceWorkerRegistration | null = null;

    const sync = () => {
      if (!cancelled && registration?.waiting && navigator.serviceWorker.controller) {
        setWaiting(registration.waiting);
      }
    };

    const watch = (reg: ServiceWorkerRegistration) => {
      registration = reg;
      sync();
      reg.addEventListener('updatefound', () => {
        reg.installing?.addEventListener('statechange', sync);
      });
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg && !cancelled) {
        watch(reg);
        void reg.update();
      }
    });

    const interval = window.setInterval(() => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && !cancelled) {
          watch(reg);
          void reg.update();
        }
      });
    }, POLL.updateCheck);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const applyUpdate = () => {
    if (!waiting) return;
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => window.location.reload(),
      { once: true },
    );
    waiting.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <AnimatePresence>
      {waiting && !dismissed ? (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-x-3 bottom-3 z-50 sm:left-auto sm:w-[380px]"
          role="status"
        >
          <div className="corner-brackets relative flex items-center gap-3 rounded-xl border border-accent/40 bg-panel p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent">
              <RefreshCw size={15} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-text">New build deployed</p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted">Refresh to run the latest version.</p>
            </div>
            <Button size="sm" onClick={applyUpdate}>
              Update
            </Button>
            <button
              type="button"
              aria-label="Dismiss update notice"
              onClick={() => setDismissed(true)}
              className="shrink-0 rounded-md p-1 text-faint transition-colors hover:text-text"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
