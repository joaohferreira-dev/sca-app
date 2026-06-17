// ============================================================
// Modo CHOOSING — etapas 13 a 16: incertezas (UE/UV/UR),
// opções exploratórias, esquemas de ação + robustez e
// pacote de compromisso
// ============================================================
import React, { useMemo, useState } from 'react';
import { useProject } from '../store';
import { actionSchemeStats, generateSchemes, isAcceptable, uid } from '../lib/sca';
import { CommitmentCell, ExploratoryType, UncertaintyArea, UncertaintyType } from '../types';
import { Badge, Btn, Card, EmptyState, Field, Help, SectionTitle, Select, TextArea, TextInput, Td, Th, Warn } from '../components/ui';

const U_TYPES: { v: UncertaintyType; l: string; d: string; color: 'blue' | 'amber' | 'indigo' }[] = [
  { v: 'UE', l: 'UE — ambiente', d: 'Incertezas sobre o ambiente: dados, mercado, tecnologia, tendências externas.', color: 'blue' },
  { v: 'UV', l: 'UV — valores', d: 'Incertezas sobre valores norteadores: prioridades, critérios, orientação política.', color: 'amber' },
  { v: 'UR', l: 'UR — decisões relacionadas', d: 'Incertezas sobre decisões relacionadas ou dependentes, fora do foco atual.', color: 'indigo' },
];

/** Separa "?SITEJOBS — atratividade do terreno..." em rótulo e texto. */
function splitU(u: UncertaintyArea): { label: string; text: string } {
  const parts = u.title.split('—');
  if (parts.length >= 2) return { label: parts[0].trim(), text: parts.slice(1).join('—').trim() };
  return { label: u.title.trim(), text: u.description };
}

const E_TYPES: { v: ExploratoryType; l: string }[] = [
  { v: 'estudo_tecnico', l: 'Estudo técnico' },
  { v: 'consulta_publica', l: 'Consulta pública' },
  { v: 'reuniao', l: 'Reunião' },
  { v: 'negociacao', l: 'Negociação' },
  { v: 'coleta_dados', l: 'Coleta de dados' },
  { v: 'simulacao', l: 'Simulação' },
  { v: 'analise_juridica', l: 'Análise jurídica' },
  { v: 'analise_economica', l: 'Análise econômica' },
  { v: 'outro', l: 'Outro' },
];

