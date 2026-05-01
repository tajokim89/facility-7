import './TitleScreen.css';

interface Props {
  playthroughCount: number;
  hasSave: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onLoad: () => void;
  onChapterSelect: () => void;
  onEndingGallery: () => void;
  onSettings: () => void;
}

export default function TitleScreen({
  playthroughCount, hasSave,
  onNewGame, onContinue, onLoad, onChapterSelect, onEndingGallery, onSettings,
}: Props) {
  const isReplay = playthroughCount > 0;
  const bgImage = isReplay
    ? '/images/chapter1/TITLE_GLITCH.png'
    : '/images/chapter1/TITLE_NORMAL.png';

  return (
    <div
      className="title-screen"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
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
          <button className="title-button" onClick={onLoad}>
            Load
          </button>
          <button className="title-button" onClick={onChapterSelect}>
            Chapter Select
          </button>
          {isReplay && (
            <button className="title-button" onClick={onEndingGallery}>
              Endings
            </button>
          )}
          <button className="title-button" onClick={onSettings}>
            Settings
          </button>
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
