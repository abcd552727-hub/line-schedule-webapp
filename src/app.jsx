import React, { useEffect, useMemo, useState } from 'react';

const PLAN_MINUTES = {
  '20': 20,
  '40': 40,
  '60': 60,
  '2+1': 60,
};

const STORAGE_KEY = 'line-schedule-ops-system-v1';

const defaultData = {
  header: {
    title: '凱蒂班表',
    date: '2026-04-04',
    hours: '13:00-02:00',
    subtitle: '提供有效客評退水100',
    footer1: '請提前聯繫確認時段',
    footer2: '感謝配合 🙏',
  },
  staff: [
    { id: 1, name: '糖糖', area: '恆春鎮', planText: '方案20/40/60', priceText: '底1.5/2.0/2.3', enabled: true },
    { id: 2, name: '婷ㄦ', area: '恆春鎮', planText: '方案20/40/60', priceText: '底1.5/2.0/2.3', enabled: true },
    { id: 3, name: '琪琪', area: '恆春鎮', planText: '方案20/40/60', priceText: '底1.5/2.0/2.3', enabled: true },
    { id: 4, name: '三歲', area: '東港鎮', planText: '方案20/40/60', priceText: '底1.5/2.0/2.3', enabled: true },
    { id: 5, name: '妍妍', area: '東港鎮', planText: '方案20/40/60', priceText: '底1.5/2.0/2.3', enabled: true },
  ],
  bookings: [
    { id: 1, staffName: '糖糖', time: '13:00', plan: '60', price: '', customer: '', note: '' },
    { id: 2, staffName: '糖糖', time: '14:10', plan: '40', price: '', customer: '', note: '' },
    { id: 3, staffName: '糖糖', time: '15:00', plan: '60', price: '', customer: '', note: '' },
    { id: 4, staffName: '糖糖', time: '18:00', plan: '60', price: '', customer: '', note: '' },
    { id: 5, staffName: '糖糖', time: '23:00', plan: '2+1', price: '', customer: '', note: '' },
    { id: 6, staffName: '糖糖', time: '24:00', plan: '2+1', price: '', customer: '', note: '' },
    { id: 7, staffName: '三歲', time: '16:30', plan: '40', price: '', customer: '', note: '' },
    { id: 8, staffName: '三歲', time: '18:10', plan: '20', price: '', customer: '', note: '' },
    { id: 9, staffName: '三歲', time: '18:30', plan: '60', price: '', customer: '', note: '' },
    { id: 10, staffName: '妍妍', time: '14:05', plan: '20', price: '', customer: '', note: '' },
    { id: 11, staffName: '妍妍', time: '19:20', plan: '60', price: '', customer: '', note: '' },
  ],
};

function timeToMinutes(t) {
  if (!t) return 0;
  const normalized = String(t).replace(/\./g, ':');
  const [hRaw, mRaw] = normalized.split(':');
  let h = Number(hRaw);
  const m = Number(mRaw || 0);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  if (h >= 0 && h <= 5) h += 24;
  return h * 60 + m;
}

function minutesToDisplay(totalMinutes) {
  let mins = totalMinutes;
  while (mins >= 24 * 60) mins -= 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
}

function normalizeTimeInput(value) {
  const v = String(value || '').trim().replace(/\./g, ':');
  const match = v.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return v;
  return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
}

function addPlanMinutes(time, plan) {
  return timeToMinutes(time) + (PLAN_MINUTES[plan] ?? 60);
}

function formatTitleDate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const week = ['日', '一', '二', '三', '四', '五', '六'];
  return `${d.getMonth() + 1}/${d.getDate()}（${week[d.getDay()]}）`;
}

function buildBlocks(bookings) {
  if (!bookings.length) return [];
  const sorted = [...bookings].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  const blocks = [];
  let current = {
    items: [sorted[0]],
    end: addPlanMinutes(sorted[0].time, sorted[0].plan),
  };

  for (let i = 1; i < sorted.length; i += 1) {
    const item = sorted[i];
    const start = timeToMinutes(item.time);
    const end = addPlanMinutes(item.time, item.plan);

    if (start <= current.end) {
      current.items.push(item);
      current.end = Math.max(current.end, end);
    } else {
      blocks.push({ ...current, availableAt: current.end });
      current = { items: [item], end };
    }
  }

  blocks.push({ ...current, availableAt: current.end });
  return blocks;
}

function overlaps(a, b) {
  const aStart = timeToMinutes(a.time);
  const aEnd = addPlanMinutes(a.time, a.plan);
  const bStart = timeToMinutes(b.time);
  const bEnd = addPlanMinutes(b.time, b.plan);
  return aStart < bEnd && bStart < aEnd;
}

