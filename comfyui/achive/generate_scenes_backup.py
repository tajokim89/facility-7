import json
import urllib.request
import urllib.parse
import os

# ComfyUI API Address
COMFYUI_URL = "http://127.0.0.1:8188"
WORKFLOW_FILE = "comfyui/emotion.json"

# Stable High Resolution (FHD)
WIDTH = 1920
HEIGHT = 1080

# Aesthetic: "Clinical Horror" - Extremely clean, minimalist, but uncanny and terrifying.
NEGATIVE_PROMPT = "(low quality, worst quality:1.4), (bad anatomy), (deformed), (text, watermark, logo), (bright colors, cheerful), (cartoon, 2d, anime:1.2), blurry, messy, distorted, extra limbs, extra fingers, unrealistic, duplicate, morphed, tiling, border, frame, split screen, grid."

# 36 Scenes based on every node in chapter1.ts
SCENES = [
    # ACT 1: ARRIVAL
    {"id": "S01", "seed": 101, "prompt": "POV, a sleek futuristic tablet booting up, glowing screen showing 'Observer Registered: Sector 7', sterile dark room background, minimalist aesthetic, sharp focus, uncanny silence."},
    {"id": "S02", "seed": 102, "prompt": "POV inside a descending elevator, metallic walls, floor indicator flickering B7... B8... B9, lighting getting dimmer and colder, industrial minimalism, claustrophobic atmosphere."},
    {"id": "S03", "seed": 103, "prompt": "A tall woman 'Han Se-jin' in a crisp white clinical uniform standing in a cold hallway, expressionless face, perfect posture, pale skin, blue-tinted fluorescent lighting, scary clean environment."},
    {"id": "S04", "seed": 104, "prompt": "Wide shot of a sterile corridor leading to Sector A, B, and C. Perfectly white walls, high-tech glass doors, clinical horror aesthetic, too clean to be human."},
    {"id": "S05", "seed": 105, "prompt": "Close-up of Han Se-jin's face, uncomfortably neutral expression, dead eyes, soft shadows, cold clinical light hitting her face, unnerving stillness."},
    {"id": "S06", "seed": 106, "prompt": "A row of pristine white lockers in a locker room, some lockers have nameplates removed leaving dark rectangular stains, 'Observer #041 - Processed' label visible on one, eerie silence."},
    {"id": "S07", "seed": 107, "prompt": "Masterpiece, Sector A, a vast empty white room, clinical horror, a single high-tech chair in the center with transparent 'Canal' tubes connected to it, bright cold overhead lights."},
    {"id": "S08", "seed": 108, "prompt": "Hand holding a tablet, screen showing checklists and status monitors of a subject, sterile laboratory blurred in the background, blueish tint."},

    # ACT 2: FIRST TASK
    {"id": "S09", "seed": 109, "prompt": "A middle-aged man (Subject #117) with a hollow, expressionless face sitting in the extraction chair, transparent tubes connected to his neck and arms, sterile white lab."},
    {"id": "S10", "seed": 110, "prompt": "Close-up of glass tubes, a viscous faint gray liquid 'Boredom' slowly flowing through, tiny bubbles, clinical detail, cold macro photography."},
    {"id": "S11", "seed": 111, "prompt": "Subject #117 looking directly at the camera with empty eyes, mouth slightly open as if to whisper, uncomfortably close shot, clinical white background."},
    {"id": "S11a", "seed": 112, "prompt": "Subject #117 looking away, the gray liquid in the tube turning slightly darker, melancholy and empty atmosphere, sterile environment."},
    {"id": "S11b", "seed": 113, "prompt": "Tablet screen showing text: 'Subject Contact Attempt - Observer Response: Normal', cold blue light reflecting on the screen, laboratory background."},
    {"id": "S12", "seed": 114, "prompt": "Subject #117 walking out of the room, his gait is mechanical and hollow, back view, empty white corridor, long shadows on the floor."},
    {"id": "S13", "seed": 115, "prompt": "Han Se-jin standing in the corner of the lab, her shadow stretching long on the white wall, she is watching the observer with a faint, unreadable smile."},
    {"id": "S14", "seed": 116, "prompt": "A young woman (Subject #203) sitting in the chair, eyes wide with pure terror, gripping the armrests, sterile white environment contrasting with her fear."},
    {"id": "S15", "seed": 117, "prompt": "Close-up of the tubes, the liquid turning into a boiling, bubbling dark red 'Hatred', red emergency lights reflecting on the glass, intense and scary."},
    {"id": "S15a", "seed": 118, "prompt": "Security team in white hazmat suits entering the sterile room, grabbing the subject, clinical and detached violence, motion blur."},
    {"id": "S15b", "seed": 119, "prompt": "The young woman's face after extraction, eyes completely void of life, greyish skin, the red liquid in the tubes has calmed down to a dark still pond."},

    # ACT 3: LUNCH
    {"id": "S17", "seed": 120, "prompt": "Liminal space, empty breakroom, a single vending machine with cold blue light, white plastic tables, several observers sitting far apart, all with the exact same expressionless face."},
    {"id": "S18", "seed": 121, "prompt": "A man 'Lee Jun-hyuk' sitting across the table, his eyes are bloodshot but his face is smiling, uncomfortably wide smile, clinical breakroom background."},
    {"id": "S18a", "seed": 122, "prompt": "Lee Jun-hyuk's eyes narrowing, a hint of pity in his cold expression, the cold blue light of the vending machine reflecting in his pupils."},
    {"id": "S18b", "seed": 123, "prompt": "Close-up of a paper cup on a white table, filled with a viscous gray liquid that looks like the Boredom extract, eerie and disgusting."},
    {"id": "S19", "seed": 124, "prompt": "POV, looking down at the gray liquid in the cup, reflections of the fluorescent ceiling lights in the murky gray surface."},
    {"id": "S20", "seed": 125, "prompt": "A public address speaker on a white wall, shadows around it, the hallway beyond the breakroom door is unnaturally dark."},

    # ACT 4: AFTERNOON
    {"id": "S21", "seed": 126, "prompt": "Entrance to Sector B, the lighting is warmer but still artificial, silver motifs on the walls, high-tech elegance, Han Se-jin leading the way."},
    {"id": "S22", "seed": 127, "prompt": "Sector B extraction lab, beautiful shimmering silver liquid 'Longing' flowing through crystalline pipes, ethereal glow, micro-particles, melancholic beauty in a sterile cage."},
    {"id": "S23", "seed": 128, "prompt": "A long, white corridor with signs for Sector F and G, the G sign is slightly rusted or glitching, flickering lights at the far end."},
    {"id": "S24", "seed": 129, "prompt": "A heavy metal door with 'Sector G - No Admittance' sign, a small window showing only mirrors inside, scary and mysterious."},
    {"id": "S24b", "seed": 130, "prompt": "Inside Sector G Mirror Room, infinite reflections of the empty room, distorted green light, a blurry figure in one reflection that doesn't match the viewer's position."},
    {"id": "S25", "seed": 131, "prompt": "An old man (Subject #089) sitting in the chair, a soft yellow liquid 'Relief' flowing through the tubes, he looks uncomfortably peaceful, like a doll."},
    {"id": "S26_check", "seed": 132, "prompt": "Tablet screen showing a warning: 'Abnormal Emotion Change Detected', the background of the screen is a dark, glitching red."},
    {"id": "S26a", "seed": 133, "prompt": "Close-up of the tablet screen, scrolling data with 'Access Denied' and 'Observer Degradation' text, eerie blue glow on the observer's hands."},
    {"id": "S27", "seed": 134, "prompt": "Han Se-jin saying goodbye at the elevator, her face is half-shadowed, the elevator doors are closing, her eyes are the last thing visible."},

    # ACT 5: ENDINGS
    {"id": "S28", "seed": 135, "prompt": "Inside the elevator going up, the reflection of the observer in the metallic door, the reflection's face is slightly different from the observer's actual expression."},
    {"id": "S29", "seed": 136, "prompt": "The elevator door opening to the 지상(Eden) city, a perfectly bright, white, and clean city with people having forced smiles, dystopian perfection."},
    {"id": "ending_normal", "seed": 137, "prompt": "The observer sitting at home in a minimalist apartment, staring at a TV showing only static, the tablet on the table shows 'Subject #042: Candidate'."},
    {"id": "ending_uneasy", "seed": 138, "prompt": "Looking into a dark bathroom mirror at night, the observer's face is starting to lose all emotion, gray tint to the skin, haunting atmosphere."},
    {"id": "ending_mirror", "seed": 139, "prompt": "Close-up of a cracked mirror, reflection of the observer with 'Subject #042' text burned into the forehead, glitch effects, pure psychological horror."},
    {"id": "ending_empty", "seed": 140, "prompt": "POV, sitting in the extraction chair in Sector A, Han Se-jin standing over with a needle, the world fading to white, total emptiness."}
]

