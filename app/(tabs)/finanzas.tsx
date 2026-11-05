import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, ChevronUp, Download, Plus, Wallet } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MovementSheet } from '@/components/finance/MovementSheet';
import { Toast } from '@/components/ui/Toast';
import { globalStyles } from '@/constants/styles';
import { Colors, Radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { gastoService } from '@/services/gasto.service';
import { pagoService } from '@/services/pago.service';
import { Gasto, Pago, ResumenPagosMes } from '@/types/domain';

type FiltroMovimiento = 'TODOS' | 'INGRESOS' | 'EGRESOS';
const PAGE_SIZE = 10;

const filtros: { label: string; value: FiltroMovimiento }[] = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'Ingresos', value: 'INGRESOS' },
  { label: 'Egresos', value: 'EGRESOS' },
];

type MovimientoFinanciero = {
  id: string;
  fecha: string;
  monto: number;
  esIngreso: boolean;
  titulo: string;
  etiqueta?: string;
  pagoId?: number;
  gastoId?: number;
  gastos?: Gasto[];
};

type DatosFinancieros = {
  pagos: Pago[];
  gastos: Gasto[];
  resumen: ResumenPagosMes;
};

const financialCache = new Map<string, DatosFinancieros>();
const financialRequests = new Map<string, Promise<DatosFinancieros>>();

const moneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function monthLabel(date: Date) {
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function conceptLabel(pago: Pago) {
  const labels: Record<Pago['concepto'], string> = {
    INGRESO: 'Ingreso',
    EGRESO: 'Egreso',
    SEÑA: 'Seña',
    SALDO: 'Saldo',
    GASTO: 'Gasto',
    PROVEEDOR: 'Proveedor',
  };
  return labels[pago.concepto];
}

function toMovimiento(pago: Pago): MovimientoFinanciero {
  return {
    id: `pago-${pago.id}`,
    fecha: pago.fecha,
    monto: pago.monto,
    esIngreso: pago.esIngreso ?? true,
    titulo: pago.eventoNombre || pago.nombreEvento || pago.codigo || conceptLabel(pago),
    etiqueta: conceptLabel(pago),
    pagoId: pago.id,
  };
}

function toMovimientoGasto(gasto: Gasto): MovimientoFinanciero {
  return {
    id: `gasto-${gasto.id}`,
    fecha: gasto.fecha,
    monto: gasto.monto,
    esIngreso: false,
    titulo: gasto.descripcion || 'Gasto',
    gastoId: gasto.id,
  };
}

function toMovimientosGastos(gastos: Gasto[]): MovimientoFinanciero[] {
  const movimientos: MovimientoFinanciero[] = [];
  const grupos = new Map<string, Gasto[]>();

  gastos.forEach((gasto) => {
    if (gasto.tipoGasto !== 'EVENTO' || gasto.eventoId == null) {
      movimientos.push(toMovimientoGasto(gasto));
      return;
    }
    const key = `evento-${gasto.eventoId}`;
    grupos.set(key, [...(grupos.get(key) ?? []), gasto]);
  });

  grupos.forEach((gastosDelEvento, key) => {
    const primerGasto = gastosDelEvento[0];
    movimientos.push({
      id: `gastos-${key}`,
      fecha: gastosDelEvento.reduce((fecha, gasto) => gasto.fecha > fecha ? gasto.fecha : fecha, primerGasto.fecha),
      monto: gastosDelEvento.reduce((total, gasto) => total + gasto.monto, 0),
      esIngreso: false,
      titulo: primerGasto.nombreEvento || primerGasto.codigoEvento || 'Evento',
      gastos: gastosDelEvento,
    });
  });

  return movimientos;
}

export default function FinanzasScreen() {
  const { usuario, financeRevision, notifyFinanceChanged } = useAuth();
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [filtro, setFiltro] = useState<FiltroMovimiento>('TODOS');
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [resumen, setResumen] = useState<ResumenPagosMes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);
  const [movementSheetOpen, setMovementSheetOpen] = useState(false);
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [toastId, setToastId] = useState<number | null>(null);
  const [expandedExpenseGroups, setExpandedExpenseGroups] = useState<Set<string>>(() => new Set());
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestId.current;
    let active = true;
    setVisibleCount(PAGE_SIZE);
    setError(null);

    const mesNumero = mes.getMonth() + 1;
    const anio = mes.getFullYear();
    const cacheKey = `${usuario?.empresaId ?? 'sin-agenda'}:${anio}-${mesNumero}:${financeRevision}`;
    const cachedData = financialCache.get(cacheKey);

    if (cachedData) {
      setPagos(cachedData.pagos);
      setGastos(cachedData.gastos);
      setResumen(cachedData.resumen);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    let request = financialRequests.get(cacheKey);
    if (!request) {
      request = Promise.all([
        pagoService.getAllByMes(mesNumero, anio),
        pagoService.getResumenMes(mesNumero, anio),
        gastoService.getAllByMes(mesNumero, anio),
      ]).then(([movimientos, resultado, gastosDelMes]) => {
        const data = {
          pagos: movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha)),
          gastos: gastosDelMes,
          resumen: resultado,
        };
        financialCache.set(cacheKey, data);
        return data;
      }).finally(() => {
        financialRequests.delete(cacheKey);
      });
      financialRequests.set(cacheKey, request);
    }

    request
      .then((data) => {
        if (!active || currentRequestId !== requestId.current) return;
        setPagos(data.pagos);
        setGastos(data.gastos);
        setResumen(data.resumen);
      })
      .catch(() => {
        if (active && currentRequestId === requestId.current) {
          setError('No se pudieron cargar los movimientos.');
        }
      })
      .finally(() => {
        if (active && currentRequestId === requestId.current) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [mes, usuario?.empresaId, financeRevision]);

  const cargarMas = () => setVisibleCount((actual) => actual + PAGE_SIZE);

  const movimientos = useMemo(() => [
    ...pagos.map(toMovimiento),
    ...toMovimientosGastos(gastos),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha)), [pagos, gastos]);
  const movimientosFiltrados = useMemo(() => movimientos.filter((movimiento) => {
    if (filtro === 'INGRESOS') return movimiento.esIngreso;
    if (filtro === 'EGRESOS') return !movimiento.esIngreso;
    return true;
  }), [filtro, movimientos]);
  const cantidadMovimientos = resumen?.cantidadMovimientos
    ?? (resumen?.cantidadIngresos ?? 0) + (resumen?.cantidadEgresos ?? 0);
  const hasMore = movimientosFiltrados.length > visibleCount;

  const abrirPago = (pago: Pago) => {
    setEditingPago(pago);
    setEditingGasto(null);
    setMovementSheetOpen(true);
  };

  const abrirGasto = (gasto: Gasto) => {
    setEditingPago(null);
    setEditingGasto(gasto);
    setMovementSheetOpen(true);
  };

  const cerrarMovementSheet = () => {
    setMovementSheetOpen(false);
    setEditingPago(null);
    setEditingGasto(null);
  };

  const abrirNuevoMovimiento = () => {
    setEditingPago(null);
    setEditingGasto(null);
    setMovementSheetOpen(true);
  };

  const cambiarMes = (cantidad: number) => {
    setMes((actual) => new Date(actual.getFullYear(), actual.getMonth() + cantidad, 1));
  };

  const descargarComprobante = async (id: number) => {
    setDescargandoId(id);
    try {
      const comprobante = await pagoService.descargarComprobante(id);
      const filename = `comprobante-pago-${id}.pdf`;

      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([comprobante], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const file = new File(Paths.cache, `${Date.now()}-${filename}`);
        file.write(new Uint8Array(comprobante));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Comprobante descargado', file.uri);
      }
    } catch {
      Alert.alert('Error', 'No se pudo descargar el comprobante.');
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <View style={styles.screen}>
    <ScrollView contentContainerStyle={[globalStyles.screenContent, styles.content]}>
      <Card radius="panel" shadow="soft" style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={globalStyles.pageTitle}>Finanzas</Text>
          <Text style={globalStyles.pageSubtitle}>Gestiona tus movimientos</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nuevo movimiento"
          onPress={abrirNuevoMovimiento}
          style={styles.addButton}
        >
          <Plus size={21} color={Colors.white} />
        </Pressable>
      </Card>

      <Card radius="panel" shadow="soft" style={styles.panel}>
        <View style={styles.monthSelector}>
          <Pressable
            accessibilityLabel="Mes anterior"
            onPress={() => cambiarMes(-1)}
            style={styles.monthButton}
          >
            <ArrowLeft size={18} color={Colors.textDark} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel(mes)}</Text>
          <Pressable
            accessibilityLabel="Mes siguiente"
            onPress={() => cambiarMes(1)}
            style={styles.monthButton}
          >
            <ArrowRight size={18} color={Colors.textDark} />
          </Pressable>
        </View>

        <View style={styles.summary}>
          <SummaryCard
            label="Ingresos"
            amount={resumen?.ingresos ?? 0}
            color={Colors.success}
            icon={<ArrowUpRight size={17} color={Colors.success} />}
          />
          <SummaryCard
            label="Egresos"
            amount={resumen?.egresos ?? 0}
            color={Colors.danger}
            icon={<ArrowDownLeft size={17} color={Colors.danger} />}
          />
          <SummaryCard
            label="Balance"
            amount={resumen?.balance ?? 0}
            color={Colors.primary}
            icon={<Wallet size={16} color={Colors.primary} />}
          />
        </View>
      </Card>

      <Card radius="panel" shadow="soft" style={styles.panel}>
        <View style={styles.listHeading}>
          <Text style={styles.sectionTitle}>Movimientos</Text>
          <Text style={styles.movementCount}>{cantidadMovimientos}</Text>
        </View>

        <View style={styles.filters}>
          {filtros.map((item) => {
            const selected = filtro === item.value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFiltro(item.value)}
                style={[styles.filterButton, selected && styles.filterButtonSelected]}
              >
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.message} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            {movimientosFiltrados.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Sin movimientos</Text>
                <Text style={styles.emptyText}>No hay movimientos para este período y filtro.</Text>
              </View>
            ) : (
              <View style={styles.movementList}>
                {movimientosFiltrados.slice(0, visibleCount).map((movimiento, index) => {
                  const esIngreso = movimiento.esIngreso;
                  const tint = esIngreso ? Colors.success : Colors.danger;
                  const Icon = esIngreso ? ArrowUpRight : ArrowDownLeft;
                  const grupoExpandido = expandedExpenseGroups.has(movimiento.id);
                  if (movimiento.gastos) {
                    return (
                      <View key={movimiento.id} style={index < movimientosFiltrados.length - 1 && styles.movementCardDivider}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ expanded: grupoExpandido }}
                          onPress={() => setExpandedExpenseGroups((actual) => {
                            const siguiente = new Set(actual);
                            if (siguiente.has(movimiento.id)) siguiente.delete(movimiento.id);
                            else siguiente.add(movimiento.id);
                            return siguiente;
                          })}
                          style={styles.movementCard}
                        >
                          <View style={[styles.movementIcon, styles.expenseGroupIcon]}>
                            <ArrowDownLeft size={19} color={Colors.danger} />
                          </View>
                          <View style={styles.movementDetails}>
                            <Text style={styles.movementTitle} numberOfLines={1}>{movimiento.titulo}</Text>
                            <View style={styles.movementMeta}>
                              <Text style={styles.movementDate}>
                                {dateLabel(movimiento.fecha)}
                              </Text>
                              <Text style={styles.conceptTag}>Evento</Text>
                            </View>
                          </View>
                          <View style={styles.amountAndDownload}>
                            <Text style={[styles.amount, { color: Colors.danger }]}>-{moneda.format(movimiento.monto)}</Text>
                            {grupoExpandido ? <ChevronUp size={17} color={Colors.text} /> : <ChevronDown size={17} color={Colors.text} />}
                          </View>
                        </Pressable>
                        {grupoExpandido && (
                          <View style={styles.expenseDetails}>
                            {movimiento.gastos.map((gasto) => (
                              <Pressable key={gasto.id} accessibilityRole="button" onPress={() => abrirGasto(gasto)} style={styles.expenseDetailRow}>
                                <Text style={styles.expenseDescription}>{gasto.descripcion || 'Gasto'}</Text>
                                <Text style={styles.expenseAmount}>-{moneda.format(gasto.monto)}</Text>
                              </Pressable>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  }
                  return (
                    <View key={movimiento.id} style={[styles.movementCard, index < movimientosFiltrados.length - 1 && styles.movementCardDivider]}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          if (movimiento.pagoId !== undefined) {
                            const pago = pagos.find((item) => item.id === movimiento.pagoId);
                            if (pago) abrirPago(pago);
                          } else if (movimiento.gastoId !== undefined) {
                            const gasto = gastos.find((item) => item.id === movimiento.gastoId);
                            if (gasto) abrirGasto(gasto);
                          }
                        }}
                        style={styles.movementPressable}
                      >
                        <View style={[styles.movementIcon, { backgroundColor: esIngreso ? '#e9f6ef' : '#fcebed' }]}>
                          <Icon size={19} color={tint} />
                        </View>
                        <View style={styles.movementDetails}>
                          <Text style={styles.movementTitle} numberOfLines={1}>{movimiento.titulo}</Text>
                          <View style={styles.movementMeta}>
                            <Text style={styles.movementDate}>{dateLabel(movimiento.fecha)}</Text>
                            {!!movimiento.etiqueta && <Text style={styles.conceptTag}>{movimiento.etiqueta}</Text>}
                          </View>
                        </View>
                        <View style={styles.amountAndDownload}>
                          <Text style={[styles.amount, { color: tint }]}>
                            {esIngreso ? '+' : '-'}{moneda.format(movimiento.monto)}
                          </Text>
                        </View>
                      </Pressable>
                      {movimiento.pagoId !== undefined && (
                        <Pressable
                          accessibilityLabel={`Descargar comprobante del movimiento ${movimiento.pagoId}`}
                          disabled={descargandoId !== null}
                          onPress={() => void descargarComprobante(movimiento.pagoId!)}
                          style={styles.downloadButton}
                        >
                          {descargandoId === movimiento.pagoId ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                          ) : (
                            <Download size={17} color={Colors.primary} />
                          )}
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {hasMore && (
              <Button
                label="Cargar más"
                variant="outline"
                size="sm"
                onPress={cargarMas}
                style={styles.loadMoreButton}
              />
            )}
          </>
        )}
      </Card>

      {usuario && (
        <MovementSheet
          open={movementSheetOpen}
          initialType={editingGasto ? 'GASTO' : 'PAGO'}
          initialPago={editingPago}
          initialGasto={editingGasto}
          usuario={usuario}
          onClose={cerrarMovementSheet}
          onSaved={() => {
            notifyFinanceChanged();
            if (editingPago || editingGasto) setToastId((current) => (current ?? 0) + 1);
          }}
        />
      )}
    </ScrollView>
    {toastId !== null && <Toast key={toastId} message="Cambios guardados" onDismiss={() => setToastId(null)} />}
    </View>
  );
}

function SummaryCard({
  label,
  amount,
  color,
  icon,
}: {
  label: string;
  amount: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryLabelRow}>
        {icon}
        <Text style={styles.summaryLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[styles.summaryAmount, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {moneda.format(amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { backgroundColor: Colors.neutralBg },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
  },
  headingCopy: { flex: 1 },
  addButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderRadius: Radius.button,
    backgroundColor: Colors.primary,
  },
  monthSelector: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.button,
    backgroundColor: Colors.white,
  },
  monthLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    color: Colors.textDark,
    textTransform: 'capitalize',
  },
  panel: { padding: 16, marginBottom: 14 },
  summary: { flexDirection: 'row', gap: 8 },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryLabel: { flexShrink: 1, fontFamily: 'Inter-Medium', fontSize: 11, color: Colors.text },
  summaryAmount: { fontFamily: 'Inter-Bold', fontSize: 15 },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: 'Inter-SemiBold', fontSize: 18, color: Colors.textDark },
  movementCount: {
    minWidth: 26,
    textAlign: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: Colors.neutralInput,
    color: Colors.neutralText,
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  filters: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    marginBottom: 14,
    borderRadius: Radius.button,
    backgroundColor: Colors.neutralInput,
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  filterButtonSelected: { backgroundColor: Colors.white },
  filterText: { fontFamily: 'Inter-Medium', fontSize: 13, color: Colors.text },
  filterTextSelected: { color: Colors.textDark },
  movementList: {},
  expenseGroupIcon: { backgroundColor: '#fcebed' },
  expenseDetails: { paddingLeft: 49, paddingBottom: 10 },
  expenseDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 34,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.neutralBorder,
  },
  expenseDescription: { flex: 1, color: Colors.text, fontFamily: 'Inter-Regular', fontSize: 12 },
  expenseAmount: { color: Colors.danger, fontFamily: 'Inter-Medium', fontSize: 12 },
  loadMoreButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.button,
    backgroundColor: Colors.white,
  },
  movementCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
  },
  movementPressable: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 },
  movementCardDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.neutralBorder },
  movementIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.button,
  },
  movementDetails: { flex: 1, minWidth: 0, gap: 6 },
  movementTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: Colors.textDark },
  movementMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  movementDate: { fontFamily: 'Inter-Regular', fontSize: 11, color: Colors.text },
  conceptTag: {
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.neutralBg,
    color: Colors.neutralText,
    fontFamily: 'Inter-Medium',
    fontSize: 10,
  },
  amountAndDownload: { alignItems: 'flex-end', gap: 5 },
  amount: { fontFamily: 'Inter-SemiBold', fontSize: 13 },
  downloadButton: {
    width: 30,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: '#edf4ff',
  },
  message: { marginTop: 28 },
  errorText: { marginTop: 24, textAlign: 'center', fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.danger },
  emptyState: { paddingVertical: 12 },
  emptyTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.textDark },
  emptyText: { marginTop: 5, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.text },
});