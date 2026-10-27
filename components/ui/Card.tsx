import React, { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow } from '@/constants/theme';

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  radius?: keyof typeof Radius;
  shadow?: keyof typeof Shadow;
  elevated?: boolean;
}

export function Card({
  children,
  style,
  onPress,
  radius = 'card',
  shadow = 'card',
  elevated = false,
}: CardProps) {
  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    { borderRadius: Radius[radius] },
    Shadow[shadow],
    elevated && styles.elevated,
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [containerStyle, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }
  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  elevated: {
    transform: [{ translateY: -2 }],
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.96,
  },
});
