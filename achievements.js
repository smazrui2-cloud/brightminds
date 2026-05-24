// ════════════════════════════════════════════════════════════
// ACHIEVEMENTS — Badge definitions + unlock checking
// Each badge has: id, emoji, title key, desc key, check(profile, session)
// `check` returns true when the badge should be unlocked.
// ════════════════════════════════════════════════════════════

const BADGES = [
  {
    id: 'first_exercise',
    emoji: '🎯',
    rarity: 'common',
    check: (p, s) => (s?.correctCount || 0) >= 1 || (p.totalStars || 0) >= 3,
  },
  {
    id: 'first_session',
    emoji: '🐉',
    rarity: 'common',
    check: (p, s) => (p.sessionsPlayed || 0) >= 1 && (s?.correctCount || 0) >= s?.total,
  },
  {
    id: 'perfect_session',
    emoji: '🏆',
    rarity: 'rare',
    check: (p, s) => s && s.correctCount === s.total && s.total >= 5,
  },
  {
    id: 'shining_star',
    emoji: '⭐',
    rarity: 'common',
    check: (p) => (p.totalStars || 0) >= 50,
  },
  {
    id: 'glowing_star',
    emoji: '🌟',
    rarity: 'rare',
    check: (p) => (p.totalStars || 0) >= 100,
  },
  {
    id: 'super_star',
    emoji: '✨',
    rarity: 'epic',
    check: (p) => (p.totalStars || 0) >= 250,
  },
  {
    id: 'streak_3',
    emoji: '🔥',
    rarity: 'common',
    check: (p) => (p.streak || 0) >= 3,
  },
  {
    id: 'streak_7',
    emoji: '⚡',
    rarity: 'rare',
    check: (p) => (p.streak || 0) >= 7,
  },
  {
    id: 'streak_30',
    emoji: '💎',
    rarity: 'legendary',
    check: (p) => (p.streak || 0) >= 30,
  },
  {
    id: 'master_5',
    emoji: '🎓',
    rarity: 'rare',
    check: (p) => {
      const m = p.mastery || {};
      let mastered = 0;
      for (const k in m) {
        const t = m[k];
        if (t.tries >= 3 && t.wins / t.tries >= 0.8) mastered++;
      }
      return mastered >= 5;
    },
  },
  {
    id: 'active_player',
    emoji: '🚀',
    rarity: 'rare',
    check: (p) => (p.sessionsPlayed || 0) >= 10,
  },
  {
    id: 'dragon_slayer',
    emoji: '⚔️',
    rarity: 'epic',
    check: (p) => (p.sessionsPlayed || 0) >= 25,
  },
];

const RARITY_COLOR = {
  common:    { bg: '#34D399', glow: 'rgba(52,211,153,0.45)' },
  rare:      { bg: '#22D3EE', glow: 'rgba(34,211,238,0.5)' },
  epic:      { bg: '#A855F7', glow: 'rgba(168,85,247,0.55)' },
  legendary: { bg: '#FBBF24', glow: 'rgba(251,191,36,0.6)' },
};

// Returns array of badge IDs newly unlocked (not previously in profile.badges)
function checkAchievements(profile, session) {
  const owned = new Set(profile.badges || []);
  const newly = [];
  for (const b of BADGES) {
    if (owned.has(b.id)) continue;
    try {
      if (b.check(profile, session)) newly.push(b.id);
    } catch (e) { /* skip on errors */ }
  }
  return newly;
}

function getBadgeById(id) {
  return BADGES.find(b => b.id === id);
}
