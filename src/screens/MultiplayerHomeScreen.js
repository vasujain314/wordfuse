import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, IconButton } from '../components/Button';
import { TextField } from '../components/TextField';
import { MP_NAME_MAX_LENGTH } from '../core/constants';
import { colors, fonts, MIN_TOUCH, spacing } from '../core/theme';
import { useApp } from '../context/AppContext';
import { useMultiplayer } from '../context/MultiplayerContext';
import { sanitizeName } from '../multiplayer/names';
import { parseJoinTarget } from '../multiplayer/roomCode';

/** /multiplayer: pick a name, then host a room or join one by code or link. */
export function MultiplayerHomeScreen() {
  const router = useRouter();
  const { dictionary } = useApp();
  const { available, name: savedName, setName, createRoom } = useMultiplayer();
  const [name, setLocalName] = useState(savedName);
  const [target, setTarget] = useState('');
  const [nameError, setNameError] = useState(null);
  const [codeError, setCodeError] = useState(null);
  const [busy, setBusy] = useState(false);
  const ready = dictionary.status === 'ready';

  const host = async () => {
    const clean = sanitizeName(name);
    if (!clean) {
      setNameError('enter a name');
      return;
    }
    setBusy(true);
    try {
      const code = await createRoom(clean);
      router.replace(`/room/${code}`);
    } finally {
      setBusy(false);
    }
  };

  const join = () => {
    const code = parseJoinTarget(target);
    if (!code) {
      setCodeError('enter a 4-letter room code or paste a link');
      return;
    }
    setName(sanitizeName(name));
    router.push(`/join/${code}`);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <IconButton glyph="<" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text style={styles.title} accessibilityRole="header">
          play with friends
        </Text>
        <View style={{ width: MIN_TOUCH }} />
      </View>
      {!available ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            {"online play isn't set up in this build yet. single player works as usual."}
          </Text>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label="your name"
          value={name}
          onChangeText={(t) => {
            setLocalName(t);
            setNameError(null);
          }}
          maxLength={MP_NAME_MAX_LENGTH}
          placeholder="name"
          autoCapitalize="words"
          error={nameError}
        />
        <Button
          label={busy ? 'creating…' : 'host a game'}
          icon="users"
          onPress={host}
          disabled={busy || !ready || !available}
        />
        {!ready ? <Text style={styles.hint}>loading words…</Text> : null}

        <View style={styles.or}>
          <View style={styles.rule} />
          <Text style={styles.orText}>or join</Text>
          <View style={styles.rule} />
        </View>

        <TextField
          label="room code or link"
          value={target}
          onChangeText={(t) => {
            setTarget(t);
            setCodeError(null);
          }}
          placeholder="K7QD"
          autoCapitalize="characters"
          onSubmitEditing={join}
          error={codeError}
        />
        <Button label="join" icon="log-in" onPress={join} disabled={!available} />
        <Text style={styles.privacy}>
          names are only shared with the room while you play. nothing is stored.
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
  notice: { padding: spacing.md, backgroundColor: colors.key },
  noticeText: {
    fontFamily: fonts.regular,
    color: colors.inkSoft,
    fontSize: 14,
    textAlign: 'center',
  },
  content: { alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  hint: { fontFamily: fonts.regular, color: colors.faded, fontSize: 13 },
  or: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.md },
  rule: { width: 60, height: 1, backgroundColor: colors.rule },
  orText: { fontFamily: fonts.regular, color: colors.faded, fontSize: 13 },
  privacy: {
    fontFamily: fonts.regular,
    color: colors.faded,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.lg,
    maxWidth: 300,
  },
});
