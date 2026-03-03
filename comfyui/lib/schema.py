import json
from .config import DEFAULT_STYLE_WEIGHT, DEFAULT_COMP_WEIGHT

def migrate_scene_v1_to_v2(scene):
    """Migrates a v1 scene (without scene_type) to v2."""
    if "scene_type" in scene:
        return scene
        
    # Heuristic migration
    composition_ref = scene.get("composition_ref", "")
    use_outpaint = scene.get("use_outpaint", False)
    is_ref = scene.get("is_reference", False) or scene.get("id", "").startswith("REF_")
    
    if is_ref:
        scene["scene_type"] = "reference"
    elif use_outpaint or composition_ref:
        scene["scene_type"] = "character_scene"
    else:
        scene["scene_type"] = "environment"
        
    # Split weights if needed
    weight = scene.get("weight", 0.8)
    if "style_weight" not in scene:
        if scene["scene_type"] == "character_scene":
            scene["style_weight"] = 0.3
            scene["composition_weight"] = weight
        else:
            scene["style_weight"] = weight
            scene["composition_weight"] = 0.0
            
    return scene

def validate_scene(scene):
    """Ensures basic fields exist."""
    required = ["id", "prompt"]
    for r in required:
        if r not in scene:
            raise ValueError(f"Missing required field '{r}' in scene {scene.get('id', 'unknown')}")
    return migrate_scene_v1_to_v2(scene)

def load_prompts(file_path):
    """Loads a JSON file containing a list of scenes."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        if not isinstance(data, list):
            raise ValueError(f"{file_path} is not a JSON list.")
        return [validate_scene(s) for s in data if isinstance(s, dict)]
