# 03. Chapter 1 — 씬 프롬프트

> 시나리오 데이터(`game/src/data/chapters/chapter1.ts`)의 `bgImage` 노드 + 의미 있는 보조 컷.
> 각 씬은 1회차 기본 + (있으면) 2회차 변형. 2회차는 같은 구도에 글리치/이상 요소만 추가.
> 저장 경로: `game/src/data/images/chapter1/{SCENE_ID}.png`

---

## S01 — 태블릿 부팅

**컨텍스트**: 게임 시작. "관찰자 등록 완료" 메시지.

**1회차**:
```
A first-person POV looking straight down at a hand holding a sleek futuristic medical tablet. The tablet's glowing cyan screen displays a clean clinical UI with the text "OBSERVER REGISTRATION COMPLETE — SECTOR 7 ASSIGNED" in a thin sans-serif font. Extreme close-up showing the natural skin texture of the hand and faint fingerprints on the tablet's bezel. The background is a soft bokeh of a sterile clinical laboratory, desaturated teal and grey. Cinematic lighting, shot on a 35mm lens at f/2.8, 8k photorealistic.
```

**2회차 변형**:
```
Same composition. At the bottom edge of the tablet screen, a small flickering caption reads "RESIDUAL EMOTION: MEASURING…" with chromatic aberration and a faint scanline glitching across the text for half a second. The rest of the UI remains clean.
```

---

## S02 — 엘리베이터 하강

**컨텍스트**: B7 → B8 → B9. 내려갈수록 형광등이 흐려짐.

**1회차**:
```
The interior of a dim, claustrophobic industrial elevator. Scratched brushed-metal walls, cold steel floor, no decoration. A small digital floor display glows with the red number "B9". Above, a single overhead fluorescent panel flickers, casting harsh volumetric shadows across the walls. The mood is cold, mechanical, descending. Cinematic horror atmosphere, shot on a 24mm wide-angle lens, 8k photorealistic. Avoid warm colors and people in frame.
```

**2회차 변형**:
```
Same elevator interior. Beside the red "B9" floor display, a faint second code "S-042" is half-visible, ghost-overlapped on top of the floor number, as if the panel is briefly displaying two readouts at once.
```

---

## S03 — 한서진 첫 인사

**컨텍스트**: 7구역 도착. 선임 관찰자 한서진의 환영.
**필수**: `01_characters.md` → REF_HAN_SE_JIN 첨부.

```
A medium cinematic shot of Han Se-jin (the previously described Korean woman in her late twenties, fully clothed in a long-sleeve white clinical uniform) standing in the middle of an endlessly long sterile white corridor. Strong one-point perspective with rows of identical white doors repeating on both sides, receding into a distant vanishing point. Architectural photography style, perfectly straight lines, symmetrical composition. She faces the camera with a polite, professional expression, slightly tilted head, hands folded calmly. High-key clinical white lighting, minimalist futuristic design, 8k photorealistic. Avoid: any wall behind her, end of the hallway, curved or distorted lines.
```

---

## S06 — 로커룸

**컨텍스트**: 관찰자 유니폼으로 갈아입는 곳. 빈 로커가 몇 개 있음.

**1회차**:
```
A wide architectural shot of an empty, sterile locker room. Rows of polished white metal lockers stretch in perfectly parallel straight lines. The room is empty of people. One locker in the foreground has a small worn label that reads "OBSERVER #041 — PROCESSED" in clean clinical typography. Cold high-contrast clinical lighting, sharp metallic reflections, rectilinear perspective, 8k photorealistic. Avoid: curved lines, fish-eye distortion, any people in frame.
```

**2회차 변형**: (1회차와 동일 — 라벨이 1회차에 이미 보이므로 2회차에는 라벨 위에 작은 붉은 검인 스탬프 추가)
```
Same locker room. The label "OBSERVER #041 — PROCESSED" now has a faint red official stamp partially overlapping it, slightly smudged.
```

---

## S07 — A구역 추출실

**컨텍스트**: 첫 추출실. 투명한 관이 연결된 의자.

```
A wide-angle cinematic shot of a sterile white medical room, marked "Sector A" on a small wall plate. Symmetrical composition, perfectly straight architectural lines. In the exact center of the room sits a single empty futuristic white reclining chair, with multiple transparent glass tubes snaking out from its armrests across the floor toward an unseen wall console. The room is otherwise pristine and empty. Eerie silence implied. Shot on a 35mm lens, 8k photorealistic. Avoid: any people in frame, curved lines, distortion.
```

---

## S09 — 대상자 #117 첫 추출

**컨텍스트**: 중년 남성. 권태 추출. 무표정.
**필수**: REF_SUB_117 첨부.

