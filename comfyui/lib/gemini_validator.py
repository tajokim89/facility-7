"""
gemini_validator.py - Gemini CLI 서브프로세스로 이미지 검증

Gemini CLI 설치 필요: https://github.com/google-gemini/gemini-cli
  npm install -g @google/gemini-cli

사용 방법:
  generate.py scenes --ids S03 --validate
  generate.py batch --validate
"""

import os
import subprocess


def _build_validation_prompt(prompt: str, negative_prompt: str = "") -> str:
    lines = [
        "이 이미지가 아래 목표 프롬프트와 얼마나 잘 일치하는지 평가해줘.",
        "",
        f"목표 프롬프트: {prompt}",
    ]
    if negative_prompt:
        lines.append(f"피해야 할 요소: {negative_prompt}")
    lines += [
        "",
        "반드시 아래 형식으로만 답해줘 (다른 말 하지 말고):",
        "점수: X/10",
        "일치:",
        "- [잘 된 점]",
        "불일치:",
        "- [잘못된 점 또는 없으면 '없음']",
        "총평: [한 줄]",
    ]
    return "\n".join(lines)


def validate_image(image_path: str, prompt: str,
                   negative_prompt: str = "",
                   timeout: int = 60) -> dict:
    """
    Gemini CLI로 이미지 검증.
    반환: {"success": bool, "output": str, "score": str, "error": str}
    """
    abs_path = os.path.abspath(image_path).replace("\\", "/")
    validation_prompt = _build_validation_prompt(prompt, negative_prompt)

    # gemini CLI: -p "prompt @/path/to/image.png"
    full_prompt = f'{validation_prompt}\n\n@{abs_path}'
    cmd = ["gemini", "-p", full_prompt]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            encoding="utf-8",
            errors="replace",
        )
        output = result.stdout.strip()
        success = result.returncode == 0 and bool(output)

        # 점수 파싱 (예: "점수: 8/10" → "8/10")
        score = _parse_score(output)

        if not success and result.stderr:
            return {
                "success": False,
                "output": "",
                "score": None,
                "error": result.stderr.strip(),
            }

        return {
            "success": True,
            "output": output,
            "score": score,
            "error": "",
        }

    except FileNotFoundError:
        return {
            "success": False,
            "output": "",
            "score": None,
            "error": "gemini CLI를 찾을 수 없습니다. 설치: npm install -g @google/gemini-cli",
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "output": "",
            "score": None,
            "error": f"타임아웃 ({timeout}초)",
        }
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "score": None,
            "error": str(e),
        }


def _parse_score(output: str) -> str | None:
    """출력에서 '점수: X/10' 추출."""
    for line in output.splitlines():
        line = line.strip()
        if line.startswith("점수:"):
            return line.split(":", 1)[1].strip()
    return None


def print_validation_result(scene_id: str, result: dict):
    """검증 결과 콘솔 출력."""
    if not result["success"]:
        print(f"  [Gemini 검증 실패] {result['error']}")
        return

    score = result.get("score") or "?"
    print(f"  [Gemini 검증] {scene_id} | 점수: {score}")
    for line in result["output"].splitlines():
        if line.strip():
            print(f"    {line}")
