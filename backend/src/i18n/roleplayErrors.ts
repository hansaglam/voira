export const ROLEPLAY_ERROR_COPY: Record<string, string> = {
  ROLEPLAY_RATE_LIMITED: 'Çok fazla roleplay isteği gönderildi. Lütfen biraz sonra tekrar dene.',
  ROLEPLAY_SESSION_NOT_FOUND: 'Roleplay oturumu bulunamadı.',
  ROLEPLAY_SESSION_EXPIRED: 'Roleplay oturumunun süresi doldu.',
  ROLEPLAY_INVALID_TURN: 'Bu mesaj işlenemedi. Lütfen tekrar dene.',
  ROLEPLAY_AI_UNAVAILABLE: 'Roleplay şu anda kullanılamıyor. Lütfen daha sonra tekrar dene.',
  ROLEPLAY_ACCESS_DENIED: 'Bu roleplay senaryosuna erişimin yok.',
  ROLEPLAY_SESSION_ENDED: 'Roleplay oturumu sona erdi.',
  ROLEPLAY_TEXT_TOO_LONG: 'Mesaj çok uzun. Lütfen daha kısa bir yanıt dene.',
  ROLEPLAY_MAX_TURNS_REACHED: 'Bu oturum için maksimum tur sayısına ulaşıldı.',
  identity_required: 'Roleplay için kimlik doğrulaması gerekli.',
};

export function getRoleplayErrorCopy(code: string): string {
  return ROLEPLAY_ERROR_COPY[code] ?? 'Roleplay sırasında bir sorun oluştu. Lütfen tekrar dene.';
}
