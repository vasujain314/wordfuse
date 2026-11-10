import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { adPrivacyOptionsRequired, openAdPrivacyOptions } from '../ads/ads';
import { Button, IconButton } from '../components/Button';
import { PageMeta } from '../components/PageMeta';
import { colors, fonts, MIN_TOUCH, spacing } from '../core/theme';

const SECTIONS = [
  [
    'what we collect',
    'nothing ourselves. word fuse has no accounts, no analytics of its own and no database of players.',
  ],
  [
    'ads',
    "word fuse is free and shows ads from google (admob in the apps, adsense on the web). google may use your device's advertising id or cookies, your ip address and basic device information to show, limit and measure ads, and in some regions to personalise them. where the law requires it (for example the eea and uk) you are asked for consent first, and you can change your choice below or in your device settings. ads are never shown during a turn. how google uses this data: policies.google.com/technologies/partner-sites",
  ],
  [
    'on your device',
    'your best score and game settings are saved on your device only, so they survive a restart. uninstalling the app or clearing site data removes them.',
  ],
  [
    'playing with friends',
    'in multiplayer, the name you type and your moves are sent live to the other players in your room through supabase realtime. nothing is written to a database; the room disappears when everyone leaves. on the web, the tab remembers which room it is in until you close it, so a reload puts you back in the game. if the multiplayer connection fails, the app emails the developer an error report (the error message, room code, device type and app version, never your name) through formsubmit.co so it can be fixed.',
  ],
  [
    'permissions',
    "the android app only asks to vibrate (for a wrong word), to use the internet (for multiplayer and ads), for google's ads to read the advertising id, and, while you're in a multiplayer room, to keep running in the background and show a notification so the room stays connected (you can turn notifications off; nothing is sent to us).",
  ],
  [
    'children',
    'word fuse is not directed at children under 13 and does not knowingly collect information from them. ads are limited to content rated for general audiences.',
  ],
];

/** /privacy: the privacy policy (also used for the app store listings). */
export function PrivacyScreen() {
  const router = useRouter();
  // Where consent applies (GDPR), Google requires a way to change it later.
  const [canChangeAdConsent, setCanChangeAdConsent] = useState(false);
  useEffect(() => {
    let active = true;
    adPrivacyOptionsRequired().then((required) => {
      if (active) setCanChangeAdConsent(required);
    });
    return () => {
      active = false;
    };
  }, []);
  return (
    <SafeAreaView style={styles.root}>
      <PageMeta
        title="Privacy"
        description="How Word Fuse handles data: no accounts, nothing stored by us, and ads from Google."
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
        {canChangeAdConsent ? (
          <Button label="ad privacy choices" variant="secondary" onPress={openAdPrivacyOptions} />
        ) : null}
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
