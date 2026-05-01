import type {
  ChapterData,
  SceneNode,
  Choice,
  GlobalState,
  SaveState,
  SavePreview,
  SaveSlotId,
  SaveSlot,
  SettingsState,
  BacklogEntry,
  PlaythroughOverride,
} from '../data/schema';
import { SaveManager } from './SaveManager';

const INITIAL_EMOTION = 100;
const EMOTION_MULTIPLIER_PER_PLAYTHROUGH = 1.5;

export class GameEngine {
  private chapter: ChapterData | null = null;
  private nodeMap: Map<string, SceneNode> = new Map();
  private currentNode: SceneNode | null = null;
  private flags: Record<string, boolean> = {};
  private remainingEmotion: number = INITIAL_EMOTION;
  private backlog: BacklogEntry[] = [];
  private globalState: GlobalState;
  private currentPlaythrough: number;
  private saveManager: SaveManager;
  private gameOverNode: string | null = null;

  constructor() {
    this.saveManager = new SaveManager();
    this.globalState = this.saveManager.loadGlobal();
    this.currentPlaythrough = this.globalState.playthroughCount + 1;
  }

  /** 챕터 로드 */
  loadChapter(chapter: ChapterData): void {
    this.chapter = chapter;
    this.gameOverNode = chapter.gameOverNode ?? null;
    this.nodeMap.clear();
    for (const node of chapter.nodes) {
      this.nodeMap.set(node.id, node);
    }
  }

  /** 현재 챕터 반환 */
  getChapter(): ChapterData | null { return this.chapter; }

  /** 새 게임 시작 */
  startNewGame(): SceneNode | null {
    if (!this.chapter) return null;
    this.flags = {};
    this.remainingEmotion = INITIAL_EMOTION;
    this.backlog = [];
    this.currentPlaythrough = this.globalState.playthroughCount + 1;
    return this.goToNode(this.chapter.startNode);
  }

  /** 세이브 데이터에서 재개 */
  resumeFromSave(save: SaveState): SceneNode | null {
    this.flags = { ...save.flags };
    this.remainingEmotion = save.remainingEmotion;
    this.backlog = [...save.backlog];
    this.currentPlaythrough = save.currentPlaythrough;
    return this.goToNode(save.currentNodeId);
  }

  /** 특정 노드로 이동 */
  goToNode(nodeId: string): SceneNode | null {
    const node = this.nodeMap.get(nodeId);
    if (!node) {
      console.error(`Node not found: ${nodeId}`);
      return null;
    }
    this.currentNode = node;

    // 플래그 설정
    if (node.setFlags) {
      Object.assign(this.flags, node.setFlags);
    }

    // 잔여감정 변화
    if (node.emotionDelta) {
      const multiplier = this.currentPlaythrough >= 2
        ? EMOTION_MULTIPLIER_PER_PLAYTHROUGH
        : 1;
      this.remainingEmotion += node.emotionDelta * multiplier;
      this.remainingEmotion = Math.max(0, Math.min(100, this.remainingEmotion));
    }

    // 백로그 추가 + 읽은 노드 마킹 (빈 텍스트 라우팅 노드는 제외)
    const resolvedText = this.resolveText(node);
    if (resolvedText) {
      this.backlog.push({
        nodeId: node.id,
        speaker: node.speaker,
        text: resolvedText,
      });
      this.markNodeRead(node.id);
    }

    return node;
  }

  /** 노드를 읽은 것으로 마킹 (스킵 모드 가드용). chapter별로 분리 저장. */
  private markNodeRead(nodeId: string): void {
    if (!this.chapter) return;
    const chapterId = this.chapter.id;
    if (!this.globalState.readNodes) this.globalState.readNodes = {};
    if (!this.globalState.readNodes[chapterId]) this.globalState.readNodes[chapterId] = [];
    const arr = this.globalState.readNodes[chapterId];
    if (!arr.includes(nodeId)) {
      arr.push(nodeId);
      this.saveManager.saveGlobal(this.globalState);
    }
  }

