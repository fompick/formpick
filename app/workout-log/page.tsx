"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/** =========================
 * Types
 * ========================= */
type Member = {
  id: string;
  name: string;
  phone?: string;
  memo?: string;
};

type SetRow = {
  id: string;
  weight: number; // kg
  reps: number;
  rpe: number; // 6~10
  note?: string;
};

type ExerciseRow = {
  id: string;
  machine: string; // 기구/카테고리
  name: string; // 운동명
  sets: SetRow[];
};

type WorkoutLog = {
  memberId: string;
  memberName: string;
  dateISO: string; // YYYY-MM-DD
  attendance: "출석" | "지각" | "결석";
  focus: string;
  coachNote: string;
  exercises: ExerciseRow[];
  createdAt: string;
  updatedAt: string;
};

const LS_KEYS = {
  MEMBERS: "formpick_members_v1",
  MACHINES: "formpick_center_machines_v1",
  // 운동일지는 memberId+date 로 저장: formpick_workoutlog_v1::<memberId>::<YYYY-MM-DD>
  LOG_PREFIX: "formpick_workoutlog_v1::",
  LOG_INDEX: "formpick_admin_log_index_v1",

};

const DEFAULT_MACHINES = [
  "레그프레스",
  "레그익스텐션",
  "레그컬",
  "랫풀다운",
  "시티드로우",
  "펙덱플라이",
  "케이블머신",
  "덤벨",
  "바벨",
];

