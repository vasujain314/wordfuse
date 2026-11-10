import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, MIN_TOUCH, spacing } from '../core/theme';
import { IconButton } from './Button';

/**
 * A simple text page with a back button: a title and a list of `{ heading, body }`
 * sections. `head` (e.g. <PageMeta />) and `footer` are optional.
 */
export function InfoPage({ title, sections, head = null, footer = null }) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root}>
      {head}
      <View style={styles.header}>
        <IconButton
          glyph="<"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        />
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <View style={{ width: MIN_TOUCH }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {sections.map(({ heading, body }) => (
          <View key={heading} style={styles.section}>
            <Text style={styles.heading} accessibilityRole="header">
              {heading}
            </Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ))}
        {footer}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  title: { fontFamily: fonts.bold, color: colors.ink, fontSize: 20 },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  section: { gap: spacing.xs },
  heading: { fontFamily: fonts.bold, color: colors.ink, fontSize: 16 },
  body: { fontFamily: fonts.regular, color: colors.inkSoft, fontSize: 14, lineHeight: 21 },
});
