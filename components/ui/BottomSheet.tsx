import React from 'react';
import { Modal, StyleSheet, View, Pressable, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/theme';
import { Text } from 'react-native';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  height?: string | number;
}

export function BottomSheet({ open, onClose, title, children, height = '65%' }: BottomSheetProps) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" />
        <View style={[styles.sheet, { height }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[Typography.heading, styles.title]}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={Colors.text} />
            </Pressable>
          </View>
          <View style={styles.divider} />
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
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
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.neutralBorder,
    alignSelf: 'center',
    marginTop: 8,
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
  content: {
    padding: 20,
  },
});
