import { useEffect } from 'react';
import type { SettingsState } from '../data/schema';
import './SettingsPanel.css';

interface Props {
  settings: SettingsState;
  onChange: (next: SettingsState) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onChange, onClose }: Props) {
  // ESC로 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const update = (patch: Partial<SettingsState>) => {
    onChange({ ...settings, ...patch });
  };

  // 슬라이더 표시값: textSpeedMs는 역방향(0=느림, 80=즉시)이라 뒤집어 표시
  const speedSliderValue = 80 - Math.min(80, settings.textSpeedMs);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <h2>SETTINGS</h2>

        <div className="settings-row">
          <div className="settings-row-header">
            <span className="settings-label">텍스트 속도</span>
            <span className="settings-value">
              {settings.textSpeedMs <= 0 ? '즉시' : `${settings.textSpeedMs}ms`}
            </span>
          </div>
          <input
            type="range" min={0} max={80} step={5} value={speedSliderValue}
            onChange={e => update({ textSpeedMs: 80 - parseInt(e.target.value, 10) })}
          />
          <div className="settings-row-labels">
            <span>느림</span>
            <span>즉시</span>
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-row-header">
            <span className="settings-label">BGM 볼륨</span>
            <span className="settings-value">{Math.round(settings.bgmVolume * 100)}</span>
          </div>
          <input
            type="range" min={0} max={100} value={Math.round(settings.bgmVolume * 100)}
            onChange={e => update({ bgmVolume: parseInt(e.target.value, 10) / 100 })}
          />
        </div>

        <div className="settings-row">
          <div className="settings-row-header">
            <span className="settings-label">효과음 볼륨</span>
            <span className="settings-value">{Math.round(settings.sfxVolume * 100)}</span>
          </div>
          <input
            type="range" min={0} max={100} value={Math.round(settings.sfxVolume * 100)}
            onChange={e => update({ sfxVolume: parseInt(e.target.value, 10) / 100 })}
          />
        </div>

        <div className="settings-row">
          <div className="settings-row-header">
            <span className="settings-label">자동 진행 대기</span>
            <span className="settings-value">{(settings.autoSpeedMs / 1000).toFixed(1)}s</span>
          </div>
          <input
            type="range" min={500} max={5000} step={250} value={settings.autoSpeedMs}
            onChange={e => update({ autoSpeedMs: parseInt(e.target.value, 10) })}
          />
          <div className="settings-row-labels">
            <span>짧음</span>
            <span>긺</span>
          </div>
        </div>

        <button className="settings-close" onClick={onClose}>CLOSE</button>
      </div>
    </div>
  );
}
