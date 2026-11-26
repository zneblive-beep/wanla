import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type TxType = 'expense' | 'income';

export type Tx = {
  id: string;
  type: TxType;
  amount: number;
  cat: string;
  note: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  ref?: string; // slip reference number, used to warn about duplicates
};


export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
export type Category = { id: string; name: string; color: string; icon: IconName };

export const CATS: Record<TxType, Category[]> = {
  expense: [
    { id: 'food', name: 'อาหาร', color: '#FFB27A', icon: 'silverware-fork-knife' },
    { id: 'travel', name: 'เดินทาง', color: '#7CC4FF', icon: 'bus' },
    { id: 'shop', name: 'ช้อปปิ้ง', color: '#FF9EC7', icon: 'shopping-outline' },
    { id: 'bill', name: 'ค่าน้ำไฟ', color: '#C9B6FF', icon: 'flash-outline' },
    { id: 'home', name: 'ที่พัก', color: '#6EE7B7', icon: 'home-outline' },
    { id: 'health', name: 'สุขภาพ', color: '#FF9A8A', icon: 'heart-pulse' },
    { id: 'fun', name: 'บันเทิง', color: '#FFD23F', icon: 'movie-open-outline' },
    { id: 'other-e', name: 'อื่นๆ', color: '#D9D3C4', icon: 'dots-horizontal' },
  ],
  income: [
    { id: 'salary', name: 'เงินเดือน', color: '#C6F432', icon: 'briefcase-outline' },
    { id: 'freelance', name: 'ฟรีแลนซ์', color: '#7CC4FF', icon: 'laptop' },
    { id: 'sell', name: 'ขายของ', color: '#6EE7B7', icon: 'storefront-outline' },
    { id: 'gift', name: 'ของขวัญ', color: '#FF9EC7', icon: 'gift-outline' },
    { id: 'other-i', name: 'อื่นๆ', color: '#D9D3C4', icon: 'dots-horizontal' },
  ],
};

const ALL = [...CATS.expense, ...CATS.income];
export const catOf = (id: string): Category =>
  ALL.find((c) => c.id === id) ?? CATS.expense[CATS.expense.length - 1];

export const fmtMonthShort = (d: Date) => `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear() + 543).slice(2)}`;

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => toDateStr(new Date());
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const isDateStr = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(parseDate(s).getTime());
export const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

// Thai Buddhist year (พ.ศ.) = Gregorian + 543
export const fmtMonth = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
export const fmtDay = (s: string) => {
  const d = parseDate(s);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear() + 543).slice(2)}`;
};

export const money = (n: number) => {
  const r = Math.round(n * 100) / 100;
  const [i, f] = Math.abs(r).toFixed(2).split('.');
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (r < 0 ? '−' : '') + '฿' + int + (f === '00' ? '' : '.' + f);
};

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

// Words people type when they jot something down ("ข้าวมันไก่ 55"), mapped to a category.
const HINTS: Record<string, RegExp> = {
  food: /ข้าว|กาแฟ|ชา|ก๋วยเตี๋ยว|ส้มตำ|ชาบู|หมูกระทะ|ปิ้งย่าง|บุฟเฟ่|ขนม|โจ๊ก|อาหาร|มื้อ|ร้านอาหาร|คาเฟ่|นม|เบเกอรี่|ไก่ทอด|พิซซ่า|ซูชิ|ราเมง|cafe|coffee|starbucks|kfc|mk|food|grabfood|lineman|ไลน์แมน/i,
  travel: /bts|mrt|arl|grab(?!food)|bolt|แท็กซี่|taxi|วิน|มอไซ|รถ|น้ำมัน|ทางด่วน|ที่จอด|ตั๋ว|เครื่องบิน|รถไฟ|รถเมล์|เรือ/i,
  shop: /เสื้อ|กางเกง|รองเท้า|กระเป๋า|shopee|lazada|ช้อป|uniqlo|ของใช้|เซเว่น|7-?11|โลตัส|lotus|big ?c|แม็คโคร|makro|ห้าง|เครื่องสำอาง/i,
  bill: /ค่าไฟ|ค่าน้ำ|เน็ต|อินเทอร์เน็ต|internet|wifi|ค่าโทร|ais|dtac|true|บิล|ค่าส่วนกลาง/i,
  home: /ค่าห้อง|ค่าเช่า|หอ|คอนโด|บ้าน|ผ่อนบ้าน/i,
  health: /ยา|หมอ|โรงพยาบาล|คลินิก|ทำฟัน|ฟิตเนส|gym|ประกัน/i,
  fun: /หนัง|netflix|spotify|youtube|disney|เกม|คอนเสิร์ต|เหล้า|เบียร์|ปาร์ตี้|เที่ยว/i,
  salary: /เงินเดือน|โบนัส/i,
  freelance: /ฟรีแลนซ์|freelance|ค่าจ้าง|รับงาน/i,
  sell: /ขาย|ลูกค้าโอน/i,
  gift: /ของขวัญ|อั่งเปา|แม่ให้|พ่อให้|ให้มา/i,
};

export function guessCat(text: string, type: TxType): string | null {
  for (const c of CATS[type]) if (HINTS[c.id]?.test(text)) return c.id;
  return null;
}

/** Splits "ข้าวมันไก่ 55" into note "ข้าวมันไก่" and amount 55 (the last number typed). */
export function parseEntry(text: string): { note: string; amount: number | null } {
  const nums = [...text.matchAll(/\d[\d,]*(?:\.\d{1,2})?/g)];
  const last = nums[nums.length - 1];
  if (!last || last.index === undefined) return { note: text.trim(), amount: null };
  const amount = Number(last[0].replace(/,/g, ''));
  const note = (text.slice(0, last.index) + text.slice(last.index + last[0].length)).replace(/\s*(บาท|฿)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return { note, amount: amount > 0 ? amount : null };
}

export const timeOf = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
export const fmtLong = (s: string) => {
  const d = parseDate(s);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};
