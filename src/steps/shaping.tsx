// ============================================================
// Modo SHAPING — etapas 1 a 6: problema, áreas de decisão,
// conexões, gráfico de decisão, priorização e foco
// ============================================================
import React, { useState } from 'react';
import { useProject } from '../store';
import { graphMetrics, uid } from '../lib/sca';
import { AreaRatings, DecisionArea, Priority } from '../types';
import { Badge, Btn, Card, EmptyState, Field, Help, Scale15, SectionTitle, Select, TextArea, TextInput, Td, Th, Warn } from '../components/ui';
import { DecisionGraph } from '../components/graphs';

// ---------------- Etapa 1 — Definir o problema ----------------
export function Step1Problem() {
  const { project, update } = useProject();
  return (
    <div>
      <SectionTitle
        step="1"
        title="Definir o problema de decisão"
        subtitle="Formule a situação problemática em termos de decisões a serem tomadas — não de sintomas ou reclamações."
      />
      <Help>
        o SCA não começa com uma “solução” nem com um diagnóstico genérico (ex.: “a região está em declínio”). Ele força a
        pergunta: <em>quais escolhas concretas precisam ser feitas para que algum avanço seja possível?</em> O problema é
        organizado como um campo de escolhas interdependentes, não como um sistema a ser otimizado de uma vez.
      </Help>
      <Card>
        <Field label="Situação problemática" hint="Descreva livremente o contexto, os sintomas e as preocupações.">
          <TextArea
            rows={5}
            value={project.problem.situation}
            onChange={(e) => update((p) => void (p.problem.situation = e.target.value))}
            placeholder="Ex.: O distrito enfrenta declínio urbano, com habitações degradadas e indefinição sobre obras viárias..."
          />
        </Field>
        <Field
          label="Reformulação como conjunto de decisões concretas"
          hint='Transforme os sintomas em escolhas: "decidir X", "escolher entre Y e Z". Essas frases darão origem às áreas de decisão da etapa 2.'
        >
          <TextArea
            rows={5}
            value={project.problem.decisions}
            onChange={(e) => update((p) => void (p.problem.decisions = e.target.value))}
            placeholder="Ex.: Decidir a rota da via arterial; escolher a localização do centro comercial; definir o uso do terreno central..."
          />
        </Field>
      </Card>
    </div>
  );
}

// ---------------- Etapa 2 — Lista de áreas de decisão ----------------
const defaultRatings = (): AreaRatings => ({ centralidade: 3, urgencia: 3, consequencia: 3, incerteza: 3, governabilidade: 3, controversia: 3 });

function AreaForm({ initial, onSave, onCancel }: { initial?: DecisionArea; onSave: (a: DecisionArea) => void; onCancel?: () => void }) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [question, setQuestion] = useState(initial?.question ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [err, setErr] = useState('');

  function save() {
    const lab = label.trim();
    const q = question.trim();
    if (!lab || !q) return setErr('Rótulo e pergunta decisória são obrigatórios.');
    if (!q.includes('?')) return setErr('A pergunta decisória deve ser uma pergunta de escolha (deve conter "?"). Ex.: "Qual rota escolher?" — e não um tema genérico como "transporte".');
    onSave({
      id: initial?.id ?? uid(),
      label: lab.endsWith('?') ? lab : lab + '?', // convenção do SCA
      question: q,
      description,
      notes,
      ratings: initial?.ratings ?? defaultRatings(),
      priority: initial?.priority ?? null,
      x: initial?.x ?? 120 + Math.random() * 600,
      y: initial?.y ?? 100 + Math.random() * 300,
    });
    if (!initial) {
      setLabel(''); setQuestion(''); setDescription(''); setNotes('');
    }
    setErr('');
  }

  return (
    <Card className="mb-4">
      <div className="grid md:grid-cols-2 gap-x-4">
        <Field label="Pergunta decisória completa" hint='Deve ser uma pergunta de escolha. "Transporte" é tema; "Qual rota escolher para a via arterial?" é área de decisão.'>
          <TextInput value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Qual rota escolher para a via arterial?" />
        </Field>
        <Field label='Rótulo curto (termina com "?")' hint="Usado nos diagramas. Ex.: ROAD LINE?">
          <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ROAD LINE?" />
        </Field>
        <Field label="Descrição">
          <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Observações">
          <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      {err && <Warn>{err}</Warn>}
      <div className="flex gap-2">
        <Btn onClick={save}>{initial ? 'Salvar alterações' : 'Adicionar área de decisão'}</Btn>
        {onCancel && <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>}
      </div>
    </Card>
  );
}

