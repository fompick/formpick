"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type PassHistoryItem = {
  id: string;
  createdAt: string; // ISO
  type: "구매" | "차감" | "환불" | "수정";
  amount: number; // + or -
  memo?: string;
  ref?: string; // eventId 같은 참조
};

type MemberV2 = {
  id: string;
  name: string;
  phone?: string;

  remainingPT: number;  // 남은 횟수
  expiryDate: string;   // YYYY-MM-DD, 빈 값 허용 ""
  history: PassHistoryItem[];

  createdAt: string;
  updatedAt: string;
};

const LS = {
  MEMBERS_V2: "formpick_members_v2",
  MEMBERS_V1: "formpick_members_v1",
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
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function migrateMembersToV2(): MemberV2[] {
  // v2가 있으면 그걸 사용
  const v2 = safeParse<MemberV2[]>(localStorage.getItem(LS.MEMBERS_V2), []);
  if (v2.length) return v2;

  // v1이 있으면 v2로 변환
  const v1 = safeParse<Array<{ id: string; name: string; phone?: string }>>(
    localStorage.getItem(LS.MEMBERS_V1),
    []
  );

  const now = new Date().toISOString();
  const seed: MemberV2[] = (v1.length ? v1 : [
    { id: "m_001", name: "김OO", phone: "010-0000-0000" },
    { id: "m_002", name: "이OO", phone: "010-0000-0000" },
    { id: "m_003", name: "박OO", phone: "010-0000-0000" },
  ]).map((m) => ({
    id: m.id,
    name: m.name,
    phone: m.phone,
    remainingPT: 0,
    expiryDate: "",
    history: [],
    createdAt: now,
    updatedAt: now,
  }));

  localStorage.setItem(LS.MEMBERS_V2, JSON.stringify(seed));
  return seed;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberV2[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  // 편집 폼
  const [editRemaining, setEditRemaining] = useState<number>(0);
  const [editExpiry, setEditExpiry] = useState<string>("");

  // 구매 등록
  const [buyCount, setBuyCount] = useState<number>(10);
  const [buyMemo, setBuyMemo] = useState<string>("");

  useEffect(() => {
    const m = migrateMembersToV2();
    setMembers(m);
    setSelectedId(m[0]?.id || "");
  }, []);

  useEffect(() => {
    if (!members.length) return;
    localStorage.setItem(LS.MEMBERS_V2, JSON.stringify(members));
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return members;
    return members.filter((m) => m.name.includes(q) || (m.phone || "").includes(q));
  }, [members, query]);

  const selected = useMemo(() => members.find((m) => m.id === selectedId) || null, [members, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setEditRemaining(selected.remainingPT);
    setEditExpiry(selected.expiryDate);
  }, [selectedId, selected]);

  function upsertMember(partial: Partial<MemberV2> & { id: string }) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === partial.id
          ? { ...m, ...partial, updatedAt: new Date().toISOString() }
          : m
      )
    );
  }

  function addHistory(memberId: string, item: Omit<PassHistoryItem, "id" | "createdAt">) {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id !== memberId) return m;
        const nextItem: PassHistoryItem = {
          id: uid("his"),
          createdAt: new Date().toISOString(),
          ...item,
        };
        return { ...m, history: [nextItem, ...m.history], updatedAt: new Date().toISOString() };
      })
    );
  }

  function saveManualEdit() {
    if (!selected) return;
    const diff = editRemaining - selected.remainingPT;

    upsertMember({ id: selected.id, remainingPT: editRemaining, expiryDate: editExpiry });

    if (diff !== 0 || editExpiry !== selected.expiryDate) {
      addHistory(selected.id, {
        type: "수정",
        amount: diff,
        memo: `관리자 수동 수정 (만료일: ${selected.expiryDate || "없음"} → ${editExpiry || "없음"})`,
      });
    }
  }

  function registerPurchase() {
    if (!selected) return;
    const cnt = Number(buyCount) || 0;
    if (cnt <= 0) return;

    upsertMember({
      id: selected.id,
      remainingPT: selected.remainingPT + cnt,
      // 만료일이 비어 있으면 “오늘부터 3개월” 같은 룰을 넣고 싶다면 여기서 처리 가능
    });

    addHistory(selected.id, {
      type: "구매",
      amount: cnt,
      memo: buyMemo || `PT ${cnt}회 구매`,
    });

    setBuyMemo("");
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 18 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>회원 관리</h1>
          <div style={{ color: "#666", marginTop: 6 }}>남은 PT / 만료일 / 결제 히스토리</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/" style={btnGhost}>관리자 홈</Link>
          <Link href="/schedule" style={btnOutline}>수업 일정</Link>
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 12, marginTop: 14 }}>
        {/* Left list */}
        <aside style={card}>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...input, flex: 1 }}
              placeholder="회원 검색 (이름/전화)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedId(m.id)}
                style={{
                  ...rowBtn,
                  borderColor: m.id === selectedId ? "#111" : "#eee",
                  background: m.id === selectedId ? "#111" : "#fff",
                  color: m.id === selectedId ? "#fff" : "#111",
                }}
              >
                <div style={{ fontWeight: 900 }}>{m.name}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  남은 {m.remainingPT}회 · 만료 {m.expiryDate || "없음"}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Right detail */}
        <main style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!selected ? (
            <div style={card}>회원을 선택해줘.</div>
          ) : (
            <>
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{selected.name}</div>
                    <div style={{ color: "#666", marginTop: 4 }}>
                      {selected.phone || ""} · 생성 {fmtDateTime(selected.createdAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={pill}>남은 {selected.remainingPT}회</span>
                    <span style={pill}>만료 {selected.expiryDate || "없음"}</span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
                  <label style={field}>
                    <div style={label}>남은 PT</div>
                    <input
                      style={input}
                      type="number"
                      min={0}
                      value={editRemaining}
                      onChange={(e) => setEditRemaining(Number(e.target.value))}
                    />
                  </label>

                  <label style={field}>
                    <div style={label}>만료일</div>
                    <input
                      style={input}
                      type="date"
                      value={editExpiry}
                      onChange={(e) => setEditExpiry(e.target.value)}
                    />
                  </label>

                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button onClick={saveManualEdit} style={btnPrimary}>저장</button>
                  </div>
                </div>
              </div>

              <div style={card}>
                <div style={{ fontWeight: 900 }}>결제/이용권 등록(간단)</div>
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 140px", gap: 10, marginTop: 10 }}>
                  <label style={field}>
                    <div style={label}>추가 횟수</div>
                    <input style={input} type="number" min={1} value={buyCount} onChange={(e) => setBuyCount(Number(e.target.value))} />
                  </label>
                  <label style={field}>
                    <div style={label}>메모</div>
                    <input style={input} value={buyMemo} onChange={(e) => setBuyMemo(e.target.value)} placeholder={`예: ${todayISO()} 10회권 결제`} />
                  </label>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <button onClick={registerPurchase} style={btnOutline}>구매 등록</button>
                  </div>
                </div>
              </div>

              <div style={card}>
                <div style={{ fontWeight: 900 }}>히스토리</div>
                <div style={{ color: "#666", fontSize: 13, marginTop: 6 }}>최근 30개 저장</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  {selected.history.length === 0 ? (
                    <div style={{ color: "#777" }}>아직 히스토리가 없어.</div>
                  ) : (
                    selected.history.slice(0, 30).map((h) => (
                      <div key={h.id} style={row}>
                        <div>
                          <div style={{ fontWeight: 900 }}>
                            {h.type} {h.amount >= 0 ? `+${h.amount}` : h.amount}
                          </div>
                          <div style={{ color: "#666", fontSize: 13, marginTop: 2 }}>
                            {h.memo || ""} {h.ref ? `· ref:${h.ref}` : ""} · {fmtDateTime(h.createdAt)}
                          </div>
                        </div>
                        <span style={pill}>{h.type}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </section>
    </div>
  );
}

/** styles */
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
const rowBtn: React.CSSProperties = {
  textAlign: "left",
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 12,
  background: "#fff",
  cursor: "pointer",
};
const field: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const label: React.CSSProperties = { fontSize: 13, color: "#666" };
const input: React.CSSProperties = { border: "1px solid #e6e6e6", borderRadius: 12, padding: "10px 12px", outline: "none" };
const btnPrimary: React.CSSProperties = { border: "1px solid #111", background: "#111", color: "#fff", padding: "10px 12px", borderRadius: 12, cursor: "pointer" };
const btnOutline: React.CSSProperties = { border: "1px solid #111", background: "#fff", color: "#111", padding: "10px 12px", borderRadius: 12, cursor: "pointer" };
const btnGhost: React.CSSProperties = { border: "1px solid #eee", background: "#fff", color: "#111", padding: "10px 12px", borderRadius: 12, cursor: "pointer" };
const pill: React.CSSProperties = { border: "1px solid #eee", background: "#fafafa", padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 800 };
