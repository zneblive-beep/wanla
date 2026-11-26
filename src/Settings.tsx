import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { money } from './model';
import type { IconName } from './model';
import type { SlipWatch } from './slipWatch';
import { Icon, INK, Pop, RoundBtn, T } from './ui';
import { FONT, Theme } from './theme';

type Props = {
  t: Theme; budget: number; apiKey: string; hasSamples: boolean; txCount: number; watch: SlipWatch;
  onSaveBudget: (b: number) => void; onSaveKey: (k: string) => void;
  onAddSamples: () => void; onClearSamples: () => void; onBack: () => void; onQuiz: () => void;
};

function Head({ t, icon, title, sub, bg }: { t: Theme; icon: IconName; title: string; sub: string; bg: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
      <View style={[s.icon, { backgroundColor: bg }]}><Icon name={icon} size={22} color={INK} /></View>
      <View style={{ flex: 1 }}>
        <T w="head" size={16}>{title}</T>
        <T size={13} color={t.muted}>{sub}</T>
      </View>
    </View>
  );
}

function Btn({ label, onPress, bg = '#FFFFFF', color = INK, flex }: { label: string; onPress: () => void; bg?: string; color?: string; flex?: number }) {
  return <Pop onPress={onPress} label={label} bg={bg} radius={14} wrap={flex ? { flex } : undefined} style={s.btn}><T w="semi" color={color}>{label}</T></Pop>;
}

function Row({ t, title, sub, value, disabled, onChange }: { t: Theme; title: string; sub: string; value: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: disabled ? 0.5 : 1 }}>
      <View style={{ flex: 1 }}>
        <T w="semi" size={14}>{title}</T>
        <T size={12} color={t.muted}>{sub}</T>
      </View>
      <Switch value={value} disabled={disabled} onValueChange={onChange} trackColor={{ true: INK, false: t.line }} thumbColor={value ? t.accent : '#FFFFFF'} accessibilityLabel={title} />
    </View>
  );
}

function AutoSlips({ t, apiKey, watch }: { t: Theme; apiKey: string; watch: SlipWatch }) {
  const [msg, setMsg] = useState('');
  const when = watch.lastCheck ? new Date(watch.lastCheck).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '';
  const status = !watch.supported ? 'ใช้ได้บนมือถือเท่านั้น'
    : !apiKey ? 'ใส่ API key ด้านบนก่อน'
    : !watch.enabled ? 'ปิดอยู่'
    : watch.checking ? 'กำลังตรวจอัลบั้ม…'
    : when ? `ตรวจล่าสุด ${when} น.` : 'เปิดอยู่';
  return (
    <Pop radius={24} style={s.card}>
      <Head t={t} icon="image-search-outline" bg={t.sun} title="อ่านสลิปใหม่จากอัลบั้มให้เอง" sub={status} />
      <T size={13} color={t.muted} style={{ lineHeight: 20 }}>
        โอนเงินเสร็จ แอปธนาคารจะเซฟสลิปลงอัลบั้ม เช่น K PLUS หรือ SCB EASY พอเปิดแอปนี้ แอปจะเจอสลิปใหม่ อ่านให้ แล้วรอให้คุณกดบันทึก แอปส่งไปให้ Claude อ่านเฉพาะรูปในอัลบั้มของธนาคาร รูปอื่นไม่ถูกส่ง
      </T>
      <Row t={t} title="เปิดใช้" sub="ตรวจทุกครั้งที่เปิดแอป" value={watch.enabled} disabled={!watch.supported || !apiKey}
        onChange={async (v) => { setMsg((await watch.setEnabled(v)) ?? ''); }} />
      <Row t={t} title="รวมภาพแคปหน้าจอด้วย" sub="สำหรับคนที่แคปสลิปเอง ค่าใช้คีย์อาจเพิ่มขึ้น" value={watch.screenshots} disabled={!watch.enabled}
        onChange={watch.setScreenshots} />
      {!!(msg || watch.problem) && <T size={13} color={t.warn}>{msg || watch.problem}</T>}
      {watch.enabled && <Btn label={watch.checking ? 'กำลังตรวจ…' : 'ตรวจตอนนี้'} onPress={watch.checkNow} />}
    </Pop>
  );
}

