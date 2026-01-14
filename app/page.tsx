"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

/** =========================
 * Types
 * ========================= */
type ScheduleEvent = {
  id: string;
  memberId: string;
  memberName: string;
  dateISO: string;
  time: string;
  durationMin: number;
  status: "신청" | "확정" | "완료" | "취소";
  note?: string;
  createdAt: string;
  updatedAt: string;
};

type ChangeItem = {
  id: string;
  createdAt: string;
  memberName: string;
  type: "신청" | "변경" | "취소";
  before?: string;
  after?: string;
  dateISO: string;
  time: string;
  status: "대기" | "확정";
};

type NotificationItem = {
  id: string;
  createdAt: string;
  title: string;
  body: string;
  read: boolean;
};

type RecentLogItem = {
  id: string;
  memberName: string;
  dateISO: string;
  updatedAt: string;
};

type Member = {
  id: string;
  name: string;
  phone?: string;
};

const LS_KEYS = {
  MEMBERS: "formpick_members_v1",
  EVENTS: "formpick_schedule_events_v1",
  CHANGES: "formpick_admin_changes_v1",
  NOTIFICATIONS: "formpick_admin_notifications_v1",
  // 아직 자동으로 안 만들었으면 비어있을 수 있음 (나중에 workout-log 쪽에서 인덱싱 붙이면 살아남)
  LOG_INDEX: "formpick_admin_log_index_v1",
};

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

/** calendar helpers */
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
  return new Date(y, m1 - 1, 1).getDay();
}

function CalendarMonthHome({
  focusISO,
  countsByDate,
  monthTotal,
}: {
  focusISO: string;
  countsByDate: Record<string, number>;
  monthTotal: number;
}) {
  const { y, m1 } = parseISO(focusISO);
  const firstW = weekdayOfFirst(y, m1);
  const dim = daysInMonth(y, m1);

  const cells: Array<{ iso: string | null; day: number | null }> = [];
  for (let i = 0; i < firstW; i++) cells.push({ iso: null, day: null });
  for (let d = 1; d <= dim; d++) cells.push({ iso: isoFromParts(y, m1, d), day: d });
  while (cells.length % 7 !== 0) cells.push({ iso: null, day: null });
  while (cells.length < 42) cells.push({ iso: null, day: null });

  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div style={panel}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-end" }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>
            {y}년 {m1}월
          </div>
          <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
            이번 달 수업: <b>{monthTotal}</b>건
          </div>
        </div>
        <Link href="/schedule" style={linkBtn}>일정 관리</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 10 }}>
        {weekdays.map((w) => (
          <div key={w} style={{ fontSize: 12, color: "#666", textAlign: "center", padding: "4px 0" }}>
            {w}
          </div>
        ))}

        {cells.map((c, idx) => {
          const cnt = c.iso ? (countsByDate[c.iso] || 0) : 0;
          const isToday = c.iso === todayISO();
          return (
            <div
              key={idx}
              style={{
                border: "1px solid #eee",
                background: isToday ? "#111" : "#fff",
                color: isToday ? "#fff" : "#111",
                borderRadius: 12,
                padding: "10px 0",
                textAlign: "center",
                opacity: c.iso ? 1 : 0.35,
                position: "relative",
                fontSize: 13,
              }}
              title={c.iso ?? ""}
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
                    background: isToday ? "#fff" : "#111",
                    color: isToday ? "#111" : "#fff",
                  }}
                >
                  {cnt}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href="/schedule" style={btnOutline}>+ 수업 추가</Link>
        <Link href="/workout-log" style={btnPrimary}>운동일지 작성</Link>
      </div>
    </div>
  );
}

