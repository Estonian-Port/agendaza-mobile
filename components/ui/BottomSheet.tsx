import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, KeyboardAvoidingView, Modal, PanResponder, Platform, StyleSheet, View, Pressable, ScrollView, type ScrollViewInstance } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/theme';
import { Text } from 'react-native';
import { KeyboardScrollProvider } from '@/components/ui/KeyboardScrollContext';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: string | number;
}

export function BottomSheet({ open, onClose, title, children, height = '65%' }: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const contentScrollY = useRef(0);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx) && (gesture.y0 <= 200 || contentScrollY.current <= 0),
    onMoveShouldSetPanResponder: (_, gesture) =>
      gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx) && (gesture.y0 <= 200 || contentScrollY.current <= 0),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 60 || (gesture.dy > 24 && gesture.vy > 0.25)) {
        onClose();
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
      }
    },
    onPanResponderTerminate: (_, gesture) => {
      if (gesture.dy > 60 || (gesture.dy > 24 && gesture.vy > 0.25)) {
        onClose();
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
      }
    },
  }), [onClose, translateY]);

  useEffect(() => {
    if (open) translateY.setValue(0);
  }, [open, translateY]);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" />
        <Animated.View {...panResponder.panHandlers} style={[styles.sheet, { height, transform: [{ translateY }] }]}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
            <View style={styles.header}>
              <Text style={[Typography.heading, styles.title]}>{title}</Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={Colors.text} />
              </Pressable>
            </View>
          <View style={styles.divider} />
          <KeyboardAvoidingView
            style={styles.keyboardAvoiding}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              ref={scrollRef}
              style={styles.content}
              showsVerticalScrollIndicator={false}
              onScroll={(event) => { contentScrollY.current = event.nativeEvent.contentOffset.y; }}
              scrollEventThrottle={16}
            >
              <KeyboardScrollProvider scrollRef={scrollRef}>
                {children}
              </KeyboardScrollProvider>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.cardLg,
    borderTopRightRadius: Radius.cardLg,
  },
  handleArea: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.neutralBorder,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { color: Colors.textDark, fontSize: 18 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.neutralBorder,
  },
  keyboardAvoiding: { flex: 1 },
  content: {
    padding: 20,
  },
});
