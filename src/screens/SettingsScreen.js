import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '../components/Button';
import { LIVES_MAX, LIVES_MIN, SECONDS_MAX, SECONDS_MIN } from '../core/constants';
import { colors, fonts, MIN_TOUCH, spacing } from '../core/theme';
import { useApp } from '../context/AppContext';

function Stepper({ label, value, min, max, unit, onChange }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.stepper}>
        <IconButton
          glyph="−"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => onChange(Math.max(min, value - 1))}
        />
        <Text
          style={styles.stepValue}
          accessibilityLabel={`${label} ${value}${unit ? ` ${unit}` : ''}`}
        >
          {value}
          {unit ? <Text style={styles.unit}> {unit}</Text> : null}
        </Text>
        <IconButton
          glyph="+"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => onChange(Math.min(max, value + 1))}
        />
      </View>
    </View>
  );
}

const MOTION_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

export function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useApp();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <IconButton glyph="‹" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text style={styles.title} accessibilityRole="header">
          SETTINGS
        </Text>
        <View style={{ width: MIN_TOUCH }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Stepper
          label="Lives"
          value={settings.lives}
          min={LIVES_MIN}
          max={LIVES_MAX}
          onChange={(lives) => updateSettings({ lives })}
        />
        <Stepper
          label="Seconds per word"
          value={settings.secondsPerWord}
          min={SECONDS_MIN}
          max={SECONDS_MAX}
          unit="s"
          onChange={(secondsPerWord) => updateSettings({ secondsPerWord })}
        />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Haptics</Text>
          <Switch
            accessibilityLabel="Haptics"
            value={settings.hapticsEnabled}
            onValueChange={(hapticsEnabled) => updateSettings({ hapticsEnabled })}
            trackColor={{ true: colors.cyan, false: colors.border }}
            thumbColor={colors.text}
            style={styles.switch}
          />
        </View>
        <View style={styles.column}>
          <Text style={styles.rowLabel}>Reduce Motion</Text>
          <View style={styles.segment} accessibilityRole="radiogroup">
            {MOTION_OPTIONS.map((option) => {
              const selected = settings.reduceMotion === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Reduce Motion ${option.label}`}
                  onPress={() => updateSettings({ reduceMotion: option.value })}
                  style={[styles.segmentItem, selected && styles.segmentSelected]}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={styles.note}>
          Lives and seconds apply from the next run. Each combination keeps its own best score.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  content: { padding: spacing.md, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    minHeight: 72,
  },
  column: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.md,
  },
  rowLabel: { color: colors.text, fontSize: 17, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepValue: {
    color: colors.cyan,
    fontFamily: fonts.mono,
    fontSize: 22,
    fontWeight: '800',
    minWidth: 52,
    textAlign: 'center',
  },
  unit: { color: colors.textMuted, fontSize: 14 },
  switch: { minHeight: MIN_TOUCH },
  segment: { flexDirection: 'row', gap: spacing.sm },
  segmentItem: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: { borderColor: colors.cyan, backgroundColor: 'rgba(34, 228, 255, 0.12)' },
  segmentText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  segmentTextSelected: { color: colors.cyan },
  note: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});
