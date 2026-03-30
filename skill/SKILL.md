---
name: starter-skill
description: Use this skill when a project needs a starter template for a local skill plus a lightweight cloud API. It helps structure prompts, local testing, and remote invocation through a simple server endpoint.
---

# Starter Skill

这个 skill 是一个项目模板，适合在你还没有最终业务主题时，先把本地端和云端链路搭通。

## 使用时机

- 需要定义一个本地 skill 的基本行为
- 需要把同样的逻辑暴露成云端 API
- 需要先验证 GitHub 到 Vercel 的自动部署流程

## 工作方式

1. 读取调用方输入
2. 提炼任务目标和关键约束
3. 输出一个结构化响应
4. 在本地脚本和云端接口之间复用同一份运行时逻辑

## 本地调试

运行：

```bash
python3 skill/scripts/local_skill.py "帮我整理一份技能设计草稿"
```

## 云端接口

接口约定见 [references/api-contract.md](references/api-contract.md)。

当你要接入真实业务能力时，优先修改：

- `src/skill_runtime.py`
- `skill/references/api-contract.md`

如果需要更复杂的资源、工具调用或多步流程，可以继续在 `skill/references/` 和 `skill/scripts/` 下扩展。
