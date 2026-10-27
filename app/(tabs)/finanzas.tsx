import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Download, Wallet } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { globalStyles } from '@/constants/styles';
import { Colors, Radius } from '@/constants/theme';
import { pagoService } from '@/services/pago.service';
import { Pago, ResumenPagosMes } from '@/types/domain';

type FiltroMovimiento = 'TODOS' | 'INGRESOS' | 'EGRESOS';
const PAGE_SIZE = 10;

const filtros: { label: string; value: FiltroMovimiento }[] = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'Ingresos', value: 'INGRESOS' },
  { label: 'Gastos', value: 'EGRESOS' },
];

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

export default function FinanzasScreen() {
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [filtro, setFiltro] = useState<FiltroMovimiento>('TODOS');
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [resumen, setResumen] = useState<ResumenPagosMes | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<number | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestId.current;
    let active = true;
    setLoading(true);
    setLoadingMore(false);
    setHasMore(false);
    setPagos([]);
    setError(null);
    setLoadMoreError(null);

    Promise.all([
      pagoService.getAllByMes(mes.getMonth() + 1, mes.getFullYear(), 0, PAGE_SIZE),
      pagoService.getResumenMes(mes.getMonth() + 1, mes.getFullYear()),
    ])
      .then(([movimientos, resultado]) => {
        if (!active || currentRequestId !== requestId.current) return;
        setPagos(movimientos.sort((a, b) => b.fecha.localeCompare(a.fecha)));
        setHasMore(movimientos.length === PAGE_SIZE);
        setResumen(resultado);
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
  }, [mes]);

  const cargarMas = async () => {
    if (loadingMore || !hasMore) return;
    const currentRequestId = requestId.current;
    const nextPage = Math.ceil(pagos.length / PAGE_SIZE);
    setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const movimientos = await pagoService.getAllByMes(
        mes.getMonth() + 1,
        mes.getFullYear(),
        nextPage,
        PAGE_SIZE,
      );
      if (currentRequestId !== requestId.current) return;
      setPagos((actuales) => [...actuales, ...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha)));
      setHasMore(movimientos.length === PAGE_SIZE);
    } catch {
      if (currentRequestId === requestId.current) {
        setLoadMoreError('No se pudieron cargar más movimientos.');
      }
    } finally {
      if (currentRequestId === requestId.current) setLoadingMore(false);
    }
  };

  const movimientosFiltrados = useMemo(() => pagos.filter((pago) => {
    if (filtro === 'INGRESOS') return pago.esIngreso;
    if (filtro === 'EGRESOS') return !pago.esIngreso;
    return true;
  }), [filtro, pagos]);

  const cambiarMes = (cantidad: number) => {
    setMes((actual) => new Date(actual.getFullYear(), actual.getMonth() + cantidad, 1));
  };

  const descargarComprobante = async (id: number) => {
    setDescargandoId(id);
    try {
      const comprobante = await pagoService.descargarComprobante(id);
      const filename = `comprobante-pago-${id}.pdf`;

      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(comprobante);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        return;
      }

      const file = new File(Paths.cache, `${Date.now()}-${filename}`);
      file.write(new Uint8Array(await comprobante.arrayBuffer()));
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
    <ScrollView contentContainerStyle={[globalStyles.screenContent, styles.content]}>
      <Card radius="panel" shadow="soft" style={styles.heading}>
        <Text style={globalStyles.pageTitle}>Finanzas</Text>
        <Text style={globalStyles.pageSubtitle}>Ingresos, gastos y pagos</Text>
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
            label="Gastos"
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
          <Text style={styles.movementCount}>{resumen?.cantidadMovimientos ?? 0}</Text>
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
                {movimientosFiltrados.map((pago, index) => {
                  const esIngreso = pago.esIngreso;
                  const tint = esIngreso ? Colors.success : Colors.danger;
                  const Icon = esIngreso ? ArrowUpRight : ArrowDownLeft;
                  return (
                    <View
                      key={pago.id}
                      style={[styles.movementCard, index < movimientosFiltrados.length - 1 && styles.movementCardDivider]}
                    >
                      <View style={[styles.movementIcon, { backgroundColor: esIngreso ? '#e9f6ef' : '#fcebed' }]}>
                        <Icon size={19} color={tint} />
                      </View>
                      <View style={styles.movementDetails}>
                        <Text style={styles.movementTitle} numberOfLines={1}>
                          {pago.descripcion || pago.eventoNombre || conceptLabel(pago)}
                        </Text>
                        <View style={styles.movementMeta}>
                          <Text style={styles.movementDate}>{dateLabel(pago.fecha)}</Text>
                          <Text style={styles.conceptTag}>{conceptLabel(pago)}</Text>
                        </View>
                      </View>
                      <View style={styles.amountAndDownload}>
                        <Text style={[styles.amount, { color: tint }]}>
                          {esIngreso ? '+' : '-'}{moneda.format(pago.monto)}
                        </Text>
                        <Pressable
                          accessibilityLabel={`Descargar comprobante del movimiento ${pago.id}`}
                          disabled={descargandoId !== null}
                          onPress={() => void descargarComprobante(pago.id)}
                          style={styles.downloadButton}
                        >
                          {descargandoId === pago.id ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                          ) : (
                            <Download size={17} color={Colors.primary} />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {hasMore && (
              <Button
                label="Cargar 10 más"
                variant="outline"
                size="sm"
                onPress={() => void cargarMas()}
                loading={loadingMore}
                style={styles.loadMoreButton}
              />
            )}
            {loadMoreError && <Text style={styles.errorText}>{loadMoreError}</Text>}
          </>
        )}
      </Card>
    </ScrollView>
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
  content: { backgroundColor: Colors.neutralBg },
  heading: {
    marginBottom: 16,
    padding: 16,
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