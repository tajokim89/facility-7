import { useEffect, useState } from 'react';
import type { ChapterData } from '../data/schema';
import { CHAPTERS, isChapterUnlocked } from '../data/chapters';
import './EndingGalleryPanel.css';

interface Props {
  endingsReached: string[];
  onClose: () => void;
}

interface ChapterEndings {
  chapterId: string;
  chapterTitle: string;
  unlocked: boolean;
  endings: { id: string; label: string; reached: boolean }[];
}

export default function EndingGalleryPanel({ endingsReached, onClose }: Props) {
  const [groups, setGroups] = useState<ChapterEndings[]>([]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // 모든 unlocked 챕터를 lazy load해서 엔딩 메타 추출
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result: ChapterEndings[] = [];
      for (const entry of CHAPTERS) {
        const unlocked = isChapterUnlocked(entry, endingsReached);
        if (!unlocked) {
          result.push({
            chapterId: entry.id,
            chapterTitle: '???',
            unlocked: false,
            endings: [],
          });
          continue;
        }
        const data: ChapterData = await entry.load();
        const endings = data.endings ?? {};
        result.push({
          chapterId: entry.id,
          chapterTitle: data.title,
          unlocked: true,
          endings: Object.entries(endings).map(([id, meta]) => ({
            id,
            label: meta.label,
            reached: endingsReached.includes(id),
          })),
        });
      }
      if (!cancelled) setGroups(result);
    })();
    return () => { cancelled = true; };
  }, [endingsReached]);

  const totalEndings = groups.reduce((sum, g) => sum + g.endings.length, 0);
  const reachedCount = groups.reduce((sum, g) => sum + g.endings.filter(e => e.reached).length, 0);

  return (
    <div className="gallery-overlay" onClick={onClose}>
      <div className="gallery-panel" onClick={e => e.stopPropagation()}>
        <h2>ENDING GALLERY</h2>
        <div className="gallery-summary">
          {reachedCount} / {totalEndings || '?'} 엔딩 발견
        </div>

        <div className="gallery-groups">
          {groups.map(group => (
            <div key={group.chapterId} className={`gallery-group ${group.unlocked ? '' : 'gallery-locked'}`}>
              <div className="gallery-group-title">
                {group.chapterTitle}
              </div>
              {group.unlocked ? (
                <div className="gallery-endings">
                  {group.endings.map(e => (
                    <div
                      key={e.id}
                      className={`gallery-ending ${e.reached ? 'gallery-ending-reached' : ''}`}
                    >
                      <span className="gallery-ending-marker">{e.reached ? '◆' : '◇'}</span>
                      <span className="gallery-ending-label">
                        {e.reached ? e.label : '??? — 미발견'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="gallery-locked-msg">— LOCKED —</div>
              )}
            </div>
          ))}
        </div>

        <button className="gallery-close" onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}
