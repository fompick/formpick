// app/workout-log/page.tsx
"use client";

import React, { useMemo, useState } from "react";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatKoreanDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

type BodyPart = "가슴" | "등" | "하체" | "어깨" | "이두" | "삼두" | "복근";

type SetRow = {
  id: string;
  weightKg: number;
  reps: number;
  rpe: number; // 6~10
  memo: string;
};

type ExerciseLog = {
  id: string;
  bodyPart: BodyPart;
  exerciseName: string; // (기존 "기구")
  exerciseDescription: string; // (기존 "운동명")
  sets: SetRow[];
};

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

const BODY_PARTS: BodyPart[] = ["가슴", "등", "하체", "어깨", "이두", "삼두", "복근"];

// 샘플 운동명(=기구/운동 카테고리)을 필요한 만큼 추가해줘
const EXERCISE_NAMES = [
  "레그프레스",
  "스쿼트",
  "벤치프레스",
  "랫풀다운",
  "시티드로우",
  "숄더프레스",
  "케이블컬",
  "케이블푸시다운",
  "크런치",
];

function createDefaultSet(): SetRow {
  return {
    id: uid("set"),
    weightKg: 0,
    reps: 0,
    rpe: 7,
    memo: "",
  };
}

function createDefaultExercise(): ExerciseLog {
  return {
    id: uid("ex"),
    bodyPart: "하체",
    exerciseName: "레그프레스",
    exerciseDescription: "",
    sets: [createDefaultSet(), createDefaultSet(), createDefaultSet()],
  };
}

