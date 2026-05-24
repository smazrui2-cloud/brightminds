// ════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════
const SESSION_LENGTH = 5;

const state = {
  language: 'ar',
  soundEnabled: true,
  childAge: 7,
  childName: '',
  childGender: 'boy',           // 'boy' | 'girl' — defaults to boy until kid picks
  subject: 'multiply',
  currentScreen: 'language',
  // problem
  num1: 3,
  num2: 4,
  // phase: draw-vertical | draw-horizontal | count | write | done
  phase: 'draw-vertical',
  // drawn lines
  verticalLines: [],
  horizontalLines: [],
  activeStroke: null,
  intersections: [],
  // addition: objects to count (apples etc.) [{x,y,symbol,group,tapped,tapOrder}]
  addObjects: [],
  // write phase
  digitsToWrite: [],
  currentDigitIndex: 0,
  dotsConnectedCount: 0,
  // per-exercise
  score: 0,
  stars: 0,
  // session: 5 exercises in a row
  session: {
    total: SESSION_LENGTH,
    current: 0,        // 0-indexed; current exercise being attempted
    stars: 0,          // stars earned this session
    score: 0,          // score earned this session
    correctCount: 0,   // correctly-completed exercises
  },
  // profile (persisted)
  profile: {
    totalStars: 0,
    sessionsPlayed: 0,
    bestScore: 0,
    streak: 1,
    lastPlayedISO: null,
    badges: [],          // array of unlocked badge IDs
    mastery: {},         // pairKey -> {tries, wins, totalMs}
    totalPlaySeconds: 0, // cumulative play time for the parent dashboard
    wordsLearned: {},    // word -> times completed
    lettersLearned: {},  // letter -> times found correctly
    perSubject: {},      // subject -> { sessionsCompleted, correctTotal }
  },
  // ephemeral: badges unlocked during current session (for gallery animation)
  newlyUnlockedThisSession: [],
};
window.state = state;

// ════════════════════════════════════════════════════════════
// PERSISTENCE (localStorage)
// ════════════════════════════════════════════════════════════
const STORAGE_KEY = 'brightminds.profile.v1';

function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.language) state.language = data.language;
    if (typeof data.childName === 'string') state.childName = data.childName;
    if (typeof data.childAge === 'number') state.childAge = data.childAge;
    if (data.childGender === 'boy' || data.childGender === 'girl') state.childGender = data.childGender;
    if (typeof data.soundEnabled === 'boolean') state.soundEnabled = data.soundEnabled;
    if (data.profile) Object.assign(state.profile, data.profile);
    if (!state.profile.badges) state.profile.badges = [];
    if (!state.profile.wordsLearned) state.profile.wordsLearned = {};
    if (!state.profile.lettersLearned) state.profile.lettersLearned = {};
    if (!state.profile.perSubject) state.profile.perSubject = {};
    if (typeof state.profile.totalPlaySeconds !== 'number') state.profile.totalPlaySeconds = 0;
    if (state.profile.preferredVoice && typeof Voice !== 'undefined') {
      Voice.setPreferredVoice(state.profile.preferredVoice);
    }
    if (state.profile.teacherVoice && typeof CloudVoice !== 'undefined') {
      CloudVoice.setVoice(state.language, state.profile.teacherVoice);
    }
    if (state.profile.voicePreset && typeof Voice !== 'undefined') {
      Voice.setPreset(state.profile.voicePreset);
      // Sync UI selection
      document.querySelectorAll('.voice-preset').forEach(b => {
        b.classList.toggle('selected', b.dataset.preset === state.profile.voicePreset);
      });
    }
  } catch (e) { /* ignore */ }
}

function saveProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      language: state.language,
      childName: state.childName,
      childAge: state.childAge,
      childGender: state.childGender,
      soundEnabled: state.soundEnabled,
      profile: state.profile,
    }));
  } catch (e) { /* ignore */ }
}

function updateStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const last = state.profile.lastPlayedISO;
  if (last === today) {
    // already counted today
  } else if (last) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.profile.streak = (last === yesterday) ? state.profile.streak + 1 : 1;
  } else {
    state.profile.streak = 1;
  }
  state.profile.lastPlayedISO = today;
  saveProfile();
}

// ════════════════════════════════════════════════════════════
// GREETING HELPER (uses _named variant when childName set)
// ════════════════════════════════════════════════════════════
function speakNamed(key, vars = {}) {
  const k = state.childName ? key + '_named' : key;
  speakI18n(k, { ...vars, name: state.childName });
}

// ════════════════════════════════════════════════════════════
// PROBLEM GENERATION (age-aware + weak-point targeting)
// ════════════════════════════════════════════════════════════
// state.profile.mastery is a map: "a×b" → { tries, wins, totalMs }
// Weak pair = low success rate OR few tries. Weighted pick favors weak pairs.

function maxFactorForAge(age) {
  if (age <= 6) return 3;
  if (age <= 8) return 5;
  if (age <= 10) return 7;
  return 9;
}

function pairKey(a, b) {
  // Subject-prefixed so addition + multiply masteries don't collide
  const s = state.subject || 'multiply';
  return s + ':' + Math.min(a,b) + 'x' + Math.max(a,b);
}

function getMastery(a, b) {
  const k = pairKey(a, b);
  return state.profile.mastery?.[k] || { tries: 0, wins: 0, totalMs: 0 };
}

function recordAttempt(a, b, won, elapsedMs) {
  if (!state.profile.mastery) state.profile.mastery = {};
  const k = pairKey(a, b);
  const m = state.profile.mastery[k] || { tries: 0, wins: 0, totalMs: 0 };
  m.tries += 1;
  if (won) m.wins += 1;
  m.totalMs += elapsedMs || 0;
  state.profile.mastery[k] = m;
  saveProfile();
}

// Returns weight in [1..6] — higher = should appear more often.
// Untried pairs get medium weight; failed/slow pairs get max weight; mastered pairs get min.
function _pairWeight(a, b) {
  const m = getMastery(a, b);
  if (m.tries === 0) return 3;             // unknown → medium-high
  const successRate = m.wins / m.tries;
  if (m.tries === 1 && successRate < 1) return 6;  // failed first try → max
  if (successRate < 0.5) return 6;         // struggling → max
  if (successRate < 0.8) return 4;         // shaky → high
  if (m.tries < 3) return 3;               // not enough data
  return 1;                                 // mastered → low
}

function generateProblem(age) {
  // Dispatch to addition module for the add subject
  if (state.subject === 'add') return Addition.generateProblem(age);
  const maxF = maxFactorForAge(age);
  // Build weighted pool
  const pool = [];
  for (let a = 2; a <= maxF; a++) {
    for (let b = 2; b <= maxF; b++) {
      if (a > b) continue; // dedupe by symmetry
      const w = _pairWeight(a, b);
      for (let i = 0; i < w; i++) pool.push({ a, b });
    }
  }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  // Randomize order for visual variety
  return Math.random() < 0.5
    ? { num1: pick.a, num2: pick.b }
    : { num1: pick.b, num2: pick.a };
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Returns true if the current problem is a "weak" one (worth extra encouragement)
function isWeakPair(a, b) {
  return _pairWeight(a, b) >= 4;
}

// ════════════════════════════════════════════════════════════
// SCREEN NAVIGATION
// ════════════════════════════════════════════════════════════
function showScreen(name) {
  // When leaving the lesson screen, bank the elapsed play time
  if (state.currentScreen === 'lesson' && name !== 'lesson' && state._lessonEnterTs) {
    state.profile.totalPlaySeconds += Math.round((Date.now() - state._lessonEnterTs) / 1000);
    state._lessonEnterTs = null;
    saveProfile();
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if (target) target.classList.add('active');
  state.currentScreen = name;
  if (name === 'lesson') {
    state._lessonEnterTs = Date.now();
    initLesson();
  }
  if (name === 'parent') renderParentDashboard();
}

function updateVoiceStatus() {
  const banner = document.getElementById('voice-banner');
  const picker = document.getElementById('voice-picker');
  const edgeHint = document.getElementById('edge-hint');

  if (banner) {
    const hasVoice = Voice.hasVoiceFor(state.language);
    banner.classList.toggle('hidden', hasVoice);
  }

  // Show Edge hint when no Natural voices exist for current language
  if (edgeHint) {
    const hasPremium = Voice.hasPremiumVoiceFor(state.language);
    edgeHint.classList.toggle('hidden', hasPremium);
  }

  if (picker) {
    const lang = Voice.hasVoiceFor(state.language) ? state.language : 'en';
    const voices = Voice.listVoicesFor(lang);
    // Sort: premium first, then friendly female, then rest
    const sorted = [...voices].sort((a, b) => {
      const aP = Voice._isPremium(a), bP = Voice._isPremium(b);
      if (aP !== bP) return aP ? -1 : 1;
      return 0;
    });
    picker.innerHTML = '';
    sorted.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = (Voice._isPremium(v) ? '⭐ ' : '') + v.name;
      picker.appendChild(opt);
    });
    const saved = state.profile.preferredVoice;
    const defaultVoice = Voice._findVoice(lang);
    picker.value = (saved && sorted.some(v => v.name === saved)) ? saved : (defaultVoice?.name || '');
    Voice.setPreferredVoice(picker.value);
  }
}

// Voice picker change handler
const voicePickerEl = document.getElementById('voice-picker');
if (voicePickerEl) {
  voicePickerEl.addEventListener('change', () => {
    Voice.setPreferredVoice(voicePickerEl.value);
    state.profile.preferredVoice = voicePickerEl.value;
    saveProfile();
    // Play sample so user hears the change immediately
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    speakI18n('speak.test_phrase');
  });
}

// Test-voice button — plays the pre-recorded clip when available
const btnTestVoice = document.getElementById('btn-test-voice');
if (btnTestVoice) {
  btnTestVoice.addEventListener('click', () => {
    Sound.init(); Sound.resume();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (typeof CloudVoice !== 'undefined') CloudVoice.stop();
    speakI18n('speak.test_phrase');
    const noCloud = typeof CloudVoice === 'undefined' || !CloudVoice.has('test_phrase', state.language);
    if (noCloud && !Voice.hasVoiceFor(state.language)) {
      showToast(t('voice.no_voice_for_lang'), '', 3500);
    } else {
      btnTestVoice.classList.add('ok');
    }
  });
}

// Voice preset buttons (teacher / friendly / child)
document.querySelectorAll('.voice-preset').forEach(btn => {
  btn.addEventListener('click', () => {
    Sound.init(); Sound.resume();
    document.querySelectorAll('.voice-preset').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const preset = btn.dataset.preset;
    Voice.setPreset(preset);
    state.profile.voicePreset = preset;
    saveProfile();
    // Play sample so user hears the new character immediately
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setTimeout(() => speakI18n('speak.test_phrase'), 60);
  });
});

// Refresh voices (after installing a new voice pack)
const btnRefreshVoices = document.getElementById('btn-refresh-voices');
if (btnRefreshVoices) {
  btnRefreshVoices.addEventListener('click', () => {
    Sound.init(); Sound.tap();
    Voice.refreshVoices();
    updateVoiceStatus();
    btnRefreshVoices.classList.add('ok');
    setTimeout(() => btnRefreshVoices.classList.remove('ok'), 1500);
  });
}

// Install Arabic voice — opens Windows Speech settings directly
const btnInstallVoice = document.getElementById('btn-install-voice');
if (btnInstallVoice) {
  btnInstallVoice.addEventListener('click', () => {
    Sound.init(); Sound.tap();
    // ms-settings:speech opens Windows Speech settings (Win 10/11)
    try { window.location.href = 'ms-settings:speech'; } catch (e) {}
    // Also show the steps as an alert/inline guidance
    alert(t('voice.install_steps'));
  });
}

// Language buttons → go to teacher-picker (NOT setup)
document.querySelectorAll('.lang-card').forEach(btn => {
  btn.addEventListener('click', () => {
    Sound.init(); Sound.resume(); Sound.tap();
    state.language = btn.dataset.lang;
    document.querySelectorAll('.lang-card').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    applyI18n();
    saveProfile();
    updateVoiceStatus();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (typeof CloudVoice !== 'undefined') CloudVoice.stop();
    setTimeout(() => {
      renderTeacherCards();
      showScreen('teacher');
    }, 280);
  });
});

// ════════════════════════════════════════════════════════════
// TEACHER VOICE PICKER
// ════════════════════════════════════════════════════════════
function renderTeacherCards() {
  const grid = document.getElementById('teacher-grid');
  if (!grid || typeof CloudVoice === 'undefined' || !CloudVoice.manifest) return;
  const voices = CloudVoice.voicesFor(state.language);
  const currentId = state.profile.teacherVoice || CloudVoice.getVoice(state.language);
  grid.innerHTML = '';
  voices.forEach(v => {
    const card = document.createElement('button');
    card.className = 'teacher-card' + (v.id === currentId ? ' selected' : '');
    card.dataset.voiceId = v.id;
    const name = state.language === 'ar' ? v.name_ar : v.name_en;
    const genderLabel = t(v.gender === 'female' ? 'teacher.female' : 'teacher.male');
    const regionLabel = t('teacher.region.' + v.region);
    card.innerHTML = `
      <div class="teacher-play-icon">▶</div>
      <div class="teacher-avatar">${v.avatar}</div>
      <div class="teacher-name">${name}</div>
      <div class="teacher-meta"><span>${regionLabel}</span><span>•</span><span>${genderLabel}</span></div>
    `;
    card.addEventListener('click', () => onTeacherCardClick(card, v));
    grid.appendChild(card);
  });
}

function onTeacherCardClick(card, voice) {
  Sound.init(); Sound.resume(); Sound.tap();
  document.querySelectorAll('.teacher-card').forEach(c => c.classList.remove('selected', 'playing'));
  card.classList.add('selected', 'playing');
  CloudVoice.setVoice(state.language, voice.id);
  state.profile.teacherVoice = voice.id;
  saveProfile();
  // Preview the voice with the test phrase
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  CloudVoice.stop();
  CloudVoice.play('test_phrase', state.language).then(() => {
    card.classList.remove('playing');
  });
}

document.getElementById('btn-go-setup').addEventListener('click', () => {
  Sound.init(); Sound.resume(); Sound.tap();
  setTimeout(() => {
    showScreen('setup');
    const nameInput = document.getElementById('child-name-input');
    if (nameInput && state.childName) nameInput.value = state.childName;
    if (nameInput) nameInput.placeholder = t('setup.name_placeholder');
    const slider = document.getElementById('age-slider');
    if (slider) { slider.value = state.childAge; document.getElementById('age-value').textContent = state.childAge; }
    // Restore previously-chosen gender so the selected card highlight is right
    syncGenderUI();
  }, 200);
});

document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => {
    Sound.init(); Sound.tap();
    showScreen(btn.dataset.back);
  });
});

document.getElementById('btn-go-lesson').addEventListener('click', () => {
  Sound.init(); Sound.resume(); Sound.tap();
  // Reset session for a fresh start
  state.session.current = 0;
  state.session.stars = 0;
  state.session.score = 0;
  state.session.correctCount = 0;
  state.profile.sessionsPlayed++;
  updateStreak();
  saveProfile();
  showScreen('lesson');
});

