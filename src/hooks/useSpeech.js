import { useEffect } from 'react';
import { CloudVoice } from '../utils/cloudVoice.js';
import { Voice }      from '../utils/sounds.js';
import { tSpoken }    from '../data/i18n.js';

/**
 * Speak an i18n key. Falls back from CloudVoice (pre-rendered MP3) to
 * Web Speech API. Call manually or pass a `whenKey` to trigger automatically.
 */
export function useSpeech() {
  useEffect(() => { CloudVoice.init(); }, []);

  function speak(key, vars = {}, language = 'ar') {
    // Try the pre-recorded clip first
    const cloudKey = CLOUD_KEY_MAP[key];
    if (cloudKey && CloudVoice.has(cloudKey, language)) {
      CloudVoice.play(cloudKey, language);
      return;
    }
    Voice.speak(tSpoken(key, vars, language), language);
  }

  return { speak };
}

const CLOUD_KEY_MAP = {
  'speak.test_phrase':   'test_phrase',
  'speak.session_start': 'session_start',
  'speak.session_end':   'session_end',
  'speak.victory':       'champion',
  'speak.draw_vertical': 'draw_vert',
  'speak.draw_horizontal':'draw_horiz',
  'speak.count':         'count_dots',
  'speak.write':         'write_answer',
  // ... see poc/i18n.js for full map
};
