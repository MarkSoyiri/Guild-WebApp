import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const fieldBase =
  'w-full h-11 rounded-lg bg-bg-2 border border-border px-3 text-[15px] text-text placeholder:text-faint ' +
  'focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/25 transition-colors duration-150';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'h-auto min-h-[96px] py-2.5 leading-relaxed', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, 'appearance-none pr-8 bg-no-repeat bg-[right_12px_center]', className)} {...rest}>
      {children}
    </select>
  );
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
        {label}
      </label>
      {children}
      {error ? <p className="text-[12px] text-danger">{error}</p> : hint ? <p className="text-[12px] text-muted">{hint}</p> : null}
    </div>
  );
}