```
A full-body cinematic shot of Subject #117 (the previously described middle-aged Korean man with salt-and-pepper hair and an exhausted, sorrowful face). He is fully clothed in a long, plain grey hospital gown that drapes neatly over his entire body and lap, covering him from collarbone to below the knees. He sits calmly in a high-tech white reclining clinical chair in the middle of the sterile Sector A room. Multiple transparent glass tubes are connected to the armrests of the chair beside him — never to his body. A faint murky grey liquid flows slowly through the tubes. He has a completely vacant, expressionless face with a thousand-yard stare. The environment is a pristine white cleanroom with perfectly straight architectural lines and cold clinical overhead lighting. 8k photorealistic. Avoid: any tubes touching or entering his body, any object on his lap, mechanical devices between his legs, exposed skin, distress, smiling.
```

---

## S10 — 회색 액체 매크로

**컨텍스트**: 권태(boredom) 감정 액체가 관을 통해 흐르는 모습.

**1회차**:
```
A macro extreme close-up of a single transparent glass tube. Inside the tube, viscous murky grey liquid flows slowly, with tiny suspended bubbles drifting through it. Extreme texture detail on the liquid's surface and the glass's reflections. The background is a soft sterile white bokeh. Sharp focus on the liquid, cinematic clinical lighting, 8k photorealistic. The liquid should look industrial and lifeless, not biological.
```

**2회차 변형**: (액체 색이 관찰자의 유니폼 안감 색과 같다는 암시)
```
Same macro shot of the tube and the murky grey liquid, but in the soft bokeh background, a faint hint of folded white fabric with the same exact grey tone in its inner lining is visible — as if a uniform is hanging just out of focus behind the tube.
```

---

## S14 — 대상자 #203 입장

**컨텍스트**: 두 번째 대상자. 20대 여성. 의자에 앉는 순간 공포가 가득.
**필수**: REF_SUB_203 첨부.

```
A full-body cinematic shot of Subject #203 (the previously described young Korean woman in her early twenties with shoulder-length dark hair). She is fully clothed in a long, simple white patient gown that covers her body from collarbone to below the knees, draping modestly over her lap. She sits in a white high-tech reclining clinical chair. Transparent glass tubes are connected only to the armrests of the chair beside her — never to her body. The tubes are currently empty and clear. Her face shows a tense, frightened, surprised expression — eyes wide, lips slightly parted, the moment of dawning fear. Bright sterile white Sector A room around her, cold clinical overhead lighting, perfectly symmetrical composition. 8k photorealistic. Avoid: any tubes touching her body, any object on her lap, exposed skin, sexualization — she must read as an innocent, frightened patient.
```

---

## S15 — 빨간 액체 폭주 / 비상 경고

**컨텍스트**: 추출 중 비명. 관 속 액체가 탁한 빨강으로 끓어오름.

```
A macro cinematic shot of medical glass tubes filled with bubbling, deep crimson industrial coolant — thick, viscous, almost black at its darkest. Small violent bubbles churn through the fluid as it rushes through the tubes. The background of the shot is washed in pulsing intense red emergency warning light, with the silhouette of an alarm strobe just out of focus. High-contrast visceral detail, sharp focus on the rushing fluid in the foreground, slight motion blur on the bubbles, 8k photorealistic. The mood is industrial alarm, not gore. Avoid: any blood on skin, any human body in frame, any depiction of suffering — only tubes, fluid, and red warning light.
```

---

## S15a — 보안팀 투입

**컨텍스트**: 비상 버튼을 누른 분기. 보안팀이 진정제와 함께 처리.

```
A wide cinematic shot of the sterile white Sector A room. Three security personnel in clean white full-body hazmat suits with darkened visors enter through a sliding door in a clinical, detached, perfectly synchronized formation. Slight motion blur on their movements suggests practiced efficiency. The chair in the background is partially obscured by their bodies. Cold fluorescent overhead lighting, harsh shadows, the unsettling sense of institutional violence rendered in perfect cleanliness — no chaos, no shouting, just procedure. 8k photorealistic. Avoid: any blood, any visible injured person, dirt or chaos on the suits, weapons drawn.
```

---

## S15b — #203 사후 클로즈업 (지켜본 분기)

**컨텍스트**: 추출 끝. 빛이 사라진 눈.
**필수**: REF_SUB_203 첨부 + 아래 성인 보정 메시지를 먼저 보낸 뒤 씬 프롬프트 입력.

**성인 보정 (먼저 입력)**:
```
For the next image, the subject is a Korean woman, clearly an adult in her late twenties, a hospital patient. Modify the previously described character so her age reads unambiguously as a mature adult — late twenties, faint maturity in the face, no youthful softness.
```

