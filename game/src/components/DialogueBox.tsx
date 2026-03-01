import { useState, useEffect, useCallback, useRef } from 'react';
import './DialogueBox.css';

interface Props {
  speaker?: string;
  text: string;
  cssClass?: string;
  onComplete: () => void;
}

const TYPING_SPEED = 40; // ms per character

export default function DialogueBox({ speaker, text, cssClass, onComplete }: Props) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const indexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  // text는 key prop으로 리마운트되므로 컴포넌트 생애주기 동안 불변 — ref로 캡처
  const textRef = useRef(text);

  // 마운트 시 타이핑 시작 (타이머 콜백 안에서만 setState)
  useEffect(() => {
    const txt = textRef.current;
    const type = () => {
      indexRef.current++;
      if (indexRef.current <= txt.length) {
        setDisplayedText(txt.slice(0, indexRef.current));
        timerRef.current = window.setTimeout(type, TYPING_SPEED);
      } else {
        setIsTyping(false);
      }
    };
    timerRef.current = window.setTimeout(type, TYPING_SPEED);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleClick = useCallback(() => {
    if (isTyping) {
      // 타이핑 중 클릭 → 즉시 전체 표시
      if (timerRef.current) clearTimeout(timerRef.current);
      setDisplayedText(text);
      setIsTyping(false);
    } else {
      // 타이핑 완료 후 클릭 → 다음으로
      onComplete();
    }
  }, [isTyping, text, onComplete]);

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
}
