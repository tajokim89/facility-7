import os
import shutil
from .config import COMFYUI_INPUT_DIR, PROJECT_ROOT

def prepare_ref_image(file_path):
    """
    Ensures the reference image exists in ComfyUI's input directory.
    Returns the filename only (which is what ComfyUI LoadImage nodes expect).
    """
    if not file_path:
        return None
        
    file_name = os.path.basename(file_path)
    target_path = os.path.join(COMFYUI_INPUT_DIR, file_name)
    
    # Try absolute path first
    if os.path.exists(file_path) and os.path.isfile(file_path):
        if not os.path.exists(target_path):
            print(f"Copying {file_path} -> {target_path}")
            shutil.copy2(file_path, target_path)
        return file_name
    
    # Try relative search paths
    local_search_paths = [
        PROJECT_ROOT, 
        os.path.join(PROJECT_ROOT, "comfyui"),
        os.path.join(PROJECT_ROOT, "comfyui/images/ref")
    ]
    
    for p in local_search_paths:
        local_path = os.path.join(p, file_path)
        if os.path.exists(local_path) and os.path.isfile(local_path):
            if not os.path.exists(target_path):
                print(f"Copying local {local_path} -> {target_path}")
                shutil.copy2(local_path, target_path)
            return file_name
            
    print(f"Warning: Reference image '{file_path}' not found.")
    return file_name
