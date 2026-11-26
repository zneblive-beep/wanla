import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Album, AssetField, MediaType, Query, addListener, getPermissionsAsync, requestPermissionsAsync } from 'expo-media-library';
import { readSlip, SlipError, SlipResult } from './slip';
import type { Tx } from './model';

// Bank and wallet apps save each transfer slip into an album named after the app.
// Only photos in these albums are ever sent to Claude, so ordinary photos stay on the phone.
const BANK_ALBUM = /k ?plus|make by kbank|scb|krungthai|^next$|bualuang|bangkok bank|krungsri|kma|ttb|tmb|mymo|gsb|uob|tmrw|cimb|kkp|lh bank|baac|ธ\.ก\.ส|truemoney|true money|shopeepay|rabbit line pay|line bk|dime|promptpay|พร้อมเพย์|slip|สลิป/i;
const SCREENSHOT_ALBUM = /screenshot|ภาพหน้าจอ|ภาพถ่ายหน้าจอ/i;
const MAX_PER_CHECK = 8;
const LOOKBACK_ON_ENABLE = 24 * 60 * 60 * 1000;
const STORE = 'samud-ngern/slipwatch/v1';

export const slipWatchSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export type Found = {
  assetId: string;
  uri: string;
  takenAt: number;
  album: string;
  result: SlipResult;
};

type Saved = {
  enabled: boolean;
  screenshots: boolean;
  since: number;
  seen: string[];
  inbox: Found[];
  lastCheck: number;
};

const empty: Saved = { enabled: false, screenshots: false, since: 0, seen: [], inbox: [], lastCheck: 0 };

