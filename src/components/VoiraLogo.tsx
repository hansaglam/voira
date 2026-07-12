import React from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

const VOIRA_LOGO = require('../../assets/brand/voira-logo.png');

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

/** Transparent Voira V mark for brand surfaces (not the launcher icon). */
export function VoiraLogo({ size = 96, style, imageStyle }: Props) {
  const height = Math.round(size * 0.79);

  return (
    <View style={[styles.wrap, { width: size, height }, style]}>
      <Image
        source={VOIRA_LOGO}
        style={[{ width: size, height }, imageStyle]}
        resizeMode="contain"
        accessibilityLabel="Voira"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
