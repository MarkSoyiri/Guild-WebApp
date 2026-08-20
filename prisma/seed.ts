import { PrismaClient } from '@prisma/client';
import { seedStats, MockFreeFireProvider, MOCK_STAGE_KEYS } from '../server/src/providers/freefire/mock';
import { register, requestJoinGuild } from '../server/src/services/auth.service';
import { grant } from '../server/src/services/xp.service';
import { seedUserAchievements } from '../server/src/services/achievement.service';
import { ACHIEVEMENTS } from '../server/src/utils/achievements';
import { ROLE_PERMISSIONS, guildXpForLevel } from '../server/src/utils/constants';
import { recordActivity } from '../server/src/services/activity.service';
import { createChallenge } from '../server/src/services/challenge.service';
import { createEvent } from '../server/src/services/event.service';
import { createTeam, addTeamMember } from '../server/src/services/team.service';
import {
  createTournament,
  registerTeam,
  startTournament,
  recordMatchResult,
} from '../server/src/services/tournament.service';
import { createSquadRequest, joinSquadRequest } from '../server/src/services/squad.service';
import { createAnnouncement } from '../server/src/services/announcement.service';
import { createPost, createComment, toggleReaction } from '../server/src/services/community.service';
import { captureSnapshots } from '../server/src/services/leaderboard.service';

const prisma = new PrismaClient();
const provider = new MockFreeFireProvider();
const LAST_STAGE = MOCK_STAGE_KEYS[MOCK_STAGE_KEYS.length - 1] as string;
const DAY = 24 * 60 * 60 * 1000;
const REGION = 'MENA';

interface RosterEntry {
  name: string;
  playerRole: string;
  role?: string;
  guildRole?: string;
  email?: string;
  password?: string;
}

const ROSTER: RosterEntry[] = [
  { name: 'ShadowX', playerRole: 'IGL', role: 'SUPER_ADMIN', guildRole: 'LEADER' },
  { name: 'Viper', playerRole: 'RUSHER', role: 'MODERATOR', guildRole: 'OFFICER' },
  { name: 'Blaze', playerRole: 'RUSHER', guildRole: 'OFFICER' },
  { name: 'Ghost', playerRole: 'SNIPER' },
  { name: 'DarkSoul', playerRole: 'IGL', guildRole: 'OFFICER' },
  { name: 'Raven', playerRole: 'SUPPORT' },
  { name: 'Ace', playerRole: 'ENTRY' },
  { name: 'Nova', playerRole: 'RUSHER' },
  { name: 'FrostByte', playerRole: 'SNIPER' },
  { name: 'Reaper', playerRole: 'RUSHER' },
  { name: 'Siren', playerRole: 'SUPPORT' },
  { name: 'Titan', playerRole: 'ENTRY' },
  { name: 'Echo', playerRole: 'SUPPORT', guildRole: 'TRIAL' },
  { name: 'Volt', playerRole: 'ENTRY', guildRole: 'TRIAL' },
];

const UNLOCK_POOL = [
  'rampage',
  'mvp',
  'booyah-king',
  'headshot-master',
  'veteran',
  'loyal-member',
  'sharpshooter',
  'community-voice',
];

const EXTRA_UNLOCKS = [8, 6, 5, 5, 4, 4, 3, 3, 3, 2, 2, 2, 1, 1];

function emailFor(name: string, index: number): string {
  if (name === 'ShadowX') return process.env.DEMO_ADMIN_EMAIL ?? 'admin@kingsonly.gg';
  if (name === 'Nova') return process.env.DEMO_MEMBER_EMAIL ?? 'nova@kingsonly.gg';
  return `${name.toLowerCase()}@kingsonly.gg`;
}

function passwordFor(entry: RosterEntry): string {
  if (entry.name === 'ShadowX') return process.env.DEMO_ADMIN_PASSWORD ?? 'KingsAdmin!2026';
  if (entry.name === 'Nova') return process.env.DEMO_MEMBER_PASSWORD ?? 'Nova!2026';
  return `${entry.name}!2026`;
}

