/* Browser walkthrough of this project's native pages. Only the components/APIs used here are supported. */
(() => {
  'use strict';
  const sources = window.__MINI_PREVIEW_SOURCE__, modules = {}, definitions = {}, compiled = new Map();
  const root = document.querySelector('#native-page'), screen = document.querySelector('#screen');
  const pageStyle = document.querySelector('#page-style'), dialog = document.querySelector('#preview-dialog');
  const storagePrefix = 'ua-phone-preview:';
  let app, current, route = '', registering = '', renderPending = false, sequence = 0;
  function evaluate(file) {
    if (modules[file]) return modules[file].exports;
    if (!Object.prototype.hasOwnProperty.call(sources, file)) throw new Error('页面资源缺失：' + file);
    const module = modules[file] = { exports: {} };
    const require = spec => {
      if (!spec.startsWith('.')) throw new Error('不支持的预览依赖');
      const url = new URL(spec, 'https://preview.invalid/' + file);
      return evaluate(url.pathname.slice(1) + (/\.(js|json)$/.test(url.pathname) ? '' : '.js'));
    };
    if (file.endsWith('.json')) module.exports = JSON.parse(sources[file]);
    else new Function('require', 'module', 'exports', sources[file] + '\n//# sourceURL=native-preview/' + file)(require, module, module.exports);
    return module.exports;
  }
  function expression(code, scope) {
    if (!compiled.has(code)) compiled.set(code, new Function('scope', 'with(scope){ return (' + code + '); }'));
    return compiled.get(code)(scope);
  }
  function binding(value, scope) {
    const full = value.match(/^{{([\s\S]*?)}}$/);
    if (full && !full[1].includes('}}')) return expression(full[1], scope);
    return value.replace(/{{([\s\S]*?)}}/g, (_, code) => { const result = expression(code, scope); return result == null ? '' : String(result); });
  }
  function renderChildren(template, target, scope, prefix) {
    let branchTaken = false, chain = false;
    Array.from(template.childNodes).forEach((node, index) => {
      const key = prefix + '-' + index;
      if (node.nodeType === Node.TEXT_NODE) {
        target.append(document.createTextNode(binding(node.textContent, scope))); return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.hasAttribute('wx:if')) { chain = true; branchTaken = !!binding(node.getAttribute('wx:if'), scope); if (!branchTaken) return; }
      else if (node.hasAttribute('wx:elif')) {
        if (!chain || branchTaken) return;
        branchTaken = !!binding(node.getAttribute('wx:elif'), scope); if (!branchTaken) return;
      } else if (node.hasAttribute('wx:else')) { if (!chain || branchTaken) return; branchTaken = true; }
      else { chain = false; branchTaken = false; }
      if (node.hasAttribute('wx:for')) {
        const list = binding(node.getAttribute('wx:for'), scope) || [];
        list.forEach((item, i) => renderElement(node, target, { ...scope,
          [node.getAttribute('wx:for-item') || 'item']: item, [node.getAttribute('wx:for-index') || 'index']: i }, key + '-' + i));
      } else renderElement(node, target, scope, key);
    });
  }
  function invoke(handler, element, detail = {}) {
    const instance = current;
    if (element.disabled || !instance || typeof instance[handler] !== 'function') return;
    Promise.resolve(instance[handler]({ currentTarget: { dataset: { ...element.dataset } }, detail })).catch(showError);
  }
  function renderElement(node, target, scope, key) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'block') { renderChildren(node, target, scope, key); return; }
    const element = document.createElement(tag), attrs = node.attributes;
    element.dataset.previewKey = key;
    let checkbox;
    if (tag === 'checkbox') { checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.dataset.previewKey = key + '-input'; element.append(checkbox); }
    for (const attr of attrs) {
      const name = attr.name;
      if (name.startsWith('wx:')) continue;
      const value = binding(attr.value, scope);
      if (name.startsWith('bind')) {
        const handler = attr.value;
        if (name === 'bindtap') element.addEventListener('click', event => { event.stopPropagation(); invoke(handler, element); });
        if (name === 'bindchange') element.addEventListener('change', () => invoke(handler, element, { value: Array.from(element.querySelectorAll('input:checked')).map(input => input.value) }));
        continue;
      }
      if (['disabled', 'checked'].includes(name)) { (checkbox || element)[name] = !!value; continue; }
      if (name === 'loading') { element.setAttribute('aria-busy', String(!!value)); continue; }
      if (name === 'value' && checkbox) { checkbox.value = value; continue; }
      if (name === 'open-type') {
        if (value === 'share') element.addEventListener('click', share);
        continue;
      }
      if (name === 'user-select') { if (value) element.style.userSelect = 'text'; continue; }
      if (['class', 'style', 'title'].includes(name) || name.startsWith('data-') || name.startsWith('aria-')) element.setAttribute(name, value == null ? '' : String(value));
    }
    if (tag === 'button') element.type = 'button';
    if (!checkbox) renderChildren(node, element, scope, key);
    target.append(element);
  }
  function css(source) {
    return source.replace(/(^|\})\s*page(?=\s*\{)/g, '$1#native-page').replace(/(-?\d*\.?\d+)rpx/g, 'calc($1 * var(--rpx))');
  }
  function render() {
    renderPending = false;
    if (!current) return;
    const top = screen.scrollTop, focused = document.activeElement && document.activeElement.dataset.previewKey;
    const fragment = document.createDocumentFragment();
    renderChildren(current.template.body, fragment, current.data, 'page');
    root.replaceChildren(fragment); screen.scrollTop = top;
    if (focused) { const restored = root.querySelector('[data-preview-key="' + focused + '"]'); if (restored) restored.focus({ preventScroll: true }); }
  }
  function schedule() {
    if (renderPending) return;
    renderPending = true; queueMicrotask(() => { try { render(); } catch (error) { showError(error); } });
  }
  function routeOf(url) {
    const path = new URL(url, 'https://preview.invalid/');
    const name = path.pathname.split('/')[2];
    return { name: definitions[name] || ['activity', 'game', 'result', 'benefit', 'invite', 'contact', 'me'].includes(name) ? name : 'activity',
      query: Object.fromEntries(path.searchParams) };
  }
  function navigate(name, query = {}, replace = false, fromHistory = false) {
    if (!['activity', 'game', 'result', 'benefit', 'invite', 'contact', 'me'].includes(name)) name = 'activity';
    if (name === 'game' && !app.globalData.campaign) name = 'activity';
    if (current && current.onUnload) current.onUnload();
    const file = 'pages/' + name + '/index'; registering = name;
    evaluate(file + '.js');
    const definition = definitions[name];
    current = { ...definition, data: structuredClone(definition.data), setData(update) {
      Object.assign(this.data, update); if (this === current) schedule();
    } };
    // Native WXML permits self-closing custom components; HTML requires explicit closing tags.
    const markup = sources[file + '.wxml'].replace(/<([a-z-]+)((?:[^"'<>]|"[^"]*"|'[^']*')*)\/>/g, '<$1$2></$1>');
    current.template = new DOMParser().parseFromString(markup, 'text/html');
    route = name;
    pageStyle.textContent = css(sources[file + '.wxss']);
    document.querySelector('#page-title').textContent = JSON.parse(sources[file + '.json']).navigationBarTitleText;
    document.querySelector('#back').hidden = name === 'activity' || name === 'me';
    document.querySelector('#tabs').hidden = name !== 'activity' && name !== 'me';
    document.querySelectorAll('[data-tab]').forEach(button => button.setAttribute('aria-current', button.dataset.tab === name ? 'page' : 'false'));
    if (!fromHistory) {
      const url = new URL(location.href); url.hash = name;
      history[replace ? 'replaceState' : 'pushState']({ screen: name, query, depth: replace ? sequence : ++sequence }, '', url);
    }
    if (current.onLoad) current.onLoad(query);
    if (current.onShow) current.onShow();
    render(); screen.scrollTop = 0;
  }
  function modal(options) {
    if (dialog.open) dialog.close();
    document.querySelector('#dialog-title').textContent = options.title || '提示';
    document.querySelector('#dialog-copy').textContent = options.content || '';
    document.querySelector('#dialog-link').hidden = !options.link;
    document.querySelector('#dialog-link').value = options.link || '';
    const confirm = document.querySelector('#dialog-confirm'), cancel = document.querySelector('#dialog-cancel');
    confirm.textContent = options.confirmText || '确定'; cancel.textContent = options.cancelText || '取消';
    cancel.hidden = options.showCancel === false;
    let done = false;
    const finish = yes => { if (done) return; done = true; dialog.close(); if (options.success) options.success({ confirm: yes, cancel: !yes }); };
    confirm.onclick = () => finish(true); cancel.onclick = () => finish(false);
    dialog.oncancel = event => { event.preventDefault(); finish(false); };
    dialog.showModal();
  }
  let toastTimer;
  function toast(message) {
    const element = document.querySelector('#toast'); element.textContent = message; element.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { element.hidden = true; }, 3200);
  }
  function showError(error) { modal({ title: '演示暂时无法继续', content: error.message || '请刷新后重试', showCancel: false }); }
  async function clipboard(data) {
    try { await navigator.clipboard.writeText(data); toast('已复制'); }
    catch (_) { modal({ title: '长按或选择后复制', content: data, showCancel: false }); }
  }
  function share() {
    const payload = current && current.onShareAppMessage ? current.onShareAppMessage() : { path: '/pages/activity/index' };
    const target = routeOf(payload.path), url = new URL(location.href); url.search = ''; url.hash = 'activity';
    for (const [key, value] of Object.entries(target.query)) url.searchParams.set(key, value);
    modal({ title: '邀请同行体验', content: '复制链接发给好友，即可打开这份手机 Demo。正式小程序中，这个按钮会打开微信分享卡片。演示不统计真实拉新。',
      link: url.href, confirmText: '复制演示链接', cancelText: '返回', success: answer => { if (answer.confirm) clipboard(url.href); } });
  }
  const fallbackStorage = new Map();
  let warnedStorage = false;
  function storageWarning() { if (!warnedStorage) { warnedStorage = true; toast('当前浏览器禁止保存，演示进度仅在本次打开期间保留'); } }
  window.wx = {
    getStorageSync(key) { try { return JSON.parse(localStorage.getItem(storagePrefix + key) || 'null') || fallbackStorage.get(key); } catch (_) { storageWarning(); return fallbackStorage.get(key); } },
    setStorageSync(key, value) { fallbackStorage.set(key, structuredClone(value)); try { localStorage.setItem(storagePrefix + key, JSON.stringify(value)); } catch (_) { storageWarning(); } },
    removeStorageSync(key) { fallbackStorage.delete(key); try { localStorage.removeItem(storagePrefix + key); } catch (_) { storageWarning(); } },
    navigateTo({ url }) { const target = routeOf(url); navigate(target.name, target.query); },
    redirectTo({ url }) { const target = routeOf(url); navigate(target.name, target.query, true); },
    switchTab({ url }) { const target = routeOf(url); navigate(target.name, target.query, true); },
    showModal: modal, setClipboardData: ({ data }) => clipboard(data), hideShareMenu() {}, showShareMenu() {},
    vibrateShort() {},
    requirePrivacyAuthorize({ fail }) { if (fail) fail(); },
    openCustomerServiceChat({ fail }) { if (fail) fail(); }
  };
  window.App = definition => { app = definition; };
  window.Page = definition => { definitions[registering] = definition; };
  window.getApp = () => app;
  function resize() { document.documentElement.style.setProperty('--rpx', document.querySelector('#phone').clientWidth / 750 + 'px'); }
  window.addEventListener('resize', resize); resize();
  document.querySelector('#back').onclick = () => history.state && history.state.depth > 0 ? history.back() : navigate('activity', {}, true);
  document.querySelectorAll('[data-tab]').forEach(button => { button.onclick = () => navigate(button.dataset.tab, {}, true); });
  document.querySelector('#about').onclick = () => modal({ title: '手机端交互 Demo', content: '这份演示使用已交付小程序的页面和游戏逻辑，可体验挑战、工具包、邀请及虚拟咨询。\n\n当前在浏览器中预览，不是已发布的微信小程序。手机号、微信分享和 SCRM 均未真实接通，不会联系你。', showCancel: false });
  window.addEventListener('popstate', event => {
    const state = event.state || { screen: 'activity', query: {}, depth: 0 };
    sequence = state.depth || 0; navigate(state.screen, state.query, true, true);
  });
  try {
    const config = evaluate('config.js'); config.mode = 'demo'; config.cloudEnv = '';
    evaluate('app.js'); if (app.onLaunch) app.onLaunch();
    document.querySelector('#app-style').textContent = css(sources['app.wxss']);
    const query = Object.fromEntries(new URLSearchParams(location.search));
    const initial = location.hash.slice(1) || 'activity';
    if (app.onShow) app.onShow({ path: 'pages/activity/index', query });
    navigate(initial, query, true);
  } catch (error) { showError(error); }
})();
