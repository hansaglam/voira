# EchoSpeak local lesson audio

Bundled MP3 files for lesson **Dinle** playback. Register mapped files in `src/data/lessonAudioAssets.ts` after adding audio here.

## Folder layout

Each lesson has its own folder under a category:

```
daily/morning-greeting/natural.mp3
cafe-restaurant/ordering-coffee/natural.mp3
travel/asking-for-directions/natural.mp3
```

Categories: `daily/`, `cafe-restaurant/`, `travel/`, `job-interview/`

## Required file (MVP)

| File           | Purpose                                      |
|----------------|----------------------------------------------|
| `natural.mp3`  | Default listen playback at natural speed     |

## Optional (future)

| File          | Purpose                    |
|---------------|----------------------------|
| `slow.mp3`    | Slower practice playback   |
| `native.mp3`  | Native-speed variant       |

## Production notes

- Audio is produced **externally** with licensed ElevenLabs voices.
- Do **not** commit API keys, `.env` secrets, or ElevenLabs project/source exports.
- Use **lowercase** folder and file names.
- Use **MP3** for MVP (compatible with Expo bundling).
- After placing files, add entries to `src/data/lessonAudioAssets.ts`.

## Current folders

### Daily
- `daily/morning-greeting/` — Morning Greeting (mapped)
- `daily/asking-how-someone-is/`
- `daily/asking-someone-to-repeat/`
- `daily/asking-for-help/`
- `daily/saying-you-dont-understand/`

### Cafe & restaurant
- `cafe-restaurant/ordering-coffee/`
- `cafe-restaurant/requesting-a-table/`

### Travel
- `travel/asking-for-directions/`
- `travel/checking-in-at-a-hotel/`

### Job interview
- `job-interview/introducing-yourself/`
