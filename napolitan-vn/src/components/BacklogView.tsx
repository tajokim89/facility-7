import type { BacklogEntry } from '../data/schema';
import { useEffect, useRef } from 'react';
import './BacklogView.css';

interface Props {
  entries: BacklogEntry[];
  onClose: () => void;
}

export default function BacklogView({ entries, onClose }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="backlog-overlay" onClick={onClose}>
      <div className="backlog-container" onClick={e => e.stopPropagation()}>
        <div className="backlog-header">
          <span>OBSERVATION LOG</span>
          <button className="backlog-close" onClick={onClose}>ESC</button>
        </div>
        <div className="backlog-entries">
          {entries.map((entry, i) => (
            <div key={i} className="backlog-entry">
              {entry.speaker && (
                <span className="backlog-speaker">{entry.speaker}</span>
              )}
              <p className={`backlog-text ${!entry.speaker ? 'narration' : ''}`}>
                {entry.text}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
