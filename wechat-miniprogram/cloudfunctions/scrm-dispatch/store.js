// Server-only access. All collection permissions must deny mini-program client access.
function createStore(db) {
  const reference = scope => ({
    async get(table, id) {
      // The SDK is initialized with throwOnNotFound:false. Missing collections and network errors still throw.
      const result = await scope.collection('ua_' + table).doc(id).get();
      return result.data || null;
    },
    async set(table, id, value) {
      const data = { ...value }; delete data._id;
      await scope.collection('ua_' + table).doc(id).set({ data });
    }
  });
  return { ...reference(db), transact: fn => db.runTransaction(tx => fn(reference(tx))) };
}
module.exports = { createStore };