// Sound toggle
const soundToggleBtn = document.getElementById('sound-toggle');
soundToggleBtn.addEventListener('click', () => {
  state.soundEnabled = !state.soundEnabled;
  Sound.init();
  Sound.setEnabled(state.soundEnabled);
  Voice.setEnabled(state.soundEnabled);
  soundToggleBtn.classList.toggle('muted', !state.soundEnabled);
  if (state.soundEnabled) Sound.tap();
  else if (typeof BgMusic !== 'undefined') BgMusic.stop();
});

// Background music toggle (independent from voice/SFX)
const musicToggleBtn = document.getElementById('music-toggle');
if (musicToggleBtn) {
  musicToggleBtn.addEventListener('click', () => {
    Sound.init(); Sound.resume();
    const on = BgMusic.toggle();
    musicToggleBtn.classList.toggle('playing', on);
    state.profile.musicEnabled = on;
    saveProfile();
  });
}

// ════════════════════════════════════════════════════════════
// SETUP: NAME, AGE & SUBJECT
// ════════════════════════════════════════════════════════════
const nameInput = document.getElementById('child-name-input');
if (nameInput) {
  nameInput.addEventListener('input', () => {
    state.childName = nameInput.value.trim();
    saveProfile();
  });
}

const ageSlider = document.getElementById('age-slider');
const ageValue = document.getElementById('age-value');
const ageAvatar = document.getElementById('age-avatar');

// Cartoon character that changes with the slider — gives the kid an
// "I'm growing!" moment and helps non-readers pick the right age.
function avatarForAge(age) {
  if (age <= 5)  return '👶';
  if (age <= 7)  return '🧒';
  if (age <= 9)  return '👦';
  if (age <= 11) return '🧑';
  return '🧑‍🎓';
}
function syncAgeUI() {
  ageValue.textContent = state.childAge;
  if (ageAvatar) {
    ageAvatar.textContent = avatarForAge(state.childAge);
    ageAvatar.classList.add('bump');
    setTimeout(() => ageAvatar.classList.remove('bump'), 250);
  }
}

let _lastAgeSpoken = 0;
let _ageVoiceTimer = null;
ageSlider.addEventListener('input', () => {
  const newAge = parseInt(ageSlider.value);
  const changed = newAge !== state.childAge;
  state.childAge = newAge;
  syncAgeUI();
  saveProfile();
  if (changed) {
    Sound.init(); Sound.resume();
    Sound.tap();   // little click on every step
    // Debounce voice so it only says the FINAL age once the kid stops sliding.
    clearTimeout(_ageVoiceTimer);
    _ageVoiceTimer = setTimeout(() => {
      if (newAge !== _lastAgeSpoken) {
        _lastAgeSpoken = newAge;
        Voice.countNumber(newAge, state.language);
      }
    }, 250);
  }
});

// Tap the avatar → fun bounce + voice + tap sound (kids love big tap targets)
if (ageAvatar) {
  ageAvatar.style.cursor = 'pointer';
  ageAvatar.addEventListener('click', () => {
    Sound.init(); Sound.resume(); Sound.tap();
    ageAvatar.classList.add('bump');
    setTimeout(() => ageAvatar.classList.remove('bump'), 280);
    Voice.countNumber(state.childAge, state.language);
  });
}

// Set initial character based on saved age
syncAgeUI();

// ── Gender selection ─────────────────────────────────────────
// Wire up boy/girl cards: tap toggles the selected outline + persists.
// `state.childGender` is then used by initLesson() to pick voices/avatars
// and shows up in the parent dashboard.
function syncGenderUI() {
  document.querySelectorAll('.gender-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.gender === state.childGender);
  });
}
document.querySelectorAll('.gender-card').forEach(card => {
  card.addEventListener('click', () => {
    Sound.init(); Sound.resume(); Sound.tap();
    state.childGender = card.dataset.gender;
    syncGenderUI();
    saveProfile();
  });
});
syncGenderUI();

// All games are implemented now! Premium-locked games could still go here in future.
const UNIMPLEMENTED_GAMES = new Set();

document.querySelectorAll('.subject').forEach(el => {
  if (el.classList.contains('coming-soon')) return;
  el.addEventListener('click', () => {
    Sound.init(); Sound.tap();
    if (el.classList.contains('premium')) {
      // Owner mode bypasses the paywall
      if (state.profile.devMode) {
        // If the game isn't implemented yet, show coming-soon toast
        if (UNIMPLEMENTED_GAMES.has(el.dataset.subject)) {
          showToast(t('dev.coming_soon'));
          return;
        }
        // Otherwise just select it like a free subject
      } else {
        showPaywall(el);
        return;
      }
    }
    document.querySelectorAll('.subject').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    state.subject = el.dataset.subject;
  });
});

// ════════════════════════════════════════════════════════════
// OWNER / DEV MODE — 5 taps on the logo toggles it
// ════════════════════════════════════════════════════════════
let _devTaps = 0;
let _devTapTimer = null;
function setupOwnerTrigger() {
  // Tap the language-screen logo 5x quickly to toggle owner mode
  const logo = document.querySelector('#screen-language .logo');
  if (!logo) return;
  logo.style.cursor = 'pointer';
  logo.addEventListener('click', () => {
    _devTaps++;
    clearTimeout(_devTapTimer);
    _devTapTimer = setTimeout(() => { _devTaps = 0; }, 1400);
    if (_devTaps >= 5) {
      _devTaps = 0;
      toggleOwnerMode();
    }
  });
}

function toggleOwnerMode() {
  state.profile.devMode = !state.profile.devMode;
  saveProfile();
  applyOwnerModeUI();
  Sound.celebrate();
  const msg = state.profile.devMode ? t('dev.enabled') : t('dev.disabled');
  const sub = state.profile.devMode ? t('dev.hint') : '';
  showToast(msg, sub, 2400);
}

function applyOwnerModeUI() {
  document.documentElement.classList.toggle('dev-mode', state.profile.devMode);
  const badge = document.getElementById('dev-badge');
  if (badge) badge.classList.toggle('hidden', !state.profile.devMode);
  // Parent button is now ALWAYS visible (protected by PIN gate instead of devMode).
  const pBtn = document.getElementById('parent-btn');
  if (pBtn) pBtn.classList.remove('hidden');
  // Mark unimplemented premium games visually
  document.querySelectorAll('.subject.premium').forEach(el => {
    el.classList.toggle('dev-coming-soon',
      state.profile.devMode && UNIMPLEMENTED_GAMES.has(el.dataset.subject));
  });
}

// Parent button → gate with 4-digit PIN, then open dashboard
document.getElementById('parent-btn')?.addEventListener('click', async () => {
  Sound.init(); Sound.tap();
  const ok = await ParentPIN.prompt();
  if (ok) showScreen('parent');
});

// ════════════════════════════════════════════════════════════
// SETTINGS PANEL — floating ⚙️ button → slide-in drawer
// ════════════════════════════════════════════════════════════
function openSettings() {
  Sound.init(); Sound.tap();
  renderSettings();
  document.getElementById('settings-panel').classList.add('show');
  document.getElementById('settings-backdrop').classList.add('show');
  document.getElementById('settings-panel').setAttribute('aria-hidden', 'false');
}
function closeSettings() {
  Sound.tap();
  document.getElementById('settings-panel').classList.remove('show');
  document.getElementById('settings-backdrop').classList.remove('show');
  document.getElementById('settings-panel').setAttribute('aria-hidden', 'true');
}
document.getElementById('settings-fab')?.addEventListener('click', openSettings);
document.getElementById('settings-close')?.addEventListener('click', closeSettings);
document.getElementById('settings-backdrop')?.addEventListener('click', closeSettings);

function renderSettings() {
  // Volume
  const vol = Math.round((Sound.masterGain?.gain?.value ?? 0.6) * 100);
  const volSlider = document.getElementById('settings-volume');
  if (volSlider) volSlider.value = vol;

  // Music toggle
  const musicToggle = document.getElementById('settings-music-toggle');
  if (musicToggle) musicToggle.checked = !!BgMusic.enabled;

  // SFX toggle
  const sfxToggle = document.getElementById('settings-sfx-toggle');
  if (sfxToggle) sfxToggle.checked = !!state.soundEnabled;

  // Language pills
  document.querySelectorAll('[data-set-lang]').forEach(b => {
    b.classList.toggle('active', b.dataset.setLang === state.language);
  });

  // Teacher voice pills
  const voicesWrap = document.getElementById('settings-voices');
  if (voicesWrap && typeof CloudVoice !== 'undefined') {
    voicesWrap.innerHTML = '';
    CloudVoice.voicesFor(state.language).forEach(v => {
      const pill = document.createElement('button');
      pill.className = 'settings-pill' + (CloudVoice.getVoice(state.language) === v.id ? ' active' : '');
      pill.innerHTML = `${v.avatar} ${state.language === 'ar' ? v.name_ar : v.name_en}`;
      pill.addEventListener('click', () => {
        Sound.tap();
        CloudVoice.setVoice(state.language, v.id);
        state.profile.teacherVoice = v.id;
        saveProfile();
        CloudVoice.play('test_phrase', state.language);
        renderSettings();
      });
      voicesWrap.appendChild(pill);
    });
  }

  // Name input
  const nameInput = document.getElementById('settings-child-name');
  if (nameInput) nameInput.value = state.childName || '';
}

// Volume → master gain
document.getElementById('settings-volume')?.addEventListener('input', (e) => {
  Sound.init();
  if (Sound.masterGain) Sound.masterGain.gain.value = (+e.target.value) / 100;
});

// Music toggle
document.getElementById('settings-music-toggle')?.addEventListener('change', (e) => {
  Sound.init(); Sound.resume();
  BgMusic.enabled = e.target.checked;
  if (BgMusic.enabled) BgMusic.start(); else BgMusic.stop();
  state.profile.musicEnabled = BgMusic.enabled;
  saveProfile();
});

// SFX toggle
document.getElementById('settings-sfx-toggle')?.addEventListener('change', (e) => {
  state.soundEnabled = e.target.checked;
  Sound.setEnabled(state.soundEnabled);
  Voice.setEnabled(state.soundEnabled);
  saveProfile();
});

// Language pills
document.querySelectorAll('[data-set-lang]').forEach(btn => {
  btn.addEventListener('click', () => {
    Sound.tap();
    state.language = btn.dataset.setLang;
    applyI18n();
    saveProfile();
    renderSettings();
    // Re-render teacher voices for new language
    showToast(state.language === 'ar' ? '✓ تم تغيير اللغة' : '✓ Language changed', '', 1800);
  });
});

// Name change
document.getElementById('settings-child-name')?.addEventListener('input', (e) => {
  state.childName = e.target.value.trim();
  saveProfile();
});

// Reset all progress (with confirmation)
document.getElementById('settings-reset')?.addEventListener('click', () => {
  Sound.tap();
  if (confirm(t('settings.reset_confirm'))) {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    showToast(t('settings.reset_done'), '', 2200);
    setTimeout(() => window.location.reload(), 1500);
  }
});

// ════════════════════════════════════════════════════════════
// PARENT DASHBOARD
// ════════════════════════════════════════════════════════════
function computeChildLevel(totalStars) {
  if (totalStars >= 500) return 'level.genius';
  if (totalStars >= 250) return 'level.master';
  if (totalStars >= 120) return 'level.expert';
  if (totalStars >= 60)  return 'level.smart';
  if (totalStars >= 20)  return 'level.learner';
  return 'level.beginner';
}

function formatPlayTime(seconds) {
  if (!seconds || seconds < 60) {
    return Math.round(seconds || 0) + ' ' + t('parent.seconds');
  }
  if (seconds < 3600) {
    return Math.round(seconds / 60) + ' ' + t('parent.minutes');
  }
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return hrs + ' ' + t('parent.hours') + ' ' + mins + ' ' + t('parent.minutes');
}

const SUBJECT_EMOJI = {
  'multiply': '✖️', 'add': '➕', 'letters': '🔤',
  'memory': '🧠', 'find-letter': '🔍', 'color-hunt': '🎨',
  'word-builder': '🧱', 'maze': '🌀', 'puzzle': '🧩',
  'money-shop': '🏪', 'science': '🦁', 'story': '📖',
};

function renderParentDashboard() {
  const p = state.profile;
  const body = document.getElementById('parent-body');
  const sub  = document.getElementById('parent-sub');
  if (!body) return;
  // Header subtitle
  sub.textContent = t(state.childName ? 'parent.subtitle_named' : 'parent.subtitle', { name: state.childName });

  const wordsList = Object.entries(p.wordsLearned || {}).sort((a,b) => b[1] - a[1]);
  const lettersList = Object.entries(p.lettersLearned || {}).sort((a,b) => b[1] - a[1]);
  const levelKey = computeChildLevel(p.totalStars || 0);

  // Per-subject correct counts
  const perSubject = Object.entries(p.perSubject || {})
    .map(([id, s]) => ({ id, ...s }))
    .sort((a,b) => b.correctTotal - a.correctTotal);

  // Weak pairs (mastery rate < 50%)
  const weakPairs = Object.entries(p.mastery || {})
    .filter(([_, m]) => m.tries >= 2 && m.wins / m.tries < 0.5)
    .map(([k]) => k.replace(/^[^:]+:/, '').replace('x', ' × '))
    .slice(0, 6);

  body.innerHTML = `
    <div class="parent-hero">
      <div class="ph-avatar">${state.childName ? '👦' : '🧒'}</div>
      <div class="ph-info">
        <div class="ph-name">${state.childName || '—'}</div>
        <div class="ph-level">${t(levelKey)}</div>
      </div>
    </div>

    <div class="parent-grid">
      <div class="parent-tile cyan">
        <div class="pt-emoji">⏱️</div>
        <div class="pt-value">${formatPlayTime(p.totalPlaySeconds)}</div>
        <div class="pt-label">${t('parent.play_time')}</div>
      </div>
      <div class="parent-tile">
        <div class="pt-emoji">📚</div>
        <div class="pt-value">${wordsList.length}</div>
        <div class="pt-label">${t('parent.words_learned')}</div>
      </div>
      <div class="parent-tile pink">
        <div class="pt-emoji">🔤</div>
        <div class="pt-value">${lettersList.length}</div>
        <div class="pt-label">${t('parent.letters_learned')}</div>
      </div>
      <div class="parent-tile success">
        <div class="pt-emoji">⭐</div>
        <div class="pt-value">${p.totalStars || 0}</div>
        <div class="pt-label">${t('parent.total_stars')}</div>
      </div>
      <div class="parent-tile streak">
        <div class="pt-emoji">🔥</div>
        <div class="pt-value">${p.streak || 0} ${t('parent.day_unit')}</div>
        <div class="pt-label">${t('parent.streak')}</div>
      </div>
      <div class="parent-tile">
        <div class="pt-emoji">🎮</div>
        <div class="pt-value">${p.sessionsPlayed || 0}</div>
        <div class="pt-label">${t('parent.sessions')}</div>
      </div>
      <div class="parent-tile wide">
        <div class="pt-emoji">🏅</div>
        <div class="pt-value">${(p.badges || []).length} / 12</div>
        <div class="pt-label">${t('parent.badges')}</div>
      </div>
    </div>

    <div class="parent-section-title">${t('parent.subjects')}</div>
    <div class="parent-list">
      ${perSubject.length === 0
        ? `<div class="parent-empty">${t('parent.no_data')}</div>`
        : perSubject.map(s => `
            <div class="pl-row">
              <span class="pl-name">${SUBJECT_EMOJI[s.id] || '🎯'} ${t('subj.' + (s.id === 'find-letter' ? 'find_letter' : s.id === 'color-hunt' ? 'colors' : s.id === 'word-builder' ? 'word_builder' : s.id === 'money-shop' ? 'shop' : s.id))}</span>
              <span class="pl-value">${t('parent.exercises_correct', { n: s.correctTotal || 0 })}</span>
            </div>
          `).join('')
      }
    </div>

    ${wordsList.length > 0 ? `
      <div class="parent-section-title">📚 ${t('parent.words_learned')}</div>
      <div class="parent-chips">
        ${wordsList.slice(0, 30).map(([w, n]) => `<span class="parent-chip">${w}<span class="count">×${n}</span></span>`).join('')}
      </div>
    ` : ''}

    ${lettersList.length > 0 ? `
      <div class="parent-section-title">🔤 ${t('parent.letters_learned')}</div>
      <div class="parent-chips">
        ${lettersList.slice(0, 30).map(([l, n]) => `<span class="parent-chip letter">${l}<span class="count">×${n}</span></span>`).join('')}
      </div>
    ` : ''}

    ${weakPairs.length > 0 ? `
      <div class="parent-section-title">⚠️ ${t('parent.weak_areas')}</div>
      <div class="parent-chips">
        ${weakPairs.map(p => `<span class="parent-chip" style="background:rgba(248,113,113,0.12);border-color:rgba(248,113,113,0.4);color:var(--error)">${p}</span>`).join('')}
      </div>
    ` : ''}
  `;
}

