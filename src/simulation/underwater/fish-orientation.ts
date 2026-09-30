/**
 * Works out which way a loaded fish model faces from its own anatomy (eyes and dorsal fin),
 * so imported models with arbitrary export axes can be swum head-first along +Z with the back up.
 */

import { Box3, Matrix4, Mesh, Object3D, Quaternion, SkinnedMesh, Vector3 } from 'three';

const EYE_PATTERN = /eye/i;
const BODY_PATTERN = /body/i;
const DORSAL_PATTERN = /dorsal/i;
const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_Z = new Vector3(0, 0, 1);
const AXES: readonly Vector3[] = [AXIS_X, AXIS_Y, AXIS_Z];
const AXIS_COMPONENT_EPSILON = 1e-6;

export interface FishOrientation {
  correction: Quaternion;
  length: number;
}

/** Bakes the current skin pose into bone matrices so precise bounds are correct. */
export function updateSkeletons(model: Object3D): void {
  model.updateMatrixWorld(true);
  model.traverse((node: Object3D) => {
    if ((node as SkinnedMesh).isSkinnedMesh) {
      (node as SkinnedMesh).skeleton.update(); // guarded by the isSkinnedMesh check above
    }
  });
}

function getBoundsMatching(model: Object3D, pattern: RegExp): Box3 | null {
  const bounds = new Box3();
  let hasMatch = false;
  model.traverse((node: Object3D) => {
    if (!(node as Mesh).isMesh || !pattern.test(node.name)) return; // isMesh narrows the traversal node
    bounds.union(new Box3().setFromObject(node, true));
    hasMatch = true;
  });
  return hasMatch ? bounds : null;
}

function getSnappedAxis(direction: Vector3, excluded: Vector3 | null): Vector3 {
  let best: Vector3 = AXIS_Z;
  let bestScore = -Infinity;
  for (const axis of AXES) {
    if (excluded && Math.abs(axis.dot(excluded)) > AXIS_COMPONENT_EPSILON) continue;
    const score = Math.abs(direction.dot(axis));
    if (score > bestScore) {
      bestScore = score;
      best = axis;
    }
  }
  const sign = direction.dot(best) < 0 ? -1 : 1;
  return best.clone().multiplyScalar(sign);
}

/**
 * Head direction comes from eyes relative to the body centre; the up direction from the dorsal
 * fin relative to the body. Both snap to the nearest model axis.
 */
export function getFishOrientation(model: Object3D): FishOrientation {
  const whole = new Box3().setFromObject(model, true);
  const centre = whole.getCenter(new Vector3());
  const bodyCentre = (getBoundsMatching(model, BODY_PATTERN) ?? whole).getCenter(new Vector3());

  const eyes = getBoundsMatching(model, EYE_PATTERN);
  const headDirection = eyes
    ? eyes.getCenter(new Vector3()).sub(bodyCentre)
    : whole.max.clone().sub(centre);
  const forward = getSnappedAxis(headDirection, null);

  const dorsal = getBoundsMatching(model, DORSAL_PATTERN);
  const upDirection = dorsal ? dorsal.getCenter(new Vector3()).sub(bodyCentre) : AXIS_Y.clone();
  const up = getSnappedAxis(upDirection, forward);

  const right = new Vector3().crossVectors(up, forward);
  const modelBasis = new Matrix4().makeBasis(right, up, forward);
  const correction = new Quaternion().setFromRotationMatrix(modelBasis.transpose());

  const size = whole.getSize(new Vector3());
  const length = Math.abs(size.dot(forward));
  return { correction, length };
}
