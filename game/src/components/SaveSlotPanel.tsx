import { useEffect, useState } from 'react';
import type { SaveSlot, SaveSlotId } from '../data/schema';
import './SaveSlotPanel.css';

export type SaveSlotMode = 'save' | 'load';

interface Props {
  slots: SaveSlot[];
  mode: SaveSlotMode;
  /** save: 슬롯 선택 → 저장 / load: 슬롯 선택 → 로드 */
  onSelect: (id: SaveSlotId) => void;
  /** 슬롯 삭제 (선택적) */
  onDelete?: (id: SaveSlotId) => void;
  onClose: () => void;
}

export default function SaveSlotPanel({ slots, mode, onSelect, onDelete, onClose }: Props) {
  const [confirming, setConfirming] = useState<SaveSlotId | null>(null);

  // ESC로 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirming) setConfirming(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, confirming]);

  const handleSlotClick = (slot: SaveSlot) => {
    if (slot.id === 'auto' && mode === 'save') return; // 자동저장은 수동 저장 불가
    if (mode === 'load' && !slot.state) return; // 빈 슬롯 로드 불가

    // save 모드 + 기존 데이터 있으면 덮어쓰기 확인
    // load 모드는 즉시 (현재 진행 손실은 호출 측이 안내)
    if (mode === 'save' && slot.state) {
      setConfirming(slot.id);
      return;
    }
    onSelect(slot.id);
  };

  const handleDelete = (e: React.MouseEvent, id: SaveSlotId) => {
    e.stopPropagation();
    if (id === 'auto') return;
    onDelete?.(id);
  };

  const title = mode === 'save' ? 'SAVE' : 'LOAD';

  return (
    <div className="slot-overlay" onClick={onClose}>
      <div className="slot-panel" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>

        <div className="slot-grid">
          {slots.map(slot => {
            const isAutoSave = slot.id === 'auto';
            const isEmpty = !slot.state;
            const isDisabled = (mode === 'save' && isAutoSave) || (mode === 'load' && isEmpty);
            const label = isAutoSave ? 'AUTO' : `슬롯 ${slot.id}`;

            return (
              <button
                key={slot.id}
                className={`slot-card ${isEmpty ? 'slot-empty' : ''} ${isDisabled ? 'slot-disabled' : ''}`}
                onClick={() => handleSlotClick(slot)}
                disabled={isDisabled}
              >
                <div className="slot-header">
                  <span className="slot-id">{label}</span>
                  {!isEmpty && !isAutoSave && onDelete && (
                    <span
                      className="slot-delete"
                      onClick={e => handleDelete(e, slot.id)}
                      title="슬롯 삭제"
                    >×</span>
                  )}
                </div>
                {isEmpty ? (
                  <div className="slot-empty-label">EMPTY</div>
                ) : (
                  <SlotPreview slot={slot} />
                )}
              </button>
            );
          })}
        </div>

        <button className="slot-close" onClick={onClose}>CLOSE</button>

        {confirming && (
          <ConfirmDialog
            message={`슬롯 ${confirming === 'auto' ? 'AUTO' : confirming}을(를) 덮어쓸까요?`}
            onConfirm={() => {
              const id = confirming;
              setConfirming(null);
              onSelect(id);
            }}
            onCancel={() => setConfirming(null)}
          />
        )}
      </div>
    </div>
  );
}

function SlotPreview({ slot }: { slot: SaveSlot }) {
  const state = slot.state!;
  const preview = state.preview;
  const date = new Date(state.savedAt);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="slot-preview">
      {preview?.bgImage && (
        <img src={preview.bgImage} alt="" className="slot-thumb" />
      )}
      <div className="slot-meta">
        {preview?.chapterTitle && (
          <div className="slot-chapter">{preview.chapterTitle}</div>
        )}
        {preview?.speaker && (
          <div className="slot-speaker">{preview.speaker}</div>
        )}
        {preview?.snippet && (
          <div className="slot-snippet">{preview.snippet}</div>
        )}
        <div className="slot-date">
          {dateStr} · 회차 {state.currentPlaythrough}
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="confirm-btn" onClick={onConfirm}>확인</button>
          <button className="confirm-btn confirm-cancel" onClick={onCancel}>취소</button>
        </div>
      </div>
    </div>
  );
}
