import { createContext, useContext, useState, useEffect } from 'react';
import { saveProfile } from '../utils/storage.js';

const GameStateContext = createContext(null);

/**
 * Single source of truth for the whole app state:
 *   language, childName, childAge, subject, teacherVoice,
 *   profile (totalStars, mastery, badges, wordsLearned, etc.)
 *
 * Wrapped in a Context Provider in App.jsx. Any component can read/update
 * state via `useGameState()`.
 */
export function GameProvider({ children, profile, setScreen }) {
  const [state, setState] = useState({
    language:    profile.language    || 'ar',
    childName:   profile.childName   || '',
    childAge:    profile.childAge    || 7,
    subject:     'multiply',
    teacherVoice: profile.teacherVoice || null,
    profile,
    setScreen,
  });

  // Persist relevant slices to localStorage whenever they change
  useEffect(() => {
    saveProfile({
      language: state.language,
      childName: state.childName,
      childAge: state.childAge,
      teacherVoice: state.teacherVoice,
      profile: state.profile,
    });
  }, [state.language, state.childName, state.childAge, state.teacherVoice, state.profile]);

  return (
    <GameStateContext.Provider value={{ state, setState, setScreen }}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameState must be used inside <GameProvider>');
  return ctx;
}
