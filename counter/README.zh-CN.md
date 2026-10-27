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

采集器需要 KarmenLoop 账号专用的 GitHub 细粒度令牌，权限为 **Metadata: read** 与 GitHub Traffic 要求的 **Administration: read**。需要自动包含以后新增仓库时，选择该账号全部自有仓库。将其保存为本 Netlify 项目的 `GITHUB_TRAFFIC_TOKEN`，仅用于 production functions。不要提交进 Git、日志、浏览器代码或聊天，也不要用账号写入权限令牌代替。账号所有者配置凭据后，定时同步才能运行。

每轮采集必须完成清单内全部仓库，才允许保存。接口失败、权限缺失、数据异常和超时都保留上次完整结果；采集失败或三小时没有成功同步时，状态标为过期。首次导入前，仓库流量显示待接通，不虚构为零。官方纠正数据时替换原值，所以合计可能因纠正而下降。并发时，较旧的采集不能覆盖已经接受的新结果。

公开统计仅提供合计、来源时间、覆盖数量和新鲜度，不展示仓库身份、IP、浏览器标识、Cookie 或访客身份。Netlify 与 GitHub 保留其常规基础设施日志。启用前确认托管和数据库额度。

## 接口与维护

- `/github.gif`：账号统计图片，增加一次主页图片请求并显示合计。
- `/profile.gif`：兼容原图片，增加请求并显示原图片请求累计值。
- `/preview.gif`：只读合计快照。
- `/stats.json`、`/health`：只读数据和可用性。

图片选项为 `lang=en|zh-CN`、`theme=light|dark`、`motion=animated|static`；中英文共用记录。不提供公开重置、导入或可选计数键。Netlify 可能把 HEAD 检查转为 GET，因此监测使用统计、健康或预览接口，不请求两种计数图片。

部署前运行 `npm test`，核对只读轮询不增加数字、重复导入不重复计数、重新部署后历史仍在，以及中英文来源定义一致。存储写入验收使用隔离数据库分支。服务不可用时，浏览器保留上次观察值，或接口返回 503，不显示虚构的零。草稿部署保持私有。定时状态和授权测试运行参见 [Netlify 定时函数指南](https://docs.netlify.com/build/functions/scheduled-functions/)。

折光体仍为 640 × 640、120 帧、每帧 50 毫秒，每六秒循环。重新生成时将官方 [Inter 可变字体](https://github.com/rsms/inter) 放在 `tmp/inter-variable.ttf`；系统无中文字体时设置 `COUNTER_CJK_FONT`。运行 `npm run build:assets`；仅修改卡片文字时使用 `node scripts/build-assets.mjs --text-only`。[Inter 许可](brand/inter-license.txt)继续保留。GIF 只有单色透明，PNG 保留完整 alpha。README 中的 GIF 无法跟随系统减少动态效果，所以保留静态选项。
