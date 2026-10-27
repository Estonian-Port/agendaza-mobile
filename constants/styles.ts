import { StyleSheet, TextStyle } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

type FontWeight = '400' | '500' | '600' | '700';

const fontMap: Record<FontWeight, string> = {
  '400': 'Inter-Regular',
  '500': 'Inter-Medium',
  '600': 'Inter-SemiBold',
  '700': 'Inter-Bold',
};

export function fontText(weight: FontWeight = '400'): TextStyle {
  return { fontFamily: fontMap[weight] };
}

export const globalStyles = StyleSheet.create({
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  pageTitle: { fontFamily: 'Inter-Bold', fontSize: 26, color: Colors.textDark },
  pageSubtitle: { fontFamily: 'Inter-Regular', fontSize: 14, color: Colors.text, marginTop: 3 },
  body: { ...Typography.body, color: Colors.text, fontFamily: 'Inter-Regular' },
  heading: { ...Typography.heading, color: Colors.textDark, fontFamily: 'Inter-SemiBold' },
  title: { ...Typography.title, color: Colors.textDark, fontFamily: 'Inter-Bold' },
  caption: { ...Typography.caption, color: Colors.text, fontFamily: 'Inter-Regular' },
});
