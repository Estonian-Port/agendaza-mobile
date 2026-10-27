import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

interface StepperProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function Stepper({ label, value, onChange, min = 0, max = 999, step = 1 }: StepperProps) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));

  return (
    <View style={styles.wrapper}>
      <Text style={[Typography.caption, styles.label]}>{label}</Text>
      <View style={styles.container}>
        <Pressable onPress={dec} disabled={value <= min} style={[styles.btn, value <= min && styles.btnDisabled]}>
          <Text style={styles.btnText}>-</Text>
        </Pressable>
        <Text style={[Typography.heading, styles.value]}>{value}</Text>
        <Pressable onPress={inc} disabled={value >= max} style={[styles.btn, value >= max && styles.btnDisabled]}>
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  label: { color: Colors.textSoft, marginBottom: 6, fontWeight: '600' },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.neutralBorder,
    padding: 4,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: Radius.button,
    backgroundColor: 'rgba(13,110,253,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: Colors.primary, fontSize: 22, fontWeight: '700' },
  value: { color: Colors.textDark, flex: 1, textAlign: 'center' },
});
