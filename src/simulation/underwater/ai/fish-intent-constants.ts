import { FishSpecies } from '../../../types/underwater';

/** An answer at or above this probability is acted on; below it the fish does not act on that question. */
export const INTENT_COMMIT = 0.5 as const;
/** A fish whose last answer is older than this is due for a new question. */
export const INTENT_REFRESH_SECONDS = 1.5 as const;
/** After this long without a new answer the old one is no longer acted on. */
export const INTENT_STALE_SECONDS = 8 as const;
/** A fish with a hand near outranks every other request; nearer and longer-waiting fish go first. */
export const THREAT_SCORE_BASE = 1000 as const;
export const THREAT_AGE_WEIGHT = 1 as const;
/** A lingering answer above this keeps being refreshed even after its cause has gone. */
export const INTENT_LINGER = 0.1 as const;
export const PANIC_LINGER = 0.05 as const;
export const DESTINATION_OPTION_COUNT = 4 as const;
/** A fish waiting for a destination is served ahead of routine questions, unless a destination was just served. */
export const DESTINATION_PRIORITY_SCORE = 100 as const;
export const DESTINATION_SCORE = 0.5 as const;

/** Real-world body length of each species, used to describe distances to the model in centimetres. */
export const BODY_CENTIMETRES: Record<FishSpecies, number> = {
  [FishSpecies.JIKIN]: 28,
  [FishSpecies.TOSAKIN]: 14,
};

export const HAND_AWARE_BODIES = 8 as const;
/** The same range in centimetres per species, for ranking how close a hand is. */
export const HAND_AWARE_CENTIMETRES: Record<FishSpecies, number> = {
  [FishSpecies.JIKIN]: BODY_CENTIMETRES[FishSpecies.JIKIN] * HAND_AWARE_BODIES,
  [FishSpecies.TOSAKIN]: BODY_CENTIMETRES[FishSpecies.TOSAKIN] * HAND_AWARE_BODIES,
};
export const HAND_CLOSE_CENTIMETRES = 25 as const;
export const HAND_NEAR_CENTIMETRES = 60 as const;
export const HAND_SHORT_CENTIMETRES = 120 as const;
export const HAND_STILL_SPEED = 0.05 as const;
export const HAND_SLOW_SPEED = 0.4 as const;
export const FOOD_AWARE_BODIES = 8 as const;

export const HUNGER_STARVING = 0.85 as const;
export const HUNGER_HUNGRY = 0.5 as const;

export const SPOT_CLOSE_FISH_BODIES = 2.5 as const;
export const SPOT_LOW_FRACTION = 0.33 as const;
export const SPOT_HIGH_FRACTION = 0.66 as const;

export const QUESTION_DANGER = 'danger' as const;
export const QUESTION_EAT = 'eat' as const;
export const QUESTION_DESTINATION = 'destination' as const;
/** The model is asked whether a hand is next to the fish; a yes makes the fish flee. */
export const DANGER_STATEMENT = 'A human hand is next to the goldfish' as const;
export const EAT_STATEMENT = 'The fish should go and eat the food now' as const;
export const DESTINATION_INSTRUCTIONS = 'Which spot should this goldfish swim to next?' as const;
