// ============================================================
// Modo COMPARING — etapas 9 a 11 (+11.1): áreas de comparação,
// avaliação relativa (com tabela manuscrita de comparações) e
// gráfico interativo de vantagem comparativa (arrastável)
// ============================================================
import React, { useMemo, useRef, useState } from 'react';
import { useProject } from '../store';
import { applyShortlist, generateSchemes, getAssessment, uid } from '../lib/sca';
import { ComparisonArea, DecisionScheme, Direction, EvalType, Project } from '../types';
import { Badge, Btn, Card, EmptyState, Field, Help, Scale15, SectionTitle, Select, TextInput, Td, Th, Warn } from '../components/ui';
import { sketchLine } from '../components/graphs';
import { useDesign } from '../design';

const EVAL_TYPES: { v: EvalType; l: string }[] = [
  { v: 'numerica', l: 'Numérica' },
  { v: 'monetaria', l: 'Monetária' },
  { v: 'ordinal', l: 'Ordinal' },
  { v: 'linguistica', l: 'Linguística' },
  { v: 'qualitativa', l: 'Qualitativa' },
  { v: 'mista', l: 'Mista' },
];

// ---------------- Etapa 9 — Áreas de comparação ----------------
export function Step10ComparisonAreas() {
  const { project, update } = useProject();
  const [label, setLabel] = useState('');
  const [desc, setDesc] = useState('');
  const [evalType, setEvalType] = useState<EvalType>('qualitativa');
  const [group, setGroup] = useState('');
  const [err, setErr] = useState('');

  function add() {
    const lab = label.trim();
    if (!lab) return setErr('O rótulo é obrigatório.');
    if (!desc.trim()) return setErr('A descrição completa é obrigatória — ela define o que está sendo comparado.');
    update((p) =>
      void p.comparisonAreas.push({
        id: uid(),
        label: (lab.endsWith(':') ? lab : lab + ':').toUpperCase(), // convenção do SCA
        description: desc.trim(),
        evalType,
        group: group.trim(),
      }),
    );
    setLabel(''); setDesc(''); setGroup(''); setErr('');
  }

  const groups = [...new Set(project.comparisonAreas.map((c) => c.group).filter(Boolean))];

  return (
    <div>
      <SectionTitle step="9" title="Formular áreas de comparação" subtitle="Campos de preocupação usados para comparar as consequências dos esquemas de decisão." />
      <Help>
        por convenção, o rótulo termina com “:” (CAPITAL:, INCOME:, JOBS:, RESIDENTS:) — distinguindo-o das áreas de
        decisão, que terminam com “?”. Uma área de comparação <em>não precisa ser numérica</em>. Para manter o número
        administrável, áreas podem ser agrupadas (ex.: CAPITAL: + INCOME: → FINANÇAS:).
      </Help>
      <Card className="mb-4">
        <div className="grid md:grid-cols-5 gap-3 items-end">
          <Field label='Rótulo curto (termina com ":")'><TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="CAPITAL:" /></Field>
          <Field label="Descrição completa"><TextInput value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Diferenças no desembolso de capital com obras e aquisições" /></Field>
          <Field label="Tipo de avaliação">
            <Select value={evalType} onChange={(e) => setEvalType(e.target.value as EvalType)}>
              {EVAL_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </Select>
          </Field>
          <Field label="Grupo (opcional)" hint="Ex.: FINANÇAS:"><TextInput value={group} onChange={(e) => setGroup(e.target.value)} /></Field>
          <div className="mb-3"><Btn onClick={add}>Adicionar</Btn></div>
        </div>
        {err && <Warn>{err}</Warn>}
      </Card>
      {project.comparisonAreas.length === 0 ? (
        <EmptyState>Nenhuma área de comparação criada. Sem elas não é possível avaliar consequências.</EmptyState>
      ) : (
        <Card>
          <table className="w-full">
            <thead><tr><Th>Rótulo</Th><Th>Descrição</Th><Th>Tipo</Th><Th>Grupo</Th><Th></Th></tr></thead>
            <tbody>
              {project.comparisonAreas.map((c) => (
                <tr key={c.id}>
                  <Td className="font-bold whitespace-nowrap">{c.label}</Td>
                  <Td>{c.description}</Td>
                  <Td><Badge>{EVAL_TYPES.find((t) => t.v === c.evalType)?.l}</Badge></Td>
                  <Td>
                    <Select
                      value={c.group}
                      onChange={(e) => update((p) => { const x = p.comparisonAreas.find((y) => y.id === c.id); if (x) x.group = e.target.value; })}
                      className="!w-auto"
                    >
                      <option value="">—</option>
                      {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                    </Select>
                  </Td>
                  <Td><Btn variant="danger" onClick={() => update((p) => {
                    p.comparisonAreas = p.comparisonAreas.filter((x) => x.id !== c.id);
                    p.assessments = p.assessments.filter((a) => a.comparisonAreaId !== c.id);
                    p.judgments = p.judgments.filter((j) => j.comparisonAreaId !== c.id);
                  })}>Excluir</Btn></Td>
                </tr>
              ))}
            </tbody>
          </table>
          {groups.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">Grupos em uso: {groups.join(', ')}. Para criar um grupo novo, digite-o no formulário acima ao adicionar uma área.</p>
          )}
        </Card>
      )}
    </div>
  );
}

// ---------------- Etapa 10 — Avaliação relativa ----------------
const DIRECTIONS: { v: Direction; l: string; word: string }[] = [
  { v: 'vantagem', l: 'Melhora em relação à base', word: 'melhora' },
  { v: 'desvantagem', l: 'Piora em relação à base', word: 'piora' },
  { v: 'neutra', l: 'Sem mudança relevante', word: 'sem mudança' },
  { v: 'incerta', l: 'Direção incerta', word: 'incerto' },
];

/**
 * Tabela manuscrita de comparações (estilo do diagrama clássico).
 * Todas as linhas compartilham as MESMAS colunas de grade — assim os
 * traços verticais ficam perfeitamente alinhados, qualquer que seja
 * o tamanho dos rótulos. Reutilizada no relatório em PDF.
 */
export function HandComparisonTable({ project, base, schemes }: { project: Project; base: DecisionScheme; schemes: DecisionScheme[] }) {
  const focusAreas = project.areas.filter((a) => project.focusIds.includes(a.id));
  const compAreas = project.comparisonAreas;
  const optOf = (s: DecisionScheme, areaId: string) =>
    project.options.find((o) => o.areaId === areaId && s.optionIds.includes(o.id));
  const short = (s: DecisionScheme) => s.name.replace('Esquema ', '');

  const evaluated = schemes.filter((s) => project.assessments.some((a) => a.schemeKey === s.key));
  if (evaluated.length === 0) return null;

  const sep = 'border-l-2 border-stone-400/70 pl-4';
  // colunas fixas e compartilhadas: N áreas + esquema + comparações
  const grid = { gridTemplateColumns: `repeat(${focusAreas.length}, minmax(5.5rem, auto)) 8.5rem minmax(0, 1fr)` };

  const OptionCells = ({ s, arrows }: { s: DecisionScheme; arrows?: boolean }) => (
    <>
      {focusAreas.map((a) => {
        const o = optOf(s, a.id);
        const changed = o && !base.optionIds.includes(o.id);
        return (
          <div key={s.key + a.id} className="text-center px-1 self-center py-2">
            {arrows && <div className="text-xl leading-none h-6 text-stone-800">{changed ? '↓' : ''}</div>}
            <span className="text-xl font-bold text-stone-900 uppercase whitespace-nowrap">{o?.label ?? '?'}</span>
          </div>
        );
      })}
    </>
  );

  return (
    <Card className="hand bg-[#fbfaf6] px-6 py-5 mt-4 overflow-x-auto">
      <div className="grid" style={grid}>
        {/* cabeçalho — mesmas colunas do corpo, traços sempre alinhados */}
        {focusAreas.map((a) => (
          <div key={'h' + a.id} className="text-center text-base font-bold uppercase text-stone-800 border-b-2 border-stone-400/70 pb-1">
            {a.label}
          </div>
        ))}
        <div className={`text-base font-bold uppercase text-stone-800 border-b-2 border-stone-400/70 pb-1 ${sep}`}>Esquema</div>
        <div className={`text-base font-bold uppercase text-stone-800 border-b-2 border-stone-400/70 pb-1 ${sep}`}>
          Comparações <span className="font-normal normal-case text-stone-500 text-sm">(área : avaliação relativa)</span>
        </div>

        {/* linha de base */}
        <OptionCells s={base} />
        <div className={`self-center py-2 text-xl font-bold text-stone-900 whitespace-nowrap ${sep}`}>{base.name}</div>
        <div className={`self-center py-2 text-xl text-stone-700 ${sep}`}>
          {short(base)} = <u>linha de base</u> para comparação
        </div>

        {/* comparações */}
        {evaluated.map((s, idx) => (
          <React.Fragment key={s.key}>
            <div style={{ gridColumn: '1 / -1' }} className="border-t border-dashed border-stone-300 pt-2 text-lg text-stone-600 underline">
              {idx + 1}ª comparação: {short(s)} vs {short(base)}
            </div>
            <OptionCells s={s} arrows />
            <div className={`self-center py-2 text-xl font-bold text-stone-900 whitespace-nowrap ${sep}`}>{s.name}</div>
            <div className={`py-2 ${sep}`}>
              <div className="text-base text-stone-500 underline mb-1">
                avaliações de {short(s)} em relação a {short(base)}:
              </div>
              {compAreas.map((c) => {
                const a = getAssessment(project.assessments, s.key, c.id);
                if (!a) return (
                  <div key={c.id} className="text-lg text-stone-300">
                    <span className="font-bold uppercase text-stone-400">{c.label}</span> — ainda não avaliado
                  </div>
                );
                const dir = DIRECTIONS.find((d) => d.v === a.direction);
                return (
                  <div key={c.id} className="text-xl text-stone-800 leading-snug">
                    <span className="font-bold uppercase">{c.label}</span> {a.value || '—'}
                    {dir && <> · <u>{dir.word}</u></>}
                    {a.confidence > 0 && <span className="text-stone-400 text-base"> (confiança {a.confidence}/5)</span>}
                    {a.note && <span className="text-stone-500 text-base"> — {a.note}</span>}
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        ))}
      </div>
      <p className="text-sm text-stone-500 mt-2 font-sans">[ ↓ indica mudança de opção em relação à linha de base ]</p>
    </Card>
  );
}

export function Step11Assessment() {
  const { project, update } = useProject();
  const gen = useMemo(() => generateSchemes(project), [project]);
  const base = gen.schemes.find((s) => s.key === project.baseSchemeKey);
  const others = gen.schemes.filter((s) => s.key !== project.baseSchemeKey);
  const [selScheme, setSelScheme] = useState('');
  const scheme = others.find((s) => s.key === selScheme);
  const optById = Object.fromEntries(project.options.map((o) => [o.id, o]));

  function setField(schemeKey: string, areaId: string, patch: Partial<{ direction: Direction; value: string; note: string; confidence: number }>) {
    update((p) => {
      let a = getAssessment(p.assessments, schemeKey, areaId);
      if (!a) {
        a = { id: uid(), schemeKey, comparisonAreaId: areaId, direction: 'incerta', value: '', note: '', confidence: 3 };
        p.assessments.push(a);
      }
      Object.assign(a, patch);
    });
  }

  return (
    <div>
      <SectionTitle step="10" title="Avaliar consequências nas áreas de comparação" subtitle="Escolha a linha de base e avalie cada esquema EM RELAÇÃO a ela, área por área." />
      <Help>
        a pergunta não é “quanto custa o Esquema B?”, mas <strong>“o que muda se escolhermos B em vez da base?”</strong>.
        As avaliações de consequências futuras são conjecturais; aceite formatos diferentes por área: montantes fixos,
        fluxos anuais, número de empregos ou descrições puramente linguísticas. A tabela abaixo registra o quadro completo,
        no estilo do diagrama clássico do SCA.
      </Help>
      {!gen.ok ? <Warn>{gen.error}</Warn>
        : gen.schemes.length === 0 ? <Warn>Nenhum esquema viável (etapa 8).</Warn>
        : project.comparisonAreas.length === 0 ? <Warn>Crie áreas de comparação na etapa 9.</Warn>
        : (
        <>
          {/* escolha da linha de base (agora aqui, na etapa 10) */}
          <Card className="mb-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Esquema-base (linha de base para comparação)">
                <Select value={project.baseSchemeKey ?? ''} onChange={(e) => update((p) => void (p.baseSchemeKey = e.target.value || null))}>
                  <option value="">— escolher —</option>
                  {gen.schemes.map((s) => <option key={s.key} value={s.key}>{s.name} ({s.optionIds.map((id) => optById[id]?.label).join(' + ')})</option>)}
                </Select>
              </Field>
              {base && (
                <Field label="Esquema a avaliar (em relação à base)">
                  <Select value={selScheme} onChange={(e) => setSelScheme(e.target.value)}>
                    <option value="">— selecione —</option>
                    {others.map((s) => {
                      const done = project.comparisonAreas.filter((c) => getAssessment(project.assessments, s.key, c.id)).length;
                      return <option key={s.key} value={s.key}>{s.name} ({done}/{project.comparisonAreas.length} áreas avaliadas)</option>;
                    })}
                  </Select>
                </Field>
              )}
            </div>
          </Card>

          {!base ? (
            <Warn>Escolha o esquema-base acima para iniciar as comparações.</Warn>
          ) : (
            <>
              {scheme && (
                <div className="space-y-4 mb-2">
                  <div className="text-sm text-slate-600">
                    <strong>{scheme.name}</strong>: {scheme.optionIds.map((id) => optById[id]?.label).join(' + ')} — difere da base em{' '}
                    {scheme.optionIds.filter((id) => !base.optionIds.includes(id)).map((id) => optById[id]?.label).join(', ') || 'nada'}
                  </div>
                  {project.comparisonAreas.map((c) => {
                    const a = getAssessment(project.assessments, scheme.key, c.id);
                    return (
                      <Card key={c.id}>
                        <div className="font-bold text-indigo-700 text-sm mb-1">{c.label} <span className="font-normal text-slate-500">— {c.description}</span></div>
                        <div className="grid md:grid-cols-4 gap-3 items-start">
                          <Field label="Direção da consequência">
                            <Select value={a?.direction ?? ''} onChange={(e) => setField(scheme.key, c.id, { direction: e.target.value as Direction })}>
                              <option value="">— julgar —</option>
                              {DIRECTIONS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                            </Select>
                          </Field>
                          <Field label="Valor / intervalo / descrição" hint="Ex.: cerca de 250k a menos; 100–200 empregos a menos; 'mais confiança'">
                            <TextInput value={a?.value ?? ''} onChange={(e) => setField(scheme.key, c.id, { value: e.target.value })} />
                          </Field>
                          <Field label="Observação">
                            <TextInput value={a?.note ?? ''} onChange={(e) => setField(scheme.key, c.id, { note: e.target.value })} />
                          </Field>
                          <Field label="Confiança (1 = muito incerto, 5 = confiante)">
                            <Scale15 value={a?.confidence ?? 0} onChange={(v) => setField(scheme.key, c.id, { confidence: v })} />
                          </Field>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
              {/* quadro manuscrito com TODAS as comparações já avaliadas */}
              <HandComparisonTable project={project} base={base} schemes={others} />
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- Etapa 11 — Vantagem comparativa (+11.1) ----------------

/**
 * Gráfico interativo de comparação de vantagens, fiel ao diagrama
 * clássico do SCA: colunas tracejadas de intensidade, faixa central
 * hachurada (negligenciável), uma linha por área de comparação com
 * ⟷ = intervalo de crença e ◇ = melhor estimativa.
 * EDIÇÃO DIRETA: arraste as pontas da seta ou o losango.
 * Com readOnly, vira uma visualização estática (usada no PDF).
 */
export function AdvantageChart({
  baseName,
  otherName,
  areas,
  getJ,
  onSet,
  readOnly,
}: {
  baseName: string;
  otherName: string;
  areas: ComparisonArea[];
  getJ: (areaId: string) => { min: number; max: number; best: number };
  onSet: (areaId: string, patch: { min?: number; max?: number; best?: number }) => void;
  readOnly?: boolean;
}) {
  const W = 900;
  const GUTTER = 118; // rótulos das áreas dos dois lados, como no diagrama
  const plotW = W - 2 * GUTTER;
  const rowH = 52;
  const top = 96;
  const H = top + areas.length * rowH + 30;
  const x = (v: number) => GUTTER + ((v + 6) / 12) * plotW;
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ areaId: string; handle: 'min' | 'max' | 'best' } | null>(null);
  const clean = useDesign() === 'cientifico';

  function valFromEvent(e: React.PointerEvent): number {
    const svg = svgRef.current;
    if (!svg) return 0;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    return Math.max(-6, Math.min(6, Math.round(((px - GUTTER) / plotW) * 12 - 6)));
  }

  function apply(areaId: string, handle: 'min' | 'max' | 'best', v: number) {
    const j = getJ(areaId);
    if (handle === 'min') {
      const min = Math.min(v, j.max);
      onSet(areaId, { min, best: Math.min(Math.max(j.best, min), j.max) });
    } else if (handle === 'max') {
      const max = Math.max(v, j.min);
      onSet(areaId, { max, best: Math.max(Math.min(j.best, max), j.min) });
    } else {
      onSet(areaId, { best: Math.max(j.min, Math.min(j.max, v)) });
    }
  }

  function startDrag(areaId: string, e: React.PointerEvent) {
    const v = valFromEvent(e);
    const j = getJ(areaId);
    // escolhe a alça mais próxima do clique (◇ tem prioridade no empate)
    let handle: 'min' | 'max' | 'best' = 'best';
    const dBest = Math.abs(v - j.best);
    const dMin = Math.abs(v - j.min);
    const dMax = Math.abs(v - j.max);
    if (v < j.min || (dMin < dBest && dMin <= dMax)) handle = 'min';
    else if (v > j.max || (dMax < dBest && dMax < dMin)) handle = 'max';
    setDrag({ areaId, handle });
    apply(areaId, handle, v);
  }

  const COLS: [number, string][] = [
    [-6, 'extrema'], [-5, 'considerável'], [-4, 'significativa'], [-3, 'insignificante'], [-2, 'marginal'],
    [2, 'marginal'], [3, 'insignificante'], [4, 'significativa'], [5, 'considerável'], [6, 'extrema'],
  ];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full ${clean ? 'bg-white border-stone-400' : 'bg-[#fbfaf6] border-stone-300'} border rounded-lg select-none touch-none hand`}
      onPointerMove={(e) => drag && apply(drag.areaId, drag.handle, valFromEvent(e))}
      onPointerUp={() => setDrag(null)}
      onPointerLeave={() => setDrag(null)}
    >
      <defs>
        {/* hachura da faixa central (negligenciável) */}
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse">
          <line x1="0" y1="3" x2="6" y2="3" stroke="#9ca3af" strokeWidth="1" />
        </pattern>
      </defs>

      {/* título e setas, como no diagrama clássico */}
      <text x={W / 2} y={26} textAnchor="middle" fontSize={19} fontWeight={700} fill="#1f2937" textDecoration="underline">
        COMPARAÇÃO DE VANTAGENS {otherName.replace('Esquema ', '')} vs {baseName.replace('Esquema ', '')}
      </text>
      <text x={10} y={30} textAnchor="start" fontSize={14} fontWeight={700} fill="#1f2937">
        ⇐ VANTAGEM PARA {baseName.replace('Esquema ', '')}
      </text>
      <text x={W - 10} y={30} textAnchor="end" fontSize={14} fontWeight={700} fill="#1f2937">
        VANTAGEM PARA {otherName.replace('Esquema ', '')} ⇒
      </text>

      {/* faixa central hachurada */}
      <rect x={x(-0.65)} y={top - 22} width={x(0.65) - x(-0.65)} height={H - top + 4} fill="url(#hatch)" opacity={0.8} />
      <text x={x(0)} y={top - 28} textAnchor="middle" fontSize={13} fill="#374151">negligenciável</text>

      {/* colunas tracejadas com rótulos de intensidade */}
      {COLS.map(([v, label]) => (
        <g key={v}>
          <path d={sketchLine(x(v), top - 22, x(v), H - 16, 'col' + v, clean)} fill="none" stroke="#6b7280" strokeWidth={1} strokeDasharray="6 6" opacity={0.7} />
          <text x={x(v)} y={Math.abs(v) % 2 === 0 ? top - 44 : top - 28} textAnchor="middle" fontSize={12.5} fill="#374151">
            {label}
          </text>
        </g>
      ))}

      {/* linhas das áreas de comparação */}
      {areas.map((c, i) => {
        const y = top + i * rowH + rowH / 2;
        const j = getJ(c.id);
        const x1 = x(j.min);
        const x2 = x(j.max);
        const xb = x(j.best);
        return (
          <g key={c.id}>
            <text x={10} y={y + 5} fontSize={15} fontWeight={700} fill="#1f2937">{c.label}</text>
            <text x={W - 10} y={y + 5} textAnchor="end" fontSize={15} fontWeight={700} fill="#1f2937">{c.label}</text>
            {/* intervalo de crença ⟷ */}
            {x2 - x1 > 1 && (
              <g stroke="#1f2937" strokeWidth={2} strokeLinecap="round">
                <path d={sketchLine(x1, y, x2, y, c.id + 'rng', clean)} fill="none" />
                <line x1={x1} y1={y} x2={x1 + 8} y2={y - 5} />
                <line x1={x1} y1={y} x2={x1 + 8} y2={y + 5} />
                <line x1={x2} y1={y} x2={x2 - 8} y2={y - 5} />
                <line x1={x2} y1={y} x2={x2 - 8} y2={y + 5} />
              </g>
            )}
            {/* melhor estimativa ◇ */}
            <path
              d={`M ${xb} ${y - 7} L ${xb + 7} ${y} L ${xb} ${y + 7} L ${xb - 7} ${y} Z`}
              fill={clean ? '#fff' : '#fbfaf6'}
              stroke="#1f2937"
              strokeWidth={2}
            >
              <title>melhor estimativa</title>
            </path>
            {/* zona clicável/arrastável da linha inteira (não no PDF) */}
            {!readOnly && (
              <rect
                x={GUTTER - 10}
                y={y - rowH / 2}
                width={plotW + 20}
                height={rowH}
                fill="transparent"
                className="cursor-ew-resize"
                onPointerDown={(e) => { e.stopPropagation(); startDrag(c.id, e); }}
              />
            )}
          </g>
        );
      })}

      <text x={10} y={H - 6} fontSize={12.5} fill="#64748b">
        {readOnly
          ? '[ ⟷ = intervalo de crença sobre a vantagem comparativa · ◇ = melhor estimativa ]'
          : '[ ⟷ = intervalo de crença sobre a vantagem comparativa · ◇ = melhor estimativa · ARRASTE as pontas ou o losango para julgar ]'}
      </text>
    </svg>
  );
}

export function Step12Advantage() {
  const { project, update } = useProject();
  const gen = useMemo(() => generateSchemes(project), [project]);
  const base = gen.schemes.find((s) => s.key === project.baseSchemeKey);
  const shortRes = useMemo(() => applyShortlist(gen.schemes, project), [gen.schemes, project]);
  const candidates = shortRes.kept.filter((s) => s.key !== project.baseSchemeKey);
  const [selScheme, setSelScheme] = useState('');
  const scheme = candidates.find((s) => s.key === selScheme);
  const compById = Object.fromEntries(project.comparisonAreas.map((c) => [c.id, c]));

  function getJ(schemeKey: string) {
    return (areaId: string) => {
      const j = project.judgments.find((x) => x.schemeKey === schemeKey && x.comparisonAreaId === areaId);
      return { min: j?.min ?? 0, max: j?.max ?? 0, best: j?.best ?? Math.round(((j?.min ?? 0) + (j?.max ?? 0)) / 2) };
    };
  }

  function setJ(schemeKey: string) {
    return (areaId: string, patch: { min?: number; max?: number; best?: number }) =>
      update((p) => {
        let j = p.judgments.find((x) => x.schemeKey === schemeKey && x.comparisonAreaId === areaId);
        if (!j) {
          j = { id: uid(), schemeKey, comparisonAreaId: areaId, min: 0, max: 0, best: 0, comment: '' };
          p.judgments.push(j);
        }
        Object.assign(j, patch);
      });
  }

  function setComment(schemeKey: string, areaId: string, comment: string) {
    update((p) => {
      let j = p.judgments.find((x) => x.schemeKey === schemeKey && x.comparisonAreaId === areaId);
      if (!j) {
        j = { id: uid(), schemeKey, comparisonAreaId: areaId, min: 0, max: 0, best: 0, comment: '' };
        p.judgments.push(j);
      }
      j.comment = comment;
    });
  }

  // ---- 11.1: filtros da lista restrita ----
  const [ruleArea, setRuleArea] = useState('');
  const [ruleOp, setRuleOp] = useState<'max' | 'min'>('max');
  const [ruleVal, setRuleVal] = useState('');
  const [ruleLabel, setRuleLabel] = useState('');

  return (
    <div>
      <SectionTitle step="11" title="Julgar vantagem comparativa entre alternativas" subtitle="Julgue a vantagem diretamente no gráfico: arraste as pontas do intervalo e o losango da melhor estimativa." />
      <Help>
        na avaliação relativa você descreveu <em>o que muda</em>; aqui você julga <em>para quem a mudança é vantagem e com
        que intensidade</em> (negligenciável → marginal → insignificante → significativa → considerável → extrema). O
        intervalo ⟷ representa a incerteza do julgamento — tanto sobre os fatos (UE) quanto sobre os valores (UV); o
        losango ◇ é a melhor estimativa do grupo.
      </Help>

      {!gen.ok ? <Warn>{gen.error}</Warn>
        : !base ? <Warn>Escolha o esquema-base na etapa 10.</Warn>
        : project.comparisonAreas.length === 0 ? <Warn>Crie áreas de comparação na etapa 9.</Warn>
        : (
        <>
          {/* ---------- 11.1 Restringir o foco ---------- */}
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-bold text-sm text-slate-800">11.1 — Restringir o foco para comparações (lista restrita de trabalho)</div>
                <div className="text-xs text-slate-500">Com muitos esquemas, as comparações par-a-par crescem rapidamente (9 esquemas → 36 pares; 18 → 153). Use limites para reduzir a lista de trabalho.</div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={project.shortlist.active} onChange={(e) => update((p) => void (p.shortlist.active = e.target.checked))} />
                Ativar filtros
              </label>
            </div>
            <Warn>
              A lista restrita é <strong>provisória e revisável</strong>. Simplificar o problema tem custo: um esquema ruim
              em custo pode ser excelente em outra dimensão e ser descartado cedo demais.
            </Warn>
            <div className="grid md:grid-cols-5 gap-3 items-end">
              <Field label="Área de comparação">
                <Select value={ruleArea} onChange={(e) => setRuleArea(e.target.value)}>
                  <option value="">— selecione —</option>
                  {project.comparisonAreas.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </Field>
              <Field label="Tipo de limite">
                <Select value={ruleOp} onChange={(e) => setRuleOp(e.target.value as 'max' | 'min')}>
                  <option value="max">Valor máximo (ex.: custo máximo)</option>
                  <option value="min">Valor mínimo (ex.: receita/impacto mínimo)</option>
                </Select>
              </Field>
              <Field label="Valor-limite"><TextInput type="number" value={ruleVal} onChange={(e) => setRuleVal(e.target.value)} /></Field>
              <Field label="Nome do critério"><TextInput value={ruleLabel} onChange={(e) => setRuleLabel(e.target.value)} placeholder="custo máximo" /></Field>
              <div className="mb-3">
                <Btn onClick={() => {
                  if (!ruleArea || ruleVal === '') return;
                  update((p) => void p.shortlist.rules.push({ id: uid(), comparisonAreaId: ruleArea, op: ruleOp, value: parseFloat(ruleVal), label: ruleLabel || (ruleOp === 'max' ? 'máximo' : 'mínimo') }));
                  setRuleVal(''); setRuleLabel('');
                }}>Adicionar regra</Btn>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {project.shortlist.rules.map((r) => (
                <Badge key={r.id} color="blue">
                  {compById[r.comparisonAreaId]?.label} {r.op === 'max' ? '≤' : '≥'} {r.value} ({r.label}){' '}
                  <button className="ml-1 text-red-500" onClick={() => update((p) => void (p.shortlist.rules = p.shortlist.rules.filter((x) => x.id !== r.id)))}>×</button>
                </Badge>
              ))}
              <span className="text-xs text-slate-500 ml-2">Confiança mínima (0 = não exigir):</span>
              <Select className="!w-auto" value={project.shortlist.minConfidence} onChange={(e) => update((p) => void (p.shortlist.minConfidence = parseInt(e.target.value)))}>
                {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </div>
            {project.shortlist.active && (
              <div className="text-sm">
                <span className="text-slate-600">Lista restrita (provisória): </span>
                {shortRes.kept.map((s) => <Badge key={s.key} color="green">{s.name}</Badge>)}{' '}
                {shortRes.removed.map((r) => (
                  <span key={r.scheme.key} title={r.reason}><Badge color="red">{r.scheme.name} (excluído)</Badge>{' '}</span>
                ))}
                {shortRes.noData.length > 0 && (
                  <div className="text-xs text-amber-600 mt-1">Mantidos sem dados suficientes para julgar: {shortRes.noData.map((s) => s.name).join(', ')}.</div>
                )}
              </div>
            )}
          </Card>

          {/* ---------- gráfico interativo de vantagens ---------- */}
          <Card className="mb-4">
            <Field label={`Comparar com a base (${base.name}) o esquema:`}>
              <Select value={selScheme} onChange={(e) => setSelScheme(e.target.value)}>
                <option value="">— selecione —</option>
                {candidates.map((s) => <option key={s.key} value={s.key}>{s.name}</option>)}
              </Select>
            </Field>
          </Card>
          {scheme && (
            <>
              <AdvantageChart
                baseName={base.name}
                otherName={scheme.name}
                areas={project.comparisonAreas}
                getJ={getJ(scheme.key)}
                onSet={setJ(scheme.key)}
              />
              <Card className="mt-4">
                <div className="font-semibold text-sm text-slate-700 mb-2">Comentários do grupo decisor (por área)</div>
                <div className="grid md:grid-cols-2 gap-2">
                  {project.comparisonAreas.map((c) => {
                    const j = project.judgments.find((x) => x.schemeKey === scheme.key && x.comparisonAreaId === c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <span className="font-bold w-28 shrink-0">{c.label}</span>
                        <TextInput value={j?.comment ?? ''} onChange={(e) => setComment(scheme.key, c.id, e.target.value)} />
                      </label>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
