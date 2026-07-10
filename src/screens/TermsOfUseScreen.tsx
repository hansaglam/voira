import React from 'react';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';

type Props = RootScreenProps<'TermsOfUse'>;

export function TermsOfUseScreen(_props: Props) {
  return (
    <InfoScreenLayout
      title="Kullanım Şartları"
      subtitle="EchoSpeak dil pratiği uygulaması"
      sections={[
        {
          title: 'Amaç',
          body:
            'EchoSpeak, İngilizce konuşma pratiği ve shadowing çalışması için tasarlanmış bir dil öğrenme uygulamasıdır.',
        },
        {
          title: 'Skorlar ve geri bildirim',
          body:
            'Uygulamadaki skorlar ve koç yorumları öğrenme geri bildirimi amaçlıdır. Resmi bir dil yeterlilik belgesi veya sertifikasyon yerine geçmez.',
        },
        {
          title: 'Yapay zeka ve STT',
          body:
            'Konuşmadan metne ve otomatik geri bildirim sistemleri hata yapabilir. Analiz sonuçları rehber niteliğindedir; mükemmel telaffuz veya resmi değerlendirme garantisi verilmez.',
        },
        {
          title: 'SpeakPlus',
          body:
            'SpeakPlus premium içeriklere erişim, aktif satın alma veya geri yüklenmiş abonelik (entitlement) gerektirir. Abonelik ücretleri App Store veya Google Play hesabın üzerinden tahsil edilir; otomatik yenilenir ve mağaza ayarlarından yönetilebilir.',
        },
        {
          title: 'Kullanım',
          body:
            'Uygulamayı yalnızca yasal ve kişisel öğrenme amaçlı kullanmayı kabul edersin. Hizmet MVP aşamasında olduğu için özellikler önceden bildirilmeksizin değişebilir.',
        },
      ]}
    />
  );
}
