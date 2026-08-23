import type { Post } from './types';

const SEEN_KEY = 'ko-community-seen';

export interface CommunityActivity {
  newestAt: string;
  total: number;
}

export function communityActivityOf(posts: Post[]): CommunityActivity {
  return {
    newestAt: posts[0]?.createdAt ?? '',
    total: posts.reduce((sum, post) => sum + post._count.comments + post._count.reactions, 0),
  };
}

export function readCommunitySeen(): CommunityActivity | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as CommunityActivity) : null;
  } catch {
    return null;
  }
}

export function markCommunitySeen(activity: CommunityActivity): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(activity));
  } catch {
    return;
  }
}

export function hasNewCommunityActivity(current: CommunityActivity, seen: CommunityActivity): boolean {
  return current.newestAt > seen.newestAt || current.total > seen.total;
}