// ════════════════════════════════════════════════════════════
// GENERIC TOAST (used for owner-mode + coming-soon)
// ════════════════════════════════════════════════════════════
let _toastTimer = null;
function showToast(msg, sub = '', durationMs = 2200) {
  const el = document.getElementById('generic-toast');
  if (!el) return;
  el.innerHTML = msg + (sub ? `<div class="toast-sub">${sub}</div>` : '');
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), durationMs);
}

// ════════════════════════════════════════════════════════════
// PAYWALL (stub UI for premium subjects)
// ════════════════════════════════════════════════════════════
function showPaywall(subjectEl) {
  const toast = document.getElementById('paywall-toast');
  const backdrop = document.getElementById('paywall-backdrop');
  if (!toast) return;
  const name = subjectEl.querySelector('.name')?.textContent || '';
  document.getElementById('paywall-game-name').textContent = '🎮 ' + name;
  toast.classList.add('show');
  backdrop?.classList.add('show');
  Sound.tap();
}
function hidePaywall() {
  document.getElementById('paywall-toast')?.classList.remove('show');
  document.getElementById('paywall-backdrop')?.classList.remove('show');
}
document.getElementById('paywall-close')?.addEventListener('click', () => {
  Sound.tap(); hidePaywall();
});
document.getElementById('paywall-cta')?.addEventListener('click', () => {
  Sound.tap();
  alert('🚀 Stripe subscription integration coming soon!\n\n' +
        'Plans:\n• Monthly: $4.99\n• Yearly: $39.99 (save 33%)\n• Family: $59.99/year (3 kids)');
});

// ════════════════════════════════════════════════════════════
// LESSON INITIALIZATION
// ════════════════════════════════════════════════════════════
function initLesson() {
  // Branch by subject
  if (state.subject === 'add') return initAddLesson();
  if (state.subject === 'letters') return initLettersLesson();
  if (state.subject === 'memory') return initMemoryLesson();
  if (state.subject === 'find-letter') return initFindLetterLesson();
  if (state.subject === 'color-hunt') return initColorHuntLesson();
  if (state.subject === 'word-builder') return initWordBuilderLesson();
  if (state.subject === 'maze') return initMazeLesson();
  if (state.subject === 'puzzle') return initPuzzleLesson();
  if (state.subject === 'money-shop') return initShopLesson();
  if (state.subject === 'science') return initScienceLesson();
  if (state.subject === 'story') return initStoryLesson();

  // Switching FROM another game (e.g. shop) → multiply: explicitly hide every
  // other game's overlay and restore the multiply-specific UI bits that the
  // simple-tap games turn off via hideMultiplyUI().
  hideAllGameOverlays();
  showMultiplyUI();

  const p = generateProblem(state.childAge);
  state.num1 = p.num1;
  state.num2 = p.num2;
  state.verticalLines = [];
  state.horizontalLines = [];
  state.intersections = [];
  state.addObjects = [];
  state.activeStroke = null;
  state.phase = 'draw-vertical';
  state.digitsToWrite = String(p.num1 * p.num2).split('');
  state.currentDigitIndex = 0;
  state.dotsConnectedCount = 0;

  // Multiply title + operator
  document.querySelector('#screen-lesson .title-block .h1').textContent = t('lesson.title');
  document.querySelector('.problem-tag').textContent = t('lesson.problem');
  document.getElementById('op-symbol').textContent = '×';
  document.getElementById('num1').textContent = p.num1;
  document.getElementById('num2').textContent = p.num2;
  document.getElementById('eq-num1').textContent = p.num1;
  document.getElementById('eq-num2').textContent = p.num2;
  document.getElementById('eq-op').textContent = ' × ';
  document.getElementById('eq-answer').textContent = p.num1 * p.num2;
  document.getElementById('answer-slot').textContent = '؟';
  document.getElementById('answer-slot').classList.remove('revealed');
  document.getElementById('total-score').textContent = state.score;
  document.getElementById('write-overlay').classList.add('hidden');

  state._exerciseStartMs = Date.now();
  updatePhaseUI();
  updateSessionProgress();
  updateHeroBadge();
  resizeCanvas();
  redrawCanvas();
  hideResult();
  hideSessionEnd();

  // Mascot reacts: idle → thinking (a new dragon!)
  if (typeof Mascot !== 'undefined' && Mascot.el) {
    Mascot.setMood('thinking');
  }

  // Teacher voice (with story framing)
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  const isFirstExercise = state.session.current === 0;
  let delay = 0;
  if (isFirstExercise) {
    speakNamed('speak.story_intro');
    if (Mascot.el) Mascot.say(t(state.childName ? 'speak.story_intro' : 'speak.story_intro_noname', { name: state.childName }), 4500);
    delay = 2800;
  }
  setTimeout(() => {
    speakI18n('speak.story_dragon', { a: p.num1, b: p.num2 });
    if (Mascot.el) Mascot.say(`🐉 ${p.num1} × ${p.num2}`, 2400);
    if (isWeakPair(p.num1, p.num2)) {
      setTimeout(() => speakI18n('speak.weak_focus'), 1600);
    }
  }, delay);
  setTimeout(() => {
    speakI18n('speak.draw_vertical', { n: p.num1 });
    if (Mascot.el) { Mascot.setMood('idle'); Mascot.say(t('mascot.draw_v', { n: p.num1 }), 3000); }
  }, delay + 2200);
}

function updateHeroBadge() {
  const titleEl = document.getElementById('hero-title');
  const questEl = document.getElementById('hero-quest');
  if (titleEl) {
    titleEl.textContent = t(state.childName ? 'hero.title' : 'hero.title_noname', { name: state.childName });
  }
  if (questEl) {
    const subjMap = {
      'add': 'hero.add_quest',
      'letters': 'hero.letters_quest',
      'memory': 'hero.memory_quest',
      'find-letter': 'hero.findletter_quest',
      'color-hunt': 'hero.color_quest',
      'word-builder': 'hero.wb_quest',
      'maze': 'hero.maze_quest',
      'puzzle': 'hero.puzzle_quest',
      'money-shop': 'hero.shop_quest',
      'science': 'hero.science_quest',
      'story': 'hero.story_quest',
    };
    const key = subjMap[state.subject] || 'hero.quest';
    questEl.innerHTML = t(key, { n: state.session.current, t: state.session.total });
  }
}

// Hide every game-specific overlay (used when switching games)
function hideAllGameOverlays() {
  ['write-overlay','letter-overlay','memory-overlay','findletter-overlay','colorhunt-overlay','wordbuilder-overlay','maze-overlay','puzzle-overlay','shop-overlay','science-overlay','story-overlay']
    .forEach(id => document.getElementById(id)?.classList.add('hidden'));
}

// Hide the multiply-style instruction banner + actions row + problem card text
// (used by simple-tap games that don't need them).
// IMPORTANT: use `display: none` not `visibility: hidden` — otherwise the
// problem-text card leaves a 47px empty white strip above the game (and worse,
// the leftover equation from the previous lesson can leak through).
function hideMultiplyUI() {
  document.querySelector('.instruction-banner').style.display = 'none';
  document.querySelector('.actions-row').style.display = 'none';
  // Hide AND clear the problem card so a stale "5 + 2 = ?" from addition
  // can never bleed into shop/memory/story/etc.
  const probText = document.querySelector('.problem-text');
  probText.style.display = 'none';
  probText.style.visibility = '';
  document.getElementById('canvas-hint').classList.add('hidden');
  ['vert-counter','horz-counter','tap-count'].forEach(id => document.getElementById(id).classList.add('hidden'));
}
function showMultiplyUI() {
  document.querySelector('.instruction-banner').style.display = '';
  document.querySelector('.actions-row').style.display = '';
  const probText = document.querySelector('.problem-text');
  probText.style.display = '';
  probText.style.visibility = '';
}

// ════════════════════════════════════════════════════════════
// MEMORY LESSON
// ════════════════════════════════════════════════════════════
function initMemoryLesson() {
  const pairs = Memory.pairsForAge(state.childAge);
  const dims = Memory.gridDimsForPairs(pairs);
  state.memoryCards = Memory.generateCards(pairs);
  state.memoryFlipping = []; // currently revealed (not matched)
  state.memoryMoves = 0;
  state.phase = 'memory';
  state.num1 = pairs; state.num2 = 0;

  document.querySelector('#screen-lesson .title-block .h1').textContent = t('lesson.title.memory');
  document.querySelector('.problem-tag').textContent = t('lesson.problem.memory');
  document.getElementById('total-score').textContent = state.score;
  hideAllGameOverlays();
  hideMultiplyUI();

  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const overlay = document.getElementById('memory-overlay');
  const grid = document.getElementById('memory-grid');
  grid.style.gridTemplateColumns = `repeat(${dims.cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${dims.rows}, 1fr)`;
  grid.innerHTML = '';
  state.memoryCards.forEach((card) => {
    const el = document.createElement('div');
    el.className = 'memory-card';
    el.dataset.cardId = card.id;
    el.textContent = card.symbol;
    el.addEventListener('click', () => onMemoryCardClick(card.id));
    grid.appendChild(el);
  });
  updateMemoryCounter();
  overlay.classList.remove('hidden');

  state._exerciseStartMs = Date.now();
  updateSessionProgress();
  updateHeroBadge();
  hideResult();
  hideSessionEnd();
  if (Mascot.el) Mascot.setMood('thinking');

  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (state.session.current === 0) {
    speakNamed('speak.memory_intro');
    if (Mascot.el) Mascot.say(t('mascot.memory_start'), 3500);
  }
}

function onMemoryCardClick(cardId) {
  Sound.init(); Sound.resume();
  const card = state.memoryCards.find(c => c.id === cardId);
  if (!card || card.matched || card.revealed) return;
  // If two are already flipping, ignore until they resolve
  if (state.memoryFlipping.length >= 2) return;

  Sound.tap();
  card.revealed = true;
  const el = document.querySelector(`.memory-card[data-card-id="${cardId}"]`);
  el?.classList.add('revealed');
  state.memoryFlipping.push(card);

  if (state.memoryFlipping.length === 2) {
    state.memoryMoves++;
    const [a, b] = state.memoryFlipping;
    if (a.symbol === b.symbol) {
      a.matched = true; b.matched = true;
      setTimeout(() => {
        document.querySelector(`.memory-card[data-card-id="${a.id}"]`)?.classList.add('matched');
        document.querySelector(`.memory-card[data-card-id="${b.id}"]`)?.classList.add('matched');
        Sound.phaseComplete();
        if (Mascot.el) { Mascot.setMood('happy'); Mascot.say(t('speak.memory_match'), 1200); }
        state.memoryFlipping = [];
        updateMemoryCounter();
        if (Memory.allMatched(state.memoryCards)) {
          setTimeout(finishLesson, 700);
        }
      }, 300);
    } else {
      // No match — flip back after a short delay
      setTimeout(() => {
        document.querySelectorAll(`.memory-card[data-card-id="${a.id}"], .memory-card[data-card-id="${b.id}"]`)
          .forEach(el => el.classList.add('no-match'));
      }, 200);
      setTimeout(() => {
        a.revealed = false; b.revealed = false;
        document.querySelectorAll(`.memory-card[data-card-id="${a.id}"], .memory-card[data-card-id="${b.id}"]`)
          .forEach(el => el.classList.remove('revealed', 'no-match'));
        state.memoryFlipping = [];
      }, 900);
    }
  }
}

function updateMemoryCounter() {
  const matched = state.memoryCards.filter(c => c.matched).length / 2;
  const total = state.memoryCards.length / 2;
  document.getElementById('memory-counter').textContent = `${matched} / ${total}`;
}

