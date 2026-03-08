import json
import glob
import os
from .config import DEFAULT_WEIGHTS, PROMPT_DIR


def infer_scene_type(scene: dict) -> str:
    """v1 호환: scene_type 없으면 기존 필드에서 추론."""
    if scene.get("scene_type"):
        return scene["scene_type"]
    if scene.get("is_reference") or scene.get("id", "").startswith("REF_"):
        return "reference"
    if scene.get("composition_ref") or scene.get("use_outpaint"):
        return "character_scene"
    return "environment"


def normalize_weights(scene: dict, scene_type: str) -> tuple:
    """style_weight / composition_weight 반환. v1의 단일 weight 하위호환."""
    defaults = DEFAULT_WEIGHTS.get(scene_type, {"style": 0.4, "composition": 0.0})
    style_w = scene.get("style_weight", defaults["style"])
    comp_w = scene.get("composition_weight", defaults["composition"])
    # v1 호환: weight 하나만 있을 때 scene_type에 따라 분배
    if "weight" in scene and "style_weight" not in scene:
        if scene_type in ("character_scene", "character_closeup"):
            comp_w = scene["weight"]
        else:
            style_w = scene["weight"]
    return style_w, comp_w


def migrate_scene_v1_to_v2(scene: dict) -> dict:
    """v1 씬을 v2 스키마로 변환 (in-place). scene_type, style_weight 추가."""
    scene_type = infer_scene_type(scene)
    scene.setdefault("scene_type", scene_type)
    style_w, comp_w = normalize_weights(scene, scene_type)
    scene.setdefault("style_weight", style_w)
    scene.setdefault("composition_weight", comp_w)
    return scene


def validate_scene(scene: dict) -> dict:
    """필수 필드 확인 후 v2로 마이그레이션."""
    for field in ("id", "prompt"):
        if field not in scene:
            raise ValueError(f"Missing required field '{field}' in scene {scene.get('id', 'unknown')}")
    return migrate_scene_v1_to_v2(scene)


def load_prompts(file_path: str) -> list:
    """JSON 파일에서 씬 목록 로드."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"{file_path} is not a JSON list.")
    return [validate_scene(s) for s in data if isinstance(s, dict)]


def load_all_scenes(prompt_dir: str = PROMPT_DIR, filter_ids: list = None,
                    exclude_refs: bool = True, exclude_chain: bool = False) -> list:
    """prompt/ 디렉토리에서 씬 전체 로드."""
    scenes = []
    for path in glob.glob(os.path.join(prompt_dir, "*.json")):
        if path.endswith("_refs.json"):
            continue
        source = os.path.splitext(os.path.basename(path))[0]
        try:
            items = load_prompts(path)
            for s in items:
                if exclude_refs and s.get("scene_type") == "reference":
                    continue
                if exclude_chain and s.get("chain_from"):
                    continue
                s.setdefault("_source", source)
                scenes.append(s)
        except Exception as e:
            print(f"Warning: {path}: {e}")
    if filter_ids:
        scenes = [s for s in scenes if s.get("id") in filter_ids]
    return scenes


def load_all_refs(prompt_dir: str = PROMPT_DIR) -> list:
    """*_refs.json 파일에서 레퍼런스 항목만 로드."""
    refs = []
    for path in glob.glob(os.path.join(prompt_dir, "*_refs.json")):
        source = os.path.splitext(os.path.basename(path))[0]
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            for item in data:
                if isinstance(item, dict) and item.get("is_reference"):
                    item.setdefault("scene_type", "reference")
                    item.setdefault("_source", source)
                    refs.append(item)
        except Exception as e:
            print(f"Warning: {path}: {e}")
    return refs