  /** 현재 챕터에서 해당 노드를 이전에 읽었는지 */
  isNodeRead(nodeId: string): boolean {
    if (!this.chapter) return false;
    const arr = this.globalState.readNodes?.[this.chapter.id];
    return arr?.includes(nodeId) ?? false;
  }

  /** 다음 노드로 진행 (선택지 없는 경우) */
  advance(): SceneNode | null {
    if (!this.currentNode?.next) return null;

    // 잔여감정 0 → 강제 게임오버 (챕터에 gameOverNode 정의 필요)
    if (this.remainingEmotion <= 0 && this.gameOverNode) {
      return this.goToNode(this.gameOverNode);
    }

    return this.goToNode(this.currentNode.next);
  }

  /** 선택지 선택 */
  selectChoice(choiceIndex: number): SceneNode | null {
    const choices = this.getAvailableChoices();
    const choice = choices[choiceIndex];
    if (!choice) return null;

    // 선택지 플래그 설정
    if (choice.setFlags) {
      Object.assign(this.flags, choice.setFlags);
    }

    // 선택지 감정 변화
    if (choice.emotionDelta) {
      const multiplier = this.currentPlaythrough >= 2
        ? EMOTION_MULTIPLIER_PER_PLAYTHROUGH
        : 1;
      this.remainingEmotion += choice.emotionDelta * multiplier;
      this.remainingEmotion = Math.max(0, Math.min(100, this.remainingEmotion));
    }

    // 잔여감정 0 → 강제 게임오버 (챕터에 gameOverNode 정의 필요)
    if (this.remainingEmotion <= 0 && this.gameOverNode) {
      return this.goToNode(this.gameOverNode);
    }

    return this.goToNode(choice.next);
  }

  /** 현재 노드의 텍스트 해석 (오버라이드 적용) */
  resolveText(node: SceneNode): string {
    const override = this.findActiveOverride(node);
    if (override?.text) return override.text;
    if (override?.appendText) return node.text + override.appendText;
    return node.text;
  }

  /** 현재 노드의 화자 해석 */
  resolveSpeaker(node: SceneNode): string | undefined {
    const override = this.findActiveOverride(node);
    return override?.speaker ?? node.speaker;
  }

  /** 현재 노드의 이펙트 해석 */
  resolveEffect(node: SceneNode): string | undefined {
    const override = this.findActiveOverride(node);
    return override?.effect ?? node.effect;
  }

  /** 현재 노드의 CSS 클래스 해석 */
  resolveCssClass(node: SceneNode): string | undefined {
    const override = this.findActiveOverride(node);
    return override?.cssClass;
  }

  /** 현재 노드의 배경 이미지 해석 (override 우선) */
  resolveBgImage(node: SceneNode): string | undefined {
    const override = this.findActiveOverride(node);
    return override?.bgImage ?? node.bgImage;
  }

  /** 현재 노드의 앰비언트 트랙 해석 (override 우선) */
  resolveAmbient(node: SceneNode): string | undefined {
    const override = this.findActiveOverride(node);
    return override?.ambient ?? node.ambient;
  }

  /** 현재 노드의 효과음 해석 (override 우선) */
  resolveSound(node: SceneNode): string | undefined {
    const override = this.findActiveOverride(node);
    return override?.sound ?? node.sound;
  }

  /** 활성 오버라이드 찾기 */
  private findActiveOverride(node: SceneNode): PlaythroughOverride | undefined {
    if (!node.overrides) return undefined;

    // 가장 높은 회차의 매칭 오버라이드 선택
    return node.overrides
      .filter(o => {
        if (this.currentPlaythrough < o.minPlaythrough) return false;
        if (o.requiredEndings?.some(e => !this.globalState.endingsReached.includes(e))) return false;
        if (o.requiredFlags?.some(f => !this.flags[f])) return false;
        return true;
      })
      .sort((a, b) => b.minPlaythrough - a.minPlaythrough)[0];
  }