def queue_prompt(prompt_workflow):
    p = {"prompt": prompt_workflow}
    data = json.dumps(p).encode('utf-8')
    req = urllib.request.Request(f"{COMFYUI_URL}/prompt", data=data)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def main():
    if not os.path.exists(WORKFLOW_FILE):
        print(f"Error: {WORKFLOW_FILE} not found.")
        return

    with open(WORKFLOW_FILE, 'r', encoding='utf-8') as f:
        workflow = json.load(f)

    print(f"Queueing ALL {len(SCENES)} nodes from Chapter 1 (FHD: {WIDTH}x{HEIGHT})...")
    print("Aesthetic: Clinical, Minimalist, Uncanny Horror.")

    for i, scene in enumerate(SCENES):
        # Update Resolution (#8)
        workflow["8"]["inputs"]["width"] = WIDTH
        workflow["8"]["inputs"]["height"] = HEIGHT

        # Update Positive Prompt (#10)
        workflow["10"]["inputs"]["text"] = f"Masterpiece, 8k, clinical horror, {scene['prompt']}"
        
        # Update Negative Prompt (#9)
        workflow["9"]["inputs"]["text"] = NEGATIVE_PROMPT
        
        # Update Filename Prefix (#12)
        workflow["12"]["inputs"]["filename_prefix"] = f"RE_CH1_{scene['id']}"
        
        # Use FIXED SEED (#6)
        workflow["6"]["inputs"]["seed"] = scene["seed"]

        try:
            response = queue_prompt(workflow)
            print(f"[{i+1}/{len(SCENES)}] Queued Node {scene['id']} (Seed: {scene['seed']})")
        except Exception as e:
            print(f"Failed to queue {scene['id']}: {e}")

    print("\nDone! All 36 nodes are now in the ComfyUI queue.")

if __name__ == "__main__":
    main()
