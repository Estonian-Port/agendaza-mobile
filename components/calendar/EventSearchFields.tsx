import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { CalendarDays, Search } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Radius, Typography } from '@/constants/theme';

interface EventSearchFieldsProps {
  searchType: 'CODIGO' | 'FECHA';
  value: string;
  onChangeText: (value: string) => void;
  dateLabel: string;
  datePlaceholder: string;
  loading: boolean;
  onSearch: () => void;
}

export function EventSearchFields({
  searchType,
  value,
  onChangeText,
  dateLabel,
  datePlaceholder,
  loading,
  onSearch,
}: EventSearchFieldsProps) {
  const isCodeSearch = searchType === 'CODIGO';
  const [calendarOpen, setCalendarOpen] = useState(false);
  const dateLabelValue = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : datePlaceholder;

  return (
    <View>
      <Text style={[Typography.caption, styles.label]}>
        {isCodeSearch ? 'Código del evento' : dateLabel}
      </Text>
      <View style={styles.row}>
        <View style={styles.input}>
          {isCodeSearch ? (
            <Input
              value={value}
              onChangeText={onChangeText}
              placeholder="Ej: ABCD"
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Elegir fecha de búsqueda"
              accessibilityState={{ expanded: calendarOpen }}
              onPress={() => setCalendarOpen((open) => !open)}
              style={styles.dateInput}
            >
              <CalendarDays size={18} color={Colors.primary} />
              <Text style={[styles.dateText, !value && styles.datePlaceholder]} numberOfLines={1}>
                {dateLabelValue}
              </Text>
            </Pressable>
          )}
        </View>
        <Button
          label="Buscar"
          size="md"
          icon={<Search size={16} color={Colors.white} />}
          onPress={onSearch}
          loading={loading}
        />
      </View>
      {!isCodeSearch && calendarOpen && (
        <View style={styles.calendar}>
          <Calendar
            firstDay={1}
            current={value || undefined}
            markedDates={value ? { [value]: { selected: true, selectedColor: Colors.primary } } : {}}
            onDayPress={(date: DateData) => {
              onChangeText(date.dateString);
              setCalendarOpen(false);
            }}
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
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: Colors.textSoft, marginBottom: 6, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  input: { flex: 1 },
  dateInput: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.neutralBorder,
    borderRadius: Radius.input,
    backgroundColor: Colors.white,
  },
  dateText: { flex: 1, color: Colors.textDark, fontFamily: 'Inter-Medium', fontSize: 13, textTransform: 'capitalize' },
  datePlaceholder: { color: Colors.disabledText, fontFamily: 'Inter-Regular' },
  calendar: {
    marginTop: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.neutralBorder,
    borderRadius: Radius.card,
    backgroundColor: Colors.white,
  },
});