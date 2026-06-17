// ============================================================
// Componentes reutilizáveis de interface
// ============================================================
import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#fdfcf7] border border-stone-300/80 rounded-lg p-4 shadow-sm ${className}`}>{children}</div>;
}

export function SectionTitle({ step, title, subtitle }: { step: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold tracking-wide text-stone-500 uppercase hand">Etapa {step}</div>
      <h2 className="text-3xl font-bold text-stone-800 hand2 leading-tight">{title}</h2>
      {subtitle && <p className="text-sm text-stone-500 mt-1 max-w-3xl">{subtitle}</p>}
    </div>
  );
}

/** Caixa de ajuda contextual (conceitos do SCA) — nota de margem. */
export function Help({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#f7f3e6] border border-dashed border-stone-400 text-stone-700 text-sm rounded-md p-3 mb-4 leading-relaxed">
      <span className="font-semibold">Como o SCA entende esta etapa: </span>
      {children}
    </div>
  );
}

export function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50 border border-amber-300 text-amber-900 text-sm rounded-md p-3 mb-4">{children}</div>
  );
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  disabled,
  title,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
}) {
  const styles: Record<string, string> = {
    primary: 'bg-stone-800 text-amber-50 hover:bg-stone-900 disabled:bg-stone-300',
    secondary: 'bg-[#fdfcf7] border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:text-stone-300',
    danger: 'bg-[#fdfcf7] border border-red-300 text-red-600 hover:bg-red-50',
    ghost: 'text-stone-700 hover:bg-stone-100',
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-0.5">{hint}</span>}
    </label>
  );
}

const inputCls =
  'w-full border border-slate-300 rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputCls + ' ' + (props.className ?? '')} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputCls + ' ' + (props.className ?? '')} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputCls + ' bg-white ' + (props.className ?? '')} />;
}

export function Badge({
  children,
  color = 'slate',
}: {
  children: React.ReactNode;
  color?: 'slate' | 'green' | 'red' | 'amber' | 'indigo' | 'blue';
}) {
  const map: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-800',
    indigo: 'bg-indigo-100 text-indigo-800',
    blue: 'bg-blue-100 text-blue-800',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${map[color]}`}>{children}</span>;
}

/** Seletor 1–5 (critérios de priorização, criticidade, impacto...). */
export function Scale15({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`w-7 h-7 rounded text-xs font-semibold border ${
            n <= value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-300'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-slate-400 italic py-6 text-center">{children}</div>;
}

export function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left text-xs font-semibold text-slate-500 uppercase px-2 py-1.5 border-b border-slate-200">{children}</th>;
}

export function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-1.5 border-b border-slate-100 text-sm align-top ${className}`}>{children}</td>;
}
