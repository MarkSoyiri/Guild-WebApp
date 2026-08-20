import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'absolute bg-surface border border-border flex flex-col',
              'rounded-t-xl max-h-[85vh] w-full bottom-0 inset-x-0',
              'min-[1024px]:clip-notch min-[1024px]:rounded-none min-[1024px]:max-w-[480px] min-[1024px]:inset-x-auto min-[1024px]:left-1/2 min-[1024px]:-translate-x-1/2 min-[1024px]:top-1/2 min-[1024px]:-translate-y-1/2 min-[1024px]:bottom-auto',
            )}
            initial={reducedMotion ? { opacity: 0 } : { y: 40, opacity: 0 }}
            animate={reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { y: 40, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="h-1 w-8 rounded-full bg-border-strong mx-auto absolute left-1/2 -translate-x-1/2 top-1.5 sm:hidden" aria-hidden />
              <h2 className="font-display text-[17px] font-bold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-muted hover:bg-elevated hover:text-text transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="hud-divider mx-4" aria-hidden />
            <div className="overflow-y-auto px-4 pb-6 pt-3 safe-b">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}