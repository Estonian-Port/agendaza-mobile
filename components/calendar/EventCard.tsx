import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Shadow } from '@/constants/theme';

interface EventCardProps {
  title: string;
  code?: string;
  start: string;
  end: string;
  status?: string;
  color?: string;
  accessory?: ReactNode;
  onPress: () => void;
}

export function EventCard({ title, code, start, end, status, color, accessory, onPress }: EventCardProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={[styles.marker, { backgroundColor: color ?? Colors.primary }]} />
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        {code ? <Text style={styles.meta}>Código {code}</Text> : null}
        <Text style={styles.meta}>Inicio {start.slice(11, 16)} · Fin {end.slice(11, 16)}</Text>
      </View>
      {accessory ?? (status ? <Text style={styles.status}>{status}</Text> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: Colors.borderSoft,
    borderRadius: Radius.button,
    backgroundColor: Colors.white,
    ...Shadow.soft,
  },
  marker: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  content: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark },
  meta: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.text },
  status: { fontFamily: 'Inter-Medium', fontSize: 10, color: Colors.neutralText },
});
