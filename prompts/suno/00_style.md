# 00. 공통 스타일 가이드 (Suno 마스터 톤)

> 모든 트랙이 따라야 하는 공통 톤·negative tags·BPM/Key 기준. 트랙별 프롬프트(`01~03`)는 이 가이드를 전제로 작성됐다.

## 장르·무드 코어

- **장르**: dark ambient / drone / industrial ambient / clinical horror score
- **베이스 톤**: 탈색된 회색·청록 계열의 사운드. 따뜻함·해상·드럼·멜로디 없음.
- **공포 표현**: 노골적 비명·점프스케어가 아니라 **정적·반복·작은 어긋남**으로 만든다.
- **참고 아티스트**: Lustmord, Atrium Carceri, Tim Hecker, Akira Yamaoka(사일런트힐), Mica Levi(언더 더 스킨), Cliff Martinez.

## Suno 설정 매트릭스

각 트랙 페이지에 적힌 BPM/Key를 Advanced Options에 그대로 입력. 아래는 원리 요약.

### BPM

앰비언트는 박자가 거의 없지만 Suno는 BPM을 입력해야 한다. 그루브가 새지 않도록 **30~50** 범위에서 고른다.

| 분위기 | 추천 BPM |
|:---|:---|
| 거의 정지 (엔딩 D, void) | 25~30 |
| 산업/복도 (heavy hum) | 30 |
| 일반 드론 (facility, ending A) | 40 |
| 약간 흐름 (sector_b, ending B) | 45~50 |
| 긴장 빌드 없는 적색경보 (panic) | 60 |

### Key

다크 앰비언트는 마이너 키만 쓴다. 트랙별로 톤이 어긋나지 않게 분배.

| 키 | 성격 | 사용 트랙 |
|:---|:---|:---|
| **A minor** | 표준 다크 톤, 어둠의 베이스 | facility, ending_a, ending_d |
| **F# minor** | 날카롭고 임상적 | sector_a, sector_a_panic |
| **D minor** | 슬픔·그리움 | sector_b |
| **E minor** | 산업·금속 | corridor |
| **C# minor** | 이질·자아 해체 | g_sector, g_sector_climax, ending_c |
| **F minor** | 모호한 불안 | ending_b |

### Loop / Instrumental

| 토글 | 값 |
|:---|:---|
| Loop | **ON** (모든 트랙) |
| Instrumental | **ON** (모든 트랙) |

→ 이 두 가지가 Advanced에서 켜져 있으면 프롬프트에서 "seamless loop, no vocals" 같은 말은 빼도 됨. 글자수 절약.

## 공통 Negative Tags (모든 트랙 공용)

Suno의 Negative Tags 칸에 그대로 붙여넣기:

```
drums, beat, percussion, kick, snare, hi-hat, melody, lead melody, vocals, lyrics, choir lyrics, climax, build up, drop, brass, electric guitar, acoustic guitar, EDM, lo-fi hip-hop, jazz, cinematic trailer, orchestral hit, major chord, warm pad
```

트랙별로 추가 negative가 필요하면 해당 페이지에 별도 표기.

## 글자수 규칙 (Style of Sound 칸)

- **상한 500자.** 한도 넘으면 Suno가 자른다.
- 트랙별 프롬프트는 모두 **480자 이하**로 맞춰뒀다 (여유 20자).
- 직접 수정할 때는 영어 단어 단위로 압축. 같은 형용사 두 번 안 쓴다.

## 후처리

Suno가 Loop ON이면 시작/끝이 자연스럽게 이어지도록 출력하지만 완벽하지 않을 수 있다. Audacity 등으로 열어:

1. 시작·끝 1초씩 들어보고 톤이 맞는지 확인.
2. 끝이 살짝 떨어지면 마지막 1~2초를 시작과 크로스페이드.
3. 본인 귀로 **3회 연속 재생** 시켜 솔기(seam) 안 들리는지 확인.
4. 음량은 -20 LUFS 정도로 노멀라이즈 (효과음에 묻히지 않도록).

## 출력 규격

| 항목 | 값 |
|:---|:---|
| 포맷 | `.mp3` (128~192kbps) |
| 채널 | 스테레오 (모노 호환 권장) |
| 샘플레이트 | 44.1kHz |
| 길이 | 2~3분, 무한 루프 가능 |
| 음량 | 평균 -20 LUFS, 피크 -3 dBFS 이내 |
| 저장 경로 | `game/public/audio/{track_id}.mp3` |
