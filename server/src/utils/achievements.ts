export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  requirementType:
    | 'WINS'
    | 'KILLS'
    | 'HEADSHOTS'
    | 'MVPS'
    | 'CLUTCH_WINS'
    | 'KD'
    | 'MATCHES'
    | 'MOST_KILLS'
    | 'LOYALTY_DAYS'
    | 'POSTS'
    | 'TEAMS'
    | 'TOURNAMENT_WINS'
    | 'XP';
  requirementValue: number;
  rewardXp: number;
  order: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: 'first-win',
    name: 'First Blood',
    description: 'Win your first match with the guild.',
    icon: 'Swords',
    rarity: 'COMMON',
    requirementType: 'WINS',
    requirementValue: 1,
    rewardXp: 50,
    order: 1,
  },
  {
    key: 'rampage',
    name: 'Rampage',
    description: 'Drop 10+ kills in a single match.',
    icon: 'Flame',
    rarity: 'RARE',
    requirementType: 'MOST_KILLS',
    requirementValue: 10,
    rewardXp: 150,
    order: 2,
  },
  {
    key: 'sharpshooter',
    name: 'Sharpshooter',
    description: 'Hold a lifetime K/D ratio of 2.50 or higher.',
    icon: 'Crosshair',
    rarity: 'RARE',
    requirementType: 'KD',
    requirementValue: 250,
    rewardXp: 250,
    order: 3,
  },
  {
    key: 'mvp',
    name: 'Most Valuable',
    description: 'Earn 5 MVP awards.',
    icon: 'Award',
    rarity: 'RARE',
    requirementType: 'MVPS',
    requirementValue: 5,
    rewardXp: 250,
    order: 4,
  },
  {
    key: 'clutch-god',
    name: 'Clutch God',
    description: 'Secure 10 clutch wins.',
    icon: 'Zap',
    rarity: 'LEGENDARY',
    requirementType: 'CLUTCH_WINS',
    requirementValue: 10,
    rewardXp: 1000,
    order: 5,
  },
  {
    key: 'booyah-king',
    name: 'Booyah King',
    description: 'Reach 50 lifetime wins.',
    icon: 'Crown',
    rarity: 'EPIC',
    requirementType: 'WINS',
    requirementValue: 50,
    rewardXp: 500,
    order: 6,
  },
  {
    key: 'headshot-master',
    name: 'Headshot Master',
    description: 'Land 500 headshots.',
    icon: 'Target',
    rarity: 'EPIC',
    requirementType: 'HEADSHOTS',
    requirementValue: 500,
    rewardXp: 400,
    order: 7,
  },
  {
    key: 'hundred-club',
    name: 'Hundred Club',
    description: 'Reach 100 lifetime wins.',
    icon: 'Trophy',
    rarity: 'LEGENDARY',
    requirementType: 'WINS',
    requirementValue: 100,
    rewardXp: 800,
    order: 8,
  },
  {
    key: 'unstoppable',
    name: 'Unstoppable',
    description: 'Reach 1,000 lifetime kills.',
    icon: 'Skull',
    rarity: 'LEGENDARY',
    requirementType: 'KILLS',
    requirementValue: 1000,
    rewardXp: 750,
    order: 9,
  },
  {
    key: 'veteran',
    name: 'Veteran',
    description: 'Play 500 matches in the guild.',
    icon: 'Shield',
    rarity: 'EPIC',
    requirementType: 'MATCHES',
    requirementValue: 500,
    rewardXp: 400,
    order: 10,
  },
  {
    key: 'loyal-member',
    name: 'Loyal Member',
    description: 'Stay with the guild for 6 months.',
    icon: 'Heart',
    rarity: 'RARE',
    requirementType: 'LOYALTY_DAYS',
    requirementValue: 180,
    rewardXp: 200,
    order: 11,
  },
  {
    key: 'squad-up',
    name: 'Squad Up',
    description: 'Join a permanent guild team.',
    icon: 'Users',
    rarity: 'COMMON',
    requirementType: 'TEAMS',
    requirementValue: 1,
    rewardXp: 50,
    order: 12,
  },
  {
    key: 'community-voice',
    name: 'Community Voice',
    description: 'Publish 10 posts in the guild feed.',
    icon: 'MessageSquare',
    rarity: 'COMMON',
    requirementType: 'POSTS',
    requirementValue: 10,
    rewardXp: 75,
    order: 13,
  },
  {
    key: 'tournament-champion',
    name: 'Tournament Champion',
    description: 'Win a guild tournament.',
    icon: 'Medal',
    rarity: 'EPIC',
    requirementType: 'TOURNAMENT_WINS',
    requirementValue: 1,
    rewardXp: 600,
    order: 14,
  },
];