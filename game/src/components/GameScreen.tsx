import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { audioManager } from '../engine/AudioManager';
import type { ChapterData, SceneNode, SettingsState, SaveSlotId, SaveSlot } from '../data/schema';
import { getChapterRegistry, getFirstChapter } from '../data/chapters';
import DialogueBox, { type DialogueBoxHandle } from './DialogueBox';
import ChoicePanel from './ChoicePanel';
import EmotionGauge from './EmotionGauge';
import BacklogView from './BacklogView';
import EffectLayer from './EffectLayer';
import TitleScreen from './TitleScreen';
import SettingsPanel from './SettingsPanel';
import SaveSlotPanel, { type SaveSlotMode } from './SaveSlotPanel';
import ChapterSelectPanel from './ChapterSelectPanel';
import EndingGalleryPanel from './EndingGalleryPanel';
import './GameScreen.css';

type Screen = 'title' | 'game' | 'ending';

export default function GameScreen() {
  const engine = useMemo(() => new GameEngine(), []);
  const [screen, setScreen] = useState<Screen>('title');
  const [currentNode, setCurrentNode] = useState<SceneNode | null>(null);
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [emotion, setEmotion] = useState(100);
  const [showBacklog, setShowBacklog] = useState(false);
  const [showChoices, setShowChoices] = useState(false);
  const [effectKey, setEffectKey] = useState(0);
  const [endingText, setEndingText] = useState('');
  const [endingId, setEndingId] = useState('');
  // 배경 이미지 크로스페이드용. prev는 페이드 아웃 중인 직전 이미지, current는 현재 표시.
  const [bg, setBg] = useState<{ prev?: string; current?: string }>({});
  const [settings, setSettings] = useState<SettingsState>(() => engine.loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [skipHeld, setSkipHeld] = useState(false);   // Ctrl 누르고 있는 동안
  const [skipToggle, setSkipToggle] = useState(false); // SKIP 버튼/단축키 토글
  const [autoMode, setAutoMode] = useState(false);
  const skipMode = skipHeld || skipToggle;
  const [slotMode, setSlotMode] = useState<SaveSlotMode | null>(null);
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [showChapterSelect, setShowChapterSelect] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const dialogueRef = useRef<DialogueBoxHandle>(null);

  const updateState = useCallback((initialNode: SceneNode | null) => {
    let node = initialNode;
    while (node) {
      setCurrentNode(node);
      setEmotion(engine.getRemainingEmotion());
      setEffectKey(k => k + 1);

      // 노드에 bgImage가 있으면 갱신(크로스페이드), 없으면 직전 이미지 유지
      const bgImage = engine.resolveBgImage(node);
      if (bgImage !== undefined) {
        setBg(curr => curr.current === bgImage ? curr : { prev: curr.current, current: bgImage });
      }

      // 빈 텍스트 노드(분기 체크용)는 자동 처리 — 루프로 처리해 재귀 제거
      const resolvedText = engine.resolveText(node);
      if (!resolvedText) {
        const available = engine.getAvailableChoices();
        if (available.length > 0) {
          node = engine.selectChoice(0);
          continue;
        } else if (node.next) {
          node = engine.advance();
          continue;
        }
      }

      const sound = engine.resolveSound(node);
      if (sound) audioManager.playSound(sound);
      const ambient = engine.resolveAmbient(node);
      if (ambient) audioManager.playAmbient(ambient);

      const choices = engine.getAvailableChoices();
      setShowChoices(choices.length > 0);

      if (node.endingId) {
        engine.reachEnding(node.endingId);
      }

      // 선택지나 엔딩에 도달하면 자동/스킵 모드 해제 (사용자 입력 필요)
      if (choices.length > 0 || node.endingId) {
        setAutoMode(false);
        setSkipToggle(false);
      }
      break;
    }
  }, [engine]);

  const handleNewGame = useCallback(async () => {
    audioManager.resume();
    const reg = getFirstChapter();
    const data = await reg.load();
    setChapter(data);
    engine.loadChapter(data);
    const node = engine.startNewGame();
    audioManager.setPlaythrough(engine.getCurrentPlaythrough());
    audioManager.playAmbient('facility');
    setScreen('game');
    updateState(node);
  }, [engine, updateState]);

  const handleChapterStart = useCallback(async (chapterId: string) => {
    audioManager.resume();
    const reg = getChapterRegistry(chapterId) ?? getFirstChapter();
    const data = await reg.load();
    setChapter(data);
    engine.loadChapter(data);
    const node = engine.startNewGame();
    audioManager.setPlaythrough(engine.getCurrentPlaythrough());
    audioManager.playAmbient('facility');
    setScreen('game');
    setShowChapterSelect(false);
    updateState(node);
  }, [engine, updateState]);

  const handleContinue = useCallback(async () => {
    audioManager.resume();
    const save = engine.load();
    if (!save) return;
    const reg = getChapterRegistry(save.chapterId) ?? getFirstChapter();
    const data = await reg.load();
    setChapter(data);
    engine.loadChapter(data);
    const node = engine.resumeFromSave(save);
    audioManager.setPlaythrough(engine.getCurrentPlaythrough());
    audioManager.playAmbient('facility');
    setScreen('game');
    updateState(node);
  }, [engine, updateState]);

  const handleAdvance = useCallback(() => {
    if (!currentNode) return;

    // 타이핑 중이면 즉시 완료 (전체 텍스트 표시 후 한 번 더 클릭해야 진행)
    if (dialogueRef.current?.isTyping()) {
      dialogueRef.current.skipTyping();
      return;
    }

    if (currentNode.endingId) {
      audioManager.stopAmbient();
      engine.clearSave();
      setEndingText(engine.resolveText(currentNode));
      setEndingId(currentNode.endingId);
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'game') return;

      // 백로그 토글 (L키)
      if (e.key === 'l' || e.key === 'L') {
        setShowBacklog(v => !v);
        return;
      }

      // Ctrl 누르는 동안 스킵 (held)
      if (e.key === 'Control' && !e.repeat) {
        setSkipHeld(true);
        return;
      }

      // A 키: 오토 모드 토글
      if (e.key === 'a' || e.key === 'A') {
        setAutoMode(v => !v);
        return;
      }

      // 숫자키로 선택지 선택 (1~4)
      const num = parseInt(e.key);
      if (!isNaN(num) && num >= 1 && num <= 4 && showChoices) {
        handleChoice(num - 1);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') setSkipHeld(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [screen, showChoices, handleChoice]);

  // 설정값을 오디오 매니저에 반영
  useEffect(() => {
    audioManager.setBgmVolume(settings.bgmVolume);
    audioManager.setSfxVolume(settings.sfxVolume);
  }, [settings.bgmVolume, settings.sfxVolume]);

  // 다음 노드 후보들의 bgImage를 미리 fetch (브라우저 캐시에 적재)
  useEffect(() => {
    if (!currentNode) return;
    const nextBgs = engine.getNextBgImages();
    nextBgs.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, [currentNode, engine]);

  // 스킵 모드 자동 advance — 읽은 노드만 빠르게 진행, 못 본 노드 도달 시 정지
  const skipActive = skipMode && !!currentNode && !showChoices && !currentNode?.endingId;
  useEffect(() => {
    if (!skipActive || !currentNode) return;
    const timer = window.setTimeout(() => {
      if (!engine.isNodeRead(currentNode.id)) {
        // 못 본 노드 — 토글로 켠 경우 해제, Ctrl held는 keyup으로 자동 해제됨
        setSkipToggle(false);
        return;
      }
      const next = engine.advance();
      if (next) {
        engine.save();
        updateState(next);
      }
    }, 30);
    return () => clearTimeout(timer);
  }, [skipActive, currentNode, engine, updateState]);

  const handleSettingsChange = useCallback((next: SettingsState) => {
    setSettings(next);
    engine.saveSettings(next);
  }, [engine]);

  const openSlotPanel = useCallback((mode: SaveSlotMode) => {
    setSlots(engine.listSlots());
    setSlotMode(mode);
  }, [engine]);

  const handleSlotSelect = useCallback(async (id: SaveSlotId) => {
    if (slotMode === 'save') {
      const ok = engine.saveToSlot(id);
      if (ok) {
        setSlots(engine.listSlots()); // 모달 유지하면서 갱신
      }
      setSlotMode(null);
      return;
    }
    // load 모드
    const save = engine.loadFromSlot(id);
    if (!save) return;
    audioManager.resume();
    const reg = getChapterRegistry(save.chapterId) ?? getFirstChapter();
    const data = await reg.load();
    setChapter(data);
    engine.loadChapter(data);
    const node = engine.resumeFromSave(save);
    audioManager.setPlaythrough(engine.getCurrentPlaythrough());
    audioManager.playAmbient('facility');
    setScreen('game');
    setSlotMode(null);
    updateState(node);
  }, [engine, slotMode, updateState]);

  const handleSlotDelete = useCallback((id: SaveSlotId) => {
    engine.deleteSlot(id);
    setSlots(engine.listSlots());
  }, [engine]);

  // --- 렌더링 ---

  const settingsModal = showSettings && (
    <SettingsPanel
      settings={settings}
      onChange={handleSettingsChange}
      onClose={() => setShowSettings(false)}
    />
  );

  const slotModal = slotMode && (
    <SaveSlotPanel
      slots={slots}
      mode={slotMode}
      onSelect={handleSlotSelect}
      onDelete={handleSlotDelete}
      onClose={() => setSlotMode(null)}
    />
  );

  const endingsReached = engine.getGlobalState().endingsReached;
  const chapterSelectModal = showChapterSelect && (
    <ChapterSelectPanel
      endingsReached={endingsReached}
      onSelect={handleChapterStart}
      onClose={() => setShowChapterSelect(false)}
    />
  );

  const galleryModal = showGallery && (
    <EndingGalleryPanel
      endingsReached={endingsReached}
      onClose={() => setShowGallery(false)}
    />
  );

  if (screen === 'title') {
    return (
      <>
        <TitleScreen
          playthroughCount={engine.getPlaythroughCount()}
          hasSave={engine.hasSave()}
          onNewGame={handleNewGame}
          onContinue={handleContinue}
          onLoad={() => openSlotPanel('load')}
          onChapterSelect={() => setShowChapterSelect(true)}
          onEndingGallery={() => setShowGallery(true)}
          onSettings={() => setShowSettings(true)}
        />
        {settingsModal}
        {slotModal}
        {chapterSelectModal}
        {galleryModal}
      </>
    );
  }

  if (screen === 'ending') {
    const endingLabel = chapter?.endings?.[endingId]?.label ?? endingId;
    const playthroughCount = engine.getPlaythroughCount();
    return (
      <>
        <div className="ending-screen">
          {endingId && (
            <div className="ending-label">{endingLabel}</div>
          )}
          <div className="ending-text">{endingText}</div>
          <button className="ending-button" onClick={handleReturnToTitle}>
            {playthroughCount >= 1 ? 'Re:Observe' : 'Return'}
          </button>
          {playthroughCount === 1 && (
            <div className="ending-hint">
              관찰자 감정 로그 — 1회차 분석 완료. 재관찰을 권장합니다.
            </div>
          )}
        </div>
        {settingsModal}
        {slotModal}
      </>
    );
  }

  if (!currentNode) return null;

  const resolvedText = engine.resolveText(currentNode);
  const resolvedSpeaker = engine.resolveSpeaker(currentNode);
  const resolvedEffect = engine.resolveEffect(currentNode);
  const resolvedCss = engine.resolveCssClass(currentNode);

  return (
    <div className={`game-screen ${currentNode.bgClass ?? ''}`}>
      {bg.prev && (
        <img
          key={`prev-${bg.prev}`}
          src={bg.prev}
          alt=""
          className="scene-bg scene-bg-fading"
          onAnimationEnd={() => setBg(curr => ({ ...curr, prev: undefined }))}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      {bg.current && (
        <img
          key={`cur-${bg.current}`}
          src={bg.current}
          alt=""
          className="scene-bg scene-bg-current"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      {(bg.current || bg.prev) && <div className="scene-bg-overlay" />}
      <EffectLayer effect={resolvedEffect} key={effectKey}>
        <div
          className="game-viewport"
          onClick={(e) => {
            // 빈 영역(이미지/배경) 클릭 → 진행. 자식(툴바, 대사상자, 선택지)는 자체 핸들러 사용.
            if (e.target === e.currentTarget) handleAdvance();
          }}
        >
          <EmotionGauge value={emotion} />

          <div className="game-toolbar">
            <button className="toolbar-btn" onClick={() => setShowBacklog(true)}>
              LOG
            </button>
            <button className="toolbar-btn" onClick={() => openSlotPanel('save')}>
              SAVE
            </button>
            <button className="toolbar-btn" onClick={() => openSlotPanel('load')}>
              LOAD
            </button>
            <button
              className={`toolbar-btn ${skipToggle ? 'toolbar-btn-active' : ''}`}
              onClick={() => setSkipToggle(v => !v)}
              title="Ctrl로 누른 동안 빠르게 진행 (읽은 부분만)"
            >
              SKIP
            </button>
            <button
              className={`toolbar-btn ${autoMode ? 'toolbar-btn-active' : ''}`}
              onClick={() => setAutoMode(v => !v)}
              title="A 키로 토글. 자동 진행."
            >
              AUTO
            </button>
            <button className="toolbar-btn" onClick={() => setShowSettings(true)}>
              SETTINGS
            </button>
          </div>

          {(skipMode || autoMode) && (
            <div className="mode-indicator">
              {skipMode && <span className="mode-badge mode-skip">▸▸ SKIP</span>}
              {autoMode && <span className="mode-badge mode-auto">▸ AUTO</span>}
            </div>
          )}

          {showChoices ? (
            <ChoicePanel
              choices={engine.getAvailableChoices()}
              onSelect={handleChoice}
            />
          ) : null}

          {resolvedText && (
            <DialogueBox
              ref={dialogueRef}
              key={currentNode.id}
              speaker={resolvedSpeaker}
              text={resolvedText}
              cssClass={resolvedCss}
              onComplete={handleAdvance}
              textSpeedMs={skipMode ? 0 : settings.textSpeedMs}
              autoMode={autoMode && !showChoices && !currentNode.endingId}
              autoSpeedMs={settings.autoSpeedMs}
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

      {settingsModal}
      {slotModal}
    </div>
  );
}
