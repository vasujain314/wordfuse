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
          glyph="-"
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
  { value: 'system', label: 'system' },
  { value: 'on', label: 'on' },
  { value: 'off', label: 'off' },
];

export function SettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useApp();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <IconButton glyph="<" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text style={styles.title} accessibilityRole="header">
          settings
        </Text>
        <View style={{ width: MIN_TOUCH }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Stepper
          label="lives"
          value={settings.lives}
          min={LIVES_MIN}
          max={LIVES_MAX}
          onChange={(lives) => updateSettings({ lives })}
        />
        <Stepper
          label="seconds per word"
          value={settings.secondsPerWord}
          min={SECONDS_MIN}
          max={SECONDS_MAX}
          unit="s"
          onChange={(secondsPerWord) => updateSettings({ secondsPerWord })}
        />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>vibrate on wrong word</Text>
          <Switch
            accessibilityLabel="Vibrate on wrong word"
            value={settings.hapticsEnabled}
            onValueChange={(hapticsEnabled) => updateSettings({ hapticsEnabled })}
            trackColor={{ true: colors.ink, false: colors.rule }}
            thumbColor={colors.paper}
            style={styles.switch}
          />
        </View>
        <View style={styles.column}>
          <Text style={styles.rowLabel}>reduce motion</Text>
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
          lives and seconds apply from the next run. each combination keeps its own best score.
        </Text>
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
  content: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    minHeight: 72,
  },
  column: {
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowLabel: { fontFamily: fonts.regular, color: colors.ink, fontSize: 17 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepValue: {
    fontFamily: fonts.bold,
    color: colors.ink,
    fontSize: 22,
    minWidth: 52,
    textAlign: 'center',
  },
  unit: { fontFamily: fonts.regular, color: colors.faded, fontSize: 14 },
  switch: { minHeight: MIN_TOUCH },
  segment: { flexDirection: 'row', gap: spacing.sm },
  segmentItem: {
    flex: 1,
    minHeight: MIN_TOUCH,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: { borderColor: colors.ink, borderWidth: 1.5 },
  segmentText: { fontFamily: fonts.regular, color: colors.faded, fontSize: 15 },
  segmentTextSelected: { fontFamily: fonts.bold, color: colors.ink },
  note: {
    fontFamily: fonts.regular,
    color: colors.faded,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.lg,
  },
});
