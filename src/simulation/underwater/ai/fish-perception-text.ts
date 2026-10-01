/**
 * Turns what a fish senses into the plain sentences Laya reads. These builders only describe the
 * situation; every decision about it is made by the model.
 *
 * The wording was tuned against the model (see docs/fish-ai.md). Laya is a text classifier trained on
 * business workflows: it reads "a hand is right next to the goldfish" reliably but cannot grade a
 * distance in centimetres, so distances are given as plain place words as well as numbers.
 */

import { FishPerception } from '../../../types/underwater';
import {
  HAND_CLOSE_CENTIMETRES,
  HAND_NEAR_CENTIMETRES,
  HAND_SHORT_CENTIMETRES,
  HAND_SLOW_SPEED,
  HAND_STILL_SPEED,
  HUNGER_STARVING,
  HUNGER_HUNGRY,
} from './fish-intent-constants';

function getHandPlace(centimetres: number): string {
  if (centimetres <= HAND_CLOSE_CENTIMETRES) return 'right next to the goldfish';
  if (centimetres <= HAND_NEAR_CENTIMETRES) return 'near the goldfish';
  if (centimetres <= HAND_SHORT_CENTIMETRES) return 'a short way from the goldfish';
  return 'far across the tank';
}

function getHandPace(speed: number): string {
  if (speed < HAND_STILL_SPEED) return 'not moving';
  if (speed < HAND_SLOW_SPEED) return 'moving slowly';
  return 'moving fast';
}

function getHungerWord(appetite: number): string {
  if (appetite > HUNGER_STARVING) return 'starving';
  if (appetite > HUNGER_HUNGRY) return 'hungry';
  return 'full';
}

function getHandSentence(perception: FishPerception): string {
  if (perception.handCentimetres === null) return 'I see no hand.';
  return `A human hand is in the water ${getHandPlace(perception.handCentimetres)}, ${getHandPace(perception.handSpeed)}.`;
}

/** The sentence Laya reads when asked whether a hand is next to the fish. */
export function buildHandStateText(perception: FishPerception): string {
  if (perception.handCentimetres === null) return 'No hand is in the water.';
  return getHandSentence(perception);
}

/**
 * The first-person view Laya reads when asked whether to eat. It always says what the fish sees of the
 * hand as well as the food: without that sentence the model stops recognising food as something to eat.
 */
export function buildFoodStateText(perception: FishPerception): string {
  const food = perception.foodCentimetres === null ? 'I see no food.' : `Food is ${perception.foodCentimetres} cm away.`;
  return `I am a goldfish. ${getHandSentence(perception)} ${food} I am ${getHungerWord(perception.appetite)}.`;
}
