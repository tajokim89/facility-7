import { useEffect, useState } from 'react';
import type { ChapterData } from '../data/schema';
import { CHAPTERS, isChapterUnlocked } from '../data/chapters';
import './ChapterSelectPanel.css';

interface Props {
  /** 글로벌 endingsReached (잠금 해제 체크) */
  endingsReached: string[];
  /** 챕터 ID 선택 → 부모가 새 게임 시작 */
  onSelect: (chapterId: string) => void;
  onClose: () => void;
}

interface ChapterMeta {
  data?: ChapterData;
  unlocked: boolean;
  endingsTotal: number;
  endingsReachedInChapter: number;
}

export default function ChapterSelectPanel({ endingsReached, onSelect, onClose }: Props) {
  const [metas, setMetas] = useState<Record<string, ChapterMeta>>({});

  // ESC로 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // 잠금 해제된 챕터만 lazy load해서 엔딩 진행도 계산
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, ChapterMeta> = {};
      for (const entry of CHAPTERS) {
        const unlocked = isChapterUnlocked(entry, endingsReached);
        if (!unlocked) {
          next[entry.id] = { unlocked: false, endingsTotal: 0, endingsReachedInChapter: 0 };
          continue;
        }
        const data = await entry.load();
        const endings = data.endings ? Object.keys(data.endings) : [];
        next[entry.id] = {
          data,
          unlocked: true,
          endingsTotal: endings.length,
          endingsReachedInChapter: endings.filter(e => endingsReached.includes(e)).length,
        };
      }
      if (!cancelled) setMetas(next);
    })();
    return () => { cancelled = true; };
  }, [endingsReached]);

  return (
    <div className="chapter-overlay" onClick={onClose}>
      <div className="chapter-panel" onClick={e => e.stopPropagation()}>
        <h2>CHAPTER SELECT</h2>

        <div className="chapter-list">
          {CHAPTERS.map((entry, idx) => {
            const meta = metas[entry.id];
            const unlocked = meta?.unlocked ?? false;
            return (
              <button
                key={entry.id}
                className={`chapter-card ${unlocked ? '' : 'chapter-locked'}`}
                onClick={() => unlocked && onSelect(entry.id)}
                disabled={!unlocked}
              >
                <div className="chapter-num">CH.{String(idx + 1).padStart(2, '0')}</div>
                <div className="chapter-title">
                  {unlocked ? entry.title : '???'}
                </div>
                {unlocked && meta && meta.endingsTotal > 0 && (
                  <div className="chapter-endings-count">
                    {meta.endingsReachedInChapter} / {meta.endingsTotal} 엔딩 발견
                  </div>
                )}
                {!unlocked && (
                  <div className="chapter-lock-msg">LOCKED</div>
                )}
              </button>
            );
          })}
        </div>

        <button className="chapter-close" onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}
