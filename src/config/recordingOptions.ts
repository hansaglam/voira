import {
  AudioQuality,
  IOSOutputFormat,
  RecordingPresets,
  type RecordingOptions,
} from 'expo-audio';
import { Platform } from 'react-native';

/**
 * Production-safe recording options.
 * iOS: MPEG4AAC .m4a mono (backend + STT compatible).
 * Android: HIGH_QUALITY preset + metering (unchanged encoder path).
 */
export function getVoiraRecordingOptions(): RecordingOptions {
  const base = RecordingPresets.HIGH_QUALITY;

  if (Platform.OS === 'ios') {
    return {
      ...base,
      extension: '.m4a',
      sampleRate: 44100,
      numberOfChannels: 1,
      bitRate: 128000,
      isMeteringEnabled: true,
      ios: {
        ...base.ios,
        extension: '.m4a',
        outputFormat: IOSOutputFormat.MPEG4AAC,
        audioQuality: AudioQuality.MAX,
        sampleRate: 44100,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    };
  }

  return {
    ...base,
    isMeteringEnabled: true,
  };
}
