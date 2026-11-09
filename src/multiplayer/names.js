import { MP_NAME_MAX_LENGTH } from '../core/constants';

// Control characters and symbols that have no place in a display name.
const UNWANTED = /[\u0000-\u001f\u007f<>{}[\]\\/"'`|^~*=+#@$%&;:,.!?()]/g;

/** Trims, collapses spaces, drops symbols/control characters and caps the length. */
export function sanitizeName(raw) {
  return String(raw ?? '')
    .replace(UNWANTED, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MP_NAME_MAX_LENGTH)
    .trim();
}

const key = (name) => name.toLocaleLowerCase();

/** True if `name` is already taken (ignoring case). */
export function isNameTaken(name, takenNames) {
  return takenNames.some((taken) => key(taken) === key(name));
}

/** Returns `name`, or "name 2", "name 3"… if it is already taken (ignoring case). */
export function dedupeName(name, takenNames) {
  if (!isNameTaken(name, takenNames)) return name;
  for (let n = 2; ; n += 1) {
    const suffix = ` ${n}`;
    const candidate = name.slice(0, MP_NAME_MAX_LENGTH - suffix.length).trimEnd() + suffix;
    if (!isNameTaken(candidate, takenNames)) return candidate;
  }
}
