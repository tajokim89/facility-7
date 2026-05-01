# 01. 기본 앰비언트 트랙 (5종 × 회차별 변형)

> `AudioManager.ts`의 `trackRegistry`에 등록된 5개 트랙. 1회차는 `{track_id}.mp3`, 2회차는 `{track_id}_p2.mp3`로 저장.
> Style 칸은 모두 500자 이하. Loop·Instrumental·BPM·Key는 Advanced Options에서 세팅.

각 항목 형식:

```
**Advanced**: Loop ON / Instrumental ON / BPM xx / Key xx
**Style of Sound** (붙여넣기):
[프롬프트]
```

---

## 1. `facility` — 시설 로비 / 기본 드론

> **사용 노드**: S03 ~ S06.
> **의도**: 사무적이지만 어딘가 어긋난 평온. 첫 5분 동안 플레이어를 안심시키는 척.

### 1회차 — `facility.mp3`

**Advanced**: Loop ON · Instrumental ON · **BPM 40** · **Key A minor**

**Style of Sound:**
```
Dark ambient sub bass drone. Sterile underground corporate office at night, calm but wrong. Deep sine drone at 55Hz and 27Hz, faint 82Hz triangle pad sustained. Very distant HVAC rumble, faint fluorescent buzz, occasional soft electrical click. Liminal industrial horror, oppressive silence, institutional cleanliness. Slow 0.1Hz volume swell, ultra slow drift. Room tone holds steady from start to end. No events. Mixed heavy low end, mono compatible, around -20 LUFS.
```

### 2회차 — `facility_p2.mp3`

**Advanced**: Loop ON · Instrumental ON · **BPM 35** · **Key A minor**

**Style of Sound:**
```
Dark ambient drone, evolved and wrong. Deep sub bass 27Hz with detuned partial 5 cents up creating slow throb. Slow dissonant pad sustained. Faint reversed whispered voices buried 30dB below the drone, very distant feminine breathing texture appearing as scattered air. Ominous corporate horror, liminal facility memory. Slowly tightening dread, no resolution. Tape warble. Mixed heavy low end, mono compatible, around -20 LUFS.
```

---

## 2. `sector_a` — A구역 무균실

