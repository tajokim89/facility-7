# Chapter 01 이미지 생성 프롬프트 및 최적화 기록

이 문서는 S01~S05 장면의 이미지 생성 품질을 높이기 위해 적용된 프롬프트 수정 내역과 기술적 설정 사항을 기록합니다.

## 1. 장면별 프롬프트 상세 (S01-S05)

### S01: 휴게실의 태블릿
- **English:** Masterpiece, 8k, clinical horror, POV, looking down at a sleek futuristic black tablet resting on a desk, in the background a dimly lit sterile single dormitory room, the tablet screen is completely blank and empty, emitting a deep uniform glowing blue light with absolutely no icons, no text, and no UI elements, a pure minimalist digital glow, cold atmosphere, photorealistic.
- **한글 번역:** 걸작, 8k, 임상적 공포, POV, 책상 위에 놓인 매끄럽고 미래적인 검은색 태블릿을 내려다봄. 배경은 어둡고 살균된 1인용 기숙사 방. 태블릿 화면은 완전히 비어 있으며, 아이콘이나 텍스트 없이 균일하고 깊은 푸른 빛을 내뿜음. 순수한 미니멀리즘 디지털 광원, 차가운 분위기, 실사.

### S02: 하강하는 엘리베이터
- **English:** Masterpiece, 8k, clinical horror, POV inside a descending futuristic elevator, highly polished metallic walls reflecting cold flickering fluorescent lights, minimalist industrial design, a single small digital floor indicator displaying the large clear character 'B9' in a clean futuristic digital font, sharp focus on the display, claustrophobic and ominous atmosphere, photorealistic.
- **한글 번역:** 걸작, 8k, 임상적 공포, 하강하는 미래형 엘리베이터 내부의 POV. 차갑고 깜빡이는 형광등을 반사하는 고광택 금속 벽. 미니멀한 산업 디자인. 깨끗하고 미래적인 폰트로 'B9'이라는 큰 글자가 표시된 작은 디지털 층 표시기. 디스플레이에 날카로운 초점, 폐쇄 공포증적이고 불길한 분위기, 실사.

### S03: 로비의 한세진 (캐릭터 고정)
- **English:** Masterpiece, 8k, clinical horror, Upper body shot, from the waist up, a young woman named Han Se-jin standing in a blindingly white sterile lobby, wearing a crisp pristine white clinical uniform, uncomfortably neutral expression, dead empty eyes, perfectly symmetrical composition, polished marble reflections, cold atmospheric lighting, photorealistic.
- **한글 번역:** 걸작, 8k, 임상적 공포, 허리 위 상반신 샷, 눈부시게 하얀 살균된 로비에 서 있는 한세진. 바삭하고 깨끗한 흰색 임상복 착용. 불편할 정도로 무표정하고 죽은 듯 텅 빈 눈. 완벽하게 대칭적인 구도, 대리석 반사광, 차가운 분위기의 조명, 실사.
- **설정:** IP-Adapter Weight 1.0, Weight Type: standard (han_sejin.png 적용)

### S04: 복도를 걸어가는 한세진 (인물 중복 방지)
- **English:** Masterpiece, 8k, clinical horror, Upper body shot from behind, from the waist up, a young woman named Han Se-jin walking away into an infinite perfectly white corridor, single person, solo, symmetrical architecture, minimalist glowing neon signs on the walls, vanishing point perspective, eerie silence, too clean to be human, cold photorealistic lighting.
- **한글 번역:** 걸작, 8k, 임상적 공포, 뒤에서 본 상반신 샷, 무한히 이어지는 완벽한 흰색 복도로 멀어지는 한세진. 한 명의 인물, 솔로. 대칭적 건축물, 벽면의 미니멀한 네온사인. 소름 끼칠 정도의 정적, 기괴할 정도로 깨끗한 느낌, 차가운 실사 조명.
- **설정:** 부정 프롬프트 `(multiple people:1.8)` 적용으로 인물 중복 생성 방지.

### S05: 한세진의 얼굴 초근접 (확대)
- **English:** Masterpiece, 8k, clinical horror, extreme close-up of Han Se-jin's face, zooming in on eyes, pale skin, unnervingly still and emotionless, soft shadows, blueish clinical light, dead empty eyes, uncanny valley aesthetic, sharp focus on the eyes, photorealistic, high detail.
- **한글 번역:** 걸작, 8k, 임상적 공포, 한세진의 얼굴 초근접 샷, 눈 부위 확대. 창백한 피부, 소름 끼칠 정도로 정지된 무표정. 부드러운 그림자, 푸르스름한 임상 조명, 죽은 듯 텅 빈 눈. 불쾌한 골짜기 미학, 눈에 날카로운 초점, 고해상도 실사.
- **설정:** `(zoomed out:1.5)` 부정 프롬프트를 통해 초근접 샷 강제.

## 2. 기술적 변경 사항 및 최적화 전략

1. **IP-Adapter 설정 변경:**
   - 화풍보다 인물의 외형(Identity) 보존이 중요하므로 `weight_type`을 `style transfer`에서 `standard`로 변경.
   - 캐릭터 재현력을 극대화하기 위해 `weight`를 `1.0`으로 설정.

2. **부정 프롬프트(Negative Prompt) 강화:**
   - 인물이 여러 명 나오는 현상을 막기 위해 `(multiple people:1.8), (two people:1.8)` 등의 가중치를 상향 조정.
   - 근접 샷에서 멀어지는 현상을 막기 위해 `(zoomed out:1.5)` 추가.

3. **해상도 및 품질:**
   - 1920x1080 (FHD) 고해상도 설정 및 Lightning 모델 최적화.