// ---------------- Etapa 13 — Áreas de incerteza ----------------
export function Step13Uncertainty() {
  const { project, update } = useProject();
  const gen = useMemo(() => generateSchemes(project), [project]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<UncertaintyType>('UE');
  const [owner, setOwner] = useState('');
  const [deadline, setDeadline] = useState('');
  const [note, setNote] = useState('');
  const [schemes, setSchemes] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [comps, setComps] = useState<string[]>([]);
  const [err, setErr] = useState('');

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  function add() {
    if (!title.trim()) return setErr('O título é obrigatório.');
    update((p) => void p.uncertainties.push({
      id: uid(), title: title.trim(), description: desc, type,
      owner, deadline, note, schemeKeys: schemes, areaIds: areas, comparisonAreaIds: comps,
    }));
    setTitle(''); setDesc(''); setOwner(''); setDeadline(''); setNote(''); setSchemes([]); setAreas([]); setComps([]); setErr('');
  }

  return (
    <div>
      <SectionTitle step="12" title="Explorar áreas de incerteza" subtitle='A pergunta-chave: "por que ainda não conseguimos afirmar com segurança qual esquema é melhor?"' />
      <Help>
        o SCA distingue três direções de incerteza: <strong>UE</strong> (ambiente de trabalho — pede mais informação),
        <strong> UV</strong> (valores norteadores — pede clarificação de objetivos/políticas) e <strong>UR</strong>
        (decisões relacionadas — pede coordenação com escolhas fora do foco atual). Classificar bem orienta o tipo de
        resposta exploratória adequada.
      </Help>
      <Card className="mb-4">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Título"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="?SITEJOBS — atratividade do terreno para indústrias" /></Field>
          <Field label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value as UncertaintyType)}>
              {U_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </Select>
          </Field>
        </div>
        <p className="text-xs text-slate-500 -mt-1 mb-3">{U_TYPES.find((t) => t.v === type)?.d}</p>
        <Field label="Descrição"><TextArea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Responsável"><TextInput value={owner} onChange={(e) => setOwner(e.target.value)} /></Field>
          <Field label="Prazo"><TextInput value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="Ex.: 3 meses / 2026-09-01" /></Field>
          <Field label="Observação (opcional)" hint='Ex.: "influência maior na comparação de A e B em relação a JOBS:"'>
            <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="font-medium text-slate-700 mb-1">Esquemas afetados</div>
            {gen.schemes.map((s) => (
              <label key={s.key} className="flex items-center gap-1.5 text-xs py-0.5">
                <input type="checkbox" checked={schemes.includes(s.key)} onChange={() => toggle(schemes, setSchemes, s.key)} />{s.name}
              </label>
            ))}
          </div>
          <div>
            <div className="font-medium text-slate-700 mb-1">Áreas de decisão relacionadas</div>
            {project.areas.map((a) => (
              <label key={a.id} className="flex items-center gap-1.5 text-xs py-0.5">
                <input type="checkbox" checked={areas.includes(a.id)} onChange={() => toggle(areas, setAreas, a.id)} />{a.label}
              </label>
            ))}
          </div>
          <div>
            <div className="font-medium text-slate-700 mb-1">Áreas de comparação relacionadas</div>
            {project.comparisonAreas.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-xs py-0.5">
                <input type="checkbox" checked={comps.includes(c.id)} onChange={() => toggle(comps, setComps, c.id)} />{c.label}
              </label>
            ))}
          </div>
        </div>
        {err && <Warn>{err}</Warn>}
        <div className="mt-3"><Btn onClick={add}>Adicionar incerteza</Btn></div>
      </Card>
      {project.uncertainties.length === 0 ? (
        <EmptyState>Nenhuma incerteza registrada.</EmptyState>
      ) : (
        /* Tabela manuscrita (estilo do diagrama clássico): área de
           incerteza, rótulo, tipo e observação editável direto na linha */
        <Card className="hand bg-[#fbfaf6] px-6 py-5">
          <div className="grid" style={{ gridTemplateColumns: '1.3fr 8.5rem 3.5rem minmax(0, 1.1fr)' }}>
            <div className="text-base font-bold uppercase text-stone-800 border-b-2 border-stone-400/70 pb-1">Área de incerteza</div>
            <div className="text-base font-bold uppercase text-stone-800 border-b-2 border-stone-400/70 pb-1">Rótulo</div>
            <div className="text-base font-bold uppercase text-stone-800 border-b-2 border-stone-400/70 pb-1">Tipo</div>
            <div className="text-base font-bold uppercase text-stone-800 border-b-2 border-stone-400/70 pb-1 border-l-2 border-l-stone-400/70 pl-4">Observação</div>
            {project.uncertainties.map((u) => {
              const parts = splitU(u);
              return (
                <React.Fragment key={u.id}>
                  <div className="py-3 pr-3 border-t border-dashed border-stone-300">
                    <div className="text-xl leading-snug text-stone-800 lowercase">? {parts.text || parts.label}</div>
                    <div className="text-xs text-stone-400 font-sans mt-1">
                      {u.owner && <>{u.owner}</>}
                      {u.deadline && <>{u.owner ? ' · ' : ''}prazo: {u.deadline}</>}
                      <button
                        className="ml-2 text-red-500 hover:underline"
                        onClick={() => update((p) => {
                          p.uncertainties = p.uncertainties.filter((x) => x.id !== u.id);
                          p.exploratory = p.exploratory.filter((e) => e.uncertaintyId !== u.id);
                        })}
                      >
                        excluir
                      </button>
                    </div>
                  </div>
                  <div className="py-3 text-xl font-bold text-stone-900 uppercase whitespace-nowrap border-t border-dashed border-stone-300">{parts.label}</div>
                  <div className="py-3 text-xl font-bold text-stone-900 border-t border-dashed border-stone-300">{u.type}</div>
                  <div className="py-3 border-t border-dashed border-stone-300 border-l-2 border-l-stone-400/70 pl-4">
                    {/* observação editável direto na tabela, em caligrafia */}
                    <textarea
                      rows={2}
                      value={u.note ?? ''}
                      placeholder="ex.: influência maior na comparação de A e B em relação a JOBS:"
                      className="w-full bg-transparent text-lg leading-snug text-stone-700 hand focus:outline-none placeholder:text-stone-300 resize-none"
                      onChange={(e) => update((p) => { const x = p.uncertainties.find((y) => y.id === u.id); if (x) x.note = e.target.value; })}
                    />
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <p className="text-xs text-stone-400 mt-2 font-sans">A observação é editável direto na tabela. UE = ambiente · UV = valores · UR = decisões relacionadas.</p>
        </Card>
      )}
    </div>
  );
}

// ---------------- Etapa 14 — Opções exploratórias ----------------
export function Step14Exploratory() {
  const { project, update } = useProject();
  const [uncId, setUncId] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [cost, setCost] = useState('');
  const [deadline, setDeadline] = useState('');
  const [owner, setOwner] = useState('');
  const [type, setType] = useState<ExploratoryType>('estudo_tecnico');
  const [err, setErr] = useState('');
  const uById = Object.fromEntries(project.uncertainties.map((u) => [u.id, u]));

  function add() {
    if (!uncId) return setErr('Associe a opção exploratória a uma incerteza.');
    if (!name.trim()) return setErr('O nome é obrigatório.');
    update((p) => void p.exploratory.push({ id: uid(), uncertaintyId: uncId, name: name.trim(), description: desc, cost, deadline, owner, type, comparison: '', worthIt: 'avaliar' }));
    setName(''); setDesc(''); setCost(''); setDeadline(''); setOwner(''); setErr('');
  }

  return (
    <div>
      <SectionTitle step="13" title="Identificar opções exploratórias" subtitle="Ações de investigação, consulta, negociação ou coordenação para reduzir incertezas antes de compromissos mais fortes." />
      <Help>
        nem toda incerteza precisa ser aceita passivamente. A pergunta é: <em>vale a pena investir tempo, recursos e
        esforço para reduzi-la antes da decisão?</em> Cada tipo de incerteza pede explorações diferentes: UE → pesquisa e
        levantamento; UV → consulta e clarificação política; UR → negociação e coordenação. Ao criar uma opção
        exploratória, o grupo cria quase uma nova decisão.
      </Help>
      {project.uncertainties.length === 0 ? (
        <Warn>Cadastre incertezas na etapa 12 antes de definir explorações.</Warn>
      ) : (
        <>
          <Card className="mb-4">
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="Incerteza associada">
                <Select value={uncId} onChange={(e) => setUncId(e.target.value)}>
                  <option value="">— selecione —</option>
                  {project.uncertainties.map((u) => <option key={u.id} value={u.id}>{u.title} ({u.type})</option>)}
                </Select>
              </Field>
              <Field label="Nome da ação"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Pesquisa de mercado com consultores" /></Field>
              <Field label="Tipo">
                <Select value={type} onChange={(e) => setType(e.target.value as ExploratoryType)}>
                  {E_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Descrição"><TextArea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
            <div className="grid md:grid-cols-3 gap-3">
              <Field label="Custo estimado"><TextInput value={cost} onChange={(e) => setCost(e.target.value)} placeholder="20k" /></Field>
              <Field label="Prazo"><TextInput value={deadline} onChange={(e) => setDeadline(e.target.value)} placeholder="3 meses" /></Field>
              <Field label="Responsável"><TextInput value={owner} onChange={(e) => setOwner(e.target.value)} /></Field>
            </div>
            {err && <Warn>{err}</Warn>}
            <Btn onClick={add}>Adicionar opção exploratória</Btn>
          </Card>
          {project.exploratory.length === 0 ? (
            <EmptyState>Nenhuma opção exploratória registrada.</EmptyState>
          ) : (
            /* Tabela manuscrita (estilo do diagrama clássico): incerteza,
               opção exploratória e comparação (confiança/recursos/prazo) */
            <Card className="hand bg-[#fbfaf6] px-6 py-5">
              <div className="grid" style={{ gridTemplateColumns: '0.85fr 1fr minmax(0, 1.5fr)' }}>
                <div className="text-base font-bold uppercase text-stone-800 border-b-2 border-stone-400/70 pb-1">Área de incerteza</div>
                <div className="text-base font-bold uppercase text-stone-800 border-b-2 border-stone-400/70 pb-1 border-l-2 border-l-stone-400/70 pl-4">Opção exploratória</div>
                <div className="text-base font-bold uppercase text-stone-800 border-b-2 border-stone-400/70 pb-1 border-l-2 border-l-stone-400/70 pl-4">
                  Comparação das opções exploratórias
                </div>
                {project.exploratory.map((e) => {
                  const u = uById[e.uncertaintyId];
                  const parts = u ? splitU(u) : { label: '?', text: '' };
                  return (
                    <React.Fragment key={e.id}>
                      <div className="py-4 pr-3 border-t border-dashed border-stone-300">
                        <span className="text-xl font-bold text-stone-900 uppercase">{parts.label}</span>{' '}
                        <span className="text-xl text-stone-700">({u?.type ?? '?'})</span>
                        {parts.text && <div className="text-base text-stone-500 lowercase leading-snug mt-1">{parts.text}</div>}
                      </div>
                      <div className="py-4 border-t border-dashed border-stone-300 border-l-2 border-l-stone-400/70 pl-4">
                        <div className="text-xl leading-snug text-stone-800 lowercase">{e.name}</div>
                        {e.description && <div className="text-base text-stone-500 leading-snug">{e.description}</div>}
                        <div className="text-xs text-stone-400 font-sans mt-1">{E_TYPES.find((t) => t.v === e.type)?.l}</div>
                      </div>
                      <div className="py-4 border-t border-dashed border-stone-300 border-l-2 border-l-stone-400/70 pl-4">
                        {/* comparação editável direto na tabela, em caligrafia */}
                        <textarea
                          rows={3}
                          value={e.comparison ?? ''}
                          placeholder="ex.: alta confiança na redução da incerteza; resultados em 3 meses; depende de orçamento aprovado"
                          className="w-full bg-transparent text-xl leading-snug text-stone-800 hand focus:outline-none placeholder:text-stone-300 resize-none"
                          onChange={(ev) => update((p) => { const x = p.exploratory.find((y) => y.id === e.id); if (x) x.comparison = ev.target.value; })}
                        />
                        <div className="text-xl leading-snug text-stone-800">
                          <span className="font-bold uppercase">Recursos:</span> {e.cost || '—'}
                        </div>
                        <div className="text-xl leading-snug text-stone-800">
                          <span className="font-bold uppercase">Prazo:</span> {e.deadline || '—'}
                        </div>
                        <div className="flex items-center gap-2 mt-2 font-sans">
                          {e.owner && <span className="text-xs text-stone-400">responsável: {e.owner}</span>}
                          <Select
                            value={e.worthIt}
                            onChange={(ev) => update((p) => { const x = p.exploratory.find((y) => y.id === e.id); if (x) x.worthIt = ev.target.value as typeof e.worthIt; })}
                            className="!w-auto !text-xs !py-0.5"
                          >
                            <option value="avaliar">Em avaliação</option>
                            <option value="sim">Sim — explorar</option>
                            <option value="nao">Não — aceitar a incerteza</option>
                          </Select>
                          <button
                            className="text-xs text-red-500 hover:underline"
                            onClick={() => update((p) => void (p.exploratory = p.exploratory.filter((x) => x.id !== e.id)))}
                          >
                            excluir
                          </button>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- Etapa 15 — Esquemas de ação e robustez ----------------
export function Step15Robustness() {
  const { project, update } = useProject();
  const gen = useMemo(() => generateSchemes(project), [project]);
  const focusAreas = project.areas.filter((a) => project.focusIds.includes(a.id));
  const [selected, setSelected] = useState<Record<string, string>>({}); // areaId -> optionId ('' = deixar aberta)
  const optById = Object.fromEntries(project.options.map((o) => [o.id, o]));
  const acc = project.acceptability;

  const committed = Object.values(selected).filter(Boolean);
  const stats = useMemo(
    () => (gen.ok ? actionSchemeStats(committed, gen.schemes, project) : null),
    [gen, committed.join('+'), project],
  );

  return (
    <div>
      <SectionTitle step="14" title="Avaliar esquemas de ação, flexibilidade e robustez" subtitle="Um esquema de ação é um compromisso PARCIAL: fecha algumas opções agora e deixa outras decisões abertas." />
      <Help>
        uma decisão imediata pode ser ruim não porque a opção é ruim, mas porque <strong>fecha caminhos futuros
        importantes</strong>. Dois indicadores: <em>total de esquemas disponíveis</em> (quantos esquemas completos
        continuam possíveis após o compromisso) e <em>índice de robustez</em> (quantos desses atingem o nível mínimo de
        aceitabilidade definido pelo grupo). Um esquema que deixa dois caminhos aceitáveis pode ser mais estratégico do que
        outro que deixa muitos caminhos fracos.
      </Help>
      {!gen.ok ? <Warn>{gen.error}</Warn> : (
        <>
          {/* Critério de aceitabilidade */}
          <Card className="mb-4">
            <div className="font-bold text-sm text-slate-800 mb-2">Critério de aceitabilidade (definido pelo grupo)</div>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Modo">
                <Select value={acc.mode} onChange={(e) => update((p) => void (p.acceptability.mode = e.target.value as 'manual' | 'regra'))}>
                  <option value="manual">Marcação manual (julgamento do grupo)</option>
                  <option value="regra">Regra sobre uma área de comparação (ex.: custo máximo, confiança mínima)</option>
                </Select>
              </Field>
              <Field label="Descrição do critério (registrada no relatório)">
                <TextInput value={acc.description} onChange={(e) => update((p) => void (p.acceptability.description = e.target.value))} placeholder='Ex.: "confiança dos moradores de pelo menos RRR"' />
              </Field>
            </div>
            {acc.mode === 'manual' ? (
              <div className="grid md:grid-cols-3 gap-1">
                {gen.schemes.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-sm py-0.5">
                    <input
                      type="checkbox"
                      checked={acc.manualKeys.includes(s.key)}
                      onChange={(e) => update((p) => {
                        p.acceptability.manualKeys = e.target.checked
                          ? [...p.acceptability.manualKeys, s.key]
                          : p.acceptability.manualKeys.filter((k) => k !== s.key);
                      })}
                    />
                    {s.name} <span className="text-xs text-slate-400">({s.optionIds.map((id) => optById[id]?.label).join('+')})</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-4 gap-3">
                <Field label="Área de comparação">
                  <Select value={acc.comparisonAreaId ?? ''} onChange={(e) => update((p) => void (p.acceptability.comparisonAreaId = e.target.value || null))}>
                    <option value="">— selecione —</option>
                    {project.comparisonAreas.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </Select>
                </Field>
                <Field label="Operador">
                  <Select value={acc.op} onChange={(e) => update((p) => void (p.acceptability.op = e.target.value as 'max' | 'min'))}>
                    <option value="max">valor ≤ limiar (custo máximo)</option>
                    <option value="min">valor ≥ limiar (mínimo exigido)</option>
                  </Select>
                </Field>
                <Field label="Limiar"><TextInput type="number" value={acc.threshold} onChange={(e) => update((p) => void (p.acceptability.threshold = parseFloat(e.target.value) || 0))} /></Field>
                <Field label="Confiança mínima (0 = não exigir)">
                  <Select value={acc.minConfidence} onChange={(e) => update((p) => void (p.acceptability.minConfidence = parseInt(e.target.value)))}>
                    {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </Select>
                </Field>
                <p className="text-xs text-slate-500 md:col-span-4 -mt-2">A regra usa o valor numérico da avaliação relativa (etapa 10). O esquema-base conta como aceitável (é a referência). Esquemas sem avaliação numérica não contam como aceitáveis.</p>
              </div>
            )}
            <div className="text-sm mt-2">
              Aceitáveis hoje: {gen.schemes.filter((s) => isAcceptable(s, project)).map((s) => <Badge key={s.key} color="green">{s.name}</Badge>)}
              {gen.schemes.filter((s) => isAcceptable(s, project)).length === 0 && <span className="text-slate-400"> nenhum</span>}
            </div>
          </Card>

          {/* Simulador de compromisso parcial */}
          <Card className="mb-4">
            <div className="font-bold text-sm text-slate-800 mb-2">Simular compromisso parcial</div>
            <div className="grid md:grid-cols-4 gap-3">
              {focusAreas.map((a) => (
                <Field key={a.id} label={a.label}>
                  <Select value={selected[a.id] ?? ''} onChange={(e) => setSelected({ ...selected, [a.id]: e.target.value })}>
                    <option value="">— deixar aberta —</option>
                    {project.options.filter((o) => o.areaId === a.id).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </Select>
                </Field>
              ))}
            </div>
            {stats && (
              <div className="grid md:grid-cols-2 gap-3 mt-2">
                <Card className="bg-slate-50">
                  <div className="text-2xl font-bold text-indigo-700">{stats.totalCount}</div>
                  <div className="text-xs text-slate-500">total de esquemas de decisão ainda disponíveis</div>
                  <div className="text-xs text-slate-600 mt-1">{stats.available.map((s) => s.name.replace('Esquema ', '')).join(', ') || '—'}</div>
                </Card>
                <Card className="bg-slate-50">
                  <div className="text-2xl font-bold text-green-700">{stats.robustnessIndex}</div>
                  <div className="text-xs text-slate-500">índice de robustez (disponíveis E aceitáveis)</div>
                  {stats.totalCount > 0 && stats.robustnessIndex === 0 && (
                    <div className="text-xs text-red-600 mt-1">Atenção: este compromisso deixa caminhos abertos, mas nenhum aceitável.</div>
                  )}
                </Card>
              </div>
            )}
            <div className="mt-3">
              <Btn
                disabled={committed.length === 0}
                onClick={() => update((p) => void p.actionSchemes.push({
                  id: uid(),
                  name: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][p.actionSchemes.length] ?? `#${p.actionSchemes.length + 1}`,
                  optionIds: committed,
                }))}
              >
                Salvar como esquema de ação
              </Btn>
            </div>
          </Card>

          {project.actionSchemes.length > 0 && (
            <Card>
              <div className="font-bold text-sm text-slate-800 mb-2">Esquemas de ação salvos (comparação de flexibilidade)</div>
              <table className="w-full">
                <thead><tr><Th>Esquema de ação</Th><Th>Compromisso imediato</Th><Th>Esquemas disponíveis</Th><Th>Índice de robustez</Th><Th></Th></tr></thead>
                <tbody>
                  {project.actionSchemes.map((as) => {
                    const st = actionSchemeStats(as.optionIds, gen.schemes, project);
                    return (
                      <tr key={as.id}>
                        <Td className="font-semibold">{as.name}</Td>
                        <Td>{as.optionIds.map((id) => optById[id]?.label ?? '?').join(' + ')}</Td>
                        <Td>{st.totalCount} <span className="text-xs text-slate-500">({st.available.map((s) => s.name.replace('Esquema ', '')).join(', ') || '—'})</span></Td>
                        <Td>{st.robustnessIndex === 0 ? <Badge color="red">0 — frágil</Badge> : <Badge color="green">{st.robustnessIndex}</Badge>}</Td>
                        <Td><Btn variant="danger" onClick={() => update((p) => void (p.actionSchemes = p.actionSchemes.filter((x) => x.id !== as.id)))}>×</Btn></Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- Etapa 16 — Pacote de compromisso ----------------

export function Step16Package() {
  const { project, update } = useProject();
  const areas = project.areas;
  const selectedIds = project.commitmentAreaIds ?? [];
  const selectedAreas = areas.filter((a) => selectedIds.includes(a.id));

  function toggleArea(areaId: string) {
    update((p) => {
      const cur = p.commitmentAreaIds ?? [];
      p.commitmentAreaIds = cur.includes(areaId) ? cur.filter((x) => x !== areaId) : [...cur, areaId];
    });
  }

  function mutateCell(areaId: string, fn: (c: CommitmentCell) => void) {
    update((p) => {
      if (!p.commitmentMatrix) p.commitmentMatrix = {};
      if (!p.commitmentMatrix[areaId]) p.commitmentMatrix[areaId] = {};
      fn(p.commitmentMatrix[areaId]);
    });
  }
  return (
    <div>
      <SectionTitle step="15" title="Desenvolver o pacote de compromisso" subtitle="Matriz por área de decisão: decisões imediatas (ações e explorações) e espaço de decisão futura (escolhas adiadas e planejamento de contingência)." />
      <Help>
        o pacote de compromisso <strong>não é “a alternativa ótima”</strong>. Selecione as <strong>áreas de decisão</strong> que
        comporão o pacote e, para cada uma: escolha a <em>opção</em> que será a ação imediata e escreva livremente as
        explorações, as escolhas adiadas e o planejamento de contingência (“se… então…”), no espírito do diagrama clássico
        de Friend &amp; Hickling.
      </Help>

      {/* seleção das áreas que compõem o pacote */}
      <Card className="mb-4">
        <div className="font-bold text-sm text-slate-800 mb-1">Áreas de decisão no pacote</div>
        <div className="text-xs text-slate-500 mb-2">Selecione quais áreas de decisão comporão o pacote de compromisso.</div>
        {areas.length === 0 ? (
          <Warn>Cadastre áreas de decisão (etapa 2) primeiro.</Warn>
        ) : (
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => {
              const on = selectedIds.includes(a.id);
              return (
                <label key={a.id} className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded border cursor-pointer ${on ? 'bg-indigo-50 border-indigo-300 text-indigo-800' : 'border-stone-300 hover:bg-stone-50'}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleArea(a.id)} />
                  <span className="font-bold uppercase">{a.label}</span>
                </label>
              );
            })}
          </div>
        )}
      </Card>

      {selectedAreas.length === 0 ? (
        <EmptyState>Selecione ao menos uma área de decisão acima para montar o pacote de compromisso.</EmptyState>
      ) : (
        <Card className="hand bg-[#fbfaf6] px-4 py-4 overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: '66rem' }}>
            <thead>
              <tr>
                <th rowSpan={2} className="border border-stone-400/70 p-2 align-bottom text-center text-sm font-bold uppercase text-stone-800 w-32">Áreas de decisão</th>
                <th colSpan={2} className="border border-stone-400/70 p-2 text-center text-sm font-bold uppercase text-stone-800">Decisões imediatas</th>
                <th colSpan={2} className="border border-stone-400/70 p-2 text-center text-sm font-bold uppercase text-stone-800">Espaço de decisão futura</th>
              </tr>
              <tr>
                {['Ações', 'Explorações', 'Escolhas adiadas', 'Planejamento de contingência'].map((h) => (
                  <th key={h} className="border border-stone-400/70 p-2 text-center text-sm font-bold uppercase text-stone-800">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedAreas.map((a) => {
                const cell = project.commitmentMatrix?.[a.id] ?? {};
                const opts = project.options.filter((o) => o.areaId === a.id);
                return (
                  <tr key={a.id}>
                    <td className="border border-stone-400/70 p-2 text-center align-middle text-lg font-bold uppercase text-stone-900 whitespace-nowrap">{a.label}</td>

                    {/* Ações: opção da própria área de decisão */}
                    <td className="border border-stone-400/70 p-2 align-top">
                      <select
                        value={cell.actionOptionId ?? ''}
                        onChange={(ev) => mutateCell(a.id, (c) => { c.actionOptionId = ev.target.value || undefined; })}
                        className="w-full bg-transparent text-base text-stone-800 hand focus:outline-none"
                      >
                        <option value="">— nenhuma —</option>
                        {opts.map((o) => <option key={o.id} value={o.id}>{o.label} — {o.name}</option>)}
                      </select>
                      {opts.length === 0 && <div className="text-xs text-stone-400 font-sans mt-1">sem opções (etapa 6)</div>}
                    </td>

                    {/* Explorações: texto livre */}
                    <td className="border border-stone-400/70 p-1 align-top">
                      <textarea
                        rows={4}
                        value={cell.exploration ?? ''}
                        placeholder="ex.: investigar custos do esquema de melhoria"
                        className="w-full bg-transparent text-base leading-snug text-stone-800 hand focus:outline-none placeholder:text-stone-300 resize-none text-center"
                        onChange={(ev) => mutateCell(a.id, (c) => { c.exploration = ev.target.value; })}
                      />
                    </td>

                    {/* Escolhas adiadas: texto livre */}
                    <td className="border border-stone-400/70 p-1 align-top">
                      <textarea
                        rows={4}
                        value={cell.deferred ?? ''}
                        placeholder="ex.: em 2 meses: decidir o uso do terreno central"
                        className="w-full bg-transparent text-base leading-snug text-stone-800 hand focus:outline-none placeholder:text-stone-300 resize-none text-center"
                        onChange={(ev) => mutateCell(a.id, (c) => { c.deferred = ev.target.value; })}
                      />
                    </td>

                    {/* Planejamento de contingência: texto livre */}
                    <td className="border border-stone-400/70 p-1 align-top">
                      <textarea
                        rows={4}
                        value={cell.contingency ?? ''}
                        placeholder="ex.: se a recomendação não for aceita, então recorrer"
                        className="w-full bg-transparent text-base leading-snug text-stone-800 hand focus:outline-none placeholder:text-stone-300 resize-none text-center"
                        onChange={(ev) => mutateCell(a.id, (c) => { c.contingency = ev.target.value; })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-stone-400 mt-2 font-sans">
            Ações = opção assumida agora (etapa 6); explorações, escolhas adiadas e contingência são de texto livre,
            editável direto na tabela.
          </p>
        </Card>
      )}
    </div>
  );
}
