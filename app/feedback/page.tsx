'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type PhotoKey = 'front' | 'side' | 'back' | 'squat' | 'overhead';

const PHOTO_LABEL: Record<PhotoKey, string> = {
  front: '정면(서서)',
  side: '측면(서서)',
  back: '후면(서서)',
  squat: '스쿼트 하강(측면 추천)',
  overhead: '팔 올린 자세(오버헤드)',
};

type PhotoState = {
  file?: File;
  previewUrl?: string;
};

export default function FeedbackPage() {
  const router = useRouter();

  const [photos, setPhotos] = useState<Record<PhotoKey, PhotoState>>({
    front: {},
    side: {},
    back: {},
    squat: {},
    overhead: {},
  });

  const [notes, setNotes] = useState<string>(''); // 회원이 추가로 적는 메모
  const [submitted, setSubmitted] = useState<boolean>(false);

  const completedCount = useMemo(() => {
    return Object.values(photos).filter(p => !!p.file).length;
  }, [photos]);

  function handleFileChange(key: PhotoKey, file: File | null) {
    setPhotos(prev => {
      // 이전 preview URL 정리
      const prevUrl = prev[key].previewUrl;
      if (prevUrl) URL.revokeObjectURL(prevUrl);

      if (!file) return { ...prev, [key]: {} };

      return {
        ...prev,
        [key]: {
          file,
          previewUrl: URL.createObjectURL(file),
        },
      };
    });
  }

  function removePhoto(key: PhotoKey) {
    setPhotos(prev => {
      const prevUrl = prev[key].previewUrl;
      if (prevUrl) URL.revokeObjectURL(prevUrl);
      return { ...prev, [key]: {} };
    });
  }

  function submit() {
    if (completedCount < 3) {
      alert('최소 3장은 업로드해 주세요. (정면/측면/후면 추천)');
      return;
    }

    // ✅ MVP 샘플: 서버 없이 localStorage에 “제출됨” 저장
    // 실제 서비스에서는: Firebase Storage 업로드 + Firestore에 요청 저장
    const payload = {
      submittedAt: new Date().toISOString(),
      notes,
      photoKeys: (Object.keys(photos) as PhotoKey[]).filter(k => !!photos[k].file),
    };

    localStorage.setItem('formpick_feedback_request_v1', JSON.stringify(payload));
    setSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">사진 업로드 피드백</h1>
            <p className="mt-2 text-gray-600">
              5장 중 가능한 만큼 올리면, 트레이너가 확인 후 피드백을 남깁니다. (샘플)
            </p>
            <p className="mt-3 text-sm text-gray-700">
              업로드 완료: <span className="font-semibold">{completedCount}</span>/5
            </p>
          </div>

          <button
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            onClick={() => router.push('/result')}
          >
            결과로 돌아가기
          </button>
        </div>

        {/* 업로드 카드들 */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(Object.keys(PHOTO_LABEL) as PhotoKey[]).map(key => {
            const item = photos[key];

            return (
              <div key={key} className="rounded-2xl border p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{PHOTO_LABEL[key]}</h2>
                  {item.file ? (
                    <button
                      className="text-sm font-semibold text-gray-600 hover:underline"
                      onClick={() => removePhoto(key)}
                      type="button"
                    >
                      삭제
                    </button>
                  ) : null}
                </div>

                <div className="mt-3">
                  {item.previewUrl ? (
                    <div className="rounded-xl border overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewUrl}
                        alt={`${PHOTO_LABEL[key]} 미리보기`}
                        className="h-48 w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-600">
                      사진을 업로드하면 미리보기가 보여요
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm"
                    onChange={e => handleFileChange(key, e.target.files?.[0] ?? null)}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    * 얼굴 노출이 부담되면 모자이크/가림 가능. 정면·측면·후면이 가장 중요해요.
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 회원 메모 */}
        <div className="mt-8 rounded-2xl border p-5">
          <h2 className="font-semibold">추가 메모 (선택)</h2>
          <p className="mt-2 text-sm text-gray-600">
            통증 위치, 불편한 동작, 목표(다이어트/근력/통증 개선) 등을 적어주세요.
          </p>
          <textarea
            className="mt-4 w-full rounded-xl border p-3 text-sm outline-none focus:ring-2 focus:ring-black"
            rows={5}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="예) 오른쪽 어깨 앞쪽이 들 때 아파요. 스쿼트는 깊게 내려가면 허리가 불편해요."
          />
        </div>

        {/* 제출 */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            onClick={submit}
          >
            피드백 요청 보내기 (샘플)
          </button>

          <button
            className="rounded-xl border px-4 py-3 text-sm font-semibold hover:bg-gray-50"
            onClick={() => router.push('/assessment')}
          >
            평가 다시하기
          </button>
        </div>

        {submitted ? (
          <div className="mt-6 rounded-2xl border p-5 bg-gray-50">
            <p className="font-semibold">요청이 저장됐어요! (샘플)</p>
            <p className="mt-2 text-sm text-gray-700">
              지금은 서버 없이 localStorage에만 저장됩니다. 실제 앱에서는 Firebase로 업로드/저장 후,
              트레이너가 관리자 화면에서 피드백을 작성하게 됩니다.
            </p>
            <button
              className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
              onClick={() => router.push('/coach')}
            >
              (샘플) 코치 화면으로 보기
            </button>
          </div>
        ) : null}

        <p className="mt-6 text-xs text-gray-500">
          * MVP 단계에서는 “요청 저장 → 코치가 확인” 흐름만 만듭니다. 다음 단계에서 사진 업로드를 Firebase Storage로 연결할 수 있어요.
        </p>
      </div>
    </main>
  );
}
