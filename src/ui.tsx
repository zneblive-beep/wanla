import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Category, fmtMonth } from './model';
import { FONT, Theme } from './theme';
import { haptic, ND, useLoop, useReducedMotion } from './motion';

export const Icon = MaterialCommunityIcons;
export const INK = '#161616';

type Weight = keyof typeof FONT;
export function T({ children, w = 'regular', size = 15, color = INK, style, lines }: {
  children: ReactNode; w?: Weight; size?: number; color?: string; style?: StyleProp<TextStyle>; lines?: number;
}) {
  const lh = w.startsWith('num') ? 1.15 : w.startsWith('head') ? 1.4 : 1.5;
  return (
    <Text numberOfLines={lines} style={[{ fontFamily: FONT[w], fontSize: size, color, lineHeight: Math.round(size * lh) }, style]}>
      {children}
    </Text>
  );
}

/** Card with a thick ink outline and a hard offset shadow, like a sticker on paper. Pressing pushes it into the shadow. */
export function Pop({ children, bg = '#FFFFFF', radius = 22, offset = 4, tilt = 0, onPress, style, wrap, label, disabled }: {
  children: ReactNode; bg?: string; radius?: number; offset?: number; tilt?: number; onPress?: () => void;
  style?: StyleProp<ViewStyle>; wrap?: StyleProp<ViewStyle>; label?: string; disabled?: boolean;
}) {
  const outer: StyleProp<ViewStyle> = [{ marginRight: offset, marginBottom: offset, transform: tilt ? [{ rotate: `${tilt}deg` }] : undefined }, wrap];
  const shadow = <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: offset, left: offset, right: -offset, bottom: -offset, borderRadius: radius, backgroundColor: INK }]} />;
  const face = (pressed: boolean): StyleProp<ViewStyle> => [{ borderWidth: 2, borderColor: INK, borderRadius: radius, backgroundColor: bg, overflow: 'hidden' },
    pressed && { transform: [{ translateX: offset - 1 }, { translateY: offset - 1 }] }, style];
  if (!onPress) return <View style={outer}>{shadow}<View style={face(false)}>{children}</View></View>;
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={outer}>
      {({ pressed }) => <>{shadow}<View style={face(pressed)}>{children}</View></>}
    </Pressable>
  );
}

export function Chip({ children, bg = '#FFFFFF', tilt = 0, onPress, color = INK, size = 13, style }: {
  children: ReactNode; bg?: string; tilt?: number; onPress?: () => void; color?: string; size?: number; style?: StyleProp<ViewStyle>;
}) {
  const body = (
    <View style={[st.chip, { backgroundColor: bg, transform: tilt ? [{ rotate: `${tilt}deg` }] : undefined }, style]}>
      {typeof children === 'string' ? <T w="semi" size={size} color={color}>{children}</T> : children}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} hitSlop={4}>{({ pressed }) => <View style={{ opacity: pressed ? 0.7 : 1 }}>{body}</View>}</Pressable> : body;
}

export function CatIcon({ cat, size = 40 }: { cat: Category; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: cat.color, borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={cat.icon} size={size * 0.5} color={INK} />
    </View>
  );
}

export function RoundBtn({ icon, onPress, label, bg = '#FFFFFF', color = INK, size = 42 }: {
  icon: React.ComponentProps<typeof Icon>['name']; onPress: () => void; label: string; bg?: string; color?: string; size?: number;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: INK, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <Icon name={icon} size={size * 0.5} color={color} />
    </Pressable>
  );
}

export type Mood = 'happy' | 'wink' | 'worried' | 'shock' | 'cool';

