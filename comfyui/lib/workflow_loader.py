import json
import copy
from .config import WORKFLOW_MAP, DEFAULT_WEIGHTS
from .ref_manager import prepare_ref_image

# scene_type별 기본 negative prompt
_NEG_BASE = "text, watermark, blurry, low quality, distorted, extra limbs, bad anatomy"
_NEG_CHAR  = f"{_NEG_BASE}, (multiple subjects, duplicate:1.4)"

NEG_DEFAULTS = {
    "environment":       _NEG_BASE,
    "macro":             _NEG_BASE,
    "special":           _NEG_BASE,
    "character_scene":   _NEG_CHAR,
    "character_closeup": _NEG_CHAR,
    "reference":         "(low quality, worst quality:1.4), text, watermark, blurry, distorted, extra limbs, bad anatomy, (cartoon, anime, 3d, render:1.3)",
}


def load_workflow(scene_type: str) -> dict:
    """scene_type에 맞는 워크플로우 JSON을 로드해 깊은 복사본 반환."""
    path = WORKFLOW_MAP.get(scene_type)
    if not path:
        raise ValueError(f"Unknown scene_type: {scene_type}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def inject_params(workflow: dict, scene: dict, seed: int,
                  style_weight: float, comp_weight: float,
                  ref_file: str | None, prefix: str) -> dict:
    """
    워크플로우 노드에 파라미터 주입. 워크플로우 원본을 수정하지 않도록
    반드시 copy.deepcopy(workflow) 된 객체를 넘길 것.

    노드 규칙 (sdxl_scene / sdxl_outpaint / sdxl_character_closeup 공통):
      10 - positive prompt (CLIPTextEncode)
       9 - negative prompt (CLIPTextEncode)
      14 - LoadImage (style ref)
      16 - LoadImage (composition ref, dual-ref 워크플로우만)
      15 - IPAdapter weight
       6 - KSampler seed
      20 - 2nd KSampler seed (outpaint)
      12 - SaveImage filename_prefix

    sd15_reference 노드 규칙:
       5 - positive prompt
       6 - negative prompt
       1 - seed
       3 - filename_prefix
    """
    scene_type = scene.get("scene_type", "environment")
    is_ref_wf = "5" in workflow and "6" in workflow and "3" in workflow and "10" not in workflow

    if is_ref_wf:
        # sd15_reference 워크플로우
        neg_default = NEG_DEFAULTS.get("reference", "")
        workflow["5"]["inputs"]["text"] = scene.get("prompt", "")
        workflow["6"]["inputs"]["text"] = scene.get("negative_prompt", neg_default)
        workflow["1"]["inputs"]["seed"]  = seed
        workflow["3"]["inputs"]["filename_prefix"] = prefix
        return workflow

    # SDXL 계열 워크플로우
    neg_default = NEG_DEFAULTS.get(scene_type, _NEG_BASE)
    scene_neg   = scene.get("negative_prompt", "")
    final_neg   = f"{neg_default}, {scene_neg}" if scene_neg else neg_default

    if "10" in workflow:
        workflow["10"]["inputs"]["text"] = scene.get("prompt", "")
    if "9" in workflow:
        workflow["9"]["inputs"]["text"] = final_neg

    # style ref
    if "14" in workflow and ref_file:
        workflow["14"]["inputs"]["image"] = ref_file

    # composition ref (dual-ref 워크플로우: 노드 16 존재)
    if "16" in workflow and scene_type in ("character_scene", "character_closeup"):
        comp_ref_path = scene.get("composition_ref")
        if comp_ref_path:
            comp_file = prepare_ref_image(comp_ref_path)
            workflow["16"]["inputs"]["image"] = comp_file or ref_file
        else:
            # composition_ref 없으면 style ref와 동일 이미지 (효과 유지)
            workflow["16"]["inputs"]["image"] = ref_file

    # IP-Adapter weight
    if "15" in workflow:
        # dual-ref면 composition weight, 단일이면 style weight 사용
        effective = comp_weight if scene_type in ("character_scene", "character_closeup") else style_weight
        workflow["15"]["inputs"]["weight"] = effective

    # Seed
    if "6" in workflow:
        workflow["6"]["inputs"]["seed"] = seed
    if "20" in workflow:
        workflow["20"]["inputs"]["seed"] = seed + 1

    # Output prefix
    if "12" in workflow:
        workflow["12"]["inputs"]["filename_prefix"] = prefix

    return workflow
