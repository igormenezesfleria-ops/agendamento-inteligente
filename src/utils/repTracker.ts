/**
 * Synton Rep & Cadence Tracker
 *
 * Generic, exercise-agnostic state machine for counting repetitions and
 * measuring the duration of the eccentric (lowering) phase.
 *
 * Usage:
 *   const tracker = createRepTracker({ topAngle: 60, bottomAngle: 150 });
 *   tracker.update(currentAngle, performance.now(), { stable: true });
 *   if (tracker.lastEccentricMs && tracker.lastEccentricMs < 1000) { warn(); }
 */

export type RepPhase = 'idle' | 'concentric' | 'top' | 'eccentric' | 'bottom';

export interface RepTrackerOptions {
  /** Angle (degrees) considered "fully contracted" — e.g. 60° for bicep curl elbow */
  topAngle: number;
  /** Angle considered "fully extended" — e.g. 150° */
  bottomAngle: number;
  /** Minimum eccentric duration (ms) below which we warn the user */
  minEccentricMs?: number;
}

export interface RepTrackerState {
  reps: number;
  validReps: number;
  phase: RepPhase;
  lastEccentricMs: number | null;
  cadenceWarning: boolean;
  update(angle: number, tsMs: number, opts?: { stable?: boolean }): void;
  reset(): void;
}

export function createRepTracker(opts: RepTrackerOptions): RepTrackerState {
  const minEcc = opts.minEccentricMs ?? 1000;

  const state = {
    reps: 0,
    validReps: 0,
    phase: 'idle' as RepPhase,
    lastEccentricMs: null as number | null,
    cadenceWarning: false,
    _eccStart: 0,
    _stableThisRep: true,
  };

  const update = (angle: number, tsMs: number, params?: { stable?: boolean }) => {
    const stable = params?.stable !== false;
    if (!stable) state._stableThisRep = false;

    switch (state.phase) {
      case 'idle':
      case 'bottom': {
        // Waiting for user to start the concentric (lift) — angle closes
        if (angle <= opts.topAngle + 5) {
          state.phase = 'top';
          state._eccStart = 0;
        } else if (angle < opts.bottomAngle - 10) {
          state.phase = 'concentric';
        }
        break;
      }
      case 'concentric': {
        if (angle <= opts.topAngle + 5) {
          state.phase = 'top';
          state._eccStart = 0;
        }
        break;
      }
      case 'top': {
        // Start of eccentric (lowering)
        if (angle > opts.topAngle + 10) {
          state.phase = 'eccentric';
          state._eccStart = tsMs;
        }
        break;
      }
      case 'eccentric': {
        if (angle >= opts.bottomAngle - 5) {
          // Rep complete
          const dur = tsMs - state._eccStart;
          state.lastEccentricMs = dur;
          state.cadenceWarning = dur > 0 && dur < minEcc;
          state.reps += 1;
          if (state._stableThisRep) state.validReps += 1;
          state._stableThisRep = true;
          state.phase = 'bottom';
        }
        break;
      }
    }
  };

  const reset = () => {
    state.reps = 0;
    state.validReps = 0;
    state.phase = 'idle';
    state.lastEccentricMs = null;
    state.cadenceWarning = false;
    state._eccStart = 0;
    state._stableThisRep = true;
  };

  return {
    get reps() { return state.reps; },
    get validReps() { return state.validReps; },
    get phase() { return state.phase; },
    get lastEccentricMs() { return state.lastEccentricMs; },
    get cadenceWarning() { return state.cadenceWarning; },
    update,
    reset,
  } as RepTrackerState;
}
