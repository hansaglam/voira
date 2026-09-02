import fs from 'fs';

const p = 'src/screens/PremiumScreen.tsx';
let s = fs.readFileSync(p, 'utf8');

const reps = [
  ['>Satın alımları geri yükle</Text>', '>{t("premium.restore")}</Text>'],
  ["'SpeakPlus aktif'", 't("premium.titleActive")'],
  ['>SpeakPlus aktif</Text>', '>{t("premium.titleActive")}</Text>'],
  [
    '>İngilizce konuşmanı bir üst seviyeye taşı</Text>',
    '>{t("premium.titleUpsell")}</Text>',
  ],
  [
    ">Yıllık SpeakPlus'u Başlat<",
    '>{t("premium.ctaStartYearly")}<',
  ],
  [
    ">Aylık SpeakPlus'u Başlat<",
    '>{t("premium.ctaStartMonthly")}<',
  ],
  [">SpeakPlus'u Başlat<", '>{t("premium.ctaStart")}<'],
  ['>İşleniyor...</Text>', '>{t("premium.ctaProcessing")}</Text>'],
  ['>Şimdilik devam et</Text>', '>{t("premium.skip")}</Text>'],
  ['>Gizlilik Politikası</Text>', '>{t("premium.legalPrivacy")}</Text>'],
  ['>Kullanım Şartları</Text>', '>{t("premium.legalTerms")}</Text>'],
  ['>Tekrar dene</Text>', '>{t("premium.retry")}</Text>'],
  ['>Paketler yüklenemedi</Text>', '>{t("premium.fallbackTitle")}</Text>'],
  ['>En avantajlı</Text>', '>{t("premium.popular")}</Text>'],
  ['>Fiyat yükleniyor...</Text>', '>{t("premium.priceLoading")}</Text>'],
  ['>/ yıl</Text>', '>{t("premium.periodYear")}</Text>'],
  ['>/ ay</Text>', '>{t("premium.periodMonth")}</Text>'],
  ['label: \'Satın alımları geri yükle\'', 'label: t("premium.restore")'],
  ['label: \'Vazgeç\'', 'label: t("premium.cancel")'],
];

for (const [a, b] of reps) {
  if (!s.includes(a)) console.log('MISS', a.slice(0, 60));
  else s = s.split(a).join(b);
}

fs.writeFileSync(p, s);
console.log('premium patched');
