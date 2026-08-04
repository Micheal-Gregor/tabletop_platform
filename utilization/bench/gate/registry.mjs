// THE GATE REGISTRY (K-B, I-78) — the single composition point for the visual gate. Each
// per-object gate module exports { suite, id, run }; this file lists them in the CURRENT
// run order (identical to the monolith's: SVG suite → VG7 spike → VG8 stage → deck/draw →
// ledger → box → die). run.mjs filters this array by --suite / --check.
//
// Adding object N+1 = one gate/<id>.gate.mjs + ONE line here (run.mjs is not edited).
import * as svg from './svg.gate.mjs';
import * as vg7 from './VG7.gate.mjs';
import * as vg8ai from './VG8a-i.gate.mjs';
import * as vg8j from './VG8j.gate.mjs';
import * as vg8p from './VG8p.gate.mjs';
import * as vg8q from './VG8q.gate.mjs';
import * as vg8r from './VG8r.gate.mjs';
import * as vg8s from './VG8s.gate.mjs';
import * as vg8n from './VG8n.gate.mjs';
import * as vg8o from './VG8o.gate.mjs';
import * as vg8m from './VG8m.gate.mjs';

export default [
  { id: svg.id, suite: svg.suite, fn: svg.run },
  { id: vg7.id, suite: vg7.suite, fn: vg7.run },
  { id: vg8ai.id, suite: vg8ai.suite, fn: vg8ai.run },
  { id: vg8j.id, suite: vg8j.suite, fn: vg8j.run },
  { id: vg8p.id, suite: vg8p.suite, fn: vg8p.run },
  { id: vg8q.id, suite: vg8q.suite, fn: vg8q.run }, // S-1 (I-103): contract v3 spine closures
  { id: vg8r.id, suite: vg8r.suite, fn: vg8r.run }, // R-1a (I-109): the die goes RAPIER
  { id: vg8s.id, suite: vg8s.suite, fn: vg8s.run }, // A6 (I-136): the v4 working loop
  { id: vg8n.id, suite: vg8n.suite, fn: vg8n.run },
  { id: vg8o.id, suite: vg8o.suite, fn: vg8o.run },
  { id: vg8m.id, suite: vg8m.suite, fn: vg8m.run },
];
