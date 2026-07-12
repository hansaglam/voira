import React from 'react';
import { RootScreenProps } from '../navigation/types';
import { InfoScreenLayout } from '../components/InfoScreenLayout';

type Props = RootScreenProps<'PrivacyPolicy'>;

export function PrivacyPolicyScreen(_props: Props) {
  return (
    <InfoScreenLayout
      title="Gizlilik Politikası"
      subtitle="Voira MVP sürümü için özet bilgilendirme"
      sections={[
        {
          title: 'Ses kayıtları',
          body:
            'Voira yalnızca kayıt düğmesine bastığında ses kaydı alır. Kayıt, analiz tamamlanana kadar cihazında tutulur ve analiz sunucusuna gönderilir.',
        },
        {
          title: 'Analiz sunucusu',
          body:
            'Konuşma analizi için ses dosyan, konuşmadan metne (STT) ve geri bildirim üretimi amacıyla yapılandırılmış analiz sunucusuna iletilebilir. MVP sürümünde kalıcı bir ses arşivi sunulmaz; ses dosyaları uzun süreli saklanmaz.',
        },
        {
          title: 'İlerleme verileri',
          body:
            'Skorlar, tamamlanan dersler, zayıf alanlar ve pratik geçmişi gibi öğrenme verileri uygulama içinde işlenebilir. Bu veriler kişiselleştirilmiş geri bildirim ve ilerleme ekranları için kullanılır.',
        },
        {
          title: 'Veri satışı',
          body: 'Voira kullanıcı verilerini satmaz.',
        },
        {
          title: 'İletişim',
          body:
            'Gizlilik veya veri talepleri için destek ekibine yazabilirsin: support@echospeak.app',
        },
        {
          title: 'Güncellemeler',
          body:
            'Resmi bir hesap sistemi veya bulut senkronizasyonu eklendiğinde bu politika güncellenecektir.',
        },
      ]}
    />
  );
}
