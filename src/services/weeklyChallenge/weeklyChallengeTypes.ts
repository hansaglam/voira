export type WeeklyChallengeType = 'speaking_practices' | 'roleplay_sessions' | 'weak_word_practice' | 'retry_improvement' | 'practice_days';
export interface WeeklyChallenge {
  id: string;
  weekKey: string;
  type: WeeklyChallengeType;
  target: number;
  current: number;
  displayCurrent: number;
  status: 'active' | 'completed';
  titleId: string;
  descriptionId: string;
  rationaleId: string;
}
