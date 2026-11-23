# 默契找茬局 · 手机在线预览

[打开历史单游戏 Demo](https://leo131496.github.io/UA_campaign/spot-preview.html?v=5)

仓库首页现为 [小游戏生成平台双方案](https://leo131496.github.io/UA_campaign/studio/)。本目录仍为上一版原生找茬页面的浏览器预览。

在线预览复用微信原生项目的七个页面、找茬规则和本地视觉算法。客户可实际找不同、使用 AI 提示、分享同关链接、在另一台手机完成后查看双方合拍结果。

`build.cjs` 打包 39 个原生前端文件，`preview.js` 映射本项目用到的页面组件、图片、导航和本地存储。强制 demo 模式，未加载云函数、令牌或真实客户信息。

分享链接带关卡与发起人的发现顺序，属于自报演示数据。正式微信模式由服务端对局和邀请码计算，不能把演示链接当作可信比赛成绩或真实拉新数据。

原生页面变化后运行 `node phone-demo/build.cjs`；`--check` 可检查源文件一致性。

浏览器验证：安装 Playwright，运行 `node tests/phone-preview.test.cjs`，默认访问本机 8771 端口的 `spot-preview.html`；`DEMO_BASE_URL` 可改地址。检查包含两个隔离的浏览器玩家、同关图片、真实找茬、AI 区域提示、双方结果、领取、虚拟申请及撤回。截图默认存于 `/tmp/ua-phone-preview`。它不代替微信真机验收。
