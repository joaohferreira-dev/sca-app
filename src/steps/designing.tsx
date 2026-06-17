// ============================================================
// Modo DESIGNING — etapas 7 a 9: opções + matriz de
// compatibilidade (toggle), gráfico de opções (opções
// reposicionáveis) e árvore ramificada de esquemas viáveis
// ============================================================
import React, { useMemo, useState } from 'react';
import { useProject } from '../store';
import { findRelation, generateSchemes, letterName, uid } from '../lib/sca';
import { CompatStatus, DecisionArea, DecisionOption, IncompatType, Project } from '../types';
import { Badge, Btn, Card, EmptyState, Field, Help, SectionTitle, Select, TextInput, Td, Th, Warn } from '../components/ui';
import { INCOMPAT_COLORS, INCOMPAT_LABELS, OptionsGraph, blobPath, sketchLine } from '../components/graphs';
import { useDesign } from '../design';

const INCOMPAT_TYPES = Object.keys(INCOMPAT_LABELS) as IncompatType[];

// ---------------- Etapa 7 — Opções + matriz de compatibilidade ----------------

/** Bloco clicável de uma área de decisão: clique para adicionar opções. */
function AreaOptionsCard({ area }: { area: DecisionArea }) {
  const { project, update } = useProject();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [err, setErr] = useState('');
  const opts = project.options.filter((o) => o.areaId === area.id);

  function add() {
    if (!name.trim() || !label.trim()) return setErr('Nome completo e rótulo curto são obrigatórios.');
    update((p) => void p.options.push({ id: uid(), areaId: area.id, name: name.trim(), label: label.trim().toUpperCase(), description: '' }));
    setName(''); setLabel(''); setErr('');
  }

  return (
    <div onClick={() => !open && setOpen(true)} className={open ? '' : 'cursor-pointer'}>
      <Card className={open ? 'border-stone-400' : 'hover:border-stone-400 transition-colors'}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-stone-800 text-base hand2 text-xl">{area.label}</div>
          <span className="text-xs text-stone-400">{open ? '' : 'clique para adicionar opções'}</span>
        </div>
        {opts.length === 0 ? (
          <div className="text-xs text-amber-700">Sem opções — esquemas não poderão ser gerados.</div>
        ) : (
          <ul className="space-y-1 mb-2" onClick={(e) => e.stopPropagation()}>
            {opts.map((o) => (
              <li key={o.id} className="flex items-center gap-2 text-sm">
                {/* nome e rótulo editáveis a qualquer momento */}
                <TextInput
                  value={o.label}
                  title="Rótulo curto (editável)"
                  className="!w-24 font-bold uppercase"
                  onChange={(e) => update((p) => { const x = p.options.find((y) => y.id === o.id); if (x) x.label = e.target.value.toUpperCase(); })}
                />
                <TextInput
                  value={o.name}
                  title="Nome completo (editável)"
                  onChange={(e) => update((p) => { const x = p.options.find((y) => y.id === o.id); if (x) x.name = e.target.value; })}
                />
                <Btn variant="danger" onClick={() => update((p) => {
                  p.options = p.options.filter((x) => x.id !== o.id);
                  p.compat = p.compat.filter((c) => c.a !== o.id && c.b !== o.id);
                })}>×</Btn>
              </li>
            ))}
          </ul>
        )}
        {open && (
          <div className="border-t border-dashed border-stone-300 pt-2 mt-1" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
              <Field label="Nome completo"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Rota norte" /></Field>
              <Field label="Rótulo"><TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="NORTH" className="!w-28" /></Field>
              <div className="mb-3"><Btn onClick={add}>Adicionar</Btn></div>
              <div className="mb-3"><Btn variant="secondary" onClick={() => { setOpen(false); setErr(''); }}>Fechar</Btn></div>
            </div>
            {err && <Warn>{err}</Warn>}
          </div>
        )}
      </Card>
    </div>
  );
}