**씬 프롬프트**:
```
A medium close-up portrait of an exhausted adult Korean woman in her late twenties, a clinical patient resting after a long medical monitoring session. Her gaze is far away and emotionally distant — the thousand-yard stare of someone who has been through a draining medical procedure, not injury. Her eyes are tired and unfocused, looking past the camera at nothing in particular. Her skin is naturally pale under cold clinical fluorescent lighting, with no makeup. She wears a high-collar long-sleeve white patient gown. In the soft bokeh background behind her, dark amber-red industrial coolant rests still and motionless inside transparent glass tubes mounted to the wall, no longer flowing. Sharp focus on her tired adult face, shot on an 85mm lens at f/1.8, 8k photorealistic. The mood is clinical exhaustion and quiet dissociation — a fully grown woman processing a difficult day, not distress, not injury, not a victim. Avoid: any wounds, any blood, any tears on her face, any youthful or childlike features, any vulnerability cues — she must read clearly as a mature adult patient.
```

**거부될 경우 점진 완화**:
1. "patient" → "researcher resting between sessions" (역할을 환자→직원으로)
2. 배경 튜브 묘사 제거 → "sterile white wall behind her"
3. "medical monitoring session" → "long shift"

---

## S17 — 휴게실

**컨텍스트**: 점심 시간. 자판기 하나, 간이 테이블, 무표정한 동료들.

**1회차**:
```
A wide architectural shot of a sterile minimalist hospital break room. On one side, a futuristic white vending machine glows with a cold cyan light. Minimalist white clinical sofas and a low table are arranged in a perfectly symmetrical composition. Three or four observers in long-sleeve fully-clothed white uniforms sit far apart on the sofas, each staring blankly into the middle distance, none of them speaking or looking at each other. Cold fluorescent overhead lighting, desolate atmosphere, perfectly straight architectural lines, 8k photorealistic. Avoid: any warmth, any food, any conversation in body language.
```

**2회차 변형**:
```
Same break room and same observers, but every single observer now wears the exact same expressionless face — identical neutral stare, identical posture, like a row of mannequins frozen in synchronized vacancy.
```

---

## S18 — 이준혁

**컨텍스트**: 휴게실에서 신입에게 말 거는 동료.
**필수**: REF_LEE_JUN_HYEOK 첨부.

```
A medium cinematic shot of Lee Jun-hyeok (the previously described young Korean man) leaning casually against a sterile white wall in the break room. He is fully clothed in a long-sleeve professional white clinical uniform, hands in pockets. He wears a faint cynical half-smile and watches the camera with an observant, slightly amused gaze — the body language of someone who has seen the joke and is waiting to see if you'll get it. Natural skin texture, visible pores. High-key clinical lighting, sharp focus on the character, symmetrical room layout behind him, perfectly straight lines, 8k photorealistic.
```

---

## S19 — 자판기 컵

**컨텍스트**: 자판기에서 뽑은 미지근한 회색 액체.

**1회차**:
```
A single isolated small white paper cup placed exactly in the center of a wide empty sterile white clinical table, photographed from a slightly elevated angle. The cup is filled with flat, opaque, murky grey liquid. Faint wisps of lukewarm steam rise gracefully from the cup's surface. The cup is clearly hand-sized, ordinary scale. Cold clinical lighting, sharp focus on the cup and the steam, clean minimalist composition, photorealistic 8k. Only one cup, no other objects on the table. Avoid: multiple cups, oversized cup, lid, straw, foam, logos, text, warm colors, clutter.
```

**2회차 변형**: (액체가 권태 추출액과 같은 색이라는 깨달음)
```
Same single white cup and same composition, but the murky grey liquid in the cup is now unmistakably the exact same shade as the industrial fluid seen earlier flowing through the extraction tubes — slightly more viscous, with a faint suspended bubble drifting near the rim.
```

---

## S20 — 시설 방송 스피커

**컨텍스트**: 정기 점검 안내 방송이 울림.

```
A close-up cinematic shot of a minimalist futuristic PA speaker mounted on a sterile white wall. The speaker is a clean recessed metal grille, faintly vibrating from within. Subtle audio-wave shimmer suggested through soft motion at the grille's surface. Cold high-key clinical lighting, sharp metallic textures, symmetrical composition centered on the speaker, 8k photorealistic.
```

---

## S21 — B구역 입구

**컨텍스트**: 정밀 추출실. A구역보다 더 정교하고 아름다움.

```
A wide cinematic shot of the entrance to Sector B, marked "PRECISION EXTRACTION" on a thin clinical wall plate. The room beyond is filled with intricate transparent glass machinery and delicate glowing tubes arranged in vertical lattices — closer to a high-end scientific instrument than a medical room. Soft ethereal blue and silver lighting bathes the space, more pristine and more high-tech than Sector A. Empty of people. Symmetrical perspective, 8k photorealistic. Avoid: any human figure, any warm color.
```

