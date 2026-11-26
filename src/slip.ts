import Anthropic from '@anthropic-ai/sdk';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { CATS } from './model';

export type SlipResult = {
  is_slip: boolean;
  amount: number | null;
  date: string | null; // YYYY-MM-DD, Gregorian
  time: string | null;
  from_name: string | null;
  to_name: string | null;
  bank: string | null;
  ref: string | null;
  memo: string | null;
  category: string | null;
};

const CAT_IDS = CATS.expense.map((c) => c.id);
const nullable = (type: string) => ({ anyOf: [{ type }, { type: 'null' }] });

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['is_slip', 'amount', 'date', 'time', 'from_name', 'to_name', 'bank', 'ref', 'memo', 'category'],
  properties: {
    is_slip: { type: 'boolean' },
    amount: nullable('number'),
    date: nullable('string'),
    time: nullable('string'),
    from_name: nullable('string'),
    to_name: nullable('string'),
    bank: nullable('string'),
    ref: nullable('string'),
    memo: nullable('string'),
    category: { anyOf: [{ type: 'string', enum: CAT_IDS }, { type: 'null' }] },
  },
};

const PROMPT = `This image should be a Thai bank or e-wallet transfer slip (K PLUS, SCB EASY, Krungthai NEXT, Bangkok Bank, PromptPay, TrueMoney and similar).
Read it and fill the fields:
- amount: the transferred amount in baht, without fees.
- date: convert to the Gregorian calendar as YYYY-MM-DD. Thai slips usually print the Buddhist year (2569 = 2026, short "69" = 2026) and Thai month abbreviations (ม.ค. ก.พ. มี.ค. เม.ย. พ.ค. มิ.ย. ก.ค. ส.ค. ก.ย. ต.ค. พ.ย. ธ.ค.).
- time: HH:MM as printed.
- ref: the transaction reference number exactly as printed.
- from_name, to_name, bank, memo: as printed; keep Thai text.
- category: what the payment was most likely for, judged from the receiver and memo: ${CAT_IDS.join(', ')}.
If the image is not a transfer slip, set is_slip to false. Use null for anything you cannot read clearly. Never guess an amount.`;

export class SlipError extends Error {
  constructor(public kind: 'no_key' | 'bad_key' | 'rate' | 'refused' | 'network' | 'unreadable', message: string) {
    super(message);
  }
}

async function toJpegBase64(uri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri, { maxWidth: 1600 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.85, base64: true });
  if (!out.base64) throw new SlipError('unreadable', 'เปิดรูปนี้ไม่ได้');
  return out.base64;
}

export async function readSlip(uri: string, apiKey: string): Promise<SlipResult> {
  if (!apiKey) throw new SlipError('no_key', 'ยังไม่ได้ใส่ API key');
  const data = await toJpegBase64(uri);
  // The key belongs to the phone's owner and stays on their device.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, timeout: 60_000 });

  let res;
  try {
    res = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
      throw new SlipError('bad_key', 'API key ใช้ไม่ได้');
    if (e instanceof Anthropic.RateLimitError) throw new SlipError('rate', 'ใช้งานถี่เกินไป');
    if (e instanceof Anthropic.APIConnectionError) throw new SlipError('network', 'เชื่อมต่ออินเทอร์เน็ตไม่ได้');
    throw new SlipError('unreadable', e instanceof Error ? e.message : 'อ่านสลิปไม่สำเร็จ');
  }

  if (res.stop_reason === 'refusal') throw new SlipError('refused', 'อ่านรูปนี้ไม่ได้');
  const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
  try {
    return JSON.parse(text) as SlipResult;
  } catch {
    throw new SlipError('unreadable', 'อ่านผลลัพธ์ไม่ได้');
  }
}
