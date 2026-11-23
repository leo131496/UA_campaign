const assert = require('node:assert/strict');
const E = require('../game/engine.js');

const original = E.create(731024);
const snapshot = JSON.stringify(original);
assert.equal(E.play(original, 'build', 0), null, 'blocked modules reject normal work');
assert.equal(JSON.stringify(original), snapshot, 'rejected move does not mutate the game');
const repaired = E.play(original, 'repair', 0);
assert.equal(repaired.nodes[0].blocked, false);
assert.equal(repaired.nodes[0].progress, 16);
assert.equal(repaired.risk, 8);
assert.equal(repaired.budget, 87);
assert.equal(repaired.actions, 1);
assert.equal(JSON.stringify(original), snapshot, 'valid moves also leave their input untouched');

let automated = E.play(original, 'auto', 1);
assert.equal(automated.nodes[1].progress, 8);
assert.equal(E.play(automated, 'auto', 1), null, 'one automation installation per module');
automated = E.play(automated, 'fund', 0);
assert.equal(automated.round, 2);
assert.equal(automated.actions, 2);
assert.equal(automated.nodes[1].progress, 18, 'automation runs at the end of its deployment round');
automated.nodes[1].blocked = true;
automated = E.pass(automated);
assert.equal(automated.nodes[1].progress, 18, 'blocked automation cannot advance');

const poor = E.create(1); poor.budget = 0;
assert.equal(E.play(poor, 'expert', 1), null);
assert.equal(E.play(poor, 'fund', 0).budget, 15, 'a player with no budget can still act');
poor.budget = 139;
const capped = E.play(poor, 'fund', 0);
assert.equal(capped.budget, 140);
assert.match(capped.history.at(-1).detail, /预算 \+1，/);
const risky = E.create(1); risky.risk = 99;
const failed = E.play(risky, 'fund', 0);
assert.equal(failed.status, 'lost'); assert.equal(failed.reason, 'risk');
assert.equal(E.play(failed, 'repair', 0), null, 'cannot act after game over');

let deadline = E.create(1);
for (let i = 0; i < 6 && deadline.status === 'playing'; i++) {
  deadline.nodes.forEach(n => n.blocked = false);
  deadline = E.pass(deadline);
}
assert.equal(deadline.status, 'lost');assert.equal(deadline.reason, 'deadline');
assert.equal(E.create(-1).seed, 731024);assert.equal(E.create('bad').seed, 731024);
assert.equal(E.play(original, 'unknown', 0), null);assert.equal(E.play(original, 'fund', 9), null);

let examples = 0;
for (const seed of [731024, 999999, ...Array.from({length:64}, (_, i) => i + 1)]) {
  const solution = E.solve(E.create(seed));
  assert.equal(solution.state.status, 'won', `seed ${seed} is solvable`);
  let replay = E.create(seed);
  for (const move of solution.path) {
    replay = E.advance(replay, move);
    assert.ok(replay, 'every AI action is legal under player rules');
    assert.ok(replay.budget >= 0 && replay.budget <= 140);
    assert.ok(replay.risk >= 0 && replay.risk <= 100);
    assert.ok(replay.nodes.every(n => n.progress >= 0 && n.progress <= 80));
  }
  assert.deepEqual(replay, solution.state, 'AI result can be reproduced with normal actions');
  assert.ok(E.score(replay) >= 0 && E.score(replay) <= 600);
  examples++;
}
assert.deepEqual(E.solve(E.create(42)).path, E.solve(E.create(42)).path, 'shared seed gives a repeatable AI baseline');
const changed = E.play(E.create(42), 'repair', 0);
const coached = E.solve(changed);
assert.ok(coached.path.length);
assert.ok(E.advance(changed, coached.path[0]), 'AI coach computes a legal move from the current state');
console.log(`Passed resource, block, automation, deadline, risk, mutation and ${examples} reproducible AI-win checks.`);
