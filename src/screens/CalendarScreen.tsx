import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Tx, fmtLong, monthKey, money, toDateStr, todayStr } from '../model';
import { Chip, INK, MonthSwitch, Pop, T } from '../ui';
import TxRow from '../TxRow';
import type { Theme } from '../theme';

const WD = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export default function CalendarScreen({ t, tx, view, onShift, onEdit }: {
  t: Theme; tx: (Tx & { sample?: boolean })[]; view: Date; onShift: (n: number) => void; onEdit: (x: Tx) => void;
}) {
  const today = todayStr();
  const mk = monthKey(view);
  const y = view.getFullYear(), m = view.getMonth();
  const nDays = new Date(y, m + 1, 0).getDate();
  const first = new Date(y, m, 1).getDay();

  const { spend, gotPaid, max, maxDay, total } = useMemo(() => {
    const spend: Record<string, number> = {};
    const gotPaid = new Set<string>();
    let total = 0;
    for (const x of tx) {
      if (!x.date.startsWith(mk)) continue;
      if (x.type === 'income') gotPaid.add(x.date);
      else { spend[x.date] = (spend[x.date] ?? 0) + x.amount; total += x.amount; }
    }
    let max = 0, maxDay = '';
    for (const [d, v] of Object.entries(spend)) if (v > max) { max = v; maxDay = d; }
    return { spend, gotPaid, max, maxDay, total };
  }, [tx, mk]);

  // The picked day only counts while it is in the month on screen; otherwise show today, or the 1st.
  const [picked, setSel] = useState(today);
  const sel = picked.startsWith(mk) ? picked : today.startsWith(mk) ? today : `${mk}-01`;

  // Colour by rank within the month, so one big rent day doesn't make every other day look the same.
  const ranked = useMemo(() => Object.values(spend).sort((a, b) => a - b), [spend]);
  const level = (v: number) => {
    if (!v) return 0;
    if (v === max) return 4;
    const below = ranked.filter((x) => x < v).length;
    return Math.min(3, 1 + Math.floor((below / Math.max(1, ranked.length - 1)) * 3));
  };
  const dayTx = tx.filter((x) => x.date === sel).sort((a, b) => a.createdAt - b.createdAt);
  const daySpend = spend[sel] ?? 0;
  const dayIn = dayTx.reduce((n, x) => n + (x.type === 'income' ? x.amount : 0), 0);

  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: nDays }, (_, i) => toDateStr(new Date(y, m, i + 1)))];
  while (cells.length % 7) cells.push(null);

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <T w="head" size={26}>ปฏิทินเงิน</T>
        <MonthSwitch view={view} onShift={onShift} />
      </View>

      <View style={s.legend}>
        <T size={12} color={t.muted}>จ่ายน้อย</T>
        {t.heat.map((c) => <View key={c} style={[s.sw, { backgroundColor: c }]} />)}
        <T size={12} color={t.muted}>จ่ายเยอะ</T>
        <View style={{ flex: 1 }} />
        <T w="num" size={13}>รวม {money(total)}</T>
      </View>

      <Pop radius={26} style={{ padding: 12 }}>
        <View style={s.row}>{WD.map((d) => <T key={d} w="semi" size={11} color={t.faint} style={s.wd}>{d}</T>)}</View>
        {Array.from({ length: cells.length / 7 }, (_, r) => (
          <View key={r} style={s.row}>
            {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
              if (!d) return <View key={i} style={s.cellWrap} />;
              const future = d > today;
              const lv = level(spend[d] ?? 0);
              const on = d === sel;
              const bg = on ? INK : future ? 'transparent' : t.heat[lv];
              return (
                <View key={d} style={s.cellWrap}>
                  <Pressable onPress={() => setSel(d)} accessibilityLabel={`${fmtLong(d)} จ่าย ${money(spend[d] ?? 0)}`}
                    style={[s.cell, { backgroundColor: bg },
                      future && { borderWidth: 2, borderStyle: 'dashed', borderColor: '#D9D1BE' },
                      d === today && !on && { borderWidth: 2.5, borderColor: INK }]}>
                    <T w="num" size={12} color={on || lv === 4 ? '#FFFFFF' : future ? '#B5AE9E' : INK}>{Number(d.slice(8))}</T>
                    {gotPaid.has(d) && <View style={[s.paid, { backgroundColor: t.accent }]}><T w="numBold" size={10}>+</T></View>}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </Pop>

      <Pop radius={24} style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T w="head" size={17}>{fmtLong(sel)}</T>
          <View style={{ alignItems: 'flex-end' }}>
            <T w="numBold" size={22}>−{money(daySpend)}</T>
            {dayIn > 0 && <T w="num" size={13} color={t.income}>+{money(dayIn)}</T>}
          </View>
        </View>
        {sel === maxDay && max > 0 && <Chip bg={t.tomato} color="#FFFFFF" tilt={-2} size={12} style={{ marginTop: 4 }}>วันที่จ่ายหนักสุดของเดือน</Chip>}
        {dayTx.length === 0 ? (
          <T size={14} color={t.muted} style={{ paddingVertical: 14, textAlign: 'center' }}>{sel > today ? 'ยังมาไม่ถึง' : 'วันนี้ไม่มีรายการ'}</T>
        ) : dayTx.map((x, i) => <TxRow key={x.id} t={t} x={x} showTime divider={i > 0} sample={x.sample} onPress={() => onEdit(x)} />)}
      </Pop>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 130, gap: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sw: { width: 14, height: 14, borderRadius: 4 },
  row: { flexDirection: 'row' },
  wd: { flex: 1, textAlign: 'center', marginBottom: 4 },
  cellWrap: { flex: 1, aspectRatio: 1, padding: 3 },
  cell: { flex: 1, borderRadius: 11, paddingHorizontal: 6, paddingTop: 3 },
  paid: { position: 'absolute', right: 2, bottom: 2, width: 15, height: 15, borderRadius: 8, borderWidth: 1.5, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
});
