import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Tx, fmtLong, monthKey, money, toDateStr, todayStr } from '../model';
import { Bubble, Chip, Coin, Icon, INK, Mood, Pop, RoundBtn, T, Zigzag } from '../ui';
import TxRow from '../TxRow';
import { Enter, Pulse, useCountUp } from '../motion';
import type { Theme } from '../theme';

type Props = {
  t: Theme; tx: (Tx & { sample?: boolean })[]; budget: number; loaded: boolean; name?: string;
  onEdit: (x: Tx) => void; onAdd: () => void; onScan: () => void; onSamples: () => void;
  onSettings: () => void; onCalendar: () => void; onStory: () => void;
  slipCount: number; onSlips: () => void;
};

/** Days in a row, ending today or yesterday, that have at least one entry. */
function streak(tx: Tx[]) {
  const days = new Set(tx.map((x) => x.date));
  const d = new Date();
  if (!days.has(toDateStr(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(toDateStr(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export default function TodayScreen({ t, tx, budget, loaded, onEdit, onAdd, onScan, onSamples, onSettings, onCalendar, onStory, slipCount, onSlips }: Props) {
  const now = new Date();
  const today = todayStr();
  const mk = monthKey(now);
  let inc = 0, exp = 0, before = 0;
  for (const x of tx) {
    if (!x.date.startsWith(mk)) continue;
    if (x.type === 'income') inc += x.amount;
    else { exp += x.amount; if (x.date < today) before += x.amount; }
  }
  const todays = tx.filter((x) => x.date === today).sort((a, b) => a.createdAt - b.createdAt);
  const spentToday = todays.reduce((n, x) => n + (x.type === 'expense' ? x.amount : 0), 0);

  // Daily allowance: what is left of the month's budget, spread over the days left (today included).
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
  const allowance = budget ? Math.max(0, (budget - before) / daysLeft) : 0;
  const leftToday = allowance - spentToday;
  const ratio = allowance > 0 ? Math.max(0, Math.min(1, leftToday / allowance)) : 0;
  const filled = Math.round(ratio * 10);

  const mood: Mood = !budget ? 'happy' : leftToday < 0 ? 'shock' : ratio < 0.3 ? 'worried' : ratio < 0.7 ? 'wink' : 'happy';
  const line = !budget ? 'ตั้งงบรายเดือนก่อน แล้วเราจะบอกว่าวันนี้ใช้ได้เท่าไร'
    : leftToday < 0 ? 'เกินงบวันนี้แล้ว พรุ่งนี้ค่อยๆ เก็บคืนนะ'
    : ratio < 0.3 ? 'เหลือน้อยแล้ว มื้อต่อไปเบาๆ ก่อนนะ'
    : ratio < 0.7 ? 'ยังโอเคอยู่ แต่เย็นนี้อย่าเพิ่งชาบูนะ'
    : 'วันนี้ยังชิล ใช้ได้อีกเยอะ';
  const days = streak(tx);
  const shownLeft = useCountUp(Math.round(leftToday), { from: allowance ? Math.round(allowance) : 0 });
  const saved = inc - exp;

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <T size={13} color={t.muted}>{fmtLong(today)} {now.getFullYear() + 543}</T>
          <T w="numBold" size={28} style={{ letterSpacing: -1 }}>Wanla<T w="numBold" size={28} color={t.tomato}>.</T></T>
        </View>
        {days >= 2 && (
          <Chip bg={t.tomato} tilt={4} color="#FFFFFF">
            <Icon name="fire" size={15} color="#FFFFFF" />
            <T w="semi" size={12} color="#FFFFFF">จดติดกัน {days} วัน</T>
          </Chip>
        )}
        <RoundBtn icon="cog-outline" label="ตั้งค่า" onPress={onSettings} />
      </View>

      {slipCount > 0 && (
        <Pop onPress={onSlips} label={`เจอสลิปใหม่ ${slipCount} ใบ`} bg={t.sun} style={s.slips}>
          <View style={s.slipIcon}><Icon name="image-search-outline" size={22} color={INK} /></View>
          <View style={{ flex: 1 }}>
            <T w="bold" size={15}>เจอสลิปใหม่ {slipCount} ใบ</T>
            <T size={12} color="#3A3522">อ่านให้แล้ว แตะเพื่อตรวจและบันทึก</T>
          </View>
          <Icon name="chevron-right" size={24} color={INK} />
        </Pop>
      )}

      <Pop bg={t.accent} radius={28} style={{ padding: 18, paddingBottom: 14 }} onPress={budget ? undefined : onSettings} label={budget ? undefined : 'ตั้งงบรายเดือน'}>
        {budget ? (
          <>
            <T w="semi" size={14}>{leftToday < 0 ? 'วันนี้ใช้เกินไปแล้ว' : 'วันนี้ยังใช้ได้อีก'}</T>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <T w="numBold" size={62} style={{ letterSpacing: -2 }}>{money(Math.abs(Math.round(shownLeft)))}</T>
              <T w="num" size={17} color="rgba(22,22,22,0.55)">/ {money(Math.round(allowance)).replace('฿', '')}</T>
            </View>
            <View style={s.segs}>
              {Array.from({ length: 10 }, (_, i) => (
                <Pulse key={i} trigger={i < filled} amount={0.25} style={{ flex: 1 }}><View style={[s.seg, i < filled && { backgroundColor: INK }]} /></Pulse>
              ))}
            </View>
          </>
        ) : (
          <>
            <T w="semi" size={14}>วันนี้ใช้ได้เท่าไร?</T>
            <T w="head" size={22} style={{ marginTop: 2 }}>แตะเพื่อตั้งงบรายเดือน</T>
          </>
        )}
        <View style={s.coinRow}>
          <View style={{ flex: 1, alignItems: 'flex-end' }}><Bubble>{line}</Bubble></View>
          <Coin size={56} mood={mood} tilt={10} />
        </View>
      </Pop>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pop onPress={onCalendar} label="จ่ายเดือนนี้" wrap={{ flex: 1 }} style={s.stat} radius={20}>
          <T size={12} color={t.muted}>จ่ายเดือนนี้</T>
          <T w="numBold" size={22}>{money(exp)}</T>
        </Pop>
        <Pop onPress={onStory} label="เก็บได้" wrap={{ flex: 1 }} style={s.stat} radius={20}>
          <T size={12} color={t.muted}>{saved >= 0 ? 'เก็บได้แล้ว' : 'ใช้เกินรายรับ'}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T w="numBold" size={22} color={saved >= 0 ? INK : t.expense}>{money(Math.abs(saved))}</T>
            {inc > 0 && saved > 0 && <Chip bg={t.mint} size={11} style={{ paddingHorizontal: 6, paddingVertical: 0 }}>{`${Math.round((saved / inc) * 100)}%`}</Chip>}
          </View>
        </Pop>
      </View>

      <View style={s.receiptWrap}>
        <View style={s.receiptShadow} />
        <View>
          <View style={s.receipt}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <T w="head" size={17}>ใบเสร็จวันนี้</T>
              <T size={12} color={t.faint}>{todays.length} รายการ</T>
            </View>
            {!loaded ? <T color={t.muted}>กำลังโหลด…</T> : todays.length === 0 ? (
              <View style={{ paddingVertical: 14, alignItems: 'center', gap: 10 }}>
                <T size={14} color={t.muted} style={{ textAlign: 'center' }}>ยังไม่ได้จดอะไรวันนี้{'\n'}พิมพ์ “ข้าวมันไก่ 55” ก็จดได้แล้ว</T>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Chip bg={t.accent} onPress={onAdd}>+ จดเลย</Chip>
                  <Chip onPress={onScan}>สแกนสลิป</Chip>
                  {tx.length === 0 && <Chip onPress={onSamples}>ดูตัวอย่าง</Chip>}
                </View>
              </View>
            ) : (
              <>
                {todays.map((x, i) => (
                  <Enter key={x.id} fresh={now.getTime() - x.createdAt < 5000}>
                    <TxRow t={t} x={x} showTime divider={i > 0} sample={x.sample} onPress={() => onEdit(x)} />
                  </Enter>
                ))}
                <View style={s.total}>
                  <T w="bold" size={14}>รวมจ่ายวันนี้</T>
                  <Pulse trigger={spentToday} amount={0.2}><T w="numBold" size={18}>−{money(spentToday)}</T></Pulse>
                </View>
              </>
            )}
          </View>
          <Zigzag />
        </View>
      </View>

      <Pressable onPress={onCalendar} style={{ alignSelf: 'center', padding: 6 }}>
        <T w="semi" size={13} color={t.muted}>ดูรายการวันอื่นในปฏิทิน ›</T>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 130, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slips: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  slipIcon: { width: 40, height: 40, borderRadius: 13, borderWidth: 2, borderColor: INK, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  segs: { flexDirection: 'row', gap: 4, marginTop: 10 },
  seg: { height: 16, borderRadius: 5, borderWidth: 2, borderColor: INK },
  coinRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  stat: { paddingHorizontal: 14, paddingVertical: 10 },
  receiptWrap: { marginRight: 4, marginBottom: 4 },
  receiptShadow: { position: 'absolute', top: 4, left: 4, right: -4, bottom: 0, backgroundColor: INK, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  receipt: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: '#E3DCCB', marginTop: 4, paddingTop: 8 },
});
