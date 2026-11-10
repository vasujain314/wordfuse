import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '../components/AdBanner';
import { Button } from '../components/Button';
import { colors, fonts, /* MIN_TOUCH, */ spacing } from '../core/theme';
import { useApp } from '../context/AppContext';
import { configKey, createConfig } from '../game/gameConfig';
import { PageMeta } from '../components/PageMeta';
import { PLAY_STORE_URL, SHOW_APP_DOWNLOAD } from '../core/links';

/**
 * Website only, and not on iPhone/iPad (there is no iOS app). Worked out once, the same way
 * the first-paint copy in public/index.html does, so the two always match.
 */
const SHOW_GET_APP =
  SHOW_APP_DOWNLOAD &&
  Platform.OS === 'web' &&
  typeof navigator !== 'undefined' &&
  !/iPhone|iPad|iPod/.test(navigator.userAgent) &&
  !(/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

const FOOTER_LINKS = [
  { label: 'how to play', href: '/how-to-play', a11y: 'How to play' },
  { label: 'faq', href: '/faq', a11y: 'Frequently asked questions' },
  { label: 'privacy', href: '/privacy', a11y: 'Privacy policy' },
];

export function HomeScreen() {
  const router = useRouter();
  const { settings, storage } = useApp();
  const key = configKey(createConfig(settings));
  const [best, setBest] = useState({ bestScore: 0 });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      storage.getBest(key).then((value) => {
        if (active) setBest(value);
      });
      return () => {
        active = false;
      };
    }, [key, storage]),
  );

  return (
    <SafeAreaView style={styles.root}>
      <PageMeta
        title="Free Word Game – Play Solo or with Friends"
        description="A fast, free word game: type a real word containing the letters before the fuse burns out. Play solo or with friends online. No sign-up."
        path="/home"
      />
      {/* Settings link hidden for now.
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.link, pressed && { opacity: 0.5 }]}
        >
          <Text style={styles.linkText}>settings</Text>
        </Pressable>
      </View>
      */}
      <View style={styles.center}>
        <Text style={styles.title} accessibilityRole="header">
          word fuse
        </Text>
        <Text style={styles.tagline}>
          type a word containing the letters{'\n'}before the fuse burns out.
        </Text>
        <View style={styles.rule} />
        <View
          style={styles.bestBox}
          accessible
          accessibilityLabel={`Best score ${best.bestScore} with ${settings.lives} lives and ${settings.secondsPerWord} seconds`}
        >
          <Text style={styles.bestLabel}>best</Text>
          <Text style={styles.bestValue}>{best.bestScore}</Text>
          <Text style={styles.bestMeta}>
            {settings.lives} {settings.lives === 1 ? 'life' : 'lives'} · {settings.secondsPerWord}s
            per word
          </Text>
        </View>
        <View style={styles.buttons}>
          <Button label="play" icon="play" onPress={() => router.push('/game')} />
          <Button label="multiplayer" icon="users" onPress={() => router.push('/multiplayer')} />
          {SHOW_GET_APP ? (
            <Button
              label="get the app"
              icon="download"
              accessibilityLabel="Get the Android app on Google Play"
              onPress={() => Linking.openURL(PLAY_STORE_URL).catch(() => {})}
            />
          ) : null}
        </View>
      </View>
      <View style={styles.footer}>
        {FOOTER_LINKS.map((link, i) => (
          <View key={link.href} style={styles.footerItem}>
            {i > 0 ? <Text style={styles.footerDot}>·</Text> : null}
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={link.a11y}
              onPress={() => router.push(link.href)}
              style={styles.footerLink}
            >
              <Text style={styles.footerText}>{link.label}</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerLink: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 10 },
  footerDot: { fontFamily: fonts.regular, color: colors.faded, fontSize: 13 },
  footerText: {
    fontFamily: fonts.regular,
    color: colors.faded,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  buttons: { gap: spacing.md, alignItems: 'stretch' },
  root: { flex: 1, backgroundColor: colors.paper },
  // Styles for the hidden settings link.
  // topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.md },
  // link: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center' },
  // linkText: {
  //   fontFamily: fonts.regular,
  //   color: colors.inkSoft,
  //   fontSize: 16,
  //   textDecorationLine: 'underline',
  // },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  title: { fontFamily: fonts.bold, color: colors.ink, fontSize: 40 },
  tagline: {
    fontFamily: fonts.regular,
    color: colors.inkSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  rule: { width: 120, height: 1, backgroundColor: colors.rule },
  bestBox: { alignItems: 'center' },
  bestLabel: { fontFamily: fonts.regular, color: colors.faded, fontSize: 14 },
  bestValue: { fontFamily: fonts.bold, color: colors.ink, fontSize: 48 },
  bestMeta: { fontFamily: fonts.regular, color: colors.faded, fontSize: 13 },
});
