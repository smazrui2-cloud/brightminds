import { useEffect, useState } from 'react';
import SplashScreen from './screens/SplashScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import TeacherScreen from './screens/TeacherScreen.jsx';
import SetupScreen from './screens/SetupScreen.jsx';
import LessonScreen from './screens/LessonScreen.jsx';
import ParentScreen from './screens/ParentScreen.jsx';
import { GameProvider } from './hooks/useGameState.jsx';
import { useStorage } from './hooks/useStorage.js';

/**
 * App = top-level router. Each "screen" is a self-contained React component.
 *
 * Navigation is a simple state machine (no react-router needed yet).
 * Screen state is held in `useGameState` (Context) so any screen can read it.
 */
export default function App() {
  const [screen, setScreen] = useState('splash');
  const profile = useStorage();

  return (
    <GameProvider profile={profile} setScreen={setScreen}>
      {screen === 'splash'   && <SplashScreen   onDone={() => setScreen('home')} />}
      {screen === 'home'     && <HomeScreen     onDone={() => setScreen('teacher')} />}
      {screen === 'teacher'  && <TeacherScreen  onDone={() => setScreen('setup')}  onBack={() => setScreen('home')} />}
      {screen === 'setup'    && <SetupScreen    onDone={() => setScreen('lesson')} onBack={() => setScreen('teacher')} />}
      {screen === 'lesson'   && <LessonScreen   onDone={() => setScreen('setup')}  onBack={() => setScreen('setup')} />}
      {screen === 'parent'   && <ParentScreen   onBack={() => setScreen('home')} />}
    </GameProvider>
  );
}