// ════════════════════════════════════════════════════════════
// FIND-LETTER LESSON
// ════════════════════════════════════════════════════════════
function initFindLetterLesson() {
  state.findProblem = FindLetter.generate(state.language, state.childAge);
  state.phase = 'find-letter';
  state.num1 = state.findProblem.targetCount;

  document.querySelector('#screen-lesson .title-block .h1').textContent = t('lesson.title.findletter');
  document.querySelector('.problem-tag').textContent = t('lesson.problem.findletter');
  document.getElementById('total-score').textContent = state.score;
  hideAllGameOverlays();
  hideMultiplyUI();

  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  document.getElementById('findletter-target').textContent = state.findProblem.target;
  // Show an illustrated hint of an object that starts with this letter
  const hint = FindLetter.hintFor(state.findProblem.target, state.language);
  if (hint) {
    document.getElementById('findletter-hint-emoji').textContent = hint.emoji;
    // Highlight the target letter within the hint word so the kid sees the
    // connection ("ر" lives inside "رمان") — much clearer for non-readers.
    const wordEl = document.getElementById('findletter-hint-word');
    const target = state.findProblem.target;
    let firstReplaced = false;
    const html = Array.from(hint.word).map(ch => {
      if (!firstReplaced && ch === target) {
        firstReplaced = true;
        return `<span class="target-letter">${ch}</span>`;
      }
      return ch.replace(/[<>&]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;' }[c]));
    }).join('');
    wordEl.innerHTML = html;
  }
  const grid = document.getElementById('findletter-grid');
  grid.style.gridTemplateColumns = `repeat(${state.findProblem.cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${state.findProblem.rows}, 1fr)`;
  grid.innerHTML = '';
  state.findProblem.cells.forEach((cell, idx) => {
    const el = document.createElement('div');
    el.className = 'findletter-cell';
    el.textContent = cell.letter;
    el.dataset.idx = idx;
    el.addEventListener('click', () => onFindLetterClick(idx));
    grid.appendChild(el);
  });
  updateFindLetterCounter();
  document.getElementById('findletter-overlay').classList.remove('hidden');

  state._exerciseStartMs = Date.now();
  updateSessionProgress();
  updateHeroBadge();
  hideResult();
  hideSessionEnd();
  if (Mascot.el) Mascot.setMood('thinking');

  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (state.session.current === 0) {
    speakNamed('speak.findletter_intro');
    if (Mascot.el) Mascot.say(t('mascot.findletter_start'), 3000);
  }
}

function onFindLetterClick(idx) {
  Sound.init(); Sound.resume();
  const cell = state.findProblem.cells[idx];
  if (!cell || cell.found) return;
  const el = document.querySelector(`.findletter-cell[data-idx="${idx}"]`);
  if (cell.isTarget) {
    cell.found = true;
    Sound.tap();
    el?.classList.add('found');
    Voice.speak(t('speak.findletter_found'), state.language, { rate: 1.1 });
    if (Mascot.el) { Mascot.setMood('happy'); Mascot.say('✓', 800); }
    updateFindLetterCounter();
    if (state.findProblem.cells.filter(c => c.isTarget).every(c => c.found)) {
      Sound.phaseComplete();
      setTimeout(finishLesson, 600);
    }
  } else {
    Sound.wrongTap();
    el?.classList.add('wrong-flash');
    setTimeout(() => el?.classList.remove('wrong-flash'), 500);
  }
}
function updateFindLetterCounter() {
  const found = state.findProblem.cells.filter(c => c.isTarget && c.found).length;
  const total = state.findProblem.targetCount;
  document.getElementById('findletter-counter').textContent = `${found} / ${total}`;
}

// ════════════════════════════════════════════════════════════
// COLOR-HUNT LESSON
// ════════════════════════════════════════════════════════════
function initColorHuntLesson() {
  state.colorProblem = ColorHunt.generate(state.language, state.childAge);
  state.phase = 'color-hunt';
  state.num1 = state.colorProblem.targetCount;

  document.querySelector('#screen-lesson .title-block .h1').textContent = t('lesson.title.colorhunt');
  document.querySelector('.problem-tag').textContent = t('lesson.problem.colorhunt');
  document.getElementById('total-score').textContent = state.score;
  hideAllGameOverlays();
  hideMultiplyUI();

  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const swatch = document.getElementById('colorhunt-swatch');
  swatch.style.background = state.colorProblem.target.hex;
  swatch.style.color = state.colorProblem.target.hex;
  document.getElementById('colorhunt-name').textContent = state.colorProblem.targetName;
  const grid = document.getElementById('colorhunt-grid');
  grid.style.gridTemplateColumns = `repeat(${state.colorProblem.cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${state.colorProblem.rows}, 1fr)`;
  grid.innerHTML = '';
  state.colorProblem.cells.forEach((cell, idx) => {
    const el = document.createElement('div');
    el.className = 'colorhunt-cell';
    el.style.color = cell.color;
    el.style.textShadow = `0 0 10px ${cell.color}`;
    el.textContent = cell.shape;
    el.dataset.idx = idx;
    el.addEventListener('click', () => onColorHuntClick(idx));
    grid.appendChild(el);
  });
  updateColorHuntCounter();
  document.getElementById('colorhunt-overlay').classList.remove('hidden');

  state._exerciseStartMs = Date.now();
  updateSessionProgress();
  updateHeroBadge();
  hideResult();
  hideSessionEnd();
  if (Mascot.el) Mascot.setMood('thinking');

  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (state.session.current === 0) {
    speakNamed('speak.colorhunt_intro');
    if (Mascot.el) Mascot.say(t('mascot.colorhunt_start'), 3000);
  }
  setTimeout(() => speakI18n('speak.colorhunt_prompt', { color: state.colorProblem.targetName }), state.session.current === 0 ? 2400 : 100);
}

function onColorHuntClick(idx) {
  Sound.init(); Sound.resume();
  const cell = state.colorProblem.cells[idx];
  if (!cell || cell.found) return;
  const el = document.querySelector(`.colorhunt-cell[data-idx="${idx}"]`);
  if (cell.isTarget) {
    cell.found = true;
    Sound.tap();
    el?.classList.add('found');
    if (Mascot.el) { Mascot.setMood('happy'); Mascot.say('✓', 600); }
    updateColorHuntCounter();
    if (state.colorProblem.cells.filter(c => c.isTarget).every(c => c.found)) {
      Sound.phaseComplete();
      setTimeout(finishLesson, 600);
    }
  } else {
    Sound.wrongTap();
    el?.classList.add('wrong-flash');
    setTimeout(() => el?.classList.remove('wrong-flash'), 500);
  }
}
function updateColorHuntCounter() {
  const found = state.colorProblem.cells.filter(c => c.isTarget && c.found).length;
  const total = state.colorProblem.targetCount;
  document.getElementById('colorhunt-counter').textContent = `${found} / ${total}`;
}

// ════════════════════════════════════════════════════════════
// WORD-BUILDER LESSON
// ════════════════════════════════════════════════════════════
function initWordBuilderLesson() {
  state.wordProblem = WordBuilder.generateProblem(state.language, state.childAge);
  state.wordSlots = new Array(state.wordProblem.letters.length).fill(null); // tile ids
  state.phase = 'word-builder';
  state.num1 = state.wordProblem.letters.length;

  document.querySelector('#screen-lesson .title-block .h1').textContent = t('lesson.title.wb');
  document.querySelector('.problem-tag').textContent = t('lesson.problem.wb');
  document.getElementById('total-score').textContent = state.score;
  hideAllGameOverlays();
  hideMultiplyUI();

  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  document.getElementById('wb-emoji').textContent = state.wordProblem.emoji;

  // Apply the themed scene (gradient + 4 decorative emojis around the main one)
  const sceneId = state.wordProblem.scene || 'sky';
  const scene = (WordBuilder.SCENES && WordBuilder.SCENES[sceneId]) || WordBuilder.SCENES.sky;
  const sceneEl = document.getElementById('wb-scene');
  if (sceneEl) sceneEl.style.background = scene.gradient;
  ['wb-deco-tl', 'wb-deco-tr', 'wb-deco-bl', 'wb-deco-br'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el && scene.deco[i]) el.textContent = scene.deco[i];
  });

  renderWordSlots();
  renderWordPool();
  document.getElementById('wordbuilder-overlay').classList.remove('hidden');
  // Let the page direction handle layout naturally:
  //   In RTL (Arabic), DOM[0] is on the right → first letter goes right ✓
  //   In LTR (English), DOM[0] is on the left → first letter goes left ✓

  state._exerciseStartMs = Date.now();
  updateSessionProgress();
  updateHeroBadge();
  hideResult();
  hideSessionEnd();
  if (Mascot.el) Mascot.setMood('thinking');

  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (state.session.current === 0) {
    speakNamed('speak.wb_intro');
    if (Mascot.el) Mascot.say(t('mascot.wb_start'), 3000);
  }
}

function renderWordSlots() {
  const wrap = document.getElementById('wb-slots');
  wrap.innerHTML = '';
  state.wordProblem.letters.forEach((_, idx) => {
    const el = document.createElement('div');
    el.className = 'wb-slot';
    el.dataset.slotIdx = idx;
    const tileId = state.wordSlots[idx];
    if (tileId !== null) {
      const tile = state.wordProblem.tiles.find(t => t.id === tileId);
      el.textContent = tile.letter;
      el.classList.add('filled');
    }
    el.addEventListener('click', () => onWordSlotClick(idx));
    wrap.appendChild(el);
  });
}

function renderWordPool() {
  const pool = document.getElementById('wb-pool');
  pool.innerHTML = '';
  state.wordProblem.tiles.forEach(tile => {
    const el = document.createElement('div');
    el.className = 'wb-tile' + (tile.used ? ' used' : '');
    el.textContent = tile.letter;
    el.dataset.tileId = tile.id;
    el.addEventListener('click', () => onWordTileClick(tile.id));
    pool.appendChild(el);
  });
}

function onWordTileClick(tileId) {
  Sound.init(); Sound.resume();
  const tile = state.wordProblem.tiles.find(t => t.id === tileId);
  if (!tile || tile.used) return;
  // Place in first empty slot
  const emptyIdx = state.wordSlots.indexOf(null);
  if (emptyIdx === -1) return; // all filled
  state.wordSlots[emptyIdx] = tileId;
  tile.used = true;
  Sound.tap();
  renderWordSlots();
  renderWordPool();
  // If all slots filled → check answer
  if (state.wordSlots.every(s => s !== null)) {
    setTimeout(checkWordAnswer, 350);
  }
}

function onWordSlotClick(slotIdx) {
  Sound.init();
  const tileId = state.wordSlots[slotIdx];
  if (tileId === null) return;
  const tile = state.wordProblem.tiles.find(t => t.id === tileId);
  if (!tile) return;
  state.wordSlots[slotIdx] = null;
  tile.used = false;
  Sound.tap();
  renderWordSlots();
  renderWordPool();
}

// ════════════════════════════════════════════════════════════
// MAZE LESSON
// ════════════════════════════════════════════════════════════
function initMazeLesson() {
  state.mazeProblem = Maze.generateProblem(state.childAge);
  state.phase = 'maze';
  state.num1 = state.mazeProblem.cols * state.mazeProblem.rows;
  state._mazeDragging = false;

  document.querySelector('#screen-lesson .title-block .h1').textContent = t('lesson.title.maze');
  document.querySelector('.problem-tag').textContent = t('lesson.problem.maze');
  document.getElementById('total-score').textContent = state.score;
  hideAllGameOverlays();
  hideMultiplyUI();

  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  renderMazeSvg();
  const promptEl = document.getElementById('maze-prompt');
  if (promptEl) {
    const theme = state.mazeProblem.theme;
    const name = state.language === 'ar' ? theme.name_ar : theme.name_en;
    promptEl.textContent = `${theme.startEmoji} ${name} ${theme.endEmoji}`;
  }
  document.getElementById('maze-overlay').classList.remove('hidden');
  document.getElementById('maze-overlay').classList.remove('solved');

  state._exerciseStartMs = Date.now();
  updateSessionProgress();
  updateHeroBadge();
  hideResult();
  hideSessionEnd();
  if (Mascot.el) Mascot.setMood('thinking');

  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (state.session.current === 0) {
    speakNamed('speak.maze_intro');
    if (Mascot.el) Mascot.say(t('mascot.maze_start'), 3000);
  }
}

function renderMazeSvg() {
  const p = state.mazeProblem;
  const svg = document.getElementById('maze-svg');
  if (!svg) return;
  // Compute SVG viewBox to fit the maze with a small padding
  const PAD = 12;
  const CELL = 56; // logical units per cell
  const W = p.cols * CELL + PAD * 2;
  const H = p.rows * CELL + PAD * 2;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  // Build the SVG content
  const cellX = (c) => PAD + c * CELL + CELL / 2;
  const cellY = (r) => PAD + r * CELL + CELL / 2;

  let walls = '';
  for (let r = 0; r < p.rows; r++) {
    for (let c = 0; c < p.cols; c++) {
      const cell = p.cells[r][c];
      const x = PAD + c * CELL;
      const y = PAD + r * CELL;
      if (cell.top)    walls += `<line class="maze-wall" x1="${x}" y1="${y}" x2="${x+CELL}" y2="${y}" />`;
      if (cell.right)  walls += `<line class="maze-wall" x1="${x+CELL}" y1="${y}" x2="${x+CELL}" y2="${y+CELL}" />`;
      if (cell.bottom) walls += `<line class="maze-wall" x1="${x}" y1="${y+CELL}" x2="${x+CELL}" y2="${y+CELL}" />`;
      if (cell.left)   walls += `<line class="maze-wall" x1="${x}" y1="${y}" x2="${x}" y2="${y+CELL}" />`;
    }
  }

  // Path (kid's trail)
  const pathPoints = p.path.map(pt => `${cellX(pt.c)},${cellY(pt.r)}`).join(' ');
  const pathSvg = `<polyline class="maze-path" points="${pathPoints}" />`;

  // Start and end markers
  const startSvg = `<text class="maze-marker start" x="${cellX(p.start.c)}" y="${cellY(p.start.r)}">${p.theme.startEmoji}</text>`;
  const endSvg   = `<text class="maze-marker end"   x="${cellX(p.end.c)}"   y="${cellY(p.end.r)}">${p.theme.endEmoji}</text>`;

  svg.innerHTML = pathSvg + walls + startSvg + endSvg;

  // Attach pointer handlers (one set per render)
  svg.onpointerdown = onMazePointerDown;
  svg.onpointermove = onMazePointerMove;
  svg.onpointerup   = onMazePointerUp;
  svg.onpointercancel = onMazePointerUp;
}

function svgPointToCell(svg, evt) {
  const p = state.mazeProblem;
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const inv = ctm.inverse();
  const local = pt.matrixTransform(inv);
  const PAD = 12, CELL = 56;
  const c = Math.floor((local.x - PAD) / CELL);
  const r = Math.floor((local.y - PAD) / CELL);
  if (r < 0 || r >= p.rows || c < 0 || c >= p.cols) return null;
  return p.cells[r][c];
}

function onMazePointerDown(e) {
  e.preventDefault();
  Sound.init(); Sound.resume();
  const svg = e.currentTarget;
  const cell = svgPointToCell(svg, e);
  const p = state.mazeProblem;
  if (!cell) return;
  // Allow starting only from the start cell OR resuming from the last path cell
  const last = p.path[p.path.length - 1];
  if (cell.r === last.r && cell.c === last.c) {
    state._mazeDragging = true;
    try { svg.setPointerCapture(e.pointerId); } catch (err) {}
  }
}

function onMazePointerMove(e) {
  if (!state._mazeDragging) return;
  e.preventDefault();
  const svg = e.currentTarget;
  const cell = svgPointToCell(svg, e);
  if (!cell) return;
  const p = state.mazeProblem;
  const last = p.path[p.path.length - 1];
  // If finger is on the same cell, nothing to do
  if (cell.r === last.r && cell.c === last.c) return;

  // If finger goes BACK one cell (kid corrected), pop the path
  if (p.path.length >= 2) {
    const prev = p.path[p.path.length - 2];
    if (cell.r === prev.r && cell.c === prev.c) {
      p.path.pop();
      renderMazeSvg();
      return;
    }
  }

  // Otherwise, only accept moves to an adjacent cell with no wall in between
  const lastCell = p.cells[last.r][last.c];
  if (Maze.canMove(lastCell, cell)) {
    p.path.push({ r: cell.r, c: cell.c });
    Sound.tap();
    renderMazeSvg();
    // Reached the goal?
    if (cell.r === p.end.r && cell.c === p.end.c) {
      state._mazeDragging = false;
      const overlay = document.getElementById('maze-overlay');
      overlay.classList.add('solved');
      Sound.celebrate();
      if (Mascot.el) { Mascot.setMood('cheering'); Mascot.say('🎉', 1500); }
      speakI18n('speak.maze_win');
      setTimeout(finishLesson, 1100);
    }
  }
}

