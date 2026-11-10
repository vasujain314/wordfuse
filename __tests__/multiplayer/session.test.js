import {
  COUNTDOWN_FROM,
  COUNTDOWN_STEP_MS,
  MP_ABSENT_LEAVE_MS,
  MP_ACCEPT_PAUSE_MS,
  MP_SUBMIT_GRACE_MS,
  MP_TAKEOVER_MIN_REMAINING_MS,
  TIMEOUT_PAUSE_MS,
} from '../../src/core/constants';
import { RoomPhase } from '../../src/multiplayer/protocol';
import { leaderboard } from '../../src/multiplayer/roomState';
import { probeRoom, RoomSession } from '../../src/multiplayer/roomSession';
import {
  createFakeTime,
  fixtureFragments,
  fixtureRepository,
  fixtureWords,
  seededRandom,
} from '../fixtures/fakes';
import { createMemoryNetwork } from '../fixtures/memoryNetwork';

const SETTLE = 200;
const START_MS = COUNTDOWN_FROM * COUNTDOWN_STEP_MS + SETTLE;

function setup({ players = ['Ann', 'Ben', 'Cat'], latency = 20 } = {}) {
  const time = createFakeTime(0);
  const net = createMemoryNetwork(time, { latency });
  const repository = fixtureRepository();
  const events = {};
  const make = (pid, name, role, spectate = false) => {
    const session = new RoomSession({
      connect: net.connect,
      code: 'K7QD',
      pid,
      name,
      role,
      spectate,
      settings: { lives: 2, secondsPerWord: 10 },
      now: time.now,
      schedule: time.schedule,
      random: seededRandom(pid.charCodeAt(1) + 1),
      repository,
      fragments: fixtureFragments,
    }).open();
    events[pid] = [];
    session.onEvent((e) => events[pid].push(e));
    return session;
  };
  const sessions = players.map((name, i) => make(`p${i}`, name, i === 0 ? 'host' : 'join'));
  time.advance(SETTLE);
  const room = (s = sessions[0]) => s.getSnapshot().room;
  const by = (pid) => sessions.find((s) => s.pid === pid);
  const active = () => by(room().turn.pid);
  /** An unused dictionary word containing the current fragment. */
  const answer = () => {
    const { fragment } = room().turn;
    return fixtureWords.find((w) => w.includes(fragment) && !room().usedWords.includes(w));
  };
  const type = (session, word) => [...word].forEach((l) => session.typeLetter(l));
  return { time, net, sessions, make, room, by, active, answer, type, events };
}

