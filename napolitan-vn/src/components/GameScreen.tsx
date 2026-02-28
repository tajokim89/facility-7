import { useState, useCallback, useMemo, useEffect } from 'react';
import { GameEngine } from '../engine/GameEngine';
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
    if (!resolvedText && node.choices && node.choices.length > 0) {
      // 조건에 맞는 첫 번째 선택지로 자동 이동
      const available = engine.getAvailableChoices();
      if (available.length > 0) {
        const next = engine.selectChoice(0);
        if (next) {
          updateState(next);
          return;
        }
      }
    }

    // 선택지 표시 여부
    const choices = engine.getAvailableChoices();
    setShowChoices(choices.length > 0);

    // 엔딩 체크
    if (node.endingId) {
      engine.reachEnding(node.endingId);
    }
  }, [engine]);

  const handleNewGame = useCallback(() => {
    engine.loadChapter(chapter1);
    const node = engine.startNewGame();
    setScreen('game');
    updateState(node);
  }, [engine, updateState]);

  const handleContinue = useCallback(() => {
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

    // 엔딩 도달 시
    if (currentNode.endingId) {
      setEndingText(engine.resolveText(currentNode));
      setScreen('ending');
      return;
    }

    // 선택지가 있으면 무시 (ChoicePanel에서 처리)
    if (showChoices) return;

    const next = engine.advance();
    if (next) {
      engine.save();
      updateState(next);
    }
  }, [engine, currentNode, showChoices, updateState]);

  const handleChoice = useCallback((index: number) => {
    const next = engine.selectChoice(index);
    if (next) {
      setShowChoices(false);
      engine.save();
      updateState(next);
    }
  }, [engine, updateState]);

  const handleReturnToTitle = useCallback(() => {
    setScreen('title');
    setCurrentNode(null);
    setShowChoices(false);
  }, []);

  // 백로그 토글 (L키)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'l' || e.key === 'L') {
        if (screen === 'game') setShowBacklog(v => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen]);

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
