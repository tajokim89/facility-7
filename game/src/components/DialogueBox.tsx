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

  // 텍스트 변경 시 타이핑 초기화
  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    indexRef.current = 0;

    const type = () => {
      if (indexRef.current < text.length) {
        indexRef.current++;
        setDisplayedText(text.slice(0, indexRef.current));
        timerRef.current = window.setTimeout(type, TYPING_SPEED);
      } else {
        setIsTyping(false);
      }
    };

    timerRef.current = window.setTimeout(type, TYPING_SPEED);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text]);

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
