const engine = require('../../lib/engine');
const api = require('../../services/api');
const ui = require('../../lib/ui');
Page({
  data: { isDemo: api.isDemo, loading: true, busy: false, error: '', state: null, selected: '', selectedName: '', selectedDetail: '', hint: '', aiBusy: false, cards: engine.CARDS, nodes: [], log: [] },
  onLoad() {
    ui.hideShare(); this.alive = true;
    this.campaign = getApp().globalData.campaign;
    if (!this.campaign) { this.setData({ loading: false, error: '请从活动首页进入挑战' }); return; }
    this.storageKey = 'ua-game-' + ui.campaignId(); this.start();
  },
  onUnload() { this.alive = false; clearTimeout(this.aiTimer); },
  async start() {
    this.setData({ error: '', loading: true });
    try {
      let saved = wx.getStorageSync(this.storageKey);
      if (saved && saved.mode === (api.isDemo ? 'demo' : 'cloud') && saved.expiresAt > Date.now()) {
        this.session = saved; this.moves = saved.moves || []; this.state = engine.create(saved.seed);
        for (const move of this.moves) { this.state = engine.advance(this.state, move); if (!this.state) throw new Error('本地进度无效，请重新开始'); }
      } else {
        this.requestId = this.requestId || ui.requestId();
        this.session = await api.call('startChallenge', { campaignId: ui.campaignId(), requestId: this.requestId });
        this.moves = []; this.state = engine.create(this.session.seed); this.save();
      }
      if (!this.alive) return;
      this.render(); this.setData({ loading: false });
      if (this.state.status !== 'playing') this.submit();
    } catch (e) { api.error(this, e); }
  },
  save() { wx.setStorageSync(this.storageKey, { ...this.session, moves: this.moves, mode: api.isDemo ? 'demo' : 'cloud' }); },
  render() {
    const state = this.state;
    this.setData({ state, nodes: state.nodes.map((n, i) => ({ ...n, index: i, name: this.campaign.modules[i], percent: Math.round(n.progress / engine.TARGET * 100), label: n.progress >= 80 ? '已交付' : n.blocked ? '阻塞中' : n.auto ? '自动推进中' : '等待推进' })),
      log: state.history.slice(-3).map((entry, index) => ({ ...entry, index })).reverse(), event: engine.events(state.seed)[state.round - 1],
      cards: engine.CARDS.map(c => ({ ...c, affordable: state.budget >= c.cost })), error: '' });
  },
  select(e) {
    if (!this.state || this.state.status !== 'playing' || this.data.busy) return;
    const c = engine.CARDS.find(card => card.id === e.currentTarget.dataset.id);
    if (c) this.setData({ selected: c.id, selectedName: c.name, selectedDetail: c.detail, error: '', hint: '' });
  },
  target(e) {
    if (!this.state || this.state.status !== 'playing' || this.data.busy || this.data.aiBusy) return;
    const index = Number(e.currentTarget.dataset.index);
    if (!this.data.selected) { this.setData({ error: '先点下方资源卡，再点要处理的模块' }); return; }
    const reason = engine.invalid(this.state, this.data.selected, index);
    if (reason) { this.setData({ error: reason }); return; }
    this.execute({ card: this.data.selected, target: index });
  },
  execute(move) {
    const next = engine.advance(this.state, move);
    if (!next) return;
    this.state = next; this.moves.push(move); this.save();
    this.setData({ selected: '', selectedName: '', selectedDetail: '', hint: '' }); this.render();
    wx.vibrateShort({ type: 'light' });
    if (this.state.status !== 'playing') this.submit();
  },
  pass() {
    if (!this.state || this.state.status !== 'playing' || this.data.busy || this.data.aiBusy) return;
    wx.showModal({ title: '结束本回合？', content: '将放弃剩余 ' + this.state.actions + ' 次行动。自动化会运行，未解除的阻塞会增加风险。',
      success: r => { if (r.confirm && this.alive) this.execute({ card: 'pass', target: 0 }); } });
  },
  hint() {
    if (!this.state || this.state.status !== 'playing' || this.data.aiBusy || this.data.busy) return;
    this.setData({ aiBusy: true, hint: 'AI 正在试算资源组合…' });
    this.aiTimer = setTimeout(() => {
      try {
        const plan = engine.solve(this.state, 24), move = plan.path[0];
        if (!move) { this.setData({ hint: '暂无可行建议，可以尝试调整资源。' }); return; }
        if (move.card === 'pass') this.setData({ hint: 'AI 建议结束本回合，等待自动化运行。是否执行由你决定。' });
        else {
          const c = engine.CARDS.find(card => card.id === move.card);
          this.setData({ selected: c.id, selectedName: c.name, selectedDetail: c.detail,
            hint: 'AI 建议：对「' + this.campaign.modules[move.target] + '」使用' + c.name + '。已为你选卡，点击模块执行。' });
        }
      } finally { if (this.alive) this.setData({ aiBusy: false }); }
    }, 60);
  },
  async submit() {
    if (this.data.busy) return;
    this.setData({ busy: true, error: '' });
    try {
      const result = await api.call('finishChallenge', { sessionId: this.session.sessionId, moves: this.moves });
      const baseline = engine.solve(engine.create(result.seed), 48);
      result.aiScore = engine.score(baseline.state); result.aiStatus = baseline.state.status;
      getApp().globalData.lastGame = result; wx.setStorageSync('ua-result-' + ui.campaignId(), result);
      wx.removeStorageSync(this.storageKey);
      if (this.alive) wx.redirectTo({ url: '/pages/result/index' });
    } catch (e) { api.error(this, e); }
  },
  restart() {
    wx.showModal({ title: '重新开局', content: '将放弃本机保存的这一局进度。', success: r => {
      if (r.confirm && this.storageKey) { wx.removeStorageSync(this.storageKey); this.requestId = ''; this.start(); }
    } });
  },
  home() { wx.switchTab({ url: '/pages/activity/index' }); }
});