async function load(): Promise<Saved> {
  try {
    const raw = await AsyncStorage.getItem(STORE);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

/** Finds photos taken after `since` in bank-slip albums (and screenshots, when asked). */
async function findCandidates(since: number, screenshots: boolean, seen: Set<string>) {
  const albums = await Album.getAll();
  const out: { assetId: string; uri: string; takenAt: number; album: string }[] = [];
  for (const album of albums) {
    const title = await album.getTitle();
    if (!(BANK_ALBUM.test(title) || (screenshots && SCREENSHOT_ALBUM.test(title)))) continue;
    const assets = await new Query()
      .album(album)
      .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
      .gt(AssetField.CREATION_TIME, since)
      .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
      .limit(MAX_PER_CHECK)
      .exe();
    for (const a of assets) {
      if (seen.has(a.id) || out.some((x) => x.assetId === a.id)) continue;
      const [uri, takenAt] = await Promise.all([a.getUri(), a.getCreationTime()]);
      out.push({ assetId: a.id, uri, takenAt: takenAt ?? Date.now(), album: title });
    }
  }
  return out.sort((a, b) => a.takenAt - b.takenAt).slice(-MAX_PER_CHECK);
}

export type SlipWatch = ReturnType<typeof useSlipWatch>;

export function useSlipWatch(apiKey: string, allTx: Tx[]) {
  const [state, setState] = useState<Saved>(empty);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState('');
  const stateRef = useRef(state);
  const txRef = useRef(allTx);
  const busy = useRef(false);
  useEffect(() => { txRef.current = allTx; }, [allTx]);

  const update = useCallback((fn: (s: Saved) => Saved) => {
    const next = fn(stateRef.current);
    stateRef.current = next;
    setState(next);
    AsyncStorage.setItem(STORE, JSON.stringify(next)).catch(() => {});
  }, []);

  useEffect(() => { load().then((s) => { stateRef.current = s; setState(s); setReady(true); }); }, []);

  const check = useCallback(async () => {
    const s = stateRef.current;
    if (!slipWatchSupported || !s.enabled || !apiKey || busy.current) return;
    busy.current = true;
    setChecking(true);
    try {
      const perm = await getPermissionsAsync(false, ['photo']);
      if (!perm.granted) { setProblem('แอปยังไม่ได้รับอนุญาตให้ดูรูป เปิดได้ในการตั้งค่าของเครื่อง'); return; }
      const seen = new Set(s.seen);
      const candidates = await findCandidates(s.since, s.screenshots, seen);
      const refs = new Set([...txRef.current.map((x) => x.ref), ...s.inbox.map((f) => f.result.ref)].filter(Boolean));
      const found: Found[] = [];
      const done: string[] = [];
      for (const c of candidates) {
        try {
          const result = await readSlip(c.uri, apiKey);
          done.push(c.assetId);
          const ref = result.ref?.trim();
          if (!result.is_slip || !(result.amount && result.amount > 0)) continue;
          if (ref && refs.has(ref)) continue; // already saved or already waiting
          if (ref) refs.add(ref);
          found.push({ ...c, result });
        } catch (e) {
          // Stop on problems that will hit every photo; leave the photo unseen so it is retried later.
          if (e instanceof SlipError && ['bad_key', 'rate', 'network', 'no_key'].includes(e.kind)) {
            setProblem(e.kind === 'bad_key' ? 'API key ใช้ไม่ได้ ตรวจในหน้าตั้งค่า' : e.kind === 'rate' ? 'ใช้งานถี่เกินไป จะลองใหม่ทีหลัง' : 'ต่ออินเทอร์เน็ตไม่ได้ จะลองใหม่ทีหลัง');
            break;
          }
          done.push(c.assetId); // unreadable photo: don't pay to read it again
        }
      }
      if (found.length || done.length) setProblem('');
      update((x) => ({
        ...x,
        seen: [...x.seen, ...done].slice(-500),
        inbox: [...x.inbox, ...found],
        lastCheck: Date.now(),
      }));
    } catch {
      setProblem('ตรวจอัลบั้มรูปไม่สำเร็จ');
    } finally {
      busy.current = false;
      setChecking(false);
    }
  }, [apiKey, update]);

  // Check when the app opens or comes back to the front, and when the photo library changes while it is open.
  useEffect(() => {
    if (!ready || !state.enabled || !slipWatchSupported) return;
    // Starts the async photo check; its only synchronous state change is the 'checking' flag.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    check();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const app = AppState.addEventListener('change', (st) => { if (st === 'active') check(); });
    const lib = addListener(() => { clearTimeout(timer); timer = setTimeout(check, 1500); });
    return () => { app.remove(); lib.remove(); clearTimeout(timer); };
  }, [ready, state.enabled, check]);

  const setEnabled = useCallback(async (on: boolean): Promise<string | null> => {
    if (!on) { update((x) => ({ ...x, enabled: false })); return null; }
    if (!slipWatchSupported) return 'ใช้ได้บนมือถือเท่านั้น';
    const perm = await requestPermissionsAsync(false, ['photo']);
    if (!perm.granted) return 'ต้องอนุญาตให้แอปดูรูปก่อน เปิดได้ในการตั้งค่าของเครื่อง';
    update((x) => ({ ...x, enabled: true, since: x.since || Date.now() - LOOKBACK_ON_ENABLE }));
    setProblem(perm.accessPrivileges === 'limited' ? 'คุณอนุญาตให้ดูรูปบางส่วน แอปจะเห็นเฉพาะสลิปในรูปที่เลือกไว้' : '');
    return null;
  }, [update]);

  const setScreenshots = useCallback((on: boolean) => update((x) => ({ ...x, screenshots: on })), [update]);

  const dismiss = useCallback((assetId: string) => update((x) => ({
    ...x,
    inbox: x.inbox.filter((f) => f.assetId !== assetId),
    seen: [...x.seen, assetId].slice(-500),
  })), [update]);

  return {
    supported: slipWatchSupported,
    enabled: state.enabled,
    screenshots: state.screenshots,
    inbox: state.inbox,
    lastCheck: state.lastCheck,
    checking,
    problem,
    setEnabled,
    setScreenshots,
    dismiss,
    checkNow: check,
  };
}
