export type EntityId = string | number | null | undefined;

export function toEntityIdString(id: EntityId) {
  return id == null ? '' : String(id);
}

export function sameEntityId(left: EntityId, right: EntityId) {
  if (left == null || right == null) {
    return false;
  }

  return String(left) === String(right);
}

export function coerceEntityId(id: EntityId) {
  if (typeof id !== 'string') {
    return id;
  }

  const trimmed = id.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed;
}
