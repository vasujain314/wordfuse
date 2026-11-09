import { configKey, createConfig } from '../src/game/gameConfig';

describe('gameConfig', () => {
  it('uses defaults', () => {
    expect(createConfig()).toEqual({ lives: 2, secondsPerWord: 10 });
  });

  it('clamps values to their ranges', () => {
    expect(createConfig({ lives: 9, secondsPerWord: 1 })).toEqual({ lives: 5, secondsPerWord: 5 });
    expect(createConfig({ lives: 0, secondsPerWord: 99 })).toEqual({
      lives: 1,
      secondsPerWord: 30,
    });
  });

  it('builds the config key', () => {
    expect(configKey(createConfig({ lives: 3, secondsPerWord: 15 }))).toBe('L3_T15');
  });
});
