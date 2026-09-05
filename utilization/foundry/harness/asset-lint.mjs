// FOUNDRY ASSET LINT — the 60fps oracle's STATIC half (RECIPE stage 4): budget checks
// on a dress GLB before it may land. Generated meshes (image-to-3D) arrive heavy; this
// gate is what keeps a table full of dressed pieces inside frame budget. Dependency-free:
// the GLB container + glTF JSON chunk are parsed directly (no gltf-transform needed to
// LINT — use gltf-transform/meshopt to FIX a breach).
//
//   node utilization/foundry/harness/asset-lint.mjs <file.glb> [--max-tris=20000]
//     [--max-tex=2048] [--max-kb=4096] [--json]
//
// Checks: triangles ≤ max-tris · every embedded texture ≤ max-tex px per side ·
// file ≤ max-kb. Exit 0 green, 1 breach, 2 usage/parse error.
import { readFileSync, existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--'));
const num = (flag, dflt) => {
  const a = argv.find((x) => x.startsWith(`--${flag}=`));
  return a ? Number(a.split('=')[1]) : dflt;
};
const MAX_TRIS = num('max-tris', 20_000);
const MAX_TEX = num('max-tex', 2048);
const MAX_KB = num('max-kb', 4096);
const JSON_OUT = argv.includes('--json');

if (!file || !existsSync(file)) {
  console.error('usage: node asset-lint.mjs <file.glb> [--max-tris=N] [--max-tex=PX] [--max-kb=KB] [--json]');
  process.exit(2);
}
const buf = readFileSync(file);

// ── GLB container: 12-byte header (magic 'glTF', version 2), then chunks ──
if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) { console.error(`asset-lint: ${file} is not a GLB (bad magic)`); process.exit(2); }
if (buf.readUInt32LE(4) !== 2) { console.error(`asset-lint: unsupported glTF version ${buf.readUInt32LE(4)}`); process.exit(2); }
let off = 12, json = null, bin = null;
while (off + 8 <= buf.length) {
  const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
  const chunk = buf.subarray(off + 8, off + 8 + len);
  if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8')); // 'JSON'
  else if (type === 0x004e4942) bin = chunk;                          // 'BIN\0'
  off += 8 + len + (len % 4 ? 4 - (len % 4) : 0);
}
if (!json) { console.error('asset-lint: no JSON chunk'); process.exit(2); }

// ── triangles: per mesh primitive, indices count / 3 (or POSITION count / 3 unindexed);
//    non-triangle modes counted by their POSITION count as a conservative proxy ──
const acc = json.accessors ?? [];
let tris = 0;
for (const m of json.meshes ?? []) {
  for (const p of m.primitives ?? []) {
    const mode = p.mode ?? 4; // TRIANGLES default
    const n = p.indices != null ? acc[p.indices]?.count ?? 0 : acc[p.attributes?.POSITION]?.count ?? 0;
    tris += mode === 4 ? Math.floor(n / 3) : mode === 5 || mode === 6 ? Math.max(0, n - 2) : 0; // strip/fan
  }
}

// ── textures: dims read from embedded PNG (IHDR) / JPEG (SOF) headers in the BIN chunk ──
const dimsOf = (bytes) => {
  if (bytes.length > 24 && bytes.readUInt32BE(0) === 0x89504e47) return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) }; // PNG
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) { // JPEG: scan for SOF0/1/2
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i++; continue; }
      const marker = bytes[i + 1];
      if (marker >= 0xc0 && marker <= 0xc2) return { w: bytes.readUInt16BE(i + 7), h: bytes.readUInt16BE(i + 5) };
      i += 2 + bytes.readUInt16BE(i + 2);
    }
  }
  return null;
};
const textures = [];
(json.images ?? []).forEach((img, i) => {
  if (img.bufferView == null || !bin) { textures.push({ i, name: img.name ?? img.uri ?? `image ${i}`, w: null, h: null }); return; }
  const bv = json.bufferViews[img.bufferView];
  const d = dimsOf(bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength));
  textures.push({ i, name: img.name ?? `image ${i}`, ...(d ?? { w: null, h: null }) });
});

const kb = buf.length / 1024;
const texBad = textures.filter((t) => t.w != null && (t.w > MAX_TEX || t.h > MAX_TEX));
const texUnknown = textures.filter((t) => t.w == null);
const checks = [
  { name: 'triangles', pass: tris <= MAX_TRIS, detail: `${tris} / ${MAX_TRIS}` },
  { name: 'textures', pass: texBad.length === 0, detail: textures.length === 0 ? 'none embedded' : textures.map((t) => `${t.name}:${t.w ?? '?'}×${t.h ?? '?'}`).join(' ') + ` / ≤${MAX_TEX}px` + (texUnknown.length ? ` (${texUnknown.length} undecodable — inspect by hand)` : '') },
  { name: 'size', pass: kb <= MAX_KB, detail: `${kb.toFixed(0)}KB / ${MAX_KB}KB` },
];
const green = checks.every((c) => c.pass);
if (JSON_OUT) console.log(JSON.stringify({ file, tris, textures, kb: Math.round(kb), checks }, null, 2));
else {
  for (const c of checks) console.log(`${c.pass ? '✓' : '✗'} ${c.name.padEnd(10)} ${c.detail}`);
  console.log(`ASSET LINT ${file}: ${checks.filter((c) => c.pass).length}/${checks.length}${green ? '' : ' — over budget: decimate (gltf-transform simplify/meshopt) and resize textures, then re-lint'}`);
}
process.exit(green ? 0 : 1);
