type Payload = Record<string, string | number | boolean | null | undefined>;
export type WeeklyReportAnalyticsEvent = 'weekly_report_viewed' | 'weekly_report_next_focus_tapped' | 'weekly_report_weak_words_tapped' | 'weekly_report_roleplay_tapped';
export function trackWeeklyReportEvent(event: WeeklyReportAnalyticsEvent, payload: Payload = {}): void {
  if (__DEV__) console.log('[Voira Analytics]', event, payload);
}
