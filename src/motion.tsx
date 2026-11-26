import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

// Native driver isn't available on web; there the JS driver is used instead.
export const ND = Platform.OS !== 'web';

let reduced = false;
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { reduced = v; }).catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => { reduced = v; });

/** True when the phone's "reduce motion" setting is on; every animation here then jumps straight to its end. */
export function useReducedMotion() {
  const [r, setR] = useState(reduced);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setR).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setR);
    return () => sub?.remove();
  }, []);
  return r;
}

export const haptic = {
  tap: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  success: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  warn: () => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
};

/** A number that rolls from its previous value (or from `from` on first show) to `value`. */
export function useCountUp(value: number, { duration = 600, from }: { duration?: number; from?: number } = {}) {
  const r = useReducedMotion();
  const [shown, setShown] = useState(from ?? value);
  // Where the roll starts: whatever is on screen right now. Kept in a ref so the effect doesn't restart every frame.
  const current = useRef(from ?? value);
  useEffect(() => { current.current = shown; }, [shown]);
  useEffect(() => {
    if (r) return;
    const start = current.current;
    if (start === value) return;
    const t0 = Date.now();
    let raf = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + (value - start) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // If frames are paused (app in background, hidden web view), still land on the right number.
    const land = setTimeout(() => setShown(value), duration + 100);
    return () => { cancelAnimationFrame(raf); clearTimeout(land); };
  }, [value, r, duration]);
  return r ? value : shown;
}

/** Slides and fades a child in when it mounts. `fresh` = false shows it without animating. */
export function Enter({ children, fresh = true, delay = 0, from = 14, style }: { children: ReactNode; fresh?: boolean; delay?: number; from?: number; style?: StyleProp<ViewStyle> }) {
  const r = useReducedMotion();
  const play = fresh && !r;
  const v = useState(() => new Animated.Value(play ? 0 : 1))[0];
  useEffect(() => {
    if (!play) return;
    Animated.spring(v, { toValue: 1, delay, useNativeDriver: ND, friction: 7, tension: 80 }).start();
  }, [play, v, delay]);
  return (
    <Animated.View style={[style, { opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }), transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Gives a quick springy "pop" whenever `trigger` changes. */
export function Pulse({ trigger, children, amount = 0.12, style }: { trigger: unknown; children: ReactNode; amount?: number; style?: StyleProp<ViewStyle> }) {
  const r = useReducedMotion();
  const v = useState(() => new Animated.Value(1))[0];
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (r) return;
    v.setValue(1 + amount);
    Animated.spring(v, { toValue: 1, friction: 4, tension: 160, useNativeDriver: ND }).start();
  }, [trigger, r, v, amount]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

/** Shakes its child once whenever `trigger` becomes true. */
export function Shake({ when, children, style }: { when: boolean; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const r = useReducedMotion();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!when || r) return;
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 520, easing: Easing.linear, useNativeDriver: ND, delay: 250 }).start();
  }, [when, r, v]);
  const rotate = v.interpolate({ inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1], outputRange: ['0deg', '-6deg', '5deg', '-4deg', '3deg', '-1deg', '0deg'] });
  return <Animated.View style={[style, { transform: [{ rotate }] }]}>{children}</Animated.View>;
}

/** A looping 0→1 value, for idle motion like waves and scan lines. Stops when reduce motion is on. */
export function useLoop(duration: number, run = true) {
  const r = useReducedMotion();
  const v = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (r || !run) { v.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: ND }));
    loop.start();
    return () => loop.stop();
  }, [r, run, v, duration]);
  return v;
}
