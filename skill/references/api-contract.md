# API Contract

## GET /api/health

用于健康检查，返回服务名、skill 标识和可用接口列表。

## POST /api/invoke

### Request

```json
{
  "input": "帮我生成一份产品发布草稿",
  "mode": "draft"
}
```

### Response

```json
{
  "service": "skill-cloud-starter",
  "skill": "starter-skill",
  "mode": "draft",
  "timestamp": "2026-03-30T00:00:00+00:00",
  "input": "帮我生成一份产品发布草稿",
  "summary": "这是一个通用 starter 响应。",
  "steps": [
    "识别任务目标：帮我生成一份产品发布草稿",
    "提取输入中的关键约束、语气和输出格式偏好",
    "调用你的真实业务逻辑或外部工具完成任务",
    "生成结构化结果并返回给本地端或云端调用方"
  ],
  "output": {
    "title": "Starter Skill Output",
    "body": "当前返回的是模板内容。"
  }
}
```
