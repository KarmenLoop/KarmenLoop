# KarmenLoop GitHub 累计浏览记录

[English](README.md) | 简体中文 · [返回主页](../README.zh-CN.md)

自托管的 GitHub 浏览统计，汇总 KarmenLoop 仓库数据，搭配透明背景的银色流动折光体。打开[自动更新统计](https://karmenloop-profile.netlify.app/?lang=zh-CN)，数字会在页面保持打开时更新，无需手动刷新。GitHub README 显示图片快照，并提供自动更新页面的入口。

[透明 GIF](https://karmenloop-profile.netlify.app/karmen-loop.gif) · [静态 PNG](https://karmenloop-profile.netlify.app/karmen-loop.png)

## 合计包含什么

合计相加以下两种来源，自动更新页面会分别显示：

- **仓库页面浏览：**GitHub 官方 Traffic 提供的账号可读仓库数据。采集器按“仓库＋日期”保存每日值；GitHub 更新某天数据时替换该记录，不会反复累加同一个统计窗口。已经保存的日期，即使超出 GitHub 的 14 天接口窗口，也继续保留。
- **主页图片请求：**原计数器及其已有累计值、起始和更新时间。读取主页或账号统计图片会继续增加此记录；查看自动更新页面、统计接口、预览和健康接口不会增加计数。

两种来源可能覆盖同一次访问，因此合计称为**累计浏览记录**，不是独立访客人数，也不是跨来源去重后的页面浏览量。GitHub 已不再提供的更早历史无法补回；下载后在本地或离线阅读也不属于 GitHub 网页浏览数据。公开统计不展示私有仓库名称或逐仓流量记录。

GitHub 仓库流量约每小时更新。自托管页面可见时，每十秒检查已到达的新数据，并显示上次仓库同步时间；没有新的来源值时，数字不会自行上涨。GitHub 会清理 README HTML，并代理、缓存图片，因此已打开的 README 图片不能运行自动更新客户端。参见 [GitHub Traffic](https://docs.github.com/en/rest/metrics/traffic)、[更新时间](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository)和[图片缓存](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls)。

## 本机使用

当前版本 **1.2.0**，需要 Node **22 或以上**：

```sh
cd counter
npm ci
npm test
npm start
```

打开 `http://127.0.0.1:55942`。本机预览明确标注示例数字，不读取或修改正式数据库。渲染素材已经提交，可以直接使用。

## 接通仓库流量

以本文件夹建立独立 Netlify 项目，保留 `netlify.toml`。`@netlify/database` 配置 PostgreSQL 并应用迁移；新增表保留原主页计数器。定时函数在 UTC 每小时第 17 分钟采集，仅在当前已发布的正式部署运行。草稿部署不连接正式库，也不运行采集器。

采集器需要 KarmenLoop 账号专用的 GitHub 细粒度令牌，权限为 **Metadata: read** 与 GitHub Traffic 要求的 **Administration: read**。选择 **All repositories**，涵盖私有仓库和以后新增的仓库。将其保存为本 Netlify 项目的 `GITHUB_TRAFFIC_TOKEN`，仅用于 production functions。不要提交进 Git、日志、浏览器代码或聊天，也不要用账号写入权限令牌代替。账号所有者配置凭据后，定时同步才能运行。令牌到期前需续期；过期后保留已有累计值，并将同步标记为过期。

首次云端导入前，用账号现有本机权限重新读取清单，与专用令牌可见的完整仓库 ID 集合逐一比较。目前已核实 39 个仓库；仅比较数量并不足够。将已核实的 ID 以逗号分隔，保存为 production functions 的 `GITHUB_TRAFFIC_BASELINE_IDS`，不写入公开文件或统计。没有这份基线时，采集器拒绝保存。

每次成功采集会保存已跟踪的仓库 ID。后续清单必须包含基线及所有已跟踪 ID；新仓库会扩展集合。缺少任何一个仓库，整轮导入都不会接受。仓库被删除或转移时，需要所有者明确核对并调整基线和跟踪集合，历史每日记录继续保留。令牌无法发现自身权限范围之外的仓库，因此应保持 All repositories，并在权限变动后重新核对覆盖范围。

每轮采集必须完成清单内全部仓库，才允许保存。接口失败、权限缺失、数据异常和超时都保留上次完整结果；采集失败或三小时没有成功同步时，状态标为过期。首次导入前，仓库流量显示待接通，不虚构为零。官方纠正数据时替换原值，所以合计可能因纠正而下降。在截至采集当天的十四个 UTC 日历日内，官方结果中缺少的日期按零替换；更早的那个不完整边界日只在官方明确返回时更新，其他历史继续保留。并发时，较旧的采集不能覆盖已经接受的新结果。

公开统计仅提供合计、来源时间、覆盖数量和新鲜度，不展示仓库身份、IP、浏览器标识、Cookie 或访客身份。Netlify 与 GitHub 保留其常规基础设施日志。启用前确认托管和数据库额度。

## 接口与维护

- `/github.gif`：账号统计图片，增加一次主页图片请求并显示合计。
- `/profile.gif`：兼容原图片，增加请求并显示原图片请求累计值。
- `/preview.gif`：只读合计快照。
- `/stats.json`、`/health`：只读数据和可用性。

图片选项为 `lang=en|zh-CN`、`theme=light|dark`、`motion=animated|static`；中英文共用记录。不提供公开重置、导入或可选计数键。Netlify 可能把 HEAD 检查转为 GET，因此监测使用统计、健康或预览接口，不请求两种计数图片。

部署前运行 `npm test`，核对只读轮询不增加数字、重复导入不重复计数、重新部署后历史仍在，以及中英文来源定义一致。存储写入验收使用隔离数据库分支。服务不可用时，浏览器保留上次观察值，或接口返回 503，不显示虚构的零。草稿部署保持私有。定时状态和授权测试运行参见 [Netlify 定时函数指南](https://docs.netlify.com/build/functions/scheduled-functions/)。

折光体仍为 640 × 640、120 帧、每帧 50 毫秒，每六秒循环。重新生成时将官方 [Inter 可变字体](https://github.com/rsms/inter) 放在 `tmp/inter-variable.ttf`；系统无中文字体时设置 `COUNTER_CJK_FONT`。运行 `npm run build:assets`；仅修改卡片文字时使用 `node scripts/build-assets.mjs --text-only`。[Inter 许可](brand/inter-license.txt)继续保留。GIF 只有单色透明，PNG 保留完整 alpha。README 中的 GIF 无法跟随系统减少动态效果，所以保留静态选项。
