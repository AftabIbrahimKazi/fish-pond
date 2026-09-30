/**
 * Arbiter: decides who controls the fish this frame.
 * Rule: System 1 always trumps System 1+2. A reflex aborts any running appraisal and
 * locks System 2 out until the fish has calmed down.
 */

import { ArenaMode } from '../../types/arena';
import { FEAR_S2_BLOCK } from './arena-constants';

export interface ArbiterInput {
  hasReflex: boolean;
  isS2Running: boolean;
  lockoutSeconds: number;
  fear: number;
}

export interface ArbiterDecision {
  mode: ArenaMode;
  shouldAbortS2: boolean;
  shouldStartLockout: boolean;
}

export function resolveArbitration(input: ArbiterInput): ArbiterDecision {
  if (input.hasReflex) {
    return {
      mode: input.isS2Running ? ArenaMode.S1_OVERRIDE : ArenaMode.S1_REFLEX,
      shouldAbortS2: input.isS2Running,
      shouldStartLockout: true,
    };
  }

  if (input.lockoutSeconds > 0 || input.fear > FEAR_S2_BLOCK) {
    return { mode: ArenaMode.LOCKOUT, shouldAbortS2: false, shouldStartLockout: false };
  }

  return {
    mode: input.isS2Running ? ArenaMode.S2_DELIBERATING : ArenaMode.IDLE,
    shouldAbortS2: false,
    shouldStartLockout: false,
  };
}