/** น้องเหรียญ, the coin mascot. Its face follows how the day's budget is going. */
export function Coin({ size = 60, mood = 'happy', tilt = 0, alive = true }: { size?: number; mood?: Mood; tilt?: number; alive?: boolean }) {
  const reduced = useReducedMotion();
  const live = alive && !reduced;
  // Blink every few seconds.
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!live) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => { t = setTimeout(() => { setBlink(true); t = setTimeout(() => { setBlink(false); next(); }, 140); }, 2600 + Math.random() * 2600); };
    next();
    return () => clearTimeout(t);
  }, [live]);
  // Gentle sway while idle.
  const sway = useLoop(3200, live);
  // Jump when tapped, bounce when the mood changes.
  const jump = useState(() => new Animated.Value(0))[0];
  const hop = (big: boolean) => {
    if (!live) return;
    jump.setValue(0);
    Animated.sequence([
      Animated.timing(jump, { toValue: 1, duration: big ? 180 : 140, useNativeDriver: ND }),
      Animated.spring(jump, { toValue: 0, friction: 3.5, tension: 140, useNativeDriver: ND }),
    ]).start();
  };
  const firstMood = useRef(true);
  useEffect(() => { if (firstMood.current) { firstMood.current = false; return; } hop(true); }, [mood]); // eslint-disable-line react-hooks/exhaustive-deps
  const rotate = sway.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [tilt, tilt + 5, tilt, tilt - 5, tilt].map((d) => `${d}deg`) });
  const translateY = jump.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.28] });
  const scale = jump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const closed = blink && (mood === 'happy' || mood === 'worried');
  const eyes = closed ? <Path d="M20 30h8M36 30h8" stroke={INK} strokeWidth={2.5} strokeLinecap="round" /> : {
    happy: <><Circle cx={24} cy={29} r={3} fill={INK} /><Circle cx={40} cy={29} r={3} fill={INK} /></>,
    wink: <><Path d="M20 29q4-4 8 0" stroke={INK} strokeWidth={2.5} strokeLinecap="round" fill="none" /><Circle cx={40} cy={29} r={3} fill={INK} /></>,
    worried: <><Circle cx={24} cy={30} r={3} fill={INK} /><Circle cx={40} cy={30} r={3} fill={INK} /><Path d="M19 23l8 3M45 23l-8 3" stroke={INK} strokeWidth={2.5} strokeLinecap="round" /></>,
    shock: <><Circle cx={24} cy={28} r={4.5} fill="#FFF" stroke={INK} strokeWidth={2} /><Circle cx={40} cy={28} r={4.5} fill="#FFF" stroke={INK} strokeWidth={2} /><Circle cx={24} cy={28} r={1.8} fill={INK} /><Circle cx={40} cy={28} r={1.8} fill={INK} /></>,
    cool: <><Rect x={16} y={24} width={14} height={9} rx={4} fill={INK} /><Rect x={34} y={24} width={14} height={9} rx={4} fill={INK} /><Path d="M30 27h4" stroke={INK} strokeWidth={2.5} /></>,
  }[mood];
  const mouth = {
    happy: <Path d="M24 38q8 7 16 0" stroke={INK} strokeWidth={2.5} strokeLinecap="round" fill="none" />,
    wink: <Path d="M24 38q8 7 16 0" stroke={INK} strokeWidth={2.5} strokeLinecap="round" fill="none" />,
    worried: <Path d="M25 42q7-5 14 0" stroke={INK} strokeWidth={2.5} strokeLinecap="round" fill="none" />,
    shock: <Ellipse cx={32} cy={41} rx={4} ry={5} fill={INK} />,
    cool: <Path d="M26 39q6 5 12 0" stroke={INK} strokeWidth={2.5} strokeLinecap="round" fill="none" />,
  }[mood];
  return (
    <Pressable onPress={() => { haptic.tap(); hop(false); }} accessibilityLabel="น้องเหรียญ" hitSlop={6}>
    <Animated.View style={{ transform: [{ translateY }, { rotate: live ? rotate : `${tilt}deg` }, { scale }] }}>
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Circle cx={32} cy={32} r={28} fill="#FFD23F" stroke={INK} strokeWidth={2.5} />
        <Circle cx={32} cy={32} r={21} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="3 4" />
        {eyes}{mouth}
        <Ellipse cx={17} cy={37} rx={3.5} ry={2} fill="#FF8A6B" />
        <Ellipse cx={47} cy={37} rx={3.5} ry={2} fill="#FF8A6B" />
      </Svg>
    </Animated.View>
    </Pressable>
  );
}

export function Bubble({ children, side = 'right' }: { children: ReactNode; side?: 'left' | 'right' }) {
  return (
    <View style={[st.bubble, side === 'right' ? { borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }]}>
      {typeof children === 'string' ? <T size={13}>{children}</T> : children}
    </View>
  );
}

export function Dashes({ color = '#D9D1BE', style }: { color?: string; style?: StyleProp<ViewStyle> }) {
  return <View style={style}><Svg width="100%" height={2}><Line x1="0" y1="1" x2="100%" y2="1" stroke={color} strokeWidth={2} strokeDasharray="6 5" /></Svg></View>;
}

/** Torn receipt edge for the bottom of a white card. */
export function Zigzag({ color = '#FFFFFF', width = 400 }: { color?: string; width?: number }) {
  const n = Math.ceil(width / 16);
  const pts = ['0,0'];
  for (let i = 0; i < n; i++) pts.push(`${i * 16 + 8},9`, `${(i + 1) * 16},0`);
  return (
    <Svg width="100%" height={9} viewBox={`0 0 ${n * 16} 9`} preserveAspectRatio="none">
      <Polygon points={pts.join(' ')} fill={color} />
    </Svg>
  );
}

export function MonthSwitch({ view, onShift }: { t?: Theme; view: Date; onShift: (n: number) => void }) {
  return (
    <View style={st.month}>
      <Pressable onPress={() => onShift(-1)} hitSlop={10} accessibilityLabel="เดือนก่อน"><Icon name="chevron-left" size={22} color={INK} /></Pressable>
      <T w="semi" size={14} style={{ minWidth: 104, textAlign: 'center' }}>{fmtMonth(view)}</T>
      <Pressable onPress={() => onShift(1)} hitSlop={10} accessibilityLabel="เดือนถัดไป"><Icon name="chevron-right" size={22} color={INK} /></Pressable>
    </View>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View>
      {!!sub && <T size={13} color="#5E5A52">{sub}</T>}
      <T w="head" size={26}>{children}</T>
    </View>
  );
}

const st = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: INK, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4, alignSelf: 'flex-start' },
  bubble: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: INK, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, flexShrink: 1 },
  month: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: INK, backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 3 },
});
