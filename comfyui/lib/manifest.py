"""
manifest.py — 생성 이력 추적

comfyui/manifest.json에 씬별 생성/검수 상태를 기록.
구조:
{
  "S03": {
    "variants": [
      {"idx": 0, "seed": 12345, "path": "comfyui/images/temp/...", "workflow": "sdxl_outpaint", "status": "pending"},
      ...
    ]
  }
}
"""
import json
import os
import shutil
from .config import MANIFEST_FILE, COMP_DIR


def _load() -> dict:
    if os.path.exists(MANIFEST_FILE):
        with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save(data: dict) -> None:
    os.makedirs(os.path.dirname(MANIFEST_FILE), exist_ok=True)
    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def record_generation(scene_id: str, seed: int, path: str,
                      workflow: str, variant_idx: int = 0) -> None:
    """생성 기록 추가 (status=pending)."""
    data = _load()
    entry = data.setdefault(scene_id, {"variants": []})
    entry["variants"].append({
        "idx":      variant_idx,
        "seed":     seed,
        "path":     path,
        "workflow": workflow,
        "status":   "pending",
    })
    _save(data)


def accept_variant(scene_id: str, variant_idx: int) -> str | None:
    """variant 승인 → comp/ 에 복사, status=accepted. 복사 경로 반환."""
    data = _load()
    entry = data.get(scene_id, {})
    for v in entry.get("variants", []):
        if v["idx"] == variant_idx:
            src = v["path"]
            if src and os.path.isfile(src):
                os.makedirs(COMP_DIR, exist_ok=True)
                dest = os.path.join(COMP_DIR, f"{scene_id}.png")
                shutil.copy2(src, dest)
                v["status"] = "accepted"
                v["comp_path"] = dest
                _save(data)
                print(f"Accepted: {dest}")
                return dest
            else:
                print(f"Warning: file not found: {src}")
                return None
    print(f"Warning: variant {variant_idx} not found for {scene_id}")
    return None


def reject_all(scene_id: str) -> None:
    """모든 variant 거부, status=rejected."""
    data = _load()
    entry = data.get(scene_id, {})
    for v in entry.get("variants", []):
        v["status"] = "rejected"
    _save(data)
    print(f"Rejected all variants for {scene_id}")


def get_pending() -> list:
    """미검수(status=pending) 씬 정보 목록 반환."""
    data = _load()
    pending = []
    for scene_id, entry in data.items():
        for v in entry.get("variants", []):
            if v.get("status") == "pending":
                pending.append({"scene_id": scene_id, **v})
    return pending


def get_status(scene_id: str) -> list:
    """특정 씬의 모든 variant 상태 반환."""
    data = _load()
    return data.get(scene_id, {}).get("variants", [])
