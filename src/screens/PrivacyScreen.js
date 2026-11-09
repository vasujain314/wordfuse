import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '../components/Button';
import { PageMeta } from '../components/PageMeta';
import { colors, fonts, MIN_TOUCH, spacing } from '../core/theme';

const SECTIONS = [
  ['what we collect', 'nothing. word fuse has no accounts, no ads, no analytics and no tracking.'],
  [
    'on your device',
    'your best score and game settings are saved on your device only, so they survive a restart. uninstalling the app or clearing site data removes them.',
  ],
  [
    'playing with friends',
    'in multiplayer, the name you type and your moves are sent live to the other players in your room through supabase realtime. nothing is written to a database; the room disappears when everyone leaves. on the web, the tab remembers which room it is in until you close it, so a reload puts you back in the game.',
  ],
  [
    'permissions',
    'the android app only asks to vibrate (for a wrong word) and to use the internet (for multiplayer).',
  ],
  [
    'children',
    'word fuse does not knowingly collect any information from anyone, including children.',
  ],
];

/** /privacy: the privacy policy (also used for the app store listings). */
export function PrivacyScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.root}>
      <PageMeta
        title="Privacy"
        description="Word Fuse collects no personal data: no accounts, ads, analytics or tracking."
        path="/privacy"
      />
      <View style={styles.header}>
        <IconButton
          glyph="<"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}
        />
        <Text style={styles.title} accessibilityRole="header">
          privacy
        </Text>
        <View style={{ width: MIN_TOUCH }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map(([heading, body]) => (
          <View key={heading} style={styles.section}>
            <Text style={styles.heading}>{heading}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ))}
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