> **사용 노드**: S07 ~ S15. 첫 추출(#117 권태) ~ #203 비명 직전.
> **의도**: 의료실의 차가운 위협. 흰 벽이 그 자체로 압박이 되는 음역대.

### 1회차 — `sector_a.mp3`

**Advanced**: Loop ON · Instrumental ON · **BPM 45** · **Key F# minor**

**Style of Sound:**
```
Clinical dark ambient, sterile drone. Medical horror room tone. High sine drone at 220Hz and 440Hz layered with thin 880Hz overtone. Faint metallic ring, glass harmonics shimmer, occasional electrical hum buried far back. Low 55Hz sub pulse sustained. Surgical tension, antiseptic dread, white room cold fluorescent buzz. Sound is static and held, no phrase. Mono compatible, sharp top end, dry and clean. Around -20 LUFS.
```

### 2회차 — `sector_a_p2.mp3`

**Advanced**: Loop ON · Instrumental ON · **BPM 40** · **Key F# minor**

**Style of Sound:**
```
Clinical horror ambient, evolved. Beating sine pair 220Hz and 222Hz creating slow throb. Distant heart monitor flatline tone deep in the mix as scattered events. Faint reversed whispered medical jargon. Thin tinnitus 8000Hz pad slowly drifting. Increased dissonance. Surveillance unease, observer being observed. Tape pitch drift. Sound holds at constant intensity. Mono compatible, around -20 LUFS.
```

---

## 3. `sector_b` — B구역 정밀 추출실

> **사용 노드**: S21 ~ S22. "그리움의 잔향" 은빛 액체.
> **의도**: 슬프지만 위험한 우아함. ambient 자장가에 가까운 위험성.

### 1회차 — `sector_b.mp3`

**Advanced**: Loop ON · Instrumental ON · **BPM 50** · **Key D minor**

**Style of Sound:**
```
Ethereal dark ambient, glass drone, melancholic dystopian new age. Beautiful sadness, fragile longing, silver shimmer over an underground laboratory. Bowed crystal glass harmonics at 330Hz and 660Hz. Soft sine bell tones as scattered events that never form a phrase. Distant choir-like air pad without lyrics. Deep slow sub at 82Hz. Ultra slow drift. Uncanny serenity, no major resolution. Mono compatible, around -20 LUFS.
```

### 2회차 — `sector_b_p2.mp3`

**Advanced**: Loop ON · Instrumental ON · **BPM 45** · **Key D minor**

**Style of Sound:**
```
Ethereal horror ambient, beautiful but wrong. Glass drone with tape warble. Slowly detuning crystal harmonics by 10 cents creating slow throb. Single cold piano note at 220Hz struck as scattered events with long natural reverb tail, never forming a phrase. Faint distant sobbing buried under the drone. Harvested longing, melancholy turning predatory. Mono compatible, around -20 LUFS.
```

---

## 4. `corridor` — 복도 / 휴게실 / 이동

> **사용 노드**: S17 (휴게실), S23 (복도).
> **의도**: 무표정한 직원들이 앉아 있는 공기. 갇혀 있는 듯한 저주파 진동대.

### 1회차 — `corridor.mp3`

**Advanced**: Loop ON · Instrumental ON · **BPM 30** · **Key E minor**

**Style of Sound:**
```
Industrial ambient, sub bass drone, brutalist concrete corridor hum. Oppressive claustrophobic walking through dead spaces. Sawtooth sub bass at 40Hz held. Heavy machinery hum at 60Hz constant. Distant pipe clang as scattered ambient events. Low frequency rumble, faint air vent breath, fluorescent fatigue. Long convolution reverb. Sound is constant and dry, no phrase. Mono compatible, very heavy low end, around -20 LUFS.
```

### 2회차 — `corridor_p2.mp3`

**Advanced**: Loop ON · Instrumental ON · **BPM 30** · **Key E minor**

**Style of Sound:**
```
Industrial dread ambient. Deep 40Hz oppressive drone. Distant muffled human screams buried 25dB under noise floor as scattered events. Concrete corridor convolution reverb. Machinery groan. Occasional reversed footstep. Surveillance camera click as scattered events. Hidden wrongness. Sound holds at constant intensity, no build, no resolution. Mono compatible, around -20 LUFS.
```

---

## 5. `g_sector` — G구역 거울의 방

> **사용 노드**: S24b. 사방이 거울. 1회차에서는 누가 앉아 있는지 모호, 2회차에서는 관찰자 본인.
> **의도**: 이질감과 자아 해체. 5Hz 비팅 주파수가 청각적 어지러움 유발.

### 1회차 — `g_sector.mp3`

**Advanced**: Loop ON · Instrumental ON · **BPM 50** · **Key C# minor**

**Style of Sound:**
```
Uncanny ambient, dissonant beating frequencies. Mirror room horror, dissociation, identity slipping, hypnotic wrongness, infinite reflection. Two pure sine waves at 528Hz and 523Hz creating 5Hz binaural beat held throughout. Shimmering high partials. Low sub pulse at 44Hz constant. Reversed metallic shimmer texture. Hypnotic pulse from beating frequencies. No warm chord, no phrase. Mono compatible, around -20 LUFS.
```

### 2회차 — `g_sector_p2.mp3`

**Advanced**: Loop ON · Instrumental ON · **BPM 45** · **Key C# minor**

**Style of Sound:**
```
Psychological horror ambient sustained. Dissonant 528Hz and 523Hz binaural beating intensified. Layered whispered numbers buried in noise saying observer 042 subject. Reversed mirror reverb. Identity dissolution. Very slow distorted breathing texture. Occasional glass crack snap as scattered events. Slow tape pitch drift. Sound holds at constant intensity. Mono compatible, around -20 LUFS.
```

---

## 빠른 참조표

| 트랙 | BPM | Key | 1회차 키워드 | 2회차 추가 |
|:---|:---:|:---:|:---|:---|
| facility | 40/35 | A min | sub drone, calm-but-wrong | 디튜닝, 역재생 속삭임 |
| sector_a | 45/40 | F# min | 임상, 고음 사인 | 비팅, 플랫라인 |
| sector_b | 50/45 | D min | 글래스, 잔향 | 피아노 단음, 흐느낌 |
| corridor | 30/30 | E min | 산업, 40Hz 톱니파 | 먼 비명, 카메라 클릭 |
| g_sector | 50/45 | C# min | 5Hz 비팅 | 042 속삭임 |
