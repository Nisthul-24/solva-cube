export type PlaybackState = 'idle' | 'camera' | 'waiting' | 'turning' | 'paused' | 'finished';

export interface PlaybackControllerOptions {
  getTotalMoves: () => number;
  getCurrentMoveIndex: () => number;
  getCurrentMoveNotation: () => string | null;
  getTurnDurationMs: () => number;
  getArrowWaitDurationMs: () => number;
  isAutoViewNeeded: (move: string) => boolean;
  onStartCameraGlide: (move: string) => void;
  onStartTurnAnimation: (move: string) => void;
  onApplyMove: (move: string) => void;
  onStepBack: () => void;
  onStateChange?: (state: PlaybackState) => void;
}

export class PlaybackController {
  private state: PlaybackState = 'idle';
  private runId: number = 0;
  private activeRunId: number = 0;
  private isPauseRequested: boolean = false;
  private isBusy: boolean = false;
  private activeLoopPromise: Promise<void> | null = null;

  private cameraResolver: (() => void) | null = null;
  private turnResolver: (() => void) | null = null;
  private waitResolver: (() => void) | null = null;
  private waitTimer: any = null;

  private options: PlaybackControllerOptions;

  constructor(options: PlaybackControllerOptions) {
    this.options = options;
  }

  public updateOptions(options: Partial<PlaybackControllerOptions>) {
    this.options = { ...this.options, ...options };
  }

  public getState(): PlaybackState {
    return this.state;
  }

  public getRunId(): number {
    return this.runId;
  }

  public isRunning(): boolean {
    return (
      !this.isPauseRequested &&
      this.runId === this.activeRunId &&
      this.activeLoopPromise !== null &&
      (this.state === 'camera' || this.state === 'waiting' || this.state === 'turning')
    );
  }

  private setState(newState: PlaybackState) {
    this.state = newState;
    this.options.onStateChange?.(newState);
  }

  public async play(): Promise<void> {
    this.isPauseRequested = false;

    // If an active loop is already executing normally for the current run, return it
    if (this.activeLoopPromise) {
      if (this.isRunning()) {
        return this.activeLoopPromise;
      }
      // If a previous loop is unwinding from a pause/cancellation, wait for it to cleanly finish
      try {
        await this.activeLoopPromise;
      } catch (e) {
        // ignore
      }
    }

    const total = this.options.getTotalMoves();
    const curIdx = this.options.getCurrentMoveIndex();

    if (curIdx >= total) {
      this.setState('finished');
      return;
    }

    this.runId++;
    const currentRun = this.runId;
    this.activeRunId = currentRun;

    this.activeLoopPromise = (async () => {
      try {
        while (this.runId === currentRun && !this.isPauseRequested) {
          const idx = this.options.getCurrentMoveIndex();
          const maxMoves = this.options.getTotalMoves();
          if (idx >= maxMoves) {
            this.setState('finished');
            break;
          }

          const move = this.options.getCurrentMoveNotation();
          if (!move) {
            this.setState('finished');
            break;
          }

          // Step 1: Camera glide if needed
          const needsCamera = this.options.isAutoViewNeeded(move);
          if (needsCamera) {
            this.setState('camera');
            this.isBusy = true;
            this.options.onStartCameraGlide(move);

            await this.waitForCameraGlide(currentRun);
            this.isBusy = false;

            if (this.runId !== currentRun || this.isPauseRequested) {
              this.setState('paused');
              break;
            }
          }

          // Step 2: Waiting state (Direction arrow displayed)
          this.setState('waiting');
          const waitMs = this.options.getArrowWaitDurationMs();
          await this.waitForArrowDelay(waitMs);

          if (this.runId !== currentRun || this.isPauseRequested) {
            this.setState('paused');
            break;
          }

          // Step 3: Layer turn animation
          this.setState('turning');
          this.isBusy = true;
          this.options.onStartTurnAnimation(move);

          await this.waitForTurnAnimation(currentRun);
          this.isBusy = false;

          // Always logically commit the move once the 3D turn has completed
          this.options.onApplyMove(move);

          if (this.runId !== currentRun || this.isPauseRequested) {
            this.setState('paused');
            break;
          }
        }
      } finally {
        if (this.activeRunId === currentRun) {
          this.activeLoopPromise = null;
        }
      }
    })();

    return this.activeLoopPromise;
  }

