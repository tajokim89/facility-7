import './EmotionGauge.css';

interface Props {
  value: number; // 0~100
}

export default function EmotionGauge({ value }: Props) {
  const level = value > 60 ? 'full' : value > 30 ? 'mid' : value > 0 ? 'low' : 'empty';

  return (
    <div className="emotion-gauge">
      <div className="emotion-label">R.E.</div>
      <div className="emotion-bar-bg">
        <div
          className={`emotion-bar-fill emotion-${level}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="emotion-value">{Math.round(value)}</div>
    </div>
  );
}
