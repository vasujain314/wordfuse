const channels = [];

jest.mock('@supabase/realtime-js', () => ({
  RealtimeClient: jest.fn().mockImplementation((url, options) => ({
    url,
    options,
    channel: jest.fn((topic, config) => {
      const handlers = [];
      const channel = {
        topic,
        config,
        handlers,
        presence: {},
        on: jest.fn((kind, filter, cb) => {
          handlers.push({ kind, filter, cb });
          return channel;
        }),
        subscribe: jest.fn((cb) => {
          channel.statusCb = cb;
          return channel;
        }),
        send: jest.fn(),
        track: jest.fn(() => Promise.resolve()),
        untrack: jest.fn(() => Promise.resolve()),
        presenceState: () => channel.presence,
      };
      channels.push(channel);
      return channel;
    }),
    removeChannel: jest.fn(() => Promise.resolve('ok')),
    disconnect: jest.fn(),
  })),
}));

describe('supabase transport', () => {
  let connectSupabase;
  beforeAll(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://demo.supabase.co/';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    ({ connectSupabase } = require('../../src/multiplayer/transport/supabaseTransport'));
  });

  it('joins room:<code> with broadcast + presence keyed by player id', () => {
    connectSupabase('K7QD', { pid: 'p1' });
    const ch = channels.at(-1);
    expect(ch.topic).toBe('room:K7QD');
    expect(ch.config).toEqual({
      config: { broadcast: { self: false, ack: false }, presence: { key: 'p1' } },
    });
    const { RealtimeClient } = require('@supabase/realtime-js');
    expect(RealtimeClient).toHaveBeenCalledWith('https://demo.supabase.co/realtime/v1', {
      params: { apikey: 'anon-key', eventsPerSecond: 20 },
    });
  });

  it('wraps outgoing messages with the sender and unwraps incoming ones', () => {
    const link = connectSupabase('K7QD', { pid: 'p1' });
    const ch = channels.at(-1);
    const got = [];
    link.onMessage((type, data, from) => got.push([type, data, from]));
    link.send('submit', { turnId: 3, word: 'PROTON' });
    expect(ch.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'submit',
      payload: { from: 'p1', data: { turnId: 3, word: 'PROTON' } },
    });
    const onSubmit = ch.handlers.find((h) => h.kind === 'broadcast' && h.filter.event === 'submit');
    onSubmit.cb({ payload: { from: 'p2', data: { turnId: 3, word: 'TONE' } } });
    onSubmit.cb({ payload: { data: {} } }); // no sender: ignored
    expect(got).toEqual([['submit', { turnId: 3, word: 'TONE' }, 'p2']]);
  });

  it('tracks presence again every time the channel (re)subscribes', () => {
    const link = connectSupabase('K7QD', { pid: 'p1' });
    const ch = channels.at(-1);
    const statuses = [];
    link.onStatus((s) => statuses.push(s));
    const meta = { pid: 'p1', name: 'Ann', intent: 'player', v: 1 };
    link.track(meta);
    expect(ch.track).not.toHaveBeenCalled(); // not subscribed yet
    ch.statusCb('SUBSCRIBED');
    ch.statusCb('CHANNEL_ERROR');
    ch.statusCb('SUBSCRIBED'); // reconnected
    expect(ch.track).toHaveBeenCalledTimes(2);
    expect(ch.track).toHaveBeenCalledWith(meta);
    expect(statuses).toEqual(['subscribed', 'error', 'subscribed']);
  });

  it('reports presence members without Supabase internals', () => {
    const link = connectSupabase('K7QD', { pid: 'p1' });
    const ch = channels.at(-1);
    const seen = [];
    link.onPresence((members) => seen.push(members));
    ch.presence = {
      p1: [{ pid: 'p1', name: 'Ann', presence_ref: 'x' }],
      p2: [{ pid: 'p2', name: 'Ben', presence_ref: 'y' }],
    };
    ch.handlers.find((h) => h.kind === 'presence').cb();
    expect(seen).toEqual([
      [
        { pid: 'p1', name: 'Ann' },
        { pid: 'p2', name: 'Ben' },
      ],
    ]);
  });

  it('rejoining the same room right after leaving gets a fresh channel', async () => {
    const { RealtimeClient } = require('@supabase/realtime-js');
    const probe = connectSupabase('H3VZ', { pid: 'probe' });
    const probeChannel = channels.at(-1);
    probeChannel.statusCb('SUBSCRIBED');
    probe.leave();
    const join = connectSupabase('H3VZ', { pid: 'p1' });
    const joinChannel = channels.at(-1);
    expect(joinChannel).not.toBe(probeChannel);
    expect(joinChannel.subscribe).toHaveBeenCalledTimes(1);
    expect(joinChannel.on).toHaveBeenCalledWith(
      'presence',
      { event: 'sync' },
      expect.any(Function),
    );
    await Promise.resolve();
    await Promise.resolve();
    const probeClient = RealtimeClient.mock.results.at(-2).value;
    expect(probeClient.removeChannel).toHaveBeenCalledWith(probeChannel);
    expect(probeClient.disconnect).toHaveBeenCalled();
    join.leave();
  });
});
