#!/usr/bin/env python3
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.skill_runtime import build_skill_response


def main():
    user_input = " ".join(sys.argv[1:]).strip() or "请给这个 starter skill 一个真实任务"
    result = build_skill_response(user_input=user_input, mode="local")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
