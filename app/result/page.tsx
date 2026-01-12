'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Answers = {
  shoulderPainOverhead: boolean; // 팔 올릴 때 어깨 통증/뻐근함
  squatBackRounds: boolean;      // 스쿼트 시 허리가 먼저 꺾임
  kneeValgus: boolean;           // 스쿼트 시 무릎 안쪽 모임 느낌
  hipAsymmetry: boolean;         // 골반 비대칭/체중 한쪽 쏠림
};

type MachineKey =
  | 'legPress'
  | 'legExtension'
  | 'legCurl'
  | 'pecDeck'
  | 'seatedRow'
  | 'latPulldown'
  | 'cable'
  | 'dumbbell'
  | 'barbell';

const MACHINE_LABEL: Record<MachineKey, string> = {
  legPress: '파워 레그프레스',
  legExtension: '레그익스텐션',
  legCurl: '레그컬',
  pecDeck: '펙덱플라이',
  seatedRow: '시티드로우',
  latPulldown: '랫풀다운',
  cable: '케이블 머신',
  dumbbell: '덤벨',
  barbell: '바벨',
};

type Exercise = {
  id: string;
  name: string;
  machine: MachineKey;
  tags?: string[];
};

const EXERCISES: Exercise[] = [
  // 하체
  { id: 'lp', name: '레그프레스 (발 위치/깊이 조절)', machine: 'legPress', tags: ['하체', '초보'] },
  { id: 'le', name: '레그익스텐션 (무릎 각도 주의)', machine: 'legExtension', tags: ['대퇴사두'] },
  { id: 'lc', name: '레그컬 (햄스트링)', machine: 'legCurl', tags: ['햄스트링'] },

  // 등/견갑
  { id: 'sr', name: '시티드로우 (견갑 후인 중심)', machine: 'seatedRow', tags: ['등', '견갑'] },
  { id: 'lpull', name: '랫풀다운 (어깨 통증 시 범위 제한)', machine: 'latPulldown', tags: ['등'] },
  { id: 'c_row', name: '케이블 로우 (가슴 열고 당기기)', machine: 'cable', tags: ['등', '자세'] },

  // 가슴
  { id: 'pd', name: '펙덱플라이 (어깨 불편 시 가동범위 줄이기)', machine: 'pecDeck', tags: ['가슴'] },

  // 프리웨이트/보완
  { id: 'db_rdl', name: '덤벨 RDL (힙힌지 연습)', machine: 'dumbbell', tags: ['둔근', '코어'] },
  { id: 'db_split', name: '덤벨 스플릿 스쿼트 (균형)', machine: 'dumbbell', tags: ['균형'] },
  { id: 'bb_box', name: '박스 스쿼트(바벨/스미스 대체 가능)', machine: 'barbell', tags: ['스쿼트 패턴'] },
  { id: 'c_face', name: '케이블 페이스풀 (어깨 안정화)', machine: 'cable', tags: ['어깨'] },
];

function safeParseAnswers(raw: string | null): Answers | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    // 최소 형태 검증
    if (typeof obj !== 'object' || obj === null) return null;
    return {
      shoulderPainOverhead: !!obj.shoulderPainOverhead,
      squatBackRounds: !!obj.squatBackRounds,
      kneeValgus: !!obj.kneeValgus,
      hipAsymmetry: !!obj.hipAsymmetry,
    };
  } catch {
    return null;
  }
}

function buildRecommendation(answers: Answers) {
  const excludes: string[] = [];
  const cautions: string[] = [];
  const focuses: string[] = [];

  // 룰(샘플)
  if (answers.shoulderPainOverhead) {
    excludes.push('오버헤드 프레스/머리 위로 미는 동작(초기 제외)');
    cautions.push('랫풀다운/펙덱은 통증 없는 범위까지만(ROM 제한)');
    focuses.push('견갑 안정화(로우/페이스풀 중심)');
  }

  if (answers.squatBackRounds) {
    cautions.push('스쿼트 깊이 욕심 금지: 허리 중립 유지가 우선');
    focuses.push('힙힌지(엉덩이 접기) + 둔근/햄스트링 강화');
  }

  if (answers.kneeValgus) {
    cautions.push('무릎이 안쪽으로 모이면 중량 내리고 발-무릎 정렬부터');
    focuses.push('둔근 중둔근/고관절 외회전 컨트롤');
  }

  if (answers.hipAsymmetry) {
    cautions.push('한쪽만 불편하면 좌/우 볼륨을 동일하게, 가동범위부터 맞추기');
    focuses.push('편측 운동(스플릿 스쿼트/런지)로 균형');
  }

  // 추천 운동 풀(샘플) - 룰 기반으로 ID 선택
  const baseIds = new Set<string>(['lp', 'sr', 'lpull']); // 기본 추천 (샘플)
  if (answers.squatBackRounds) baseIds.add('db_rdl');
  if (answers.kneeValgus || answers.hipAsymmetry) baseIds.add('db_split');
  if (answers.shoulderPainOverhead) baseIds.add('c_face');
  if (!answers.shoulderPainOverhead) baseIds.add('pd'); // 어깨 이슈 없으면 펙덱 추가

  // “제외” 룰(샘플): 어깨 통증이면 펙덱/랫풀다운은 완전 제외가 아니라 주의로 처리
  // 확장 시: 특정 운동 ID를 제외 목록으로 관리 가능

  return {
    excludes,
    cautions,
    focuses,
    recommendedIds: Array.from(baseIds),
  };
}