  public pause() {
    this.isPauseRequested = true;
    this.runId++;

    if (this.waitTimer) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
    if (this.waitResolver) {
      const res = this.waitResolver;
      this.waitResolver = null;
      res();
    }

    // If in waiting or idle state, immediately transition to paused
    if (this.state === 'waiting' || this.state === 'idle') {
      this.setState('paused');
    }
    // If currently in camera or turning, in-flight operation finishes gracefully,
    // commits (if turn), then loop checks this.isPauseRequested and transitions to 'paused'.
  }

  public async next(): Promise<void> {
    if (this.isBusy || this.state === 'turning') return;

    this.isPauseRequested = true;
    this.runId++;
    const currentRun = this.runId;
    this.activeRunId = currentRun;
    const move = this.options.getCurrentMoveNotation();
    const idx = this.options.getCurrentMoveIndex();
    const total = this.options.getTotalMoves();

    if (!move || idx >= total) return;

    const priorState = this.state === 'paused' ? 'paused' : 'idle';
    this.setState('turning');
    this.isBusy = true;

    try {
      this.options.onStartTurnAnimation(move);
      await this.waitForTurnAnimation(currentRun);
      this.options.onApplyMove(move);
    } finally {
      this.isBusy = false;
      const nextIdx = this.options.getCurrentMoveIndex();
      if (nextIdx >= total) {
        this.setState('finished');
      } else {
        this.setState(priorState);
      }
    }
  }

  public prev() {
    if (this.isBusy || this.state === 'turning') return;
    this.isPauseRequested = true;
    this.runId++;
    this.activeRunId = this.runId;
    if (this.waitTimer) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
    if (this.waitResolver) {
      const res = this.waitResolver;
      this.waitResolver = null;
      res();
    }
    this.options.onStepBack();
    if (this.state !== 'paused' && this.state !== 'idle') {
      this.setState('paused');
    }
  }

  public notifyCameraComplete() {
    if (this.cameraResolver) {
      const res = this.cameraResolver;
      this.cameraResolver = null;
      res();
    }
  }

  public notifyTurnComplete() {
    if (this.turnResolver) {
      const res = this.turnResolver;
      this.turnResolver = null;
      res();
    }
  }

  private waitForCameraGlide(currentRun: number): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const complete = () => {
        if (!settled) {
          settled = true;
          this.cameraResolver = null;
          resolve();
        }
      };

      this.cameraResolver = complete;
      // Safeguard timeout (max 3000ms)
      setTimeout(() => {
        if (!settled && this.runId === currentRun) {
          complete();
        }
      }, 3000);
    });
  }

  private waitForArrowDelay(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      const complete = () => {
        if (!settled) {
          settled = true;
          this.waitResolver = null;
          this.waitTimer = null;
          resolve();
        }
      };

      this.waitResolver = complete;
      this.waitTimer = setTimeout(complete, Math.max(0, delayMs));
    });
  }

  private waitForTurnAnimation(currentRun: number): Promise<void> {
    const duration = this.options.getTurnDurationMs();
    return new Promise((resolve) => {
      let settled = false;
      const complete = () => {
        if (!settled) {
          settled = true;
          this.turnResolver = null;
          resolve();
        }
      };

      this.turnResolver = complete;
      // Safeguard timeout: duration + 800ms
      setTimeout(() => {
        if (!settled && this.runId === currentRun) {
          complete();
        }
      }, (duration || 800) + 800);
    });
  }

  public destroy() {
    this.runId++;
    this.activeRunId = this.runId;
    this.isPauseRequested = true;
    if (this.waitTimer) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
    if (this.waitResolver) {
      this.waitResolver();
      this.waitResolver = null;
    }
    if (this.cameraResolver) {
      this.cameraResolver();
      this.cameraResolver = null;
    }
    if (this.turnResolver) {
      this.turnResolver();
      this.turnResolver = null;
    }
    this.setState('idle');
  }
}
