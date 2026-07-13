import { Alert, Linking } from 'react-native';

export async function openExternalLink(url: string): Promise<void> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Bağlantı açılamadı', 'Lütfen daha sonra tekrar deneyin.');
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert('Bağlantı açılamadı', 'Lütfen daha sonra tekrar deneyin.');
  }
}
