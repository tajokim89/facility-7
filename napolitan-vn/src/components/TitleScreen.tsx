import './TitleScreen.css';

interface Props {
  playthroughCount: number;
  hasSave: boolean;
  onNewGame: () => void;
  onContinue: () => void;
}

export default function TitleScreen({ playthroughCount, hasSave, onNewGame, onContinue }: Props) {
  const isReplay = playthroughCount > 0;

  return (
    <div className="title-screen">
      <div className="title-inner">
        <div className="title-content">
          <h1 className="title-main">
            {isReplay ? (
              <>Remaining<br /><span className="title-accent">Emotions</span></>
            ) : (
              <>감정 처리 시설<br /><span className="title-accent">7구역</span></>
            )}
          </h1>
          <p className="title-sub">
            {isReplay
              ? '관찰자 감정 로그 — 재관찰을 권장합니다.'
              : 'Emotion Processing Institute — Sector 7'}
          </p>
        </div>

        <div className="title-menu">
          <button className="title-button" onClick={onNewGame}>
            {isReplay ? 'Re:Observe' : 'New Game'}
          </button>
          {hasSave && (
            <button className="title-button" onClick={onContinue}>
              Continue
            </button>
          )}
        </div>
      </div>

      {playthroughCount > 0 && (
        <div className="title-playthrough">
          관찰 기록: {playthroughCount}회 완료
        </div>
      )}

      <div className="title-warning">
        이 게임에는 공포 연출이 포함되어 있습니다.
      </div>
    </div>
  );
}
