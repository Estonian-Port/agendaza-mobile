import { StyleSheet, Text, View } from 'react-native';
import { Search } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors, Typography } from '@/constants/theme';

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

  return (
    <View>
      <Text style={[Typography.caption, styles.label]}>
        {isCodeSearch ? 'Código del evento' : dateLabel}
      </Text>
      <View style={styles.row}>
        <View style={styles.input}>
          <Input
            value={value}
            onChangeText={onChangeText}
            placeholder={isCodeSearch ? 'Ej: ABCD' : datePlaceholder}
          />
        </View>
        <Button
          label="Buscar"
          size="md"
          icon={<Search size={16} color={Colors.white} />}
          onPress={onSearch}
          loading={loading}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: Colors.textSoft, marginBottom: 6, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  input: { flex: 1 },
});