function joinedAtFor(index: number): Date {
  const monthsAgo = index === 0 ? 18 : index <= 3 ? 14 - index : index <= 11 ? 10 - index / 2 : 1.5;
  return new Date(Date.now() - monthsAgo * 30.4 * DAY);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

async function main(): Promise<void> {
  const guild = await prisma.guild.findFirst();
  if (guild) {
    const seededEmails = ROSTER.map((entry, index) => emailFor(entry.name, index)).concat([
      'outsider@kingsonly.gg',
      'recruit@kingsonly.gg',
    ]);
    await prisma.event.deleteMany();
    await prisma.post.deleteMany();
    await prisma.announcement.deleteMany();
    await prisma.guild.delete({ where: { id: guild.id } });
    await prisma.user.deleteMany({ where: { email: { in: seededEmails } } });
    console.log('Removed previous seed data');
  }

  const created = await prisma.guild.create({
    data: {
      name: 'KINGS ONLY',
      tag: 'KO',
      region: REGION,
      description: 'A competitive Free Fire guild from MENA. No weak links. Only kings.',
      motto: 'RISE. CONQUER. REPEAT.',
      foundedAt: new Date(Date.now() - 3 * 365 * DAY),
    },
  });
  console.log(`Guild created: ${created.name}`);

  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    await prisma.guildRole.upsert({
      where: { name: roleName },
      create: {
        name: roleName,
        permissions: JSON.stringify(ROLE_PERMISSIONS[roleName] as string[]),
        description: null,
      },
      update: {},
    });
  }

  for (const [order, def] of ACHIEVEMENTS.entries()) {
    await prisma.achievement.upsert({
      where: { key: def.key },
      create: { ...def, order: order + 1 },
      update: { name: def.name, icon: def.icon, order: order + 1 },
    });
  }

  const season = await prisma.season.create({
    data: {
      guildId: created.id,
      number: 4,
      name: 'SEASON 04 — CONQUEST',
      startsAt: new Date(Date.now() - 23 * DAY),
      endsAt: new Date(Date.now() + 23 * DAY),
      status: 'ACTIVE',
    },
  });
  await recordActivity({
    guildId: created.id,
    type: 'SEASON_START',
    message: `Season 04 started: ${season.name}`,
  });

  const members: { id: string; name: string; rank: string; rankPoints: number; weeklyKills: number }[] = [];

  for (const [index, entry] of ROSTER.entries()) {
    const email = emailFor(entry.name, index);
    const password = passwordFor(entry);
    const { user } = await register({
      username: entry.name.toLowerCase(),
      email,
      password,
      displayName: entry.name,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { role: entry.role ?? 'MEMBER' },
    });
    await prisma.guildMembership.create({
      data: {
        guildId: created.id,
        userId: user.id,
        guildRole: entry.guildRole ?? 'MEMBER',
        joinedAt: joinedAtFor(index),
      },
    });

    const uid = `${1700000000 + index}`;
    const seed = seedStats(uid, REGION, LAST_STAGE);
    const profile = await prisma.playerProfile.update({
      where: { userId: user.id },
      data: {
        ffUid: uid,
        ffNickname: seed.nickname,
        region: REGION,
        playerRole: entry.playerRole,
        rank: seed.rank.tier,
        rankPoints: seed.rank.points,
        level: seed.level,
        lastSyncAt: new Date(),
        lastSyncProvider: 'mock',
      },
    });
    await prisma.freeFireStats.create({
      data: {
        playerId: profile.id,
        kills: seed.lifetime.kills,
        deaths: seed.lifetime.deaths,
        matches: seed.lifetime.matches,
        wins: seed.lifetime.wins,
        headshots: seed.lifetime.headshots,
        mvps: seed.lifetime.mvps,
        clutchWins: seed.lifetime.clutchWins,
        top10s: seed.lifetime.top10s,
        mostKillsInMatch: seed.lifetime.mostKillsInMatch,
        totalXP: seed.lifetime.totalXP,
        kdRatio: round1(seed.lifetime.kills / Math.max(seed.lifetime.deaths, 1)),
        winRate: round1(seed.lifetime.wins / Math.max(seed.lifetime.matches, 1)),
        weeklyKills: seed.weekly.kills,
        weeklyWins: seed.weekly.wins,
        weeklyMatches: seed.weekly.matches,
        weeklyHeadshots: seed.weekly.headshots,
        weeklyMvps: seed.weekly.mvps,
        weeklyDeaths: seed.weekly.deaths,
        monthlyKills: seed.monthly.kills,
        monthlyWins: seed.monthly.wins,
        monthlyMatches: seed.monthly.matches,
        monthlyHeadshots: seed.monthly.headshots,
        monthlyMvps: seed.monthly.mvps,
        monthlyDeaths: seed.monthly.deaths,
      },
    });
    const matches = await provider.getMatchHistory(uid, REGION, 15);
    await prisma.freeFireMatch.createMany({
      data: matches.map((m) => ({ playerId: profile.id, ...m })),
    });

    const unlocked = ['first-win', 'squad-up', ...UNLOCK_POOL.slice(0, EXTRA_UNLOCKS[index] as number)];
    await seedUserAchievements(user.id, unlocked);
    await grant({
      userId: user.id,
      amount: unlocked.length * 50,
      reason: 'ACHIEVEMENT',
      detail: 'Seed onboarding',
    });
    const baseXp = entry.guildRole === 'LEADER' ? 5000 : entry.guildRole === 'OFFICER' ? 3200 : 1900 + ((index * 137) % 700);
    await grant({ userId: user.id, amount: baseXp, reason: 'SYNC', detail: 'Season 04 onboarding' });

    members.push({
      id: user.id,
      name: entry.name,
      rank: seed.rank.tier,
      rankPoints: seed.rank.points,
      weeklyKills: seed.weekly.kills,
    });
    console.log(`Seeded ${entry.name} (${email}) · ${seed.rank.tier} · ${seed.lifetime.kills} kills`);
  }

  const leaderId = members[0]?.id as string;
  const byName = new Map(members.map((m) => [m.name, m]));

  const teamDefs = [
    { name: 'TEAM ALPHA', tag: 'ALPHA', captain: 'ShadowX', players: ['Viper', 'Blaze', 'Ghost'] },
    { name: 'TEAM VENOM', tag: 'VENOM', captain: 'DarkSoul', players: ['Raven', 'Ace', 'Nova'] },
    { name: 'TEAM TITAN', tag: 'TITAN', captain: 'FrostByte', players: ['Reaper', 'Siren', 'Titan'] },
    { name: 'TEAM SPARTAN', tag: 'SPARTAN', captain: 'Echo', players: ['Volt'] },
  ];
  const teams: { id: string; name: string }[] = [];
  for (const def of teamDefs) {
    const captain = byName.get(def.captain);
    if (!captain) continue;
    const team = await createTeam({
      name: def.name,
      tag: def.tag,
      description: `${def.captain}'s squad — scrims every Tuesday and Friday.`,
      captainId: captain.id,
    });
    for (const playerName of def.players) {
      const player = byName.get(playerName);
      if (player) await addTeamMember(team.id, player.id);
    }
    teams.push({ id: team.id, name: team.name });
  }

  const tournament = await createTournament({
    name: 'KINGS ONLY SUMMER CUP',
    description: 'Guild-wide single elimination. Winner takes the bragging rights and the XP.',
    size: 4,
    startsAt: new Date(Date.now() - 5 * DAY),
    endsAt: new Date(Date.now() + 3 * DAY),
    prize: '+500 XP · KINGS ONLY CHAMPIONS title',
    createdBy: leaderId,
  });
  for (const team of teams) {
    await registerTeam(tournament.id, team.id);
  }
  await startTournament(tournament.id);
  const semiMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId: tournament.id, round: 2 },
    orderBy: { position: 'asc' },
  });
  for (const [index, match] of semiMatches.entries()) {
    const teamA = await prisma.team.findUnique({ where: { id: match.teamAId as string } });
    const membersOfA = await prisma.teamMember.findMany({ where: { teamId: match.teamAId as string } });
    const mvpId = membersOfA[0]?.userId ?? leaderId;
    await recordMatchResult(match.id, {
      scoreA: 100 - index * 25,
      scoreB: 40 + index * 30,
      mvpId,
    });
    console.log(`Semi ${index + 1}: ${teamA?.name ?? '?'} advanced`);
  }
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: 'ACTIVE' },
  });

  const activeChallenge = await createChallenge({
    title: '100 KILLS WEEKEND',
    description: 'Together we drop 1,000 kills before Monday. Every squad counts.',
    metric: 'KILLS',
    goal: 1000,
    rewardXp: 250,
    startsAt: new Date(Date.now() - 4 * DAY),
    endsAt: new Date(Date.now() + 2 * DAY),
    createdBy: leaderId,
  });
  await prisma.challengeProgress.createMany({
    data: members.map((m) => ({
      challengeId: activeChallenge.id,
      userId: m.id,
      progress: Math.min(m.weeklyKills, 120),
    })),
  });
  const completedChallenge = await prisma.challenge.create({
    data: {
      guildId: created.id,
      title: 'SEASON OPENER — 25 WINS',
      description: 'Kick off Season 04 with 25 squad wins.',
      metric: 'WINS',
      goal: 25,
      rewardXp: 100,
      status: 'COMPLETED',
      startsAt: new Date(Date.now() - 22 * DAY),
      endsAt: new Date(Date.now() - 15 * DAY),
      completedAt: new Date(Date.now() - 15 * DAY),
      createdBy: leaderId,
    },
  });
  await prisma.challengeProgress.createMany({
    data: members.slice(0, 10).map((m) => ({
      challengeId: completedChallenge.id,
      userId: m.id,
      progress: 3 + ((m.weeklyKills % 4) as number),
    })),
  });

  const events = [
    {
      title: 'FRIDAY CUSTOM ROOM — BERMUDA',
      description: 'Full custom room on Bermuda. 48 slots, squad-only. Bring your A game.',
      type: 'CUSTOM_ROOM',
      mode: 'BR_CLASSIC',
      startsAt: new Date(Date.now() + 2 * DAY),
      endsAt: new Date(Date.now() + 2 * DAY + 3 * 60 * 60 * 1000),
      maxParticipants: 48,
    },
    {
      title: 'WARMUP SCRIMS',
      description: 'Ranked warmup before the weekend grind.',
      type: 'PRACTICE',
      mode: 'BR_RANKED',
      startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      maxParticipants: 16,
    },
    {
      title: 'MONTHLY GUILD MEETING',
      description: 'Season 04 goals, team rosters and the Summer Cup bracket.',
      type: 'MEETING',
      startsAt: new Date(Date.now() - 7 * DAY),
      endsAt: new Date(Date.now() - 7 * DAY + 60 * 60 * 1000),
    },
  ];
  for (const [index, def] of events.entries()) {
    const event = await createEvent({ ...def, organizerId: leaderId });
    const participantCount = [12, 8, 0][index] as number;
    if (participantCount > 0) {
      await prisma.eventParticipant.createMany({
        data: members.slice(0, participantCount).map((m) => ({ eventId: event.id, userId: m.id })),
      });
    }
    if (index === 2) {
      await prisma.event.update({ where: { id: event.id }, data: { status: 'COMPLETED' } });
    }
  }

  await createAnnouncement({
    title: 'SUMMER CUP SEMIFINALS DONE — FINAL ON SUNDAY',
    content:
      'TEAM ALPHA and TEAM TITAN take the final. Full bracket on the Tournaments page. Final starts 20:00 MENA — be there.',
    priority: 'HIGH',
    pinned: true,
    expiresAt: new Date(Date.now() + 7 * DAY),
    authorId: leaderId,
    publish: true,
  });
  await createAnnouncement({
    title: 'RULES OF ENGAGEMENT',
    content:
      'Respect teammates. No team-killing, no griefing, no drama in the feed. Toxicity gets you a trial and a talk — repeat offenders get removed.',
    priority: 'NORMAL',
    pinned: false,
    authorId: leaderId,
    publish: true,
  });

  const postDefs = [
    {
      author: 'ShadowX',
      type: 'TOURNAMENT_RESULT',
      content:
        'Semi results are in — TEAM ALPHA and TEAM TITAN face off in the Summer Cup final on Sunday 20:00 MENA. GGs to TEAM VENOM and TEAM SPARTAN for an incredible run.',
      referenceId: tournament.id,
    },
    {
      author: 'Viper',
      type: 'ACHIEVEMENT',
      content: 'Just unlocked Headshot Master. 500 and counting — the crosshair stays blessed.',
    },
    {
      author: 'Raven',
      type: 'TEXT',
      content: 'Need 2 for ranked clash squad tonight at 22:00 MENA. Mic required, DM me.',
    },
  ];
  const posts: { id: string }[] = [];
  for (const def of postDefs) {
    const author = byName.get(def.author);
    if (!author) continue;
    const post = await createPost({
      authorId: author.id,
      type: def.type as 'TEXT',
      content: def.content,
      referenceId: def.referenceId,
    });
    posts.push({ id: post.id });
    console.log(`Post by ${def.author}: ${def.content.slice(0, 48)}…`);
  }
  if (posts[0]) {
    const commenterA = byName.get('Blaze');
    const commenterB = byName.get('Nova');
    if (commenterA) await createComment({ postId: posts[0].id, authorId: commenterA.id, content: 'Let the best squad win. 🔥' });
    if (commenterB) await createComment({ postId: posts[0].id, authorId: commenterB.id, content: 'TITAN taking this home, calling it now.' });
    for (const [index, member] of members.entries()) {
      if (index % 3 === 0) await toggleReaction(posts[0].id, member.id, 'BOOYAH');
      if (index % 3 === 1) await toggleReaction(posts[0].id, member.id, 'FIRE');
    }
  }

  const ace = byName.get('Ace');
  const siren = byName.get('Siren');
  if (ace) {
    const request = await createSquadRequest({
      userId: ace.id,
      role: 'RUSHER',
      rank: ace.rank,
      mic: true,
      playersNeeded: 2,
      note: 'Ranked push to Heroic. Fast comms, clean rotations.',
    });
    const reaper = byName.get('Reaper');
    if (reaper) await joinSquadRequest(request.id, reaper.id);
  }
  if (siren) {
    await createSquadRequest({
      userId: siren.id,
      role: 'SUPPORT',
      rank: siren.rank,
      mic: true,
      playersNeeded: 1,
      note: 'Looking for an IGL for duo rank push.',
    });
  }

  const outsider = await register({
    username: 'outsider',
    email: 'outsider@kingsonly.gg',
    password: 'Outsider!2026',
    displayName: 'Outsider',
  });
  await requestJoinGuild(outsider.user.id, '2,400+ hours. Was ranked Heroic in S2. Looking for a serious home.');
  const recruit = await register({
    username: 'recruit',
    email: 'recruit@kingsonly.gg',
    password: 'Recruit!2026',
    displayName: 'Recruit',
  });
  await prisma.playerProfile.update({
    where: { userId: recruit.user.id },
    data: { ffUid: '2099999999', ffNickname: 'KO_recruit', region: REGION, rank: 'GOLD', rankPoints: 940, level: 41 },
  });

  await prisma.syncLog.createMany({
    data: [
      { provider: 'mock', status: 'SUCCESS', triggeredBy: 'SCHEDULED', message: 'Rotational sync completed for 14 players', durationMs: 1840 },
      { provider: 'mock', status: 'SUCCESS', triggeredBy: 'SCHEDULED', message: 'Rotational sync completed for 14 players', durationMs: 1710 },
      { provider: 'mock', status: 'FAILED', triggeredBy: 'SCHEDULED', message: 'Provider timeout on player retry', durationMs: 3100 },
    ],
  });

  await prisma.guild.update({
    where: { id: created.id },
    data: { xp: guildXpForLevel(12) + 350, level: 12 },
  });
  await recordActivity({
    guildId: created.id,
    actorId: leaderId,
    type: 'GUILD_LEVEL',
    message: 'KINGS ONLY reached level 12',
  });
  await prisma.notification.createMany({
    data: members.map((m) => ({
      userId: m.id,
      type: 'GUILD',
      title: 'Welcome to KINGS ONLY',
      body: 'The guild is live. Sync your stats, join a team, start climbing.',
      link: '/app',
    })),
  });

  await captureSnapshots(season.id);

  console.log('\nSeed complete.');
  console.log('Demo accounts:');
  console.log(`  Admin:  ${process.env.DEMO_ADMIN_EMAIL ?? 'admin@kingsonly.gg'} / ${process.env.DEMO_ADMIN_PASSWORD ?? 'KingsAdmin!2026'}`);
  console.log(`  Member: ${process.env.DEMO_MEMBER_EMAIL ?? 'nova@kingsonly.gg'} / ${process.env.DEMO_MEMBER_PASSWORD ?? 'Nova!2026'}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });