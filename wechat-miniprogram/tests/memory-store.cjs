const clone = x => x === undefined ? undefined : structuredClone(x);
function memoryStore(seed = {}) {
  let data = clone(seed), queue = Promise.resolve();
  const scope = values => ({
    async get(table, id) { return clone(values[table] && values[table][id]) || null; },
    async set(table, id, value) { (values[table] ||= {})[id] = { ...clone(value), _id: id }; }
  });
  return {
    get: (table, id) => scope(data).get(table, id),
    set: (table, id, value) => scope(data).set(table, id, value),
    transact(fn) {
      const operation = queue.then(async () => { const next = clone(data), result = await fn(scope(next)); data = next; return result; });
      queue = operation.catch(() => {}); return operation;
    },
    snapshot: () => clone(data)
  };
}
module.exports = { memoryStore };
