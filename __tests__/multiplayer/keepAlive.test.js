import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

// The Android keep-alive module, replaced by a recording fake.
const keepAlive = {
  running: false,
  listeners: {},
  calls: [],
};
jest.mock('../../modules/room-keepalive', () => ({
  isKeepAliveSupported: () => true,
  isRoomKeepAliveRunning: () => keepAlive.running,
  startRoomKeepAlive: (opts) => {
    keepAlive.calls.push(['start', opts.title]);
    keepAlive.running = true;
    return true;
  },
  stopRoomKeepAlive: () => {
    keepAlive.calls.push(['stop']);
    keepAlive.running = false;
  },
  setRoomKeepAliveInBackground: (bg) => keepAlive.calls.push(['background', bg]),
  addRoomKeepAliveListener: (name, cb) => {
    keepAlive.listeners[name] = cb;
    return { remove: () => delete keepAlive.listeners[name] };
  },
}));

jest.mock('../../src/context/AppContext', () => ({
  useApp: () => ({
    dictionary: { status: 'ready', repository: require('../fixtures/fakes').fixtureRepository() },
    fragments: require('../fixtures/fakes').fixtureFragments,
    settings: { lives: 2, secondsPerWord: 10 },
  }),
}));

// A transport that records leaves, so we can see the room being left.
const links = [];
jest.mock('../../src/multiplayer/transport', () => ({
  getConnect:
    () =>
    (code, { pid }) => {
      const link = {
        code,
        pid,
        left: false,
        send: jest.fn(),
        onMessage() {},
        onPresence() {},
        onStatus() {},
        track() {},
        leave() {
          link.left = true;
        },
      };
      links.push(link);
      return link;
    },
}));

let appStateHandler = null;
beforeEach(() => {
  keepAlive.running = false;
  keepAlive.calls = [];
  keepAlive.listeners = {};
  links.length = 0;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, cb) => {
    appStateHandler = cb;
    return { remove() {} };
  });
});
afterEach(() => jest.restoreAllMocks());

async function setup() {
  const { MultiplayerProvider, useMultiplayer } = require('../../src/context/MultiplayerContext');
  return renderHook(() => useMultiplayer(), { wrapper: MultiplayerProvider });
}

describe('Android keep-alive for multiplayer rooms', () => {
  it('starts when entering a room and stops when leaving it', async () => {
    const { result } = await setup();
    await act(() => result.current.joinRoom('K7QD', 'Ann'));
    expect(keepAlive.calls).toContainEqual(['start', 'Word Fuse · room K7QD']);
    await act(() => result.current.leaveRoom());
    expect(keepAlive.calls.at(-1)).toEqual(['stop']);
    expect(links[0].left).toBe(true);
  });

  it('tracks background/foreground and restarts after the 10-minute limit stopped it', async () => {
    const { result } = await setup();
    await act(() => result.current.joinRoom('K7QD', 'Ann'));
    await act(() => appStateHandler('background'));
    expect(keepAlive.calls).toContainEqual(['background', true]);
    // The service gave up after 10 minutes in the background.
    await act(() => keepAlive.listeners.onExpired());
    expect(keepAlive.running).toBe(false);
    await act(() => appStateHandler('active'));
    expect(keepAlive.calls.slice(-2)).toEqual([
      ['background', false],
      ['start', 'Word Fuse · room K7QD'],
    ]);
    expect(links[0].send).toHaveBeenCalledWith('sync', {}); // re-syncs with the room
    await act(() => result.current.leaveRoom()); // no session timers outlive the test
  });

  it('leaves the room properly when the app is swiped away', async () => {
    const { result } = await setup();
    await act(() => result.current.joinRoom('K7QD', 'Ann'));
    await act(() => keepAlive.listeners.onTaskRemoved());
    expect(links[0].left).toBe(true);
    expect(result.current.session).toBeNull();
    expect(keepAlive.running).toBe(false);
  });
});
