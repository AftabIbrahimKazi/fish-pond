/**
 * Loads a real goldfish GLB and normalises it: heads +Z, back +Y, centred, scaled to a target
 * length, with materials tuned for open water and its swim clip ready to play.
 */

import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Box3,
  DoubleSide,
  Group,
  LoopRepeat,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { SpeciesProfile } from '../../types/underwater';
import { getFishOrientation, updateSkeletons } from './fish-orientation';

const CORNEA_PATTERN = /cornea/i;
const CORNEA_OPACITY = 0.22 as const;
const FIN_PATTERN = /fin/i;
const SCALE_ROUGHNESS_MIN = 0.12 as const;
const BODY_ENV_BOOST = 1 as const;
const LOOP_OFFSET_FRACTION = 1 as const;

/** A normalised, never-rendered master copy of one species; individual fish are cloned from it. */
export interface FishTemplate {
  profile: SpeciesProfile;
  root: Group;
  clips: AnimationClip[];
}

export interface FishAsset {
  profile: SpeciesProfile;
  root: Group;
  mixer: AnimationMixer;
  action: AnimationAction | null;
}

function setupMaterial(mesh: Mesh, material: Material): void {
  if (CORNEA_PATTERN.test(mesh.name) || CORNEA_PATTERN.test(material.name)) {
    const glass = material as MeshPhysicalMaterial; // GLTFLoader builds cornea as physical (transmission extension)
    glass.transmission = 0;
    glass.transparent = true;
    glass.opacity = CORNEA_OPACITY;
    glass.depthWrite = false;
    return;
  }
  const surface = material as MeshStandardMaterial; // every non-cornea GLB material is standard PBR
  if (surface.isMeshStandardMaterial) {
    surface.roughness = Math.max(surface.roughness, SCALE_ROUGHNESS_MIN);
    surface.envMapIntensity = BODY_ENV_BOOST;
  }
  if (FIN_PATTERN.test(mesh.name)) {
    surface.side = DoubleSide;
    surface.depthWrite = false;
  }
}

function setupMeshes(model: Object3D): void {
  model.traverse((node: Object3D) => {
    const mesh = node as Mesh; // only used after the isMesh guard below
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material: Material) => setupMaterial(mesh, material));
  });
}

function buildSwimAction(mixer: AnimationMixer, clips: AnimationClip[], timeScale: number): AnimationAction | null {
  const clip = clips[0];
  if (!clip) return null;
  const action = mixer.clipAction(clip);
  action.setLoop(LoopRepeat, Infinity);
  action.timeScale = timeScale;
  action.time = clip.duration * Math.random() * LOOP_OFFSET_FRACTION;
  action.play();
  return action;
}

export class FishModelLoader {
  private readonly _loader: GLTFLoader;

  constructor() {
    this._loader = new GLTFLoader();
  }

  public async buildTemplate(profile: SpeciesProfile): Promise<FishTemplate> {
    const gltf = await this._loader.loadAsync(profile.url);
    const model = gltf.scene;
    setupMeshes(model);
    updateSkeletons(model);

    const orientation = getFishOrientation(model);
    const scale = profile.targetLength / orientation.length;

    const oriented = new Group();
    oriented.quaternion.copy(orientation.correction);
    oriented.add(model);
    const holder = new Group();
    holder.scale.setScalar(scale);
    holder.add(oriented);
    const root = new Group();
    root.add(holder);

    root.updateMatrixWorld(true);
    const centre = new Box3().setFromObject(root, true).getCenter(new Vector3());
    holder.position.sub(centre);
    return { profile, root, clips: gltf.animations };
  }

  /** Clones the skinned template into an independent fish with its own skeleton and mixer. */
  public buildFish(template: FishTemplate): FishAsset {
    const root = cloneSkinned(template.root) as Group; // clone of a Group is a Group
    const mixer = new AnimationMixer(root);
    const action = buildSwimAction(mixer, template.clips, template.profile.clipSpeed);
    return { profile: template.profile, root, mixer, action };
  }
}
