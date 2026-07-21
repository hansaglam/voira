import { Platform } from 'react-native';
import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

/** Brief delay after prepareToRecordAsync so iOS AVAudioSession is ready. */
export const IOS_RECORD_START_DELAY_MS = 150;

/** Brief delay after stop() before reading the file URI/size on iOS. */
export const IOS_POST_STOP_SETTLE_MS = 150;

export async function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function configureAudioSessionForRecording(): Promise<void> {
  if (Platform.OS === 'ios') {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
      shouldPlayInBackground: false,
      interruptionMode: 'doNotMix',
      shouldRouteThroughEarpiece: false,
    });
    return;
  }

  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
    shouldPlayInBackground: false,
  });
}

export async function configureAudioSessionForPlayback(): Promise<void> {
  if (Platform.OS === 'ios') {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
      shouldRouteThroughEarpiece: false,
    });
    return;
  }

  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
    shouldPlayInBackground: false,
  });
}
