import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { MP_MAX_PLAYERS, MP_NAME_MAX_LENGTH } from '../core/constants';
import { colors, fonts, spacing } from '../core/theme';
import { useApp } from '../context/AppContext';
import { useMultiplayer } from '../context/MultiplayerContext';
import { isNameTaken, sanitizeName } from '../multiplayer/names';
import { RoomPhase } from '../multiplayer/protocol';
import { lookForRoom } from '../multiplayer/roomLookup';
import { isValidRoomCode, normalizeRoomCode } from '../multiplayer/roomCode';
import { PageMeta } from '../components/PageMeta';

const schedule = (fn, ms) => {
  const handle = setTimeout(fn, ms);
  return () => clearTimeout(handle);
};

/**
 * /join/[code]: where shared links land. Checks the room exists while the player types a
 * name, then joins it (as a spectator if the game has started or the room is full).
 */
export function JoinScreen({ code: rawCode }) {
  const router = useRouter();
  const code = normalizeRoomCode(rawCode);
  const { dictionary } = useApp();
  const { available, name: savedName, joinRoom, probe } = useMultiplayer();
  const [name, setName] = useState(savedName);
  const [error, setError] = useState(null);
  const [lookup, setLookup] = useState({ state: 'checking', room: null });
  const validCode = isValidRoomCode(code);

  // Bumped by "try again" to start a new lookup.
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!available || !validCode) return undefined;
    return lookForRoom({
      probe,
      code,
      schedule,
      now: Date.now,
      onUpdate: ({ state, room = null }) => setLookup({ state, room }),
    });
  }, [available, validCode, code, probe, attempt]);

  const room = lookup.room;
  const spectate =
    room && (room.phase !== RoomPhase.lobby || room.players.length >= MP_MAX_PLAYERS);
  const takenNames = room ? [...room.players, ...room.spectators].map((m) => m.name) : [];
  const canJoin = lookup.state === 'found' && dictionary.status === 'ready';

  const join = () => {
    const clean = sanitizeName(name);
    if (!clean) {
      setError('enter a name');
      return;
    }
    if (isNameTaken(clean, takenNames)) {
      setError('someone in this room already has that name');
      return;
    }
    joinRoom(code, clean, { spectate: Boolean(spectate) });
    router.replace(`/room/${code}`);
  };

  let info;
  if (!available) info = 'online play is not set up in this build.';
  else if (!validCode) info = "that link doesn't contain a valid room code.";
  else if (lookup.state === 'checking') info = 'looking for the room…';
  else if (lookup.state === 'waiting')
    info =
      'waiting for the room to answer… if the host has the game in the background, ask them to open it.';
  else if (lookup.state === 'missing')
    info = 'no room found. it may have ended, or the code is wrong.';
  else if (spectate) info = 'the game has started — you can watch until the next one.';
  else {
    const host = room.players.find((p) => p.pid === room.hostPid)?.name ?? 'the host';
    info = `${room.players.length} in the lobby · hosted by ${host}`;
  }

  return (
    <SafeAreaView style={styles.root}>
      <PageMeta title="Join a game" description="You're invited to a game of Word Fuse." noindex />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title} accessibilityRole="header">
          join room
        </Text>
        <Text style={styles.code}>{validCode ? code : '----'}</Text>
        <Text style={styles.info} accessibilityLiveRegion="polite">
          {info}
        </Text>
        <View style={styles.form}>
          <TextField
            label="your name"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
            }}
            maxLength={MP_NAME_MAX_LENGTH}
            placeholder="name"
            autoCapitalize="words"
            onSubmitEditing={() => canJoin && join()}
            error={error}
          />
          <Button
            label={spectate ? 'watch' : 'join'}
            icon={spectate ? 'eye' : 'log-in'}
            onPress={join}
            disabled={!canJoin}
          />
          {dictionary.status !== 'ready' ? <Text style={styles.hint}>loading words…</Text> : null}
          {lookup.state === 'missing' ? (
            <Button
              label="try again"
              icon="refresh-cw"
              variant="secondary"
              onPress={() => {
                setLookup({ state: 'checking', room: null });
                setAttempt((n) => n + 1);
              }}
            />
          ) : null}
          <Button label="home" variant="secondary" onPress={() => router.replace('/home')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { fontFamily: fonts.bold, color: colors.ink, fontSize: 28 },
  code: { fontFamily: fonts.bold, color: colors.ink, fontSize: 48, letterSpacing: 10 },
  info: {
    fontFamily: fonts.regular,
    color: colors.inkSoft,
    fontSize: 14,
    textAlign: 'center',
    minHeight: 40,
    maxWidth: 320,
  },
  form: { width: '100%', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  hint: { fontFamily: fonts.regular, color: colors.faded, fontSize: 13 },
});
