import { Linking } from 'react-native';
import { showAppFeedback } from '../components/dialog';

export async function openExternalLink(url: string): Promise<void> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      showAppFeedback({
        title: 'Bağlantı açılamadı',
        message: 'Lütfen daha sonra tekrar deneyin.',
        variant: 'error',
      });
      return;
    }
    await Linking.openURL(url);
  } catch {
    showAppFeedback({
      title: 'Bağlantı açılamadı',
      message: 'Lütfen daha sonra tekrar deneyin.',
      variant: 'error',
    });
  }
}
