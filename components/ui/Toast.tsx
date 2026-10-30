import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Colors, Radius } from '@/constants/theme';

interface ToastProps {
  message: string;
  onDismiss: () => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const useNativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver }).start();
    const timeout = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver }).start(({ finished }) => {
        if (finished) onDismiss();
      });
    }, 2200);

    return () => {
      clearTimeout(timeout);
      opacity.stopAnimation();
    };
  }, [onDismiss, opacity, useNativeDriver]);

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View accessibilityRole="alert" style={[styles.toast, { opacity }]}>
        <Check size={18} color={Colors.white} strokeWidth={2.5} />
        <Text style={styles.message}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 18,
    zIndex: 10,
  },
  toast: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    borderRadius: Radius.button,
    backgroundColor: Colors.success,
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  message: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.white },
});