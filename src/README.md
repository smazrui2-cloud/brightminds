# BrightMinds — React Source

This is the **target architecture** for BrightMinds, scaffolded according to the
layout you proposed:

```
src/
├── assets/        صور + أصوات
├── components/    الأزرار + الكروت
├── screens/       Splash / Home / Teacher / Setup / Lesson / Parent
├── games/         9 ألعاب — كل لعبة في ملف منفصل
├── data/          المحتوى التعليمي (i18n, digits, achievements)
├── hooks/         منطق التطبيق (useGameState, useSession, useSpeech)
├── utils/         الأصوات + التخزين (sounds, cloudVoice, storage)
└── App.jsx        Top-level router (state machine)
```

## ⚠️ Current state — scaffold only

The folder structure is in place and the **navigation flow + utils + hooks +
data layer** are functional. The 9 games are **stubs** that link back to the
working JS implementations in `poc/`.

The original vanilla-JS POC continues to live in `poc/` and remains the
fully working app — you can still serve it directly with no build step.

## 📦 Setup (when ready to migrate)

```bash
npm install
npm run dev       # → http://localhost:5173 (Vite dev server, HMR)
npm run build     # → dist/ for deployment to Vercel/Netlify
```

Required deps already declared in `package.json`:
- `react` + `react-dom`
- `vite` + `@vitejs/plugin-react`
- `msedge-tts` (dev-only, for regenerating /audio MP3s)

## 🚚 Migration path (POC → React)

The plan is incremental — port one game at a time, the POC stays as the
reference. Suggested order (easiest → hardest):

| Step | Action | Source in POC |
|------|--------|---------------|
| ✅ 1 | App.jsx + router + Context | `app.js` `showScreen()` |
| ✅ 2 | Splash screen | `app.js` `runSplashScreen()` |
| ✅ 3 | Home (language picker) | `index.html` `#screen-language` |
| ✅ 4 | Teacher voice picker | `app.js` `renderTeacherCards()` |
| ✅ 5 | Setup screen | `index.html` `#screen-setup` |
| ✅ 6 | Parent dashboard | `app.js` `renderParentDashboard()` |
| ⏳ 7 | MultiplyGame | `app.js` initLesson + drawing logic |
| ⏳ 8 | AdditionGame | `addition.js` |
| ⏳ 9 | LettersGame | `letters.js` |
| ⏳ 10 | MemoryGame | `memory.js` |
| ⏳ 11 | FindLetterGame | `findletter.js` |
| ⏳ 12 | ColorHuntGame | `colorhunt.js` |
| ⏳ 13 | WordBuilderGame | `wordbuilder.js` |
| ⏳ 14 | MazeGame | `maze.js` |
| ⏳ 15 | PuzzleGame | `puzzle.js` |

## 📁 Asset locations

- **Audio (324 MP3s)** stay in `poc/audio/`. The React app fetches them from
  `/audio/manifest.json`. For Vite, either symlink `poc/audio` → `public/audio`
  or move them to `public/audio/` once the React port is feature-complete.
- **Fonts** are loaded via Google Fonts in `index.html` (root level).

## 🧠 Architecture notes

- **State management:** simple React Context (`GameProvider` in `hooks/useGameState.jsx`)
  — no Redux/Zustand needed for an app this size.
- **Navigation:** plain state machine in `App.jsx` (`screen` state). When you
  need deep-linking later, swap in `react-router` without touching screens.
- **Persistence:** `utils/storage.js` reads/writes `localStorage` key
  `brightminds.profile.v1`. Same schema as the POC, so existing user data carries over.
- **Sounds:** `utils/sounds.js` exports `Sound` and `Voice` objects — same API
  as `poc/sounds.js`. `utils/cloudVoice.js` plays the pre-rendered MP3s.

## 📱 Future targets

- **PWA install:** add `manifest.json` + service worker for "Add to Home Screen"
  (Android + iOS).
- **React Native port:** the same component structure + hooks transfer almost
  1:1 to React Native, swapping `<div>` for `<View>`, etc.
- **Stripe subscription:** wire `parent.subscribe` button to Stripe Checkout
  once the subscription model is finalized.
