import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  DelayOption,
  formatDelayLabel,
  PlaybackSpeed,
  PLAYBACK_SPEED_LABELS,
  ShadowingPracticeMode,
  SHADOWING_MODE_LABELS,
} from '../types/practiceMethodology';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';

const ALL_MODES: ShadowingPracticeMode[] = [
  'repeat_after_me',
  'shadowing',
  'delay_repeat',
  'blind_shadowing',
];

interface PracticePlaybackControlsProps {
  playbackSpeed: PlaybackSpeed;
  playbackSpeeds: PlaybackSpeed[];
  onPlaybackSpeedChange: (speed: PlaybackSpeed) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  delayMs: DelayOption;
  delayOptions: DelayOption[];
  onDelayChange: (delay: DelayOption) => void;
  shadowingMode: ShadowingPracticeMode;
  availableModes: ShadowingPracticeMode[];
  onShadowingModeChange: (mode: ShadowingPracticeMode) => void;
  onLockedModePress?: (mode: ShadowingPracticeMode) => void;
  showModeSelector?: boolean;
  secondaryMeta?: string[];
}

export function PracticePlaybackControls({
  playbackSpeed,
  playbackSpeeds = [],
  onPlaybackSpeedChange,
  isLooping,
  onToggleLoop,
  delayMs,
  delayOptions,
  onDelayChange,
  shadowingMode,
  availableModes,
  onShadowingModeChange,
  onLockedModePress,
  showModeSelector = false,
  secondaryMeta = [],
}: PracticePlaybackControlsProps) {
  const [expanded, setExpanded] = useState(false);

  // Future: connect playback speed to real audio engine.
  // Future: smart loop current segment with selected delay.
  const safeSpeeds =
    playbackSpeeds.length > 0 ? playbackSpeeds : ([0.7, 0.85, 1.0] as PlaybackSpeed[]);
  const safeDelayOptions =
    delayOptions.length > 0 ? delayOptions : ([0, 2000] as DelayOption[]);
  const delayIndex = safeDelayOptions.indexOf(delayMs);

  const cycleDelay = () => {
    const next = safeDelayOptions[(delayIndex + 1) % safeDelayOptions.length];
    onDelayChange(next);
  };

  const speedLabel = PLAYBACK_SPEED_LABELS[playbackSpeed];
  const loopLabel = isLooping ? 'Döngü açık' : 'Döngü kapalı';
  const delayLabel = delayMs === 0 ? 'Bekleme 0 sn' : `Bekleme ${formatDelayLabel(delayMs)}`;

  const visibleModes = showModeSelector
    ? ALL_MODES.filter((mode) => availableModes.includes(mode))
    : [];
  const hasLockedModes = showModeSelector && visibleModes.length < ALL_MODES.length;

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.header} onPress={() => setExpanded((v) => !v)}>
        <View style={styles.headerLeft}>
          <Ionicons name="options-outline" size={13} color={colors.secondary} />
          <Text style={styles.headerTitle}>Pratik ayarları</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.textMuted}
        />
      </Pressable>

      {!expanded ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryPill}>Hız {speedLabel}</Text>
          <Text style={styles.summaryPill}>{loopLabel}</Text>
          <Text style={styles.summaryPill}>{delayLabel}</Text>
        </View>
      ) : (
        <View style={styles.expandedBody}>
          {secondaryMeta.length > 0 ? (
            <View style={styles.metaRow}>
              {secondaryMeta.map((label, index) => (
                <Text key={`${label}-${index}`} style={styles.metaPill}>
                  {label}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={styles.groupLabel}>Hız</Text>
            <View style={styles.chipRow}>
              {safeSpeeds.map((speed) => (
                <Pressable
                  key={speed}
                  style={[styles.chip, playbackSpeed === speed && styles.chipActive]}
                  onPress={() => onPlaybackSpeedChange(speed)}
                >
                  <Text
                    style={[styles.chipText, playbackSpeed === speed && styles.chipTextActive]}
                  >
                    {PLAYBACK_SPEED_LABELS[speed]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.row}>
            <Pressable
              style={[styles.actionChip, isLooping && styles.chipActive]}
              onPress={onToggleLoop}
            >
              <Ionicons
                name="repeat"
                size={11}
                color={isLooping ? colors.textPrimary : colors.textMuted}
              />
              <Text style={[styles.chipText, isLooping && styles.chipTextActive]}>Döngü</Text>
            </Pressable>

            <Pressable style={styles.actionChip} onPress={cycleDelay}>
              <Ionicons name="timer-outline" size={11} color={colors.textMuted} />
              <Text style={styles.chipText}>{delayLabel}</Text>
            </Pressable>
          </View>

          {showModeSelector && visibleModes.length > 0 ? (
            <View style={styles.row}>
              <Text style={styles.groupLabel}>Mod</Text>
              <View style={styles.chipRow}>
                {visibleModes.map((mode) => (
                  <Pressable
                    key={mode}
                    style={[styles.chip, shadowingMode === mode && styles.chipActive]}
                    onPress={() => onShadowingModeChange(mode)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        shadowingMode === mode && styles.chipTextActive,
                      ]}
                    >
                      {SHADOWING_MODE_LABELS[mode]}
                    </Text>
                  </Pressable>
                ))}
                {hasLockedModes ? (
                  <Pressable
                    style={styles.plusChip}
                    onPress={() => onLockedModePress?.('blind_shadowing')}
                  >
                    <Ionicons name="diamond-outline" size={10} color={colors.premium} />
                    <Text style={styles.plusChipText}>Plus</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(58, 59, 82, 0.65)',
    backgroundColor: 'rgba(26, 27, 46, 0.45)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingBottom: spacing.sm,
  },
  summaryPill: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    backgroundColor: 'rgba(91, 95, 239, 0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(91, 95, 239, 0.16)',
    overflow: 'hidden',
  },
  expandedBody: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(58, 59, 82, 0.5)',
    paddingTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  metaPill: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.14)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  groupLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    minWidth: 24,
    letterSpacing: 0.2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    flex: 1,
  },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(58, 59, 82, 0.8)',
    backgroundColor: 'rgba(26, 27, 46, 0.6)',
  },
  chipActive: {
    borderColor: 'rgba(91, 95, 239, 0.35)',
    backgroundColor: 'rgba(91, 95, 239, 0.12)',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(58, 59, 82, 0.8)',
    backgroundColor: 'rgba(26, 27, 46, 0.6)',
  },
  plusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.22)',
    backgroundColor: 'rgba(196, 181, 253, 0.06)',
  },
  plusChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.premium,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.textPrimary,
  },
});