export default function ResultPage() {
  const router = useRouter();

  const [answers, setAnswers] = useState<Answers | null>(null);
  const [selectedMachines, setSelectedMachines] = useState<Record<MachineKey, boolean>>({
    legPress: true,
    legExtension: true,
    legCurl: true,
    pecDeck: true,
    seatedRow: true,
    latPulldown: true,
    cable: true,
    dumbbell: true,
    barbell: true,
  });

  useEffect(() => {
    const raw = localStorage.getItem('formpick_answers_v1');
    const parsed = safeParseAnswers(raw);
    setAnswers(parsed);
  }, []);

  const rec = useMemo(() => {
    if (!answers) return null;
    return buildRecommendation(answers);
  }, [answers]);

  const filteredExercises = useMemo(() => {
    if (!rec) return [];
    const selectedKeys = new Set(
      (Object.keys(selectedMachines) as MachineKey[]).filter(k => selectedMachines[k])
    );

    const picked = rec.recommendedIds
      .map(id => EXERCISES.find(e => e.id === id))
      .filter((e): e is Exercise => !!e);

    // 선택한 기구만 남기기
    return picked.filter(e => selectedKeys.has(e.machine));
  }, [rec, selectedMachines]);

  function toggleMachine(key: MachineKey) {
    setSelectedMachines(prev => ({ ...prev, [key]: !prev[key] }));
  }

  if (answers === null) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <h1 className="text-2xl font-bold">추천 루틴</h1>
          <p className="mt-2 text-gray-600">평가 결과를 불러오는 중...</p>
        </div>
      </main>
    );
  }

  // 평가 데이터가 없으면 assessment로 돌려보내기 안내
  if (!answers) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-2xl px-6 py-10">
          <h1 className="text-2xl font-bold">추천 루틴</h1>
          <p className="mt-2 text-gray-600">
            평가 데이터가 없어요. 먼저 자가평가를 진행해주세요.
          </p>

          <button
            className="mt-6 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
            onClick={() => router.push('/assessment')}
          >
            자가평가 하러 가기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">추천 루틴</h1>
            <p className="mt-2 text-gray-600">
              자가평가 결과 기반 샘플 추천입니다. (MVP)
            </p>
          </div>

          <button
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            onClick={() => router.push('/assessment')}
          >
            다시 평가
          </button>
        </div>

        {/* 주의/포커스/제외 */}
        <div className="mt-8 grid gap-4">
          <div className="rounded-2xl border p-5">
            <h2 className="font-semibold">주의 포인트</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {rec?.cautions.length ? (
                rec.cautions.map((t, idx) => <li key={idx}>{t}</li>)
              ) : (
                <li>특별한 주의 항목이 없어요. (샘플)</li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border p-5">
            <h2 className="font-semibold">우선 강화(포커스)</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {rec?.focuses.length ? (
                rec.focuses.map((t, idx) => <li key={idx}>{t}</li>)
              ) : (
                <li>전신 기본 루틴을 진행해도 좋아요. (샘플)</li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border p-5">
            <h2 className="font-semibold">초기 제외(권장)</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {rec?.excludes.length ? (
                rec.excludes.map((t, idx) => <li key={idx}>{t}</li>)
              ) : (
                <li>초기 제외 운동은 없어요. (샘플)</li>
              )}
            </ul>
          </div>
        </div>

        {/* 센터 기구 선택 */}
        <div className="mt-10 rounded-2xl border p-5">
          <h2 className="font-semibold">센터 기구 선택</h2>
          <p className="mt-2 text-sm text-gray-600">
            회원님이 다니는 센터에 있는 기구만 선택하세요. 선택한 기구에 맞게 추천 운동이 필터링됩니다.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {(Object.keys(MACHINE_LABEL) as MachineKey[]).map(key => (
              <label key={key} className="flex items-center gap-2 rounded-xl border px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedMachines[key]}
                  onChange={() => toggleMachine(key)}
                />
                {MACHINE_LABEL[key]}
              </label>
            ))}
          </div>
        </div>

        {/* 추천 운동 리스트 */}
        <div className="mt-10 rounded-2xl border p-5">
          <h2 className="font-semibold">추천 운동 (기구 필터 적용)</h2>
          <p className="mt-2 text-sm text-gray-600">
            샘플 추천입니다. 다음 단계에서 세트/횟수/세팅(의자 높이 등)을 붙일 거예요.
          </p>

          <div className="mt-4 space-y-3">
            {filteredExercises.length ? (
              filteredExercises.map(ex => (
                <div key={ex.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{ex.name}</p>
                      <p className="mt-1 text-xs text-gray-600">
                        사용 기구: {MACHINE_LABEL[ex.machine]}
                      </p>
                    </div>
                    {ex.tags?.length ? (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {ex.tags.map(tag => (
                          <span
                            key={tag}
                            className="rounded-full border px-2 py-0.5 text-xs text-gray-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 text-sm text-gray-700">
                    <p className="font-semibold">샘플 큐(설명)</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      <li>통증 없는 범위에서 천천히</li>
                      <li>호흡: 내려갈 때 들이마시고, 올라올 때 내쉬기</li>
                      <li>자세가 흐트러지면 중량보다 범위/속도부터</li>
                    </ul>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                선택한 기구로 가능한 추천 운동이 없어요. <br />
                위에서 기구를 더 선택해보세요.
              </div>
            )}
          </div>
        </div>

        {/* 다음 액션 */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
            onClick={() => router.push('/feedback')}

          >
            사진 업로드로 피드백 받기
          </button>

          <button
            className="rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-gray-50"
            onClick={() => router.push('/assessment')}
          >
            평가 다시하기
          </button>
        </div>

        <p className="mt-6 text-xs text-gray-500">
          * 이 결과는 샘플 MVP입니다. 실제 제품에서는 “세트/횟수/휴식”, “기구 세팅(의자 높이/손잡이)”, “진행 단계(10S)”를 연결합니다.
        </p>
      </div>
    </main>
  );
}
