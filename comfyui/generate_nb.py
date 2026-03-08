"""
generate_nb.py - Nano Banana (Gemini) 이미지 생성 CLI

사용 전:
  pip install google-genai
  set GEMINI_API_KEY=your_api_key_here

사용 예:
  python comfyui/generate_nb.py scenes --ids S01 S02
  python comfyui/generate_nb.py scenes --type environment
  python comfyui/generate_nb.py scenes --type macro
  python comfyui/generate_nb.py scenes --model pro --ids S01

참고:
  - character_scene / character_closeup 은 IP-Adapter 미지원으로 부적합
  - environment / macro / special 타입에 적합
  - 생성 이미지는 comfyui/images/temp/ 에 저장
"""

import argparse
import base64
import os
import sys
import json
import random

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("google-genai 패키지가 없습니다. 설치: pip install google-genai")
    sys.exit(1)

from comfyui.lib.schema import load_all_scenes, infer_scene_type
from comfyui.lib.config import PROMPT_DIR, TEMP_DIR
from comfyui.lib.manifest import record_generation

# 씬 타입별 aspect_ratio 매핑
ASPECT_RATIO_MAP = {
    "environment":        "16:9",
    "macro":              "16:9",
    "special":            "16:9",
    "character_scene":    "16:9",   # 비권장 (일관성 보장 안 됨)
    "character_closeup":  "1:1",    # 비권장
}

# 사용 가능한 모델
# free = 무료 티어 (500 RPD, 10 RPM)
# flash / pro = 유료 플랜 필요
MODELS = {
    "free":  "gemini-2.5-flash-image-preview-05-20",  # 무료 티어 (500장/일)
    "flash": "gemini-3.1-flash-image-preview",        # 유료 플랜 필요
    "pro":   "gemini-3-pro-image-preview",            # 유료 플랜 필요
}

# character 타입은 경고만 (차단하지는 않음 - 강제로 쓰고 싶을 수도 있으니)
UNSUPPORTED_TYPES = {"character_scene", "character_closeup"}


def make_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("오류: GEMINI_API_KEY 환경 변수가 없습니다.")
        print("  Windows: set GEMINI_API_KEY=your_key")
        sys.exit(1)
    return genai.Client(api_key=api_key)


def build_prompt(scene: dict) -> str:
    """씬 dict에서 Gemini 프롬프트 문자열 생성."""
    parts = [scene.get("prompt", "")]
    neg = scene.get("negative_prompt", "")
    if neg:
        parts.append(f"Avoid: {neg}")
    return "\n".join(p for p in parts if p)


def generate_image(client: genai.Client, scene: dict, model_key: str,
                   out_dir: str) -> str | None:
    """씬 하나를 Nano Banana로 생성. 저장 경로 반환."""
    scene_id = scene["id"]
    scene_type = scene.get("scene_type") or infer_scene_type(scene)
    aspect = ASPECT_RATIO_MAP.get(scene_type, "16:9")
    model = MODELS[model_key]
    prompt_text = build_prompt(scene)
    seed = random.randint(1, 999999999)

    print(f"  모델: {model}")
    print(f"  aspect_ratio: {aspect}")
    print(f"  prompt: {prompt_text[:80]}...")

    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt_text,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(
                    aspect_ratio=aspect,
                    image_size="2K",
                ),
            ),
        )
    except Exception as e:
        print(f"  API 오류: {e}")
        return None

    # 응답에서 이미지 추출
    image_data = None
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            image_data = part.inline_data.data
            break

    if not image_data:
        print(f"  이미지 데이터 없음 (응답: {response})")
        return None

    os.makedirs(out_dir, exist_ok=True)
    filename = f"NB_{scene_id}_{seed}.png"
    filepath = os.path.join(out_dir, filename)

    # bytes 또는 base64 문자열 처리
    if isinstance(image_data, (bytes, bytearray)):
        raw = image_data
    else:
        raw = base64.b64decode(image_data)

    with open(filepath, "wb") as f:
        f.write(raw)

    record_generation(scene_id, seed=seed, path=filepath,
                      workflow=f"nano_banana_{model_key}", variant_idx=0)
    return filepath


def cmd_scenes(args):
    scenes = load_all_scenes(PROMPT_DIR, filter_ids=args.ids, exclude_chain=False)
    # reference 타입 제외
    scenes = [s for s in scenes if s.get("scene_type") != "reference"
              and not s.get("is_reference")]

    # --type 필터
    if args.type:
        scenes = [s for s in scenes if
                  (s.get("scene_type") or infer_scene_type(s)) == args.type]

    if not scenes:
        print("씬이 없습니다.")
        return

    # character 타입 경고
    for s in scenes:
        st = s.get("scene_type") or infer_scene_type(s)
        if st in UNSUPPORTED_TYPES:
            print(f"  [경고] {s['id']} ({st}): IP-Adapter 미지원 - 캐릭터 일관성 보장 안 됨")

    client = make_client()
    print(f"\n=== Nano Banana 생성 | {len(scenes)}개 | model={args.model} ===\n")

    results = []
    for i, scene in enumerate(scenes):
        scene_id = scene["id"]
        scene_type = scene.get("scene_type") or infer_scene_type(scene)
        print(f"[{i+1}/{len(scenes)}] {scene_id} ({scene_type})")
        path = generate_image(client, scene, args.model, TEMP_DIR)
        if path:
            results.append(path)
            print(f"  -> {path}")
        else:
            print(f"  실패")

    print(f"\n완료: {len(results)}/{len(scenes)}개 생성.")


def main():
    parser = argparse.ArgumentParser(
        description="Nano Banana (Gemini) 이미지 생성 CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    sub = parser.add_subparsers(dest="command", required=True)

    p_scenes = sub.add_parser("scenes", help="씬 생성")
    p_scenes.add_argument("--ids", nargs="+", help="생성할 씬 ID 목록")
    p_scenes.add_argument("--type", choices=list(ASPECT_RATIO_MAP.keys()),
                          help="scene_type 필터 (environment 권장)")
    p_scenes.add_argument("--model", choices=list(MODELS.keys()), default="free",
                          help="사용할 모델 (free=무료 500장/일, flash/pro=유료, 기본: free)")

    args = parser.parse_args()

    if args.command == "scenes":
        cmd_scenes(args)


if __name__ == "__main__":
    main()
