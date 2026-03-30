from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

SERVICE_NAME = "skill-cloud-starter"
SKILL_SLUG = "starter-skill"


def _build_steps(user_input: str) -> List[str]:
    normalized = user_input.strip() or "请描述你希望 skill 完成的任务"
    return [
        f"识别任务目标：{normalized}",
        "提取输入中的关键约束、语气和输出格式偏好",
        "调用你的真实业务逻辑或外部工具完成任务",
        "生成结构化结果并返回给本地端或云端调用方",
    ]


def build_skill_response(user_input: str, mode: str = "default") -> Dict[str, Any]:
    steps = _build_steps(user_input)
    return {
        "service": SERVICE_NAME,
        "skill": SKILL_SLUG,
        "mode": mode,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "input": user_input,
        "summary": "这是一个通用 starter 响应。你可以把这里替换成真实的 skill 处理逻辑。",
        "steps": steps,
        "output": {
            "title": "Starter Skill Output",
            "body": (
                "当前返回的是模板内容，用来验证本地脚本、GitHub 推送和 "
                "Vercel 部署链路已经打通。"
            ),
        },
    }
