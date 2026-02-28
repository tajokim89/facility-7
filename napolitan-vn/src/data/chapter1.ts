import type { ChapterData } from './schema';

const chapter1: ChapterData = {
  id: 'chapter1',
  title: '첫 출근',
  startNode: 'S01',
  nodes: [
    // === ACT 1: 도착 ===
    {
      id: 'S01',
      text: '태블릿이 부팅된다.\n\n「관찰자 등록 완료. 감정 처리 시설 7구역 배치.」',
      next: 'S02',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n화면 하단에 "잔여 감정: 측정 중..."이라는 문구가 0.5초간 깜빡이다 사라졌다.',
        effect: 'glitch',
      }],
    },
    {
      id: 'S02',
      text: '엘리베이터가 내려간다. B7... B8... B9...\n\n숫자가 커질수록 형광등 빛이 희미해진다.',
      next: 'S03',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n층수 표시 옆으로, "S-042"라는 코드가 겹쳐 보인 것 같았다.',
      }],
    },
    {
      id: 'S03',
      speaker: '한서진',
      text: '어서 오세요. 오늘부터 7구역에서 근무하시는 분이죠?\n\n저는 한서진, 선임 관찰자예요. 편하게 해요.',
      next: 'S04',
      ambient: 'facility',
    },
    {
      id: 'S04',
      speaker: '한서진',
      text: 'A구역은 기초 감정 추출실이에요. 분노, 기쁨, 권태 같은 것들.\nB구역은 정밀 추출. 그리움의 잔향이나 예감 같은 미세한 감정을 다루죠.\n\nC구역은 냉동 창고, D구역은 분리 재가공.',
      next: 'S05',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n"F구역하고 G구역도 있는데... 아직 몰라도 돼요."',
        speaker: '한서진',
      }],
    },
    {
      id: 'S05',
      speaker: '한서진',
      text: '여기엔 세 가지 규칙이 있어요. 반드시 지켜야 해요.\n\n하나, 대상자와 사적 접촉 금지.\n둘, 업무 중 감정 개입 금지.\n셋, 기록은 객관적으로. 주관적 판단은 오류로 간주.',
      next: 'S06',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n한서진이 잠깐 멈칫했다. 마치 무언가를 더 말하려다 삼킨 것처럼.',
      }],
    },
    {
      id: 'S06',
      text: '로커룸. 관찰자 유니폼으로 갈아입는다.\n옆 로커 몇 개가 비어 있다. 이름표가 떼어진 자리만 남아 있었다.',
      next: 'S07',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n비어 있는 로커 하나에 작은 라벨이 붙어 있었다.\n「관찰자 #041 — 처리 완료」',
        effect: 'colorShift',
      }],
    },
    {
      id: 'S07',
      text: 'A구역. 하얀 벽, 하얀 바닥. 무균실처럼 정돈된 공간.\n\n중앙에 투명한 관(Canal)이 연결된 의자가 하나 놓여 있다.',
      next: 'S08',
      sound: 'doorOpen',
      ambient: 'sector_a',
    },
    {
      id: 'S08',
      speaker: '한서진',
      text: '태블릿으로 대상자 상태를 모니터링하면 돼요.\n체크리스트 작성하고, 수치 기록하고, 이상 있으면 보고.\n\n간단하죠?',
      next: 'S09',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n태블릿 메뉴에 "자가 진단"이라는 항목이 회색으로 잠겨 있는 게 보였다.',
      }],
    },

    // === ACT 2: 첫 업무 ===
    {
      id: 'S09',
      text: '첫 번째 대상자가 들어왔다.\n\n중년 남성. 번호 #117. 무표정한 얼굴.\n의자에 앉자 관이 자동으로 연결되었다.',
      next: 'S10',
    },
    {
      id: 'S10',
      text: '추출이 시작된다. 희미한 회색 액체가 관을 타고 흘러내린다.\n\n태블릿 화면: 「감정 유형: 권태 / 농도: 0.34 / 상태: 정상」',
      next: 'S11',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n...액체의 색이 유니폼 안쪽 안감과 같은 색이라는 걸 알아차렸다.',
      }],
    },
    {
      id: 'S11',
      speaker: '대상자 #117',
      text: '......밖에... 비 오나요?',
      choices: [
        {
          text: '"네, 아까 조금 왔어요."',
          next: 'S11a',
          setFlags: { talked_to_subject: true },
          emotionDelta: -15,
        },
        {
          text: '(아무 말도 하지 않는다)',
          next: 'S11b',
        },
      ],
      overrides: [{
        minPlaythrough: 2,
        text: '......당신도... 여기 오래 있었나요?',
      }],
    },
    {
      id: 'S11a',
      speaker: '대상자 #117',
      text: '......그래요. 비.\n\n남자는 더 이상 아무 말도 하지 않았다.',
      next: 'S12',
      bgClass: 'bg-uneasy',
    },
    {
      id: 'S11b',
      text: '침묵을 지켰다. 태블릿에 기록이 남는다.\n\n「대상자 접촉 시도 — 관찰자 대응: 정상」',
      next: 'S12',
      overrides: [{
        minPlaythrough: 2,
        text: '침묵을 지켰다. 태블릿에 기록이 남는다.\n\n「대상자 접촉 시도 — 관찰자 대응: 정상\n  관찰자 감정 반응: 없음」',
      }],
    },
    {
      id: 'S12',
      text: '추출이 완료되었다. 대상자 #117이 퇴장한다.\n\n눈이 텅 비어 있었다. 들어올 때와는 다른 걸음걸이.',
      next: 'S13',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n퇴장하면서 잠깐 이쪽을 돌아봤다.\n"......곧 알게 될 거예요."',
        effect: 'distortion',
      }],
    },
    {
      id: 'S13',
      speaker: '한서진',
      text: '첫 건은 항상 좀 그렇죠. 금방 익숙해져요.',
      next: 'S14',
      overrides: [{
        minPlaythrough: 2,
        text: '첫 건은 항상 좀 그렇죠.\n\n금방 익숙해져요... 그게 시작이에요.',
        effect: 'colorShift',
      }],
    },
    {
      id: 'S14',
      text: '두 번째 대상자. 젊은 여성. 번호 #203.\n\n의자에 앉는 순간, 눈에 공포가 가득했다.',
      next: 'S15',
    },
    {
      id: 'S15',
      text: '추출이 시작되자 대상자가 비명을 질렀다.\n관 속 액체가 탁한 빨강으로 변한다. 끓어오르듯 기포가 인다.\n\n태블릿: 「경고 — 감정 유형: 원한 / 농도: 위험 / 비상 프로토콜 권장」',
      choices: [
        {
          text: '비상 버튼을 누른다',
          next: 'S15a',
          setFlags: { pressed_emergency: true },
        },
        {
          text: '(지켜본다)',
          next: 'S15b',
          setFlags: { watched_suffering: true },
          emotionDelta: -20,
        },
      ],
    },
    {
      id: 'S15a',
      text: '보안팀이 투입되었다. 대상자가 진정제와 함께 처리된다.\n\n한서진이 고개를 끄덕였다. "잘했어요. 프로토콜대로."',
      next: 'S17',
    },
    {
      id: 'S15b',
      text: '비명이 서서히 잦아들었다. 빨간 액체가 차분하게 가라앉는다.\n\n대상자의 눈에서 빛이 사라졌다.',
      next: 'S17',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n지켜보는 동안 태블릿에 잠깐 경고가 떴다 사라졌다.\n「관찰자 감정 반응 감지 — 기록 중」',
        effect: 'glitch',
      }],
    },

    // === ACT 3: 점심 ===
    {
      id: 'S17',
      text: '휴게실. 자판기 하나와 간이 테이블.\n\n다른 관찰자 서너 명이 조용히 앉아 있다. 아무도 대화하지 않는다.',
      next: 'S18',
      ambient: 'corridor',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n...전원이 같은 표정을 하고 있었다. 무표정. 정확히 같은 무표정.',
      }],
    },
    {
      id: 'S18',
      speaker: '이준혁',
      text: '야, 신입이지? 나 이준혁. 여기 몇 번째야?',
      choices: [
        {
          text: '"첫날이에요."',
          next: 'S18a',
        },
        {
          text: '"왜요?"',
          next: 'S18b',
          emotionDelta: -5,
        },
      ],
      overrides: [{
        minPlaythrough: 2,
        text: '야, 신입이지? 나 이준혁.\n\n넌... 아직 몇 번째야?',
      }],
    },
    {
      id: 'S18a',
      speaker: '이준혁',
      text: '아... 그럼 아직 괜찮겠네.',
      next: 'S19',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n웃었다. 하지만 그의 눈은 웃고 있지 않았다.',
      }],
    },
    {
      id: 'S18b',
      speaker: '이준혁',
      text: '......아니야. 별거 아니야.',
      next: 'S19',
      overrides: [{
        minPlaythrough: 2,
        text: '......그냥. 오래되면 이상한 게 보이거든.\n꿈 같은 거. 자기가 의자에 앉아 있는 꿈.',
        effect: 'colorShift',
      }],
    },
    {
      id: 'S19',
      text: '자판기에서 음료를 뽑았다. 미지근한 액체가 컵에 담긴다.',
      next: 'S20',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n......회색이었다. 아까 본 권태의 액체와 같은 색.',
      }],
    },
    {
      id: 'S20',
      text: '시설 내 방송이 울린다.\n\n「금일 D구역 정기 점검으로 인해 오후 3시부터 통행이 제한됩니다.」',
      next: 'S21',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n방송이 끝난 뒤, 아주 작은 소리가 섞여 들렸다.\n"......대상자 전환 스케줄, 금주 3건..."',
        effect: 'distortion',
      }],
    },

    // === ACT 4: 오후 ===
    {
      id: 'S21',
      speaker: '한서진',
      text: '오후엔 B구역 견학이에요. 정밀 추출실.\n\n기초 추출이랑은 좀 달라요. 더 섬세하고... 더 아름다워요.',
      next: 'S22',
      sound: 'doorOpen',
      ambient: 'sector_b',
    },
    {
      id: 'S22',
      text: 'B구역. 정밀 추출이 진행 중이었다.\n\n관에서 흘러나오는 은빛 액체. "그리움의 잔향"이라고 한서진이 말했다.\n\n빛을 받으면 미세하게 반짝였다.',
      next: 'S23',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n"이 감정은 아주 귀해요."\n한서진이 소곤거렸다. "...프로젝트에 필요하거든."',
      }],
    },
    {
      id: 'S23',
      text: 'B구역에서 돌아오는 복도.\n\n벽에 붙은 표지판. A구역, B구역, C구역... 그리고 F구역, G구역 방향 화살표.',
      next: 'S24',
      ambient: 'corridor',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\nF구역 방향에서 희미한 비명 같은 소리가 들렸다. 아닌가... 환청일 수도.',
      }],
    },
    {
      id: 'S24',
      text: '복도 끝에 금지 표시가 된 통로가 보인다.\n「G구역 — 인가자 외 출입 금지」',
      choices: [
        {
          text: '지나친다',
          next: 'S25',
        },
        {
          text: '(잠깐 엿본다)',
          next: 'S24b',
          setFlags: { peeked_g_sector: true },
          emotionDelta: -10,
        },
      ],
    },
    {
      id: 'S24b',
      text: '발걸음을 멈추고 통로 안쪽을 살짝 들여다봤다.\n\n거울. 사방이 거울이었다. 거울의 방.\n안쪽에 누군가 앉아 있는 것 같았지만... 확실하지 않다.',
      next: 'S25',
      effect: 'shake',
      sound: 'doorOpen',
      ambient: 'g_sector',
      overrides: [{
        minPlaythrough: 2,
        text: '발걸음을 멈추고 통로 안쪽을 살짝 들여다봤다.\n\n거울. 사방이 거울이었다. 거울의 방.\n\n안쪽에 앉아 있는 사람이 보였다.\n관찰자 유니폼을 입고 있었다.',
        effect: 'glitch',
      }],
    },
    {
      id: 'S25',
      text: '오후 마지막 대상자. 노인. 번호 #089.\n\n안도를 추출했다. 연노란색 액체가 부드럽게 빛났다.',
      next: 'S26_check',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n추출이 끝나자 노인이 중얼거렸다.\n"고마워요... 이제 아무것도 안 느껴져요."',
      }],
    },
    {
      // 2회차 전용 분기 체크 노드
      id: 'S26_check',
      text: '',
      next: 'S27',
      overrides: [{
        minPlaythrough: 2,
        text: '태블릿에 알림이 떴다.\n\n「자가 진단 권장 — 관찰자 감정 수치 변동 감지」',
      }],
      choices: [
        {
          text: '자가 진단을 실행한다',
          next: 'S26a',
          condition: { minPlaythrough: 2 },
          emotionDelta: -5,
          setFlags: { ran_self_diagnosis: true },
        },
        {
          text: '알림을 닫는다',
          next: 'S27',
          condition: { minPlaythrough: 2 },
        },
      ],
    },
    {
      id: 'S26a',
      text: '자가 진단 실행 중...\n\n태블릿 화면에 수치가 표시된다.\n\n「잔여 감정: ████ / 감소율: 비정상 / 원인: ——— 접근 권한 없음」',
      next: 'S27',
      effect: 'glitch',
    },
    {
      id: 'S27',
      speaker: '한서진',
      text: '첫날 수고했어요.\n\n내일 또 봐요.',
      next: 'S28',
      overrides: [{
        minPlaythrough: 2,
        text: '첫날 수고했어요.\n\n내일 또 봐요... 아마도.',
      }],
    },

    // === ACT 5: 퇴근 — 엔딩 분기 ===
    {
      id: 'S28',
      text: '엘리베이터가 올라간다.\n\n하루가 끝났다.',
      next: 'S29',
    },
    {
      id: 'S29',
      text: '오늘 하루를 되돌아본다.',
      next: 'ending_check',
    },
    {
      // 엔딩 분기 로직 노드
      id: 'ending_check',
      text: '',
      choices: [
        {
          // 각성 엔딩 조건: G구역 엿봄 + 감정적 선택 2회 이상
          text: '_auto_ending_c',
          next: 'ending_mirror',
          condition: { flag: 'peeked_g_sector' },
        },
        {
          // 공허 엔딩은 게이지 0으로 자동 이동 (GameEngine에서 처리)
          // 불안 엔딩 조건: 감정적 선택 1~2회
          text: '_auto_ending_b',
          next: 'ending_uneasy',
          condition: { flag: 'talked_to_subject' },
        },
        {
          text: '_auto_ending_b2',
          next: 'ending_uneasy',
          condition: { flag: 'watched_suffering' },
        },
        {
          // 일상 엔딩: 기본
          text: '_auto_ending_a',
          next: 'ending_normal',
        },
      ],
    },

    // === 엔딩 A: 괜찮은 직장 ===
    {
      id: 'ending_normal',
      text: '첫날치고 나쁘지 않았다.\n\n이상한 곳이긴 하지만, 일은 단순하고 급여는 괜찮다.\n\n내일도 출근이다.',
      endingId: 'ending_a',
      next: null,
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n...태블릿 화면에 잔여 감정 수치가 깜빡이고 있었지만, 나는 보지 못했다.',
        effect: 'fade',
      }],
    },

    // === 엔딩 B: 무언가 이상한 ===
    {
      id: 'ending_uneasy',
      text: '집으로 돌아가는 길.\n\n막연한 불안감이 가시지 않았다.\n오늘 뭔가 이상했다. 하지만 뭐가 이상한지 모르겠다.\n\n......태블릿의 잔여 감정 수치가, 아침보다 줄어 있었다.',
      endingId: 'ending_b',
      next: null,
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n이상한 건 시설이 아니었다.\n이상한 건... 내가 변하고 있다는 것이었다.',
        effect: 'colorShift',
      }],
    },

    // === 엔딩 C: 거울 ===
    {
      id: 'ending_mirror',
      text: '엘리베이터 안. 문이 닫히기 직전, 거울에 비친 자신의 얼굴이 보였다.\n\n......낯설었다.\n\n나는... 언제부터 이런 표정을 하고 있었지?',
      endingId: 'ending_c',
      next: null,
      effect: 'shake',
      overrides: [{
        minPlaythrough: 2,
        appendText: '\n\n거울에 비친 얼굴 위로, 글자가 겹쳐 보였다.\n\n「대상자 #042」',
        effect: 'glitch',
      }],
    },

    // === 엔딩 D: 공허 (게이지 0) ===
    {
      id: 'ending_empty',
      text: '......\n\n아무것도 느껴지지 않는다.\n\n태블릿에 알림이 떴다.\n「관찰자 자격 재심사 대상으로 분류되었습니다.」\n\n태블릿이 꺼졌다.',
      endingId: 'ending_d',
      next: null,
      effect: 'fade',
      overrides: [{
        minPlaythrough: 2,
        text: '......\n\n아무것도 느껴지지 않는다.\n\n태블릿에 알림이 떴다.\n「대상자 전환 절차 개시.」\n「의자로 이동하십시오.」\n\n태블릿이 꺼졌다.',
        effect: 'glitch',
      }],
    },
  ],
};

export default chapter1;
