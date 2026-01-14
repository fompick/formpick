"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";

/** =========================
 * Types
 * ========================= */
type Member = { id: string; name: string; phone?: string };

type ScheduleEvent = {
  id: string;
  memberId: string;
  memberName: string;
  dateISO: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMin: number; // default 50
  status: "신청" | "확정" | "완료" | "취소";
  note?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};

type ChangeItem = {
  id: string;
  createdAt: string;
  memberName: string;
  type: "신청" | "변경" | "취소";
  before?: string; // time
  after?: string; // time
  dateISO: string;
  time: string; // current time
  status: "대기" | "확정";
};

type NotificationItem = {
  id: string;
  createdAt: string;
  title: string;
  body: string;
  read: boolean;
};

const LS_KEYS = {
  MEMBERS: "formpick_members_v1",
  EVENTS: "formpick_schedule_events_v1",
  CHANGES: "formpick_admin_changes_v1",
  NOTIFICATIONS: "formpick_admin_notifications_v1",
};

const SEED_MEMBERS: Member[] = [
  { id: "m_001", name: "김OO", phone: "010-0000-0000" },
  { id: "m_002", name: "이OO", phone: "010-0000-0000" },
  { id: "m_003", name: "박OO", phone: "010-0000-0000" },
];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
function safeParse<T>(v: string | null, fallback: T): T {
  try {
    if (!v) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}
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
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

/** =========================
 * Calendar helpers
 * ========================= */
function parseISO(iso: string) {
  const [yy, mm, dd] = iso.split("-").map(Number);
  return { y: yy, m1: mm, d: dd };
}
function isoFromParts(y: number, m1: number, d: number) {
  const mm = String(m1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
function daysInMonth(y: number, m1: number) {
  return new Date(y, m1, 0).getDate();
}
function weekdayOfFirst(y: number, m1: number) {
  return new Date(y, m1 - 1, 1).getDay(); // 0 Sun
}

type CalendarProps = {
  selectedISO: string;
  onSelectISO: (iso: string) => void;
  countsByDate: Record<string, number>;
  monthTotal: number;
};

function CalendarMonth({ selectedISO, onSelectISO, countsByDate, monthTotal }: CalendarProps) {
  const { y: selY, m1: selM1 } = parseISO(selectedISO);
  const [y, setY] = useState(selY);
  const [m1, setM1] = useState(selM1);

  useEffect(() => {
    setY(selY);
    setM1(selM1);
  }, [selY, selM1]);

  const firstW = weekdayOfFirst(y, m1);
  const dim = daysInMonth(y, m1);

  const cells: Array<{ iso: string | null; day: number | null }> = [];
  for (let i = 0; i < firstW; i++) cells.push({ iso: null, day: null });
  for (let d = 1; d <= dim; d++) cells.push({ iso: isoFromParts(y, m1, d), day: d });
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
    onSelectISO(isoFromParts(ny, nm, 1));
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
    onSelectISO(isoFromParts(ny, nm, 1));
  }
  function goToday() {
    onSelectISO(todayISO());
  }

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {y}년 {m1}월
          </div>
          <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>이번 달 수업: <b>{monthTotal}</b>건</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={btnGhost} onClick={prevMonth}>◀</button>
          <button style={btnGhost} onClick={goToday}>오늘</button>
          <button style={btnGhost} onClick={nextMonth}>▶</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 10 }}>
        {weekdays.map((w) => (
          <div key={w} style={{ fontSize: 12, color: "#666", textAlign: "center", padding: "4px 0" }}>{w}</div>
        ))}

        {cells.map((c, idx) => {
          const isSelected = c.iso === selectedISO;
          const isClickable = Boolean(c.iso);
          const cnt = c.iso ? (countsByDate[c.iso] || 0) : 0;

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
                position: "relative",
              }}
              title={c.iso ? c.iso : ""}
            >
              {c.day ?? ""}
              {cnt > 0 ? (
                <span
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    borderRadius: 999,
                    padding: "2px 7px",
                    fontSize: 11,
                    fontWeight: 900,
                    background: isSelected ? "#fff" : "#111",
                    color: isSelected ? "#111" : "#fff",
                  }}
                >
                  {cnt}
                </span>
              ) : null}
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
export default function SchedulePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedISO, setSelectedISO] = useState<string>(todayISO());

  // create form
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [time, setTime] = useState<string>("10:00");
  const [durationMin, setDurationMin] = useState<number>(50);
  const [status, setStatus] = useState<ScheduleEvent["status"]>("신청");
  const [note, setNote] = useState<string>("");

  // edit mode
  const [editingId, setEditingId] = useState<string | null>(null);

  // toast
  const [toast, setToast] = useState<string>("");
  const toastTimer = useRef<number | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1600);
  }

  useEffect(() => {
    const savedMembers = safeParse<Member[]>(localStorage.getItem(LS_KEYS.MEMBERS), SEED_MEMBERS);
    setMembers(savedMembers.length ? savedMembers : SEED_MEMBERS);

    const savedEvents = safeParse<ScheduleEvent[]>(localStorage.getItem(LS_KEYS.EVENTS), []);
    setEvents(savedEvents);

    setSelectedMemberId((savedMembers[0]?.id || SEED_MEMBERS[0]?.id || ""));
  }, []);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.EVENTS, JSON.stringify(events));
  }, [events]);

  // counts
  const countsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    events
      .filter((e) => e.status !== "취소")
      .forEach((e) => {
        map[e.dateISO] = (map[e.dateISO] || 0) + 1;
      });
    return map;
  }, [events]);

  const monthTotal = useMemo(() => {
    const { y, m1 } = parseISO(selectedISO);
    const prefix = `${y}-${String(m1).padStart(2, "0")}-`;
    return events.filter((e) => e.status !== "취소" && e.dateISO.startsWith(prefix)).length;
  }, [events, selectedISO]);

  const todayCount = useMemo(() => countsByDate[todayISO()] || 0, [countsByDate]);

  const selectedDayEvents = useMemo(() => {
    return events
      .filter((e) => e.dateISO === selectedISO)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [events, selectedISO]);

  const selectedMember = useMemo(
    () => members.find((m) => m.id === selectedMemberId) || null,
    [members, selectedMemberId]
  );

  function pushChange(type: ChangeItem["type"], memberName: string, dateISO: string, time: string, before?: string, after?: string) {
    const item: ChangeItem = {
      id: uid("chg"),
      createdAt: new Date().toISOString(),
      memberName,
      type,
      dateISO,
      time,
      before,
      after,
      status: "대기",
    };
    const prev = safeParse<ChangeItem[]>(localStorage.getItem(LS_KEYS.CHANGES), []);
    const next = [item, ...prev];
    localStorage.setItem(LS_KEYS.CHANGES, JSON.stringify(next));
  }

  function pushNotification(title: string, body: string) {
    const item: NotificationItem = {
      id: uid("noti"),
      createdAt: new Date().toISOString(),
      title,
      body,
      read: false,
    };
    const prev = safeParse<NotificationItem[]>(localStorage.getItem(LS_KEYS.NOTIFICATIONS), []);
    const next = [item, ...prev];
    localStorage.setItem(LS_KEYS.NOTIFICATIONS, JSON.stringify(next));
  }

  function resetForm() {
    setEditingId(null);
    setTime("10:00");
    setDurationMin(50);
    setStatus("신청");
    setNote("");
  }

  function createEvent() {
    if (!selectedMember) return showToast("회원 선택이 필요해!");
    if (!time) return showToast("시간을 입력해줘!");

    // 같은 회원 같은 날짜 같은 시간 중복 방지(간단)
    const dup = events.some((e) => e.memberId === selectedMember.id && e.dateISO === selectedISO && e.time === time && e.status !== "취소");
    if (dup) return showToast("같은 시간에 이미 예약이 있어!");

    const ev: ScheduleEvent = {
      id: uid("ev"),
      memberId: selectedMember.id,
      memberName: selectedMember.name,
      dateISO: selectedISO,
      time,
      durationMin: Number(durationMin) || 50,
      status,
      note: note.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setEvents((prev) => [ev, ...prev]);
    pushChange("신청", ev.memberName, ev.dateISO, ev.time);
    pushNotification("수업 신청", `${ev.memberName} 회원님이 ${formatKoreanDate(ev.dateISO)} ${ev.time} 수업을 신청했습니다.`);
    showToast("수업 등록 ✅");
    resetForm();
  }

  function startEdit(ev: ScheduleEvent) {
    setEditingId(ev.id);
    setSelectedMemberId(ev.memberId);
    setTime(ev.time);
    setDurationMin(ev.durationMin);
    setStatus(ev.status);
    setNote(ev.note || "");
  }

  function saveEdit() {
    if (!editingId) return;
    const current = events.find((e) => e.id === editingId);
    if (!current) return;

    if (!selectedMember) return showToast("회원 선택이 필요해!");
    if (!time) return showToast("시간을 입력해줘!");

    const beforeTime = current.time;
    const afterTime = time;

    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== editingId) return e;
        return {
          ...e,
          memberId: selectedMember.id,
          memberName: selectedMember.name,
          dateISO: selectedISO,
          time,
          durationMin: Number(durationMin) || 50,
          status,
          note: note.trim(),
          updatedAt: new Date().toISOString(),
        };
      })
    );

    if (beforeTime !== afterTime || current.dateISO !== selectedISO) {
      pushChange("변경", selectedMember.name, selectedISO, time, beforeTime, afterTime);
      pushNotification(
        "수업 변경",
        `${selectedMember.name} 회원님의 수업이 변경되었습니다. (${formatKoreanDate(current.dateISO)} ${beforeTime} → ${formatKoreanDate(selectedISO)} ${afterTime})`
      );
    } else {
      // 상태/메모 변경도 운영상 알림을 원하면 여기서 추가 가능
    }

    showToast("수업 수정 ✅");
    resetForm();
  }

  function cancelEvent(id: string) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;

    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "취소", updatedAt: new Date().toISOString() } : e))
    );

    pushChange("취소", ev.memberName, ev.dateISO, ev.time);
    pushNotification("수업 취소", `${ev.memberName} 회원님의 ${formatKoreanDate(ev.dateISO)} ${ev.time} 수업이 취소되었습니다.`);
    showToast("취소 처리 ✅");
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 18 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>수업 일정</h1>
          <div style={{ color: "#666", marginTop: 6 }}>
            달력에서 날짜 선택 → 해당 날짜 수업 추가/변경/취소
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/" style={btnGhost}>관리자 홈</Link>
          <Link href="/workout-log" style={btnOutline}>운동일지</Link>
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 12, marginTop: 14 }}>
        {/* Left: Calendar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <CalendarMonth
            selectedISO={selectedISO}
            onSelectISO={setSelectedISO}
            countsByDate={countsByDate}
            monthTotal={monthTotal}
          />

          <div style={card}>
            <div style={{ fontWeight: 900 }}>오늘 수업</div>
            <div style={{ color: "#666", fontSize: 13, marginTop: 6 }}>
              오늘({formatKoreanDate(todayISO())}) 수업: <b>{todayCount}</b>건
            </div>
          </div>
        </aside>

        {/* Right: Day list + form */}
        <main style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{formatKoreanDate(selectedISO)} 수업</div>
                <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
                  총 <b>{selectedDayEvents.filter(e => e.status !== "취소").length}</b>건 (취소 제외)
                </div>
              </div>
              <div style={{ color: "#777", fontSize: 12 }}>자동 저장: localStorage</div>
            </div>

            {/* day list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {selectedDayEvents.length === 0 ? (
                <div style={{ color: "#777" }}>이 날짜에 등록된 수업이 없어.</div>
              ) : (
                selectedDayEvents.map((ev) => (
                  <div key={ev.id} style={row}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={tag(ev.status)}>{ev.status}</span>
                      <div>
                        <div style={{ fontWeight: 900 }}>{ev.time} · {ev.memberName}</div>
                        <div style={{ color: "#666", fontSize: 13, marginTop: 2 }}>
                          {ev.durationMin}분 {ev.note ? `· ${ev.note}` : ""}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => startEdit(ev)} style={btnTiny}>수정</button>
                      <button onClick={() => cancelEvent(ev.id)} style={btnDangerTiny}>취소</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* form */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 900 }}>{editingId ? "수업 수정" : "수업 추가"}</div>
              {editingId ? <button onClick={resetForm} style={btnGhost}>편집 취소</button> : null}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
              <label style={field}>
                <div style={label}>회원</div>
                <select style={input} value={selectedMemberId} onChange={(e) => setSelectedMemberId(e.target.value)}>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>

              <label style={field}>
                <div style={label}>시간</div>
                <input style={input} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>

              <label style={field}>
                <div style={label}>시간(분)</div>
                <input style={input} type="number" min={10} step={5} value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} />
              </label>

              <label style={field}>
                <div style={label}>상태</div>
                <select style={input} value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="신청">신청</option>
                  <option value="확정">확정</option>
                  <option value="완료">완료</option>
                  <option value="취소">취소</option>
                </select>
              </label>

              <label style={{ ...field, gridColumn: "span 2" }}>
                <div style={label}>메모</div>
                <input style={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 하체 집중 / 컨디션 체크" />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {editingId ? (
                <button onClick={saveEdit} style={btnPrimary}>수정 저장</button>
              ) : (
                <button onClick={createEvent} style={btnPrimary}>추가</button>
              )}
              <button
                onClick={() => {
                  // 테스트용: 멤버/이벤트 초기화는 위험하니까 이벤트만 지우고 싶으면 아래 주석 해제해서 쓰기
                  // localStorage.removeItem(LS_KEYS.EVENTS);
                  // setEvents([]);
                  showToast("✅ 수업을 추가/수정/취소하면 홈에 자동 반영돼!");
                }}
                style={btnOutline}
              >
                안내
              </button>
            </div>

            <div style={{ color: "#777", fontSize: 12, marginTop: 10 }}>
              변경/취소 시: <b>신청/변경 내역</b> + <b>알림</b>이 자동 생성됨 (홈에서 확인)
            </div>
          </div>
        </main>
      </section>

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