  /** 표시 가능한 선택지 필터링 */
  getAvailableChoices(): Choice[] {
    if (!this.currentNode?.choices) return [];

    return this.currentNode.choices.filter(choice => {
      if (!choice.condition) return true;
      const { flag, notFlag, minPlaythrough } = choice.condition;
      if (flag && !this.flags[flag]) return false;
      if (notFlag && this.flags[notFlag]) return false;
      if (minPlaythrough && this.currentPlaythrough < minPlaythrough) return false;
      return true;
    });
  }

  /** 엔딩 도달 처리 */
  reachEnding(endingId: string): void {
    if (!this.globalState.endingsReached.includes(endingId)) {
      this.globalState.endingsReached.push(endingId);
    }
    this.globalState.playthroughCount++;
    this.saveManager.saveGlobal(this.globalState);
  }

  /** 현재 상태로 SaveState 빌드 (preview 포함) */
  private buildSaveState(): SaveState | null {
    if (!this.currentNode || !this.chapter) return null;
    const text = this.resolveText(this.currentNode);
    const speaker = this.resolveSpeaker(this.currentNode);
    const bgImage = this.resolveBgImage(this.currentNode);
    const preview: SavePreview = {
      chapterTitle: this.chapter.title,
      snippet: text.replace(/\n/g, ' ').slice(0, 80),
      bgImage,
      speaker,
    };
    return {
      version: 1,
      currentNodeId: this.currentNode.id,
      chapterId: this.chapter.id,
      flags: { ...this.flags },
      remainingEmotion: this.remainingEmotion,
      currentPlaythrough: this.currentPlaythrough,
      backlog: [...this.backlog],
      savedAt: new Date().toISOString(),
      preview,
    };
  }

  /** 자동저장 (매 노드 진행 시) */
  save(): void {
    const state = this.buildSaveState();
    if (state) this.saveManager.saveCurrent(state);
  }

  /** 자동저장 슬롯 로드 */
  load(): SaveState | null {
    return this.saveManager.loadCurrent();
  }

  /** 자동저장 슬롯 존재 여부 */
  hasSave(): boolean {
    return this.saveManager.loadCurrent() !== null;
  }

  /** 자동저장 슬롯 삭제 (엔딩 도달 시) */
  clearSave(): void {
    this.saveManager.deleteCurrent();
  }

  /** 특정 슬롯에 명시 저장 */
  saveToSlot(id: SaveSlotId): boolean {
    const state = this.buildSaveState();
    if (!state) return false;
    this.saveManager.saveSlot(id, state);
    return true;
  }

  /** 특정 슬롯에서 로드 */
  loadFromSlot(id: SaveSlotId): SaveState | null {
    return this.saveManager.loadSlot(id);
  }

  /** 특정 슬롯 삭제 */
  deleteSlot(id: SaveSlotId): void {
    this.saveManager.deleteSlot(id);
  }

  /** 모든 슬롯 메타 (UI 표시용) */
  listSlots(): SaveSlot[] {
    return this.saveManager.listSlots();
  }

  /** 사용자 설정 로드 */
  loadSettings(): SettingsState {
    return this.saveManager.loadSettings();
  }

  /** 사용자 설정 저장 */
  saveSettings(state: SettingsState): void {
    this.saveManager.saveSettings(state);
  }

  // Getters
  getCurrentNode(): SceneNode | null { return this.currentNode; }
  getFlags(): Record<string, boolean> { return { ...this.flags }; }
  getRemainingEmotion(): number { return this.remainingEmotion; }
  getBacklog(): BacklogEntry[] { return [...this.backlog]; }
  getPlaythroughCount(): number { return this.globalState.playthroughCount; }
  getCurrentPlaythrough(): number { return this.currentPlaythrough; }
  getGlobalState(): GlobalState { return { ...this.globalState }; }
  isEnding(): boolean { return !!this.currentNode?.endingId; }
}
