# assets/

Place static images and any extra audio here. The 324 MP3 teacher voice
clips live in `../poc/audio/` (kept there to avoid duplication during
migration). When the React port is feature-complete, move them to
`public/audio/` so Vite serves them at the root.

## Current assets

- (empty — using `poc/audio/` for now)

## How audio is loaded

`utils/cloudVoice.js` fetches `/audio/manifest.json` and plays MP3s by URL:
```
/audio/{lang}/{voice}/{phrase}.mp3
```

## How to regenerate the audio

```bash
node poc/tools/generate-audio.js
```
This re-creates all 324 MP3s using Microsoft Edge's Natural Voices via the
`msedge-tts` npm package (no API key needed).
