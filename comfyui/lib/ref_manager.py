import os
import shutil
import glob
from .config import COMFYUI_INPUT_DIR, COMFYUI_OUTPUT_ROOT, PROJECT_ROOT, TEMP_DIR


def prepare_ref_image(file_path: str) -> str | None:
    """레퍼런스 이미지를 ComfyUI input 폴더로 복사. 파일명만 반환 (LoadImage 노드용)."""
    if not file_path:
        return None

    file_name = os.path.basename(file_path)
    target_path = os.path.join(COMFYUI_INPUT_DIR, file_name)

    # 절대경로 우선
    if os.path.isfile(file_path):
        if not os.path.exists(target_path):
            print(f"  Copy ref: {file_path} -> {target_path}")
            shutil.copy2(file_path, target_path)
        return file_name

    # 상대경로 탐색
    search_roots = [
        PROJECT_ROOT,
        os.path.join(PROJECT_ROOT, "comfyui"),
        os.path.join(PROJECT_ROOT, "comfyui", "images", "ref"),
    ]
    for root in search_roots:
        candidate = os.path.join(root, file_path)
        if os.path.isfile(candidate):
            if not os.path.exists(target_path):
                print(f"  Copy ref: {candidate} -> {target_path}")
                shutil.copy2(candidate, target_path)
            return file_name

    print(f"  Warning: ref image '{file_path}' not found locally (may already be in ComfyUI input).")
    return file_name


def copy_output_as_ref(local_path: str, alias_name: str) -> str | None:
    """생성된 이미지를 ComfyUI input에 복사 (체이닝용). alias_name 반환."""
    if not local_path or not os.path.isfile(local_path):
        return None
    dest = os.path.join(COMFYUI_INPUT_DIR, alias_name)
    shutil.copy2(local_path, dest)
    print(f"  Chain ref: {local_path} -> {dest}")
    return alias_name


def collect_output(filename_prefix: str, scene_id: str, dest_dir: str = TEMP_DIR) -> str | None:
    """ComfyUI output 에서 prefix 매칭 이미지를 dest_dir로 복사. 복사된 경로 반환."""
    os.makedirs(dest_dir, exist_ok=True)
    pattern = os.path.join(COMFYUI_OUTPUT_ROOT, f"{filename_prefix}*.png")
    files = glob.glob(pattern)
    if not files:
        # 재귀 탐색 fallback
        pattern_r = os.path.join(COMFYUI_OUTPUT_ROOT, "**", f"{filename_prefix}*.png")
        files = glob.glob(pattern_r, recursive=True)
    if not files:
        return None
    files.sort(key=os.path.getmtime, reverse=True)
    src = files[0]
    dest = os.path.join(dest_dir, f"{scene_id}_{os.path.basename(src)}")
    shutil.copy2(src, dest)
    return dest
