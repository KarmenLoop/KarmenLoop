# KarmenLoop 主页计数器

[English](README.md) | 简体中文 · [返回主页](../README.zh-CN.md)

自托管的主页图片，使用 KARMEN LOOP 原创折光体。外部背景与环体中间的孔洞均透明；波形沿环体持续流动，以每秒 20 帧、每六秒一轮播放。放大的折光体旁显示总浏览量，数字保持稳定。

[预览与下载](https://karmenloop-profile.netlify.app) · [透明 GIF](https://karmenloop-profile.netlify.app/karmen-loop.gif) · [静态 PNG](https://karmenloop-profile.netlify.app/karmen-loop.png)

## 数字代表什么

累计服务接受并持久保存的正式图片请求，从首次请求开始，不导入以前的流量。中英文图片与深浅色文字版本共用一条记录。服务只保存累计值及起始、更新时间，不保存 IP、浏览器标识、Cookie 或访客身份；Netlify 可能保留常规基础设施日志。

GitHub 通过 Camo 代理读取 README 图片，也可能使用缓存；打开页面不一定触发一次新请求，自动程序也可能请求图片。Netlify 还会在应用收到请求前把 HEAD 检查转为 GET，这类检查也可能计入图片请求。因此数字是主页访问估计值，不是独立访客人数或实时在线人数。监测请使用 `/health`、`/stats.json` 或 `/preview.gif`。参见 [GitHub 图片代理说明](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls)。

GIF 只有单一透明色，不支持半透明，所以边缘在深浅背景上可能略有差异；单独的 PNG 保留完整透明通道。README 中的 GIF 无法跟随系统减少动态效果设置，不希望播放时可使用静态查看入口。

## 本机使用

当前版本 **1.1.0**，需要 Node **22 或以上**。在仓库内执行：

```sh
cd counter
npm ci
npm test
npm start
```

打开 `http://127.0.0.1:55942`。本机预览使用明确标注的示例数字，不连接正式数据库。仓库已包含可用的渲染资源，无需重新生成。

## 自行托管

以本文件夹建立独立 Netlify 项目，保留 `netlify.toml`。`@netlify/database` 依赖会配置 PostgreSQL，部署时应用已提交的迁移。部署前确认现有方案的额度；数据库地址与账户令牌不要提交进 Git。

函数读取 Netlify 请求上下文，只允许正式部署计数。草稿部署显示空的只读预览，不连接正式数据库，继续保持私有。存储验收使用独立数据库分支。正式图片需要无需登录即可访问，GitHub 才能读取。静态资源、图片请求及数据库使用消耗托管账户的常规额度。

固定接口为 `/profile.gif`（计数）、`/preview.gif`（只读）、`/stats.json`（只读）和 `/health`。图片选项为 `lang=en|zh-CN`、`theme=light|dark`、`motion=animated|static`。不提供重置接口或可选计数键。

## 维护与恢复

部署前运行 `npm test`。在访问 `/preview.gif` 及对该预览接口发送 HEAD 请求前后读取 `/stats.json`，累计值应保持不变。不要对 `/profile.gif` 发 HEAD 来监测：托管代理会将其转换为 GET。并发写入测试使用独立数据库分支，不向正式图片批量发送请求。再次部署后确认累计值仍在，中英文主页同步更新。

需要重新生成图像时，将官方 [Inter 可变字体](https://github.com/rsms/inter) 放到 `tmp/inter-variable.ttf`；系统没有中文字体时，通过 `COUNTER_CJK_FONT` 指定。随后运行 `npm run build:assets`。构建沿用官网三瓣折光体，加入周期性表面流动、平滑反射与两倍超采样。独立素材为 640 × 640，计数卡为 720 × 260，共 120 帧、每帧 50 毫秒，生成 GIF、PNG、索引动画与文字图集。运行时不携带字体文件或账户凭据。Inter 许可保存在 [brand/inter-license.txt](brand/inter-license.txt)。

存储不可用时，图片接口返回 HTTP 503，不显示虚构的零，也不重置记录。恢复数据库连接后重试。应用可以回滚部署，但不要删除或替换累计表。移除主页图片时，同步删除两个 README 中的 picture 块与静态入口；除非用户明确要求删除，否则保留历史记录。
