import { MP_MAX_PLAYERS } from '../../src/core/constants';
import { RoomPhase } from '../../src/multiplayer/protocol';
import {
  acceptWord,
  addMember,
  beginTurn,
  createLobby,
  finishGame,
  isGameOver,
  leaderboard,
  nextActive,
  rematch,
  removeMember,
  RoomEventType,
  startCountdown,
  timeoutTurn,
} from '../../src/multiplayer/roomState';
import { rankCandidates, resolveHostConflict } from '../../src/multiplayer/election';

const settings = { lives: 2, secondsPerWord: 10 };
const lobbyOf = (names) =>
  names
    .slice(1)
    .reduce(
      (s, name, i) => addMember(s, { pid: `p${i + 1}`, name }),
      createLobby({ code: 'K7QD', hostPid: 'p0', hostName: names[0], settings }),
    );
const playing = (state) => startCountdown(state, 3);
const turnFor = (state, pid, round = 1, fragment = 'ON') =>
  beginTurn(state, { pid, fragment, round, durationMs: 10000 });

describe('room state', () => {
  it('seats players in the lobby, de-duplicates names and bumps the version', () => {
    const room = lobbyOf(['Ann', 'Ben', 'ann']);
    expect(room.players.map((p) => [p.name, p.seat])).toEqual([
      ['Ann', 0],
      ['Ben', 1],
      ['ann 2', 2],
    ]);
    expect(room.version).toBe(2);
    expect(addMember(room, { pid: 'p1', name: 'Ben' })).toBe(room);
  });

  it('makes late joiners and overflow spectators', () => {
    const full = lobbyOf(Array.from({ length: MP_MAX_PLAYERS + 1 }, (_, i) => `P${i}`));
    expect(full.players).toHaveLength(MP_MAX_PLAYERS);
    expect(full.spectators).toHaveLength(1);
    const late = addMember(playing(lobbyOf(['Ann', 'Ben'])), { pid: 'x', name: 'Cat' });
    expect(late.spectators).toEqual([{ pid: 'x', name: 'Cat' }]);
  });

  it('closes up seats when someone leaves the lobby, marks them left in a game', () => {
    const lobby = removeMember(lobbyOf(['Ann', 'Ben', 'Cat']), 'p1');
    expect(lobby.players.map((p) => [p.name, p.seat])).toEqual([
      ['Ann', 0],
      ['Cat', 1],
    ]);
    const game = removeMember(playing(lobbyOf(['Ann', 'Ben', 'Cat'])), 'p1');
    expect(game.players[1]).toMatchObject({ status: 'left', outOrder: 1 });
  });

  it('passes turns clockwise, skipping players who are out, and marks a new round', () => {
    let room = playing(lobbyOf(['Ann', 'Ben', 'Cat']));
    expect(nextActive(room, 'p0')).toEqual({ pid: 'p1', wrapped: false });
    expect(nextActive(room, 'p2')).toEqual({ pid: 'p0', wrapped: true });
    room = removeMember(room, 'p1');
    expect(nextActive(room, 'p0')).toEqual({ pid: 'p2', wrapped: false });
    expect(nextActive(room, 'p1')).toEqual({ pid: 'p2', wrapped: false });
  });

  it('counts an accepted word and blocks it for everyone', () => {
    let room = turnFor(playing(lobbyOf(['Ann', 'Ben'])), 'p1');
    expect(room.lastEvent).toMatchObject({ type: RoomEventType.turnStarted, pid: 'p1' });
    room = acceptWord(room, 'PROTON');
    expect(room.players[1].words).toBe(1);
    expect(room.usedWords).toEqual(['PROTON']);
    expect(room.phase).toBe(RoomPhase.resolving);
    expect(room.lastEvent).toMatchObject({ type: RoomEventType.wordAccepted, word: 'PROTON' });
  });

  it('costs a life on timeout, eliminates at zero and ends with one player left', () => {
    let room = turnFor(playing(lobbyOf(['Ann', 'Ben'])), 'p1');
    room = timeoutTurn(room, 'STONE');
    expect(room.players[1]).toMatchObject({ lives: 1, status: 'alive' });
    expect(room.lastEvent).toMatchObject({ type: 'lifeLost', answer: 'STONE', eliminated: false });
    room = timeoutTurn(turnFor(room, 'p1', 2), null);
    expect(room.players[1]).toMatchObject({ lives: 0, status: 'eliminated', outOrder: 1 });
    expect(room.lastEvent.eliminated).toBe(true);
    expect(isGameOver(room)).toBe(true);
    room = finishGame(room);
    expect(room).toMatchObject({ phase: RoomPhase.finished, winnerPid: 'p0' });
  });

  it('ranks the leaderboard by words, then by who stayed in longer', () => {
    let room = playing(lobbyOf(['Ann', 'Ben', 'Cat']));
    room = acceptWord(turnFor(room, 'p1'), 'ONE'); // Ben 1 word
    room = acceptWord(turnFor(room, 'p2'), 'TONE'); // Cat 1 word
    room = timeoutTurn(turnFor(timeoutTurn(turnFor(room, 'p1'), null), 'p1'), null); // Ben out
    room = timeoutTurn(turnFor(timeoutTurn(turnFor(room, 'p0'), null), 'p0'), null); // Ann out
    room = finishGame(room);
    expect(leaderboard(room).map((r) => [r.rank, r.name, r.words, r.winner])).toEqual([
      [1, 'Cat', 1, true],
      [2, 'Ben', 1, false],
      [3, 'Ann', 0, false],
    ]);
  });

  it('rematch resets scores and seats waiting spectators', () => {
    let room = addMember(playing(lobbyOf(['Ann', 'Ben'])), { pid: 'x', name: 'Cat' });
    room = finishGame(acceptWord(turnFor(room, 'p1'), 'ONE'));
    room = rematch(room, ['p0', 'p1', 'x']);
    expect(room.phase).toBe(RoomPhase.lobby);
    expect(room.players.map((p) => [p.name, p.words, p.lives])).toEqual([
      ['Ann', 0, 2],
      ['Ben', 0, 2],
      ['Cat', 0, 2],
    ]);
    expect(room.spectators).toEqual([]);
    expect(room.usedWords).toEqual([]);
  });
});

describe('host election', () => {
  const room = playing(lobbyOf(['Ann', 'Ben', 'Cat', 'Dan']));

  it('ranks present players clockwise after the old host, then spectators', () => {
    const withWatcher = addMember(room, { pid: 'w', name: 'Wes' });
    expect(rankCandidates(withWatcher, ['p0', 'p1', 'p2', 'p3', 'w'], 'p2')).toEqual([
      'p3',
      'p0',
      'p1',
      'w',
    ]);
    expect(rankCandidates(withWatcher, ['p0', 'w'], 'p2')).toEqual(['p0', 'w']);
  });

  it('settles two hosts of the same epoch the same way on both sides', () => {
    const a = { ...room, epoch: 3, hostPid: 'p2' };
    const b = { ...room, epoch: 3, hostPid: 'p1' };
    expect(resolveHostConflict(a, b)).toBe(b);
    expect(resolveHostConflict(b, a)).toBe(b);
  });
});
