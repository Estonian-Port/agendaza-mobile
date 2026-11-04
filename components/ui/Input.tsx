import React, { ReactNode, useRef, useState } from 'react';
import { findNodeHandle, Platform, StyleSheet, Text, TextInput, View, type TextInputInstance, type ViewStyle } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';
import { useKeyboardScrollFocus } from '@/components/ui/KeyboardScrollContext';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | boolean;
  touched?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  accessibilityLabel?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  onBlur?: () => void;
  onFocus?: (inputHandle: number) => void;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  touched,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize,
  autoCorrect,
  accessibilityLabel,
  prefix,
  suffix,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  style,
  onBlur,
  onFocus,
}: InputProps) {
  const inputRef = useRef<TextInputInstance>(null);
  const keyboardScrollFocus = useKeyboardScrollFocus();
  const [focused, setFocused] = useState(false);
  const showError = !!error && touched;
  return (
    <View style={styles.wrapper}>
      {label && <Text style={[Typography.caption, styles.label]}>{label}</Text>}
      <View
        style={[
          styles.container,
          !editable && styles.disabled,
          focused && styles.focused,
          showError && styles.errorBorder,
          style,
        ]}
      >
        {prefix && <View style={styles.prefix}>{prefix}</View>}
        <TextInput
          ref={inputRef}
          accessibilityLabel={accessibilityLabel ?? label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.disabledText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onFocus={() => {
            setFocused(true);
            if (Platform.OS === 'web') return;
            const input = inputRef.current;
            const inputHandle = findNodeHandle(input);
            if (input && inputHandle != null) {
              if (keyboardScrollFocus) keyboardScrollFocus(inputHandle, input);
              else onFocus?.(inputHandle);
            }
          }}
          style={[Typography.body, styles.input, !editable && styles.inputDisabled]}
        />
        {suffix && <View style={styles.suffix}>{suffix}</View>}
      </View>
      {showError && typeof error === 'string' && (
        <Text style={[Typography.micro, styles.errorText]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: {
    color: Colors.textSoft,
    marginBottom: 6,
    fontWeight: '600',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.neutralBorder,
    borderRadius: Radius.input,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    color: Colors.textDark,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  inputDisabled: {
    color: Colors.disabledText,
  },
  disabled: {
    backgroundColor: Colors.disabledBg,
  },
  focused: {
    borderColor: Colors.primary,
  },
  errorBorder: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    marginTop: 4,
  },
  prefix: { marginRight: 8 },
  suffix: { marginLeft: 8 },
});
