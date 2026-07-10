import { Category } from './index';

export interface CategoryWithMeta extends Category {
  lessonCount: number;
  difficulty: string;
}
