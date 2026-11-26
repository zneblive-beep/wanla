import { ScrollView, Share, StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Tx, catOf, fmtMonthShort, monthKey, money, parseDate, toDateStr } from '../model';
import { Bubble, CatIcon, Chip, Coin, Icon, INK, MonthSwitch, Pop, T } from '../ui';
import type { Theme } from '../theme';
import { Enter, useCountUp } from '../motion';

const SIZE = 168, STROKE = 30, R = (SIZE - STROKE) / 2, C = 2 * Math.PI * R;

// Things people know the price of, to make a total feel real.
const THINGS = [
  { name: 'ตั๋วหนัง', unit: 'ใบ', price: 220 },
  { name: 'ชานมไข่มุก', unit: 'แก้ว', price: 50 },
];

function week(tx: Tx[], endDaysAgo: number) {
  const end = new Date(); end.setDate(end.getDate() - endDaysAgo);
  const start = new Date(end); start.setDate(end.getDate() - 6);
  const a = toDateStr(start), b = toDateStr(end);
  return { a, b, items: tx.filter((x) => x.type === 'expense' && x.date >= a && x.date <= b) };
}

export default function StoryScreen({ t, tx, view, onShift }: { t: Theme; tx: Tx[]; view: Date; onShift: (n: number) => void }) {
  // Weekly story: the category you paid for most often in the last 7 days.
  const cur = week(tx, 0), prev = week(tx, 7);
  const byCat: Record<string, { n: number; sum: number }> = {};
  for (const x of cur.items) { const e = (byCat[x.cat] ??= { n: 0, sum: 0 }); e.n++; e.sum += x.amount; }
  const top = Object.entries(byCat).sort((a, b) => b[1].n - a[1].n || b[1].sum - a[1].sum)[0];
  const topCat = top ? catOf(top[0]) : null;
  const prevN = top ? prev.items.filter((x) => x.cat === top[0]).length : 0;
  const diff = top ? top[1].n - prevN : 0;
  const thing = top ? THINGS.find((x) => top[1].sum >= x.price) ?? THINGS[1] : null;
  const howMany = top && thing ? Math.max(1, Math.floor(top[1].sum / thing.price)) : 0;
  const range = `${parseDate(cur.a).getDate()}–${parseDate(cur.b).getDate()} ${fmtMonthShort(parseDate(cur.b))}`;

  const shownN = useCountUp(top ? top[1].n : 0, { from: 0, duration: 900 });
  const shownSum = useCountUp(top ? top[1].sum : 0, { from: 0, duration: 1100 });

  const share = () => {
    if (!top || !topCat || !thing) return;
    Share.share({ message: `สัปดาห์นี้ฉันจ่ายค่า${topCat.name}ไป ${top[1].n} ครั้ง รวม ${money(top[1].sum)} เท่ากับ${thing.name} ${howMany} ${thing.unit} 😅 (จดด้วยแอป Wanla)` }).catch(() => {});
  };

  // Month breakdown
  const mk = monthKey(view);
  const sums: Record<string, number> = {};
  let exp = 0;
  for (const x of tx) if (x.type === 'expense' && x.date.startsWith(mk)) { sums[x.cat] = (sums[x.cat] ?? 0) + x.amount; exp += x.amount; }
  const cats = Object.entries(sums).sort((a, b) => b[1] - a[1]);
  const segs = cats.map(([id, v], i) => ({
    id, color: catOf(id).color, len: (v / exp) * C,
    offset: cats.slice(0, i).reduce((n, [, w]) => n + (w / exp) * C, 0),
  }));

  const months = Array.from({ length: 6 }, (_, i) => new Date(view.getFullYear(), view.getMonth() - 5 + i, 1));
  const trend = months.map((d) => {
    let i = 0, e = 0;
    for (const x of tx) if (x.date.startsWith(monthKey(d))) { if (x.type === 'income') i += x.amount; else e += x.amount; }
    return { d, i, e };
  });
  const max = Math.max(1, ...trend.flatMap((m) => [m.i, m.e]));

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <T w="head" size={26}>สรุป</T>

      <Pop bg={t.lilac} radius={28} style={{ padding: 18, gap: 10 }}>
        <View style={s.bars}>{[0, 1, 2, 3].map((i) => <View key={i} style={[s.bar, i === 0 && { backgroundColor: INK }]} />)}</View>
        <T w="semi" size={13}>สรุปสัปดาห์ {range}</T>
        {top && topCat && thing ? (
          <>
            <T w="head" size={26} style={{ marginTop: 6 }}>สัปดาห์นี้คุณจ่ายค่า{topCat.name}ไป</T>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <T w="numBold" size={110} style={{ lineHeight: 112, letterSpacing: -4 }}>{Math.round(shownN)}</T>
              <T w="head" size={28} style={{ marginBottom: 14 }}>ครั้ง</T>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {Array.from({ length: Math.min(top[1].n, 14) }, (_, i) => (
                <Enter key={i} delay={250 + i * 70} from={-36}><View style={{ transform: [{ rotate: `${[-8, 5, -3, 9, -6, 4][i % 6]}deg` }], opacity: i >= prevN && diff > 0 ? 1 : 0.85 }}>
                  <CatIcon cat={i >= prevN && diff > 0 ? { ...topCat, color: t.sun } : topCat} size={34} />
                </View></Enter>
              ))}
            </View>
            {diff !== 0 && (
              <Chip bg={diff > 0 ? t.tomato : t.mint} color={diff > 0 ? '#FFFFFF' : INK} tilt={-2} size={12}>
                {diff > 0 ? `มากกว่าสัปดาห์ก่อน ${diff} ครั้ง (สีเหลือง)` : `น้อยกว่าสัปดาห์ก่อน ${-diff} ครั้ง เก่งมาก`}
              </Chip>
            )}
            <Pop tilt={-2.5} radius={20} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }} wrap={{ marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <T size={13} color={t.muted}>รวมค่า{topCat.name}</T>
                <T w="numBold" size={34}>{money(Math.round(shownSum))}</T>
                <T w="semi" size={14}>= {thing.name}ได้ {howMany} {thing.unit}</T>
              </View>
              <Coin size={58} mood="shock" tilt={12} />
            </Pop>
            <Pop onPress={share} label="แชร์สรุปสัปดาห์" radius={18} style={s.share}>
              <Icon name="export-variant" size={20} color={INK} />
              <T w="bold" size={15}>แชร์ให้เพื่อนดู</T>
            </Pop>
          </>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}>
            <Coin size={56} mood="wink" />
            <Bubble side="left">จดรายจ่ายสักสองสามวัน แล้วกลับมาดูสรุปสัปดาห์ที่นี่</Bubble>
          </View>
        )}
      </Pop>

      <View style={s.header}>
        <T w="head" size={18}>ภาพรวมเดือน</T>
        <MonthSwitch view={view} onShift={onShift} />
      </View>

      <Pop radius={26} style={{ padding: 16 }}>
        {cats.length === 0 ? (
          <T size={14} color={t.muted} style={{ textAlign: 'center', paddingVertical: 20 }}>เดือนนี้ยังไม่มีรายจ่าย</T>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View>
                <Svg width={SIZE} height={SIZE}>
                  <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
                    <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={t.surface2} strokeWidth={STROKE} fill="none" />
                    {segs.map((g) => (
                      <Circle key={g.id} cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={g.color} strokeWidth={STROKE} fill="none"
                        strokeDasharray={`${Math.max(g.len - 3, 0.1)} ${C}`} strokeDashoffset={-g.offset} />
                    ))}
                  </G>
                  <Circle cx={SIZE / 2} cy={SIZE / 2} r={R + STROKE / 2} stroke={INK} strokeWidth={2} fill="none" />
                  <Circle cx={SIZE / 2} cy={SIZE / 2} r={R - STROKE / 2} stroke={INK} strokeWidth={2} fill="none" />
                </Svg>
                <View style={s.center} pointerEvents="none">
                  <T size={11} color={t.muted}>ใช้ไป</T>
                  <T w="numBold" size={18}>{money(exp)}</T>
                </View>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                {cats.slice(0, 6).map(([id, v]) => (
                  <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[s.dot, { backgroundColor: catOf(id).color }]} />
                    <T size={13} style={{ flex: 1 }} lines={1}>{catOf(id).name}</T>
                    <T w="num" size={13}>{Math.round((v / exp) * 100)}%</T>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </Pop>

      <Pop radius={26} style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <T w="head" size={16}>6 เดือนล่าสุด</T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={s.key}><View style={[s.dot, { backgroundColor: t.accent }]} /><T size={11} color={t.muted}>รายรับ</T></View>
            <View style={s.key}><View style={[s.dot, { backgroundColor: t.tomato }]} /><T size={11} color={t.muted}>รายจ่าย</T></View>
          </View>
        </View>
        <View style={s.chart}>
          {trend.map((m) => {
            const on = monthKey(m.d) === mk;
            return (
              <View key={monthKey(m.d)} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <View style={s.pair}>
                  <View style={[s.col, { height: `${(m.i / max) * 100}%`, backgroundColor: t.accent, opacity: on ? 1 : 0.5 }]} />
                  <View style={[s.col, { height: `${(m.e / max) * 100}%`, backgroundColor: t.tomato, opacity: on ? 1 : 0.5 }]} />
                </View>
                <T w={on ? 'bold' : 'regular'} size={11} color={on ? INK : t.muted}>{fmtMonthShort(m.d)}</T>
              </View>
            );
          })}
        </View>
      </Pop>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 130, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  bars: { flexDirection: 'row', gap: 5 },
  bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(22,22,22,0.2)' },
  share: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 13 },
  center: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 3, borderWidth: 1.5, borderColor: INK },
  key: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chart: { flexDirection: 'row', height: 130, alignItems: 'flex-end', gap: 4 },
  pair: { flex: 1, width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 },
  col: { width: 11, borderRadius: 4, minHeight: 2, borderWidth: 1.5, borderColor: INK },
});
