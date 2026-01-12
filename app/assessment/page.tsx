'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Answers = {
  shoulderPainOverhead: boolean; // 팔 올릴 때 어깨 통증/뻐근함
  squatBackRounds: boolean;      // 스쿼트 시 허리가 먼저 꺾임
  kneeValgus: boolean;           // 스쿼트 시 무릎 안쪽 모임 느낌
  hipAsymmetry: boolean;         // 골반 비대칭/체중 한쪽 쏠림
};

export default function AssessmentPage() {
  const router = useRouter();

  const [answers, setAnswers] = useState<Answers>({
    shoulderPainOverhead: false,
    squatBackRounds: false,
    kneeValgus: false,
    hipAsymmetry: false,
  });

  const checkedCount = useMemo(() => {
    return Object.values(answers).filter(Boolean).length;
  }, [answers]);

  function toggle<K extends keyof Answers>(key: K) {
    setAnswers(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function goResult() {
    // 1차 MVP: 결과 페이지로만 이동
    // 다음 단계에서: answers를 query/localStorage로 넘기거나, Firestore에 저장
    localStorage.setItem('formpick_answers_v1', JSON.stringify(answers));
    router.push('/result');
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">자가 평가</h1>
          <p className="mt-2 text-gray-600">
            체크 몇 개만 하면, 목표에 맞는 기본 루틴을 추천해드려요.
          </p>
          <p className="mt-3 text-sm text-gray-700">
            현재 체크: <span className="font-semibold">{checkedCount}</span>개
          </p>
        </header>

        <section className="space-y-4">
          <div className="rounded-2xl border p-5">
            <h2 className="font-semibold">어깨/팔</h2>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={answers.shoulderPainOverhead}
                onChange={() => toggle('shoulderPainOverhead')}
              />
              팔을 머리 위로 들 때 어깨 앞쪽이 뻐근하거나 아프다
            </label>
          </div>

          <div className="rounded-2xl border p-5">
            <h2 className="font-semibold">스쿼트/하체</h2>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={answers.squatBackRounds}
                onChange={() => toggle('squatBackRounds')}
              />
              스쿼트할 때 허리가 먼저 꺾이거나 힘이 들어간다
            </label>

            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={answers.kneeValgus}
                onChange={() => toggle('kneeValgus')}
              />
              스쿼트할 때 무릎이 안쪽으로 모이는 느낌이 있다
            </label>
          </div>

          <div className="rounded-2xl border p-5">
            <h2 className="font-semibold">골반/고관절</h2>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={answers.hipAsymmetry}
                onChange={() => toggle('hipAsymmetry')}
              />
              골반이 비대칭이거나 체중이 한쪽에 더 실린다
            </label>
          </div>
        </section>

        <div className="mt-8 flex items-center gap-3">
          <a
            type="button"
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            뒤로
          </button>

          <button
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            onClick={goResult}
          >
            루틴 추천 받기
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          * 1차 MVP는 체크 결과를 저장하고 결과 페이지로 이동합니다.
        </p>
      </div>
    </main>
  );
}