function onMazePointerUp(e) {
  state._mazeDragging = false;
  try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
}

// ════════════════════════════════════════════════════════════
// PUZZLE LESSON
// ════════════════════════════════════════════════════════════
const PUZZLE_PIECE_SIZE = 70;  // pixel size of each puzzle piece

function initPuzzleLesson() {
  // Hard-reset any leftover puzzle DOM from the previous round BEFORE generating
  // a new problem — otherwise the kid sees a momentary flash of the old image
  // and (if anything threw mid-render) the new puzzle could fail to mount.
  const oldBoard = document.getElementById('puzzle-board');
  const oldPool  = document.getElementById('puzzle-pool');
  if (oldBoard) oldBoard.innerHTML = '';
  if (oldPool)  oldPool.innerHTML  = '';

  state.puzzleProblem  = Puzzle.generateProblem(state.childAge);
  state.selectedPieceId = null;
  state.phase = 'puzzle';
  state.num1 = state.puzzleProblem.rows * state.puzzleProblem.cols;

  document.querySelector('#screen-lesson .title-block .h1').textContent = t('lesson.title.puzzle');
  document.querySelector('.problem-tag').textContent = t('lesson.problem.puzzle');
  document.getElementById('total-score').textContent = state.score;
  hideAllGameOverlays();
  hideMultiplyUI();

  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  renderPuzzle();
  // Make sure the overlay is actually visible for the new round — defensive
  // remove of 'hidden' AND ensure the show class isn't preventing display.
  const puzzleOverlay = document.getElementById('puzzle-overlay');
  puzzleOverlay.classList.remove('hidden');
  puzzleOverlay.style.display = '';

  state._exerciseStartMs = Date.now();
  updateSessionProgress();
  updateHeroBadge();
  hideResult();
  hideSessionEnd();
  if (Mascot.el) Mascot.setMood('thinking');

  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (state.session.current === 0) {
    speakNamed('speak.puzzle_intro');
    if (Mascot.el) Mascot.say(t('mascot.puzzle_start'), 3000);
  }
}

function renderPuzzle() {
  const p = state.puzzleProblem;
  document.getElementById('puzzle-ref').textContent = p.emoji;

  // Slots
  const board = document.getElementById('puzzle-board');
  board.style.gridTemplateColumns = `repeat(${p.cols}, ${PUZZLE_PIECE_SIZE}px)`;
  board.style.gridTemplateRows = `repeat(${p.rows}, ${PUZZLE_PIECE_SIZE}px)`;
  board.innerHTML = '';
  for (let i = 0; i < p.rows * p.cols; i++) {
    const r = Math.floor(i / p.cols);
    const c = i % p.cols;
    const slot = document.createElement('div');
    slot.className = 'puzzle-slot';
    slot.dataset.slotIdx = i;
    slot.style.width = PUZZLE_PIECE_SIZE + 'px';
    slot.style.height = PUZZLE_PIECE_SIZE + 'px';
    const placedId = p.placed[i];
    if (placedId !== undefined) {
      const piece = p.pieces[placedId];
      slot.appendChild(makePieceElement(piece, p));
      slot.classList.add('filled');
    }
    slot.addEventListener('click', () => onPuzzleSlotClick(i));
    board.appendChild(slot);
  }

  // Pool — pieces not yet placed
  const pool = document.getElementById('puzzle-pool');
  pool.innerHTML = '';
  const placedSet = new Set(Object.values(p.placed));
  p.poolOrder.forEach(id => {
    if (placedSet.has(id)) return;
    const piece = p.pieces[id];
    const el = makePieceElement(piece, p);
    el.dataset.pieceId = id;
    if (state.selectedPieceId === id) el.classList.add('selected');
    el.addEventListener('click', () => onPuzzlePieceClick(id));
    pool.appendChild(el);
  });
}

function makePieceElement(piece, problem) {
  const el = document.createElement('div');
  el.className = 'puzzle-piece';
  el.style.width = PUZZLE_PIECE_SIZE + 'px';
  el.style.height = PUZZLE_PIECE_SIZE + 'px';

  const inner = document.createElement('div');
  inner.className = 'puzzle-piece-emoji';
  inner.textContent = problem.emoji;
  // Render the full image at piece-size × cols (so each cell is one piece)
  // — emojis are roughly square so this works for square (NxN) grids.
  const fullW = PUZZLE_PIECE_SIZE * problem.cols;
  inner.style.fontSize = fullW + 'px';
  inner.style.width = fullW + 'px';
  inner.style.height = (PUZZLE_PIECE_SIZE * problem.rows) + 'px';
  inner.style.left = (-piece.col * PUZZLE_PIECE_SIZE) + 'px';
  inner.style.top = (-piece.row * PUZZLE_PIECE_SIZE) + 'px';
  el.appendChild(inner);
  return el;
}

function onPuzzlePieceClick(pieceId) {
  Sound.init(); Sound.resume(); Sound.tap();
  state.selectedPieceId = state.selectedPieceId === pieceId ? null : pieceId;
  renderPuzzle();
}

function onPuzzleSlotClick(slotIdx) {
  const p = state.puzzleProblem;

  // If slot has a piece already → tap removes it back to pool
  if (p.placed[slotIdx] !== undefined) {
    Sound.tap();
    delete p.placed[slotIdx];
    state.selectedPieceId = null;
    renderPuzzle();
    return;
  }

  // Need a selected piece to place
  if (state.selectedPieceId === null) return;

  // Place the piece in whatever slot the kid picked — they can move it later
  const piece = p.pieces[state.selectedPieceId];
  p.placed[slotIdx] = piece.id;
  state.selectedPieceId = null;
  Sound.tap();

  const slotR = Math.floor(slotIdx / p.cols);
  const slotC = slotIdx % p.cols;
  const isCorrect = piece.row === slotR && piece.col === slotC;
  if (isCorrect) Sound.lineDone();

  renderPuzzle();

  // When the board is fully covered, check if every piece is in the right slot
  if (Puzzle.allPlaced(p)) {
    const allCorrect = Object.entries(p.placed).every(([idx, pieceId]) => {
      const i = parseInt(idx, 10);
      const pc = p.pieces[pieceId];
      return pc.row === Math.floor(i / p.cols) && pc.col === (i % p.cols);
    });
    if (allCorrect) {
      Sound.celebrate();
      if (Mascot.el) { Mascot.setMood('cheering'); Mascot.say('🎉', 1500); }
      speakI18n('speak.puzzle_win');
      setTimeout(finishLesson, 1100);
    } else {
      // Almost there — gently highlight the mis-placed pieces so the kid can swap them
      Sound.wrongTap();
      if (Mascot.el) { Mascot.setMood('thinking'); Mascot.say('🤔', 1500); }
      Object.entries(p.placed).forEach(([idx, pieceId]) => {
        const i = parseInt(idx, 10);
        const pc = p.pieces[pieceId];
        const correct = pc.row === Math.floor(i / p.cols) && pc.col === (i % p.cols);
        if (!correct) {
          const el = document.querySelector(`.puzzle-slot[data-slot-idx="${idx}"]`);
          if (el) {
            el.classList.add('wrong-flash');
            setTimeout(() => el.classList.remove('wrong-flash'), 900);
          }
        }
      });
    }
  }
}

// ════════════════════════════════════════════════════════════
// MONEY SHOP LESSON — Hakim's shop. Pay the exact price.
// ════════════════════════════════════════════════════════════
function initShopLesson() {
  state.shopProblem = Shop.generateProblem(state.childAge);
  state.phase = 'money-shop';
  state.num1 = state.shopProblem.item.price;

  document.querySelector('#screen-lesson .title-block .h1').textContent = t('lesson.title.shop');
  document.querySelector('.problem-tag').textContent = t('lesson.problem.shop');
  document.getElementById('total-score').textContent = state.score;
  hideAllGameOverlays();
  hideMultiplyUI();
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  renderShop();
  document.getElementById('shop-overlay').classList.remove('hidden');

  state._exerciseStartMs = Date.now();
  updateSessionProgress();
  updateHeroBadge();
  hideResult();
  hideSessionEnd();
  if (Mascot.el) Mascot.setMood('thinking');

  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (state.session.current === 0) {
    speakNamed('speak.shop_intro');
    if (Mascot.el) Mascot.say(t('mascot.shop_start'), 3000);
  }
}

function renderShop() {
  const p = state.shopProblem;
  if (!p) return;
  const item = p.item;
  document.getElementById('shop-item-emoji').textContent = item.emoji;
  document.getElementById('shop-item-name').textContent = state.language === 'ar' ? item.name_ar : item.name_en;
  document.getElementById('shop-price-value').textContent = item.price;
  document.getElementById('shop-wallet-total').textContent = `${p.paid} / ${item.price}`;
  const pct = Math.min(100, (p.paid / item.price) * 100);
  document.getElementById('shop-wallet-fill').style.width = pct + '%';

  // Coin tray (what kid has placed)
  const tray = document.getElementById('shop-tray');
  tray.innerHTML = '';
  p.coinsPlaced.forEach(v => {
    const el = document.createElement('span');
    el.className = 'tray-coin';
    el.textContent = Shop.COINS.find(c => c.value === v)?.emoji || '🪙';
    tray.appendChild(el);
  });

  // Coin buttons (1, 5, 10)
  const coinsEl = document.getElementById('shop-coins');
  coinsEl.innerHTML = '';
  Shop.COINS.forEach(coin => {
    const btn = document.createElement('button');
    btn.className = 'shop-coin c-' + coin.value;
    btn.innerHTML = `<span class="coin-value">${coin.value}</span>`;
    btn.addEventListener('click', () => onShopCoinClick(coin.value));
    coinsEl.appendChild(btn);
  });
}

function onShopCoinClick(value) {
  Sound.init(); Sound.resume();
  const p = state.shopProblem;
  const result = Shop.addCoin(p, value);

  if (result === 'over') {
    // Don't accept the coin — flash the wallet red
    Sound.wrongTap();
    const wallet = document.querySelector('.shop-wallet');
    wallet?.classList.add('over');
    if (Mascot.el) { Mascot.setMood('worried'); Mascot.say(t('shop.over_price'), 1400); }
    speakI18n('speak.shop_over');
    setTimeout(() => wallet?.classList.remove('over'), 500);
    return;
  }

  Sound.tap();
  renderShop();

  if (result === 'exact') {
    Sound.celebrate();
    if (Mascot.el) { Mascot.setMood('cheering'); Mascot.say('🎉 ' + t('mascot.correct'), 1500); }
    speakI18n('speak.shop_win');
    setTimeout(finishLesson, 1100);
  }
}

// ════════════════════════════════════════════════════════════
// SCIENCE LESSON — animal habitats
// ════════════════════════════════════════════════════════════
function initScienceLesson() {
  state.scienceProblem = Science.generateProblem(state.language);
  state.phase = 'science';
  state.num1 = 1;

  document.querySelector('#screen-lesson .title-block .h1').textContent = t('lesson.title.science');
  document.querySelector('.problem-tag').textContent = t('lesson.problem.science');
  document.getElementById('total-score').textContent = state.score;
  hideAllGameOverlays();
  hideMultiplyUI();
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  renderScience();
  document.getElementById('science-overlay').classList.remove('hidden');

  state._exerciseStartMs = Date.now();
  updateSessionProgress();
  updateHeroBadge();
  hideResult();
  hideSessionEnd();
  if (Mascot.el) Mascot.setMood('thinking');

  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (state.session.current === 0) {
    speakNamed('speak.science_intro');
    if (Mascot.el) Mascot.say(t('mascot.science_start'), 3000);
  }
}

function renderScience() {
  const p = state.scienceProblem;
  if (!p) return;
  document.getElementById('science-animal').textContent = p.animal.emoji;
  document.getElementById('science-animal-name').textContent =
    state.language === 'ar' ? p.animal.name_ar : p.animal.name_en;

  const wrap = document.getElementById('science-choices');
  wrap.innerHTML = '';
  p.choices.forEach(hab => {
    const btn = document.createElement('button');
    btn.className = 'science-choice';
    const name = state.language === 'ar' ? hab.name_ar : hab.name_en;
    btn.innerHTML = `<div class="ch-emoji">${hab.emoji}</div><div class="ch-name">${name}</div>`;
    btn.addEventListener('click', () => onScienceChoice(btn, hab));
    wrap.appendChild(btn);
  });
}

function onScienceChoice(btn, choice) {
  if (btn.classList.contains('correct') || btn.classList.contains('wrong')) return;
  Sound.init(); Sound.resume();
  const p = state.scienceProblem;
  if (choice.id === p.target.id) {
    btn.classList.add('correct');
    Sound.tap(); Sound.phaseComplete();
    if (Mascot.el) { Mascot.setMood('cheering'); Mascot.say('✓ ' + t('mascot.correct'), 1800); }
    speakI18n('speak.science_correct', {
      place: state.language === 'ar' ? p.target.name_ar : p.target.name_en
    });
    setTimeout(finishLesson, 1500);
  } else {
    btn.classList.add('wrong');
    Sound.wrongTap();
    if (Mascot.el) { Mascot.setMood('worried'); Mascot.say('✗', 1000); }
    speakI18n('speak.science_wrong');
    setTimeout(() => btn.classList.remove('wrong'), 600);
  }
}

// ════════════════════════════════════════════════════════════
// STORY LESSON — قصة تعليمية (page-based illustrated reader)
// ════════════════════════════════════════════════════════════
function initStoryLesson() {
  // Pick a fresh story the kid hasn't seen yet (falls back to random)
  if (!state.profile.storiesSeen) state.profile.storiesSeen = [];
  const story = StoryGame.pickNext(state.language, state.profile.storiesSeen);
  state.storyProblem = { story, pageIdx: 0, showingMoral: false };
  state.phase = 'story';
  state.num1 = story.pages.length;

  document.querySelector('#screen-lesson .title-block .h1').textContent = t('lesson.title.story');
  document.querySelector('.problem-tag').textContent = t('lesson.problem.story');
  document.getElementById('total-score').textContent = state.score;
  hideAllGameOverlays();
  hideMultiplyUI();
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  renderStoryPage();
  document.getElementById('story-overlay').classList.remove('hidden');

  state._exerciseStartMs = Date.now();
  updateSessionProgress();
  updateHeroBadge();
  hideResult();
  hideSessionEnd();
  if (Mascot.el) Mascot.setMood('happy');

  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (state.session.current === 0) {
    speakNamed('speak.story_read_intro');
    if (Mascot.el) Mascot.say(t('mascot.story_start'), 3000);
  }
  // Auto-narrate the very first page after a tiny delay (let the intro speak first)
  setTimeout(() => narrateStoryPage(), state.session.current === 0 ? 1800 : 400);
}

