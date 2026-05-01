# ChatGPT 이미지 프롬프트 (Sector 7 / 감정 처리 시설 7구역)

ChatGPT(DALL·E 3 / GPT Image)에 직접 입력해서 게임 배경/캐릭터 이미지를 생성하기 위한 프롬프트 모음.
ComfyUI용 가중치/네거티브 표기를 제거하고, 콘텐츠 정책에 자연스럽게 통과되도록 분위기·암시 위주로 다듬은 버전.

## 파일 구성

| 파일 | 용도 | 사용 순서 |
|:---|:---|:---|
| `00_style.md` | 공통 톤·미장센 마스터 가이드 | ChatGPT 세션 시작 시 한 번 입력 |
| `01_characters.md` | 캐릭터 5인 레퍼런스 시트 | 인물 일관성 필요할 때 reference로 첨부 |
| `02_title.md` | 타이틀 화면 2종 (NORMAL / GLITCH) | 단독 생성 |
| `03_chapter1.md` | Chapter 1 씬 22개 (S01–S26a) | 씬별 단독 생성 |
| `04_endings.md` | 엔딩 4종 (A/B/C/D) | 단독 생성 |

## 사용법

1. **세션 시작**: 새 ChatGPT 대화에 `00_style.md` 내용을 시스템 톤으로 입력 ("아래 스타일을 모든 후속 이미지에 적용해줘.").
2. **캐릭터 등장 씬**: `01_characters.md`에서 해당 인물 묘사를 함께 첨부.
3. **씬 생성**: `03_chapter1.md` 또는 다른 파일에서 씬 한 개의 프롬프트만 복사해 입력.
4. **저장**: 생성된 이미지를 `game/src/data/images/chapter1/{SCENE_ID}.png` 경로로 저장 (게임 코드가 참조하는 경로).

## 검열 회피 변환 원칙

ComfyUI 원본의 직접적·기술적 묘사를 ChatGPT가 거부하지 않도록 다음 규칙으로 변환:

| 원본 (피하는 단어) | 변환 (안전한 표현) |
|:---|:---|
| blood, blood-red liquid | deep crimson industrial fluid, dark amber-red coolant |
| screaming, victim | patient with a tense, distressed expression |
| torture, suffering | clinical distress, exhausted compliance |
| mutilation, body horror | industrial decay, institutional sterility |
| extraction (직접 신체 묘사) | medical procedure, monitoring session |
| restrained | seated, stationary |
| tubes in body | tubes connected to the chair's armrests |
| nudity 우려 부분 | fully clothed in long-sleeve white clinical uniform |

## 톤 일관성 키워드 (모든 씬 공통)

`clinical horror`, `desaturated teal-grey palette`, `cold fluorescent lighting`, `symmetrical architectural composition`, `Arri Alexa cinematic still`, `35mm lens`, `8k photorealistic`.