export default function WorkoutLogPage() {
  const [logs, setLogs] = useState<ExerciseLog[]>([createDefaultExercise()]);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [toast, setToast] = useState<string>("");

  const totalSets = useMemo(() => logs.reduce((sum, l) => sum + l.sets.length, 0), [logs]);

  // 운동일지 메시지 생성 함수
  const generateWorkoutMessage = useMemo(() => {
    const lines: string[] = [];
    
    lines.push(`📌 운동일지 (${formatKoreanDate(selectedDate)})`);
    lines.push("");
    
    // 실제 기록된 운동만 필터링
    const validLogs = logs.filter(log => 
      log.sets.some(set => set.weightKg > 0 || set.reps > 0)
    );
    
    if (validLogs.length === 0) {
      lines.push("오늘 기록된 운동이 없습니다.");
    } else {
      validLogs.forEach((log, idx) => {
        const desc = log.exerciseDescription.trim() ? ` (${log.exerciseDescription.trim()})` : "";
        lines.push(`${idx + 1}) [${log.bodyPart}] ${log.exerciseName}${desc}`);
        
        // 실제 기록된 세트만 표시
        const validSets = log.sets.filter(set => set.weightKg > 0 || set.reps > 0);
        validSets.forEach((set, setIdx) => {
          const memo = set.memo.trim() ? ` / 메모: ${set.memo.trim()}` : "";
          lines.push(`   ${setIdx + 1}세트: ${set.weightKg}kg × ${set.reps}회 (RPE ${set.rpe})${memo}`);
        });
        
        lines.push("");
      });
      
      // 총 볼륨 계산
      const totalVolume = validLogs.reduce((sum, log) => {
        return sum + log.sets.reduce((setSum, set) => {
          return setSum + (set.weightKg * set.reps);
        }, 0);
      }, 0);
      
      lines.push(`📊 오늘 운동량 요약`);
      lines.push(`- 총 세트: ${validLogs.reduce((sum, log) => sum + log.sets.filter(s => s.weightKg > 0 || s.reps > 0).length, 0)}세트`);
      if (totalVolume > 0) {
        lines.push(`- 총 볼륨: ${totalVolume.toLocaleString()}kg`);
      }
      lines.push("");
    }
    
    lines.push("👍 수고하셨어요!");
    
    return lines.join("\n");
  }, [logs, selectedDate]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateWorkoutMessage);
      setToast("복사 완료! 카카오톡에 붙여넣기 하세요 📋");
      setTimeout(() => setToast(""), 2000);
    } catch (err) {
      setToast("복사 실패 😥");
      setTimeout(() => setToast(""), 2000);
    }
  };

  const addExercise = () => setLogs((prev) => [...prev, createDefaultExercise()]);

  const removeExercise = (exerciseId: string) =>
    setLogs((prev) => prev.filter((l) => l.id !== exerciseId));

  const updateExercise = (exerciseId: string, patch: Partial<ExerciseLog>) =>
    setLogs((prev) => prev.map((l) => (l.id === exerciseId ? { ...l, ...patch } : l)));

  const addSet = (exerciseId: string) =>
    setLogs((prev) =>
      prev.map((l) =>
        l.id === exerciseId ? { ...l, sets: [...l.sets, createDefaultSet()] } : l
      )
    );

  const removeSet = (exerciseId: string, setId: string) =>
    setLogs((prev) =>
      prev.map((l) =>
        l.id === exerciseId ? { ...l, sets: l.sets.filter((s) => s.id !== setId) } : l
      )
    );

  const updateSet = (exerciseId: string, setId: string, patch: Partial<SetRow>) =>
    setLogs((prev) =>
      prev.map((l) => {
        if (l.id !== exerciseId) return l;
        return {
          ...l,
          sets: l.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
        };
      })
    );

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">운동 기록</h1>
          <p className="mt-1 text-sm text-gray-500">
            운동부위/운동명 선택 → 운동설명 입력 → 세트별 무게·횟수·RPE 기록
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={addExercise}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            + 운동 추가
          </button>
          <button
            onClick={copyToClipboard}
            className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            📋 카카오톡 복사
          </button>
        </div>
      </div>

      {/* 날짜 선택 */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">운동 날짜</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <div className="mt-1 text-xs text-gray-500">
          선택한 날짜: {formatKoreanDate(selectedDate)}
        </div>
      </div>

      {/* 미리보기 */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">카카오톡 메시지 미리보기</h3>
          <button
            onClick={copyToClipboard}
            className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            복사
          </button>
        </div>
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs text-gray-800">
          {generateWorkoutMessage}
        </pre>
      </div>

      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
            {/* Top controls */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
              {/* 운동부위 */}
              <div className="md:col-span-3">
                <label className="mb-1 block text-xs font-medium text-gray-600">운동부위</label>
                <select
                  value={log.bodyPart}
                  onChange={(e) =>
                    updateExercise(log.id, { bodyPart: e.target.value as BodyPart })
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                >
                  {BODY_PARTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* 운동명 (기존 "기구") */}
              <div className="md:col-span-4">
                <label className="mb-1 block text-xs font-medium text-gray-600">운동명</label>
                <select
                  value={log.exerciseName}
                  onChange={(e) => updateExercise(log.id, { exerciseName: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                >
                  {EXERCISE_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 운동설명 (기존 "운동명") */}
              <div className="md:col-span-5">
                <label className="mb-1 block text-xs font-medium text-gray-600">운동설명</label>
                <input
                  value={log.exerciseDescription}
                  onChange={(e) => updateExercise(log.id, { exerciseDescription: e.target.value })}
                  placeholder="예: 발 위치 A / 무릎 각도 90도 유지"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 md:col-span-12 md:justify-end">
                <button
                  onClick={() => addSet(log.id)}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  + 세트
                </button>
                <button
                  onClick={() => removeExercise(log.id)}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                >
                  삭제
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-xs text-gray-600">
                    <th className="border-b border-gray-200 px-2 py-2">세트</th>
                    <th className="border-b border-gray-200 px-2 py-2">무게(kg)</th>
                    <th className="border-b border-gray-200 px-2 py-2">횟수</th>
                    <th className="border-b border-gray-200 px-2 py-2">RPE(6~10)</th>
                    <th className="border-b border-gray-200 px-2 py-2">메모</th>
                    <th className="border-b border-gray-200 px-2 py-2 text-right"> </th>
                  </tr>
                </thead>
                <tbody>
                  {log.sets.map((s, idx) => (
                    <tr key={s.id} className="align-top">
                      <td className="border-b border-gray-100 px-2 py-2 text-sm">{idx + 1}</td>

                      <td className="border-b border-gray-100 px-2 py-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={s.weightKg}
                          onChange={(e) =>
                            updateSet(log.id, s.id, { weightKg: Number(e.target.value) })
                          }
                          className="w-28 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                        />
                      </td>

                      <td className="border-b border-gray-100 px-2 py-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={s.reps}
                          onChange={(e) =>
                            updateSet(log.id, s.id, { reps: Number(e.target.value) })
                          }
                          className="w-24 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                        />
                      </td>

                      <td className="border-b border-gray-100 px-2 py-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={6}
                          max={10}
                          value={s.rpe}
                          onChange={(e) =>
                            updateSet(log.id, s.id, { rpe: Number(e.target.value) })
                          }
                          className="w-24 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                        />
                      </td>

                      <td className="border-b border-gray-100 px-2 py-2">
                        <input
                          value={s.memo}
                          onChange={(e) => updateSet(log.id, s.id, { memo: e.target.value })}
                          placeholder="예: 반동 X / 통증 없음"
                          className="w-[28rem] max-w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                        />
                      </td>

                      <td className="border-b border-gray-100 px-2 py-2 text-right">
                        <button
                          onClick={() => removeSet(log.id, s.id)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 text-sm text-gray-600">
                이 운동 세트: <span className="font-medium">{log.sets.length}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        총 세트: <span className="font-semibold">{totalSets}</span>
      </div>

      {/* Toast 메시지 */}
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg"
          style={{ zIndex: 1000 }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
