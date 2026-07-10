import { Lesson } from '../types/lesson';

export type LessonSegmentAudioAssets = {
  naturalLocalAudioAsset?: number;
  slowLocalAudioAsset?: number;
  nativeLocalAudioAsset?: number;
};

export type LessonAudioAssetMap = Record<string, Record<string, LessonSegmentAudioAssets>>;

/**
 * Local bundled lesson audio manifest.
 * Add new MP3 files under assets/audio/lessons/... (see assets/audio/lessons/README.md)
 * and register them here.
 */
export const lessonAudioAssets: LessonAudioAssetMap = {
  'daily-neighbor-greeting': {
    'daily-neighbor-greeting-s1': {
      naturalLocalAudioAsset: require('../../assets/audio/lessons/daily/morning-greeting/natural.mp3'),
    },
  },
};

if (__DEV__) {
  console.log('[EchoSpeak Audio Assets] mappedLessons:', Object.keys(lessonAudioAssets).length);
}

export function getLessonSegmentAudioAssets(
  lessonId: string,
  segmentId: string,
): LessonSegmentAudioAssets | undefined {
  return lessonAudioAssets[lessonId]?.[segmentId];
}

export function applyLessonAudioAssets(lessons: Lesson[]): Lesson[] {
  return lessons.map((lesson) => ({
    ...lesson,
    segments: lesson.segments.map((segment) => {
      const audioAssets = getLessonSegmentAudioAssets(lesson.id, segment.id);

      if (!audioAssets) {
        return segment;
      }

      return {
        ...segment,
        ...audioAssets,
      };
    }),
  }));
}

export function applyLessonAudioAssetToLesson(lesson: Lesson): Lesson {
  return applyLessonAudioAssets([lesson])[0];
}

export function validateLessonAudioAssets(catalog: Lesson[]): {
  mappedSegments: number;
  missingMappings: number;
  invalidMappings: string[];
} {
  const invalidMappings: string[] = [];
  const lessonsById = new Map(catalog.map((lesson) => [lesson.id, lesson]));

  for (const [lessonId, segments] of Object.entries(lessonAudioAssets)) {
    const lesson = lessonsById.get(lessonId);
    if (!lesson) {
      invalidMappings.push(`lesson:${lessonId}`);
      continue;
    }

    const segmentIds = new Set(lesson.segments.map((segment) => segment.id));
    for (const segmentId of Object.keys(segments)) {
      if (!segmentIds.has(segmentId)) {
        invalidMappings.push(`${lessonId}::${segmentId}`);
      }
    }
  }

  const mappedSegments = Object.values(lessonAudioAssets).reduce(
    (total, segments) => total + Object.keys(segments).length,
    0,
  );

  return {
    mappedSegments,
    missingMappings: invalidMappings.length,
    invalidMappings,
  };
}

export function logLessonAudioAssetValidation(catalog: Lesson[]): void {
  if (!__DEV__) return;

  const { mappedSegments, missingMappings, invalidMappings } =
    validateLessonAudioAssets(catalog);

  console.log('[EchoSpeak Audio Assets]', {
    mappedLessons: Object.keys(lessonAudioAssets).length,
    mappedSegments,
    missingMappings,
    ...(invalidMappings.length > 0 ? { invalidMappings } : {}),
  });
}
