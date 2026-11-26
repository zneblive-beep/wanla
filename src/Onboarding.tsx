import { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { IconName } from './model';
import { money } from './model';
import type { MoneyStyle } from './storage';
import { Bubble, Chip, Coin, Icon, INK, Mood, Pop, RoundBtn, T } from './ui';
import { FONT, Theme } from './theme';

const STYLES: { id: Exclude<MoneyStyle, 'skip'>; title: string; sub: string; icon: IconName; color: string; reply: string; mood: Mood }[] = [
  { id: 'saver', title: 'โอนเข้าบัญชีออมก่อนเลย', sub: 'สายเก็บ · ออมก่อนใช้', icon: 'piggy-bank-outline', color: '#6EE7B7', reply: 'สายเก็บ! งั้นเราช่วยดูว่าเงินที่เหลือใช้พอถึงสิ้นเดือนไหม', mood: 'cool' },
  { id: 'treat', title: 'ให้รางวัลตัวเองสักชิ้น', sub: 'สายเปย์ · ทำงานหนักก็ต้องฮีลใจ', icon: 'gift-outline', color: '#FF9EC7', reply: 'สายเปย์! ไม่ห้ามช้อปนะ แค่จะบอกว่าวันนี้ยังช้อปได้อีกเท่าไร', mood: 'wink' },
  { id: 'planner', title: 'จ่ายบิลให้ครบก่อน', sub: 'สายวางแผน · ค่าห้อง ค่าเน็ต ค่าโทร', icon: 'file-check-outline', color: '#7CC4FF', reply: 'สายวางแผน! ลองแบ่งเงินใส่กระปุกแต่ละหมวดดู น่าจะถูกใจ', mood: 'happy' },
  { id: 'free', title: 'ไม่รู้ เงินหายไปไหนก็ไม่รู้', sub: 'สายปล่อยจอย · ไม่เป็นไร เราช่วยได้', icon: 'help', color: '#FFD23F', reply: 'ไม่เป็นไรเลย เริ่มจากจดวันละนิด เดี๋ยวก็เห็นว่าเงินไปไหน', mood: 'happy' },
];
const BUDGETS = [8000, 12000, 15000, 20000, 30000];

export default function Onboarding({ t, onDone }: { t: Theme; onDone: (style: MoneyStyle, budget: number | null) => void }) {
  const [step, setStep] = useState(0);
  const [style, setStyle] = useState<(typeof STYLES)[number] | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const chosen = custom ? Number(custom) || null : budget;
  const daily = chosen ? chosen / 30 : 0;

  // Android's back button goes to the previous question instead of leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep(step - 1);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.top}>
          {step > 0 && <RoundBtn icon="arrow-left" label="ย้อนกลับไปคำถามก่อน" size={36} onPress={() => setStep(step - 1)} />}
          <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
            {[0, 1].map((i) => <View key={i} style={[s.prog, i <= step && { backgroundColor: INK }]} />)}
          </View>
          <Pressable onPress={() => onDone('skip', null)} hitSlop={10}><T w="semi" size={14} color={t.muted}>ข้าม</T></Pressable>
        </View>

        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 0 ? (
            <>
              <Chip bg={t.accent} tilt={-3} size={12}>คำถาม 1/2 · หาสไตล์เงินของคุณ</Chip>
              <T w="head" size={32} style={{ lineHeight: 42 }}>เงินเดือนออกปุ๊บ{'\n'}คุณทำอะไรก่อน?</T>
              <View style={{ gap: 14, marginTop: 4 }}>
                {STYLES.map((x) => {
                  const on = style?.id === x.id;
                  return (
                    <Pop key={x.id} onPress={() => setStyle(x)} label={x.title} bg={on ? t.accent : '#FFFFFF'} offset={on ? 6 : 4} tilt={on ? -1 : 0} style={s.opt}>
                      <View style={[s.optIcon, { backgroundColor: x.color }]}><Icon name={x.icon} size={24} color={INK} /></View>
                      <View style={{ flex: 1 }}>
                        <T w="semi" size={15}>{x.title}</T>
                        <T size={12} color={on ? '#2B2B22' : t.muted}>{x.sub}</T>
                      </View>
                      {on && <View style={s.check}><Icon name="check-bold" size={16} color={t.accent} /></View>}
                    </Pop>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <Chip bg={t.accent} tilt={-3} size={12}>คำถาม 2/2 · งบรายเดือน</Chip>
              <T w="head" size={30} style={{ lineHeight: 40 }}>เดือนนึงอยากใช้{'\n'}ไม่เกินเท่าไร?</T>
              <T size={14} color={t.muted}>ไม่รวมเงินที่ตั้งใจเก็บ เปลี่ยนทีหลังได้ในตั้งค่า</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {BUDGETS.map((b, i) => {
                  const on = !custom && budget === b;
                  return (
                    <Chip key={b} bg={on ? INK : '#FFFFFF'} color={on ? '#FFFFFF' : INK} tilt={[-2, 2, -1, 3, -3][i]} size={16}
                      onPress={() => { setBudget(b); setCustom(''); }} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                      {money(b)}
                    </Chip>
                  );
                })}
              </View>
              <TextInput value={custom} onChangeText={(v) => setCustom(v.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="หรือพิมพ์เอง เช่น 18000"
                placeholderTextColor={t.faint} style={s.input} />
              {!!chosen && (
                <Pop bg={t.sun} radius={20} tilt={-1.5} style={{ padding: 14 }} wrap={{ marginTop: 6 }}>
                  <T size={13}>เท่ากับใช้ได้ประมาณ</T>
                  <T w="numBold" size={36}>{money(Math.floor(daily))} <T w="head" size={18}>ต่อวัน</T></T>
                </Pop>
              )}
            </>
          )}
        </ScrollView>

        <View style={s.foot}>
          <View style={s.coinRow}>
            <Coin size={60} mood={step === 1 && style ? style.mood : 'happy'} tilt={-8} />
            <Bubble side="left">{step === 0 ? (style ? style.reply : 'ไม่มีคำตอบผิด เดี๋ยวน้องเหรียญตั้งงบรายวันให้เข้ากับคุณเอง') : 'งบนี้ใช้คำนวณว่าแต่ละวันใช้ได้อีกเท่าไร'}</Bubble>
          </View>
          <Pop bg={INK} radius={20} label="ต่อไป" disabled={step === 0 ? !style : !chosen}
            onPress={() => (step === 0 ? setStep(1) : onDone(style?.id ?? 'skip', chosen))}
            style={s.next} wrap={(step === 0 ? !style : !chosen) && { opacity: 0.35 }}>
            <T w="bold" size={16} color="#FFFFFF">{step === 0 ? 'ต่อไป' : 'เริ่มใช้เลย'}</T>
            <Icon name="arrow-right" size={20} color="#FFFFFF" />
          </Pop>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12 },
  prog: { flex: 1, height: 8, borderRadius: 4, borderWidth: 2, borderColor: INK },
  body: { padding: 20, gap: 14 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 },
  optIcon: { width: 46, height: 46, borderRadius: 14, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  check: { width: 28, height: 28, borderRadius: 14, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 2, borderColor: INK, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontFamily: FONT.regular, fontSize: 16, color: INK, backgroundColor: '#FFFFFF' },
  foot: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  coinRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  next: { height: 58, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
});
