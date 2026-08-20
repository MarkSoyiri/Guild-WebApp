import { cn } from '../../lib/cn';

interface AvatarProps {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: number;
  className?: string;
}

export function Avatar({ src, name, size = 40, className }: AvatarProps) {
  const initials = (name ?? '')
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-elevated font-display font-semibold text-muted ring-1 ring-border', className)}
      style={{ width: size, height: size, fontSize: Math.max(size * 0.38, 10) }}
      aria-hidden
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : initials}
    </span>
  );
}