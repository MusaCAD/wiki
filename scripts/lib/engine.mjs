// The pinned engine: fetch the release AppImage for a version, extract it once, run it headless.
import { createWriteStream, existsSync, mkdirSync, renameSync, chmodSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ENGINE } from '../../wiki.config.mjs';

export const CACHE_DIR = resolve('.cache/engine');

/** Environment for a headless run: no display, never the desktop's QPA. */
export function headlessEnv() {
  const env = { ...process.env };
  delete env.DISPLAY;
  delete env.WAYLAND_DISPLAY;
  delete env.QT_QPA_PLATFORM;
  env.APPIMAGE_EXTRACT_AND_RUN = '1';
  return env;
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`download failed: ${res.status} ${res.statusText} for ${url}`);
  const tmp = dest + '.part';
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
  renameSync(tmp, dest);
}

/**
 * Returns `{ version, appimage, run }` for the pinned release (or the version given), downloading
 * the AppImage from the GitHub release when it is not cached and extracting it once so repeated
 * runs do not pay the extraction each time. Verifies `--version` before returning.
 */
export async function ensureEngine(version = ENGINE.version) {
  const dir = join(CACHE_DIR, version);
  const asset = ENGINE.appimage(version);
  const appimage = join(dir, asset);
  mkdirSync(dir, { recursive: true });
  if (!existsSync(appimage)) {
    const url = ENGINE.downloadUrl(`v${version}`, asset);
    console.log(`engine: downloading ${asset} from the v${version} release`);
    await download(url, appimage);
  }
  chmodSync(appimage, 0o755);
  const extracted = join(dir, 'squashfs-root', 'AppRun');
  if (!existsSync(extracted)) {
    const r = spawnSync(appimage, ['--appimage-extract'], { cwd: dir, env: headlessEnv(), encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`engine: could not extract ${asset}: ${r.stderr}`);
  }
  const run = (args, opts = {}) =>
    spawnSync(extracted, args, { env: headlessEnv(), encoding: 'utf8', timeout: opts.timeout ?? 120_000, cwd: opts.cwd });
  const v = run(['--version']);
  const printed = (v.stdout || '').trim();
  if (v.status !== 0 || printed !== `Musa CAD ${version}`) {
    throw new Error(`engine: ${asset} reports "${printed}" (exit ${v.status}), expected "Musa CAD ${version}"`);
  }
  return { version, appimage, size: statSync(appimage).size, run };
}
