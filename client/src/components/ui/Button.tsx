import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'clip-notch-sm bg-accent text-on-accent font-bold hover:bg-accent-2 active:translate-y-px disabled:hover:bg-accent',
  secondary:
    'rounded-lg border border-border-strong text-text hover:border-accent/60 hover:text-accent active:translate-y-px disabled:hover:bg-transparent',
  ghost: 'rounded-lg text-text hover:bg-surface hover:text-accent active:translate-y-px disabled:hover:bg-transparent',
  danger: 'rounded-lg bg-danger/10 border border-danger/40 text-danger hover:bg-danger/20 active:translate-y-px',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-[12px] gap-1.5',
  md: 'h-11 px-4 text-[13px] gap-2',
  lg: 'h-12 px-5 text-[14px] gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'group relative inline-flex items-center justify-center font-semibold uppercase tracking-[0.07em] transition-colors duration-150 select-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden /> : icon}
      {variant === 'primary' && !disabled && !loading ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-[-60%] w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-500 ease-out group-hover:translate-x-[500%]"
        />
      ) : null}
      {children}
    </button>
  );
}