function renderStoryPage() {
  const sp = state.storyProblem;
  if (!sp) return;
  const { story, pageIdx, showingMoral } = sp;
  const totalPages = story.pages.length;

  document.getElementById('story-title').textContent = story.title;

  if (showingMoral) {
    // Final screen — show the moral with a big celebration look
    document.getElementById('story-illustration').textContent = '🌟';
    document.getElementById('story-text').textContent = t('story.finish');
    document.getElementById('story-progress').textContent = `${totalPages} / ${totalPages}`;
    const moralBox = document.getElementById('story-moral');
    moralBox.classList.remove('hidden');
    document.getElementById('story-moral-text').textContent = story.moral;
    document.getElementById('story-prev').disabled = false;
    document.getElementById('story-next').textContent = '✓ ' + (state.language === 'ar' ? 'إنهاء' : 'Finish');
  } else {
    const page = story.pages[pageIdx];
    document.getElementById('story-illustration').textContent = page.emoji;
    document.getElementById('story-text').textContent = page.text;
    document.getElementById('story-progress').textContent = `${pageIdx + 1} / ${totalPages}`;
    document.getElementById('story-moral').classList.add('hidden');
    document.getElementById('story-prev').disabled = (pageIdx === 0);
    document.getElementById('story-next').textContent =
      (pageIdx === totalPages - 1) ? t('story.moral') + ' ‹' : t('story.next');
  }
}

function narrateStoryPage() {
  if (typeof Voice === 'undefined') return;
  const sp = state.storyProblem;
  if (!sp) return;
  const text = sp.showingMoral
    ? sp.story.moral
    : sp.story.pages[sp.pageIdx].text;
  Voice.speak(text, state.language, { rate: 0.95, replace: true });
}

function storyAdvance(dir) {
  const sp = state.storyProblem;
  if (!sp) return;
  const total = sp.story.pages.length;
  Sound.init(); Sound.tap();

  if (sp.showingMoral) {
    if (dir > 0) {
      // Finish: mark story as read + award points
      if (!state.profile.storiesSeen) state.profile.storiesSeen = [];
      if (!state.profile.storiesSeen.includes(sp.story.id)) {
        state.profile.storiesSeen.push(sp.story.id);
      }
      finishLesson();
      return;
    } else {
      sp.showingMoral = false;        // back to last page
      sp.pageIdx = total - 1;
    }
  } else {
    const next = sp.pageIdx + dir;
    if (next < 0) return;             // already at first
    if (next >= total) {
      sp.showingMoral = true;          // moved past last page → show moral
    } else {
      sp.pageIdx = next;
    }
  }
  renderStoryPage();
  // Auto-narrate the new page
  setTimeout(narrateStoryPage, 200);
}

// Wire up nav buttons once at startup (the elements are static)
document.getElementById('story-prev')?.addEventListener('click', () => storyAdvance(-1));
document.getElementById('story-next')?.addEventListener('click', () => storyAdvance(+1));
document.getElementById('story-replay')?.addEventListener('click', () => {
  Sound.init(); Sound.tap();
  narrateStoryPage();
});
// Tap the illustration to re-hear the page (kids love this)
document.getElementById('story-illustration')?.addEventListener('click', narrateStoryPage);

document.getElementById('shop-undo')?.addEventListener('click', () => {
  Sound.init(); Sound.tap();
  if (state.shopProblem) {
    Shop.removeLastCoin(state.shopProblem);
    renderShop();
  }
});

function checkWordAnswer() {
  const userWord = state.wordSlots
    .map(tid => state.wordProblem.tiles.find(t => t.id === tid).letter)
    .join('');
  const targetWord = state.wordProblem.word;
  if (userWord === targetWord) {
    // Correct!
    document.querySelectorAll('.wb-slot').forEach(el => el.classList.add('correct'));
    Sound.celebrate();
    if (Mascot.el) { Mascot.setMood('cheering'); Mascot.say('🎉 ' + t('mascot.correct'), 2000); }
    speakI18n('speak.wb_correct', { word: targetWord });
    setTimeout(finishLesson, 1600);
  } else {
    // Wrong — shake and reset
    document.querySelectorAll('.wb-slot').forEach(el => el.classList.add('wrong'));
    Sound.wrongTap();
    if (Mascot.el) { Mascot.setMood('worried'); Mascot.say('✗', 900); }
    speakI18n('speak.wb_wrong');
    setTimeout(() => {
      // Clear slots, return tiles to pool
      state.wordSlots = new Array(state.wordProblem.letters.length).fill(null);
      state.wordProblem.tiles.forEach(t => t.used = false);
      renderWordSlots();
      renderWordPool();
    }, 700);
  }
}

// ════════════════════════════════════════════════════════════
// ADDITION LESSON FLOW
// ════════════════════════════════════════════════════════════
function initAddLesson() {
  // Clean any leftover overlay/UI from a previous subject (e.g. shop)
  hideAllGameOverlays();
  showMultiplyUI();

  const p = Addition.generateProblem(state.childAge);
  state.num1 = p.num1;
  state.num2 = p.num2;
  state.verticalLines = [];
  state.horizontalLines = [];
  state.intersections = [];
  state.activeStroke = null;
  state.phase = 'add-count';
  state.digitsToWrite = String(p.num1 + p.num2).split('');
  state.currentDigitIndex = 0;
  state.dotsConnectedCount = 0;

  // Addition title + operator
  document.querySelector('#screen-lesson .title-block .h1').textContent = t('lesson.title.add');
  document.querySelector('.problem-tag').textContent = t('lesson.problem.add');
  document.getElementById('op-symbol').textContent = '+';
  document.getElementById('num1').textContent = p.num1;
  document.getElementById('num2').textContent = p.num2;
  document.getElementById('eq-num1').textContent = p.num1;
  document.getElementById('eq-num2').textContent = p.num2;
  document.getElementById('eq-op').textContent = ' + ';
  document.getElementById('eq-answer').textContent = p.num1 + p.num2;
  document.getElementById('answer-slot').textContent = '؟';
  document.getElementById('answer-slot').classList.remove('revealed');
  document.getElementById('total-score').textContent = state.score;
  document.getElementById('write-overlay').classList.add('hidden');

  state._exerciseStartMs = Date.now();
  // Reset objects before resizing (so drawCanvas sees empty, not stale data)
  state.addObjects = [];
  resizeCanvas();
  // Place objects now that canvas has correct size
  const rect = canvas.getBoundingClientRect();
  state.addObjects = Addition.placeObjects(p.num1, p.num2, rect);

  updatePhaseUI();
  updateSessionProgress();
  updateHeroBadge();
  redrawCanvas();
  hideResult();
  hideSessionEnd();

  if (typeof Mascot !== 'undefined' && Mascot.el) Mascot.setMood('thinking');

  if (window.speechSynthesis) window.speechSynthesis.cancel();
  const isFirstExercise = state.session.current === 0;
  let delay = 0;
  if (isFirstExercise) {
    speakNamed('speak.add_intro');
    if (Mascot.el) Mascot.say(t('mascot.add.start'), 4200);
    delay = 2800;
  }
  setTimeout(() => {
    speakI18n('speak.add_problem', { a: p.num1, b: p.num2 });
    if (Mascot.el) Mascot.say(`🍎 ${p.num1} + ${p.num2}`, 2200);
  }, delay);
  setTimeout(() => {
    speakI18n('speak.add_count');
    if (Mascot.el) { Mascot.setMood('idle'); Mascot.say(t('mascot.count'), 2400); }
  }, delay + 2400);
}

// ════════════════════════════════════════════════════════════
// LETTERS LESSON FLOW
// ════════════════════════════════════════════════════════════
function initLettersLesson() {
  const p = Letters.generateProblem(state.language);
  state.letterProblem = p;
  state.phase = 'letter-match';
  state.num1 = 0; state.num2 = 0; // unused
  state.verticalLines = []; state.horizontalLines = []; state.intersections = []; state.addObjects = [];
  state.activeStroke = null;

  // Titles
  document.querySelector('#screen-lesson .title-block .h1').textContent = t('lesson.title.letters');
  document.querySelector('.problem-tag').textContent = t('lesson.problem.letters');
  // Hide normal problem card (no a+b/a×b for letters)
  document.querySelector('.problem-text').style.visibility = 'hidden';
  document.getElementById('total-score').textContent = state.score;
  // Hide other overlays + canvas hint
  document.getElementById('write-overlay').classList.add('hidden');
  document.getElementById('canvas-hint').classList.add('hidden');
  // Hide line counters + tap count
  ['vert-counter','horz-counter','tap-count'].forEach(id => document.getElementById(id).classList.add('hidden'));

  state._exerciseStartMs = Date.now();
  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height); // wipe any prior drawing

  renderLetterChoices();
  document.getElementById('letter-overlay').classList.remove('hidden');

  updatePhaseUI();
  updateSessionProgress();
  updateHeroBadge();
  hideResult();
  hideSessionEnd();

  if (Mascot.el) Mascot.setMood('thinking');

  // Teacher voice
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  const isFirstExercise = state.session.current === 0;
  let delay = 0;
  if (isFirstExercise) {
    speakNamed('speak.letters_intro');
    if (Mascot.el) Mascot.say(t('mascot.letters.start'), 3500);
    delay = 2600;
  }
  setTimeout(() => {
    speakI18n('speak.letters_prompt', { letter: p.letter });
    if (Mascot.el) Mascot.say(`🔤 ${p.letter}`, 1800);
  }, delay);
}

function renderLetterChoices() {
  const wrap = document.getElementById('letter-choices');
  const big = document.getElementById('letter-big');
  big.textContent = state.letterProblem.letter;
  wrap.innerHTML = '';
  state.letterProblem.choices.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = 'letter-choice';
    btn.innerHTML = `<div class="choice-emoji">${c.image}</div><div class="choice-word">${c.word}</div>`;
    btn.addEventListener('click', () => handleLetterChoice(btn, c));
    wrap.appendChild(btn);
  });
}

function handleLetterChoice(btnEl, choice) {
  if (btnEl.classList.contains('correct') || btnEl.classList.contains('wrong')) return;
  Sound.init(); Sound.resume();
  if (choice.isCorrect) {
    btnEl.classList.add('correct');
    Sound.tap(); Sound.phaseComplete();
    if (Mascot.el) { Mascot.setMood('cheering'); Mascot.say('✓ ' + t('mascot.correct'), 1800); }
    speakI18n('speak.letters_correct', { word: choice.word, letter: state.letterProblem.letter });
    setTimeout(() => {
      document.getElementById('letter-overlay').classList.add('hidden');
      finishLesson();
    }, 1400);
  } else {
    btnEl.classList.add('wrong');
    Sound.wrongTap();
    if (Mascot.el) { Mascot.setMood('worried'); Mascot.say('✗', 1000); }
    speakI18n('speak.letters_wrong');
    setTimeout(() => btnEl.classList.remove('wrong'), 600);
  }
}

function handleAddTap(pt) {
  const tapped = Addition.handleTap(pt, state.addObjects);
  if (tapped) {
    Sound.tap();
    const order = state.addObjects.filter(o => o.tapped).length;
    if (navigator.vibrate) navigator.vibrate(20);
    Voice.countNumber(order, state.language);
    redrawCanvas();
    updatePhaseUI();
    const allDone = state.addObjects.every(o => o.tapped);
    if (allDone) {
      Sound.phaseComplete();
      setTimeout(() => Voice.total(state.addObjects.length, state.language), 800);
    }
  } else {
    Sound.wrongTap();
  }
}

function updateSessionProgress() {
  const dotsWrap = document.getElementById('session-dots');
  const sub = document.getElementById('lesson-sub');
  if (!dotsWrap) return;
  dotsWrap.innerHTML = '';
  for (let i = 0; i < state.session.total; i++) {
    const dot = document.createElement('div');
    dot.className = 'session-dot';
    if (i < state.session.current) dot.classList.add('done');
    else if (i === state.session.current) dot.classList.add('current');
    dotsWrap.appendChild(dot);
  }
  if (sub) sub.textContent = t('session.progress', { n: state.session.current + 1, t: state.session.total });
}

function updatePhaseUI() {
  const stepPill = document.getElementById('step-pill');
  const text = document.getElementById('instruction-text');
  const hint = document.getElementById('canvas-hint');
  const hintArrow = document.getElementById('hint-arrow');
  const hintText = document.getElementById('hint-text');
  const vc = document.getElementById('vert-counter');
  const hc = document.getElementById('horz-counter');
  const tc = document.getElementById('tap-count');
  const nextBtn = document.getElementById('btn-next-phase');
  const clearBtn = document.getElementById('btn-clear');

  vc.textContent = t('counter.vertical', { n: state.verticalLines.length, t: state.num1 });
  hc.textContent = t('counter.horizontal', { n: state.horizontalLines.length, t: state.num2 });
  const taps = state.intersections.filter(p => p.tapped).length;
  tc.textContent = t('counter.tap', { n: taps, t: state.intersections.length });

  if (state.phase === 'draw-vertical') {
    stepPill.textContent = '1';
    text.textContent = t('phase.vertical', { n: state.num1 });
    hint.classList.toggle('hidden', state.verticalLines.length > 0);
    hintArrow.textContent = '↓';
    hintText.textContent = t('hint.vertical');
    vc.classList.remove('hidden');
    hc.classList.add('hidden');
    tc.classList.add('hidden');
    clearBtn.style.display = '';
    const remaining = state.num1 - state.verticalLines.length;
    nextBtn.disabled = remaining !== 0;
    nextBtn.firstElementChild.textContent = remaining === 0
      ? t('btn.next.ok')
      : t('btn.draw_more_v', { n: remaining });
    nextBtn.classList.toggle('success', remaining === 0);
  } else if (state.phase === 'draw-horizontal') {
    stepPill.textContent = '2';
    text.textContent = t('phase.horizontal', { n: state.num2 });
    hint.classList.toggle('hidden', state.horizontalLines.length > 0);
    hintArrow.textContent = state.language === 'ar' ? '←' : '→';
    hintText.textContent = t('hint.horizontal');
    hc.classList.remove('hidden');
    tc.classList.add('hidden');
    clearBtn.style.display = '';
    const remaining = state.num2 - state.horizontalLines.length;
    nextBtn.disabled = remaining !== 0;
    nextBtn.firstElementChild.textContent = remaining === 0
      ? t('btn.see_dots')
      : t('btn.draw_more_h', { n: remaining });
    nextBtn.classList.toggle('success', remaining === 0);
  } else if (state.phase === 'count') {
    stepPill.textContent = '3';
    text.textContent = t('phase.count');
    hint.classList.add('hidden');
    tc.classList.remove('hidden');
    clearBtn.style.display = '';
    const remaining = state.intersections.length - taps;
    nextBtn.disabled = remaining !== 0;
    nextBtn.firstElementChild.textContent = remaining === 0
      ? t('btn.go_write')
      : t('btn.tap_more', { n: remaining });
    nextBtn.classList.toggle('success', remaining === 0);
  } else if (state.phase === 'write') {
    stepPill.textContent = state.subject === 'add' ? '2' : '4';
    text.textContent = t(state.subject === 'add' ? 'phase.add_write' : 'phase.write');
    hint.classList.add('hidden');
    tc.classList.add('hidden');
    vc.classList.add('hidden');
    hc.classList.add('hidden');
    clearBtn.style.display = 'none';
    nextBtn.disabled = true;
    nextBtn.firstElementChild.textContent = t('btn.see_result');
    nextBtn.classList.remove('success');
  } else if (state.phase === 'add-count') {
    stepPill.textContent = '1';
    text.textContent = t('phase.add_count');
    hint.classList.add('hidden');
    vc.classList.add('hidden');
    hc.classList.add('hidden');
    tc.classList.remove('hidden');
    clearBtn.style.display = '';
    const total = state.addObjects.length;
    const tapped = state.addObjects.filter(o => o.tapped).length;
    tc.textContent = t('counter.tap', { n: tapped, t: total });
    const remaining = total - tapped;
    nextBtn.disabled = remaining !== 0;
    nextBtn.firstElementChild.textContent = remaining === 0
      ? t('btn.add.go_write')
      : t('btn.add.count_more', { n: remaining });
    nextBtn.classList.toggle('success', remaining === 0);
  } else if (state.phase === 'letter-match') {
    // Letters has no "phase" steps — just hide all the multiply UI
    document.querySelector('.instruction-banner').style.display = 'none';
    document.querySelector('.actions-row').style.display = 'none';
    document.querySelector('.problem-text').style.display = 'none';
    hint.classList.add('hidden');
    vc.classList.add('hidden');
    hc.classList.add('hidden');
    tc.classList.add('hidden');
    return; // skip the trailing "always show" logic
  }
  // Always restore the multiply UI bits when leaving letters
  document.querySelector('.instruction-banner').style.display = '';
  document.querySelector('.actions-row').style.display = '';
}