export default function AdminHome() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentLogItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    setEvents(safeParse<ScheduleEvent[]>(localStorage.getItem(LS_KEYS.EVENTS), []));
    setChanges(safeParse<ChangeItem[]>(localStorage.getItem(LS_KEYS.CHANGES), []));
    setNotifications(safeParse<NotificationItem[]>(localStorage.getItem(LS_KEYS.NOTIFICATIONS), []));
    setRecentLogs(safeParse<RecentLogItem[]>(localStorage.getItem(LS_KEYS.LOG_INDEX), []));
    setMembers(safeParse<Member[]>(localStorage.getItem(LS_KEYS.MEMBERS), []));
  }, []);

  useEffect(() => {
    if (members.length > 0) {
      localStorage.setItem(LS_KEYS.MEMBERS, JSON.stringify(members));
    }
  }, [members]);

  function showToastMessage(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  }

  function addMember() {
    const name = newMemberName.trim();
    if (!name) {
      showToastMessage("회원 이름을 입력해줘!");
      return;
    }
    const member: Member = { id: uid("m"), name, phone: newMemberPhone.trim() || undefined };
    setMembers((prev) => [member, ...prev]);
    setNewMemberName("");
    setNewMemberPhone("");
    setShowAddMemberModal(false);
    showToastMessage("회원 추가 완료 ✅");
  }

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
    const t = todayISO();
    const { y, m1 } = parseISO(t);
    const prefix = `${y}-${String(m1).padStart(2, "0")}-`;
    return events.filter((e) => e.status !== "취소" && e.dateISO.startsWith(prefix)).length;
  }, [events]);

  // 월간 리포트 계산
  const monthReport = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m1 = now.getMonth() + 1;
    const prefix = `${y}-${String(m1).padStart(2, "0")}-`;

    const monthEvents = events.filter((e) => e.dateISO.startsWith(prefix));
    const monthCanceled = monthEvents.filter((e) => e.status === "취소").length;
    const monthCompleted = monthEvents.filter((e) => e.status === "완료").length;
    const monthAll = monthEvents.length;

    const cancelRate = monthAll === 0 ? 0 : Math.round((monthCanceled / monthAll) * 100);

    const topMembers = Object.entries(
      monthEvents
        .filter((e) => e.status === "완료")
        .reduce<Record<string, number>>((acc, e) => {
          acc[e.memberName] = (acc[e.memberName] || 0) + 1;
          return acc;
        }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { y, m1, monthAll, monthCompleted, cancelRate, topMembers };
  }, [events]);

  const todayCount = useMemo(() => countsByDate[todayISO()] || 0, [countsByDate]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const todayEvents = useMemo(() => {
    const t = todayISO();
    return events
      .filter((e) => e.dateISO === t && e.status !== "취소")
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [events]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 18 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, letterSpacing: "-0.2px" }}>Formpick 관리자</h1>
          <div style={{ color: "#666", marginTop: 6 }}>
            오늘 수업 <b>{todayCount}</b>건 · 이번 달 수업 <b>{monthTotal}</b>건
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/schedule" style={btnPrimary}>수업 일정</Link>
          <Link href="/workout-log" style={btnOutline}>운동일지</Link>
          <Link href="/notifications" style={btnGhost}>
            알림 {unreadCount > 0 ? <span style={badge}>{unreadCount}</span> : null}
          </Link>
        </div>
      </header>

      {/* quick cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 16 }}>
        <QuickCard title="신청/변경" desc="최근 요청을 빠르게 확인" right={<span style={pill}>{changes.length}건</span>} href="/schedule" />
        <QuickCard
          title="수업 신청 알림"
          desc="미확인 알림 체크"
          right={<span style={{ ...pill, background: "#111", color: "#fff" }}>{unreadCount} 미확인</span>}
          href="/notifications"
        />
        <QuickCard title="수업 기록" desc="운동일지 작성/전송" right={<span style={pill}>바로가기</span>} href="/workout-log" />
        <div
          onClick={() => setShowAddMemberModal(true)}
          style={{ ...cardLink, cursor: "pointer" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>회원 추가</div>
            <span style={pill}>{members.length}명</span>
          </div>
          <div style={{ color: "#666", fontSize: 13, marginTop: 6 }}>새 회원 등록하기</div>
        </div>
      </section>

      {/* main layout: calendar + old dashboard blocks */}
      <section style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 12, marginTop: 12 }}>
        {/* Left: calendar */}
        <CalendarMonthHome focusISO={todayISO()} countsByDate={countsByDate} monthTotal={monthTotal} />

        {/* Right: stacks */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Today schedule */}
          <div style={panel}>
            <div style={panelHead}>
              <div>
                <div style={panelTitle}>오늘 수업</div>
                <div style={panelSub}>{formatKoreanDate(todayISO())}</div>
              </div>
              <Link href="/schedule" style={linkBtn}>일정 열기</Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {todayEvents.length === 0 ? (
                <div style={{ color: "#777" }}>오늘 수업이 없어.</div>
              ) : (
                todayEvents.map((e) => (
                  <div key={e.id} style={row}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{e.time} · {e.memberName}</div>
                      <div style={{ color: "#666", fontSize: 13, marginTop: 2 }}>{e.durationMin}분 {e.note ? `· ${e.note}` : ""}</div>
                    </div>
                    <span style={pill}>{e.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 월간 리포트 */}
          <div style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>월간 리포트</div>
                <div style={{ color: "#777", fontSize: 13, marginTop: 4 }}>
                  {monthReport.y}년 {monthReport.m1}월
                </div>
              </div>
              <Link href="/schedule" style={linkBtn}>일정 보기</Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 12 }}>
              <div style={statCard}>
                <div style={statLabel}>이번 달 수업(전체)</div>
                <div style={statValue}>{monthReport.monthAll}건</div>
              </div>
              <div style={statCard}>
                <div style={statLabel}>완료</div>
                <div style={statValue}>{monthReport.monthCompleted}건</div>
              </div>
              <div style={statCard}>
                <div style={statLabel}>취소율</div>
                <div style={statValue}>{monthReport.cancelRate}%</div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 900 }}>회원별 출석 TOP</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {monthReport.topMembers.length === 0 ? (
                  <div style={{ color: "#777" }}>이번 달 완료 수업이 아직 없어.</div>
                ) : (
                  monthReport.topMembers.map(([name, cnt]) => (
                    <div key={name} style={row}>
                      <div style={{ fontWeight: 900 }}>{name}</div>
                      <span style={pill}>{cnt}회</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Changes */}
          <div style={panel}>
            <div style={panelHead}>
              <div>
                <div style={panelTitle}>신청/변경 내역</div>
                <div style={panelSub}>최근 5건</div>
              </div>
              <Link href="/schedule" style={linkBtn}>전체보기</Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {changes.slice(0, 5).map((c) => (
                <div key={c.id} style={row}>
                  <div>
                    <div style={{ fontWeight: 900 }}>
                      {c.memberName} · {formatKoreanDate(c.dateISO)} {c.time}
                    </div>
                    <div style={{ color: "#666", fontSize: 13, marginTop: 2 }}>
                      {c.type === "변경" ? `시간 변경: ${c.before} → ${c.after}` : c.type === "신청" ? "신규 신청" : "취소"}
                      {" · "}
                      <span style={{ color: "#777" }}>{fmtDateTime(c.createdAt)}</span>
                    </div>
                  </div>
                  <span style={pill}>{c.type}</span>
                </div>
              ))}
              {changes.length === 0 ? <div style={{ color: "#777" }}>아직 내역이 없어.</div> : null}
            </div>
          </div>

          {/* Notifications + Recent logs 2-column */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={panel}>
              <div style={panelHead}>
                <div>
                  <div style={panelTitle}>알림</div>
                  <div style={panelSub}>최근 5개</div>
                </div>
                <Link href="/notifications" style={linkBtn}>전체보기</Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} style={{ ...row, alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {!n.read ? <span style={{ width: 8, height: 8, borderRadius: 999, background: "#111", display: "inline-block" }} /> : null}
                        <div style={{ fontWeight: 900 }}>{n.title}</div>
                      </div>
                      <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>{n.body}</div>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 ? <div style={{ color: "#777" }}>알림이 없어.</div> : null}
              </div>
            </div>

            <div style={panel}>
              <div style={panelHead}>
                <div>
                  <div style={panelTitle}>최근 수업기록</div>
                  <div style={panelSub}>운동일지 작성 기록</div>
                </div>
                <Link href="/workout-log" style={linkBtn}>작성하기</Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {recentLogs.slice(0, 5).map((l) => (
                  <div key={l.id} style={row}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{l.memberName} · {formatKoreanDate(l.dateISO)}</div>
                      <div style={{ color: "#666", fontSize: 13, marginTop: 2 }}>마지막 수정: {fmtDateTime(l.updatedAt)}</div>
                    </div>
                    <Link href="/workout-log" style={btnTiny}>열기</Link>
                  </div>
                ))}
                {recentLogs.length === 0 ? (
                  <div style={{ color: "#777" }}>
                    아직 인덱스가 없어. (원하면 운동일지 저장할 때 “최근 기록” 자동 쌓이게 붙여줄게)
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAddMemberModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 24,
              maxWidth: 400,
              width: "90%",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>회원 추가</h2>
              <button
                onClick={() => setShowAddMemberModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "#666",
                  padding: 0,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={field}>
                <div style={label}>회원 이름 *</div>
                <input
                  style={input}
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="예: 홍길동"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addMember();
                    }
                  }}
                  autoFocus
                />
              </label>

              <label style={field}>
                <div style={label}>전화번호 (선택)</div>
                <input
                  style={input}
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  placeholder="예: 010-1234-5678"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addMember();
                    }
                  }}
                />
              </label>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={addMember} style={{ ...btnPrimary, flex: 1 }}>
                  추가하기
                </button>
                <button onClick={() => setShowAddMemberModal(false)} style={btnOutline}>
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
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
            zIndex: 1001,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function QuickCard({
  title,
  desc,
  right,
  href,
}: {
  title: string;
  desc: string;
  right?: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href} style={cardLink}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
        {right}
      </div>
      <div style={{ color: "#666", fontSize: 13, marginTop: 6 }}>{desc}</div>
    </Link>
  );
}

