import { Pressable, View } from 'react-native';
import { Tx, catOf, fmtDay, money, timeOf } from './model';
import { CatIcon, Chip, Dashes, T } from './ui';
import type { Theme } from './theme';

export default function TxRow({ t, x, onPress, showDate, showTime, sample, divider }: {
  t: Theme; x: Tx; onPress: () => void; showDate?: boolean; showTime?: boolean; sample?: boolean; divider?: boolean;
}) {
  const c = catOf(x.cat);
  const sub = [showDate ? fmtDay(x.date) : null, sample ? 'ตัวอย่าง' : null].filter(Boolean).join(' · ');
  return (
    <>
    {divider && <Dashes />}
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, opacity: pressed ? 0.6 : 1 })}>
      {showTime && <T w="num" size={12} color={t.faint} style={{ width: 38 }}>{timeOf(x.createdAt)}</T>}
      <CatIcon cat={c} size={34} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T w="medium" size={14} lines={1} style={{ flexShrink: 1 }}>{x.note || c.name}</T>
          {!!x.ref && <Chip bg={t.accent} size={10} style={{ paddingHorizontal: 6, paddingVertical: 0 }}>สลิป</Chip>}
        </View>
        {!!sub && <T size={12} color={t.faint} lines={1}>{sub}</T>}
      </View>
      <T w="num" size={16} color={x.type === 'income' ? t.income : t.ink}>
        {x.type === 'income' ? '+' : '−'}{money(x.amount).replace('฿', '')}
      </T>
    </Pressable>
    </>
  );
}