/** =========================
 * styles
 * ========================= */
const card: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 18,
  padding: 14,
  background: "#fff",
  boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
};

const row: React.CSSProperties = {
  border: "1px solid #f0f0f0",
  borderRadius: 16,
  padding: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "center",
  background: "#fff",
};

const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const label: React.CSSProperties = { fontSize: 13, color: "#666" };

const input: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  borderRadius: 12,
  padding: "10px 12px",
  outline: "none",
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
  border: "1px solid #eee",
  background: "#fff",
  color: "#111",
  padding: "10px 12px",
  borderRadius: 12,
  cursor: "pointer",
};

const btnTiny: React.CSSProperties = {
  border: "1px solid #eee",
  background: "#fff",
  padding: "8px 10px",
  borderRadius: 12,
  cursor: "pointer",
  fontSize: 13,
};

const btnDangerTiny: React.CSSProperties = {
  border: "1px solid #ffdddd",
  background: "#fff5f5",
  color: "#b00020",
  padding: "8px 10px",
  borderRadius: 12,
  cursor: "pointer",
  fontSize: 13,
};

function tag(status: ScheduleEvent["status"]): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid #eee",
    background: "#fafafa",
    whiteSpace: "nowrap",
  };
  if (status === "확정") return { ...base, borderColor: "#111", background: "#111", color: "#fff" };
  if (status === "완료") return { ...base, borderColor: "#111", background: "#fff", color: "#111" };
  if (status === "취소") return { ...base, borderColor: "#ffdddd", background: "#fff5f5", color: "#b00020" };
  return base; // 신청
}
