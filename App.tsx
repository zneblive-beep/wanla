import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts, IBMPlexSansThai_400Regular, IBMPlexSansThai_500Medium, IBMPlexSansThai_600SemiBold, IBMPlexSansThai_700Bold } from '@expo-google-fonts/ibm-plex-sans-thai';
import { Mitr_500Medium, Mitr_600SemiBold } from '@expo-google-fonts/mitr';
import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { IconName, Tx, newId, toDateStr } from './src/model';
import { MoneyStyle, loadApiKey, loadBudget, loadJars, loadStyle, loadTx, saveApiKey, saveBudget, saveJars, saveStyle, saveTx } from './src/storage';
import { useTheme, Theme } from './src/theme';
import { Icon, INK, T } from './src/ui';
import AddSheet, { SheetMode } from './src/AddSheet';
import Settings from './src/Settings';
import Onboarding from './src/Onboarding';
import SlipInbox from './src/SlipInbox';
import { useSlipWatch } from './src/slipWatch';
import { haptic } from './src/motion';
import TodayScreen from './src/screens/TodayScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import JarsScreen from './src/screens/JarsScreen';
import StoryScreen from './src/screens/StoryScreen';

type Stored = Tx & { sample?: boolean };
type Tab = 'today' | 'calendar' | 'jars' | 'story' | 'settings';

export default function App() {
  const [fontsLoaded] = useFonts({
    IBMPlexSansThai_400Regular, IBMPlexSansThai_500Medium, IBMPlexSansThai_600SemiBold, IBMPlexSansThai_700Bold,
    Mitr_500Medium, Mitr_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold,
  });
  const t = useTheme();
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Main t={t} />
    </SafeAreaProvider>
  );
}

function Main({ t }: { t: Theme }) {
  const [tx, setTx] = useState<Stored[]>([]);
  const [budget, setBudget] = useState(0);
  const [jars, setJars] = useState<Record<string, number>>({});
  const [apiKey, setApiKey] = useState('');
  const [style, setStyle] = useState<MoneyStyle | null | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const [back, setBack] = useState<Tab>('today');
  const [view, setView] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sheet, setSheet] = useState<{ open: boolean; editing: Tx | null; mode: SheetMode }>({ open: false, editing: null, mode: 'expense' });
  const [inboxOpen, setInboxOpen] = useState(false);

  useEffect(() => {
    Promise.all([loadTx(), loadBudget(), loadApiKey(), loadJars(), loadStyle()]).then(([a, b, k, j, st]) => {
      setTx(a); setBudget(b); setApiKey(k); setJars(j); setStyle(st); setLoaded(true);
    });
  }, []);

  const watch = useSlipWatch(apiKey, tx);

  const commit = (next: Stored[]) => { setTx(next); saveTx(next).catch(() => {}); };
  const saveFound = (rows: { tx: Tx; assetId: string }[]) => {
    haptic.success();
    commit([...tx, ...rows.map((r) => r.tx)]);
    rows.forEach((r) => watch.dismiss(r.assetId));
  };
  const shift = (n: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + n, 1));
  const openAdd = (mode: SheetMode) => setSheet({ open: true, editing: null, mode });
  const openEdit = (x: Tx) => setSheet({ open: true, editing: x, mode: x.type });
  const closeSheet = () => setSheet((s) => ({ ...s, open: false }));
  const go = (next: Tab) => { if (next === 'settings') setBack(tab === 'settings' ? 'today' : tab); setTab(next); };
  const updateBudget = (b: number) => { setBudget(b); saveBudget(b).catch(() => {}); };

  const onSave = (x: Tx) => {
    haptic.success();
    const exists = tx.some((y) => y.id === x.id);
    commit(exists ? tx.map((y) => (y.id === x.id ? { ...x, sample: y.sample } : y)) : [...tx, x]);
    closeSheet();
  };

  const addSamples = () => {
    const now = new Date();
    const day = (k: number) => { const d = new Date(now); d.setDate(Math.max(1, now.getDate() - k)); return toDateStr(d); };
    const at = (k: number, h: number, m: number) => { const d = new Date(now); d.setDate(Math.max(1, now.getDate() - k)); d.setHours(h, m, 0, 0); return d.getTime(); };
    const rows: [Tx['type'], string, number, string, number, number, number][] = [
      ['income', 'salary', 28000, 'เงินเดือน', 20, 9, 0], ['expense', 'home', 6500, 'ค่าห้อง', 20, 10, 5],
      ['expense', 'bill', 610, 'ค่าไฟ', 12, 19, 40], ['expense', 'food', 65, 'อเมริกาโน่เย็น', 0, 8, 10], ['expense', 'food', 55, 'ข้าวมันไก่', 0, 12, 30],
      ['expense', 'travel', 65, 'Grab กลับออฟฟิศ', 0, 15, 5], ['expense', 'food', 65, 'อเมริกาโน่เย็น', 1, 8, 20], ['expense', 'travel', 47, 'BTS', 1, 8, 45],
      ['expense', 'shop', 890, 'เสื้อกันหนาว', 5, 14, 0], ['expense', 'food', 289, 'ชาบูกับแก๊งเพื่อน', 5, 19, 30], ['expense', 'food', 65, 'อเมริกาโน่เย็น', 2, 8, 5],
      ['expense', 'fun', 220, 'ดูหนัง', 3, 20, 0], ['expense', 'food', 65, 'อเมริกาโน่เย็น', 3, 8, 15], ['expense', 'travel', 47, 'BTS', 3, 8, 40],
      ['expense', 'health', 350, 'ยาแก้หวัด', 6, 18, 20], ['income', 'freelance', 3000, 'ออกแบบโลโก้', 8, 16, 0], ['expense', 'food', 65, 'อเมริกาโน่เย็น', 4, 8, 0],
    ];
    commit([...tx, ...rows.map(([type, cat, amount, note, k, h, m]) => ({ id: newId(), type, cat, amount, note, date: day(k), createdAt: at(k, h, m), sample: true }))]);
    if (!budget) updateBudget(15000);
    setTab('today');
  };

  if (style === undefined) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (style === null) {
    return <Onboarding t={t} onDone={(st, b) => { setStyle(st); saveStyle(st).catch(() => {}); if (b) updateBudget(b); }} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'left', 'right']}>
      <View style={{ flex: 1 }}>
        {tab === 'today' && (
          <TodayScreen t={t} tx={tx} budget={budget} loaded={loaded} onEdit={openEdit} onAdd={() => openAdd('expense')} onScan={() => openAdd('scan')}
            onSamples={addSamples} onSettings={() => go('settings')} onCalendar={() => go('calendar')} onStory={() => go('story')}
            slipCount={watch.inbox.length} onSlips={() => setInboxOpen(true)} />
        )}
        {tab === 'calendar' && <CalendarScreen t={t} tx={tx} view={view} onShift={shift} onEdit={openEdit} />}
        {tab === 'jars' && <JarsScreen t={t} tx={tx} budget={budget} jars={jars} onSaveJars={(j) => { setJars(j); saveJars(j).catch(() => {}); }} onBudget={() => go('settings')} />}
        {tab === 'story' && <StoryScreen t={t} tx={tx} view={view} onShift={shift} />}
        {tab === 'settings' && (
          <Settings t={t} budget={budget} apiKey={apiKey} hasSamples={tx.some((x) => x.sample)} txCount={tx.length} watch={watch}
            onSaveBudget={updateBudget}
            onSaveKey={(k) => { setApiKey(k); saveApiKey(k).catch(() => {}); }}
            onAddSamples={addSamples} onClearSamples={() => commit(tx.filter((x) => !x.sample))}
            onBack={() => setTab(back)} onQuiz={() => setStyle(null)} />
        )}
      </View>

      <TabBar t={t} tab={tab} onTab={go} onAdd={() => openAdd('expense')} />

      <AddSheet t={t} visible={sheet.open} editing={sheet.editing} mode={sheet.mode} allTx={tx} apiKey={apiKey}
        onSave={onSave}
        onDelete={(id) => { commit(tx.filter((x) => x.id !== id)); closeSheet(); }}
        onClose={closeSheet}
        onNeedKey={() => { closeSheet(); go('settings'); }} />

      <SlipInbox t={t} visible={inboxOpen} inbox={watch.inbox} onSave={saveFound} onSkip={watch.dismiss} onClose={() => setInboxOpen(false)} />
    </SafeAreaView>
  );
}