// ════════════════════════════════════════════════════════════
// CANVAS DRAWING
// ════════════════════════════════════════════════════════════
const canvas = document.getElementById('draw-canvas');
const ctx = canvas.getContext('2d');
let dpr = window.devicePixelRatio || 1;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, rect.width * dpr);
  canvas.height = Math.max(1, rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  redrawCanvas();
}
window.addEventListener('resize', () => {
  if (state.currentScreen === 'lesson') resizeCanvas();
});

function getCanvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : (e.changedTouches ? e.changedTouches[0] : e);
  return { x: t.clientX - rect.left, y: t.clientY - rect.top };
}

function onPointerDown(e) {
  e.preventDefault();
  Sound.init(); Sound.resume();
  // Addition: just tap apples to count
  if (state.subject === 'add' && state.phase === 'add-count') {
    handleAddTap(getCanvasPoint(e));
    return;
  }
  if (state.phase === 'count') { handleTap(getCanvasPoint(e)); return; }
  if (state.phase !== 'draw-vertical' && state.phase !== 'draw-horizontal') return;
  if (state.phase === 'draw-vertical' && state.verticalLines.length >= state.num1) return;
  if (state.phase === 'draw-horizontal' && state.horizontalLines.length >= state.num2) return;
  const p = getCanvasPoint(e);
  state.activeStroke = { points: [p] };
  redrawCanvas();
}
function onPointerMove(e) {
  e.preventDefault();
  if (!state.activeStroke) return;
  const p = getCanvasPoint(e);
  state.activeStroke.points.push(p);
  redrawCanvas();
}
function onPointerUp(e) {
  e.preventDefault();
  if (!state.activeStroke) return;
  const wasAccepted = finalizeStroke(state.activeStroke);
  state.activeStroke = null;
  if (wasAccepted) Sound.lineDone();
  updatePhaseUI();
  redrawCanvas();
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', onPointerUp);
canvas.addEventListener('pointerleave', (e) => { if (state.activeStroke) onPointerUp(e); });

function finalizeStroke(stroke) {
  const pts = stroke.points;
  if (pts.length < 2) return false;
  const rect = canvas.getBoundingClientRect();

  if (state.phase === 'draw-vertical') {
    const avgX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const minY = Math.min(...pts.map(p => p.y));
    const maxY = Math.max(...pts.map(p => p.y));
    const dy = maxY - minY;
    const dx = Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x));
    if (dy < 40 || dy < dx * 1.2) {
      Sound.error();
      flashHint(state.language === 'ar' ? 'ارسم خط رأسي ↓' : 'Draw a vertical line ↓');
      return false;
    }
    state.verticalLines.push({
      x: avgX,
      y1: Math.max(8, minY - 20),
      y2: Math.min(rect.height - 8, maxY + 20),
      fullY1: 8,
      fullY2: rect.height - 8,
    });
    return true;
  } else if (state.phase === 'draw-horizontal') {
    const avgY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    const minX = Math.min(...pts.map(p => p.x));
    const maxX = Math.max(...pts.map(p => p.x));
    const dx = maxX - minX;
    const dy = Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y));
    if (dx < 40 || dx < dy * 1.2) {
      Sound.error();
      flashHint(state.language === 'ar' ? 'ارسم خط أفقي ←' : 'Draw a horizontal line →');
      return false;
    }
    state.horizontalLines.push({
      y: avgY,
      x1: Math.max(8, minX - 20),
      x2: Math.min(rect.width - 8, maxX + 20),
      fullX1: 8,
      fullX2: rect.width - 8,
    });
    return true;
  }
  return false;
}

function flashHint(msg) {
  const hint = document.getElementById('canvas-hint');
  const txt = document.getElementById('hint-text');
  const old = txt.textContent;
  txt.textContent = msg;
  hint.classList.remove('hidden');
  hint.style.color = 'var(--error)';
  clearTimeout(window._hintTimer);
  window._hintTimer = setTimeout(() => {
    hint.style.color = '';
    txt.textContent = old;
    updatePhaseUI();
  }, 1400);
}

function redrawCanvas() {
  const rect = canvas.getBoundingClientRect();
  // Addition subject uses its own canvas renderer
  if (state.subject === 'add') {
    Addition.drawCanvas(ctx, rect, state.addObjects, state.activeStroke);
    return;
  }
  ctx.clearRect(0, 0, rect.width, rect.height);
  const fullExtend = state.phase === 'count' || state.phase === 'write' || state.phase === 'done';

  state.verticalLines.forEach(line => {
    ctx.beginPath();
    const y1 = fullExtend ? line.fullY1 : line.y1;
    const y2 = fullExtend ? line.fullY2 : line.y2;
    ctx.shadowColor = '#22D3EE';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.moveTo(line.x, y1);
    ctx.lineTo(line.x, y2);
    ctx.stroke();
  });

  state.horizontalLines.forEach(line => {
    ctx.beginPath();
    const x1 = fullExtend ? line.fullX1 : line.x1;
    const x2 = fullExtend ? line.fullX2 : line.x2;
    ctx.shadowColor = '#FBBF24';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.moveTo(x1, line.y);
    ctx.lineTo(x2, line.y);
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  state.intersections.forEach(pt => {
    ctx.beginPath();
    ctx.shadowColor = pt.tapped ? '#34D399' : '#A855F7';
    ctx.shadowBlur = pt.tapped ? 24 : 16;
    ctx.fillStyle = pt.tapped ? '#34D399' : '#A855F7';
    ctx.arc(pt.x, pt.y, pt.tapped ? 14 : 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.arc(pt.x, pt.y, pt.tapped ? 5 : 4, 0, Math.PI * 2);
    ctx.fill();
    if (pt.tapped) {
      ctx.font = 'bold 13px Tajawal, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pt.tapOrder, pt.x, pt.y - 22);
    }
  });
  ctx.shadowBlur = 0;

  if (state.activeStroke && state.activeStroke.points.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = state.phase === 'draw-vertical'
      ? 'rgba(34, 211, 238, 0.7)'
      : 'rgba(251, 191, 36, 0.7)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pts = state.activeStroke.points;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
}

// ════════════════════════════════════════════════════════════
// INTERSECTIONS / COUNT
// ════════════════════════════════════════════════════════════
function computeIntersections() {
  state.intersections = [];
  state.verticalLines.forEach(v => {
    state.horizontalLines.forEach(h => {
      state.intersections.push({ x: v.x, y: h.y, tapped: false, tapOrder: 0 });
    });
  });
}

function handleTap(pt) {
  let nearest = null;
  let minDist = 30;
  state.intersections.forEach(p => {
    if (p.tapped) return;
    const d = Math.hypot(p.x - pt.x, p.y - pt.y);
    if (d < minDist) { minDist = d; nearest = p; }
  });
  if (nearest) {
    Sound.tap();
    const order = state.intersections.filter(p => p.tapped).length + 1;
    nearest.tapped = true;
    nearest.tapOrder = order;
    if (navigator.vibrate) navigator.vibrate(20);
    Voice.countNumber(order, state.language);
    redrawCanvas();
    updatePhaseUI();
    const allDone = state.intersections.every(p => p.tapped);
    if (allDone) {
      Sound.phaseComplete();
      // Announce the total after a short delay so it doesn't clip the last count
      setTimeout(() => Voice.total(state.intersections.length, state.language), 800);
    }
  } else {
    Sound.wrongTap();
  }
}

// ════════════════════════════════════════════════════════════
// WRITE PHASE (dot-to-dot for each digit of the answer)
// ════════════════════════════════════════════════════════════
function startWritePhase() {
  state.phase = 'write';
  state.currentDigitIndex = 0;
  state.dotsConnectedCount = 0;
  document.getElementById('write-overlay').classList.remove('hidden');
  renderWriteUI();
  updatePhaseUI();
  speakI18n('speak.write');
}

function renderWriteUI() {
  const overlay = document.getElementById('write-overlay');
  const title = document.getElementById('write-title');
  const answer = document.getElementById('write-answer');
  const grid = document.getElementById('digit-grid');
  const hint = document.getElementById('write-hint');

  title.textContent = t('write.title');
  answer.textContent = state.digitsToWrite.join('');
  hint.textContent = t('write.hint');

  grid.innerHTML = '';
  state.digitsToWrite.forEach((digit, idx) => {
    const svg = renderDigitSvg(digit, idx);
    grid.appendChild(svg);
  });
}

function renderDigitSvg(digit, index) {
  const pts = DIGITS[digit] || DIGITS['0'];
  const W = 100, H = 168;        // viewBox
  const padX = 18, padY = 18;
  const usableW = W - padX * 2;
  const usableH = H - padY * 2;
  const cellW = usableW / (DIGIT_GRID.cols - 1);
  const cellH = usableH / (DIGIT_GRID.rows - 1);

  const px = (col) => padX + col * cellW;
  const py = (row) => padY + row * cellH;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'digit-svg');
  svg.dataset.digitIndex = index;
  svg.dataset.digit = digit;

  // Path for drawn strokes
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'stroke-line');
  path.setAttribute('d', '');
  svg.appendChild(path);

  // Numbered dots
  pts.forEach((p, i) => {
    const cx = px(p[0]);
    const cy = py(p[1]);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', cx);
    c.setAttribute('cy', cy);
    c.setAttribute('r', 12);
    c.setAttribute('class', 'dot-circle');
    c.dataset.dotIndex = i;
    g.appendChild(c);
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', cx);
    txt.setAttribute('y', cy + 1);
    txt.setAttribute('class', 'dot-label');
    txt.textContent = i + 1;
    g.appendChild(txt);
    svg.appendChild(g);
  });

  // Mark the first dot as "next" if this is the active digit
  if (index === state.currentDigitIndex) {
    const firstDot = svg.querySelector(`.dot-circle[data-dot-index="0"]`);
    if (firstDot) firstDot.classList.add('next');
  }

  // Click handler delegated
  svg.addEventListener('pointerdown', (e) => onDigitDotClick(e, svg));

  return svg;
}

function onDigitDotClick(e, svg) {
  e.preventDefault();
  Sound.init(); Sound.resume();
  const digitIndex = parseInt(svg.dataset.digitIndex);
  if (digitIndex !== state.currentDigitIndex) return;

  const target = e.target.closest('.dot-circle');
  if (!target) return;
  const dotIndex = parseInt(target.dataset.dotIndex);
  if (dotIndex !== state.dotsConnectedCount) {
    Sound.wrongTap();
    target.animate(
      [{ filter: 'drop-shadow(0 0 8px var(--error))' }, { filter: 'none' }],
      { duration: 350 }
    );
    return;
  }

  Sound.tap();
  if (navigator.vibrate) navigator.vibrate(15);

  // Mark dot as connected
  target.classList.remove('next');
  target.classList.add('connected');
  state.dotsConnectedCount++;

  // Update stroke path
  updateStrokePath(svg);

  const digit = svg.dataset.digit;
  const totalDots = DIGITS[digit].length;

  if (state.dotsConnectedCount < totalDots) {
    // Highlight next dot
    const next = svg.querySelector(`.dot-circle[data-dot-index="${state.dotsConnectedCount}"]`);
    if (next) next.classList.add('next');
  } else {
    // This digit is complete!
    svg.classList.add('done');
    Sound.phaseComplete();
    if (state.currentDigitIndex < state.digitsToWrite.length - 1) {
      // Move to next digit
      speakI18n('speak.next_digit');
      setTimeout(() => {
        state.currentDigitIndex++;
        state.dotsConnectedCount = 0;
        const nextSvg = document.querySelector(`.digit-svg[data-digit-index="${state.currentDigitIndex}"]`);
        if (nextSvg) {
          const firstDot = nextSvg.querySelector('.dot-circle[data-dot-index="0"]');
          if (firstDot) firstDot.classList.add('next');
        }
      }, 600);
    } else {
      // All digits done — reveal answer & enable next button
      setTimeout(() => {
        document.getElementById('answer-slot').textContent = state.digitsToWrite.join('');
        document.getElementById('answer-slot').classList.add('revealed');
        const nextBtn = document.getElementById('btn-next-phase');
        nextBtn.disabled = false;
        nextBtn.classList.add('success');
      }, 500);
    }
  }
}

function updateStrokePath(svg) {
  const digit = svg.dataset.digit;
  const pts = DIGITS[digit];
  const W = 100, H = 168;
  const padX = 18, padY = 18;
  const cellW = (W - padX * 2) / (DIGIT_GRID.cols - 1);
  const cellH = (H - padY * 2) / (DIGIT_GRID.rows - 1);
  const px = (c) => padX + c * cellW;
  const py = (r) => padY + r * cellH;

  // For the active digit, draw the path up to the connected count
  const digitIndex = parseInt(svg.dataset.digitIndex);
  let connectedUpTo;
  if (digitIndex < state.currentDigitIndex) {
    connectedUpTo = pts.length; // fully done
  } else if (digitIndex === state.currentDigitIndex) {
    connectedUpTo = state.dotsConnectedCount;
  } else {
    connectedUpTo = 0;
  }

  if (connectedUpTo < 1) return;
  let d = '';
  for (let i = 0; i < connectedUpTo; i++) {
    const p = pts[i];
    d += (i === 0 ? 'M ' : ' L ') + px(p[0]) + ' ' + py(p[1]);
  }
  svg.querySelector('.stroke-line').setAttribute('d', d);
}

// ════════════════════════════════════════════════════════════
// PHASE TRANSITIONS
// ════════════════════════════════════════════════════════════
document.getElementById('btn-clear').addEventListener('click', () => {
  Sound.init(); Sound.tap();
  if (state.phase === 'draw-vertical') state.verticalLines = [];
  else if (state.phase === 'draw-horizontal') state.horizontalLines = [];
  else if (state.phase === 'count') state.intersections.forEach(p => { p.tapped = false; p.tapOrder = 0; });
  else if (state.phase === 'add-count') state.addObjects.forEach(o => { o.tapped = false; o.tapOrder = 0; });
  redrawCanvas();
  updatePhaseUI();
});

document.getElementById('btn-next-phase').addEventListener('click', () => {
  Sound.init(); Sound.resume();
  if (state.phase === 'draw-vertical' && state.verticalLines.length === state.num1) {
    Sound.phaseComplete();
    state.phase = 'draw-horizontal';
    speakI18n('speak.draw_horizontal', { n: state.num2 });
  } else if (state.phase === 'draw-horizontal' && state.horizontalLines.length === state.num2) {
    Sound.phaseComplete();
    computeIntersections();
    state.phase = 'count';
    speakI18n('speak.count');
  } else if (state.phase === 'count' && state.intersections.every(p => p.tapped)) {
    Sound.phaseComplete();
    startWritePhase();
    return;
  } else if (state.phase === 'add-count' && state.addObjects.every(o => o.tapped)) {
    Sound.phaseComplete();
    startWritePhase();
    return;
  } else if (state.phase === 'write') {
    finishLesson();
    return;
  }
  updatePhaseUI();
  redrawCanvas();
});

// ════════════════════════════════════════════════════════════
// FINISH & CELEBRATION
// ════════════════════════════════════════════════════════════
function finishLesson() {
  state.phase = 'done';
  document.getElementById('write-overlay').classList.add('hidden');
  document.getElementById('letter-overlay')?.classList.add('hidden');
  // 🎉 Applause + encouragement at every lesson win
  Sound.applause();
  setTimeout(() => Sound.encouragement(), 300);

  // Track learning content (for the parent dashboard)
  if (state.subject === 'word-builder' && state.wordProblem) {
    const w = state.wordProblem.word;
    state.profile.wordsLearned[w] = (state.profile.wordsLearned[w] || 0) + 1;
  }
  if (state.subject === 'letters' && state.letterProblem) {
    const l = state.letterProblem.letter;
    state.profile.lettersLearned[l] = (state.profile.lettersLearned[l] || 0) + 1;
  }
  // Per-subject counters
  const s = state.subject || 'multiply';
  if (!state.profile.perSubject[s]) state.profile.perSubject[s] = { correctTotal: 0, sessionsCompleted: 0 };
  state.profile.perSubject[s].correctTotal++;
  // Restore problem card visibility (might have been hidden by letters or another simple-tap game)
  const probText = document.querySelector('.problem-text');
  probText.style.visibility = '';
  probText.style.display = '';
  let total;
  if (state.subject === 'add') total = state.num1 + state.num2;
  else if (state.subject === 'letters') total = 5;
  else if (state.subject === 'memory') total = state.num1 * 2;
  else if (state.subject === 'find-letter') total = state.num1 * 3;
  else if (state.subject === 'color-hunt') total = state.num1 * 3;
  else if (state.subject === 'word-builder') total = state.num1 * 4;
  else if (state.subject === 'maze') total = 15;
  else if (state.subject === 'puzzle') total = 12;
  else if (state.subject === 'money-shop') total = (state.shopProblem?.item?.price || 5) + 5;
  else if (state.subject === 'science') total = 10;
  else if (state.subject === 'story')   total = 15;   // reading rewards more
  else total = state.num1 * state.num2;
  // Restore multiply UI for the next lesson if it was hidden
  showMultiplyUI();
  hideAllGameOverlays();
  state.score += total;
  state.session.score += total;
  state.session.stars += 3;
  state.session.correctCount++;
  state.profile.totalStars += 3;
  if (state.session.score > state.profile.bestScore) state.profile.bestScore = state.session.score;

  // Record mastery for this pair (won, with elapsed time)
  const elapsed = Date.now() - (state._exerciseStartMs || Date.now());
  recordAttempt(state.num1, state.num2, true, elapsed);

  // Check for newly-unlocked badges after this exercise
  checkAndUnlockBadges();

  saveProfile();
  document.getElementById('total-score').textContent = state.score;
  state.stars = 3;
  showResult();
  Sound.celebrate();
  launchConfetti();
  // Story-mode victory
  const dragonsLeft = state.session.total - (state.session.current + 1);
  if (Mascot.el) { Mascot.setMood('cheering'); Mascot.say('🎉 ' + t('mascot.correct'), 2200); }
  if (dragonsLeft > 0) {
    speakI18n(state.childName ? 'speak.story_dragon_defeated' : 'speak.story_dragon_defeated_noname',
              { name: state.childName, n: dragonsLeft });
  } else {
    speakI18n(state.childName ? 'speak.story_victory' : 'speak.story_victory_noname',
              { name: state.childName });
  }
}

function showResult() {
  const overlay = document.getElementById('result-overlay');
  overlay.classList.add('show');
  ['star-1', 'star-2', 'star-3'].forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.remove('lit');
    if (i < state.stars) setTimeout(() => el.classList.add('lit'), 80);
  });
  const keys = ['result.feedback1', 'result.feedback2', 'result.feedback3', 'result.feedback4'];
  const key = keys[Math.floor(Math.random() * keys.length)];
  document.getElementById('result-feedback').textContent = t(key);
}

