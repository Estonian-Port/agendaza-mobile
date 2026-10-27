import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { eventoService } from '@/services/evento.service';
import { EventoAgenda } from '@/types/domain';

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
  }, []);

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

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <Text style={styles.title}>Hola {usuario?.nombre ?? ''}!</Text>
        <Text style={styles.subtitle}>
          {loading
            ? 'Cargando próximo evento...'
            : nextEvent
              ? `Próximo evento: ${formatEventDate(nextEvent.start)}, ${nextEvent.title}`
              : 'No hay próximos eventos'}
        </Text>
      </View>

      <View style={styles.calendarCard}>
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
      </View>

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
        <View style={styles.eventList}>
          {selectedEvents.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View style={[styles.eventMarker, { backgroundColor: event.color || Colors.primary }]} />
              <View style={styles.eventDetails}>
                <Text style={styles.eventName}>{event.title}</Text>
                <Text style={styles.eventTime}>
                  {event.start.slice(11, 16)} – {event.end.slice(11, 16)}
                </Text>
              </View>
              <Text style={styles.eventStatus}>{event.estado}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: Colors.tertiary,
  },
  heading: { marginBottom: 18 },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 26,
    color: Colors.textDark,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: Colors.text,
    marginTop: 3,
  },
  calendarCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: 8,
    ...Shadow.card,
  },
  eventsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
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
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: 18,
    ...Shadow.soft,
  },
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
  eventList: { gap: 10 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: 15,
    ...Shadow.soft,
  },
  eventMarker: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 12 },
  eventDetails: { flex: 1 },
  eventName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: Colors.textDark,
  },
  eventTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: Colors.text,
    marginTop: 4,
  },
  eventStatus: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: Colors.neutralText,
    marginLeft: 8,
  },
});