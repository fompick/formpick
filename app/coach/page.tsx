'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type FeedbackRequest = {
  submittedAt: string;
  notes: string;
  photoKeys: string[];
};

export default function CoachPage() {
  const router = useRouter();
  const [req, setReq] = useState<FeedbackRequest | null>(null);
  const [coachNote, setCoachNote] = useState<string>('');
  const [saved, setSaved] = useState<boolean>(false);

  useEffect(() => {
    const raw = localStorage.getItem('formpick_feedback_request_v1');
    if (!raw) return;
    try {
      setReq(JSON.parse(raw));
    } catch {
      setReq(null);
    }

    const rawCoach = localStorage.getItem('formpick_coach_feedback_v1');
    if (rawCoach) setCoachNote(rawCoach);
  }, []);

  function saveCoachFeedback() {
    localStorage.setItem('formpick_coach_feedback_v1', coachNote);
    setSaved(true);
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">코치 화면 (샘플)</h1>
            <p className="mt-2 text-gray-600">
              실제 서비스에서는 로그인/권한으로 코치만 접근하게 만들 수 있어요.
            </p>
          </div>
          <button
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            onClick={() => router.push('/feedback')}
          >
            피드백 페이지로
          </button>
        </div>

        <div className="mt-8 rounded-2xl border p-5">
          <h2 className="font-semibold">회원 요청</h2>

          {req ? (
            <div className="mt-3 space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-semibold">요청 시간:</span>{' '}
                {new Date(req.submittedAt).toLocaleString()}
              </p>
              <p>
                <span className="font-semibold">업로드(샘플 키):</span>{' '}
                {req.photoKeys.join(', ')}
              </p>
              <p>
                <span className="font-semibold">회원 메모:</span>{' '}
                {req.notes ? req.notes : '(없음)'}
              </p>
              <p className="text-xs text-gray-500">
                * 지금은 실제 이미지 저장이 아니라 “어떤 사진을 올렸는지”만 저장된 샘플이에요.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-700">
              아직 저장된 요청이 없어요. 먼저 /feedback에서 요청을 만들어주세요.
            </p>
          )}
        </div>

        <div className="mt-6 rounded-2xl border p-5">
          <h2 className="font-semibold">코치 피드백 작성</h2>
          <p className="mt-2 text-sm text-gray-600">
            예: 어깨가 들릴 때 견갑 상방회전이 부족 → 로우/페이스풀 우선, 오버헤드 제한 등
          </p>

          <textarea
            className="mt-4 w-full rounded-xl border p-3 text-sm outline-none focus:ring-2 focus:ring-black"
            rows={8}
            value={coachNote}
            onChange={e => {
              setSaved(false);
              setCoachNote(e.target.value);
            }}
            placeholder="코치 피드백을 작성하세요..."
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
              onClick={saveCoachFeedback}
            >
              피드백 저장 (샘플)
            </button>

            <button
              className="rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-gray-50"
              onClick={() => router.push('/result')}
            >
              결과로
            </button>
          </div>

          {saved ? (
            <p className="mt-3 text-sm text-gray-700">
              ✅ 저장됐어요. (샘플) 이제 회원 화면에서 이 피드백을 보여줄 수 있어요.
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-xs text-gray-500">
          * 다음 단계에서 Firebase(Auth/Firestore/Storage)로 연결하면,
          “회원이 사진 업로드 → 코치가 앱에서 확인 → 피드백 작성 → 회원에게 알림”까지 완성됩니다.
        </p>
      </div>
    </main>
  );
}