export function Step2Areas() {
  const { project, update } = useProject();
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div>
      <SectionTitle step="2" title="Criar a lista de decisões" subtitle="Cada item deve ser uma decisão real formulada como pergunta — não uma variável ou tema solto." />
      <Help>
        uma <strong>área de decisão</strong> é uma pergunta que exige escolha entre opções alternativas. O círculo no
        diagrama não representa uma alternativa, mas uma <em>categoria de escolha</em>. Por convenção, o rótulo curto
        termina com “?” (ex.: ROAD LINE?, SHOP LOC’N?).
      </Help>
      <AreaForm onSave={(a) => update((p) => void p.areas.push(a))} />
      {project.areas.length === 0 ? (
        <EmptyState>Nenhuma área de decisão cadastrada ainda.</EmptyState>
      ) : (
        /* Tabela em estilo manuscrito (caderno/lápis), como nos
           diagramas clássicos do SCA: pergunta à esquerda, rótulo à direita */
        <Card className="hand bg-[#fbfaf6] px-6 py-5">
          <div className="flex justify-between items-baseline border-b-2 border-stone-400/70 pb-1 mb-4">
            <span className="text-xl tracking-wide text-stone-800 font-bold uppercase">Área de decisão</span>
            <span className="text-xl tracking-wide text-stone-800 font-bold uppercase">Rótulo</span>
          </div>
          <div className="space-y-5">
            {project.areas.map((a) =>
              editing === a.id ? (
                <AreaForm
                  key={a.id}
                  initial={a}
                  onSave={(na) => {
                    update((p) => {
                      const i = p.areas.findIndex((x) => x.id === a.id);
                      p.areas[i] = na;
                    });
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div key={a.id} className="flex justify-between items-start gap-6 group">
                  <div className="min-w-0">
                    <div className="text-xl leading-snug text-stone-800 lowercase">{a.question}</div>
                    {a.description && <div className="text-base text-stone-500">{a.description}</div>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xl font-bold text-stone-900 whitespace-nowrap uppercase">{a.label}</span>
                    <span className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity font-sans">
                      <Btn variant="ghost" onClick={() => setEditing(a.id)}>Editar</Btn>
                      <Btn
                        variant="danger"
                        onClick={() =>
                          update((p) => {
                            p.areas = p.areas.filter((x) => x.id !== a.id);
                            p.links = p.links.filter((l) => l.from !== a.id && l.to !== a.id);
                            p.focusIds = p.focusIds.filter((id) => id !== a.id);
                            const removedOpts = p.options.filter((o) => o.areaId === a.id).map((o) => o.id);
                            p.options = p.options.filter((o) => o.areaId !== a.id);
                            p.compat = p.compat.filter((c) => !removedOpts.includes(c.a) && !removedOpts.includes(c.b));
                          })
                        }
                      >
                        Excluir
                      </Btn>
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>
          <p className="text-xs text-stone-400 mt-4 font-sans">Passe o mouse sobre uma linha para editar ou excluir.</p>
        </Card>
      )}
    </div>
  );
}

// ---------------- Etapa 3 — Conexões (matriz + lista) ----------------

/**
 * Matriz quadrada de conexões entre áreas de decisão (metade superior).
 * Clique cíclico: vazio (sem conexão) → M (moderada) → F (forte) → vazio.
 * A matriz e o gráfico de decisão compartilham o MESMO estado
 * (project.links), portanto ficam sempre sincronizados nos dois sentidos.
 */
export function ConnectionMatrix() {
  const { project, update } = useProject();
  const areas = project.areas;

  function getLink(a: string, b: string) {
    return project.links.find((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a));
  }

  function cycle(a: string, b: string) {
    update((p) => {
      const link = p.links.find((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a));
      if (!link) p.links.push({ id: uid(), from: a, to: b, description: '', strength: 'moderada' }); // vazio → M
      else if (link.strength === 'moderada') link.strength = 'forte'; // M → F
      else p.links = p.links.filter((l) => l.id !== link.id); // F → vazio
    });
  }

  return (
    <Card className="mb-4 overflow-x-auto">
      <div className="font-semibold text-sm text-slate-700 mb-1">Matriz de conexões entre áreas de decisão</div>
      <p className="text-xs text-slate-500 mb-3">
        Clique na célula para alternar: vazio = sem conexão → <strong>M</strong> = moderada → <strong>F</strong> = forte → vazio.
        Apenas a metade superior é preenchida (a relação não tem direção). Alterações aqui atualizam o gráfico de decisão automaticamente, e vice-versa.
      </p>
      <table>
        <thead>
          <tr><Th></Th>{areas.map((a) => <Th key={a.id}>{a.label}</Th>)}</tr>
        </thead>
        <tbody>
          {areas.map((ra, i) => (
            <tr key={ra.id}>
              <Td className="font-semibold whitespace-nowrap">{ra.label}</Td>
              {areas.map((ca, j) => {
                if (i === j)
                  return <Td key={ca.id}><div className="w-9 h-8 rounded bg-slate-300/60" title="diagonal desabilitada" /></Td>;
                if (j < i) return <Td key={ca.id}><div className="w-9 h-8" /></Td>; // metade inferior não preenchível
                const link = getLink(ra.id, ca.id);
                const s = link?.strength;
                const cls = s === 'forte' ? 'bg-indigo-600 text-white' : s === 'moderada' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-300';
                return (
                  <Td key={ca.id}>
                    <button
                      className={`w-9 h-8 rounded font-bold text-sm ${cls}`}
                      title={link ? `${s === 'forte' ? 'Conexão forte' : 'Conexão moderada'}${link.description ? ' — ' + link.description : ''} (clique para alternar)` : 'sem conexão (clique para criar moderada)'}
                      onClick={() => cycle(ra.id, ca.id)}
                    >
                      {s === 'forte' ? 'F' : s === 'moderada' ? 'M' : ''}
                    </button>
                  </Td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-500 mt-2">No gráfico: <strong>F</strong> = linha contínua · <strong>M</strong> = linha tracejada.</p>
    </Card>
  );
}

export function Step3Links() {
  const { project, update } = useProject();
  const byId = Object.fromEntries(project.areas.map((a) => [a.id, a]));

  return (
    <div>
      <SectionTitle step="3" title="Identificar áreas de decisão e conexões" subtitle="Conexões representam interdependência, influência ou condicionamento entre decisões — não causalidade rígida nem ordem cronológica." />
      <Help>
        a linha entre duas áreas indica que as decisões <em>não são independentes</em>: escolher em uma área pode afetar o
        que é viável ou desejável na outra, em qualquer direção. ROAD LINE? — SHOP LOC’N? significa que a rota da via pode
        afetar a localização viável do comércio, ou o contrário. A intensidade (forte/moderada) registra o quão relevante o
        grupo considera a interdependência.
      </Help>
      {project.areas.length < 2 ? (
        <Warn>Cadastre pelo menos duas áreas de decisão na etapa 2 antes de criar conexões.</Warn>
      ) : (
        <ConnectionMatrix />
      )}
      {project.links.length > 0 && (
        <Card>
          <div className="font-semibold text-sm text-slate-700 mb-2">Conexões existentes (edite intensidade e descrição)</div>
          <table className="w-full">
            <thead><tr><Th>Conexão</Th><Th>Intensidade</Th><Th>Descrição</Th><Th>Ações</Th></tr></thead>
            <tbody>
              {project.links.map((l) => (
                <tr key={l.id}>
                  <Td className="whitespace-nowrap font-medium">{byId[l.from]?.label} — {byId[l.to]?.label}</Td>
                  <Td>
                    <Select
                      value={l.strength}
                      className="!w-auto"
                      onChange={(e) => update((p) => { const x = p.links.find((y) => y.id === l.id); if (x) x.strength = e.target.value as 'forte' | 'moderada'; })}
                    >
                      <option value="forte">Forte (linha contínua)</option>
                      <option value="moderada">Moderada (linha tracejada)</option>
                    </Select>
                  </Td>
                  <Td>
                    <TextInput
                      value={l.description}
                      placeholder="descrição da interdependência (opcional)"
                      onChange={(e) => update((p) => { const x = p.links.find((y) => y.id === l.id); if (x) x.description = e.target.value; })}
                    />
                  </Td>
                  <Td><Btn variant="danger" onClick={() => update((p) => void (p.links = p.links.filter((x) => x.id !== l.id)))}>Remover</Btn></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ---------------- Etapa 4 — Gráfico de decisão ----------------
export function Step4Graph() {
  const { project, update } = useProject();
  const [connectMode, setConnectMode] = useState(false);
  const [newStrength, setNewStrength] = useState<'forte' | 'moderada'>('forte');
  const metrics = graphMetrics(project.areas, project.links);

  return (
    <div>
      <SectionTitle step="4" title="Criar o gráfico de decisão" subtitle="Mapa visual do “território decisório”: quais decisões existem e como dependem umas das outras." />
      <Help>
        este gráfico <strong>não é um fluxograma cronológico</strong>. Ele não diz “primeiro decida isto, depois aquilo”;
        mostra interdependência entre escolhas. Áreas mais conectadas tendem a ser estruturalmente mais importantes.
        Arraste os nós para reorganizar; use o modo conectar para criar ligações; clique no “×” sobre uma linha para removê-la.
        Linha contínua = conexão forte · linha tracejada = conexão moderada. Tudo fica sincronizado com a matriz da etapa 3.
      </Help>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Btn variant={connectMode ? 'primary' : 'secondary'} onClick={() => setConnectMode(!connectMode)}>
          {connectMode ? 'Modo conectar: ATIVO' : 'Ativar modo conectar'}
        </Btn>
        {connectMode && (
          <>
            <span className="text-sm text-slate-600">criar nova conexão como:</span>
            <Select value={newStrength} onChange={(e) => setNewStrength(e.target.value as 'forte' | 'moderada')} className="!w-auto">
              <option value="forte">Forte (contínua)</option>
              <option value="moderada">Moderada (tracejada)</option>
            </Select>
            <span className="text-xs text-slate-400">(o tipo pode ser alterado depois, na etapa 3)</span>
          </>
        )}
      </div>
      <DecisionGraph
        areas={project.areas}
        links={project.links}
        focusIds={project.focusIds}
        degree={metrics.degree}
        connectMode={connectMode}
        onMove={(id, x, y) =>
          update((p) => {
            const a = p.areas.find((x) => x.id === id);
            if (a) { a.x = x; a.y = y; }
          })
        }
        onConnect={(a, b) =>
          update((p) => {
            if (!p.links.some((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a)))
              p.links.push({ id: uid(), from: a, to: b, description: '', strength: newStrength });
          })
        }
        onRemoveLink={(id) => update((p) => void (p.links = p.links.filter((l) => l.id !== id)))}
      />
      <div className="grid md:grid-cols-4 gap-3 mt-4">
        <Card><div className="text-2xl font-bold text-indigo-700">{metrics.totalLinks}</div><div className="text-xs text-slate-500">conexões no total</div></Card>
        <Card>
          <div className="text-sm font-semibold text-slate-700 mb-1">Grau de conexão</div>
          <div className="text-xs text-slate-500 space-y-0.5">
            {project.areas.map((a) => <div key={a.id}>{a.label}: <strong>{metrics.degree[a.id]}</strong></div>)}
          </div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-slate-700 mb-1">Áreas mais centrais</div>
          <div className="flex flex-wrap gap-1">{metrics.central.map((a) => <Badge key={a.id} color="indigo">{a.label}</Badge>)}</div>
        </Card>
        <Card>
          <div className="text-sm font-semibold text-slate-700 mb-1">Áreas isoladas</div>
          {metrics.isolated.length === 0 ? <span className="text-xs text-slate-400">nenhuma</span> :
            <div className="flex flex-wrap gap-1">{metrics.isolated.map((a) => <Badge key={a.id} color="amber">{a.label}</Badge>)}</div>}
        </Card>
      </div>
    </div>
  );
}

// ---------------- Priorização (OCULTA do fluxo do wizard) ----------------
// Mantida no código caso o usuário queira reativá-la no futuro
// (basta reincluí-la em MODES, no App.tsx).
const CRITERIA: { key: keyof AreaRatings; label: string; question: string }[] = [
  { key: 'centralidade', label: 'Centralidade', question: 'Essa área se conecta a várias outras?' },
  { key: 'urgencia', label: 'Urgência', question: 'Essa decisão precisa ser tomada logo?' },
  { key: 'consequencia', label: 'Consequência', question: 'Essa decisão condiciona fortemente as demais?' },
  { key: 'incerteza', label: 'Incerteza', question: 'Há muitas dúvidas técnicas, políticas ou procedurais?' },
  { key: 'governabilidade', label: 'Governabilidade', question: 'O grupo tem poder real para decidir sobre isso?' },
  { key: 'controversia', label: 'Controvérsia', question: 'Essa decisão concentra conflito entre atores?' },
];

export function Step5Prioritize() {
  const { project, update } = useProject();
  const score = (r: AreaRatings) => CRITERIA.reduce((s, c) => s + r[c.key], 0);

  return (
    <div>
      <SectionTitle step="5" title="Escolher áreas relevantes (focalização estratégica)" subtitle="Avalie cada área pelos seis critérios e classifique-a. A pontuação é apenas auxiliar." />
      <Help>
        a pontuação <strong>não substitui o julgamento do grupo</strong>. Ela apenas apoia a conversa sobre onde concentrar
        energia analítica. A classificação final (prioritária / secundária / fora do foco atual) é uma decisão deliberativa.
      </Help>
      {project.areas.length === 0 ? (
        <EmptyState>Cadastre áreas de decisão na etapa 2.</EmptyState>
      ) : (
        <div className="space-y-4">
          {project.areas.map((a) => (
            <Card key={a.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <span className="font-bold text-slate-800">{a.label}</span>
                  <span className="text-sm text-slate-500 ml-2">{a.question}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color="indigo">pontuação auxiliar: {score(a.ratings)}/30</Badge>
                  <Select
                    value={a.priority ?? ''}
                    onChange={(e) =>
                      update((p) => {
                        const x = p.areas.find((y) => y.id === a.id);
                        if (x) x.priority = (e.target.value || null) as Priority | null;
                      })
                    }
                    className="!w-auto"
                  >
                    <option value="">— classificar —</option>
                    <option value="prioritaria">Prioritária</option>
                    <option value="secundaria">Secundária</option>
                    <option value="fora">Fora do foco atual</option>
                  </Select>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                {CRITERIA.map((c) => (
                  <div key={c.key} className="flex items-center justify-between gap-2 bg-slate-50 rounded p-2">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{c.label}</div>
                      <div className="text-xs text-slate-400">{c.question}</div>
                    </div>
                    <Scale15
                      value={a.ratings[c.key]}
                      onChange={(v) =>
                        update((p) => {
                          const x = p.areas.find((y) => y.id === a.id);
                          if (x) x.ratings[c.key] = v;
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------- Etapa 6 — Foco do problema ----------------
export function Step6Focus() {
  const { project, update } = useProject();
  const metrics = graphMetrics(project.areas, project.links);
  const [lasso, setLasso] = useState(true);

  return (
    <div>
      <SectionTitle step="5" title="Escolher o foco do problema" subtitle="Circule com o mouse, como um lápis, as áreas que serão analisadas em profundidade neste ciclo." />
      <Help>
        as áreas fora do foco <strong>não são descartadas</strong>: apenas não participam da combinação de opções neste
        ciclo de análise. O SCA é incremental — o foco pode ser revisto em ciclos futuros. Nos diagramas clássicos do SCA,
        o foco é delimitado por uma <em>linha tracejada desenhada à mão</em> em volta das áreas escolhidas — faça o mesmo
        aqui: desenhe um laço em volta delas. Os checkboxes ficam como alternativa para ajustes finos.
      </Help>
      {project.areas.length === 0 ? (
        <EmptyState>Cadastre áreas de decisão na etapa 2.</EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Btn variant={lasso ? 'primary' : 'secondary'} onClick={() => setLasso(!lasso)}>
              {lasso ? '✏ Modo lápis: circule o foco' : '✏ Ativar modo lápis (circular foco)'}
            </Btn>
            {lasso && <span className="text-xs text-stone-500">Pressione o mouse no papel e desenhe um laço em volta das áreas. Ao soltar, as áreas dentro do laço viram o foco.</span>}
          </div>
          <DecisionGraph
            areas={project.areas}
            links={project.links}
            focusIds={project.focusIds}
            degree={metrics.degree}
            lassoMode={lasso}
            showFocusHull
            onLasso={(ids) =>
              update((p) => {
                if (ids.length > 0) p.focusIds = ids;
              })
            }
          />
          <Card className="my-4">
            <div className="text-sm font-semibold text-stone-700 mb-2">Ajuste fino (alternativa ao laço)</div>
            <div className="grid md:grid-cols-2 gap-2">
              {project.areas.map((a) => (
                <label key={a.id} className="flex items-center gap-2 p-2 rounded hover:bg-stone-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={project.focusIds.includes(a.id)}
                    onChange={(e) =>
                      update((p) => {
                        p.focusIds = e.target.checked ? [...p.focusIds, a.id] : p.focusIds.filter((id) => id !== a.id);
                      })
                    }
                  />
                  <span className="font-medium text-sm">{a.label}</span>
                  <span className="text-xs text-stone-400">{a.priority ? `(${a.priority})` : ''}</span>
                </label>
              ))}
            </div>
            {project.focusIds.length === 0 && <Warn>Nenhuma área selecionada — sem foco não é possível gerar esquemas de decisão.</Warn>}
          </Card>
          <p className="text-xs text-stone-500 mt-2">
            Dentro do foco: {project.areas.filter((a) => project.focusIds.includes(a.id)).map((a) => a.label).join(', ') || '—'} ·
            Fora (temporariamente): {project.areas.filter((a) => !project.focusIds.includes(a.id)).map((a) => a.label).join(', ') || '—'}
          </p>
        </>
      )}
    </div>
  );
}
