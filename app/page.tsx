export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md px-6">
        <div className="rounded-2xl border p-6 shadow-sm">
          <div className="mb-4">
            <h1 className="text-3xl font-bold">FormPick</h1>
            <p className="mt-2 text-gray-600">
              내 몸에 맞는 운동 루틴
            </p>
          </div>

          <ul className="mb-6 space-y-2 text-sm text-gray-700">
            <li>• 5~7분 자가평가</li>
            <li>• 목표 기반 루틴 추천</li>
            <li>• 필요하면 사진 업로드로 피드백</li>
          </ul>

          <a
            href="/assessment"
            className="block w-full rounded-xl bg-black px-4 py-3 text-center text-white font-semibold hover:opacity-90"
          >
            시작하기
          </a>

          <p className="mt-4 text-xs text-gray-500">
            * 첫 버전은 AI 분석 없이, 체크 기반 평가 + 루틴 추천으로 시작합니다.
          </p>
        </div>
      </div>
    </main>
  );
}
