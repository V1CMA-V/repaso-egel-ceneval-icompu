import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import type { PomoSettings } from '@/lib/pomodoro';
import { chime, pomoSettings, setNotifications, updateSettings } from '@/lib/pomodoro-store';

const PRESETS: { label: string; hint: string; value: Pick<PomoSettings, 'focus' | 'short' | 'long'> }[] = [
  { label: '25 / 5', hint: 'Clásico', value: { focus: 25, short: 5, long: 15 } },
  { label: '50 / 10', hint: 'Lecciones largas', value: { focus: 50, short: 10, long: 20 } },
  { label: '90 / 15', hint: 'Ritmo de examen', value: { focus: 90, short: 15, long: 30 } },
];

function NumberField({ label, field, min, max, suffix }: { label: string; field: keyof PomoSettings; min: number; max: number; suffix: string }) {
  const s = useStore(pomoSettings);
  const value = s[field] as number;
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= min) updateSettings({ [field]: n });
          }}
          className="panel w-20 px-2 py-1 text-right tabular-nums"
        />
        <span className="w-10 text-xs text-[color:var(--muted)]">{suffix}</span>
      </span>
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 text-sm">
      <span>
        {label}
        {hint && <span className="block text-xs text-[color:var(--muted)]">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-accent" />
    </label>
  );
}

export default function PomodoroSettingsPanel() {
  const s = useStore(pomoSettings);
  const [mounted, setMounted] = useState(false);
  const [denied, setDenied] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="panel h-80" aria-hidden="true" />;

  const active = PRESETS.find((p) => p.value.focus === s.focus && p.value.short === s.short && p.value.long === s.long);

  return (
    <section className="panel space-y-5 p-5" aria-labelledby="pomo-settings">
      <h2 id="pomo-settings" className="font-display text-xl font-extrabold">
        Ajustes
      </h2>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[color:var(--muted)]">Ritmo</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => updateSettings(p.value)}
              aria-pressed={active === p}
              className={`rounded-lg border px-3 py-1.5 text-left text-xs ${
                active === p ? 'border-accent bg-accent/15 text-accent' : 'border-[color:var(--line)] hover:border-accent'
              }`}
            >
              <span className="block font-bold">{p.label}</span>
              <span className="text-[color:var(--muted)]">{p.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <NumberField label="Estudio" field="focus" min={1} max={180} suffix="min" />
        <NumberField label="Descanso corto" field="short" min={1} max={60} suffix="min" />
        <NumberField label="Descanso largo" field="long" min={1} max={90} suffix="min" />
        <NumberField label="Descanso largo cada" field="every" min={1} max={12} suffix="ciclos" />
        <NumberField label="Meta diaria" field="goal" min={1} max={24} suffix="🍅" />
        <p className="text-xs text-[color:var(--muted)]">Los cambios de tiempo se aplican desde el siguiente bloque.</p>
      </div>

      <div className="space-y-3 border-t border-[color:var(--line)] pt-4">
        <Toggle
          label="Sonido al terminar"
          checked={s.sound}
          onChange={(v) => {
            updateSettings({ sound: v });
            if (v) chime();
          }}
        />
        <Toggle
          label="Notificación del navegador"
          hint={denied ? 'El navegador bloqueó los permisos: actívalos en la configuración del sitio.' : 'Útil si estás en otra pestaña.'}
          checked={s.notify}
          onChange={async (v) => setDenied(v && !(await setNotifications(v)))}
        />
        <Toggle
          label="Iniciar el siguiente bloque automáticamente"
          hint="Si está apagado, al terminar un bloque espera a que lo inicies."
          checked={s.autoStart}
          onChange={(v) => updateSettings({ autoStart: v })}
        />
      </div>
    </section>
  );
}
