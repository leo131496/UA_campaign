# 默契找茬局 · 给客户玩的好友挑战

**[点击直接玩手机 Demo](https://leo131496.github.io/UA_campaign/?v=5)**

60 秒找出两张趣味插画的 5 处不同，AI 视觉助手在卡住时给出区域提示；邀请朋友玩同一关，看看双方最先注意到的细节有多合拍。

游戏入口没有业务启动、团队管理或前置表单。企业的品牌露出、小礼物与自愿了解入口放在活动里，获客归因和客户跟进放在 SCRM 后台。

- 真实可玩的找不同：计时、点错反馈、圈选、积分、三档差异大小。
- 本地视觉 AI：像素差分、连通区域搜索、渐进提示；未调用大模型。
- 好友默契：链接带同一关卡，朋友独立玩完后生成双方结果，可继续邀请其他朋友。
- 微信原生代码与手机在线预览共用页面和规则。
- 服务端提供邀请码归因、结果重放、小礼物领取、独立授权与 SCRM 待同步队列。

**[产品与交互方案](wechat-miniprogram/docs/产品与交互方案.md) · [小程序开发交付](wechat-miniprogram/README.md) · [接口与数据](wechat-miniprogram/docs/接口与数据说明.md)**

在线版为可玩演示。好友对比结果实际计算，但链接数据属于自报；微信授权、真实获客统计和 BesChannels 尚未接通。

## 开发与检查

微信开发者工具导入 `wechat-miniprogram/`。原生页面更新后，在仓库根目录执行：

```bash
node phone-demo/build.cjs
node phone-demo/build.cjs --check
cd wechat-miniprogram
npm test
npm run check
```

浏览器双人流程检查见 [在线预览说明](phone-demo/README.md)。`game/legacy-web.html` 和旧版策略引擎保留历史原型，不是当前玩法。
