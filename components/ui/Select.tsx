import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Modal, ScrollView } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

export interface SelectOption {
  label: string;
  value: string | number;
}

interface SelectProps {
  label?: string;
  value: string | number;
  options: SelectOption[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  error?: boolean;
}

export function Select({ label, value, options, onChange, placeholder = 'Seleccionar', error }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => String(o.value) === String(value));
  const display = selected ? selected.label : placeholder;

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[Typography.caption, styles.label]}>{label}</Text>}
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.container, error && styles.errorBorder]}
      >
        <Text style={[Typography.body, !selected && styles.placeholder]}>{display}</Text>
        <ChevronDown size={18} color={Colors.text} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={[Typography.heading, styles.sheetTitle]}>{label || 'Seleccionar'}</Text>
            </View>
            <ScrollView style={styles.list}>
              {options.map((opt) => {
                const isActive = String(opt.value) === String(value);
                return (
                  <Pressable
                    key={String(opt.value)}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [styles.option, isActive && styles.optionActive, pressed && styles.optionPressed]}
                  >
                    <Text style={[Typography.body, isActive ? styles.optionActiveText : styles.optionText]}>
                      {opt.label}
                    </Text>
                    {isActive && <Check size={18} color={Colors.primary} strokeWidth={3} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { color: Colors.textSoft, marginBottom: 6, fontWeight: '600' },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.neutralBorder,
    borderRadius: Radius.input,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  placeholder: { color: Colors.disabledText },
  errorBorder: { borderColor: Colors.danger },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.cardLg,
    borderTopRightRadius: Radius.cardLg,
    maxHeight: '60%',
  },
  sheetHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutralBorder,
  },
  sheetTitle: { color: Colors.textDark, textAlign: 'center' },
  list: { paddingVertical: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionActive: { backgroundColor: 'rgba(13,110,253,0.06)' },
  optionPressed: { backgroundColor: Colors.tertiary },
  optionText: { color: Colors.textDark },
  optionActiveText: { color: Colors.primary, fontWeight: '700' },
});
