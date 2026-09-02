import * as Speech from 'expo-speech';

export type RoleplaySpeechCallbacks = {
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

export async function stopRoleplaySpeech(): Promise<void> {
  await Speech.stop();
}

export async function speakRoleplayReply(
  text: string,
  callbacks: RoleplaySpeechCallbacks = {},
): Promise<void> {
  await Speech.stop();
  Speech.speak(text, {
    language: 'en-US',
    pitch: 1,
    rate: 0.95,
    onStart: callbacks.onStart,
    onDone: callbacks.onDone,
    onStopped: callbacks.onStopped,
    onError: callbacks.onError,
  });
}
