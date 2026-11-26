import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Tx } from './model';

// Keys keep the app's first working name (สมุดเงิน) so data saved before the rename to Wanla is still found.
const TX_KEY = 'samud-ngern/tx/v1';
const BUDGET_KEY = 'samud-ngern/budget/v1';
const API_KEY = 'samud_ngern_anthropic_key';

export async function loadTx(): Promise<Tx[]> {
  try {
    const raw = await AsyncStorage.getItem(TX_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
export const saveTx = (list: Tx[]) => AsyncStorage.setItem(TX_KEY, JSON.stringify(list));

export async function loadBudget(): Promise<number> {
  try {
    return Number(await AsyncStorage.getItem(BUDGET_KEY)) || 0;
  } catch {
    return 0;
  }
}
export const saveBudget = (b: number) => AsyncStorage.setItem(BUDGET_KEY, String(b));

// The Claude API key lives in the phone's secure keychain, never in plain storage.
export async function loadApiKey(): Promise<string> {
  try {
    return (await SecureStore.getItemAsync(API_KEY)) ?? '';
  } catch {
    return '';
  }
}
export async function saveApiKey(k: string) {
  if (k) await SecureStore.setItemAsync(API_KEY, k);
  else await SecureStore.deleteItemAsync(API_KEY);
}

// Monthly budget per expense category, shown as jars ("กระปุก").
const JARS_KEY = 'samud-ngern/jars/v1';
export async function loadJars(): Promise<Record<string, number>> {
  try {
    const v = JSON.parse((await AsyncStorage.getItem(JARS_KEY)) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
export const saveJars = (j: Record<string, number>) => AsyncStorage.setItem(JARS_KEY, JSON.stringify(j));

// First-run quiz answer; null until the quiz is done or skipped.
const STYLE_KEY = 'samud-ngern/style/v1';
export type MoneyStyle = 'saver' | 'treat' | 'planner' | 'free' | 'skip';
export async function loadStyle(): Promise<MoneyStyle | null> {
  try {
    return ((await AsyncStorage.getItem(STYLE_KEY)) as MoneyStyle | null) ?? null;
  } catch {
    return 'skip';
  }
}
export const saveStyle = (s: MoneyStyle) => AsyncStorage.setItem(STYLE_KEY, s);
