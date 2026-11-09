import { heartsFor } from '../../src/components/LivesIndicator';
import { shortestTurn } from '../../src/components/TurnPointer';
import { ringSizeForFragment } from '../../src/screens/room/MultiplayerGameView';

describe('multiplayer board helpers', () => {
  it('turns the pointer the short way round', () => {
    expect(shortestTurn(0, 90)).toBe(90);
    expect(shortestTurn(350, 10)).toBe(20);
    expect(shortestTurn(10, 350)).toBe(-20);
    expect(shortestTurn(720 + 45, 0)).toBe(-45);
    expect(shortestTurn(0, 180)).toBe(180);
  });

  it('sizes the ring to the fragment', () => {
    expect(ringSizeForFragment('ON')).toBe(104);
    expect(ringSizeForFragment('ONE')).toBe(121);
    expect(ringSizeForFragment('PBOA')).toBe(146);
    expect(ringSizeForFragment(undefined)).toBe(104);
  });

  it('shows lives as hearts, filled then empty', () => {
    expect(heartsFor(2, 2)).toBe('♥︎♥︎');
    expect(heartsFor(1, 2)).toBe('♥︎♡︎');
    expect(heartsFor(0, 2)).toBe('♡︎♡︎');
  });
});
