import React from 'react';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';

type Props = RootScreenProps<'About'>;

const APP_VERSION = '1.0.0';

export function AboutScreen(_props: Props) {
  return (
    <InfoScreenLayout
      title="Uygulama hakkında"
      subtitle={`EchoSpeak v${APP_VERSION}`}
      sections={[
        {
          title: 'EchoSpeak nedir?',
          body:
            'EchoSpeak, shadowing yöntemiyle İngilizce konuşma pratiği yapmanı sağlayan bir mobil uygulamadır. Dinle, tekrar et ve geri bildirim al.',
        },
        {
          title: 'MVP sürümü',
          body:
            'Bu sürüm erken erişim (MVP) niteliğindedir. Geri bildirim kelime eşleşmesi ve akıcılık tahminine dayanır; detaylı telaffuz değerlendirmesi yakında eklenecektir.',
        },
        {
          title: 'SpeakPlus',
          body:
            'SpeakPlus, uygulama içi abonelik ile sunulan premium ders paketleri ve gelişmiş geri bildirimlerdir. Satın alımları Profil veya paywall ekranından geri yükleyebilirsin.',
        },
        {
          title: 'İletişim',
          body: 'Destek: support@echospeak.app',
        },
      ]}
    />
  );
}
