/**
 * Resolves a Cesium picked entity to a Philadelphia tract or building reference.
 * Returns null for non-Philadelphia entities.
 */
export function resolvePick(entity) {
  const philaType = entity?.properties?.philaType?.getValue?.();
  if (!philaType) return null;
  const philaRef = entity?.properties?.philaRef?.getValue?.();
  return { type: philaType, ref: philaRef };
}

/**
 * Returns true if the entity belongs to the Philadelphia pilot layer set.
 */
export function isPhilaEntity(entity) {
  return !!entity?.properties?.philaType?.getValue?.();
}