export default function Settings({ t, budget, apiKey, hasSamples, txCount, watch, onSaveBudget, onSaveKey, onAddSamples, onClearSamples, onBack, onQuiz }: Props) {
  const [b, setB] = useState(budget ? String(budget) : '');
  const [k, setK] = useState('');

  return (
    <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <RoundBtn icon="arrow-left" label="กลับ" onPress={onBack} />
        <T w="head" size={26}>ตั้งค่า</T>
      </View>

      <Pop radius={24} style={s.card}>
        <Head t={t} icon="target" bg={t.accent} title="งบรายจ่ายต่อเดือน" sub={budget ? `ตอนนี้ ${money(budget)} · ใช้คำนวณงบรายวัน` : 'ยังไม่ได้ตั้ง'} />
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <TextInput value={b} onChangeText={(v) => setB(v.replace(/[^\d]/g, ''))} placeholder="เช่น 15000" placeholderTextColor={t.faint} keyboardType="number-pad" style={[s.input, { flex: 1, minWidth: 0 }]} />
          <Btn label="บันทึก" bg={t.accent} onPress={() => onSaveBudget(Math.max(0, Math.round(Number(b) || 0)))} />
        </View>
        <Pressable onPress={onQuiz}><T w="semi" size={13} color={t.muted}>ทำแบบทดสอบสไตล์เงินอีกครั้ง ›</T></Pressable>
      </Pop>

      <Pop radius={24} style={s.card}>
        <Head t={t} icon="line-scan" bg={t.sky} title="อ่านสลิปด้วย Claude" sub={apiKey ? `ใส่คีย์แล้ว ลงท้าย …${apiKey.slice(-4)}` : 'ใส่ API key เพื่อเปิดใช้'} />
        <T size={13} color={t.muted} style={{ lineHeight: 20 }}>
          ขอคีย์ได้ที่ console.anthropic.com คีย์เก็บในที่เก็บรหัสที่ปลอดภัยของเครื่องนี้ และคิดค่าใช้จ่ายตามการใช้งานของคีย์
        </T>
        <TextInput value={k} onChangeText={setK} placeholder="sk-ant-..." placeholderTextColor={t.faint} secureTextEntry autoCapitalize="none" autoCorrect={false} style={[s.input, { fontFamily: FONT.regular, fontSize: 15 }]} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn flex={2} label="บันทึกคีย์" bg={t.accent} onPress={() => { if (k.trim()) { onSaveKey(k.trim()); setK(''); } }} />
          {!!apiKey && (
            <Btn flex={1} label="ลบคีย์" color={t.expense} onPress={() => Alert.alert('ลบคีย์?', 'จะสแกนสลิปไม่ได้จนกว่าจะใส่ใหม่', [
              { text: 'ยกเลิก', style: 'cancel' }, { text: 'ลบ', style: 'destructive', onPress: () => onSaveKey('') },
            ])} />
          )}
        </View>
      </Pop>

      <AutoSlips t={t} apiKey={apiKey} watch={watch} />

      <Pop radius={24} style={s.card}>
        <Head t={t} icon="flask-outline" bg={t.pink} title="ข้อมูลตัวอย่าง" sub="ลองดูหน้าตาแอปด้วยรายการสมมติ" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn flex={1} label="ใส่ตัวอย่าง" onPress={onAddSamples} />
          {hasSamples && <Btn flex={1} label="ลบตัวอย่าง" color={t.expense} onPress={onClearSamples} />}
        </View>
      </Pop>

      <View style={{ alignItems: 'center', gap: 2, marginTop: 4 }}>
        <T size={12} color={t.muted}>มี {txCount} รายการ เก็บไว้ในเครื่องนี้เท่านั้น</T>
        <T size={12} color={t.muted}>ถ้าลบแอป ข้อมูลจะหายไปด้วย</T>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 18, paddingBottom: 130, gap: 16 },
  card: { padding: 16, gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 13, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 2, borderColor: INK, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontFamily: FONT.num, fontSize: 18, color: INK, backgroundColor: '#FFFFFF' },
  btn: { paddingHorizontal: 18, paddingVertical: 11, alignItems: 'center' },
});
