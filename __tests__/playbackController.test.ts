import { PlaybackController, PlaybackState } from '../src/components/playback/playbackController';

describe('PlaybackController state machine', () => {
  const MOVES = ['U', 'R', "U'", "R'", 'U', 'B', "B'"];

  function setupController(initialIndex = 0) {
    let currentIndex = initialIndex;
    let cameraCount = 0;
    let turnCount = 0;
    const statesLog: PlaybackState[] = [];

    const controller = new PlaybackController({
      getTotalMoves: () => MOVES.length,
      getCurrentMoveIndex: () => currentIndex,
      getCurrentMoveNotation: () => (currentIndex < MOVES.length ? MOVES[currentIndex] : null),
      getTurnDurationMs: () => 20,
      getArrowWaitDurationMs: () => 15,
      isAutoViewNeeded: (move) => move === 'U' || move === 'B',
      onStartCameraGlide: () => {
        cameraCount++;
        setTimeout(() => {
          controller.notifyCameraComplete();
        }, 10);
      },
      onStartTurnAnimation: () => {
        turnCount++;
        setTimeout(() => {
          controller.notifyTurnComplete();
        }, 15);
      },
      onApplyMove: () => {
        currentIndex++;
      },
      onStepBack: () => {
        if (currentIndex > 0) currentIndex--;
      },
      onStateChange: (st) => {
        statesLog.push(st);
      },
    });

    const waitForState = async (target: PlaybackState, timeoutMs = 2000): Promise<void> => {
      const start = Date.now();
      while (controller.getState() !== target) {
        if (Date.now() - start > timeoutMs) {
          throw new Error(`Timeout waiting for state ${target}, current state is ${controller.getState()}`);
        }
        await new Promise((r) => setTimeout(r, 5));
      }
    };

    return {
      controller,
      getIndex: () => currentIndex,
      getCameraCount: () => cameraCount,
      getTurnCount: () => turnCount,
      getStatesLog: () => statesLog,
      waitForState,
    };
  }

  test('normal playback plays through all moves to finished', async () => {
    const { controller, getIndex } = setupController(0);

    await controller.play();

    expect(getIndex()).toBe(MOVES.length);
    expect(controller.getState()).toBe('finished');
  });

  test('pause during waiting immediately pauses without advancing move', async () => {
    const { controller, getIndex, waitForState } = setupController(0);

    controller.play();
    await waitForState('waiting');
    expect(controller.getState()).toBe('waiting');

    controller.pause();
    expect(controller.getState()).toBe('paused');
    const idxAfterPause = getIndex();

    await new Promise((r) => setTimeout(r, 60));
    expect(getIndex()).toBe(idxAfterPause);
    expect(controller.getState()).toBe('paused');
  });

  test('pause during turn lets turn finish cleanly and then transitions to paused', async () => {
    const { controller, getIndex, waitForState } = setupController(0);

    controller.play();
    await waitForState('turning');
    expect(controller.getState()).toBe('turning');

    controller.pause();
    await waitForState('paused');
    expect(controller.getState()).toBe('paused');
    expect(getIndex()).toBe(1);

    await new Promise((r) => setTimeout(r, 50));
    expect(getIndex()).toBe(1);
    expect(controller.getState()).toBe('paused');
  });

  test('resume after pause resumes smoothly to finish without getting stuck', async () => {
    const { controller, getIndex, waitForState } = setupController(0);

    controller.play();
    await waitForState('waiting');
    controller.pause();
    expect(controller.getState()).toBe('paused');
    const pausedIdx = getIndex();

    // Resume
    await controller.play();
    expect(controller.getState()).toBe('finished');
    expect(getIndex()).toBe(MOVES.length);
    expect(getIndex()).toBeGreaterThanOrEqual(pausedIdx);
  });

  test('rapid double clicks on play do not corrupt state or freeze loop', async () => {
    const { controller, getIndex } = setupController(0);

    controller.play();
    controller.play();
    controller.play();

    expect(controller.isRunning()).toBe(true);

    controller.pause();
    controller.play();

    await new Promise((r) => setTimeout(r, 30));
    expect(controller.isRunning()).toBe(true);

    while (controller.getState() !== 'finished' && getIndex() < MOVES.length) {
      await new Promise((r) => setTimeout(r, 15));
    }
    expect(controller.getState()).toBe('finished');
  });

  test('Pause + Next works and stays paused', async () => {
    const { controller, getIndex, waitForState } = setupController(0);

    controller.play();
    await waitForState('waiting');
    controller.pause();
    expect(controller.getState()).toBe('paused');
    const startIdx = getIndex();

    await controller.next();
    expect(getIndex()).toBe(startIdx + 1);
    expect(controller.getState()).toBe('paused');
  });

  test('Pause + Back works and stays paused', async () => {
    const { controller, getIndex } = setupController(2);

    expect(getIndex()).toBe(2);
    controller.pause();
    expect(controller.getState()).toBe('paused');

    controller.prev();
    expect(getIndex()).toBe(1);
    expect(controller.getState()).toBe('paused');
  });

  test('50 random Play/Pause/Resume sequences guarantee finished state and monotonic progress', async () => {
    for (let run = 0; run < 50; run++) {
      const { controller, getIndex } = setupController(0);

      let lastIndex = 0;
      const pauseCount = 1 + (run % 3);
      for (let p = 0; p < pauseCount; p++) {
        controller.play();
        const delay = 5 + ((run * 11 + p * 17) % 30);
        await new Promise((r) => setTimeout(r, delay));
        controller.pause();

        const cur = getIndex();
        expect(cur).toBeGreaterThanOrEqual(lastIndex);
        lastIndex = cur;

        await new Promise((r) => setTimeout(r, 5));
      }

      await controller.play();
      expect(getIndex()).toBe(MOVES.length);
      expect(controller.getState()).toBe('finished');
    }
  }, 30000);
});
