import React, { useEffect, useRef, useState } from 'react';
import { findNodeHandle, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';
import { useKeyboardScrollFocus } from '@/components/ui/KeyboardScrollContext';

interface StepperProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  editable?: boolean;
  onFocus?: (inputHandle: number) => void;
}

export function Stepper({ label, value, onChange, min = 0, max = 999, step = 1, editable = false, onFocus }: StepperProps) {
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<TextInputInstance>(null);
  const keyboardScrollFocus = useKeyboardScrollFocus();

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const updateValue = (nextValue: number) => {
    const boundedValue = Math.max(min, Math.min(max, nextValue));
    setDraft(String(boundedValue));
    onChange(boundedValue);
  };

  const dec = () => updateValue(value - step);
  const inc = () => updateValue(value + step);

  const handleTextChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    setDraft(digits);
    if (digits) onChange(Math.min(max, Number(digits)));
  };

  const commitDraft = () => {
    const parsedValue = Number(draft);
    updateValue(draft && Number.isFinite(parsedValue) ? parsedValue : min);
  };

  return (
    <View style={styles.wrapper}>
      {!!label && <Text style={[Typography.caption, styles.label]}>{label}</Text>}
      <View style={styles.container}>
        {!editable && (
          <Pressable onPress={dec} disabled={value <= min} style={[styles.btn, value <= min && styles.btnDisabled]}>
            <Text style={styles.btnText}>-</Text>
          </Pressable>
        )}
        {editable ? (
          <TextInput
            ref={inputRef}
            accessibilityLabel={label}
            keyboardType="number-pad"
            value={draft}
            onChangeText={handleTextChange}
            onFocus={() => {
              const input = inputRef.current;
              const inputHandle = findNodeHandle(input);
              if (input && inputHandle != null) {
                if (keyboardScrollFocus) keyboardScrollFocus(inputHandle, input);
                else onFocus?.(inputHandle);
              }
            }}
            onBlur={commitDraft}
            style={[Typography.heading, styles.value]}
          />
        ) : (
          <Text style={[Typography.heading, styles.value]}>{value}</Text>
        )}
        {!editable && (
          <Pressable onPress={inc} disabled={value >= max} style={[styles.btn, value >= max && styles.btnDisabled]}>
            <Text style={styles.btnText}>+</Text>
          </Pressable>
        )}
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
