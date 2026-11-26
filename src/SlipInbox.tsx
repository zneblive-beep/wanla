import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATS, Tx, fmtDay, isDateStr, money, newId, toDateStr } from './model';
import type { Found } from './slipWatch';
import { Icon, INK, Pop, RoundBtn, T } from './ui';
import type { Theme } from './theme';
import { haptic } from './motion';

type Props = {
  t: Theme; visible: boolean; inbox: Found[];
  onSave: (rows: { tx: Tx; assetId: string }[]) => void; onSkip: (assetId: string) => void; onClose: () => void;
};

const pickCat = (f: Found) => (f.result.category && CATS.expense.some((c) => c.id === f.result.category) ? f.result.category : 'other-e');

export function toTx(f: Found, cat: string): Tx {
  const r = f.result;
  const note = [r.to_name, r.memo].filter((x): x is string => !!x && !!x.trim()).join(' · ').slice(0, 80);
  return {
    id: newId(), type: 'expense', amount: Math.round((r.amount ?? 0) * 100) / 100, cat, note,
    date: r.date && isDateStr(r.date) ? r.date : toDateStr(new Date(f.takenAt)),
    createdAt: Date.now(), ...(r.ref?.trim() ? { ref: r.ref.trim() } : {}),
  };
}

export default function SlipInbox({ t, visible, inbox, onSave, onSkip, onClose }: Props) {
  const [cats, setCats] = useState<Record<string, string>>({});
  useEffect(() => { if (visible && inbox.length === 0) onClose(); }, [visible, inbox.length, onClose]);
  const catFor = (f: Found) => cats[f.assetId] ?? pickCat(f);
  const total = inbox.reduce((n, f) => n + (f.result.amount ?? 0), 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
        <View style={s.head}>
          <RoundBtn icon="close" label="ปิด" onPress={onClose} />
          <View style={{ flex: 1 }}>
            <T w="head" size={20}>สลิปใหม่ในอัลบั้ม</T>
            <T size={13} color={t.muted}>{inbox.length} ใบ รวม {money(total)} ตรวจแล้วกดบันทึก</T>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {inbox.map((f, i) => {
            const r = f.result;
            const cat = catFor(f);
            const date = r.date && isDateStr(r.date) ? r.date : toDateStr(new Date(f.takenAt));
            return (
              <Pop key={f.assetId} radius={22} tilt={i % 2 ? 0.8 : -0.8} style={{ padding: 14, gap: 12 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Image source={{ uri: f.uri }} style={s.thumb} resizeMode="cover" accessibilityLabel="รูปสลิป" />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T w="numBold" size={26}>−{money(r.amount ?? 0)}</T>
                    <T w="semi" size={14} lines={1}>{r.to_name || 'ไม่ทราบผู้รับ'}</T>
                    <T size={12} color={t.muted} lines={1}>{[fmtDay(date), r.time, r.bank].filter(Boolean).join(' · ')}</T>
                    {!!r.memo && <T size={12} color={t.muted} lines={1}>บันทึก: {r.memo}</T>}
                  </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                  {CATS.expense.map((c) => {
                    const on = c.id === cat;
                    return (
                      <Pressable key={c.id} onPress={() => { haptic.tap(); setCats((m) => ({ ...m, [f.assetId]: c.id })); }} accessibilityState={{ selected: on }}
                        style={[s.chip, { backgroundColor: on ? c.color : '#FFFFFF', borderColor: on ? INK : t.line }]}>
                        <Icon name={c.icon} size={15} color={INK} />
                        <T w={on ? 'semi' : 'regular'} size={13}>{c.name}</T>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pop onPress={() => onSkip(f.assetId)} label="ไม่ใช่รายจ่าย" radius={14} style={s.btn}><T w="semi" color={t.muted}>ไม่ใช่รายจ่าย</T></Pop>
                  <Pop onPress={() => onSave([{ tx: toTx(f, cat), assetId: f.assetId }])} label="บันทึก" bg={t.accent} radius={14} wrap={{ flex: 1 }} style={s.btn}>
                    <T w="bold">บันทึก</T>
                  </Pop>
                </View>
              </Pop>
            );
          })}
          <T size={12} color={t.muted} style={{ textAlign: 'center', marginTop: 4 }}>
            ถ้าเป็นเงินที่คนอื่นโอนเข้ามา กด “ไม่ใช่รายจ่าย” แล้วจดเป็นรายรับเอง
          </T>
        </ScrollView>

        {inbox.length > 1 && (
          <View style={s.foot}>
            <Pop onPress={() => onSave(inbox.map((f) => ({ tx: toTx(f, catFor(f)), assetId: f.assetId })))} label="บันทึกทั้งหมด" bg={t.accent} radius={18} style={[s.btn, { paddingVertical: 15 }]}>
              <T w="bold" size={16}>บันทึกทั้ง {inbox.length} ใบ</T>
            </Pop>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18 },
  list: { padding: 18, paddingTop: 0, gap: 16 },
  thumb: { width: 64, height: 96, borderRadius: 12, backgroundColor: '#EFE8D8', borderWidth: 2, borderColor: INK },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  btn: { paddingHorizontal: 16, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  foot: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8 },
});
