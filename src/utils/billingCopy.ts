/**
 * Default / web fallback billing copy.
 * Avoids naming a competing mobile store so shared bundles stay review-safe.
 */

export function getBillingStoreName(): string {
  return 'uygulama mağazası';
}

export function getManageSubscriptionsUrl(): string {
  return 'https://apps.apple.com/account/subscriptions';
}

export function getManageSubscriptionText(): string {
  return 'Aboneliğini uygulama mağazası hesabından yönetebilirsin.';
}

export function getManageSubscriptionCancelText(): string {
  return 'Aboneliğini uygulama mağazası hesap ayarlarından yönetebilir ya da iptal edebilirsin.';
}

export function getPremiumCancelNote(): string {
  return 'Aboneliğini uygulama mağazası hesap ayarlarından yönetebilir ya da iptal edebilirsin. Abonelik otomatik yenilenir.';
}

export function getAboutSpeakPlusBody(): string {
  return 'SpeakPlus, uygulama içi abonelik ile sunulan premium ders paketleri ve gelişmiş geri bildirimlerdir. Abonelik ödemeleri uygulama mağazası hesabın üzerinden yönetilir. Satın alımları Profil veya paywall ekranından geri yükleyebilirsin.';
}

export function getTermsSpeakPlusBody(): string {
  return 'SpeakPlus abonelikleri uygulama mağazası üzerinden faturalandırılır. Fiyat ve yenileme koşulları satın almadan önce gösterilir. İptal ve iadeler ilgili mağaza politikalarına tabidir. Uygulamayı silmek veya veri silme talebi aboneliği iptal etmez; aboneliğini uygulama mağazası hesap ayarlarından yönetebilir ya da iptal edebilirsin.';
}

export function getPrivacyCollectedBody(): string {
  return 'Hesap bilgileri (e-posta, kimlik doğrulama/kullanıcı ID), profil ve ilerleme (ders ilerlemesi, streak, pratik istatistikleri, kaydedilen kelimeler), yalnızca sen kayıt aldığında ses kayıtları, telaffuz analizi sonuçları (skorlar, kelimeler, akıcılık/doğruluk/tamamlama vb.), SpeakPlus abonelik/entitlement durumu (uygulama mağazası / RevenueCat) ve uygulama sürümü ile temel tanı/hata bilgileri.';
}

export function getPrivacyThirdPartyBody(): string {
  return 'Supabase (kimlik doğrulama / veri), RevenueCat (abonelik entitlement), uygulama mağazası (ödemeler), Microsoft Azure Speech (konuşma tanıma ve telaffuz değerlendirmesi), OpenAI (backend etkinse kayıtlı ses üzerinde speech-to-text/transcription ve AI koç geri bildirimi / açıklamalar / öğrenme rehberliği), Render (backend barındırma). Bu hizmetler yalnızca uygulama işlevi için gerekli ölçüde veri işler.';
}

export function getPrivacyPaymentsBody(): string {
  return 'Abonelik ödemeleri uygulama mağazası hesabın üzerinden yönetilir. Voira kredi/banka kartı numaralarını almaz veya saklamaz. Aboneliğini uygulama mağazası hesap ayarlarından yönetebilir ya da iptal edebilirsin. SpeakPlus erişimi RevenueCat ve ilgili mağaza entitlement durumuna göre yönetilir.';
}

export function getPrivacyRetentionBody(): string {
  return 'Yerel veriler cihazında silinene veya uygulama kaldırılana kadar kalabilir. Hesap/ilerleme/satın alma kayıtları hizmeti sunmak, yasal yükümlülükler, kötüye kullanımın önlenmesi veya abonelik erişimi için gerekli olduğu sürece tutulabilir. Hesap ve veri silme talebi için Voira Destek’e yaz; abonelik iptali ayrıdır (uygulama mağazası). Detaylar için Veri Silme sayfasını açabilirsin.';
}

export function getDataDeletionLocalResetMessage(): string {
  return 'Bu işlem yalnızca bu cihazdaki pratik geçmişini, skorları ve günlük oturum kayıtlarını siler. Hesap silme talebi değildir. Profil tercihlerin korunur. Aktif bir aboneliği iptal etmez.';
}

export function getDataDeletionSubscriptionNote(): string {
  return 'Uygulama hesabını veya uygulama verilerini silmek, aktif SpeakPlus aboneliğini iptal etmez. Faturalandırmayı durdurmak için aboneliğini uygulama mağazası hesap ayarlarından iptal et.';
}

export function getDataDeletionSpeakPlusNote(): string {
  return 'Uygulama hesabını veya uygulama verilerini silmek, aktif SpeakPlus aboneliğini iptal etmez. SpeakPlus’ı durdurmak için aboneliğini uygulama mağazası hesap ayarlarından iptal et.';
}

export function getDataDeletionMayRemainBody(): string {
  return 'Uygulama mağazası / RevenueCat işlem veya entitlement kayıtları, kimliği belli olmayan günlükler ve yalnızca cihazında kalan veriler (uygulama verisi temizlenene veya uygulama kaldırılana kadar).';
}

/** Shown in the in-app account deletion confirmation (Guideline 5.1.1(v)). */
export function getAccountDeletionSubscriptionWarning(): string {
  return 'Hesabını silmek aboneliğini otomatik iptal etmez. Aktif aboneliğini uygulama mağazası hesap ayarlarından yönetebilirsin.';
}

export function getAccountDeletionConfirmBody(): string {
  return `Bu işlem hesabını ve Voira’daki kişisel verilerini kalıcı olarak siler. ${getAccountDeletionSubscriptionWarning()}`;
}
