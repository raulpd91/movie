# Movie Tracker Agent Skill

一个部署在 Vercel 上的 Movie Tracker 智能体技能服务。它接收电影标题、评分、短评和日期，自动查询 TMDB 元数据，将观影记录写入 Notion，并返回一张动态生成的观影卡片。

## 技术栈

- Next.js App Router
- TypeScript
- Vercel Serverless / Edge Functions
- `@vercel/og`
- TMDB API
- Notion API

## 核心接口

- `POST /api/mark-movie`
- `GET /api/og`
- `GET /api/health`

## 请求示例

```bash
curl -X POST https://your-project.vercel.app/api/mark-movie \
  -H "Content-Type: application/json" \
  -d '{
    "title": "沙丘",
    "rating": 5,
    "comment": "视听震撼，世界观浑厚，二刷也值得。",
    "date": "2026-03-30"
  }'
```

## 环境变量

复制 `.env.example` 到 `.env.local`，并填写：

```bash
TMDB_API_KEY=
NOTION_API_KEY=
NOTION_DATABASE_ID=
NEXT_PUBLIC_APP_URL=
```

## 本地运行

```bash
npm install
npm run dev
```

## Notion 数据库字段

当前代码默认目标数据库中存在以下属性：

- `Title` - title
- `Poster URL` - url
- `Rating` - number
- `Comment` - rich_text
- `Date` - date
- `Release Date` - rich_text

如果你的数据库字段名不同，需要同步修改 [app/api/mark-movie/route.ts](/Users/user/Documents/openai-codex/app/api/mark-movie/route.ts) 里的属性映射。
