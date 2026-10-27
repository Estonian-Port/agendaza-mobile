import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | boolean;
  touched?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  prefix?: ReactNode;
  suffix?: ReactNode;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  onBlur?: () => void;
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
  prefix,
  suffix,
  editable = true,
  multiline = false,
  numberOfLines = 1,
  style,
  onBlur,
}: InputProps) {
  const showError = !!error && touched;
  return (
    <View style={styles.wrapper}>
      {label && <Text style={[Typography.caption, styles.label]}>{label}</Text>}
      <View
        style={[
          styles.container,
          !editable && styles.disabled,
          showError && styles.errorBorder,
          style,
        ]}
      >
        {prefix && <View style={styles.prefix}>{prefix}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.disabledText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onBlur={onBlur}
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