/** Tabela manuscrita Área de decisão / Opções / Rótulo (estilo caderno). */
function HandOptionsTable() {
  const { project } = useProject();
  const focus = project.areas.filter((a) => project.focusIds.includes(a.id));
  const outside = project.areas.filter((a) => !project.focusIds.includes(a.id) && project.options.some((o) => o.areaId === a.id));
  const hasAny = project.options.length > 0;
  if (!hasAny) return null;

  const Row = ({ area }: { area: DecisionArea }) => {
    const opts = project.options.filter((o) => o.areaId === area.id);
    if (opts.length === 0) return null;
    return (
      <div className="grid grid-cols-[0.8fr_1.2fr_0.7fr] gap-x-6 py-2.5 items-start">
        <div className="text-xl font-bold text-stone-900 uppercase">{area.label}</div>
        <div>{opts.map((o) => <div key={o.id} className="text-xl leading-snug text-stone-800 lowercase">– {o.name}</div>)}</div>
        <div>{opts.map((o) => <div key={o.id} className="text-xl leading-snug font-bold text-stone-900 uppercase">– {o.label}</div>)}</div>
      </div>
    );
  };

  return (
    <Card className="hand bg-[#fbfaf6] px-6 py-5 mb-4">
      <div className="grid grid-cols-[0.8fr_1.2fr_0.7fr] gap-x-6 border-b-2 border-stone-400/70 pb-1 mb-2">
        <span className="text-xl font-bold uppercase text-stone-800">Área de decisão</span>
        <span className="text-xl font-bold uppercase text-stone-800">Opções</span>
        <span className="text-xl font-bold uppercase text-stone-800">Rótulo</span>
      </div>
      {focus.map((a) => <Row key={a.id} area={a} />)}
      {outside.length > 0 && (
        <div className="mt-3 border-l-4 border-stone-400/70 pl-4">
          <div className="text-lg text-stone-600 lowercase mb-1">[ opções em áreas de decisão excluídas do foco do problema: ]</div>
          {outside.map((a) => <Row key={a.id} area={a} />)}
        </div>
      )}
    </Card>
  );
}
export function Step7Compatibility() {
  const { project, update } = useProject();
  const focusAreas = project.areas.filter((a) => project.focusIds.includes(a.id));
  // par sendo detalhado (tipo/justificativa OPCIONAIS de uma option bar)
  const [editPair, setEditPair] = useState<{ a: string; b: string } | null>(null);

  const optById = Object.fromEntries(project.options.map((o) => [o.id, o]));
  const bars = project.compat.filter((c) => c.status === 'incompativel');

  /**
   * Toggle binário: compatível/neutro ⇄ incompatível (option bar).
   * A incompatibilidade vale IMEDIATAMENTE, sem modal e sem
   * justificativa obrigatória — tipo e justificativa são opcionais.
   */
  function toggle(a: string, b: string) {
    update((p) => {
      const rel = findRelation(p.compat, a, b);
      if (rel && rel.status === 'incompativel') {
        rel.status = 'compativel';
        // mantém tipo/justificativa registrados caso o usuário re-marque
      } else if (rel) {
        rel.status = 'incompativel';
        rel.incompatType = rel.incompatType ?? 'outra';
      } else {
        p.compat.push({ id: uid(), a, b, status: 'incompativel', incompatType: 'outra' });
      }
    });
  }

  function setDetails(a: string, b: string, incompatType: IncompatType, justification: string) {
    update((p) => {
      const rel = findRelation(p.compat, a, b);
      if (rel) {
        rel.incompatType = incompatType;
        rel.justification = justification || undefined;
      }
    });
  }

  // pares de áreas (matriz triangular, na ordem do foco)
  const areaPairs: [typeof focusAreas[0], typeof focusAreas[0]][] = [];
  for (let i = 0; i < focusAreas.length; i++)
    for (let j = i + 1; j < focusAreas.length; j++) areaPairs.push([focusAreas[i], focusAreas[j]]);

  const editRel = editPair ? findRelation(project.compat, editPair.a, editPair.b) : undefined;

  return (
    <div>
      <SectionTitle step="6" title="Criar a matriz de compatibilidade" subtitle="Cadastre as opções de cada área em foco e marque os pares INCOMPATÍVEIS (option bars). Tudo que não for marcado é tratado como compatível." />
      <Help>
        a área de decisão é a <em>pergunta</em>; a opção é uma possível <em>resposta</em>. A matriz pergunta: “se eu
        escolher esta opção, posso escolher aquela?”. Incompatibilidades são as <strong>option bars</strong> do SCA — barras
        que impedem certas combinações. Incompatibilidade <em>não é preferência</em>: marque apenas combinações impossíveis
        ou inaceitáveis. Tipo e justificativa são opcionais (✎), mas ajudam a documentar a análise.
      </Help>
      {focusAreas.length === 0 ? (
        <Warn>Defina o foco do problema na etapa 5 antes de cadastrar opções.</Warn>
      ) : (
        <>
          <p className="text-sm text-stone-600 mb-2">Clique no bloco de cada área de decisão para adicionar as opções dela.</p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {focusAreas.map((a) => <AreaOptionsCard key={a.id} area={a} />)}
          </div>

          {/* Tabela manuscrita: Área de decisão / Opções / Rótulo */}
          <HandOptionsTable />

          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-slate-800">Matriz triangular de compatibilidade</h3>
            <Badge color={bars.length > 0 ? 'red' : 'slate'}>{bars.length} option bar(s)</Badge>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            <strong>1 clique</strong> = incompatível (✕ vermelho) · <strong>outro clique</strong> = volta a compatível (•).
            Justificativa é opcional: use o ✎ que aparece nas células incompatíveis.
          </p>

          {areaPairs.map(([A, B]) => {
            const optsA = project.options.filter((o) => o.areaId === A.id);
            const optsB = project.options.filter((o) => o.areaId === B.id);
            if (optsA.length === 0 || optsB.length === 0) return null;
            return (
              <Card key={A.id + B.id} className="mb-4 overflow-x-auto">
                <div className="text-sm font-semibold text-slate-700 mb-2">{A.label} × {B.label}</div>
                <table>
                  <thead>
                    <tr><Th></Th>{optsB.map((o) => <Th key={o.id}>{o.label}</Th>)}</tr>
                  </thead>
                  <tbody>
                    {optsA.map((oa) => (
                      <tr key={oa.id}>
                        <Td className="font-semibold whitespace-nowrap">{oa.label}</Td>
                        {optsB.map((ob) => {
                          const rel = findRelation(project.compat, oa.id, ob.id);
                          const isBar = rel?.status === 'incompativel';
                          return (
                            <Td key={ob.id}>
                              <div className="flex items-center gap-0.5">
                                <button
                                  className={`w-9 h-8 rounded font-bold ${isBar ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                  title={isBar ? `Incompatível (${INCOMPAT_LABELS[rel?.incompatType ?? 'outra']})${rel?.justification ? ' — ' + rel.justification : ''} — clique para voltar a compatível` : 'Compatível — clique para marcar incompatível'}
                                  onClick={() => toggle(oa.id, ob.id)}
                                >
                                  {isBar ? '✕' : '•'}
                                </button>
                                {isBar && (
                                  <button
                                    className="w-5 h-8 text-xs text-slate-400 hover:text-indigo-600"
                                    title="Detalhar tipo e justificativa (opcional)"
                                    onClick={() => setEditPair({ a: oa.id, b: ob.id })}
                                  >
                                    ✎
                                  </button>
                                )}
                              </div>
                            </Td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            );
          })}

          {editPair && editRel && (
            <Card className="mb-4 border-indigo-300">
              <div className="font-semibold text-sm text-indigo-700 mb-2">
                Detalhar option bar (opcional): {optById[editPair.a]?.label} ✕ {optById[editPair.b]?.label}
              </div>
              <div className="grid md:grid-cols-3 gap-3 items-end">
                <Field label="Tipo de incompatibilidade">
                  <Select
                    value={editRel.incompatType ?? 'outra'}
                    onChange={(e) => setDetails(editPair.a, editPair.b, e.target.value as IncompatType, editRel.justification ?? '')}
                  >
                    {INCOMPAT_TYPES.map((t) => <option key={t} value={t}>{INCOMPAT_LABELS[t]}</option>)}
                  </Select>
                </Field>
                <Field label="Justificativa (opcional)">
                  <TextInput
                    value={editRel.justification ?? ''}
                    onChange={(e) => setDetails(editPair.a, editPair.b, editRel.incompatType ?? 'outra', e.target.value)}
                    placeholder="Por que essas opções não podem coexistir?"
                  />
                </Field>
                <div className="mb-3"><Btn variant="secondary" onClick={() => setEditPair(null)}>Fechar</Btn></div>
              </div>
            </Card>
          )}

          {bars.length > 0 && (
            <Card>
              <div className="font-semibold text-sm text-slate-700 mb-2">Option bars registradas</div>
              <table className="w-full">
                <thead><tr><Th>Par</Th><Th>Tipo</Th><Th>Justificativa</Th><Th></Th></tr></thead>
                <tbody>
                  {bars.map((c) => (
                    <tr key={c.id}>
                      <Td className="whitespace-nowrap font-medium">{optById[c.a]?.label} ✕ {optById[c.b]?.label}</Td>
                      <Td><Badge color="red">{INCOMPAT_LABELS[c.incompatType ?? 'outra']}</Badge></Td>
                      <Td>{c.justification ?? <span className="text-slate-300 italic">sem justificativa (opcional)</span>}</Td>
                      <Td><Btn variant="ghost" onClick={() => setEditPair({ a: c.a, b: c.b })}>✎ detalhar</Btn></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- Etapa 8 — Gráfico de opções ----------------
export function Step8OptionsGraph() {
  const { project, update } = useProject();
  const focusAreas = project.areas.filter((a) => project.focusIds.includes(a.id));
  const [areaFilter, setAreaFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [optFilter, setOptFilter] = useState('');
  // o que as linhas representam: option bars (padrão) ou compatibilidades
  const [view, setView] = useState<'incompat' | 'compat'>('incompat');

  const shownAreas = areaFilter ? focusAreas.filter((a) => a.id === areaFilter) : focusAreas;
  const shownAreaIds = new Set(shownAreas.map((a) => a.id));
  const shownOptions = project.options.filter((o) => shownAreaIds.has(o.areaId));
  const shownOptIds = new Set(shownOptions.map((o) => o.id));
  const bars = project.compat.filter(
    (c) =>
      c.status === 'incompativel' &&
      shownOptIds.has(c.a) &&
      shownOptIds.has(c.b) &&
      (!typeFilter || (c.incompatType ?? 'outra') === typeFilter),
  );
  // grafo complementar: pares de áreas diferentes SEM option bar
  const compatLines = useMemo(() => {
    const list: typeof bars = [];
    for (let i = 0; i < shownOptions.length; i++) {
      for (let j = i + 1; j < shownOptions.length; j++) {
        const a = shownOptions[i];
        const b = shownOptions[j];
        if (a.areaId === b.areaId) continue;
        if (findRelation(project.compat, a.id, b.id)?.status !== 'incompativel') {
          list.push({ id: 'cp-' + a.id + '-' + b.id, a: a.id, b: b.id, status: 'compativel' });
        }
      }
    }
    return list;
  }, [shownOptions, project.compat]);
  const lines = view === 'incompat' ? bars : compatLines;

  /**
   * Simplificações da vista de incompatibilidades:
   * 1. OPÇÕES INVIÁVEIS — incompatíveis com TODAS as opções das demais
   *    áreas: ficam esmaecidas com ✕ e suas barras individuais somem.
   * 2. BARRA AGREGADA — opção incompatível com TODAS as opções de uma
   *    área: uma única linha grossa até o círculo daquela área.
   * 3. MULTIPLE OPTION BARS — cliques (≥3) de opções MUTUAMENTE
   *    incompatíveis, de áreas mutuamente conectadas, viram um nó
   *    central ○ com raios (Bron–Kerbosch, cliques maximais).
   * As demais incompatibilidades seguem como barras vermelhas normais.
   */
  const { redBars, hubs, areaBars, deadIds } = useMemo(() => {
    if (view !== 'incompat')
      return {
        redBars: bars,
        hubs: [] as { id: string; optionIds: string[]; title: string }[],
        areaBars: [] as { id: string; optionId: string; areaId: string; title: string }[],
        deadIds: [] as string[],
      };
    const optById = new Map(shownOptions.map((o) => [o.id, o]));
    const pairKey = (a: string, b: string) => [a, b].sort().join('|');
    const barSet = new Set(bars.map((b) => pairKey(b.a, b.b)));
    const areaLinked = (a: string, b: string) =>
      project.links.some((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a));

    // 1. opções inviáveis (incompatíveis com tudo)
    const deadIdsOut = shownOptions
      .filter((o) => {
        const othersOpts = shownOptions.filter((q) => q.areaId !== o.areaId);
        return othersOpts.length > 0 && othersOpts.every((q) => barSet.has(pairKey(o.id, q.id)));
      })
      .map((o) => o.id);
    const deadSet = new Set(deadIdsOut);

    // 2. barras agregadas (opção ✕ área inteira) — opções inviáveis
    //    não geram agregadas: o ✕ já comunica tudo
    const hiddenAgg = new Set<string>();
    const areaBarsOut: { id: string; optionId: string; areaId: string; title: string }[] = [];
    for (const o of shownOptions) {
      if (deadSet.has(o.id)) continue;
      for (const area of shownAreas) {
        if (area.id === o.areaId) continue;
        const yOpts = shownOptions.filter((y) => y.areaId === area.id);
        if (yOpts.length >= 2 && yOpts.every((y) => barSet.has(pairKey(o.id, y.id)))) {
          areaBarsOut.push({
            id: 'ab-' + o.id + '-' + area.id,
            optionId: o.id,
            areaId: area.id,
            title: `${o.label} é incompatível com TODAS as opções de ${area.label}`,
          });
          yOpts.forEach((y) => hiddenAgg.add(pairKey(o.id, y.id)));
        }
      }
    }

    // 3. cliques: par incompatível E áreas mutuamente conectadas,
    //    ignorando pares já agregados e opções inviáveis
    const adj = (u: string, v: string) => {
      if (deadSet.has(u) || deadSet.has(v)) return false;
      if (hiddenAgg.has(pairKey(u, v))) return false;
      if (!barSet.has(pairKey(u, v))) return false;
      const ou = optById.get(u);
      const ov = optById.get(v);
      return !!ou && !!ov && areaLinked(ou.areaId, ov.areaId);
    };

    // Bron–Kerbosch: cliques maximais de tamanho ≥ 3
    const cliques: string[][] = [];
    (function bk(R: string[], P: string[], X: string[]) {
      if (P.length === 0 && X.length === 0) {
        if (R.length >= 3) cliques.push(R);
        return;
      }
      let Pl = [...P];
      const Xl = [...X];
      for (const v of [...Pl]) {
        bk([...R, v], Pl.filter((u) => u !== v && adj(u, v)), Xl.filter((u) => adj(u, v)));
        Pl = Pl.filter((u) => u !== v);
        Xl.push(v);
      }
    })([], shownOptions.map((o) => o.id), []);

    const covered = new Set<string>();
    const hubsOut = cliques.map((c, i) => {
      for (let a = 0; a < c.length; a++)
        for (let b = a + 1; b < c.length; b++) covered.add(pairKey(c[a], c[b]));
      return {
        id: 'hub' + i,
        optionIds: c,
        title: 'Multiple option bar — ' + c.map((id) => optById.get(id)?.label).join(' ✕ ') + ' (mutuamente incompatíveis)',
      };
    });

    return {
      // barras individuais restantes: fora de cliques, fora de agregadas
      // e sem tocar opções inviáveis
      redBars: bars.filter(
        (b) =>
          !covered.has(pairKey(b.a, b.b)) &&
          !hiddenAgg.has(pairKey(b.a, b.b)) &&
          !deadSet.has(b.a) &&
          !deadSet.has(b.b),
      ),
      hubs: hubsOut,
      areaBars: areaBarsOut,
      deadIds: deadIdsOut,
    };
  }, [view, bars, shownOptions, shownAreas, project.links]);

  return (
    <div>
      <SectionTitle step="7" title="Construir o gráfico de opções" subtitle="Cada círculo grande é uma área de decisão; dentro dele, as opções. As linhas representam INCOMPATIBILIDADES (option bars) — não compatibilidades." />
      <Help>
        se há uma linha entre duas opções, elas <strong>não podem aparecer juntas</strong> no mesmo esquema de decisão.
        Você pode <strong>arrastar cada opção</strong> para reposicioná-la dentro do círculo da sua própria área (a opção
        não muda de área); a posição é salva no projeto e preservada ao recarregar. As linhas acompanham o movimento.
      </Help>
      {focusAreas.length === 0 ? (
        <Warn>Defina o foco (etapa 5) e cadastre opções (etapa 6).</Warn>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-3 items-center">
            {/* alternância: incompatibilidades ⇄ compatibilidades */}
            <div className="flex rounded-md overflow-hidden border border-stone-300">
              <button
                className={`px-3 py-1.5 text-sm font-medium ${view === 'incompat' ? 'bg-red-600 text-white' : 'bg-[#fdfcf7] text-stone-600 hover:bg-stone-100'}`}
                onClick={() => setView('incompat')}
              >
                Incompatibilidades
              </button>
              <button
                className={`px-3 py-1.5 text-sm font-medium ${view === 'compat' ? 'bg-green-700 text-white' : 'bg-[#fdfcf7] text-stone-600 hover:bg-stone-100'}`}
                onClick={() => setView('compat')}
              >
                Compatibilidades
              </button>
            </div>
            <Select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="!w-auto">
              <option value="">Todas as áreas em foco</option>
              {focusAreas.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </Select>
            {view === 'incompat' && (
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="!w-auto">
                <option value="">Todos os tipos de incompatibilidade</option>
                {INCOMPAT_TYPES.map((t) => <option key={t} value={t}>{INCOMPAT_LABELS[t]}</option>)}
              </Select>
            )}
            <Select value={optFilter} onChange={(e) => setOptFilter(e.target.value)} className="!w-auto">
              <option value="">Destacar opção…</option>
              {shownOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </Select>
            <Btn
              variant="secondary"
              onClick={() =>
                update((p) => {
                  p.options.forEach((o) => { delete o.ox; delete o.oy; });
                  p.areas.forEach((a) => { delete a.gx; delete a.gy; });
                })
              }
              title="Volta opções E áreas ao layout automático"
            >
              Restaurar layout automático
            </Btn>
          </div>
          <OptionsGraph
            areas={shownAreas}
            options={shownOptions}
            bars={view === 'incompat' ? redBars : lines}
            compatMode={view === 'compat'}
            hubs={view === 'incompat' ? hubs : []}
            areaBars={view === 'incompat' ? areaBars : []}
            deadOptionIds={view === 'incompat' ? deadIds : []}
            highlightOptionId={optFilter || null}
            onMoveOption={(id, ox, oy) =>
              update((p) => {
                const o = p.options.find((x) => x.id === id);
                if (o) { o.ox = ox; o.oy = oy; } // persiste no projeto → localStorage
              })
            }
            onMoveArea={(id, x, y) =>
              update((p) => {
                const a = p.areas.find((z) => z.id === id);
                if (a) { a.gx = x; a.gy = y; } // posição do cluster persistida
              })
            }
          />
          {view === 'incompat' ? (
            <p className="text-xs text-stone-600 mt-3">
              <span className="inline-block w-6 h-0.5 bg-red-600 align-middle mr-1.5" />
              linhas <strong className="text-red-600">vermelhas</strong> = option bars (tipo e justificativa no tooltip) ·{' '}
              <span className="inline-block w-3 h-3 rounded-full border-2 border-red-600 align-middle mr-1" />
              ○ = <strong>multiple option bar</strong> (opções mutuamente incompatíveis, de áreas mutuamente conectadas) ·{' '}
              <span className="inline-block w-6 h-1 bg-red-600 align-middle mr-1.5" />
              linha <strong>grossa</strong> até o círculo de uma área = incompatível com <strong>todas</strong> as opções
              daquela área · opção esmaecida com <strong className="text-red-600">✕</strong> = inviável (incompatível com
              todas as opções das demais áreas). Arraste opções E os círculos das áreas para reorganizar.
            </p>
          ) : (
            <p className="text-xs text-stone-600 mt-3">
              <span className="inline-block w-6 h-0.5 bg-green-700 align-middle mr-1.5" />
              linhas <strong className="text-green-700">verdes</strong> = compatibilidades (grafo complementar do AIDA):
              estas opções podem coexistir no mesmo esquema de decisão.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ---------------- Etapa 9 — Árvore ramificada de esquemas viáveis ----------------

interface TreeNode {
  id: string;
  opt: DecisionOption;
  level: number;
  children: TreeNode[];
  /** se bloqueado: opção anterior do caminho que gerou a incompatibilidade */
  blockedBy?: { optId: string; type: IncompatType; justification?: string };
  /** nome do esquema viável, quando o caminho chega ao fim sem conflito */
  scheme?: string;
  y: number;
}

/**
 * Constrói a árvore ramificada por busca em profundidade/backtracking:
 * percorre as áreas em foco NA ORDEM DE CADASTRO, abre um ramo por opção,
 * testa incompatibilidades contra todas as opções já escolhidas no caminho
 * (option bars), interrompe ramos conflitantes e nomeia os caminhos
 * completos como Esquema A, B, C... — a MESMA ordem de generateSchemes,
 * de modo que os nomes coincidem com a tabela e com as demais etapas.
 */
function buildTree(project: Project) {
  const focusAreas = project.areas.filter((a) => project.focusIds.includes(a.id));
  const optionsByArea = focusAreas.map((a) => project.options.filter((o) => o.areaId === a.id));
  let leafRow = 0;
  let schemeIdx = 0;
  let blockedCount = 0;

  function rec(level: number, partial: string[]): TreeNode[] {
    return optionsByArea[level].map((opt) => {
      // verificação de incompatibilidade com TODO o caminho já escolhido
      let blockedBy: TreeNode['blockedBy'];
      for (const chosen of partial) {
        const rel = findRelation(project.compat, chosen, opt.id);
        if (rel?.status === 'incompativel') {
          blockedBy = { optId: chosen, type: rel.incompatType ?? 'outra', justification: rel.justification };
          break;
        }
      }
      const node: TreeNode = { id: partial.join('.') + '.' + opt.id, opt, level, children: [], blockedBy, y: 0 };
      if (blockedBy) {
        blockedCount++;
        node.y = leafRow++; // ramo interrompido ocupa uma linha
      } else if (level === focusAreas.length - 1) {
        node.scheme = 'Esquema ' + letterName(schemeIdx++); // caminho viável completo
        node.y = leafRow++;
      } else {
        node.children = rec(level + 1, [...partial, opt.id]);
        node.y = node.children.reduce((s, c) => s + c.y, 0) / node.children.length;
      }
      return node;
    });
  }

  const roots = focusAreas.length > 0 && optionsByArea.every((l) => l.length > 0) ? rec(0, []) : [];
  return { roots, focusAreas, leaves: leafRow, blockedCount, schemes: schemeIdx };
}

/** Árvore SVG com estética de rascunho à lápis (usada também no relatório PDF). */
export function SchemeTreeSvg({ project }: { project: Project }) {
  const tree = useMemo(() => buildTree(project), [project]);
  const optById = Object.fromEntries(project.options.map((o) => [o.id, o]));
  const levels = tree.focusAreas.length;
  const clean = useDesign() === 'cientifico';

  if (tree.roots.length === 0) return <EmptyState>Sem áreas em foco com opções.</EmptyState>;
  if (tree.leaves > 300)
    return <Warn>A árvore tem {tree.leaves} ramos — grande demais para desenhar. Reduza o foco ou use a tabela abaixo.</Warn>;

  const colW = 165;
  const rowH = 32;
  const topPad = 52;
  const x = (level: number) => 130 + level * colW;
  const schemeX = x(levels - 1) + 95;
  const W = schemeX + 130;
  const H = topPad + tree.leaves * rowH + 20;
  const py = (row: number) => topPad + row * rowH + rowH / 2;
  const rootX = 35;
  const rootY = tree.roots.length > 0 ? tree.roots.reduce((s, r) => s + r.y, 0) / tree.roots.length : 0;

  const els: React.ReactNode[] = [];

  function draw(node: TreeNode, px: number, pyy: number) {
    const nx = x(node.level);
    const ny = py(node.y);
    // ramo orgânico (curva à lápis) do pai até o nó
    els.push(
      <path key={node.id + '-e'} d={sketchLine(px, pyy, nx - 34, ny, node.id, clean)} fill="none" stroke="#3f4a5a" strokeWidth={1.8} strokeLinecap="round" opacity={0.8} />,
    );
    // rótulo da opção
    els.push(
      <g key={node.id + '-n'}>
        <text x={nx} y={ny + 4} textAnchor="middle" fontSize={13} fontWeight={700} fill={node.blockedBy ? '#94a3b8' : '#1e293b'}>
          {node.opt.label}
        </text>
        <title>{node.opt.name}</title>
      </g>,
    );
    if (node.blockedBy) {
      // ramo interrompido: X vermelho + motivo em tooltip
      const reason = `Incompatível com ${optById[node.blockedBy.optId]?.label} (${INCOMPAT_LABELS[node.blockedBy.type]})${node.blockedBy.justification ? ' — ' + node.blockedBy.justification : ''}`;
      els.push(
        <g key={node.id + '-x'}>
          <path d={sketchLine(nx + 26, ny, nx + 52, ny, node.id + 'stub', clean)} fill="none" stroke="#ef4444" strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
          <text x={nx + 62} y={ny + 5} fontSize={15} fontWeight={700} fill="#ef4444">✕</text>
          <title>{reason}</title>
        </g>,
      );
    } else if (node.scheme) {
      // caminho viável completo: nome do esquema alinhado à direita
      els.push(
        <g key={node.id + '-s'}>
          <path d={sketchLine(nx + 30, ny, schemeX - 12, ny, node.id + 'end', clean)} fill="none" stroke="#3f4a5a" strokeWidth={1.8} strokeLinecap="round" opacity={0.8} />
          <text x={schemeX} y={ny + 4} fontSize={13.5} fontWeight={700} fill="#15803d">
            {node.scheme}
          </text>
          {project.baseSchemeKey && node.scheme && null}
        </g>,
      );
    } else {
      node.children.forEach((c) => draw(c, nx + 30, ny));
    }
  }

  tree.roots.forEach((r) => draw(r, rootX + 12, py(rootY)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${clean ? 'bg-white border-stone-400' : 'bg-[#fbfaf6] border-slate-200'} border rounded-lg select-none hand`} style={{ maxHeight: '75vh' }}>
      {/* rótulos das áreas de decisão no topo de cada coluna */}
      {tree.focusAreas.map((a, i) => (
        <g key={a.id}>
          <text x={x(i)} y={24} textAnchor="middle" fontSize={15} fontWeight={700} fill="#4f46e5">{a.label}</text>
          <path d={sketchLine(x(i) - 45, 32, x(i) + 45, 32, a.id + 'u', clean)} fill="none" stroke="#4f46e5" strokeWidth={1.4} opacity={0.5} />
        </g>
      ))}
      <text x={schemeX} y={24} fontSize={15} fontWeight={700} fill="#15803d">Esquemas viáveis</text>
      {/* ponto de partida */}
      <path d={blobPath(rootX, py(rootY), 7, 'root', clean)} fill="#eef2ff" stroke="#4f46e5" strokeWidth={2} />
      {els}
      <text x={10} y={H - 8} fontSize={12} fill="#64748b">✕ = ramo interrompido por option bar (passe o mouse para ver o motivo)</text>
    </svg>
  );
}

export function Step9Schemes() {
  const { project, update } = useProject();
  const gen = useMemo(() => generateSchemes(project), [project]);
  const optById = Object.fromEntries(project.options.map((o) => [o.id, o]));
  const [showTable, setShowTable] = useState(true);

  return (
    <div>
      <SectionTitle step="8" title="Gerar esquemas de decisão viáveis (árvore ramificada)" subtitle="Um esquema contém exatamente uma opção de cada área em foco, sem nenhum par interno incompatível." />
      <Help>
        a árvore percorre as áreas em foco na ordem de cadastro e abre um ramo por opção (busca em
        profundidade/backtracking). Quando uma opção é incompatível com alguma já escolhida no caminho, o ramo é
        interrompido com ✕. Cada caminho completo sem conflito vira um esquema viável, nomeado à direita. O SCA muda a
        lógica de “escolher a melhor alternativa isolada” para <strong>construir combinações viáveis de decisões
        interdependentes</strong>.
      </Help>
      {!gen.ok ? (
        <Warn>{gen.error}</Warn>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <Card><div className="text-2xl font-bold text-slate-700">{gen.totalCombos}</div><div className="text-xs text-slate-500">combinações possíveis (antes da filtragem)</div></Card>
            <Card><div className="text-2xl font-bold text-green-700">{gen.schemes.length}</div><div className="text-xs text-slate-500">esquemas de decisão viáveis</div></Card>
            <Card><div className="text-2xl font-bold text-red-600">{gen.eliminated.length}</div><div className="text-xs text-slate-500">ramos interrompidos (✕)</div></Card>
            <Card><div className="text-2xl font-bold text-red-600">{gen.totalCombos - gen.schemes.length}</div><div className="text-xs text-slate-500">combinações eliminadas no total</div></Card>
          </div>

          {/* Árvore ramificada (visual principal) */}
          <SchemeTreeSvg project={project} />

          <p className="text-xs text-stone-500 my-4">
            A linha de base para as comparações é escolhida na <strong>etapa 10</strong> (avaliação relativa).
          </p>

          {gen.eliminated.length > 0 && (
            <Card className="mb-4">
              <div className="font-semibold text-sm text-slate-700 mb-2">Ramos eliminados e motivo (poda por incompatibilidade)</div>
              <table className="w-full">
                <thead><tr><Th>Combinação parcial bloqueada</Th><Th>Option bar violada</Th><Th>Combinações removidas</Th></tr></thead>
                <tbody>
                  {gen.eliminated.map((e, i) => (
                    <tr key={i}>
                      <Td>{e.optionIds.map((id) => optById[id]?.label ?? '?').join(' + ')}</Td>
                      <Td className="text-red-600">{optById[e.conflict[0]]?.label} ✕ {optById[e.conflict[1]]?.label}</Td>
                      <Td>{e.combosRemoved}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <Btn variant="secondary" onClick={() => setShowTable(!showTable)}>{showTable ? 'Ocultar' : 'Mostrar'} tabela resumida dos esquemas</Btn>
          {showTable && (
            <Card className="mt-3 overflow-x-auto">
              {gen.schemes.length === 0 ? (
                <EmptyState>Nenhum esquema viável: as option bars eliminaram todas as combinações. Revise a matriz de compatibilidade.</EmptyState>
              ) : (
                <table className="w-full">
                  <thead><tr><Th>Esquema</Th><Th>Composição (uma opção por área)</Th></tr></thead>
                  <tbody>
                    {gen.schemes.map((s) => (
                      <tr key={s.key} className={s.key === project.baseSchemeKey ? 'bg-indigo-50' : ''}>
                        <Td className="font-semibold whitespace-nowrap">{s.name}{s.key === project.baseSchemeKey && <Badge color="indigo"> base</Badge>}</Td>
                        <Td>{s.optionIds.map((id) => optById[id]?.label ?? '?').join('  +  ')}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
