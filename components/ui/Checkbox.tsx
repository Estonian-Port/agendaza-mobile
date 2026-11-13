import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Pencil } from 'lucide-react-native';
import { Colors, Radius, Typography } from '@/constants/theme';

interface CheckboxProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  rightText?: string;
  priceValue?: number;
  priceMultiplier?: number;
  priceInputAccessoryViewID?: string;
  onPriceChange?: (price: number) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

export function PriceEditor({
  value,
  multiplier = 1,
  inputAccessoryViewID,
  onChange,
}: {
  value: number;
  multiplier?: number;
  inputAccessoryViewID?: string;
  onChange: (price: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [editing, value]);

  const updatePrice = (text: string) => {
    setDraft(text);
    const normalized = text.replace(',', '.');
    if (!normalized.trim()) return;
    const nextPrice = Number(normalized);
    if (Number.isFinite(nextPrice) && nextPrice >= 0) onChange(nextPrice);
  };

  if (editing) {
    return (
      <View style={styles.priceEditor}>
        <Text style={styles.priceSymbol}>$</Text>
        <TextInput
          accessibilityLabel="Editar precio"
          autoFocus
          keyboardType="decimal-pad"
          inputAccessoryViewID={inputAccessoryViewID}
          value={draft}
          onChangeText={updatePrice}
          onBlur={() => setEditing(false)}
          onSubmitEditing={() => setEditing(false)}
          selectTextOnFocus
          style={styles.priceInput}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Aceptar precio" onPress={() => setEditing(false)} hitSlop={8}>
          <Check size={17} color={Colors.primary} strokeWidth={2.5} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.priceEditor}>
      <Text style={styles.rightText}>{formatCurrency(value * multiplier)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Editar precio"
        onPress={() => {
          setDraft(String(value));
          setEditing(true);
        }}
        hitSlop={8}
        style={styles.editPriceButton}
      >
        <Pencil size={14} color={Colors.primary} />
      </Pressable>
    </View>
  );
}

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  rightText,
  priceValue,
  priceMultiplier,
  priceInputAccessoryViewID,
  onPriceChange,
}: CheckboxProps) {
  return (
    <View style={[styles.container, checked && styles.checkedContainer]}>
      <Pressable onPress={() => onChange(!checked)} style={({ pressed }) => [styles.selection, pressed && styles.pressed]}>
        <View style={[styles.box, checked && styles.boxChecked]}>
          {checked && <Check size={14} color={Colors.white} strokeWidth={3} />}
        </View>
        <View style={styles.text}>
          <Text style={[Typography.body, styles.label]}>{label}</Text>
          {rightText && priceValue === undefined && <Text style={[Typography.body, styles.rightText]}>{rightText}</Text>}
        </View>
      </Pressable>
      {priceValue !== undefined && onPriceChange && (
        <PriceEditor value={priceValue} multiplier={priceMultiplier} inputAccessoryViewID={priceInputAccessoryViewID} onChange={onPriceChange} />
      )}
    </View>
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
  selection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
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
  priceEditor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  editPriceButton: { padding: 3 },
  priceSymbol: { color: Colors.text, fontSize: 13 },
  priceInput: {
    width: 76,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: Colors.neutralBorder,
    borderRadius: 4,
    color: Colors.textDark,
    textAlign: 'right',
    fontSize: 13,
  },
});