function downloadFile(filename, content, type = 'application/json;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sectionStyle() {
  return {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 18,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,.04)',
  };
}

function inputStyle() {
  return {
    width: '100%',
    height: 40,
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '0 12px',
    fontSize: 14,
  };
}

function buttonStyle(primary = true) {
  return {
    height: 40,
    borderRadius: 12,
    border: primary ? 'none' : '1px solid #cbd5e1',
    background: primary ? '#0f172a' : '#fff',
    color: primary ? '#fff' : '#0f172a',
    padding: '0 14px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  };
}

export default function App() {
  const [hydrated, setHydrated] = useState(false);
  const [header, setHeader] = useState(defaultData.header);
  const [staff, setStaff] = useState(defaultData.staff);
  const [bookings, setBookings] = useState(defaultData.bookings);
  const [form, setForm] = useState({ staffName: '糖糖', time: '', plan: '60', price: '', customer: '', note: '' });
  const [staffForm, setStaffForm] = useState({ name: '', area: '', planText: '方案20/40/60', priceText: '底1.5/2.0/2.3' });
  const [quickLine, setQuickLine] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.header) setHeader(parsed.header);
        if (Array.isArray(parsed.staff)) setStaff(parsed.staff);
        if (Array.isArray(parsed.bookings)) setBookings(parsed.bookings);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ header, staff, bookings }));
  }, [hydrated, header, staff, bookings]);

  const sortedStaff = useMemo(() => {
    return [...staff]
      .filter((s) => s.enabled)
      .sort((a, b) => `${a.area}-${a.name}`.localeCompare(`${b.area}-${b.name}`, 'zh-Hant'));
  }, [staff]);

  const conflicts = useMemo(() => {
    const list = [];
    const byStaff = {};
    bookings.forEach((b) => {
      if (!byStaff[b.staffName]) byStaff[b.staffName] = [];
      byStaff[b.staffName].push(b);
    });

    Object.entries(byStaff).forEach(([name, items]) => {
      const sorted = [...items].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
      for (let i = 0; i < sorted.length; i += 1) {
        for (let j = i + 1; j < sorted.length; j += 1) {
          if (overlaps(sorted[i], sorted[j])) {
            list.push(`${name}｜${sorted[i].time}/${sorted[i].plan} 與 ${sorted[j].time}/${sorted[j].plan} 時段重疊`);
          }
        }
      }
    });
    return list;
  }, [bookings]);

  const dailySummary = useMemo(() => {
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, item) => sum + Number(item.price || 0), 0);
    return { totalBookings, totalRevenue };
  }, [bookings]);

  const scheduleText = useMemo(() => {
    const lines = [];
    lines.push(`🎀${formatTitleDate(header.date)}${header.title}🎀`);
    lines.push(`⌛時間 ${header.hours}⌛`);
    if (header.subtitle.trim()) lines.push(`💵${header.subtitle}💵`);
    lines.push('------------------------------');

    sortedStaff.forEach((person, index) => {
      lines.push(`【${person.area}】${person.name}`);
      lines.push(`⚜ ${person.planText}`);
      lines.push(`⚜ ${person.priceText}`);

      const personBookings = bookings.filter((b) => b.staffName === person.name && b.time.trim());
      const blocks = buildBlocks(personBookings);

      if (!blocks.length) {
        lines.push('👉現在可約💦');
      } else {
        blocks.forEach((block) => {
          block.items.forEach((item) => {
            lines.push(`${item.time.replace(':', '.')}／${item.plan}`);
          });
          lines.push(`👉${minutesToDisplay(block.availableAt)}可約💦`);
        });
      }

      if (index !== sortedStaff.length - 1) lines.push('------------------------------');
    });

    lines.push('------------------------------');
    if (header.footer1.trim()) lines.push(header.footer1);
    if (header.footer2.trim()) lines.push(header.footer2);
    return lines.join('\n');
  }, [header, sortedStaff, bookings]);

  const addBooking = () => {
    if (!form.staffName || !form.time || !form.plan) return;
    const normalizedTime = normalizeTimeInput(form.time);
    const newItem = {
      id: Date.now(),
      staffName: form.staffName,
      time: normalizedTime,
      plan: form.plan,
      price: form.price,
      customer: form.customer,
      note: form.note,
    };
    setBookings((prev) => [...prev, newItem]);
    setForm((prev) => ({ ...prev, time: '', plan: '60', price: '', customer: '', note: '' }));
    setMessage('已新增預約');
  };

  const quickAddBooking = () => {
    const raw = quickLine.trim();
    if (!raw) return;
    const parts = raw.split('/').map((x) => x.trim());
    if (parts.length < 3) {
      setMessage('格式錯誤，請用：人員/時間/方案/價格/客戶名稱');
      return;
    }
    const [staffName, time, plan, price = '', customer = '', note = ''] = parts;
    setBookings((prev) => [
      ...prev,
      {
        id: Date.now(),
        staffName,
        time: normalizeTimeInput(time),
        plan,
        price,
        customer,
        note,
      },
    ]);
    setQuickLine('');
    setMessage('已快速新增');
  };

  const removeBooking = (id) => setBookings((prev) => prev.filter((b) => b.id !== id));

  const addStaff = () => {
    if (!staffForm.name || !staffForm.area) return;
    setStaff((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: staffForm.name,
        area: staffForm.area,
        planText: staffForm.planText,
        priceText: staffForm.priceText,
        enabled: true,
      },
    ]);
    setStaffForm({ name: '', area: '', planText: '方案20/40/60', priceText: '底1.5/2.0/2.3' });
    setMessage('已新增人員');
  };

  const toggleStaff = (id) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(scheduleText);
    setMessage('已複製班表文字');
  };

  const exportJson = () => {
    downloadFile(`line-schedule-${header.date || 'data'}.json`, JSON.stringify({ header, staff, bookings }, null, 2));
  };

  const exportTxt = () => {
    downloadFile(`line-schedule-${header.date || 'data'}.txt`, scheduleText, 'text/plain;charset=utf-8');
  };

  const importJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      if (parsed.header) setHeader(parsed.header);
      if (Array.isArray(parsed.staff)) setStaff(parsed.staff);
      if (Array.isArray(parsed.bookings)) setBookings(parsed.bookings);
      setMessage('已匯入資料');
    } catch {
      setMessage('匯入失敗，請確認 JSON 格式');
    }
    event.target.value = '';
  };

  const resetDay = () => {
    setBookings([]);
    setMessage('已清空當日預約');
  };

  const resetAll = () => {
    setHeader(defaultData.header);
    setStaff(defaultData.staff);
    setBookings(defaultData.bookings);
    setMessage('已還原預設資料');
  };

  return (
    <div style={{ minHeight: '100vh', padding: 16, background: '#f8fafc' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ ...sectionStyle(), marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>完整營運系統</div>
              <div style={{ marginTop: 6, color: '#64748b', fontSize: 14 }}>即時班表、預約紀錄、衝堂檢查、快速輸入、匯出備份</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={buttonStyle(false)} onClick={copyOutput}>複製班表</button>
              <button style={buttonStyle(false)} onClick={exportTxt}>匯出 TXT</button>
              <button style={buttonStyle(false)} onClick={exportJson}>備份 JSON</button>
              <label style={{ ...buttonStyle(false), display: 'inline-flex', alignItems: 'center' }}>
                匯入 JSON
                <input type="file" accept="application/json" style={{ display: 'none' }} onChange={importJson} />
              </label>
            </div>
          </div>
          {message ? <div style={{ marginTop: 12, color: '#475569', fontSize: 14 }}>{message}</div> : null}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={sectionStyle()}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>標題設定</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 14 }}>班表標題</div>
                    <input style={inputStyle()} value={header.title} onChange={(e) => setHeader({ ...header, title: e.target.value })} />
                  </div>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 14 }}>日期</div>
                    <input style={inputStyle()} type="date" value={header.date} onChange={(e) => setHeader({ ...header, date: e.target.value })} />
                  </div>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 14 }}>時間</div>
                    <input style={inputStyle()} value={header.hours} onChange={(e) => setHeader({ ...header, hours: e.target.value })} />
                  </div>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 14 }}>副標題</div>
                    <input style={inputStyle()} value={header.subtitle} onChange={(e) => setHeader({ ...header, subtitle: e.target.value })} />
                  </div>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 14 }}>尾註 1</div>
                    <input style={inputStyle()} value={header.footer1} onChange={(e) => setHeader({ ...header, footer1: e.target.value })} />
                  </div>
                  <div>
                    <div style={{ marginBottom: 6, fontSize: 14 }}>尾註 2</div>
                    <input style={inputStyle()} value={header.footer2} onChange={(e) => setHeader({ ...header, footer2: e.target.value })} />
                  </div>
                </div>
              </div>

              <div style={sectionStyle()}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>快速一行輸入</div>
                <div style={{ marginBottom: 6, fontSize: 14 }}>格式：人員/時間/方案/價格/客戶名稱/備註</div>
                <input style={{ ...inputStyle(), marginBottom: 12 }} value={quickLine} onChange={(e) => setQuickLine(e.target.value)} placeholder="糖糖/18:10/60/2300/王哥/老客" />
                <button style={buttonStyle(true)} onClick={quickAddBooking}>快速新增</button>
              </div>
            </div>

            <div style={sectionStyle()}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>新增預約</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                <div>
                  <div style={{ marginBottom: 6, fontSize: 14 }}>人員</div>
                  <select style={inputStyle()} value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })}>
                    {sortedStaff.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ marginBottom: 6, fontSize: 14 }}>時間</div>
                  <input style={inputStyle()} placeholder="18:10" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
                <div>
                  <div style={{ marginBottom: 6, fontSize: 14 }}>方案</div>
                  <select style={inputStyle()} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                    {['20', '40', '60', '2+1'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ marginBottom: 6, fontSize: 14 }}>價格（內部）</div>
                  <input style={inputStyle()} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div>
                  <div style={{ marginBottom: 6, fontSize: 14 }}>客戶名稱（內部）</div>
                  <input style={inputStyle()} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
                </div>
                <div>
                  <div style={{ marginBottom: 6, fontSize: 14 }}>備註</div>
                  <input style={inputStyle()} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button style={buttonStyle(true)} onClick={addBooking}>新增到系統</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div style={sectionStyle()}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>人員管理</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <input style={inputStyle()} placeholder="名稱" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
                  <input style={inputStyle()} placeholder="地區" value={staffForm.area} onChange={(e) => setStaffForm({ ...staffForm, area: e.target.value })} />
                  <input style={inputStyle()} placeholder="方案顯示" value={staffForm.planText} onChange={(e) => setStaffForm({ ...staffForm, planText: e.target.value })} />
                  <input style={inputStyle()} placeholder="價格顯示" value={staffForm.priceText} onChange={(e) => setStaffForm({ ...staffForm, priceText: e.target.value })} />
                </div>
                <button style={{ ...buttonStyle(true), marginBottom: 12 }} onClick={addStaff}>新增人員</button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {staff.map((s) => (
                    <div key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.name}｜{s.area}</div>
                        <div style={{ color: '#64748b', fontSize: 13 }}>{s.planText}｜{s.priceText}</div>
                      </div>
                      <button style={buttonStyle(s.enabled)} onClick={() => toggleStaff(s.id)}>{s.enabled ? '已啟用' : '已停用'}</button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={sectionStyle()}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>衝堂檢查與摘要</div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 12, marginBottom: 12 }}>
                  <div>今日預約數：<strong>{dailySummary.totalBookings}</strong></div>
                  <div style={{ marginTop: 6 }}>今日內部金額合計：<strong>{dailySummary.totalRevenue}</strong></div>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>衝堂提醒</div>
                  {conflicts.length === 0 ? (
                    <div style={{ color: '#64748b' }}>目前沒有時段重疊</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {conflicts.map((c, i) => (
                        <div key={`${c}-${i}`} style={{ background: '#f8fafc', borderRadius: 10, padding: 8 }}>{c}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button style={buttonStyle(false)} onClick={resetDay}>清空當日預約</button>
                  <button style={buttonStyle(false)} onClick={resetAll}>還原範例資料</button>
                </div>
              </div>
            </div>

            <div style={sectionStyle()}>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>預約紀錄區（內部）</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bookings
                  .slice()
                  .sort((a, b) => {
                    const byName = a.staffName.localeCompare(b.staffName, 'zh-Hant');
                    if (byName !== 0) return byName;
                    return timeToMinutes(a.time) - timeToMinutes(b.time);
                  })
                  .map((b) => (
                    <div key={b.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 14, lineHeight: 1.7 }}>
                        <div><strong>{b.staffName}</strong>｜{b.time}｜{b.plan}</div>
                        <div style={{ color: '#64748b' }}>價格：{b.price || '-'}　客戶：{b.customer || '-'}　備註：{b.note || '-'}</div>
                      </div>
                      <button style={buttonStyle(false)} onClick={() => removeBooking(b.id)}>刪除</button>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div>
            <div style={{ ...sectionStyle(), position: 'sticky', top: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>LINE 輸出</div>
                <button style={buttonStyle(false)} onClick={copyOutput}>複製</button>
              </div>
              <textarea
                readOnly
                value={scheduleText}
                style={{ width: '100%', minHeight: 760, border: '1px solid #cbd5e1', borderRadius: 14, padding: 12, fontFamily: 'monospace', fontSize: 14, whiteSpace: 'pre-wrap' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}