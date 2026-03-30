# API Contract

## POST /api/mark-movie

### Request

```json
{
  "title": "沙丘",
  "rating": 5,
  "comment": "视听震撼，世界观浑厚，二刷也值得。",
  "date": "2026-03-30"
}
```

### Response

```json
{
  "success": true,
  "message": "已记录《沙丘》的观影信息，并生成了观影卡片。",
  "card_image_url": "https://your-domain.vercel.app/api/og?...",
  "notion_url": "https://www.notion.so/...",
  "movie": {
    "title": "沙丘",
    "release_date": "2021-09-15",
    "poster_url": "https://image.tmdb.org/t/p/w500/..."
  }
}
```

## GET /api/og

通过 `title`、`poster`、`rating`、`comment`、`releaseDate` 动态生成电影卡片图片。

## GET /api/health

返回服务健康状态和可用接口列表。
