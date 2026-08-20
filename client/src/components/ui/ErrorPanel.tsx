import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorPanelProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorPanel({ message = 'Something went wrong while loading this.', onRetry }: ErrorPanelProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-8 text-center">
      <AlertTriangle size={22} className="text-danger" aria-hidden />
      <p className="max-w-[320px] text-[15px] text-text">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}