const SEED_MEMBERS: Member[] = [
  { id: "m_001", name: "김OO", phone: "010-0000-0000" },
  { id: "m_002", name: "이OO", phone: "010-0000-0000" },
  { id: "m_003", name: "박OO", phone: "010-0000-0000" },
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function safeParse<T>(v: string | null, fallback: T): T {
  try {
    if (!v) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

function formatKoreanDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function calcExerciseVolume(ex: ExerciseRow) {
  return ex.sets.reduce((acc, s) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
}

function calcTotalVolume(exercises: ExerciseRow[]) {
  return exercises.reduce((acc, ex) => acc + calcExerciseVolume(ex), 0);
}

function maxWeight(exercises: ExerciseRow[]) {
  let max = 0;
  exercises.forEach((ex) => {
    ex.sets.forEach((s) => {
      if ((Number(s.weight) || 0) > max) max = Number(s.weight) || 0;
    });
  });
  return max;
}

function buildMemberMessage(log: WorkoutLog) {
  const totalVol = calcTotalVolume(log.exercises);
  const maxW = maxWeight(log.exercises);

  const lines: string[] = [];
  lines.push(`📌 오늘의 운동일지 (${formatKoreanDate(log.dateISO)})`);
  lines.push("");
  lines.push(`👤 회원: ${log.memberName || "미선택"}`);
  lines.push(`✅ 출석: ${log.attendance}`);
  if (log.focus.trim()) lines.push(`🎯 포커스: ${log.focus.trim()}`);
  lines.push("");

  if (log.exercises.length === 0) {
    lines.push("오늘 기록된 운동이 없습니다.");
  } else {
    lines.push("🏋️‍♂️ 운동 기록");
    log.exercises.forEach((ex, idx) => {
      lines.push(`\n${idx + 1}) [${ex.machine}] ${ex.name || "운동명 미입력"}`);
      ex.sets.forEach((s, sIdx) => {
        const note = s.note?.trim() ? ` / 메모: ${s.note.trim()}` : "";
        lines.push(`- ${sIdx + 1}세트: ${s.weight || 0}kg x ${s.reps || 0}회 (RPE ${s.rpe || 0})${note}`);
      });
    });
    lines.push("");
    lines.push(`📊 오늘 운동량 요약`);
    lines.push(`- 총 볼륨(kg·reps): ${totalVol.toLocaleString()}`);
    lines.push(`- 최고 중량: ${maxW}kg`);
  }

  if (log.coachNote.trim()) {
    lines.push("");
    lines.push("📝 코치 코멘트");
    lines.push(log.coachNote.trim());
  }

  lines.push("");
  lines.push("👍 수고하셨어요! 다음 수업 때 컨디션/통증 체크 후 진행할게요.");
  return lines.join("\n");
}

function logStorageKey(memberId: string, dateISO: string) {
  return `${LS_KEYS.LOG_PREFIX}${memberId}::${dateISO}`;
}

function upsertLogIndexItem(args: {
  memberId: string;
  memberName: string;
  dateISO: string;
  updatedAt: string;
}) {
  const { memberId, memberName, dateISO, updatedAt } = args;

  const prev = JSON.parse(
    localStorage.getItem(LS_KEYS.LOG_INDEX) || "[]"
  ) as Array<{
    id: string;
    memberName: string;
    dateISO: string;
    updatedAt: string;
  }>;

  const id = `${memberId}::${dateISO}`;

  const nextItem = { id, memberName, dateISO, updatedAt };

  // 기존 같은 날짜 기록 제거 → 맨 앞에 추가
  const filtered = prev.filter((x) => x.id !== id);
  const next = [nextItem, ...filtered].slice(0, 30);

  localStorage.setItem(
    LS_KEYS.LOG_INDEX,
    JSON.stringify(next)
  );
}

/** =========================
 * Simple calendar (month view)
 * ========================= */
function isoFromParts(y: number, m1: number, d: number) {
  const mm = String(m1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
function daysInMonth(y: number, m1: number) {
  return new Date(y, m1, 0).getDate(); // m1: 1-12
}
function weekdayOfFirst(y: number, m1: number) {
  // 0=Sun..6=Sat
  return new Date(y, m1 - 1, 1).getDay();
}
function parseISO(iso: string) {
  const [yy, mm, dd] = iso.split("-").map(Number);
  return { y: yy, m1: mm, d: dd };
}

type CalendarProps = {
  selectedISO: string;
  onSelectISO: (iso: string) => void;
};

function CalendarMonth({ selectedISO, onSelectISO }: CalendarProps) {
  const { y: selY, m1: selM1 } = parseISO(selectedISO);

  const [y, setY] = useState(selY);
  const [m1, setM1] = useState(selM1);

  useEffect(() => {
    // 선택 날짜가 바뀌면 캘린더도 해당 월로 이동
    setY(selY);
    setM1(selM1);
  }, [selY, selM1]);

  const firstW = weekdayOfFirst(y, m1);
  const dim = daysInMonth(y, m1);
  const cells: Array<{ iso: string | null; day: number | null }> = [];

  // leading blanks
  for (let i = 0; i < firstW; i++) cells.push({ iso: null, day: null });
  // days
  for (let d = 1; d <= dim; d++) cells.push({ iso: isoFromParts(y, m1, d), day: d });
  // trailing to fill 6 rows
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: null });
  while (cells.length < 42) cells.push({ iso: null, day: null });

  function prevMonth() {
    let ny = y;
    let nm = m1 - 1;
    if (nm === 0) {
      nm = 12;
      ny -= 1;
    }
    setY(ny);
    setM1(nm);
  }
  function nextMonth() {
    let ny = y;
    let nm = m1 + 1;
    if (nm === 13) {
      nm = 1;
      ny += 1;
    }
    setY(ny);
    setM1(nm);
  }
  function goToday() {
    onSelectISO(todayISO());
  }

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>
          {y}년 {m1}월
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={btnGhost} onClick={prevMonth}>◀</button>
          <button style={btnGhost} onClick={goToday}>오늘</button>
          <button style={btnGhost} onClick={nextMonth}>▶</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 10 }}>
        {weekdays.map((w) => (
          <div key={w} style={{ fontSize: 12, color: "#666", textAlign: "center", padding: "4px 0" }}>
            {w}
          </div>
        ))}

        {cells.map((c, idx) => {
          const isSelected = c.iso === selectedISO;
          const isClickable = Boolean(c.iso);
          return (
            <button
              key={idx}
              disabled={!isClickable}
              onClick={() => c.iso && onSelectISO(c.iso)}
              style={{
                border: "1px solid " + (isSelected ? "#111" : "#eee"),
                background: isSelected ? "#111" : "#fff",
                color: isSelected ? "#fff" : "#111",
                borderRadius: 12,
                padding: "10px 0",
                cursor: isClickable ? "pointer" : "default",
                opacity: isClickable ? 1 : 0.35,
                fontSize: 13,
              }}
              title={c.iso ? c.iso : ""}
            >
              {c.day ?? ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** =========================
 * Page
 * ========================= */
export default function WorkoutLogPage() {
  /** members */
  const [members, setMembers] = useState<Member[]>(SEED_MEMBERS);
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>(SEED_MEMBERS[0]?.id || "");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");

  /** machines */
  const [machines, setMachines] = useState<string[]>(DEFAULT_MACHINES);
  const [newMachine, setNewMachine] = useState("");

  /** log core state */
  const [dateISO, setDateISO] = useState<string>(todayISO());
  const [log, setLog] = useState<WorkoutLog>(() => ({
    memberId: "",
    memberName: "",
    dateISO: todayISO(),
    attendance: "출석",
    focus: "",
    coachNote: "",
    exercises: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const [toast, setToast] = useState<string>("");
  const toastTimer = useRef<number | null>(null);

  /** init load */
  useEffect(() => {
    // members
    const savedMembers = safeParse<Member[]>(localStorage.getItem(LS_KEYS.MEMBERS), SEED_MEMBERS);
    setMembers(savedMembers.length ? savedMembers : SEED_MEMBERS);

    const initialMemberId = (savedMembers[0]?.id || SEED_MEMBERS[0]?.id || "");
    setSelectedMemberId(initialMemberId);

    // machines
    const savedMachines = safeParse<string[]>(
      localStorage.getItem(LS_KEYS.MACHINES),
      DEFAULT_MACHINES
    );
    setMachines(savedMachines.length ? savedMachines : DEFAULT_MACHINES);
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.MEMBERS, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.MACHINES, JSON.stringify(machines));
  }, [machines]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1600);
  }

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId) || null,
    [members, selectedMemberId]
  );

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => (m.name || "").toLowerCase().includes(q) || (m.phone || "").includes(q));
  }, [members, memberQuery]);

  /** Load log when member/date changes */
  useEffect(() => {
    if (!selectedMemberId) return;

    const m = members.find((x) => x.id === selectedMemberId);
    const mName = m?.name || "";

    const key = logStorageKey(selectedMemberId, dateISO);
    const saved = safeParse<WorkoutLog | null>(localStorage.getItem(key), null);

    if (saved) {
      // 혹시 이름 바뀌었으면 반영
      setLog({ ...saved, memberId: selectedMemberId, memberName: mName, dateISO });
    } else {
      // 새로 생성
      setLog({
        memberId: selectedMemberId,
        memberName: mName,
        dateISO,
        attendance: "출석",
        focus: "",
        coachNote: "",
        exercises: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [selectedMemberId, dateISO, members]);

  /** Autosave current log */
  useEffect(() => {
    if (!log.memberId || !log.dateISO) return;
    
    const key = logStorageKey(log.memberId, log.dateISO);
    localStorage.setItem(key, JSON.stringify(log));

  // ⭐️ 여기! localStorage 저장 바로 다음 줄
  upsertLogIndexItem({
    memberId: log.memberId,
    memberName: log.memberName,
    dateISO: log.dateISO,
    updatedAt: log.updatedAt || new Date().toISOString(),
  });
}, [log]);
  
  

  /** ===== members actions ===== */
  function addMember() {
    const name = newMemberName.trim();
    if (!name) return showToast("회원 이름을 입력해줘!");
    const member: Member = { id: uid("m"), name, phone: newMemberPhone.trim() || "" };
    setMembers((prev) => [member, ...prev]);
    setSelectedMemberId(member.id);
    setNewMemberName("");
    setNewMemberPhone("");
    showToast("회원 추가 완료 ✅");
  }
  function removeMember(memberId: string) {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;

    // 리스트에서 제거
    const next = members.filter((m) => m.id !== memberId);
    setMembers(next);

    // 선택 보정
    if (selectedMemberId === memberId) {
      setSelectedMemberId(next[0]?.id || "");
    }

    showToast("회원 삭제 ✅ (저장된 운동일지는 localStorage에 남아있을 수 있어)");
  }

  /** ===== machine actions ===== */
  function addMachine() {
    const name = newMachine.trim();
    if (!name) return showToast("기구명을 입력해줘!");
    if (machines.includes(name)) return showToast("이미 등록된 기구야.");
    setMachines((prev) => [name, ...prev]);
    setNewMachine("");
    showToast("기구 추가 완료 ✅");
  }
  function removeMachine(name: string) {
    setMachines((prev) => prev.filter((m) => m !== name));
    showToast("기구 삭제 ✅");
  }

  /** ===== log actions ===== */
  const memberMessage = useMemo(() => buildMemberMessage(log), [log]);
  const totalVol = useMemo(() => calcTotalVolume(log.exercises), [log.exercises]);
  const maxW = useMemo(() => maxWeight(log.exercises), [log.exercises]);

  function addExercise() {
    if (log.attendance === "결석") return showToast("결석이면 운동 기록을 막아둘게!");
    const firstMachine = machines[0] || "기구";
    const ex: ExerciseRow = {
      id: uid("ex"),
      machine: firstMachine,
      name: "",
      sets: [
        { id: uid("set"), weight: 0, reps: 0, rpe: 7, note: "" },
        { id: uid("set"), weight: 0, reps: 0, rpe: 7, note: "" },
        { id: uid("set"), weight: 0, reps: 0, rpe: 7, note: "" },
      ],
    };
    setLog((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      exercises: [ex, ...prev.exercises],
    }));
  }

  function removeExercise(exId: string) {
    setLog((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      exercises: prev.exercises.filter((e) => e.id !== exId),
    }));
  }

  function updateExercise(exId: string, patch: Partial<ExerciseRow>) {
    setLog((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      exercises: prev.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)),
    }));
  }

  function addSet(exId: string) {
    if (log.attendance === "결석") return showToast("결석이면 운동 기록을 막아둘게!");
    setLog((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      exercises: prev.exercises.map((e) => {
        if (e.id !== exId) return e;
        return { ...e, sets: [...e.sets, { id: uid("set"), weight: 0, reps: 0, rpe: 7, note: "" }] };
      }),
    }));
  }

  function removeSet(exId: string, setId: string) {
    setLog((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      exercises: prev.exercises.map((e) => {
        if (e.id !== exId) return e;
        return { ...e, sets: e.sets.filter((s) => s.id !== setId) };
      }),
    }));
  }

  function updateSet(exId: string, setId: string, patch: Partial<SetRow>) {
    setLog((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      exercises: prev.exercises.map((e) => {
        if (e.id !== exId) return e;
        return { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) };
      }),
    }));
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(memberMessage);
      showToast("회원용 메시지 복사 완료 ✅");
    } catch {
      showToast("복사 실패 😥 브라우저 권한 확인!");
    }
  }

  function clearThisDayLog() {
    if (!log.memberId) return;
    const key = logStorageKey(log.memberId, log.dateISO);
    
    localStorage.removeItem(key);

    // UI 초기화
    setLog({
      memberId: log.memberId,
      memberName: log.memberName,
      dateISO: log.dateISO,
      attendance: "출석",
      focus: "",
      coachNote: "",
      exercises: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    showToast("해당 날짜 운동일지 초기화 ✅");
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>운동일지 작성</h1>
          <p style={{ margin: "6px 0 0", color: "#666" }}>
            회원 선택 → 캘린더 날짜 선택 → 해당 날짜 일지 자동 불러오기/저장
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={addExercise} style={btnPrimary}>+ 운동 추가</button>
          <button onClick={copyMessage} style={btnOutline}>회원에게 보내기(복사)</button>
          <button onClick={clearThisDayLog} style={btnGhost}>이 날짜 기록 초기화</button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 14, marginTop: 14 }}>
        {/* LEFT: Member + Calendar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* member picker */}
          <section style={card}>
            <div style={{ fontWeight: 800 }}>회원 선택</div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                style={{ ...input, flex: 1 }}
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="이름/번호 검색"
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                style={{ ...input, flex: 1 }}
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="새 회원 이름"
              />
              <button onClick={addMember} style={btnPrimary}>+ 추가</button>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                style={{ ...input, flex: 1 }}
                value={newMemberPhone}
                onChange={(e) => setNewMemberPhone(e.target.value)}
                placeholder="전화(옵션)"
              />
            </div>

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflow: "auto" }}>
              {filteredMembers.map((m) => {
                const selected = m.id === selectedMemberId;
                return (
                  <div
                    key={m.id}
                    style={{
                      border: "1px solid " + (selected ? "#111" : "#eee"),
                      borderRadius: 14,
                      padding: 10,
                      background: selected ? "#111" : "#fff",
                      color: selected ? "#fff" : "#111",
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedMemberId(m.id)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{m.name}</div>
                        {m.phone ? <div style={{ fontSize: 12, opacity: selected ? 0.85 : 0.7 }}>{m.phone}</div> : null}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeMember(m.id); }}
                        style={{
                          border: "1px solid " + (selected ? "rgba(255,255,255,0.25)" : "#eee"),
                          background: "transparent",
                          color: selected ? "#fff" : "#111",
                          padding: "6px 10px",
                          borderRadius: 12,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                        title="회원 삭제"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredMembers.length === 0 ? (
                <div style={{ color: "#777", padding: 10 }}>검색 결과가 없어.</div>
              ) : null}
            </div>
          </section>

          {/* calendar */}
          <CalendarMonth selectedISO={dateISO} onSelectISO={(iso) => setDateISO(iso)} />
        </aside>

        {/* RIGHT: Log editor */}
        <main style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* top info */}
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  {selectedMember ? selectedMember.name : "회원 미선택"} · {formatKoreanDate(dateISO)}
                </div>
                <div style={{ color: "#777", fontSize: 13, marginTop: 4 }}>
                  저장 키: {selectedMemberId ? `${selectedMemberId} / ${dateISO}` : "회원 선택 필요"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 13, color: "#666" }}>출석 상태</div>
                  <select
                    style={{ ...input, width: 180 }}
                    value={log.attendance}
                    onChange={(e) =>
                      setLog((p) => ({
                        ...p,
                        attendance: e.target.value as WorkoutLog["attendance"],
                        updatedAt: new Date().toISOString(),
                      }))
                    }
                  >
                    <option value="출석">출석</option>
                    <option value="지각">지각</option>
                    <option value="결석">결석</option>
                  </select>
                </label>

                <div style={{ minWidth: 220 }}>
                  <div style={{ color: "#666", fontSize: 13 }}>오늘 운동량</div>
                  <div style={{ fontWeight: 900, fontSize: 16, marginTop: 4 }}>
                    총 {totalVol.toLocaleString()} / 최고 {maxW}kg
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <label style={field}>
                <div style={label}>오늘 포커스</div>
                <input
                  style={input}
                  value={log.focus}
                  onChange={(e) => setLog((p) => ({ ...p, focus: e.target.value, updatedAt: new Date().toISOString() }))}
                  placeholder="예: 하체/무릎 안정성, 힙힌지 패턴"
                />
              </label>

              <label style={field}>
                <div style={label}>회원에게 보낼 핵심 코멘트</div>
                <input
                  style={input}
                  value={log.coachNote}
                  onChange={(e) => setLog((p) => ({ ...p, coachNote: e.target.value, updatedAt: new Date().toISOString() }))}
                  placeholder="예: 오늘 폼 좋아짐. 다음 수업은 RDL + 코어 브레이싱."
                />
              </label>
            </div>
          </section>

          {/* message preview */}
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div style={{ fontWeight: 800 }}>회원 전송 메시지 미리보기</div>
              <button onClick={copyMessage} style={btnOutline}>복사</button>
            </div>
            <pre
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 12,
                background: "#f7f7f7",
                border: "1px solid #eee",
                whiteSpace: "pre-wrap",
                fontSize: 13,
                lineHeight: 1.5,
                maxHeight: 220,
                overflow: "auto",
              }}
            >
              {memberMessage}
            </pre>
          </section>

          {/* machines */}
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800 }}>센터 기구 설정</div>
                <div style={{ color: "#777", fontSize: 13, marginTop: 4 }}>
                  기구는 운동 추가 시 선택지로 뜸
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...input, width: 240 }}
                  value={newMachine}
                  onChange={(e) => setNewMachine(e.target.value)}
                  placeholder="기구명 추가 (예: 힙쓰러스트)"
                />
                <button onClick={addMachine} style={btnPrimary}>+ 추가</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              {machines.map((m) => (
                <span key={m} style={chip}>
                  {m}
                  <button onClick={() => removeMachine(m)} style={chipX} aria-label="remove">×</button>
                </span>
              ))}
            </div>
          </section>

          {/* exercises */}
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 800 }}>운동 기록</div>
                {log.attendance === "결석" ? (
                  <div style={{ color: "#b00020", fontSize: 13, marginTop: 4 }}>
                    결석 처리됨: 운동 추가/세트 추가는 막혀있어.
                  </div>
                ) : (
                  <div style={{ color: "#777", fontSize: 13, marginTop: 4 }}>
                    운동명/기구 선택 → 세트별 무게/횟수/RPE 입력
                  </div>
                )}
              </div>
              <button onClick={addExercise} style={btnOutline}>+ 운동 추가</button>
            </div>

            {log.exercises.length === 0 ? (
              <div style={{ marginTop: 14, color: "#777" }}>아직 운동이 없습니다. “운동 추가”를 눌러줘.</div>
            ) : (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                {log.exercises.map((ex) => (
                  <div key={ex.id} style={{ ...card, background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: "1 1 520px" }}>
                        <label style={{ ...field, minWidth: 220, flex: "1 1 220px" }}>
                          <div style={label}>기구</div>
                          <select
                            style={input}
                            value={ex.machine}
                            onChange={(e) => updateExercise(ex.id, { machine: e.target.value })}
                          >
                            {machines.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </label>

                        <label style={{ ...field, minWidth: 260, flex: "2 1 260px" }}>
                          <div style={label}>운동명</div>
                          <input
                            style={input}
                            value={ex.name}
                            onChange={(e) => updateExercise(ex.id, { name: e.target.value })}
                            placeholder="예: 레그프레스 (발 위치 A)"
                          />
                        </label>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                        <button onClick={() => addSet(ex.id)} style={btnGhost}>+ 세트</button>
                        <button onClick={() => removeExercise(ex.id)} style={btnDanger}>삭제</button>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            <th style={th}>세트</th>
                            <th style={th}>무게(kg)</th>
                            <th style={th}>횟수</th>
                            <th style={th}>RPE(6~10)</th>
                            <th style={th}>메모</th>
                            <th style={thRight}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {ex.sets.map((s, idx) => (
                            <tr key={s.id}>
                              <td style={tdCenter}>{idx + 1}</td>
                              <td style={td}>
                                <input
                                  style={miniInput}
                                  type="number"
                                  min={0}
                                  value={s.weight}
                                  onChange={(e) => updateSet(ex.id, s.id, { weight: Number(e.target.value) })}
                                />
                              </td>
                              <td style={td}>
                                <input
                                  style={miniInput}
                                  type="number"
                                  min={0}
                                  value={s.reps}
                                  onChange={(e) => updateSet(ex.id, s.id, { reps: Number(e.target.value) })}
                                />
                              </td>
                              <td style={td}>
                                <input
                                  style={miniInput}
                                  type="number"
                                  min={6}
                                  max={10}
                                  step={0.5}
                                  value={s.rpe}
                                  onChange={(e) => updateSet(ex.id, s.id, { rpe: Number(e.target.value) })}
                                />
                              </td>
                              <td style={td}>
                                <input
                                  style={{ ...miniInput, width: "100%" }}
                                  value={s.note || ""}
                                  onChange={(e) => updateSet(ex.id, s.id, { note: e.target.value })}
                                  placeholder="예: 반동 X / 통증 없음"
                                />
                              </td>
                              <td style={tdRight}>
                                <button onClick={() => removeSet(ex.id, s.id)} style={btnTiny} title="세트 삭제">삭제</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div style={{ marginTop: 10, color: "#666", fontSize: 13 }}>
                        이 운동 볼륨: <b>{calcExerciseVolume(ex).toLocaleString()}</b>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* toast */}
      {toast ? (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#111",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 999,
            fontSize: 13,
            opacity: 0.92,
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

/** styles */
const card: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 14,
  background: "#fff",
  boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
};

const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const label: React.CSSProperties = { fontSize: 13, color: "#666" };

const input: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  borderRadius: 12,
  padding: "10px 12px",
  outline: "none",
};

const miniInput: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  borderRadius: 10,
  padding: "8px 10px",
  outline: "none",
  width: 110,
};

const btnPrimary: React.CSSProperties = {
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  padding: "10px 12px",
  borderRadius: 12,
  cursor: "pointer",
};

const btnOutline: React.CSSProperties = {
  border: "1px solid #111",
  background: "#fff",
  color: "#111",
  padding: "10px 12px",
  borderRadius: 12,
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  background: "#fff",
  color: "#111",
  padding: "10px 12px",
  borderRadius: 12,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  border: "1px solid #ffdddd",
  background: "#fff5f5",
  color: "#b00020",
  padding: "10px 12px",
  borderRadius: 12,
  cursor: "pointer",
};

const btnTiny: React.CSSProperties = {
  border: "1px solid #eee",
  background: "#fff",
  padding: "6px 10px",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 12,
};

const chip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #eee",
  background: "#fafafa",
  fontSize: 13,
};

const chipX: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
  padding: 0,
};

const th: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  color: "#666",
  borderBottom: "1px solid #eee",
  padding: "10px 8px",
  whiteSpace: "nowrap",
};

const thRight: React.CSSProperties = { ...th, textAlign: "right" };

const td: React.CSSProperties = {
  borderBottom: "1px solid #f0f0f0",
  padding: "10px 8px",
  verticalAlign: "middle",
};

const tdCenter: React.CSSProperties = { ...td, textAlign: "center", width: 64 };
const tdRight: React.CSSProperties = { ...td, textAlign: "right", width: 90 };
