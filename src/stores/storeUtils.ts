type EntityWithId = { id: string };
type EntityWithUpdatedAt = EntityWithId & { updatedAt?: Date };

export function upsertById<T extends EntityWithId>(
  items: T[],
  nextItem: T,
  insert: 'prepend' | 'append' = 'prepend'
) {
  const existingIndex = items.findIndex((item) => item.id === nextItem.id);
  if (existingIndex !== -1) {
    if (areEntitiesEquivalent(items[existingIndex], nextItem)) return items;
    return items.map((item) => (item.id === nextItem.id ? nextItem : item));
  }

  return insert === 'append' ? [...items, nextItem] : [nextItem, ...items];
}

export function replaceById<T extends EntityWithId>(items: T[], id: string, nextItem: T) {
  const existingIndex = items.findIndex((item) => item.id === id);
  if (existingIndex === -1) return items;
  if (areEntitiesEquivalent(items[existingIndex], nextItem)) return items;
  return items.map((item) => (item.id === id ? nextItem : item));
}

export function removeById<T extends EntityWithId>(items: T[], id: string) {
  if (!items.some((item) => item.id === id)) return items;
  return items.filter((item) => item.id !== id);
}

export function areEntityListsEquivalent<T extends EntityWithUpdatedAt>(left: T[], right: T[]) {
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index++) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (!leftItem || !rightItem) return false;
    if (!areEntitiesEquivalent(leftItem, rightItem)) return false;
  }

  return true;
}

export function mergeEntityListByUpdateStamp<T extends EntityWithUpdatedAt>(
  current: T[],
  next: T[]
) {
  if (areEntityListsEquivalent(current, next)) return current;

  const currentById = new Map(current.map((item) => [item.id, item]));
  let reusedAny = false;
  const merged = next.map((nextItem) => {
    const currentItem = currentById.get(nextItem.id);
    if (!currentItem || !areEntitiesEquivalent(currentItem, nextItem)) return nextItem;
    reusedAny = true;
    return currentItem;
  });

  return reusedAny ? merged : next;
}

function areEntitiesEquivalent<T extends EntityWithUpdatedAt>(left: T | undefined, right: T) {
  if (!left) return false;
  if (left === right) return true;
  if (left.id !== right.id) return false;

  const leftUpdatedAt = getUpdatedAtTime(left);
  const rightUpdatedAt = getUpdatedAtTime(right);
  return leftUpdatedAt > 0 && leftUpdatedAt === rightUpdatedAt;
}

function getUpdatedAtTime(item: EntityWithUpdatedAt) {
  return item.updatedAt?.getTime() ?? 0;
}
