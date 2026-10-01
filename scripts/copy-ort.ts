/**
 * Copies the plain threaded ONNX Runtime Web wasm runtime into public/ort/.
 * The bundler does not emit that variant, and a missing runtime makes session creation hang
 * with no error, so the Laya engine points env.wasm.wasmPaths at these copies instead.
 */

import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const RUNTIME_FILES = /^ort-wasm-simd-threaded\.(wasm|mjs)$/;
const EXPECTED_FILE_COUNT = 2;

async function copyRuntime(): Promise<void> {
  const distFolder = dirname(createRequire(import.meta.url).resolve('onnxruntime-web'));
  const outFolder = new URL('../public/ort/', import.meta.url);
  await mkdir(outFolder, { recursive: true });
  const files = (await readdir(distFolder)).filter((file) => RUNTIME_FILES.test(file));
  if (files.length !== EXPECTED_FILE_COUNT) throw new Error(`expected ${EXPECTED_FILE_COUNT} ORT runtime files, found ${files.join(', ')}`);
  for (const file of files) await copyFile(join(distFolder, file), new URL(file, outFolder));
}

copyRuntime().catch((error: unknown) => {
  process.stderr.write(`copy-ort failed: ${String(error)}\n`);
  process.exit(1);
});
