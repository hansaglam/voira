/**
 * Public backend endpoint for lesson audio registry.
 * Production/internal builds should use HTTPS backend domain, not LAN IP:
 * EXPO_PUBLIC_AUDIO_REGISTRY_ENDPOINT=https://YOUR_BACKEND_DOMAIN/api/audio/registry
 */
export const AUDIO_REGISTRY_ENDPOINT =
  process.env.EXPO_PUBLIC_AUDIO_REGISTRY_ENDPOINT?.trim() ?? '';

export function isAudioRegistryEndpointConfigured(): boolean {
  return AUDIO_REGISTRY_ENDPOINT.length > 0;
}
