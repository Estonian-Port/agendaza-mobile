import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Download, Pencil, Plus, Receipt, Trash2 } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Colors, Radius } from '@/constants/theme';
import { gastoService } from '@/services/gasto.service';
import { pagoService } from '@/services/pago.service';
import { EventoVer, Gasto, Pago, EstadoCuentaEvento } from '@/types/domain';

type MovementType = 'PAGO' | 'GASTO';

interface EventAccountSheetProps {
  open: boolean;
  embedded?: boolean;
  event: EventoVer | null;
  refreshKey: number;
  showMovement?: boolean;
  movementTitle?: string;
  movementContent?: React.ReactNode;
  onClose: () => void;
  onAddMovement: (type: MovementType) => void;
  onEditPayment: (payment: Pago) => void;
  onEditExpense: (expense: Gasto) => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatOption(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export function EventAccountSheet({ open, embedded = false, event, refreshKey, showMovement = false, movementTitle, movementContent, onClose, onAddMovement, onEditPayment, onEditExpense }: EventAccountSheetProps) {
  const [account, setAccount] = useState<EstadoCuentaEvento | null>(null);
  const [payments, setPayments] = useState<Pago[]>([]);
  const [expenses, setExpenses] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  useEffect(() => {
    if (!open || !event) return;
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      pagoService.getEstadoCuentaEvento(event.id),
      pagoService.getAllByEvento(event.id),
      gastoService.getAllByEvento(event.id),
    ])
      .then(([loadedAccount, loadedPayments, loadedExpenses]) => {
        if (!active) return;
        setAccount(loadedAccount);
        setPayments(loadedPayments);
        setExpenses(loadedExpenses);
      })
      .catch((cause) => {
        if (active) setError(errorText(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, event?.id, refreshKey, localRefreshKey]);

  const deletePayment = (payment: Pago) => {
    Alert.alert('Eliminar pago', '¿Querés eliminar este pago?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void removePayment(payment.id) },
    ]);
  };

  const removePayment = async (id: number) => {
    setBusyId(id);
    setError('');
    try {
      await pagoService.delete(id);
      setLocalRefreshKey((current) => current + 1);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusyId(null);
    }
  };

  const deleteExpense = (expense: Gasto) => {
    Alert.alert('Eliminar gasto', '¿Querés eliminar este gasto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void removeExpense(expense.id) },
    ]);
  };

  const removeExpense = async (id: number) => {
    setBusyId(id);
    setError('');
    try {
      await gastoService.delete(id);
      setLocalRefreshKey((current) => current + 1);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusyId(null);
    }
  };

  const downloadReceipt = async (payment: Pago) => {
    setBusyId(payment.id);
    setError('');
    try {
      const receipt = await pagoService.descargarComprobante(payment.id);
      const filename = `comprobante-pago-${payment.id}.pdf`;
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(receipt);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const file = new File(Paths.cache, `${Date.now()}-${filename}`);
      file.write(new Uint8Array(await receipt.arrayBuffer()));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Comprobante descargado', file.uri);
      }
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusyId(null);
    }
  };

  const totalPaid = payments.reduce((total, payment) => total + payment.monto, 0);
  const totalOwed = (account?.precioTotal ?? 0) - totalPaid;
  const totalExpenses = expenses.reduce((total, expense) => total + expense.monto, 0);

  const content = (
    <>
      {showMovement ? movementContent : loading ? <ActivityIndicator color={Colors.primary} style={styles.loader} /> : (
        <>
          <View style={styles.eventHeading}>
            <Text style={styles.eventName}>{account?.nombre ?? event?.nombre}</Text>
            <Text style={styles.eventMeta}>{account?.codigo ?? event?.codigo} · {formatDate(account?.fechaEvento ?? event?.inicio ?? '')}</Text>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryItem label="Total del evento" value={account?.precioTotal ?? 0} />
            <SummaryItem label="Pagos realizados" value={totalPaid} />
            <SummaryItem label="Total faltante" value={totalOwed} emphasized />
            <SummaryItem label="Total de gastos" value={totalExpenses} />
          </View>

          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Pagos</Text>
            <Text style={styles.sectionTotal}>{payments.length}</Text>
          </View>
          {payments.length === 0 ? <Text style={styles.emptyText}>Todavía no hay pagos registrados.</Text> : payments.map((payment) => (
            <View key={payment.id} style={styles.movementRow}>
              <View style={styles.movementInfo}>
                <Text style={styles.movementAmount}>{formatCurrency(payment.monto)}</Text>
                <Text style={styles.movementMeta}>{formatOption(payment.concepto)} · {formatOption(payment.medioDePago || payment.medioPago || 'SIN MEDIO')}</Text>
                <Text style={styles.movementMeta}>{formatDate(payment.fecha)}</Text>
              </View>
              <View style={styles.actions}>
                <ActionButton label="Editar pago" icon={<Pencil size={17} color={Colors.primary} />} onPress={() => onEditPayment(payment)} />
                <ActionButton label="Descargar comprobante" icon={<Download size={17} color={Colors.primary} />} onPress={() => void downloadReceipt(payment)} disabled={busyId === payment.id} />
                <ActionButton label="Eliminar pago" icon={<Trash2 size={17} color={Colors.danger} />} onPress={() => deletePayment(payment)} disabled={busyId === payment.id} />
              </View>
            </View>
          ))}
          <Button label="Agregar pago" size="sm" variant="outline" icon={<Plus size={16} color={Colors.primary} />} onPress={() => onAddMovement('PAGO')} fullWidth style={styles.addButton} />

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Gastos</Text>
            <Text style={styles.sectionTotal}>{expenses.length}</Text>
          </View>
          {expenses.length === 0 ? <Text style={styles.emptyText}>Todavía no hay gastos registrados.</Text> : expenses.map((expense) => (
            <View key={expense.id} style={styles.movementRow}>
              <View style={styles.movementInfo}>
                <Text style={styles.movementAmount}>{formatCurrency(expense.monto)}</Text>
                <Text style={styles.movementMeta}>{formatOption(expense.tipoGasto)} · {expense.descripcion}</Text>
                <Text style={styles.movementMeta}>{formatDate(expense.fecha)}</Text>
              </View>
              <View style={styles.actions}>
                <ActionButton label="Editar gasto" icon={<Pencil size={17} color={Colors.primary} />} onPress={() => onEditExpense(expense)} />
                <ActionButton label="Eliminar gasto" icon={<Trash2 size={17} color={Colors.danger} />} onPress={() => deleteExpense(expense)} disabled={busyId === expense.id} />
              </View>
            </View>
          ))}
          <Button label="Agregar gasto" size="sm" variant="outline" icon={<Receipt size={16} color={Colors.primary} />} onPress={() => onAddMovement('GASTO')} fullWidth style={styles.addButton} />
        </>
      )}
    </>
  );

  return embedded ? content : (
    <BottomSheet open={open} onClose={onClose} title={showMovement ? movementTitle : 'Estado de cuenta'} height="94%">
      {content}
    </BottomSheet>
  );
}

function SummaryItem({ label, value, emphasized = false }: { label: string; value: number; emphasized?: boolean }) {
  return (
    <View style={[styles.summaryItem, emphasized && styles.summaryEmphasized]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, emphasized && styles.summaryValueEmphasized]}>{formatCurrency(value)}</Text>
    </View>
  );
}

function ActionButton({ label, icon, onPress, disabled = false }: { label: string; icon: React.ReactNode; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} style={styles.actionButton}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: 36 },
  eventHeading: { marginBottom: 16 },
  eventName: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: Colors.textDark },
  eventMeta: { marginTop: 4, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.text },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  summaryItem: { width: '48%', minHeight: 76, justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: Colors.neutralBorder, borderRadius: Radius.button, backgroundColor: Colors.neutralBg },
  summaryEmphasized: { borderColor: Colors.primary, backgroundColor: '#edf4ff' },
  summaryLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: Colors.text },
  summaryValue: { marginTop: 5, fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textDark },
  summaryValueEmphasized: { color: Colors.primary },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 6 },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: Colors.textDark },
  sectionTotal: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.text },
  movementRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.neutralBorder },
  movementInfo: { flex: 1, paddingVertical: 8 },
  movementAmount: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: Colors.textDark },
  movementMeta: { marginTop: 3, fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.text },
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  addButton: { marginTop: 10 },
  emptyText: { paddingVertical: 8, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.disabledText },
  error: { marginTop: 8, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.danger },
});