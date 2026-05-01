import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import './DialogueBox.css';

interface Props {
  speaker?: string;
  text: string;
  cssClass?: string;
  onComplete: () => void;
  /** 타이핑 속도 (ms per char). 0 이하 = 즉시 표시 */
  textSpeedMs?: number;
  /** 오토 모드 활성: 타이핑 완료 후 autoSpeedMs 후 자동 onComplete */
  autoMode?: boolean;
  /** 오토 모드 대기 시간 (ms) */
  autoSpeedMs?: number;
}

/** GameScreen 등 부모가 ref로 호출할 수 있는 imperative API */
export interface DialogueBoxHandle {
  /** 현재 타이핑 진행 중인지 */
  isTyping: () => boolean;
  /** 타이핑 즉시 완료 */
  skipTyping: () => void;
}

const DEFAULT_TYPING_SPEED = 40;

const DialogueBox = forwardRef<DialogueBoxHandle, Props>(function DialogueBox({
  speaker, text, cssClass, onComplete,
  textSpeedMs = DEFAULT_TYPING_SPEED,
  autoMode = false,
  autoSpeedMs = 1500,
}, ref) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const indexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  // text는 key prop으로 리마운트되므로 컴포넌트 생애주기 동안 불변 — ref로 캡처
  const textRef = useRef(text);
  const speedRef = useRef(textSpeedMs);
  const isTypingRef = useRef(true);

  // 외부 사용자(GameScreen)에 노출할 imperative 핸들
  useImperativeHandle(ref, () => ({
    isTyping: () => isTypingRef.current,
    skipTyping: () => {
      if (!isTypingRef.current) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      isTypingRef.current = false;
      setDisplayedText(textRef.current);
      setIsTyping(false);
    },
  }), []);

  // isTyping state ↔ ref 동기화 (effect로 직접 setState 없이)
  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  // 마운트 시 타이핑 시작 (타이머 콜백 안에서만 setState).
  // 0 이하인 경우 즉시 전체 표시.
  useEffect(() => {
    const txt = textRef.current;
    const speed = speedRef.current;
    if (speed <= 0) {
      setDisplayedText(txt);
      setIsTyping(false);
      return;
    }
    const type = () => {
      indexRef.current++;
      if (indexRef.current <= txt.length) {
        setDisplayedText(txt.slice(0, indexRef.current));
        timerRef.current = window.setTimeout(type, speed);
      } else {
        setIsTyping(false);
      }
    };
    timerRef.current = window.setTimeout(type, speed);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // 클릭/키보드는 onComplete만 호출. 타이핑 스킵 vs 진행은 부모(GameScreen)가 ref로 판단.
  const handleClick = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // 키보드 지원
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClick]);

  // 오토 모드: 타이핑 완료 후 autoSpeedMs 후 자동 진행
  useEffect(() => {
    if (!autoMode || isTyping) return;
    const timer = window.setTimeout(() => onComplete(), autoSpeedMs);
    return () => clearTimeout(timer);
  }, [autoMode, isTyping, autoSpeedMs, onComplete]);

  return (
    <div className={`dialogue-box ${cssClass ?? ''}`} onClick={handleClick}>
      {speaker && (
        <div className="dialogue-speaker">{speaker}</div>
      )}
      <div className={`dialogue-text ${!speaker ? 'narration' : ''}`}>
        {displayedText}
        {isTyping && <span className="typing-cursor">|</span>}
      </div>
      {!isTyping && (
        <div className="dialogue-indicator">▼</div>
      )}
    </div>
  );
});

export default DialogueBox;
