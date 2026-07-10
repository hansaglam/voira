import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from 'expo-audio';
import { ENABLE_ANALYSIS_RESULT_SOUND } from '../../config/soundConfig';

const ANALYSIS_COMPLETE_SOUND = require('../../../assets/sounds/analysis-complete.mp3');

let effectPlayer: AudioPlayer | null = null;
let audioModeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;

  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
  });
  audioModeReady = true;
}

function getOrCreateEffectPlayer(): AudioPlayer {
  if (!effectPlayer) {
    effectPlayer = createAudioPlayer(null, { updateInterval: 250 });
  }
  return effectPlayer;
}

export async function playAnalysisCompleteSound(): Promise<void> {
  if (!ENABLE_ANALYSIS_RESULT_SOUND) return;

  try {
    await ensureAudioMode();

    const player = getOrCreateEffectPlayer();
    player.replace(ANALYSIS_COMPLETE_SOUND);
    player.setPlaybackRate(1, 'medium');
    player.seekTo(0);
    player.play();
  } catch (error) {
    if (__DEV__) {
      console.warn('[EchoSpeak Sound] analysis-complete playback failed', error);
    }
  }
}

export function releaseAnalysisCompleteSound(): void {
  if (!effectPlayer) return;

  try {
    effectPlayer.pause();
    effectPlayer.remove();
  } catch {
    // Player may already be released.
  }

  effectPlayer = null;
}
