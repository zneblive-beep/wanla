import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { CATS, Tx, TxType, catOf, fmtDay, guessCat, money, newId, parseDate, parseEntry, toDateStr, todayStr } from './model';
import { readSlip, SlipError } from './slip';
import { Chip, Dashes, Icon, INK, Pop, RoundBtn, T, Zigzag } from './ui';
import { FONT, Theme } from './theme';
import { Enter, haptic, ND, useLoop, useReducedMotion } from './motion';
import { FEATURES } from './features';

export type SheetMode = 'expense' | 'income' | 'scan';

type Props = {
  t: Theme; visible: boolean; editing: Tx | null; mode: SheetMode; allTx: Tx[]; apiKey: string;
  onSave: (tx: Tx) => void; onDelete: (id: string) => void; onClose: () => void; onNeedKey: () => void;
};

type Slip =
  | { kind: 'idle' }
  | { kind: 'busy'; uri: string }
  | { kind: 'done'; uri: string; shop: string; when: string; amount: number | null; dup?: string; ms: number }
  | { kind: 'error'; uri?: string; message: string };

const fmtAmount = (n: number) => String(Math.round(n * 100) / 100);

export default function AddSheet({ t, visible, editing, mode, allTx, apiKey, onSave, onDelete, onClose, onNeedKey }: Props) {
  const [type, setType] = useState<TxType>('expense');
  const [text, setText] = useState('');
  const [picked, setCat] = useState('food');
  const [catTouched, setCatTouched] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [ref, setRef] = useState<string | undefined>();
  const [err, setErr] = useState('');
  const [slip, setSlip] = useState<Slip>({ kind: 'idle' });
  const autoScanned = useRef(false);

  // Reset the form each time the sheet opens. The scan picker opens a moment later, once the sheet is up.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/immutability */
  useEffect(() => {
    if (!visible) { autoScanned.current = false; return; }
    setErr(''); setSlip({ kind: 'idle' });
    if (editing) {
      setType(editing.type); setCat(editing.cat); setCatTouched(true); setDate(editing.date); setRef(editing.ref);
      setText([editing.note, fmtAmount(editing.amount)].filter(Boolean).join(' '));
    } else {
      const ty: TxType = mode === 'income' ? 'income' : 'expense';
      setType(ty); setCat(CATS[ty][0].id); setCatTouched(false); setText(''); setDate(todayStr()); setRef(undefined);
      if (FEATURES.slips && mode === 'scan' && !autoScanned.current) { autoScanned.current = true; setTimeout(() => chooseSource(), 350); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editing, mode]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/immutability */

  const { note, amount } = parseEntry(text);
  // Guess the category from the words as they are typed, until the person picks one themselves.
  const cat = catTouched ? picked : guessCat(note, type) ?? picked;

  // Most frequent "note + amount" pairs, for one-tap entry.
  const usual = useMemo(() => {
    const m = new Map<string, { note: string; amount: number; cat: string; n: number }>();
    for (const x of allTx) {
      if (x.type !== type || !x.note || x.note.length > 24) continue;
      const k = `${x.note}|${x.amount}`;
      const e = m.get(k) ?? { note: x.note, amount: x.amount, cat: x.cat, n: 0 };
      e.n++; m.set(k, e);
    }
    return [...m.values()].filter((e) => e.n >= 2).sort((a, b) => b.n - a.n).slice(0, 6);
  }, [allTx, type]);

  const pickType = (next: TxType) => {
    setType(next);
    if (!CATS[next].some((c) => c.id === cat)) { setCat(CATS[next][0].id); setCatTouched(false); }
  };

  const shiftDay = (n: number) => {
    const d = parseDate(date); d.setDate(d.getDate() + n);
    if (d > new Date()) return;
    setDate(toDateStr(d));
  };

  const save = () => {
    if (!(amount && amount > 0)) return setErr('ใส่ตัวเลขจำนวนเงินด้วย เช่น "ข้าวมันไก่ 55"');
    onSave({ id: editing?.id ?? newId(), type, amount: Math.round(amount * 100) / 100, cat, note: note.slice(0, 80), date, createdAt: editing?.createdAt ?? Date.now(), ...(ref ? { ref } : {}) });
  };

  const confirmDelete = () => {
    if (!editing) return;
    Alert.alert('ลบรายการนี้?', `${editing.note || catOf(editing.cat).name} ${money(editing.amount)}`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบ', style: 'destructive', onPress: () => onDelete(editing.id) },
    ]);
  };

  const chooseSource = () => {
    if (!apiKey) {
      Alert.alert('ต้องใส่ API key ก่อน', 'การสแกนสลิปใช้ Claude ใส่ API key ในหน้าตั้งค่าก่อน', [
        { text: 'ไว้ทีหลัง', style: 'cancel' }, { text: 'ไปตั้งค่า', onPress: onNeedKey },
      ]);
      return;
    }
    Alert.alert('สแกนสลิป', 'เลือกรูปสลิปจาก', [
      { text: 'ถ่ายรูป', onPress: () => scan('camera') },
      { text: 'อัลบั้มรูป', onPress: () => scan('library') },
      { text: 'ยกเลิก', style: 'cancel' },
    ]);
  };

  const scan = async (from: 'camera' | 'library') => {
    const perm = from === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setSlip({ kind: 'error', message: from === 'camera' ? 'ต้องอนุญาตให้ใช้กล้องในการตั้งค่าเครื่อง' : 'ต้องอนุญาตให้เข้าถึงรูปในการตั้งค่าเครื่อง' });
    const res = from === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.9 });
    if (res.canceled || !res.assets?.[0]) return;
    const uri = res.assets[0].uri;
    const started = Date.now();
    setSlip({ kind: 'busy', uri });
    try {
      const r = await readSlip(uri, apiKey);
      if (!r.is_slip) return setSlip({ kind: 'error', uri, message: 'รูปนี้ไม่น่าใช่สลิปโอนเงิน' });
      pickType('expense');
      const c = r.category && CATS.expense.some((x) => x.id === r.category) ? r.category : 'other-e';
      setCat(c); setCatTouched(true);
      const who = [r.to_name, r.memo].filter((x): x is string => !!x && !!x.trim()).join(' · ').slice(0, 60);
      setText([who, r.amount && r.amount > 0 ? fmtAmount(r.amount) : ''].filter(Boolean).join(' '));
      const d = r.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : date;
      setDate(d);
      const slipRef = r.ref?.trim() || undefined;
      setRef(slipRef);
      const dup = slipRef ? allTx.find((x) => x.ref === slipRef && x.id !== editing?.id) : undefined;
      setSlip({
        kind: 'done', uri, shop: r.to_name || 'ไม่ทราบผู้รับ', amount: r.amount,
        when: [fmtDay(d), r.time].filter(Boolean).join(' · '), ms: Date.now() - started,
        dup: dup ? `สลิปนี้บันทึกแล้วเมื่อ ${fmtDay(dup.date)}` : undefined,
      });
    } catch (e) {
      const kind = e instanceof SlipError ? e.kind : 'unreadable';
      const message = {
        no_key: 'ยังไม่ได้ใส่ API key', bad_key: 'API key ใช้ไม่ได้ ตรวจในหน้าตั้งค่า', rate: 'ใช้งานถี่เกินไป รอสักครู่',
        refused: 'อ่านรูปนี้ไม่ได้ พิมพ์เองได้เลย', network: 'ต่ออินเทอร์เน็ตไม่ได้', unreadable: 'อ่านสลิปไม่สำเร็จ ลองใหม่อีกครั้ง',
      }[kind];
      setSlip({ kind: 'error', uri, message });
    }
  };

  const isToday = date === todayStr();
  const sign = type === 'income' ? '+' : '−';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.head}>
            <RoundBtn icon="close" label="ปิด" onPress={onClose} />
            <View style={s.seg}>
              {(['expense', 'income'] as TxType[]).map((k) => {
                const on = type === k;
                return (
                  <Pressable key={k} onPress={() => pickType(k)} style={[s.segItem, on && { backgroundColor: INK }]} accessibilityState={{ selected: on }}>
                    <T w="semi" size={14} color={on ? '#FFFFFF' : t.muted}>{k === 'expense' ? 'จ่าย' : 'รับ'}</T>
                  </Pressable>
                );
              })}
            </View>
            {editing ? <RoundBtn icon="trash-can-outline" label="ลบรายการ" color={t.expense} onPress={confirmDelete} /> : <View style={{ width: 42 }} />}
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <T size={14} color={t.muted}>{type === 'expense' ? 'พิมพ์เหมือนแชทกับเพื่อนได้เลย' : 'ได้เงินจากอะไร เท่าไร'}</T>
            <TextInput value={text} onChangeText={(v) => { setText(v); setErr(''); }} autoFocus={!editing && mode !== 'scan'}
              placeholder={type === 'expense' ? 'ข้าวมันไก่ 55' : 'เงินเดือน 25000'} placeholderTextColor="#BDB5A3"
              style={s.input} returnKeyType="done" onSubmitEditing={save} maxLength={90} accessibilityLabel="รายการและจำนวนเงิน" />
            {!!err && <T size={13} color={t.expense}>{err}</T>}

            {slip.kind !== 'idle' && <SlipCard t={t} slip={slip} />}

            <Pop radius={22} style={{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: 6 }} wrap={{ marginTop: 6 }}>
              <View style={{ marginBottom: 4 }}><Chip bg={t.accent} tilt={-3} size={11}>แอปเข้าใจว่า</Chip></View>
              <View style={s.kv}>
                <T size={14} color={t.muted}>จำนวน</T>
                <T w="numBold" size={22} color={amount ? INK : '#BDB5A3'}>{amount ? `${sign}${money(amount)}` : 'ยังไม่มีตัวเลข'}</T>
              </View>
              <Dashes />
              <View style={[s.kv, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
                <T size={14} color={t.muted}>หมวด</T>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} keyboardShouldPersistTaps="handled">
                  {CATS[type].map((c) => {
                    const on = c.id === cat;
                    return (
                      <Pressable key={c.id} onPress={() => { haptic.tap(); setCat(c.id); setCatTouched(true); }} accessibilityState={{ selected: on }}
                        style={[s.cat, { backgroundColor: on ? c.color : '#FFFFFF', borderColor: on ? INK : t.line }]}>
                        <Icon name={c.icon} size={16} color={INK} />
                        <T w={on ? 'semi' : 'regular'} size={13}>{c.name}</T>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
              <Dashes />
              <View style={s.kv}>
                <T size={14} color={t.muted}>วันที่</T>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Pressable onPress={() => shiftDay(-1)} hitSlop={8} accessibilityLabel="วันก่อน"><Icon name="chevron-left" size={22} color={INK} /></Pressable>
                  <T w="semi" size={14} style={{ minWidth: 120, textAlign: 'center' }}>{isToday ? 'วันนี้ · ' : ''}{fmtDay(date)}</T>
                  <Pressable onPress={() => shiftDay(1)} hitSlop={8} disabled={isToday} accessibilityLabel="วันถัดไป"><Icon name="chevron-right" size={22} color={isToday ? t.line : INK} /></Pressable>
                </View>
              </View>
            </Pop>

            {usual.length > 0 && !editing && (
              <>
                <T w="semi" size={13} style={{ marginTop: 6 }}>จดบ่อย แตะทีเดียวจบ</T>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {usual.map((u, i) => (
                    <Chip key={`${u.note}${u.amount}`} bg={catOf(u.cat).color} tilt={[-2, 2, -1, 3, -3, 1][i]}
                      onPress={() => { setText(`${u.note} ${fmtAmount(u.amount)}`); setCat(u.cat); setCatTouched(true); }}>
                      {`${u.note} ฿${fmtAmount(u.amount)}`}
                    </Chip>
                  ))}
                </View>
              </>
            )}

            {!editing && FEATURES.slips && (
              <Pop onPress={chooseSource} label="สแกนสลิป" radius={20} style={s.scan} wrap={{ marginTop: 6 }}>
                <View style={[s.scanIcon, { backgroundColor: t.accent }]}><Icon name="line-scan" size={20} color={INK} /></View>
                <View style={{ flex: 1 }}>
                  <T w="semi" size={14}>สแกนสลิปแทน</T>
                  <T size={12} color={t.muted}>ถ่ายรูปหรือเลือกจากอัลบั้ม ไม่ต้องพิมพ์เลย</T>
                </View>
                <Icon name="chevron-right" size={22} color={INK} />
              </Pop>
            )}
          </ScrollView>

          <View style={s.foot}>
            <Pop onPress={save} label="บันทึก" bg={type === 'income' ? t.mint : t.accent} radius={20} style={s.save}>
              <T w="bold" size={17}>{editing ? 'บันทึกการแก้ไข' : 'บันทึก'}</T>
              {!!amount && <T w="numBold" size={20}>{sign}{money(amount)}</T>}
            </Pop>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/** Moving scan line over the slip photo while Claude reads it. */
function ScanLine({ color }: { color: string }) {
  const v = useLoop(1400);
  return (
    <Animated.View pointerEvents="none" style={[s.scanLine, { backgroundColor: color, shadowColor: color,
      transform: [{ translateY: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [4, 66, 4] }) }] }]} />
  );
}

/** The red stamp lands on the receipt with a thump. */
function Stamp({ t, dup }: { t: Theme; dup: boolean }) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(reduced ? 1 : 0))[0];
  useEffect(() => {
    if (reduced) return;
    Animated.sequence([
      Animated.delay(380),
      Animated.spring(v, { toValue: 1, friction: 5, tension: 220, useNativeDriver: ND }),
    ]).start();
    const h = setTimeout(() => (dup ? haptic.warn() : haptic.success()), 430);
    return () => clearTimeout(h);
  }, [reduced, v, dup]);
  const color = dup ? t.warn : t.tomato;
  return (
    <Animated.View style={[s.stamp, { borderColor: color, opacity: v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
      transform: [{ rotate: '12deg' }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) }] }]}>
      <T w="headBold" size={14} color={color}>{dup ? 'ซ้ำ!' : 'ไม่ซ้ำ ✓'}</T>
    </Animated.View>
  );
}

