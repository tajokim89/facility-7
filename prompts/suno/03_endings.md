# 03. 엔딩 4종

> 각 엔딩 노드(`ending_normal`, `ending_uneasy`, `ending_mirror`, `ending_empty`)에 `ambient` 필드를 추가해 사용.
> Loop·Instrumental·BPM·Key는 모두 Advanced Options에서 세팅.
> 엔딩 트랙도 `audio.loop = true`로 재생되므로, 텍스트를 빨리 넘기든 오래 머물든 자연스럽게 들리게 만든다.

---

## Ending A — `ending_a` 괜찮은 직장

> **노드**: `ending_normal`. "첫날치고 나쁘지 않았다... 내일도 출근이다."
> **2회차 텍스트**: "잔여 감정 수치가 깜빡이고 있었지만, 나는 보지 못했다."
> **의도**: 안도하는 척하는 일상의 마무리. 끝에서 한 번만 미세하게 어긋난다.

**Advanced**: Loop ON · Instrumental ON · **BPM 40** · **Key A minor**

**Style of Sound:**
```
Soft sustained dark ambient. Lonely fluorescent buzz. Gentle sub bass at 55Hz held constant. Faint distant elevator chime as a scattered ambient event. Ambiguous bittersweet calm at constant intensity. Single detuned partial drifts in and out throughout the texture suggesting something is wrong but never resolves. Room tone holds steady, no phrase. Mono compatible, around -20 LUFS.
```

**노드 적용**
```typescript
{ id: 'ending_normal', ambient: 'ending_a', /* ... */ }
```

---

## Ending B — `ending_b` 무언가 이상한

> **노드**: `ending_uneasy`. "막연한 불안감이 가시지 않았다. 태블릿의 잔여 감정 수치가, 아침보다 줄어 있었다."
> **의도**: 해결되지 않은 채 끝나는 미해결 화음. 머리에서 떠나지 않는 톤.

**Advanced**: Loop ON · Instrumental ON · **BPM 35** · **Key F minor**

**Style of Sound:**
```
Unresolved dread ambient. Slow detuning drift. Single cold piano note at 220Hz struck as scattered events with long natural reverb tail, never forming a melodic phrase. Hollow industrial reverb space. Anxiety hum at 60Hz sub bass held continuously. No resolution, no closure. Sound holds at constant intensity, the piano notes never complete. Mono compatible, around -20 LUFS.
```

**노드 적용**
```typescript
{ id: 'ending_uneasy', ambient: 'ending_b', /* ... */ }
```

---

## Ending C — `ending_mirror` 거울

> **노드**: `ending_mirror`. "낯설었다. 나는... 언제부터 이런 표정을 하고 있었지?"
> **2회차 텍스트**: "「대상자 #042」"
> **의도**: 자아 균열의 결정타. 정체성 붕괴의 호러 클라이맥스를 일정 강도로 유지.

**Advanced**: Loop ON · Instrumental ON · **BPM 40** · **Key C# minor**

**Style of Sound:**
```
Horror ambient sustained at peak. Deep sub drone at 27Hz held constant. Reversed dark choir without lyrics shimmering at constant intensity, no swell. Whispered name forty two buried 20dB under noise as scattered events. Beating dissonance from two sines at 528Hz and 523Hz continuous. Glass shatter delay tail panning left to right as scattered events. Identity shattering tone at constant level. Slowly cycling tape distortion. Mono compatible, around -18 LUFS.
```

**노드 적용**
```typescript
{ id: 'ending_mirror', ambient: 'ending_c', /* ... */ }
```

---

## Ending D — `ending_d` 공허

> **노드**: `ending_empty`. "아무것도 느껴지지 않는다... 태블릿이 꺼졌다."
> **2회차 텍스트**: "「대상자 전환 절차 개시. 의자로 이동하십시오.」"
> **의도**: 진짜 끝. 거의 무음에 가까운 죽음의 평온. 침묵으로 마무리.

**Advanced**: Loop ON · Instrumental ON · **BPM 25** · **Key A minor**

**Style of Sound:**
```
Empty void ambient, near silence. Barely audible 30Hz sub bass pulse every 8 seconds like a distant slow heartbeat at constant tempo. Faint distant flatline medical tone at 1000Hz appearing as a scattered rare event. Hopeless cold dissociated stillness at constant intensity. No melody, no phrase, no climax. Heartbeat pulse continues identically throughout. Mono compatible, very quiet, around -24 LUFS.
```

**노드 적용**
```typescript
{ id: 'ending_empty', ambient: 'ending_d', /* ... */ }
```

---

## 엔딩 트랙 적용 시 주의

엔딩 노드는 `endingId`를 만나는 순간 `GameScreen.handleAdvance`에서 `audioManager.stopAmbient()`가 호출된 후 `'ending'` 화면으로 전환된다. 즉 기본 동작에서는 **엔딩 트랙이 엔딩 텍스트를 읽는 동안만 루프 재생**되고, "Re:Observe" 버튼 화면으로 가면 정지된다.

엔딩 화면에서도 트랙을 계속 루프 재생하고 싶다면 `GameScreen.tsx`의 다음 부분을 손본다:

```typescript
if (currentNode.endingId) {
  audioManager.stopAmbient();   // ← 이 줄을 지우면 엔딩 화면에서도 트랙이 계속 루프
  engine.clearSave();
  // ...
}
```

또는 엔딩 화면(`screen === 'ending'`)에서도 별도로 `audioManager.playAmbient(\`ending_${endingId}\`)` 호출.
