import { createAlerter, describeError } from '../../src/multiplayer/errorAlert';

function setup({ offline = false, enabled = true } = {}) {
  let t = 1_000_000;
  const calls = [];
  const fetch = jest.fn(async (url, opts) => {
    calls.push({ url, opts });
    if (url.endsWith('/robots.txt') && offline) throw new Error('Network request failed');
    if (url.includes('/rest/v1/')) return { ok: false, status: 540 };
    return { ok: true, status: 200 };
  });
  const report = createAlerter({
    enabled,
    fetch,
    now: () => t,
    supabaseUrl: 'https://demo.supabase.co/',
    supabaseKey: 'anon',
  });
  const emails = () => calls.filter((c) => c.url.startsWith('https://formsubmit.co/'));
  return { report, emails, advance: (ms) => (t += ms) };
}

describe('multiplayer error alerts', () => {
  it('emails the error, room, platform and Supabase status', async () => {
    const { report, emails } = setup();
    await expect(
      report('CHANNEL_ERROR', new Error('WebSocket closed'), { room: 'K7QD' }),
    ).resolves.toBe(true);
    const [mail] = emails();
    expect(mail.url).toBe('https://formsubmit.co/ajax/iamvasujain314@gmail.com');
    const body = JSON.parse(mail.opts.body);
    expect(body._subject).toBe('Word Fuse multiplayer error: CHANNEL_ERROR');
    expect(body.error).toContain('WebSocket closed');
    expect(body.room).toBe('K7QD');
    expect(body.supabase_rest).toBe('HTTP 540');
  });

  it('sends a kind of error once per 30 minutes and at most 3 per session', async () => {
    const { report, emails, advance } = setup();
    await report('TIMED_OUT', 'x');
    await report('TIMED_OUT', 'x');
    expect(emails()).toHaveLength(1);
    advance(31 * 60 * 1000);
    await report('TIMED_OUT', 'x');
    await report('presence', 'y');
    await report('system', 'z');
    expect(emails()).toHaveLength(3);
  });

  it('a burst of the same error sends one email', async () => {
    const { report, emails } = setup();
    await Promise.all([report('CHANNEL_ERROR', 'a'), report('CHANNEL_ERROR', 'a')]);
    expect(emails()).toHaveLength(1);
  });

  it('stays quiet when the device is offline or alerts are off', async () => {
    const off = setup({ offline: true });
    await expect(off.report('CHANNEL_ERROR', 'x')).resolves.toBe(false);
    expect(off.emails()).toHaveLength(0);
    const disabled = setup({ enabled: false });
    await disabled.report('CHANNEL_ERROR', 'x');
    expect(disabled.emails()).toHaveLength(0);
  });

  it('describes errors of any shape', () => {
    expect(describeError(undefined)).toBe('(no error details)');
    expect(describeError({ status: 'error', message: 'Too many messages' })).toContain(
      'Too many messages',
    );
    const loop = { a: 1 };
    loop.self = loop;
    expect(describeError(loop)).toContain('[circular]');
  });
});
