import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

interface CheckboxProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  rightText?: string;
}

export function Checkbox({ label, description, checked, onChange, rightText }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [styles.container, checked && styles.checkedContainer, pressed && styles.pressed]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Check size={14} color={Colors.white} strokeWidth={3} />}
      </View>
      <View style={styles.text}>
        <Text style={[Typography.body, styles.label]}>{label}</Text>
        {description && <Text style={[Typography.caption, styles.description]}>{description}</Text>}
        {rightText && <Text style={[Typography.body, styles.rightText]}>{rightText}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: Colors.white,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  checkedContainer: {
    backgroundColor: 'rgba(13,110,253,0.05)',
    borderColor: Colors.primary,
  },
  pressed: { opacity: 0.85 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.neutralBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  boxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  text: { flex: 1 },
  label: { color: Colors.textDark, fontWeight: '500' },
  description: { color: Colors.text, marginTop: 2 },
  rightText: { color: Colors.primary, fontWeight: '700', marginTop: 2 },
});
