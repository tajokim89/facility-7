# 02. 특수 장면 트랙

> 옵션 B(노드 단위 `ambient` 오버라이드)로만 사용. `schema.ts`의 `PlaythroughOverride.ambient` 또는 `SceneNode.ambient`에 트랙 ID를 직접 박는다.
> Loop·Instrumental·BPM·Key는 모두 Advanced Options에서 세팅.

---

## 1. `sector_a_panic` — S15 #203 원한 비명 장면

> **사용 노드**: S15 (대상자 #203 추출 시작 → 빨간 액체 끓어오름 → 선택지 분기).
> **의도**: `sector_a` 임상 톤이 무너지는 순간. 적색경보. 짧은 노드지만 선택지를 오래 보면 루프되므로 강도는 일정하게 유지.

**Advanced**: Loop ON · Instrumental ON · **BPM 60** · **Key F# minor**

**Style of Sound:**
```
Horror ambient panic cue. 880Hz piercing sine wave sustained at full intensity from start. Distorted boiling liquid sound design as continuous bed. Low 30Hz sub bass pulse like a panic heartbeat at constant level. Alarm-like dissonant cluster of detuned high sines held flat. Scrubbed metallic scream texture buried in distortion. Sustained red alert tension at constant intensity, no build, no release. Mono compatible, mixed loud at -16 LUFS for emphasis.
```

**노드 적용 예**
```typescript
{
  id: 'S15',
  ambient: 'sector_a_panic',
  // ...
}
// S17 다음 노드에서 ambient: 'corridor'로 자연 복귀
```

---

## 2. `g_sector_climax` — S24b 2회차 (관찰자 #042 보임)

> **사용 노드**: S24b 2회차 분기. "안쪽에 앉아 있는 사람이 보였다. 관찰자 유니폼을 입고 있었다."
> **의도**: `g_sector`보다 한 단계 더. 자아 해체의 정점. 2회차에서만 트리거.

**Advanced**: Loop ON · Instrumental ON · **BPM 45** · **Key C# minor**

**Style of Sound:**
```
Psychological horror ambient peak. Dissonant 528Hz and 523Hz binaural beating amplified with ring modulator, sustained. Reversed whisper choir saying number forty two without lyrics, scattered. Glass shattering reversed and time-stretched as scattered events. Sub bass 44Hz throbbing constantly. Slow tape pitch drift cycling back to origin. Identity dissolution, mirror infinity, no resolution. Sound holds at constant peak intensity. Mono compatible, around -18 LUFS.
```

**노드 적용 예**
```typescript
{
  id: 'S24b',
  ambient: 'g_sector',
  overrides: [{
    minPlaythrough: 2,
    ambient: 'g_sector_climax',
    text: '...',
    effect: 'glitch',
  }],
}
```

> 이 오버라이드를 쓰려면 `schema.ts`의 `PlaythroughOverride`에 `ambient?: AmbientTrack;` 필드를 먼저 추가해야 한다 (README의 옵션 B 참고).

---

## 3. (선택) `corridor_f_scream` — S23 2회차 F구역 비명

> **사용 노드**: S23 2회차 오버라이드 ("F구역 방향에서 희미한 비명 같은 소리가 들렸다").
> 굳이 이 정도까지 쓰지 않아도 `corridor_p2.mp3`로 충분히 표현됨. 임팩트 부족하면 추가.

**Advanced**: Loop ON · Instrumental ON · **BPM 30** · **Key E minor**

**Style of Sound:**
```
Industrial corridor ambient with distant single human scream. Scream is muffled and far down a long concrete tunnel, heavy convolution reverb. 40Hz sub bass continues constantly underneath. Scream occurs as rare scattered events buried in noise, never aligning with any beat. Otherwise the room is mostly quiet machinery hum, faint air vent breath. Sound holds at constant intensity outside the scream events. Mono compatible, around -20 LUFS.
```