function TabBar({ t, tab, onTab, onAdd }: { t: Theme; tab: Tab; onTab: (x: Tab) => void; onAdd: () => void }) {
  const insets = useSafeAreaInsets();
  const items: { k: Tab; label: string; icon: IconName; iconOn: IconName }[] = [
    { k: 'today', label: 'วันนี้', icon: 'home-outline', iconOn: 'home' },
    { k: 'calendar', label: 'ปฏิทิน', icon: 'calendar-blank-outline', iconOn: 'calendar-blank' },
    { k: 'jars', label: 'กระปุก', icon: 'beaker-outline', iconOn: 'beaker' },
    { k: 'story', label: 'สรุป', icon: 'star-four-points-outline', iconOn: 'star-four-points' },
  ];
  const btn = (it: (typeof items)[number]) => {
    const on = tab === it.k;
    return (
      <Pressable key={it.k} onPress={() => { if (tab !== it.k) haptic.tap(); onTab(it.k); }} style={s.tab} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={it.label}>
        <Icon name={on ? it.iconOn : it.icon} size={24} color={on ? t.accent : t.tabIdle} />
        <T w={on ? 'semi' : 'regular'} size={10} color={on ? t.accent : t.tabIdle}>{it.label}</T>
      </Pressable>
    );
  };
  return (
    <View style={[s.wrap, { bottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
      <View style={[s.bar, { backgroundColor: t.tabBar }]}>
        {items.slice(0, 2).map(btn)}
        <View style={s.tab}>
          <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="จดรายการ"
            style={({ pressed }) => [s.fab, { backgroundColor: t.accent, borderColor: t.bg, transform: [{ translateY: pressed ? -14 : -18 }, { rotate: '-6deg' }] }]}>
            <Icon name="plus" size={30} color={INK} />
          </Pressable>
        </View>
        {items.slice(2).map(btn)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  bar: { flexDirection: 'row', alignItems: 'center', height: 68, borderRadius: 26, paddingHorizontal: 6 },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  fab: { width: 60, height: 60, borderRadius: 20, borderWidth: 5, alignItems: 'center', justifyContent: 'center' },
});
