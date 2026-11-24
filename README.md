# SCRM 小游戏活动生成平台 · 两套可交互设计稿

**[方向 A：配置生成型](https://leo131496.github.io/UA_campaign/studio/?mode=config)** · **[方向 B：AI 创作型](https://leo131496.github.io/UA_campaign/studio/?mode=ai)** · **[方案说明](https://leo131496.github.io/UA_campaign/studio/guide.html)**

面向企业的小游戏生产与运营平台：配置玩法与行业内容，或用 AI 创作入口描述活动，再进入统一的双端预览、版本发布和 SCRM 承接流程。客户手机端只玩游戏，自愿分享或了解品牌。

本轮按用户要求交付两方向设计稿。3 种手机玩法（翻牌、收集、知识闯关）可实际试玩；行业内容可编辑；AI 为明确标示的示例解析器，尚未连接大模型。演示发布生成可跨设备打开的 H5 配置快照，小程序与 SCRM 显示待接入。

## 新增：单人与好友协作

**[直接手机试玩](https://leo131496.github.io/UA_campaign/studio/player.html?v=7)** · **[扩充需求与规则](docs/platform-design/单人与好友协作扩充方案.md)**

默认不限行业，可自定义内容。好友上限配置为 0–5 位（不含发起人），最多 6 人同场。单人目标简单、基础积分低；多人目标更多，需要协作、每人基础积分更高。默认每关通关后 ×2，有贡献才得分，三关单人 600 分 / 组队每位有效参与者 1,200 分。

演示好友均明确标记；同浏览器多窗口已支持实际同步。跨手机房间服务、真实积分资产、微信、AI 和 SCRM 未接通。

## 可体验

- 通用与多行业内容起点与自定义内容，品牌与素材文案即时预览。
- 3 种不同规则的小游戏，计时、得分、结算和单人 / 好友协作闯关。
- AI 需求示例、方案修改、能力缺口提示、复制到配置编辑器。
- A/B 独立草稿，演示发布、版本恢复、手机独立链接。
- 当前浏览器实际演示行为统计；有效线索、商机不虚构。

[详细方案与开发边界](docs/platform-design/平台方案与开发边界.md) · [设计决策](docs/platform-design/设计决策.md)

`studio/` 是本轮新平台的交互设计。`wechat-miniprogram/` 保留上一版原生找茬实现，新平台三种引擎尚未移植至原生小程序。[上一版单游戏演示](https://leo131496.github.io/UA_campaign/spot-preview.html)。

## 本地预览

在仓库根目录运行静态文件服务，打开 `/studio/?mode=config` 或 `/studio/?mode=ai`。不需要依赖安装或密钥。Playwright 浏览器验收见 `tests/studio.test.cjs`；纯模型检查见 `tests/studio-model.test.cjs`。

原有微信原生项目的开发说明、规则测试与历史方案仍保留在各自目录。本设计未修改 BesChannels 真实系统。
