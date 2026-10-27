import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Easing } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, WithTimingConfig } from 'react-native-reanimated';

interface FadeInProps {
  children: React.ReactNode;
  visible: boolean;
  duration?: number;
  delay?: number;
  style?: object;
}

const timingConfig: WithTimingConfig = {
  duration: 280,
  easing: Easing.out(Easing.ease),
};

export function FadeIn({ children, visible, duration = 280, delay = 0, style }: FadeInProps) {
  const opacity = useSharedValue(visible ? 1 : 0);
  const mounted = useRef(visible);

  useEffect(() => {
    if (visible) mounted.current = true;
    opacity.value = withTiming(visible ? 1 : 0, { ...timingConfig, duration, delay });
  }, [visible, opacity, duration, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible && !mounted.current) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle, style]} pointerEvents={visible ? 'auto' : 'none'}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
