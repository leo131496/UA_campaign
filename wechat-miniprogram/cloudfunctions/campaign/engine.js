(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Rescue = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TARGET = 80;
  const ROUNDS = 6;
  const CARDS = [
    { id: 'build', name: '集中推进', cost: 9, mark: '↗', color: 'blue', short: '进度 +24', detail: '目标进度 +24，风险 +5。', kind: 'progress' },
    { id: 'expert', name: '专家支援', cost: 17, mark: '✦', color: 'purple', short: '进度 +38', detail: '目标进度 +38，风险 +1。', kind: 'progress' },
    { id: 'repair', name: '排除阻塞', cost: 9, mark: '⌁', color: 'orange', short: '解锁 / 风险 −14', detail: '解除目标阻塞，进度 +8，风险 −14。', kind: 'repair' },
    { id: 'auto', name: '自动化部署', cost: 18, mark: '⚙', color: 'cyan', short: '每回合进度 +10', detail: '立刻 +8；本回合起，每回合结束自动 +10。每模块限一次。', kind: 'progress' },
    { id: 'sync', name: '团队协同', cost: 7, mark: '⇄', color: 'green', short: '两处推进 / 风险 −5', detail: '目标 +16，另一处未阻塞且进度最低的模块 +8，风险 −5。', kind: 'progress' },
    { id: 'fund', name: '调配资源', cost: 0, mark: '＋', color: 'gold', short: '预算 +15', detail: '预算 +15（上限 140），风险 +4。投放到任意模块。', kind: 'global' }
  ];
  const card = id => CARDS.find(c => c.id === id);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function events(seed) {
    const target = 1 + (seed % 2);
    return [
      { round: 1, type: 'block', node: 0, title: '需求反复', text: '第一个模块被阻塞，先使用「排除阻塞」。' },
      { round: 2, type: 'pressure', amount: 12 + seed % 3, title: '交付催单', text: '风险上升；完成的模块不会倒退。' },
      { round: 3, type: 'block', node: target, title: '协作中断', text: `模块 ${target + 1} 将被阻塞；提前完成即可避免。` },
      { round: 4, type: 'budget', amount: 12 + seed % 4, title: '预算收紧', text: '部分预算被收回，提前留好余量。' },
      { round: 5, type: 'rework', node: 3 - target, amount: 8 + seed % 3, title: '临时返工', text: `模块 ${4 - target} 若未完成，将损失部分进度。` },
      { round: 6, type: 'pressure', amount: 14 + seed % 3, title: '最后冲刺', text: '风险上升；本回合结束前完成全部模块。' }
    ];
  }
  function copy(s) { return { ...s, nodes: s.nodes.map(n => ({ ...n })), history: s.history.slice() }; }
  function record(s, type, title, detail) { s.history.push({ round: s.round, type, title, detail }); }
  function event(s) {
    const e = events(s.seed)[s.round - 1];
    let detail = e.text;
    if (e.type === 'block') {
      if (s.nodes[e.node].progress < TARGET) s.nodes[e.node].blocked = true;
      else detail = `模块 ${e.node + 1} 已完成，成功避开阻塞。`;
    }
    if (e.type === 'pressure') { s.risk += e.amount; detail = `风险 +${e.amount}。`; }
    if (e.type === 'budget') { const amount = Math.min(s.budget, e.amount); s.budget -= amount; detail = `预算 −${amount}。`; }
    if (e.type === 'rework') {
      const n = s.nodes[e.node];
      if (n.progress < TARGET) { const amount = Math.min(n.progress, e.amount); n.progress -= amount; detail = `模块 ${e.node + 1} 返工，进度 −${amount}。`; }
      else detail = `模块 ${e.node + 1} 已完成，成功避开返工。`;
    }
    s.risk = clamp(s.risk, 0, 100);
    record(s, 'event', e.title, detail);
  }
  function finish(s) {
    if (s.risk >= 100) { s.status = 'lost'; s.reason = 'risk'; }
    else if (s.nodes.every(n => n.progress >= TARGET)) { s.status = 'won'; s.reason = 'complete'; }
  }
  function create(seed) {
    const num = Number(seed);
    const s = { seed: Number.isInteger(num) && num > 0 && num <= 999999 ? num : 731024,
      round: 1, actions: 2, budget: 96, risk: 22, status: 'playing', reason: '',
      nodes: [{ progress: 8, blocked: false, auto: false }, { progress: 0, blocked: false, auto: false }, { progress: 0, blocked: false, auto: false }], history: [] };
    event(s);
    return s;
  }
  function invalid(s, id, index) {
    const c = card(id), n = s.nodes[index];
    if (s.status !== 'playing') return '本局已结束';
    if (!c || !n) return '请选择有效资源卡与模块';
    if (s.budget < c.cost) return '预算不足，可先使用「调配资源」';
    if (c.kind === 'global') return '';
    if (n.progress >= TARGET && c.kind !== 'repair') return '这个模块已经完成';
    if (n.blocked && c.kind !== 'repair') return '先用「排除阻塞」解锁这个模块';
    if (id === 'auto' && n.auto) return '这个模块已部署自动化';
    if (id === 'repair' && !n.blocked && n.progress >= TARGET && s.risk === 0) return '这个模块已完成，也没有风险需要消除';
    return '';
  }
  function resolveRound(s) {
    let total = 0;
    s.nodes.forEach(n => {
      if (n.auto && !n.blocked && n.progress < TARGET) { const gain = Math.min(10, TARGET - n.progress); n.progress += gain; total += gain; }
    });
    if (total) record(s, 'auto', '自动化运行', `模块累计进度 +${total}。`);
    const blocked = s.nodes.filter(n => n.blocked && n.progress < TARGET).length;
    if (blocked) { s.risk = clamp(s.risk + blocked * 8, 0, 100); record(s, 'warning', '阻塞持续发酵', `仍有 ${blocked} 个模块阻塞，风险 +${blocked * 8}。`); }
    finish(s);
    if (s.status !== 'playing') return;
    if (s.round === ROUNDS) { s.status = 'lost'; s.reason = 'deadline'; return; }
    s.round++;
    s.actions = 2;
    event(s);
    finish(s);
  }
  function play(state, id, index) {
    if (invalid(state, id, index)) return null;
    const s = copy(state), c = card(id), n = s.nodes[index];
    s.budget -= c.cost;
    const before = n.progress, beforeRisk = s.risk, beforeBudget = state.budget;
    if (id === 'build') { n.progress += 24; s.risk += 5; }
    if (id === 'expert') { n.progress += 38; s.risk += 1; }
    if (id === 'repair') { n.blocked = false; n.progress += 8; s.risk -= 14; }
    if (id === 'auto') { n.auto = true; n.progress += 8; s.risk += 2; }
    if (id === 'sync') {
      n.progress += 16; s.risk -= 5;
      const others = s.nodes.map((node, i) => ({ node, i })).filter(v => v.i !== index && !v.node.blocked && v.node.progress < TARGET).sort((a, b) => a.node.progress - b.node.progress || a.i - b.i);
      if (others.length) others[0].node.progress = Math.min(TARGET, others[0].node.progress + 8);
    }
    if (id === 'fund') { s.budget = Math.min(140, s.budget + 15); s.risk += 4; }
    n.progress = clamp(n.progress, 0, TARGET); s.risk = clamp(s.risk, 0, 100); s.actions--;
    record(s, 'action', c.name, id === 'fund' ? `预算 +${s.budget - beforeBudget}，风险 +${s.risk - beforeRisk}。` : `模块 ${index + 1} 进度 +${n.progress - before}，风险 ${s.risk - beforeRisk >= 0 ? '+' : ''}${s.risk - beforeRisk}。`);
    finish(s);
    if (s.status === 'playing' && s.actions === 0) resolveRound(s);
    return s;
  }
  function pass(state) {
    if (state.status !== 'playing') return null;
    const s = copy(state); record(s, 'pass', '提前结束回合', `放弃本回合剩余 ${s.actions} 次行动。`); s.actions = 0; resolveRound(s); return s;
  }
  function score(s) {
    return Math.max(0, Math.round(s.nodes.reduce((a, n) => a + n.progress, 0) + s.budget / 4 + (100 - s.risk) / 2 + (s.status === 'won' ? 100 + ((ROUNDS - s.round) * 2 + s.actions) * 5 : 0)));
  }
  function moves(s) {
    if (s.status !== 'playing') return [];
    const result = [];
    CARDS.forEach(c => {
      const targets = c.kind === 'global' ? [0] : [0, 1, 2];
      targets.forEach(target => { if (!invalid(s, c.id, target)) result.push({ card: c.id, target }); });
    });
    result.push({ card: 'pass', target: 0 });
    return result;
  }
  const advance = (s, move) => move.card === 'pass' ? pass(s) : play(s, move.card, move.target);
  function merit(s) {
    if (s.status === 'won') return 10000 + score(s);
    if (s.status === 'lost') return -2000 + score(s);
    return s.nodes.reduce((v, n) => v + n.progress * 2.5 + (n.progress >= TARGET ? 90 : 0) + (n.auto && n.progress < TARGET ? Math.min(80 - n.progress, (7 - s.round) * 10) * 1.4 : 0) - (n.blocked ? 22 : 0), 0)
      + s.budget * .45 - s.risk * .8 + ((6 - s.round) * 2 + s.actions) * 8;
  }
  function signature(s) { return [s.round, s.actions, s.budget, s.risk, ...s.nodes.flatMap(n => [n.progress, +n.blocked, +n.auto])].join(','); }
  // Forward beam search is the actual local AI; it never calls a language model.
  function solve(initial, width = 48) {
    if (initial.status !== 'playing') return { state: copy(initial), path: [], explored: 0 };
    let beam = [{ state: copy(initial), path: [], value: merit(initial) }], best = null, explored = 0;
    const depth = (6 - initial.round) * 2 + initial.actions;
    for (let d = 0; d < depth && beam.length; d++) {
      const candidates = [], seen = new Set();
      for (const item of beam) for (const move of moves(item.state)) {
        const next = advance(item.state, move); explored++;
        const key = signature(next); if (seen.has(key)) continue; seen.add(key);
        const entry = { state: next, path: item.path.concat(move), value: merit(next) };
        if (next.status !== 'playing') { if (!best || entry.value > best.value) best = entry; }
        else candidates.push(entry);
      }
      candidates.sort((a, b) => b.value - a.value);
      beam = candidates.slice(0, width);
    }
    const chosen = best || beam[0] || { state: copy(initial), path: [] };
    return { state: chosen.state, path: chosen.path, explored };
  }
  return { TARGET, ROUNDS, CARDS, create, events, invalid, play, pass, advance, moves, solve, score };
});
