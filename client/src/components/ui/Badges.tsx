import { cn } from '../../lib/cn';
import { GUILD_ROLE_LABELS, PLAYER_ROLE_LABELS, RANK_LABELS, RARITY_LABELS, type AchievementRarity, type Rank } from '../../lib/constants';

const RANK_STYLES: Record<string, string> = {
  BRONZE: 'border-rank-bronze/30 bg-rank-bronze/10 text-rank-bronze',
  SILVER: 'border-rank-silver/30 bg-rank-silver/10 text-rank-silver',
  GOLD: 'border-rank-gold/30 bg-rank-gold/10 text-rank-gold',
  PLATINUM: 'border-rank-platinum/30 bg-rank-platinum/10 text-rank-platinum',
  DIAMOND: 'border-rank-diamond/30 bg-rank-diamond/10 text-rank-diamond',
  HEROIC: 'border-rank-heroic/30 bg-rank-heroic/10 text-rank-heroic',
  GRANDMASTER: 'border-rank-grandmaster/30 bg-rank-grandmaster/10 text-rank-grandmaster',
};

export function RankBadge({ rank, className }: { rank: Rank | string; className?: string }) {
  const isElite = rank === 'HEROIC' || rank === 'GRANDMASTER';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wide',
        RANK_STYLES[rank] ?? 'border-border bg-elevated text-text',
        isElite && 'border-l-2 border-l-accent',
        className,
      )}
    >
      <span className="h-1 w-1 rotate-45 bg-current" aria-hidden />
      {RANK_LABELS[rank as Rank] ?? rank}
    </span>
  );
}

export function RoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-lg border border-border px-2 py-1 text-[11px] uppercase tracking-wide text-muted', className)}>
      {PLAYER_ROLE_LABELS[role] ?? role}
    </span>
  );
}

export function GuildRoleBadge({ role, className }: { role: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-lg border border-border px-2 py-1 text-[11px] uppercase tracking-wide text-muted', className)}>
      {GUILD_ROLE_LABELS[role] ?? role}
    </span>
  );
}

const RARITY_STYLES: Record<string, string> = {
  COMMON: 'border-rarity-common/30 bg-rarity-common/10 text-rarity-common',
  RARE: 'border-rarity-rare/30 bg-rarity-rare/10 text-rarity-rare',
  EPIC: 'border-rarity-epic/30 bg-rarity-epic/10 text-rarity-epic',
  LEGENDARY: 'border-rarity-legendary/30 bg-rarity-legendary/10 text-rarity-legendary',
};

export function RarityBadge({ rarity, className }: { rarity: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wide',
        RARITY_STYLES[rarity] ?? 'border-border bg-elevated text-muted',
        className,
      )}
    >
      {RARITY_LABELS[rarity as AchievementRarity] ?? rarity}
    </span>
  );
}

export function StatusDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <span className={cn('inline-block h-1.5 w-1.5 rounded-full', online ? 'bg-success' : 'bg-faint', className)} aria-hidden />
  );
}