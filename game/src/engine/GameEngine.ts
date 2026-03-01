import type {
  ChapterData,
  SceneNode,
  Choice,
  GlobalState,
  SaveState,
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

  constructor() {
    this.saveManager = new SaveManager();
    this.globalState = this.saveManager.loadGlobal();
    this.currentPlaythrough = this.globalState.playthroughCount + 1;
  }

  /** 챕터 로드 */
  loadChapter(chapter: ChapterData): void {
    this.chapter = chapter;
    this.nodeMap.clear();
    for (const node of chapter.nodes) {
      this.nodeMap.set(node.id, node);
    }
  }

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

    // 백로그 추가 (빈 텍스트 라우팅 노드는 제외)
    const resolvedText = this.resolveText(node);
    if (resolvedText) {
      this.backlog.push({
        nodeId: node.id,
        speaker: node.speaker,
        text: resolvedText,
      });
    }

    return node;
  }

  /** 다음 노드로 진행 (선택지 없는 경우) */
  advance(): SceneNode | null {
    if (!this.currentNode?.next) return null;

    // 잔여감정 0 → 강제 게임오버
    if (this.remainingEmotion <= 0) {
      return this.goToNode('ending_empty');
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

    // 잔여감정 0 → 강제 게임오버
    if (this.remainingEmotion <= 0) {
      return this.goToNode('ending_empty');
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

  /** 현재 상태를 세이브 */
  save(): void {
    if (!this.currentNode || !this.chapter) return;
    const saveState: SaveState = {
      version: 1,
      currentNodeId: this.currentNode.id,
      chapterId: this.chapter.id,
      flags: { ...this.flags },
      remainingEmotion: this.remainingEmotion,
      currentPlaythrough: this.currentPlaythrough,
      backlog: [...this.backlog],
      savedAt: new Date().toISOString(),
    };
    this.saveManager.saveCurrent(saveState);
  }

  /** 세이브 로드 */
  load(): SaveState | null {
    return this.saveManager.loadCurrent();
  }

  /** 세이브 존재 여부 */
  hasSave(): boolean {
    return this.saveManager.loadCurrent() !== null;
  }

  /** 현재 세이브 삭제 (엔딩 도달 시) */
  clearSave(): void {
    this.saveManager.deleteCurrent();
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
