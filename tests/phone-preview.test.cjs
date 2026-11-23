// Browser integration check: install Playwright or set PLAYWRIGHT_MODULE to its local package.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const engine = require('../game/engine');
const base = process.env.DEMO_BASE_URL || 'http://127.0.0.1:8771/';
const output = process.env.DEMO_SCREENSHOTS || '/tmp/ua-phone-preview';
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    await page.getByRole('button', { name: '接管项目 →', exact: true }).waitFor();
    assert.equal(await page.locator('#native-page input').count(), 0);
    assert(await page.locator('#native-page .page').evaluate(element => parseFloat(getComputedStyle(element).paddingLeft) >= 12));
    await page.screenshot({ path: path.join(output, 'mobile-home.png') });
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert(await page.evaluate(() => document.querySelector('#screen').scrollWidth <= document.querySelector('#screen').clientWidth + 1));
    }
    await page.getByRole('button', { name: '接管项目 →', exact: true }).click();
    await page.locator('[data-id="repair"]').waitFor();
    await page.getByRole('button', { name: 'AI 帮我想一步', exact: true }).click();
    await page.locator('.ai-hint').filter({ hasText: 'AI 建议' }).waitFor();
    assert.equal(await page.locator('.resource.selected').count(), 1);
    await page.screenshot({ path: path.join(output, 'mobile-game.png') });
    const saved = await page.evaluate(() => wx.getStorageSync('ua-game-' + getApp().globalData.currentCampaignId));
    const plan = engine.solve(engine.create(saved.seed), 48).path;
    for (let i = 0; i < plan.length; i++) {
      const move = plan[i];
      if (move.card === 'pass') {
        await page.getByRole('button', { name: '结束本回合', exact: true }).click();
        await page.locator('#dialog-confirm').click();
      } else {
        await page.locator('[data-id="' + move.card + '"]').click();
        await page.locator('[data-index="' + move.target + '"]').click();
      }
      await page.waitForFunction(count => {
        const state = wx.getStorageSync('ua-game-' + getApp().globalData.currentCampaignId);
        return getApp().globalData.lastGame || state && state.moves.length === count;
      }, i + 1);
    }
    await page.getByRole('button', { name: '领取项目启动工具包', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => getApp().globalData.lastGame.status), 'won');
    await page.getByRole('button', { name: '领取项目启动工具包', exact: true }).click();
    await page.getByRole('button', { name: '复制完整工具包', exact: true }).waitFor();
    assert.equal(await page.locator('.check-item').count(), 12);
    await page.screenshot({ path: path.join(output, 'mobile-toolkit.png') });
    await page.getByRole('button', { name: '把挑战分享给同行', exact: true }).click();
    await page.getByRole('button', { name: '发给微信好友 / 群', exact: true }).click();
    await page.locator('#preview-dialog[open]').waitFor();
    const share = await page.locator('#dialog-link').inputValue();
    assert(share.includes('invite=demo_local_only'));
    assert.deepEqual(await page.locator('.stat-box .value').allTextContents(), ['0', '0', '0', '0']);
    await page.locator('#dialog-cancel').click();
    await page.screenshot({ path: path.join(output, 'mobile-invite.png') });
    const friend = await context.newPage(); await friend.goto(share);
    await friend.getByRole('button', { name: '接管项目 →', exact: true }).waitFor(); await friend.close();
    await page.locator('#back').click();
    await page.getByRole('button', { name: '我想聊聊业务问题', exact: true }).click();
    await page.getByRole('button', { name: '提升团队协作', exact: true }).click();
    assert.equal(await page.locator('input:checked').count(), 0);
    await page.locator('checkbox-group[data-field="serviceConsent"] input').check();
    await page.locator('checkbox-group[data-field="marketing"] input').check();
    await page.getByRole('button', { name: '用虚拟身份演示提交', exact: true }).click();
    await page.getByText('已保存演示申请', { exact: true }).waitFor();
    assert(await page.getByText('虚拟手机号 · 演示记录 · 未发送', { exact: true }).isVisible());
    await page.getByRole('button', { name: '查看我的申请', exact: true }).click();
    await page.getByRole('button', { name: '撤回后续推荐授权', exact: true }).click();
    await page.locator('#dialog-confirm').click();
    await page.getByText('后续服务推荐：未授权 / 已撤回', { exact: true }).waitFor();
    await page.reload(); await page.getByText('后续服务推荐：未授权 / 已撤回', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'mobile-my-records.png') });
    await page.locator('[data-tab="activity"]').click();
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.screenshot({ path: path.join(output, 'desktop-phone-preview.png') });
    assert((await page.locator('#phone').boundingBox()).width <= 431);
    assert.deepEqual(errors, []);
    console.log('Passed: phone layouts, real game with AI, toolkit, invitation, shared-link arrival, consent, virtual request, revocation and persisted records.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