/** The slip result, printed like a receipt with a stamp. */
function SlipCard({ t, slip }: { t: Theme; slip: Exclude<Slip, { kind: 'idle' }> }) {
  return (
    <Enter key={slip.kind} from={slip.kind === 'done' ? -24 : 10} style={{ marginTop: 4 }}>
      <View style={s.slip}>
        {'uri' in slip && slip.uri ? (
          <View style={s.thumbBox}>
            <Image source={{ uri: slip.uri }} style={s.thumb} />
            {slip.kind === 'busy' && <ScanLine color={t.accent} />}
          </View>
        ) : null}
        <View style={{ flex: 1, gap: 3 }}>
          {slip.kind === 'busy' && <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><ActivityIndicator color={INK} /><T w="semi">กำลังอ่านสลิป…</T></View>}
          {slip.kind === 'error' && <T w="semi" size={14} color={t.warn}>{slip.message}</T>}
          {slip.kind === 'done' && (
            <>
              <T w="head" size={16}>อ่านสลิปแล้ว</T>
              <T size={11} color={t.faint}>ใช้เวลา {Math.max(1, Math.round(slip.ms / 1000))} วินาที</T>
              <T size={13} lines={1}>{slip.shop}</T>
              <T size={12} color={t.muted}>{slip.when}</T>
              {slip.amount ? <T w="numBold" size={22}>{money(slip.amount)}</T> : <T size={13} color={t.warn}>อ่านยอดไม่ได้ พิมพ์เพิ่มด้านบน</T>}
            </>
          )}
        </View>
        {slip.kind === 'done' && <Stamp t={t} dup={!!slip.dup} />}
      </View>
      <Zigzag />
      {slip.kind === 'done' && slip.dup && <T w="semi" size={12} color={t.warn} style={{ marginTop: 4 }}>{slip.dup}</T>}
    </Enter>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  seg: { flexDirection: 'row', borderWidth: 2, borderColor: INK, borderRadius: 999, padding: 3, backgroundColor: '#FFFFFF' },
  segItem: { paddingHorizontal: 20, paddingVertical: 6, borderRadius: 999 },
  body: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 16, gap: 10 },
  input: { fontFamily: FONT.head, fontSize: 32, color: INK, borderBottomWidth: 2, borderBottomColor: INK, paddingVertical: 6 },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  scan: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  scanIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  foot: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8 },
  save: { flexDirection: 'row', gap: 10, height: 58, alignItems: 'center', justifyContent: 'center' },
  slip: { flexDirection: 'row', gap: 12, backgroundColor: '#FFFFFF', padding: 14, paddingBottom: 8, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  thumbBox: { width: 50, height: 74, borderRadius: 8, overflow: 'hidden' },
  thumb: { width: 50, height: 74, borderRadius: 8, backgroundColor: '#EFE8D8', borderWidth: 2, borderColor: INK },
  scanLine: { position: 'absolute', left: 2, right: 2, height: 3, borderRadius: 2, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  stamp: { position: 'absolute', right: 12, top: 12, borderWidth: 3, borderRadius: 10, paddingHorizontal: 8 },
});
