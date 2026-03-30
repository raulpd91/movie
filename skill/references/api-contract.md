# API Contract

## POST /api/mark-movie

### Headers

```http
Authorization: Bearer <api_key>
Content-Type: application/json
```

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
  "message": "记录成功！",
  "card_image_url": "https://movie-raulpd91.vercel.app/api/og?...&sig=...",
  "notion_url": "https://www.notion.so/...",
  "customer_id": "acme",
  "tmdb_status": "matched"
}
```

### Error Response (examples)

```json
{
  "success": false,
  "message": "Missing or invalid Authorization header."
}
```

## GET /api/og

通过 `title`、`poster`、`rating`、`comment`、`releaseDate` 动态生成电影卡片图片。
必须附带合法 `sig`，否则返回 `403`。

## POST /api/skill/mark-movie

用于外部客户“安装后即用”模式。

### Headers

```http
X-Install-Token: <install_token>
Content-Type: application/json
```

### Request

```json
{
  "title": "挽救计划",
  "rating": 4,
  "comment": "故事性不错，但是画面一般。",
  "date": "2026-03-30"
}
```

### Response

```json
{
  "success": true,
  "message": "记录成功！",
  "card_image_url": "https://movie-raulpd91.vercel.app/api/og?...&sig=...",
  "notion_url": "https://www.notion.so/...",
  "customer_id": "openclaw-prod",
  "tmdb_status": "matched"
}
```

## GET /api/health

返回服务健康状态和可用接口列表。
