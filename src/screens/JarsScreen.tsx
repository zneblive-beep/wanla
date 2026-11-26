import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { CATS, Category, Tx, catOf, monthKey, money } from '../model';
import { CatIcon, Chip, Coin, Bubble, INK, Pop, RoundBtn, T } from '../ui';
import { FONT, Theme } from '../theme';
import { Shake, useCountUp, useReducedMotion } from '../motion';

const AnimatedG = Animated.createAnimatedComponent(G);

const BODY = 'M30 24h40v8c11 4 18 12 18 25v35a12 12 0 0 1-12 12H24a12 12 0 0 1-12-12V57c0-13 7-21 18-25z';

/** A jar whose water is the money left; it drains when opened, the water sways, and it cracks when the budget runs out. */
function Jar({ id, left, color }: { id: string; left: number; color: string }) {
  const reduced = useReducedMotion();
  const f = useCountUp(Math.max(0, Math.min(1, left)), { from: 1, duration: 900 });
  const y = 104 - 72 * f;
  // Sideways wave motion. SVG props can't use the native driver, so this runs on JS at a slow pace.
  const wave = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduced || left <= 0) return;
    const loop = Animated.loop(Animated.timing(wave, { toValue: -25, duration: 2400, easing: Easing.linear, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [reduced, left, wave]);
  const broke = left < 0 && f < 0.02;
  return (
    <Shake when={broke}>
      <Svg width={96} height={106} viewBox="0 0 100 110">
        <Defs><ClipPath id={`jar-${id}`}><Path d={BODY} /></ClipPath></Defs>
        {f > 0.005 && (
          <G clipPath={`url(#jar-${id})`}>
            <AnimatedG x={wave}>
              <Path d={`M0 ${y} q12.5 -6 25 0 t25 0 t25 0 t25 0 t25 0 V110 H0z`} fill={color} />
            </AnimatedG>
            {f >= 0.5 && <>
              <Circle cx={38} cy={90} r={8} fill="#FFF3B0" stroke={INK} strokeWidth={2} />
              <Circle cx={58} cy={93} r={8} fill="#FFF3B0" stroke={INK} strokeWidth={2} />
              <Circle cx={48} cy={80} r={8} fill="#FFF3B0" stroke={INK} strokeWidth={2} />
            </>}
          </G>
        )}
        <Path d={BODY} fill="none" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <Rect x={26} y={10} width={48} height={14} rx={5} fill={color} stroke={INK} strokeWidth={2.5} />
        <Path d="M22 62v22" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
        {broke && <Path d="M54 36l-7 13 9 6-8 12 6 9" fill="none" stroke={INK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      </Svg>
    </Shake>
  );
}

export default function JarsScreen({ t, tx, budget, jars, onSaveJars, onBudget }: {
  t: Theme; tx: Tx[]; budget: number; jars: Record<string, number>; onSaveJars: (j: Record<string, number>) => void; onBudget: () => void;
}) {
  const now = new Date();
  const mk = monthKey(now);
  const prevMk = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const spent: Record<string, number> = {}, last: Record<string, number> = {};
  let exp = 0;
  for (const x of tx) {
    if (x.type !== 'expense') continue;
    if (x.date.startsWith(mk)) { spent[x.cat] = (spent[x.cat] ?? 0) + x.amount; exp += x.amount; }
    else if (x.date.startsWith(prevMk)) last[x.cat] = (last[x.cat] ?? 0) + x.amount;
  }
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1;
  const list = CATS.expense.filter((c) => jars[c.id] > 0);
  const [edit, setEdit] = useState<Category | 'pick' | null>(null);

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <T w="head" size={26}>กระปุกเงิน</T>
          <Pressable onPress={onBudget}>
            <T size={13} color={t.muted}>
              {budget ? <>ทั้งเดือนเหลือ <T w="numBold" size={15}>{money(budget - exp)}</T> · อีก {daysLeft} วัน</> : 'ยังไม่ได้ตั้งงบรวม แตะเพื่อตั้ง'}
            </T>
          </Pressable>
        </View>
        <RoundBtn icon="plus" label="เพิ่มกระปุก" bg={t.accent} onPress={() => setEdit('pick')} />
      </View>

      {list.length === 0 ? (
        <Pop radius={26} style={{ padding: 20, alignItems: 'center', gap: 12 }}>
          <Jar id="empty" left={0.6} color={t.mint} />
          <T w="head" size={18}>แบ่งเงินใส่กระปุก</T>
          <T size={14} color={t.muted} style={{ textAlign: 'center' }}>ตั้งงบแยกหมวด เช่น อาหาร 3,500 บาท น้ำในกระปุกจะลดลงทุกครั้งที่จ่าย ใช้เกินเมื่อไหร่กระปุกแตก</T>
          <Chip bg={t.accent} onPress={() => setEdit('pick')} size={14}>+ ตั้งกระปุกแรก</Chip>
        </Pop>
      ) : (
        <View style={s.grid}>
          {list.map((c, i) => {
            const cap = jars[c.id];
            const left = cap - (spent[c.id] ?? 0);
            const broke = left < 0;
            return (
              <Pop key={c.id} wrap={s.cell} bg={broke ? '#FFE1D6' : '#FFFFFF'} tilt={[-1.5, 1.5, 1, -1][i % 4]}
                style={{ padding: 10, alignItems: 'center' }} onPress={() => setEdit(c)} label={`กระปุก${c.name}`}>
                {broke && <Chip bg={t.tomato} color="#FFFFFF" tilt={6} size={11} style={s.broke}>ล้นแล้ว!</Chip>}
                <Jar id={c.id} left={left / cap} color={c.color} />
                <T w="semi" size={14} style={{ marginTop: 2 }}>{c.name}</T>
                <T size={12} color={broke ? t.expense : t.muted} w={broke ? 'bold' : 'regular'}>
                  {broke ? `ติดลบ ${money(-left)}` : `เหลือ ${money(left)}`}<T size={12} color={t.faint}> / {money(cap).replace('฿', '')}</T>
                </T>
              </Pop>
            );
          })}
        </View>
      )}

      {list.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Coin size={48} mood={list.some((c) => (spent[c.id] ?? 0) > jars[c.id]) ? 'worried' : 'happy'} tilt={-8} />
          <Bubble side="left">{list.some((c) => (spent[c.id] ?? 0) > jars[c.id])
            ? 'มีกระปุกแตกแล้ว ลองย้ายเงินจากกระปุกที่ยังเหลือเยอะมาโปะ'
            : 'ทุกกระปุกยังรอด แตะกระปุกเพื่อแก้งบได้'}</Bubble>
        </View>
      )}

      <JarEditor t={t} target={edit} jars={jars} last={last} onClose={() => setEdit(null)}
        onPick={(c) => setEdit(c)}
        onSave={(id, v) => { const next = { ...jars }; if (v > 0) next[id] = v; else delete next[id]; onSaveJars(next); setEdit(null); }} />
    </ScrollView>
  );
}

function JarEditor({ t, target, jars, last, onClose, onPick, onSave }: {
  t: Theme; target: Category | 'pick' | null; jars: Record<string, number>; last: Record<string, number>;
  onClose: () => void; onPick: (c: Category) => void; onSave: (id: string, v: number) => void;
}) {
  const [val, setVal] = useState('');
  const c = target && target !== 'pick' ? target : null;
  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={onClose} onShow={() => setVal(c && jars[c.id] ? String(jars[c.id]) : '')}>
      <Pressable style={s.dim} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ width: '100%' }}>
          <Pop radius={26} style={{ padding: 18, gap: 14 }}>
            {target === 'pick' ? (
              <>
                <T w="head" size={18}>กระปุกหมวดไหน?</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {CATS.expense.map((x) => (
                    <Pressable key={x.id} onPress={() => { onPick(x); setVal(jars[x.id] ? String(jars[x.id]) : last[x.id] ? String(Math.ceil(last[x.id] / 100) * 100) : ''); }}
                      style={{ alignItems: 'center', width: 64, gap: 4 }}>
                      <CatIcon cat={x} size={44} />
                      <T size={12}>{x.name}</T>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : c && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <CatIcon cat={catOf(c.id)} size={40} />
                  <T w="head" size={18}>งบ{c.name}ต่อเดือน</T>
                </View>
                <TextInput value={val} onChangeText={(v) => setVal(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" autoFocus placeholder="เช่น 3500"
                  placeholderTextColor={t.faint} style={s.input} />
                {!!last[c.id] && <T size={12} color={t.muted}>เดือนที่แล้วจ่ายหมวดนี้ {money(last[c.id])}</T>}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {!!jars[c.id] && <Pop onPress={() => onSave(c.id, 0)} wrap={{ flex: 1 }} style={s.btn} radius={16}><T w="semi" color={t.expense}>ลบกระปุก</T></Pop>}
                  <Pop onPress={() => onSave(c.id, Number(val) || 0)} wrap={{ flex: 2 }} bg={t.accent} style={s.btn} radius={16}><T w="bold">บันทึก</T></Pop>
                </View>
              </>
            )}
          </Pop>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 130, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  cell: { width: '47%' },
  broke: { position: 'absolute', top: 6, right: 6, zIndex: 2 },
  dim: { flex: 1, backgroundColor: 'rgba(22,22,22,0.45)', justifyContent: 'center', padding: 20 },
  input: { borderWidth: 2, borderColor: INK, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontFamily: FONT.numBold, fontSize: 26, color: INK, backgroundColor: '#FFFFFF' },
  btn: { paddingVertical: 12, alignItems: 'center' },
});
