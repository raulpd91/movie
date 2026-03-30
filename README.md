# Skill Cloud Starter

这是一个可直接推送到 GitHub 并部署到 Vercel 的通用 skill 项目模板。

它同时包含两部分：

- `skill/`：本地 skill 定义、说明和调试脚本
- `api/`：部署到 Vercel 的轻量 Python serverless API

## 项目结构

```text
.
├── api/
│   ├── health.py
│   └── invoke.py
├── skill/
│   ├── SKILL.md
│   ├── references/
│   │   └── api-contract.md
│   └── scripts/
│       └── local_skill.py
├── src/
│   ├── __init__.py
│   └── skill_runtime.py
├── examples/
│   └── request.json
├── .gitignore
├── index.html
└── vercel.json
```

## 本地能力

本地脚本直接复用 `src/skill_runtime.py` 的逻辑：

```bash
python3 skill/scripts/local_skill.py "帮我生成一份简短的产品介绍"
```

## 云端能力

部署到 Vercel 后，你会得到两个接口：

- `GET /api/health`
- `POST /api/invoke`

示例请求：

```bash
curl -X POST https://your-project.vercel.app/api/invoke \
  -H "Content-Type: application/json" \
  -d @examples/request.json
```

## 下一步

1. 把这个仓库推到你的 GitHub
2. 在 Vercel 导入该仓库
3. 配置环境变量和自定义域名（如果需要）
4. 再把 `src/skill_runtime.py` 里的通用逻辑换成你真实的 skill 业务能力