function hideResult() {
  document.getElementById('result-overlay').classList.remove('show');
  clearConfetti();
}

document.getElementById('btn-next-question').addEventListener('click', () => {
  Sound.init(); Sound.tap();
  state.session.current++;
  if (state.session.current >= state.session.total) {
    showSessionEnd();
  } else {
    // Hide the result modal IMMEDIATELY so the kid sees the new puzzle/word/etc
    // load underneath (init runs after 600ms, but the modal must go away first)
    hideResult();
    speakI18n('speak.next_exercise');
    setTimeout(initLesson, 600);
  }
});
document.getElementById('btn-back-home').addEventListener('click', () => {
  Sound.init(); Sound.tap();
  hideResult();
  showScreen('language');
});

// ════════════════════════════════════════════════════════════
// SESSION END
// ════════════════════════════════════════════════════════════
function showSessionEnd() {
  hideResult();
  // Big applause for completing a full session
  Sound.applause();
  setTimeout(() => Sound.applause(), 900);
  // One more achievement check at end of full session
  checkAndUnlockBadges();

  const overlay = document.getElementById('session-end-overlay');
  document.getElementById('stat-stars').textContent = state.session.stars;
  document.getElementById('stat-score').textContent = state.session.score;
  document.getElementById('stat-correct').textContent = `${state.session.correctCount}/${state.session.total}`;
  document.getElementById('stat-total-stars').textContent = state.profile.totalStars;
  document.getElementById('stat-streak').textContent =
    state.profile.streak + ' ' + t('session_end.days');

  const subtitleKey = state.childName ? 'session_end.subtitle_named' : 'session_end.subtitle';
  document.getElementById('session-end-subtitle').textContent = t(subtitleKey, { name: state.childName });

  // Render badge gallery
  renderBadgeGallery();

  overlay.classList.add('show');
  Sound.celebrate();
  launchConfetti();
  setTimeout(() => speakNamed('speak.session_end'), 700);
}

// ════════════════════════════════════════════════════════════
// ACHIEVEMENTS
// ════════════════════════════════════════════════════════════
function checkAndUnlockBadges() {
  if (typeof checkAchievements !== 'function') return;
  const newly = checkAchievements(state.profile, state.session);
  if (newly.length === 0) return;
  // Append to profile + track for this session's gallery
  state.profile.badges = [...(state.profile.badges || []), ...newly];
  state.newlyUnlockedThisSession.push(...newly);
  saveProfile();
  // Show toast for each unlocked badge (one at a time, queued)
  newly.forEach((id, i) => {
    setTimeout(() => showBadgeToast(id), 600 + i * 2600);
  });
}

let _badgeToastTimer;
function showBadgeToast(badgeId) {
  const badge = getBadgeById(badgeId);
  if (!badge) return;
  const toast = document.getElementById('badge-toast');
  const medal = document.getElementById('badge-toast-medal');
  const title = document.getElementById('badge-toast-title');
  const desc = document.getElementById('badge-toast-desc');
  if (!toast) return;
  medal.textContent = badge.emoji;
  title.textContent = t(`badge.${badge.id}.title`);
  desc.textContent = t(`badge.${badge.id}.desc`);
  toast.classList.add('show');
  Sound.celebrate();
  speakI18n(state.childName ? 'speak.badge_unlocked_named' : 'speak.badge_unlocked',
            { name: state.childName, title: t(`badge.${badge.id}.title`) });
  clearTimeout(_badgeToastTimer);
  _badgeToastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function renderBadgeGallery() {
  const grid = document.getElementById('badge-gallery');
  const progressEl = document.getElementById('badge-gallery-progress');
  if (!grid) return;
  const owned = new Set(state.profile.badges || []);
  grid.innerHTML = '';
  BADGES.forEach(b => {
    const cell = document.createElement('div');
    cell.className = 'badge-cell';
    if (owned.has(b.id)) {
      cell.classList.add('unlocked', b.rarity || 'common');
      cell.textContent = b.emoji;
      if (state.newlyUnlockedThisSession.includes(b.id)) {
        cell.classList.add('newly-unlocked');
      }
    } else {
      cell.classList.add('locked');
      cell.textContent = '🔒';
    }
    cell.title = t(`badge.${b.id}.title`);
    grid.appendChild(cell);
  });
  if (progressEl) {
    progressEl.textContent = t('badge.progress', { n: owned.size, t: BADGES.length });
  }
}

function hideSessionEnd() {
  document.getElementById('session-end-overlay').classList.remove('show');
}

document.getElementById('btn-new-session').addEventListener('click', () => {
  Sound.init(); Sound.tap();
  hideSessionEnd();
  state.session.current = 0;
  state.session.stars = 0;
  state.session.score = 0;
  state.session.correctCount = 0;
  state.score = 0;
  state.profile.sessionsPlayed++;
  state.newlyUnlockedThisSession = []; // reset highlight for the new session
  saveProfile();
  initLesson();
});
document.getElementById('btn-session-home').addEventListener('click', () => {
  Sound.init(); Sound.tap();
  hideSessionEnd();
  showScreen('language');
});

// ════════════════════════════════════════════════════════════
// CONFETTI
// ════════════════════════════════════════════════════════════
function launchConfetti() {
  const container = document.getElementById('confetti-container');
  const colors = ['#A855F7', '#22D3EE', '#34D399', '#FBBF24', '#F43F5E'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[Math.floor(Math.random() * colors.length)];
    c.style.animationDuration = (2 + Math.random() * 2) + 's';
    c.style.animationDelay = (Math.random() * 0.5) + 's';
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  }
}
function clearConfetti() {
  document.getElementById('confetti-container').innerHTML = '';
}

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
loadProfile();
// Load the pre-rendered audio manifest so CloudVoice can serve clips
if (typeof CloudVoice !== 'undefined') CloudVoice.init();
applyI18n();
runSplashScreen();

// ════════════════════════════════════════════════════════════
// PWA — register service worker + handle install prompt
// ════════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {/* offline ok */});
  });
}

let _deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  const btn = document.getElementById('install-btn');
  if (btn) btn.classList.remove('hidden');
});
window.addEventListener('appinstalled', () => {
  _deferredInstallPrompt = null;
  document.getElementById('install-btn')?.classList.add('hidden');
  if (typeof showToast === 'function') showToast(t('pwa.install_toast'), '', 3000);
});
document.getElementById('install-btn')?.addEventListener('click', async () => {
  if (!_deferredInstallPrompt) return;
  Sound.init(); Sound.tap();
  _deferredInstallPrompt.prompt();
  const { outcome } = await _deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    document.getElementById('install-btn')?.classList.add('hidden');
  }
  _deferredInstallPrompt = null;
});
const savedLangCard = document.querySelector(`.lang-card[data-lang="${state.language}"]`);
if (savedLangCard) savedLangCard.classList.add('selected');
// Mount mascot once DOM is ready
if (typeof Mascot !== 'undefined') Mascot.mount('mascot-container');

// ════════════════════════════════════════════════════════════
// SPLASH SCREEN — animated logo + typed brand + mascot + music
// ════════════════════════════════════════════════════════════
let _splashFinished = false;
function runSplashScreen() {
  const brandEl = document.getElementById('splash-brand');
  if (!brandEl) return;
  // Type "BrightMinds" letter by letter
  const word = 'BrightMinds';
  brandEl.innerHTML = '';
  word.split('').forEach((char, i) => {
    const span = document.createElement('span');
    span.className = 'splash-letter';
    span.textContent = char;
    span.style.animationDelay = (0.7 + i * 0.07) + 's';
    brandEl.appendChild(span);
  });

  // Mount the Hakim mascot inside the splash
  if (typeof Mascot !== 'undefined') {
    Mascot.mount('splash-mascot');
    Mascot.setMood('happy');
    setTimeout(() => Mascot.say(t('splash.greeting'), 2000), 2100);
  }

  // Play welcome music after a beat (audio needs user gesture, but Sound.init
  // is safe to call — modern browsers allow muted-by-default + we degrade
  // gracefully if blocked).
  setTimeout(() => {
    Sound.init();
    Sound.resume();
    Sound.splashMelody();
  }, 300);

  // Auto-transition after the animation finishes
  setTimeout(finishSplash, 3800);

  document.getElementById('splash-skip')?.addEventListener('click', finishSplash, { once: true });
  document.getElementById('screen-splash')?.addEventListener('click', (e) => {
    if (e.target.id === 'splash-skip') return;
    if (!_splashFinished) finishSplash();
  });
}

function finishSplash() {
  if (_splashFinished) return;
  _splashFinished = true;
  // Re-mount the mascot back into the lesson container (it was moved to splash)
  if (typeof Mascot !== 'undefined') Mascot.mount('mascot-container');
  showScreen('language');
}
// Owner-mode trigger + restore prior owner state
setupOwnerTrigger();
applyOwnerModeUI();
// Populate voice picker once voices load
if (window.speechSynthesis) {
  if (window.speechSynthesis.getVoices().length) {
    updateVoiceStatus();
  } else {
    window.speechSynthesis.addEventListener('voiceschanged', () => updateVoiceStatus(), { once: true });
  }
}
showScreen('language');
