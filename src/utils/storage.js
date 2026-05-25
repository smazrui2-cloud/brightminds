// localStorage wrapper for the profile snapshot.
const KEY = 'brightminds.profile.v1';

const DEFAULT_PROFILE = {
  language: 'ar',
  childName: '',
  childAge: 7,
  teacherVoice: null,
  soundEnabled: true,
  profile: {
    totalStars: 0,
    sessionsPlayed: 0,
    bestScore: 0,
    streak: 1,
    lastPlayedISO: null,
    badges: [],
    mastery: {},
    totalPlaySeconds: 0,
    wordsLearned: {},
    lettersLearned: {},
    perSubject: {},
    devMode: false,
  },
};

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const data = JSON.parse(raw);
    return {
      ...DEFAULT_PROFILE, ...data,
      profile: { ...DEFAULT_PROFILE.profile, ...(data.profile || {}) },
    };
  } catch (e) {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
}

export function recordPlaySeconds(seconds) {
  const p = loadProfile();
  p.profile.totalPlaySeconds = (p.profile.totalPlaySeconds || 0) + seconds;
  saveProfile(p);
}

export function recordWord(word) {
  const p = loadProfile();
  p.profile.wordsLearned[word] = (p.profile.wordsLearned[word] || 0) + 1;
  saveProfile(p);
}

export function recordLetter(letter) {
  const p = loadProfile();
  p.profile.lettersLearned[letter] = (p.profile.lettersLearned[letter] || 0) + 1;
  saveProfile(p);
}