/** styles */
const cardLink: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 18,
  padding: 14,
  textDecoration: "none",
  color: "inherit",
  background: "#fff",
  boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
};

const panel: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 18,
  padding: 14,
  background: "#fff",
  boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
};

const panelHead: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};

const panelTitle: React.CSSProperties = { fontWeight: 900, fontSize: 16 };
const panelSub: React.CSSProperties = { color: "#777", fontSize: 13, marginTop: 4 };

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

const btnPrimary: React.CSSProperties = {
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  padding: "10px 12px",
  borderRadius: 12,
  textDecoration: "none",
};

const btnOutline: React.CSSProperties = {
  border: "1px solid #111",
  background: "#fff",
  color: "#111",
  padding: "10px 12px",
  borderRadius: 12,
  textDecoration: "none",
};

const btnGhost: React.CSSProperties = {
  border: "1px solid #eee",
  background: "#fff",
  color: "#111",
  padding: "10px 12px",
  borderRadius: 12,
  textDecoration: "none",
};

const btnTiny: React.CSSProperties = {
  border: "1px solid #eee",
  background: "#fff",
  padding: "8px 10px",
  borderRadius: 12,
  textDecoration: "none",
  color: "#111",
  fontSize: 13,
};

const linkBtn: React.CSSProperties = {
  border: "1px solid #eee",
  background: "#fff",
  padding: "8px 10px",
  borderRadius: 12,
  textDecoration: "none",
  color: "#111",
  fontSize: 13,
};

const badge: React.CSSProperties = {
  marginLeft: 8,
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 12,
  fontWeight: 900,
  background: "#111",
  color: "#fff",
  display: "inline-block",
};

const pill: React.CSSProperties = {
  border: "1px solid #eee",
  background: "#fafafa",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
};

const statCard: React.CSSProperties = {
  border: "1px solid #f0f0f0",
  borderRadius: 16,
  padding: 12,
  background: "#fff",
};
const statLabel: React.CSSProperties = { color: "#777", fontSize: 13 };
const statValue: React.CSSProperties = { fontWeight: 900, fontSize: 18, marginTop: 6 };

const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const label: React.CSSProperties = { fontSize: 13, color: "#666" };

const input: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  borderRadius: 12,
  padding: "10px 12px",
  outline: "none",
};
