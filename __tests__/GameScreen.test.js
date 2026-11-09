import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { createInitialState, updateState } from '../src/game/gameState';
import { GameScreen, tickHapticFor } from '../src/screens/GameScreen';
import { noopHapticsService } from '../src/services/hapticsService';

// Skia canvases need a native/wasm renderer; the board logic is what this test covers.
jest.mock('../src/components/GameCanvas', () => ({ GameCanvas: () => null }));
jest.mock('../src/components/ScoreFire', () => ({ ScoreFire: () => null }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    SafeAreaProvider: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

function createFakeController(initial) {
  let state = updateState(createInitialState({ lives: 2, secondsPerWord: 10 }), initial);
  const listeners = new Set();
  const eventListeners = new Set();
  return {
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSnapshot: () => state,
    onEvent: (l) => {
      eventListeners.add(l);
      return () => eventListeners.delete(l);
    },
    now: () => 0,
    frame: jest.fn(),
    typeLetter: jest.fn(),
    backspace: jest.fn(),
    submit: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    setState(changes) {
      state = updateState(state, changes);
      listeners.forEach((l) => l());
    },
    emit(event) {
      eventListeners.forEach((l) => l(event));
    },
  };
}

const renderScreen = (controller, overrides = {}) =>
  render(
    <GameScreen
      controller={controller}
      haptics={noopHapticsService}
      reduceMotion
      maxLives={2}
      onQuit={jest.fn()}
      onGameOver={jest.fn()}
      {...overrides}
    />,
  );

describe('GameScreen', () => {
  beforeEach(() => {
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation(() => 1);
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('renders the fragment, timer, lives, score and streak', async () => {
    const controller = createFakeController({
      phase: 'playing',
      fragment: 'ON',
      input: 'PROT',
      score: 3,
      streak: 2,
      secondsLeft: 7,
    });
    await renderScreen(controller);
    expect(screen.getByText('ON')).toBeTruthy();
    expect(screen.getByLabelText('Fragment O N')).toBeTruthy();
    expect(screen.getByLabelText('7 seconds left')).toBeTruthy();
    expect(screen.getByLabelText('2 of 2 lives left')).toBeTruthy();
    expect(screen.getByLabelText('Score 3')).toBeTruthy();
    expect(screen.getByLabelText(/^Streak 2/)).toBeTruthy();
    expect(screen.getByLabelText('Your word: P R O T')).toBeTruthy();
  });

  it('forwards keyboard input to the controller', async () => {
    const controller = createFakeController({ phase: 'playing', fragment: 'ON' });
    await renderScreen(controller);
    await fireEvent.press(screen.getByLabelText('Q'));
    await fireEvent.press(screen.getByLabelText('Backspace'));
    await fireEvent.press(screen.getByLabelText('Submit word'));
    await fireEvent.press(screen.getByLabelText('Pause'));
    expect(controller.typeLetter).toHaveBeenCalledWith('Q');
    expect(controller.backspace).toHaveBeenCalled();
    expect(controller.submit).toHaveBeenCalled();
    expect(controller.pause).toHaveBeenCalled();
  });

  it('hides the fragment and shows the pause menu while paused', async () => {
    const controller = createFakeController({ phase: 'paused', fragment: 'ON' });
    const onQuit = jest.fn();
    await renderScreen(controller, { onQuit });
    expect(screen.queryByText('ON')).toBeNull();
    expect(screen.getByLabelText('Fragment hidden', { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(screen.getByText('RESUME'));
    expect(controller.resume).toHaveBeenCalled();
    await fireEvent.press(screen.getByText('QUIT TO HOME'));
    expect(onQuit).toHaveBeenCalled();
  });

  it('shows the resume countdown', async () => {
    const controller = createFakeController({ phase: 'paused', fragment: 'ON', countdown: 2 });
    await renderScreen(controller);
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('updates when the controller publishes a new snapshot', async () => {
    const controller = createFakeController({ phase: 'playing', fragment: 'ON', score: 0 });
    await renderScreen(controller);
    await act(() => controller.setState({ score: 1, fragment: 'AT' }));
    expect(screen.getByLabelText('Score 1')).toBeTruthy();
    expect(screen.getByText('AT')).toBeTruthy();
  });

  it('reports game over after the dim delay', async () => {
    jest.useFakeTimers();
    const controller = createFakeController({ phase: 'playing', fragment: 'ON' });
    const onGameOver = jest.fn();
    await renderScreen(controller, { onGameOver });
    await act(() => controller.emit({ type: 'gameOver', score: 4, bestStreak: 3 }));
    await act(() => jest.runAllTimers());
    expect(onGameOver).toHaveBeenCalledWith({ score: 4, bestStreak: 3 });
    jest.useRealTimers();
  });
});

describe('tickHapticFor', () => {
  it('maps the fraction left to timer haptics', async () => {
    expect(tickHapticFor(0.8)).toBeNull();
    expect(tickHapticFor(0.45)).toBe('timerTick');
    expect(tickHapticFor(0.3)).toBe('timerTickStrong');
    expect(tickHapticFor(0.1)).toBe('heartbeat');
  });
});
