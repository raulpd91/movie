---
name: movie-tracker-agent
description: Use this skill when the user wants to log a watched movie through natural language, enrich it with TMDB metadata, sync it into Notion, and return a dynamic movie card image generated on Vercel.
---

# Movie Tracker Agent Skill

这个 skill 负责把用户的一句观影记录请求，转成结构化的电影条目、Notion 页面和一张动态电影卡片。

## 使用时机

- 用户想记录一部刚看完的电影
- 需要自动补全海报、上映年份等元数据
- 需要把观影记录写入 Notion 数据库
- 需要返回一张可分享的电影卡片图片

## 工作方式

1. 接收 `title`、`rating`、`comment`、`date`
2. 安装即用模式走 `X-Install-Token` 鉴权（`POST /api/skill/mark-movie`）
3. 运维模式走 `Authorization: Bearer <api_key>`（`POST /api/mark-movie`）
4. 查询 TMDB，取回海报和上映日期，失败时降级继续
5. 将观影记录写入 Notion（含 `Customer ID`、`Customer Name`、`TMDB Status`）
6. 生成并返回带签名的 OG 观影卡片直链

## 云端接口

接口约定见 [references/api-contract.md](references/api-contract.md)。

实现时优先关注：

- `app/api/mark-movie/route.ts`
- `app/api/og/route.tsx`
- `lib/sign.ts`
- `lib/auth.ts`
- `lib/redis.ts`
- `skill/references/api-contract.md`

如果要扩展更多字段、标签体系或多数据源同步，再继续补充 `skill/references/` 下的文档。
