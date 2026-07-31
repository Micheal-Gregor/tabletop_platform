/**
 * MP4 SkinBinder + the D-1 PLACEHOLDER SKIN (owner-ratified: frames before assets).
 * Traces: S3 F6 · R-21 · R-22 · HK-12 · D-1. Axiom GX-36: contracts name TOKENS; a raw
 * value refuses naming it; binding refuses NAMING every missing token; the Placeholder
 * binds ANY contract completely by construction — the alt-text IS the skin.
 */
export class SkinRefusal extends Error {
  constructor(readonly rule: string, detail: string) {
    super(`Skin refused [${rule}]: ${detail}`);
    this.name = 'SkinRefusal';
  }
}

/** A token: dotted lowercase namespace path — 'card.face', 'sound.card-flip'. */
const TOKEN_RE = /^[a-z][a-z0-9-]*(\.[a-z0-9-]+)+$/;
/** Value forms a contract must NEVER carry: filenames, colors, paths, URLs (R-22). */
const VALUE_EXT_RE = /\.(png|jpe?g|gif|svg|webp|wav|mp3|ogg|ttf|woff2?|css|js)$/i;
const looksLikeValue = (t: string): boolean =>
  t.startsWith('#') || t.includes('/') || t.includes(':') || t.includes('\\') || VALUE_EXT_RE.test(t);

export type TokenContract = readonly string[];
export type Skin = Readonly<Record<string, string>>;

export interface BoundSkin {
  readonly tokens: Readonly<Record<string, string>>;
  readonly placeholder: boolean;
}

/** R-22 — a presentation contract carries TOKENS, never raw values. */
export function validateContract(contract: TokenContract): void {
  for (const t of contract) {
    if (typeof t !== 'string' || looksLikeValue(t) || !TOKEN_RE.test(t)) {
      throw new SkinRefusal('GX-36/R-22', `raw value in a presentation contract: "${String(t)}" is not a token (namespace.dotted-lowercase, never a filename/color/path)`);
    }
  }
}

/** HK-12 / R-21 — bind refuses NAMING every missing token. */
export function bind(skin: Skin, contract: TokenContract, placeholder = false): BoundSkin {
  validateContract(contract);
  const missing = contract.filter((t) => !Object.hasOwn(skin, t));
  if (missing.length > 0) {
    throw new SkinRefusal('GX-36/R-21/HK-12', `unbound token(s): ${missing.join(', ')}`);
  }
  const tokens: Record<string, string> = {};
  for (const t of contract) tokens[t] = skin[t]!;
  return Object.freeze({ tokens: Object.freeze(tokens), placeholder });
}

/**
 * D-1 — the Placeholder Skin, COMPLETE BY CONSTRUCTION: every visual token becomes an
 * [alt-text] frame; every sound.* token becomes a '♪ caption' (rendered as a transient
 * caption that self-removes — see theater.ts captions). Frames before assets: build and
 * test the mechanic BEFORE committing resources to art and audio.
 */
export function placeholderSkin(contract: TokenContract): Skin {
  validateContract(contract);
  const skin: Record<string, string> = {};
  for (const t of contract) {
    skin[t] = t.startsWith('sound.') ? `♪ ${t.slice('sound.'.length).replace(/-/g, ' ')}` : `[${t}]`;
  }
  return Object.freeze(skin);
}

/** The D-1 guarantee, as an API: binding the placeholder NEVER refuses. */
export function bindPlaceholder(contract: TokenContract): BoundSkin {
  return bind(placeholderSkin(contract), contract, true);
}
