import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Card } from '@/components/ui/Card';
import { globalStyles } from '@/constants/styles';
import { Colors } from '@/constants/theme';
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
            {selectedEvents.map((event, index) => (
              <View
                key={event.id}
                style={[styles.eventRow, index < selectedEvents.length - 1 && styles.eventRowDivider]}
              >
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
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: Colors.neutralBg },
  heading: {
    marginBottom: 18,
    padding: 16,
  },
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
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  eventRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.neutralBorder },
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