import { useState, useEffect } from 'react';
import type { EffectType } from '../data/schema';
import '../styles/effects.css';

interface Props {
  effect?: EffectType | string;
  children: React.ReactNode;
}

const EFFECT_DURATION: Record<string, number> = {
  shake: 600,
  glitch: 800,
  colorShift: 3000,
  fade: 2000,
  distortion: 1500,
};

export default function EffectLayer({ effect, children }: Props) {
  // key prop으로 리마운트되므로, effect를 초기값으로 직접 설정
  const [activeEffect, setActiveEffect] = useState<string | null>(effect ?? null);

  useEffect(() => {
    if (!activeEffect) return;
    const duration = EFFECT_DURATION[activeEffect] ?? 1000;
    const timer = setTimeout(() => setActiveEffect(null), duration);
    return () => clearTimeout(timer);
  }, [activeEffect]);

  return (
    <div
      className={activeEffect ? `effect-${activeEffect}` : ''}
      style={{ width: '100%', height: '100%' }}
    >
      {children}
    </div>
  );
}
