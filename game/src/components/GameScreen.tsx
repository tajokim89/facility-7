import { useState, useCallback, useMemo, useEffect } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { audioManager } from '../engine/AudioManager';
import type { SceneNode } from '../data/schema';
import chapter1 from '../data/chapter1';
import DialogueBox from './DialogueBox';
import ChoicePanel from './ChoicePanel';
import EmotionGauge from './EmotionGauge';
import BacklogView from './BacklogView';
import EffectLayer from './EffectLayer';
import TitleScreen from './TitleScreen';
import './GameScreen.css';

type Screen = 'title' | 'game' | 'ending';

export default function GameScreen() {
  const engine = useMemo(() => new GameEngine(), []);
  const [screen, setScreen] = useState<Screen>('title');
  const [currentNode, setCurrentNode] = useState<SceneNode | null>(null);
  const [emotion, setEmotion] = useState(100);
  const [showBacklog, setShowBacklog] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [effectKey, setEffectKey] = useState(0);
  const [endingText, setEndingText] = useState('');

  const updateState = useCallback((node: SceneNode | null) => {
    if (!node) return;
    setCurrentNode(node);
    setEmotion(engine.getRemainingEmotion());
    setEffectKey(k => k + 1);

    // 빈 텍스트 노드(분기 체크용)는 자동 처리
    const resolvedText = engine.resolveText(node);
    if (!resolvedText) {
      const available = engine.getAvailableChoices();
      if (available.length > 0) {
        // 조건 맞는 첫 번째 선택지로 자동 이동
        const next = engine.selectChoice(0);
        if (next) { updateState(next); return; }
      } else if (node.next) {
        // 선택지가 모두 필터링됐거나 없으면 next로 자동 진행
        const next = engine.advance();
        if (next) { updateState(next); return; }
      }
    }

    // 효과음 재생
    if (node.sound === 'doorOpen') audioManager.playDoorOpen();

    // 배경 앰비언트 전환
    if (node.ambient) audioManager.playAmbient(node.ambient);

    const choices = engine.getAvailableChoices();
    setShowChoices(choices.length > 0);

    if (node.endingId) {
      engine.reachEnding(node.endingId);
    }
  }, [engine]);

  const handleNewGame = useCallback(() => {
    audioManager.resume();
    audioManager.playAmbient('facility');
    engine.loadChapter(chapter1);
    const node = engine.startNewGame();
    setScreen('game');
    updateState(node);
  }, [engine, updateState]);

  const handleContinue = useCallback(() => {
    audioManager.resume();
    audioManager.playAmbient('facility');
    engine.loadChapter(chapter1);
    const save = engine.load();
    if (save) {
      const node = engine.resumeFromSave(save);
      setScreen('game');
      updateState(node);
    }
  }, [engine, updateState]);

  const handleAdvance = useCallback(() => {
    if (!currentNode) return;

    if (currentNode.endingId) {
      audioManager.stopAmbient();
      setEndingText(engine.resolveText(currentNode));
      setScreen('ending');
      return;
    }

    if (showChoices) return;

    audioManager.playClick();
    const next = engine.advance();
    if (next) {
      engine.save();
      updateState(next);
    }
  }, [engine, currentNode, showChoices, updateState]);

  const handleChoice = useCallback((index: number) => {
    audioManager.playChoiceSelect();
    const next = engine.selectChoice(index);
    if (next) {
      setShowChoices(false);
      engine.save();
      updateState(next);
    }
  }, [engine, updateState]);

  const handleReturnToTitle = useCallback(() => {
    audioManager.stopAmbient();
    setScreen('title');
    setCurrentNode(null);
    setShowChoices(false);
  }, []);

  // 키보드 단축키
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (screen !== 'game') return;

      // 백로그 토글 (L키)
      if (e.key === 'l' || e.key === 'L') {
        setShowBacklog(v => !v);
        return;
      }

      // 숫자키로 선택지 선택 (1~4)
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 4 && showChoices) {
        handleChoice(num - 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen, showChoices, handleChoice]);

  // --- 렌더링 ---

  if (screen === 'title') {
    return (
      <TitleScreen
        playthroughCount={engine.getPlaythroughCount()}
        hasSave={engine.hasSave()}
        onNewGame={handleNewGame}
        onContinue={handleContinue}
      />
    );
  }

  if (screen === 'ending') {
    return (
      <div className="ending-screen">
        <div className="ending-text">{endingText}</div>
        <button className="ending-button" onClick={handleReturnToTitle}>
          {engine.getPlaythroughCount() >= 1 ? 'Re:Observe' : 'Return'}
        </button>
        {engine.getPlaythroughCount() === 1 && (
          <div className="ending-hint">
            관찰자 감정 로그 — 1회차 분석 완료. 재관찰을 권장합니다.
          </div>
        )}
      </div>
    );
  }

  if (!currentNode) return null;

  const resolvedText = engine.resolveText(currentNode);
  const resolvedSpeaker = engine.resolveSpeaker(currentNode);
  const resolvedEffect = engine.resolveEffect(currentNode);
  const resolvedCss = engine.resolveCssClass(currentNode);

  return (
    <div className={`game-screen ${currentNode.bgClass ?? ''}`}>
      <EffectLayer effect={resolvedEffect} key={effectKey}>
        <div className="game-viewport">
          <EmotionGauge value={emotion} />

          <div className="game-toolbar">
            <button className="toolbar-btn" onClick={() => setShowBacklog(true)}>
              LOG
            </button>
            <button className="toolbar-btn" onClick={() => engine.save()}>
              SAVE
            </button>
          </div>

          {showChoices ? (
            <ChoicePanel
              choices={engine.getAvailableChoices()}
              onSelect={handleChoice}
            />
          ) : null}

          {resolvedText && (
            <DialogueBox
              speaker={resolvedSpeaker}
              text={resolvedText}
              cssClass={resolvedCss}
              onComplete={handleAdvance}
            />
          )}
        </div>
      </EffectLayer>

      {showBacklog && (
        <BacklogView
          entries={engine.getBacklog()}
          onClose={() => setShowBacklog(false)}
        />
      )}
    </div>
  );
}
