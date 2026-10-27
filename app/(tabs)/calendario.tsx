import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { CalendarDays, Search } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { EventCard } from '@/components/calendar/EventCard';
import { EventSearchFields } from '@/components/calendar/EventSearchFields';
import { MovementSheet } from '@/components/finance/MovementSheet';
import { EventDetailSheet } from '@/components/calendar/EventDetailSheet';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { globalStyles } from '@/constants/styles';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { eventoService } from '@/services/evento.service';
import { Evento, EventoAgenda } from '@/types/domain';

type SearchType = 'CODIGO' | 'FECHA';
type MovementType = 'PAGO' | 'GASTO';

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSelectedDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatEventDate(dateTime: string) {
  return `${dateTime.slice(8, 10)}/${dateTime.slice(5, 7)}`;
}

export default function CalendarioScreen() {
  const { usuario } = useAuth();
  const [agenda, setAgenda] = useState<EventoAgenda[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<SearchType>('FECHA');
  const [searchCode, setSearchCode] = useState('');
  const [searchDate, setSearchDate] = useState(() => toDateKey(new Date()));
  const [searchResults, setSearchResults] = useState<Evento[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [eventDetailId, setEventDetailId] = useState<number | null>(null);
  const [movementEvent, setMovementEvent] = useState<Evento | null>(null);
  const [movementType, setMovementType] = useState<MovementType>('PAGO');
  const [movementSheetOpen, setMovementSheetOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    eventoService.getAgenda()
      .then((events) => {
        if (active) setAgenda(events);
      })
      .catch(() => {
        if (active) setError('No se pudo cargar la agenda.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = {};
    agenda.forEach((event) => {
      const date = event.start.slice(0, 10);
      marks[date] = { ...marks[date], marked: true, dotColor: Colors.primary };
    });
    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: Colors.primary,
    };
    return marks;
  }, [agenda, selectedDate]);

  const selectedEvents = agenda
    .filter((event) => event.start.slice(0, 10) === selectedDate)
    .sort((a, b) => a.start.localeCompare(b.start));

  const nextEvent = agenda
    .filter((event) => new Date(event.start).getTime() >= Date.now())
    .sort((a, b) => a.start.localeCompare(b.start))[0];

  const selectDate = (date: DateData) => setSelectedDate(date.dateString);

  const buscarEvento = async () => {
    setSearchError('');
    setSearchResults([]);
    setSearchLoading(true);
    try {
      if (searchType === 'CODIGO') {
        if (!searchCode.trim()) {
          setSearchError('Ingresá el código del evento.');
          return;
        }
        const id = await eventoService.getEventoIdByCodigo(searchCode.trim());
        setSearchOpen(false);
        setEventDetailId(id);
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(searchDate)) {
        setSearchError('Ingresá la fecha con formato AAAA-MM-DD.');
        return;
      }
      const results = await eventoService.getAllEventosByFecha(searchDate);
      setSearchResults(results);
      if (results.length === 0) setSearchError('No hay eventos para esa fecha.');
    } catch (cause) {
      setSearchError(cause instanceof Error ? cause.message : 'No se pudo buscar el evento.');
    } finally {
      setSearchLoading(false);
    }
  };

  const abrirMovimiento = (type: MovementType, event: Evento) => {
    setMovementType(type);
    setMovementEvent(event);
    setEventDetailId(null);
    setMovementSheetOpen(true);
  };

  return (
    <ScrollView contentContainerStyle={[globalStyles.screenContent, styles.content]}>
      <Card radius="panel" shadow="soft" style={styles.heading}>
        <Text style={globalStyles.pageTitle}>Hola {usuario?.nombre ?? ''}!</Text>
        <Text style={globalStyles.pageSubtitle}>
          {loading
            ? 'Cargando próximo evento...'
            : nextEvent
              ? `Próximo evento: ${formatEventDate(nextEvent.start)}, ${nextEvent.title}`
              : 'No hay próximos eventos'}
        </Text>
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Buscar evento por fecha o código"
        onPress={() => setSearchOpen(true)}
        style={({ pressed }) => [styles.searchTrigger, pressed && styles.searchPressed]}
      >
        <Search size={20} color={Colors.white} />
        <View style={styles.searchCopy}>
          <Text style={styles.searchTitle}>Buscar evento</Text>
          <Text style={styles.searchSubtitle}>Por fecha o código</Text>
        </View>
        <CalendarDays size={19} color={Colors.white} />
      </Pressable>

      <BottomSheet open={searchOpen} onClose={() => setSearchOpen(false)} title="Buscar evento" height="75%">
        <View style={styles.searchSwitch}>
          {(['FECHA', 'CODIGO'] as const).map((value) => {
            const selected = searchType === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => { setSearchType(value); setSearchResults([]); setSearchError(''); }}
                style={[styles.searchOption, selected && styles.searchOptionSelected]}
              >
                <Text style={[styles.searchLabel, selected && styles.searchLabelSelected]}>
                  {value === 'CODIGO' ? 'Código' : 'Fecha'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <EventSearchFields
          searchType={searchType}
          value={searchType === 'CODIGO' ? searchCode : searchDate}
          onChangeText={searchType === 'CODIGO' ? setSearchCode : setSearchDate}
          dateLabel="Fecha (AAAA-MM-DD)"
          datePlaceholder="2026-10-27"
          loading={searchLoading}
          onSearch={() => void buscarEvento()}
        />
        {!!searchError && <Text accessibilityRole="alert" style={styles.searchError}>{searchError}</Text>}
        {searchResults.map((event) => (
          <EventCard
            key={event.id}
            title={event.nombre}
            code={event.codigo}
            start={event.inicio}
            end={event.fin}
            status={event.estado}
            onPress={() => {
              setSearchOpen(false);
              setSelectedDate(event.inicio.slice(0, 10));
              setEventDetailId(event.id);
            }}
          />
        ))}
      </BottomSheet>

      <Card radius="panel" shadow="soft" style={styles.calendarCard}>
        <Calendar
          firstDay={1}
          markedDates={markedDates}
          onDayPress={selectDate}
          theme={{
            backgroundColor: Colors.white,
            calendarBackground: Colors.white,
            textSectionTitleColor: Colors.text,
            selectedDayBackgroundColor: Colors.primary,
            selectedDayTextColor: Colors.white,
            todayTextColor: Colors.primary,
            dayTextColor: Colors.textDark,
            textDisabledColor: Colors.disabledText,
            monthTextColor: Colors.textDark,
            arrowColor: Colors.primary,
            textMonthFontFamily: 'Inter-SemiBold',
            textDayHeaderFontFamily: 'Inter-Medium',
            textDayFontFamily: 'Inter-Regular',
            textMonthFontSize: 17,
            textDayFontSize: 14,
            textDayHeaderFontSize: 12,
          }}
        />
      </Card>

      <Card radius="panel" shadow="soft" style={styles.eventsPanel}>
        <View style={styles.eventsHeading}>
          <Text style={styles.eventsTitle}>{formatSelectedDate(selectedDate)}</Text>
          <Text style={styles.eventsCount}>{selectedEvents.length}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.message} />
        ) : error ? (
          <Text style={styles.messageText}>{error}</Text>
        ) : selectedEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Día disponible</Text>
            <Text style={styles.emptyText}>No hay eventos agendados para esta fecha.</Text>
          </View>
        ) : (
          <View>
            {selectedEvents.map((event) => (
              <EventCard
                key={event.id}
                title={event.title}
                code={event.codigo}
                start={event.start}
                end={event.end}
                status={event.estado}
                color={event.color}
                onPress={() => setEventDetailId(event.id)}
              />
            ))}
          </View>
        )}
      </Card>
      {usuario && (
        <>
          <EventDetailSheet
            open={eventDetailId !== null}
            eventId={eventDetailId}
            onClose={() => setEventDetailId(null)}
            onUpdated={() => setRefreshKey((current) => current + 1)}
            onAddMovement={abrirMovimiento}
          />
          <MovementSheet
            open={movementSheetOpen}
            initialType={movementType}
            initialEvent={movementEvent}
            usuario={usuario}
            onClose={() => setMovementSheetOpen(false)}
            onSaved={() => setRefreshKey((current) => current + 1)}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: Colors.neutralBg },
  heading: {
    marginBottom: 18,
    padding: 16,
  },
  searchTrigger: {
    minHeight: 62,
    marginBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  searchPressed: { opacity: 0.86 },
  searchCopy: { flex: 1, gap: 2 },
  searchTitle: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: Colors.white },
  searchSubtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: '#eaf2ff' },
  searchSwitch: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchOption: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 8, borderWidth: 1, borderColor: Colors.neutralBorder },
  searchOptionSelected: { borderColor: Colors.primary, backgroundColor: '#edf4ff' },
  searchLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: Colors.text },
  searchLabelSelected: { color: Colors.primary },
  searchError: { marginTop: 4, marginBottom: 8, fontFamily: 'Inter-Regular', fontSize: 13, color: Colors.danger },
  calendarCard: { padding: 8, marginBottom: 14 },
  eventsPanel: { padding: 16 },
  eventsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
    marginBottom: 12,
  },
  eventsTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 17,
    color: Colors.textDark,
    textTransform: 'capitalize',
  },
  eventsCount: {
    minWidth: 28,
    textAlign: 'center',
    overflow: 'hidden',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.neutralInput,
    color: Colors.neutralText,
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  message: { marginTop: 24 },
  messageText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: 20,
  },
  emptyState: { paddingVertical: 12 },
  emptyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: Colors.textDark,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: Colors.text,
    marginTop: 5,
  },
});