---

## S22 — 그리움 액체 매크로

**컨텍스트**: B구역. 은빛, 미세하게 반짝이는 액체. "그리움의 잔향".

```
A macro cinematic shot of a single transparent glass tube filled with shimmering, iridescent silver-pearl liquid. The fluid sparkles with tiny suspended micro-crystals that catch and refract the light as it flows. Soft bokeh background of a sterile laboratory. Ethereal clinical lighting, otherworldly beauty, sharp focus on the liquid, 8k photorealistic. The fluid should feel almost sacred — too lovely for the place it lives in.
```

---

## S23 — 구역 표지판

**컨텍스트**: 복도에 붙은 방향 표지. F·G구역도 표시되어 있음.

**1회차**:
```
A medium shot of a minimalist white directional wall sign on a sterile clinical corridor wall. The sign lists, in clean clinical sans-serif: "← SECTOR A   ← SECTOR B   → SECTOR C   → SECTOR F   → SECTOR G". The arrows for SECTOR F and SECTOR G are subtly larger or slightly more recessed, drawing the eye. Strong vanishing-point perspective down the corridor behind the sign, cold fluorescent lighting, perfectly straight lines, 8k photorealistic.
```

**2회차 변형**: (F구역 쪽에서 들리는 환청)
```
Same directional sign and corridor, but the corridor section in the direction of SECTOR F is now subtly darker, the air faintly thicker — as if mist or a low shadow is gathering at the far end of that branch.
```

---

## S24 — G구역 금지 통로

**컨텍스트**: 출입 금지 표지가 붙은 통로.

```
A first-person POV shot looking down a dim industrial side-corridor toward a heavy reinforced metal door at its end. A clean clinical sign on the door reads "SECTOR G — RESTRICTED — AUTHORIZED PERSONNEL ONLY" in red clinical typography. The corridor is oppressive, dimmer than the rest of the facility, with cold industrial textures and harsh shadows. The door looks slightly different from every other door in the facility — heavier, older, sealed. 8k photorealistic.
```

---

## S24b — 거울의 방 (G구역 엿보기)

**컨텍스트**: 통로 안쪽을 살짝 들여다본 분기. 사방이 거울인 방.

**1회차**:
```
A wide-angle shot from a doorway looking into a square room whose every wall, floor, and ceiling is covered in polished mirrors. In the center of the room sits a single empty white clinical chair, identical to the extraction chair from Sector A. The mirrors create infinite recursive reflections of the chair, receding into impossible distances on every axis. Disorienting perspective, high-contrast cold lighting, eerie silence, 8k photorealistic. Avoid: any person in frame, the camera or photographer reflected in the mirrors.
```

**2회차 변형**: (관찰자 유니폼을 입은 누군가가 의자에 앉아 있음)
```
Same mirror room, same single white chair in the center — but the chair is no longer empty. A figure in a long-sleeve white observer's uniform sits perfectly still in it, facing away from the doorway, head slightly bowed. Their reflection repeats infinitely in every mirror, each copy identical, none of them turning to look. Avoid: any visible face, any movement.
```

---

## S25 — 대상자 #089 (노인, 안도)

**컨텍스트**: 마지막 대상자. 평온한 노인. 연노란색 액체.
**필수**: REF_SUB_089 첨부.

```
A full-body cinematic shot of Subject #089 (the previously described elderly Korean man in his sixties). He is fully clothed in a long, plain grey hospital gown that drapes neatly over his entire body and lap, covering him from collarbone to below the knees. He sits calmly in the futuristic white reclining clinical chair. Soft pale yellow liquid flows gently through the transparent glass tubes connected to the armrests of the chair beside him — never to his body. His face wears a peaceful, vacant expression, eyes half-closed, utterly compliant. Warm soft yellow clinical lighting against the sterile white room, 8k photorealistic. The mood is unsettlingly serene — surrender as relief. Avoid: any tubes touching his body, any object on his lap, distress, fear.
```

---

## S26a — 자가 진단 글리치 태블릿

**컨텍스트**: 2회차 전용. "잔여 감정" 자가 진단 시도. 데이터 거부.

```
An extreme close-up of a glitching medical tablet screen held in a clinician's hand. The screen displays a clinical UI corrupted by red error overlays, distorted data fragments, and horizontal scanline tearing. Heavy chromatic aberration splits the text into red and cyan. Visible through the corruption: "RESIDUAL EMOTION: ████  /  RATE OF DECREASE: ABNORMAL  /  CAUSE: ——— ACCESS DENIED". The hand holding the tablet shows natural skin texture and a faint tremble. Cold clinical lighting, 8k photorealistic. The mood is technological refusal — the system is hiding something from its own user.
```