describe('multiplayer room', () => {
  it('seats joiners in the lobby with de-duplicated names', () => {
    const { room, sessions, make, time } = setup({ players: ['Ann', 'Ben'] });
    make('p9', 'ann', 'join');
    time.advance(SETTLE);
    expect(room().players.map((p) => [p.pid, p.name, p.seat])).toEqual([
      ['p0', 'Ann', 0],
      ['p1', 'Ben', 1],
      ['p9', 'ann 2', 2],
    ]);
    expect(room(sessions[1])).toEqual(room());
    expect(sessions[0].getSnapshot().isHost).toBe(true);
    expect(sessions[1].getSnapshot().isHost).toBe(false);
  });

  it('starts after a 3-2-1 countdown with the same turn on every device', () => {
    const { room, sessions, time } = setup();
    expect(sessions[1].start()).toBe(false); // only the host can start
    expect(sessions[0].start()).toBe(true);
    time.advance(SETTLE);
    expect(room().phase).toBe(RoomPhase.countdown);
    time.advance(START_MS);
    const turns = sessions.map((s) => s.getSnapshot().room.turn);
    expect(room().phase).toBe(RoomPhase.turn);
    expect(new Set(turns.map((t) => `${t.id}:${t.pid}:${t.fragment}`)).size).toBe(1);
  });

  it('shows the active player typing on every device, throttled', () => {
    const { sessions, active, type, time, net, room } = setup();
    sessions[0].start();
    time.advance(START_MS);
    const me = active();
    const before = net.messagesSent();
    type(me, 'PROTO');
    time.advance(400);
    for (const s of sessions) expect(s.getSnapshot().input).toBe('PROTO');
    expect(net.messagesSent() - before).toBeLessThanOrEqual(2);
    // Others can't type on someone else's turn.
    const other = sessions.find((s) => s !== me);
    other.typeLetter('X');
    expect(other.getSnapshot().input).toBe('PROTO');
    expect(room().turn.pid).toBe(me.pid);
  });

  it('accepts a valid word everywhere, then passes the turn clockwise', () => {
    const { sessions, active, answer, type, time, room, events } = setup();
    sessions[0].start();
    time.advance(START_MS);
    const me = active();
    const word = answer();
    type(me, word);
    me.submit();
    time.advance(SETTLE);
    for (const s of sessions) {
      const accepted = events[s.pid].filter((e) => e.type === 'wordAccepted');
      expect(accepted).toEqual([expect.objectContaining({ pid: me.pid, word })]);
    }
    expect(room().players.find((p) => p.pid === me.pid).words).toBe(1);
    time.advance(MP_ACCEPT_PAUSE_MS);
    const seat = room().players.find((p) => p.pid === me.pid).seat;
    const nextSeat = room().players.find((p) => p.pid === room().turn.pid).seat;
    expect(nextSeat).toBe((seat + 1) % 3);
  });

  it('shakes a wrong word on every device without changing the room', () => {
    const { sessions, active, type, time, room, events } = setup();
    sessions[0].start();
    time.advance(START_MS);
    const me = active();
    const version = room().version;
    type(me, 'ZZZ');
    expect(me.submit().kind).toBe('missingFragment');
    time.advance(SETTLE);
    for (const s of sessions) {
      expect(events[s.pid].filter((e) => e.type === 'reject')).toEqual([
        expect.objectContaining({ pid: me.pid, kind: 'missingFragment' }),
      ]);
    }
    expect(room().version).toBe(version + 0);
  });

  it('a timeout costs a life and shows the same answer everywhere', () => {
    const { sessions, active, time, room, events } = setup();
    sessions[0].start();
    time.advance(START_MS);
    const loser = active().pid;
    time.advance(10000 + MP_SUBMIT_GRACE_MS);
    const answers = sessions.map(
      (s) => events[s.pid].find((e) => e.type === 'lifeLost' && e.pid === loser)?.answer,
    );
    expect(new Set(answers).size).toBe(1);
    expect(answers[0]).toEqual(expect.stringContaining(room().turn.fragment));
    expect(room().players.find((p) => p.pid === loser).lives).toBe(1);
  });

  it('accepts a submit that arrives within the grace after the deadline', () => {
    const { sessions, active, answer, type, time, room } = setup({ latency: 200 });
    sessions[0].start();
    time.advance(COUNTDOWN_FROM * COUNTDOWN_STEP_MS + 1000);
    const me = active();
    expect(me.getSnapshot().isHost).toBe(false);
    type(me, answer());
    time.advance(me.getSnapshot().turnEndsAt - time.now() - 50); // just before local zero
    me.submit();
    time.advance(1000);
    expect(room().players.find((p) => p.pid === me.pid).words).toBe(1);
  });

  it('plays to the last player standing and ranks everyone by words', () => {
    const { sessions, active, answer, type, time, room, events } = setup();
    sessions[0].start();
    time.advance(START_MS);
    // First player scores one word, then everyone just runs out of time.
    const scorer = active();
    type(scorer, answer());
    scorer.submit();
    time.advance(MP_ACCEPT_PAUSE_MS + SETTLE);
    for (let i = 0; i < 20 && room().phase !== RoomPhase.finished; i += 1) {
      time.advance(10000 + MP_SUBMIT_GRACE_MS + TIMEOUT_PAUSE_MS + SETTLE);
    }
    expect(room().phase).toBe(RoomPhase.finished);
    const board = leaderboard(room());
    expect(board.filter((r) => r.winner)).toHaveLength(1);
    expect(board[0].pid).toBe(scorer.pid);
    for (const s of sessions) {
      expect(events[s.pid].filter((e) => e.type === 'gameOver')).toHaveLength(1);
    }
  });

  it('late joiners watch as spectators and do not replay old events', () => {
    const { sessions, make, time, room } = setup();
    sessions[0].start();
    time.advance(START_MS);
    const late = make('p8', 'Late', 'join');
    const seen = [];
    late.onEvent((e) => seen.push(e));
    time.advance(SETTLE);
    expect(room().spectators).toEqual([{ pid: 'p8', name: 'Late' }]);
    expect(late.getSnapshot().room.turn.id).toBe(room().turn.id);
    expect(seen).toEqual([]);
    late.typeLetter('A');
    expect(late.getSnapshot().input).toBe('');
  });

  it('host drops mid-turn: the next player takes over and the turn keeps time', () => {
    const { sessions, net, time, room } = setup({ players: ['Ann', 'Ben', 'Cat', 'Dan'] });
    sessions[0].start();
    time.advance(START_MS);
    const turnId = room(sessions[1]).turn.id;
    time.advance(8000); // 2 s left on the clock
    net.disconnect('p0');
    time.advance(4000);
    const newHost = sessions.find((s) => s.getSnapshot().isHost && s.pid !== 'p0');
    expect(newHost.pid).toBe('p1'); // clockwise after the host's seat
    const r = room(sessions[2]);
    expect(r.epoch).toBe(2);
    expect(r.hostPid).toBe('p1');
    // The turn continued (or was resolved by the new host), not lost to the outage.
    expect(r.turn.id).toBeGreaterThanOrEqual(turnId);
    for (let i = 0; i < 30 && room(sessions[2]).phase !== RoomPhase.finished; i += 1) {
      time.advance(10000 + MP_SUBMIT_GRACE_MS + TIMEOUT_PAUSE_MS + SETTLE);
    }
    expect(room(sessions[2]).phase).toBe(RoomPhase.finished);
    expect(room(sessions[3])).toEqual(room(sessions[2]));
  });

  it('a player who drops out mid-game is out after a short grace, not left to win', () => {
    const { sessions, net, time, room } = setup({ players: ['Ann', 'Ben', 'Cat'] });
    sessions[0].start();
    time.advance(START_MS);
    net.disconnect('p2');
    time.advance(MP_ABSENT_LEAVE_MS - 2000);
    expect(room().players.find((p) => p.pid === 'p2').status).not.toBe('left'); // grace
    time.advance(4000);
    expect(room().players.find((p) => p.pid === 'p2').status).toBe('left');
    for (let i = 0; i < 20 && room().phase !== RoomPhase.finished; i += 1) {
      time.advance(10000 + MP_SUBMIT_GRACE_MS + TIMEOUT_PAUSE_MS + SETTLE);
    }
    expect(room().winnerPid).not.toBe('p2');
  });

  it('the new host marks a vanished old host as left', () => {
    const { sessions, net, time, room } = setup({ players: ['Ann', 'Ben', 'Cat'] });
    sessions[0].start();
    time.advance(START_MS);
    net.disconnect('p0');
    time.advance(MP_ABSENT_LEAVE_MS + 7000);
    expect(room(sessions[1]).hostPid).toBe('p1');
    expect(room(sessions[1]).players.find((p) => p.pid === 'p0').status).toBe('left');
  });

  it('a takeover never leaves the active player with less than the minimum time', () => {
    const { sessions, net, time, room, by } = setup({ players: ['Ann', 'Ben', 'Cat'] });
    sessions[0].start();
    time.advance(START_MS);
    for (let i = 0; i < 3 && room(sessions[1]).turn.pid === 'p0'; i += 1) {
      time.advance(10000 + MP_SUBMIT_GRACE_MS + TIMEOUT_PAUSE_MS + SETTLE);
    }
    const victim = by(room(sessions[1]).turn.pid);
    const turnId = room(victim).turn.id;
    time.advance(victim.getSnapshot().turnEndsAt - time.now() - 700); // 0.7 s left
    net.disconnect('p0');
    // Wait until someone has taken over (the turn would long have run out by now).
    for (let i = 0; i < 40 && room(victim).epoch === 1; i += 1) time.advance(100);
    expect(room(victim).epoch).toBe(2);
    expect(room(victim).turn.id).toBe(turnId);
    expect(room(victim).phase).toBe(RoomPhase.turn);
    expect(victim.getSnapshot().turnEndsAt - time.now()).toBeGreaterThan(
      MP_TAKEOVER_MIN_REMAINING_MS - 500,
    );
    expect(room(victim).players.find((p) => p.pid === victim.pid).lives).toBe(2);
  });

  it('a submit lost while the host was down is resent to the new host', () => {
    const { sessions, net, time, room, by, answer, type } = setup({
      players: ['Ann', 'Ben', 'Cat'],
    });
    sessions[0].start();
    time.advance(START_MS);
    // Make sure a non-host player is up: pass turns until then.
    for (let i = 0; i < 3 && room(sessions[1]).turn.pid === 'p0'; i += 1) {
      time.advance(10000 + MP_SUBMIT_GRACE_MS + TIMEOUT_PAUSE_MS + SETTLE);
    }
    const me = by(room(sessions[1]).turn.pid);
    net.disconnect('p0');
    type(me, answer());
    me.submit(); // goes to the dead host and is lost
    expect(me.getSnapshot().pendingSubmit).toBe(true);
    time.advance(6000);
    const scorer = room(me).players.find((p) => p.pid === me.pid);
    expect(scorer.words).toBe(1);
    expect(me.getSnapshot().pendingSubmit).toBe(false);
  });

  it('after a network split heals, exactly one host remains', () => {
    const { sessions, net, time, room } = setup({ players: ['Ann', 'Ben', 'Cat', 'Dan'] });
    sessions[0].start();
    time.advance(START_MS);
    net.partition(['p0', 'p1'], ['p2', 'p3']);
    time.advance(9000);
    expect(sessions.filter((s) => s.getSnapshot().isHost).length).toBe(2);
    net.heal();
    time.advance(5000);
    const hosts = sessions.filter((s) => s.getSnapshot().isHost);
    expect(hosts).toHaveLength(1);
    const final = room(sessions[0]);
    for (const s of sessions) expect(s.getSnapshot().room.hostPid).toBe(final.hostPid);
  });

  it('a host that comes back after being replaced steps down', () => {
    const { sessions, net, time } = setup({ players: ['Ann', 'Ben', 'Cat'] });
    sessions[0].start();
    time.advance(START_MS);
    net.disconnect('p0');
    time.advance(8000);
    expect(sessions[1].getSnapshot().isHost).toBe(true);
    net.reconnect('p0');
    time.advance(4000);
    expect(sessions[0].getSnapshot().isHost).toBe(false);
    expect(sessions[0].getSnapshot().room.hostPid).toBe('p1');
  });

  it('a leaving host hands the room over straight away', () => {
    const { sessions, time, room } = setup({ players: ['Ann', 'Ben', 'Cat'] });
    sessions[0].start();
    time.advance(START_MS);
    sessions[0].leave();
    time.advance(SETTLE);
    expect(sessions[1].getSnapshot().isHost).toBe(true);
    const r = room(sessions[2]);
    expect(r.hostPid).toBe('p1');
    expect(r.players.find((p) => p.pid === 'p0').status).toBe('left');
  });

  it('a player leaving the lobby frees their seat; rematch returns to the lobby', () => {
    const { sessions, time, room } = setup({ players: ['Ann', 'Ben', 'Cat'] });
    sessions[2].leave();
    time.advance(SETTLE);
    expect(room().players.map((p) => p.name)).toEqual(['Ann', 'Ben']);
    sessions[0].start();
    time.advance(START_MS);
    for (let i = 0; i < 20 && room().phase !== RoomPhase.finished; i += 1) {
      time.advance(10000 + MP_SUBMIT_GRACE_MS + TIMEOUT_PAUSE_MS + SETTLE);
    }
    sessions[0].rematch();
    time.advance(SETTLE);
    expect(room(sessions[1])).toMatchObject({ phase: RoomPhase.lobby, usedWords: [] });
    expect(room(sessions[1]).players.every((p) => p.words === 0 && p.lives === 2)).toBe(true);
  });

  it('probing finds a live room, and reports nothing for an empty code', async () => {
    const { net, time } = setup({ players: ['Ann', 'Ben'] });
    const found = probeRoom({
      connect: net.connect,
      code: 'K7QD',
      pid: 'probe',
      schedule: time.schedule,
      timeoutMs: 4000,
    });
    const missing = probeRoom({
      connect: net.connect,
      code: 'ZZZZ',
      pid: 'probe2',
      schedule: time.schedule,
      timeoutMs: 4000,
    });
    time.advance(5000);
    expect((await found).players.map((p) => p.name)).toEqual(['Ann', 'Ben']);
    expect(await missing).toBeNull();
  });

  it('probing waits for a slow connection before giving up on a room', async () => {
    const { net, time } = setup({ players: ['Ann', 'Ben'] });
    // A link whose channel only joins after 6 s (cold start / slow network).
    const slowConnect = (code, opts) => {
      const link = net.connect(code, opts);
      let statusCb = () => {};
      const realOnStatus = link.onStatus.bind(link);
      link.onStatus = (cb) => {
        statusCb = cb;
      };
      realOnStatus((status) => time.schedule(() => statusCb(status), 6000));
      return link;
    };
    const found = probeRoom({
      connect: slowConnect,
      code: 'K7QD',
      pid: 'probe',
      schedule: time.schedule,
      timeoutMs: 4000,
    });
    time.advance(8000);
    expect((await found).players.map((p) => p.name)).toEqual(['Ann', 'Ben']);
  });

  it('a friend can still join a lone host whose app was in the background', async () => {
    const { lookForRoom } = require('../../src/multiplayer/roomLookup');
    const { net, time, sessions } = setup({ players: ['Ann'] });
    const [host] = sessions;
    // The host's app is in the background long enough for its connection to drop.
    net.disconnect('p0');
    time.advance(70000);
    const updates = [];
    lookForRoom({
      probe: (code) =>
        probeRoom({
          connect: net.connect,
          code,
          pid: `probe${updates.length}`,
          schedule: time.schedule,
          timeoutMs: 4000,
        }),
      code: 'K7QD',
      schedule: time.schedule,
      now: time.now,
      onUpdate: (u) => updates.push(u),
      waitMs: 120000,
      retryMs: 3000,
    });
    const step = async (ms) => {
      for (let t = 0; t < ms; t += 500) {
        time.advance(500);
        for (let i = 0; i < 5; i += 1) await Promise.resolve();
      }
    };
    await step(15000);
    expect(updates.every((u) => u.state === 'waiting')).toBe(true);
    // The host comes back to the app: it reconnects and re-announces the room.
    net.reconnect('p0');
    host.onForeground();
    await step(10000);
    const found = updates.find((u) => u.state === 'found');
    expect(found.room.players.map((p) => p.name)).toEqual(['Ann']);
  });

  it('a host back from the background re-announces the room straight away', () => {
    const { net, time, sessions } = setup({ players: ['Ann', 'Ben'] });
    const before = net.messagesSent();
    sessions[0].onForeground();
    expect(net.messagesSent()).toBe(before + 1);
    time.advance(100);
    expect(sessions[1].getSnapshot().room.hostPid).toBe('p0');
  });

  it('probing gives up when the channel never connects', async () => {
    const { time } = setup({ players: ['Ann'] });
    const silent = () => ({
      onMessage() {},
      onPresence() {},
      onStatus() {},
      send() {},
      leave: jest.fn(),
    });
    const result = probeRoom({
      connect: silent,
      code: 'K7QD',
      pid: 'probe',
      schedule: time.schedule,
      timeoutMs: 4000,
    });
    time.advance(16000);
    expect(await result).toBeNull();
  });
});
