import os

# ComfyUI Connection
COMFYUI_URL = "http://127.0.0.1:8188"
COMFYUI_WS_URL = "ws://127.0.0.1:8188/ws"

# Local ComfyUI Directories (Adjust if different)
COMFYUI_INPUT_DIR = "C:/comfyui/ComfyUI/input"
COMFYUI_OUTPUT_ROOT = "C:/comfyui/ComfyUI/output"

# Project Directories
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
COMFYUI_DIR = os.path.join(PROJECT_ROOT, "comfyui")
PROMPT_DIR = os.path.join(COMFYUI_DIR, "prompt")
WORKFLOW_DIR = os.path.join(COMFYUI_DIR, "workflow")
IMAGES_DIR = os.path.join(COMFYUI_DIR, "images")
TEMP_DIR = os.path.join(IMAGES_DIR, "temp")
COMP_DIR = os.path.join(IMAGES_DIR, "comp")
REF_DIR = os.path.join(IMAGES_DIR, "ref")
MANIFEST_FILE = os.path.join(COMFYUI_DIR, "manifest.json")

# scene_type → workflow 파일 전체 경로
WORKFLOW_MAP = {
    "environment":       os.path.join(WORKFLOW_DIR, "sdxl_scene.json"),
    "character_scene":   os.path.join(WORKFLOW_DIR, "sdxl_outpaint.json"),
    "character_closeup": os.path.join(WORKFLOW_DIR, "sdxl_character_closeup.json"),
    "macro":             os.path.join(WORKFLOW_DIR, "sdxl_scene.json"),
    "special":           os.path.join(WORKFLOW_DIR, "sdxl_scene.json"),
    "reference":         os.path.join(WORKFLOW_DIR, "sd15_reference.json"),
}

# scene_type별 기본 IP-Adapter weight
DEFAULT_WEIGHTS = {
    "environment":       {"style": 0.4, "composition": 0.0},
    "character_scene":   {"style": 0.3, "composition": 0.8},
    "macro":             {"style": 0.3, "composition": 0.0},
    "character_closeup": {"style": 0.2, "composition": 0.9},
    "special":           {"style": 0.3, "composition": 0.0},
    "reference":         {"style": 0.0, "composition": 0.0},
}

# Image Settings
WIDTH = 1920
HEIGHT = 1080
DEFAULT_OUT_DIR = "facility-7"

# 하위호환용 alias
DEFAULT_STYLE_WEIGHT = 0.4
DEFAULT_COMP_WEIGHT = 0.8
