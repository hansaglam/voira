import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../components';
import { colors, spacing } from '../../theme';

interface SpeakingTestCTAProps {
  disabled: boolean;
  onPress: () => void;
  showHint?: boolean;
}

export function SpeakingTestCTA({ disabled, onPress, showHint }: SpeakingTestCTAProps) {
  return (
    <View style={styles.container}>
      {showHint && (
        <Text style={styles.hint}>Analizin hazır — devam edebilirsin</Text>
      )}
      <AppButton
        title="İlk analizimi gör"
        size="compact"
        disabled={disabled}
        elevated={!disabled}
        onPress={onPress}
        style={styles.button}
        trailingIcon={
          !disabled ? (
            <Ionicons name="arrow-forward" size={16} color={colors.textPrimary} />
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  hint: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: 0.1,
  },
  button: {
    width: '100%',
    maxWidth: 340,
  },
});
