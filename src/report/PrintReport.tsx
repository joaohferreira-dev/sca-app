// ============================================================
// Relatório em PDF — vista de impressão no espírito do caderno.
// Usa o diálogo de impressão do navegador ("Salvar como PDF"):
// os SVGs permanecem VETORIAIS, garantindo nitidez total na
// árvore de esquemas e nos gráficos, em qualquer ampliação.
// ============================================================
import React, { useState } from 'react';
import { useProject } from '../store';
import { DesignContext, ReportDesign } from '../design';
import { generateSchemes, graphMetrics } from '../lib/sca';
import { DecisionGraph, OptionsGraph } from '../components/graphs';
import { SchemeTreeSvg } from '../steps/designing';
import { AdvantageChart, HandComparisonTable } from '../steps/comparing';

const EVAL_LABEL: Record<string, string> = {
  numerica: 'Numérica',
  monetaria: 'Monetária',
  ordinal: 'Ordinal',
  linguistica: 'Linguística',
  qualitativa: 'Qualitativa',
  mista: 'Mista',
};

const WORTH_LABEL: Record<string, string> = {
  sim: 'Sim — explorar',
  nao: 'Não — aceitar a incerteza',
  avaliar: 'Em avaliação',
};

/** Separa "?SITEJOBS — atratividade do terreno..." em rótulo e texto. */
function splitUncertainty(u: { title: string; description: string }): { label: string; text: string } {
  const parts = u.title.split('—');
  if (parts.length >= 2) return { label: parts[0].trim(), text: parts.slice(1).join('—').trim() };
  return { label: u.title.trim(), text: u.description };
}

/** Seção do relatório: título caligráfico + texto conector. */
function Section({
  title,
  lead,
  children,
  breakBefore,
}: {
  title: string;
  lead?: string;
  children: React.ReactNode;
  breakBefore?: boolean;
}) {
  return (
    <section className={`${breakBefore ? 'page-break ' : ''}mt-12`}>
      <h2 className="hand2 text-4xl font-bold text-stone-900 leading-tight">{title}</h2>
      {lead && <p className="hand text-xl text-stone-600 mt-1 mb-5 leading-snug">{lead}</p>}
      {children}
    </section>
  );
}

/** Cabeçalho de tabela manuscrita. */
function HandHead({ cols, grid }: { cols: string[]; grid: string }) {
  return (
    <div className={`grid ${grid} gap-x-6 border-b-2 border-stone-400/70 pb-1 mb-3`}>
      {cols.map((c) => (
        <span key={c} className="text-xl font-bold uppercase text-stone-800 hand">{c}</span>
      ))}
    </div>
  );
}

export default function PrintReport({ onBack }: { onBack: () => void }) {
  const { project } = useProject();
  const [design, setDesign] = useState<ReportDesign>('caderno');
  const sci = design === 'cientifico';
  const metrics = graphMetrics(project.areas, project.links);
  const gen = generateSchemes(project);
  const focusAreas = project.areas.filter((a) => project.focusIds.includes(a.id));
  const focusOptions = project.options.filter((o) => project.focusIds.includes(o.areaId));
  const focusOptIds = new Set(focusOptions.map((o) => o.id));
  const bars = project.compat.filter((c) => c.status === 'incompativel' && focusOptIds.has(c.a) && focusOptIds.has(c.b));
  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  // linha de base e comparações para as seções 8 e 9
  const baseScheme = gen.ok ? gen.schemes.find((s) => s.key === project.baseSchemeKey) : undefined;
  const otherSchemes = gen.ok ? gen.schemes.filter((s) => s.key !== project.baseSchemeKey) : [];
  const judgedSchemes = otherSchemes.filter((s) => project.judgments.some((j) => j.schemeKey === s.key));
  const getJFor = (schemeKey: string) => (areaId: string) => {
    const j = project.judgments.find((x) => x.schemeKey === schemeKey && x.comparisonAreaId === areaId);
    return { min: j?.min ?? 0, max: j?.max ?? 0, best: j?.best ?? Math.round(((j?.min ?? 0) + (j?.max ?? 0)) / 2) };
  };

  // pacote de compromisso (seção 12): áreas selecionadas e resolvedores id → texto
  const pkgAreas = project.areas.filter((a) => (project.commitmentAreaIds ?? []).includes(a.id));
  const optByIdR = Object.fromEntries(project.options.map((o) => [o.id, o]));

  return (
   <DesignContext.Provider value={design}>
    <div className={`min-h-screen print:bg-white ${sci ? 'bg-stone-200' : 'bg-[#f1ecdf]'}`}>
      {/* barra de ações — não sai na impressão */}
      <div className="print:hidden sticky top-0 z-10 bg-stone-900 text-amber-50 px-6 py-3 flex flex-wrap items-center gap-3 shadow-md">
        <button onClick={() => window.print()} className="px-4 py-1.5 rounded-md bg-amber-50 text-stone-900 text-sm font-semibold hover:bg-amber-100">
          🖨 Salvar como PDF
        </button>
        <button onClick={onBack} className="px-4 py-1.5 rounded-md border border-stone-500 text-sm hover:bg-stone-800">
          ← Voltar à aplicação
        </button>

        {/* seletor de design do relatório */}
        <div className="flex items-center gap-2 ml-2 pl-3 border-l border-stone-700">
          <span className="text-xs text-stone-400">Design:</span>
          <div className="flex rounded-md overflow-hidden border border-stone-600">
            <button
              onClick={() => setDesign('caderno')}
              className={`px-3 py-1 text-sm font-medium ${design === 'caderno' ? 'bg-amber-50 text-stone-900' : 'text-stone-300 hover:bg-stone-800'}`}
            >
              ✒ Caderno
            </button>
            <button
              onClick={() => setDesign('cientifico')}
              className={`px-3 py-1 text-sm font-medium ${sci ? 'bg-amber-50 text-stone-900' : 'text-stone-300 hover:bg-stone-800'}`}
            >
              📄 Científico
            </button>
          </div>
        </div>

        <span className="text-xs text-stone-300">
          {sci
            ? 'Estilo de artigo científico: Times New Roman 10 pt, fundo branco, figuras com traço limpo. No diálogo, escolha “Salvar como PDF”.'
            : 'No diálogo, escolha “Salvar como PDF”. Para o fundo de papel, ative “Gráficos de segundo plano”. Os gráficos saem vetoriais (nitidez total).'}
        </span>
      </div>

      {/* ================== documento ================== */}
      <div className={`mx-auto px-12 py-12 my-6 shadow-lg border print:shadow-none print:border-0 print:my-0 print:px-0 ${sci ? 'report-sci max-w-3xl bg-white border-stone-300 print:max-w-none' : 'max-w-4xl bg-[#fbfaf6] border-stone-300/60 print:max-w-none'}`}>
        {/* capa / cabeçalho */}
        <header className="border-b-2 border-stone-400/70 pb-6">
          <p className="hand text-xl text-stone-500">caderno de planejamento · Strategic Choice Approach</p>
          <h1 className="hand2 text-6xl font-bold text-stone-900 leading-none mt-1">{project.name}</h1>
          <p className="text-sm text-stone-500 mt-3">
            Relatório de estruturação do problema decisório — {hoje}. Método de Friend &amp; Hickling
            (<em>Planning Under Pressure</em>): decisões interdependentes, incertezas explícitas e progresso por compromissos parciais.
          </p>
        </header>

        {/* 1. situação problemática */}
        <Section
          title="1 · A situação problemática"
          lead="Todo o percurso começa com alguém pensando sobre uma situação que ainda não está pronta para ser “resolvida”."
        >
          <p className="text-[15px] leading-relaxed text-stone-800 whitespace-pre-wrap">
            {project.problem.situation || '— situação ainda não descrita na etapa 1 —'}
          </p>
          {project.problem.decisions && (
            <>
              <p className="hand text-xl text-stone-600 mt-5 mb-1">…que o SCA reformula como um conjunto de escolhas concretas:</p>
              <p className="text-[15px] leading-relaxed text-stone-800 whitespace-pre-wrap">{project.problem.decisions}</p>
            </>
          )}
        </Section>

        {/* 2. áreas de decisão */}
        <Section
          title="2 · As áreas de decisão"
          lead="Cada escolha vira uma pergunta — uma área de decisão — identificada por um rótulo curto terminado em “?”."
        >
          <div className="hand avoid-break">
            <HandHead cols={['Área de decisão', 'Rótulo']} grid="grid-cols-[1fr_auto]" />
            <div className="space-y-3">
              {project.areas.map((a) => (
                <div key={a.id} className="grid grid-cols-[1fr_auto] gap-x-6 items-baseline">
                  <span className="text-xl leading-snug text-stone-800 lowercase">{a.question}</span>
                  <span className="text-xl font-bold text-stone-900 uppercase whitespace-nowrap">{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 3. gráfico de decisão com foco */}
        <Section
          title="3 · O mapa das interdependências e o foco do problema"
          lead="As decisões não são independentes: linha contínua = conexão forte; tracejada = moderada. O laço tracejado delimita o foco escolhido para este ciclo de análise — as áreas de fora não foram descartadas, apenas aguardam."
          breakBefore
        >
          <div className="avoid-break">
            <DecisionGraph
              areas={project.areas}
              links={project.links}
              focusIds={project.focusIds}
              degree={metrics.degree}
              showFocusHull
            />
            <p className="hand text-lg text-stone-500 mt-2">
              Dentro do foco: {focusAreas.map((a) => a.label).join(', ') || '—'} · fora (por enquanto):{' '}
              {project.areas.filter((a) => !project.focusIds.includes(a.id)).map((a) => a.label).join(', ') || '—'}
            </p>
          </div>
        </Section>

        {/* 4. opções por área */}
        <Section
          title="4 · As opções dentro de cada área"
          lead="A área de decisão é a pergunta; as opções são as respostas possíveis. Para cada área dentro do foco:"
        >
          <div className="hand avoid-break">
            <HandHead cols={['Área de decisão', 'Opções', 'Rótulo']} grid="grid-cols-[0.8fr_1.2fr_0.7fr]" />
            {focusAreas.map((a) => {
              const opts = project.options.filter((o) => o.areaId === a.id);
              return (
                <div key={a.id} className="grid grid-cols-[0.8fr_1.2fr_0.7fr] gap-x-6 py-2 items-start">
                  <div className="text-xl font-bold text-stone-900 uppercase">{a.label}</div>
                  <div>{opts.map((o) => <div key={o.id} className="text-xl leading-snug text-stone-800 lowercase">– {o.name}</div>)}</div>
                  <div>{opts.map((o) => <div key={o.id} className="text-xl leading-snug font-bold text-stone-900 uppercase">– {o.label}</div>)}</div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* 5. gráfico de opções / incompatibilidades */}
        <Section
          title="5 · O que não pode coexistir"
          lead="Nem toda combinação é possível. As linhas vermelhas são as option bars — incompatibilidades físicas, técnicas, econômicas, políticas, temporais ou normativas que vetam certas combinações de opções."
          breakBefore
        >
          <div className="avoid-break">
            <OptionsGraph areas={focusAreas} options={focusOptions} bars={bars} />
            <p className="hand text-lg text-stone-500 mt-2">{bars.length} option bar(s) registrada(s).</p>
          </div>
        </Section>

        {/* 6. árvore de esquemas — página inteira, vetorial */}
        <Section
          title="6 · A árvore dos esquemas viáveis"
          lead={
            gen.ok
              ? `Percorrendo as áreas em foco e podando os ramos que violam alguma option bar, das ${gen.totalCombos} combinações possíveis restam ${gen.schemes.length} esquemas de decisão viáveis (✕ = ramo interrompido).`
              : undefined
          }
          breakBefore
        >
          {gen.ok ? (
            <div className="print-tree">
              <SchemeTreeSvg project={project} />
            </div>
          ) : (
            <p className="text-sm text-amber-700">{gen.error}</p>
          )}
        </Section>

        {/* 7. áreas de comparação */}
        <Section
          title="7 · As áreas de comparação"
          lead="Com as alternativas construídas, a pergunta muda: o que muda se escolhermos um esquema em vez de outro? As áreas de comparação — rótulos terminados em “:” — são os campos de preocupação usados nessa avaliação."
          breakBefore
        >
          {project.comparisonAreas.length === 0 ? (
            <p className="hand text-xl text-stone-500">— nenhuma área de comparação formulada ainda (etapa 9) —</p>
          ) : (
            <div className="hand avoid-break">
              <HandHead cols={['Rótulo', 'O que compara', 'Tipo']} grid="grid-cols-[0.6fr_1.6fr_0.6fr]" />
              {project.comparisonAreas.map((c) => (
                <div key={c.id} className="grid grid-cols-[0.6fr_1.6fr_0.6fr] gap-x-6 py-2 items-start">
                  <div className="text-xl font-bold text-stone-900 uppercase">{c.label}</div>
                  <div className="text-xl leading-snug text-stone-800 lowercase">{c.description}{c.group ? ` (grupo ${c.group})` : ''}</div>
                  <div className="text-xl text-stone-700 lowercase">{EVAL_LABEL[c.evalType] ?? c.evalType}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* 8. avaliação relativa (tabela manuscrita da etapa 10) */}
        <Section
          title="8 · A avaliação relativa: o que muda em relação à base"
          lead={
            baseScheme
              ? `Cada esquema é comparado com a linha de base (${baseScheme.name}). A pergunta não é “quanto custa?”, mas “o que muda se escolhermos este esquema em vez daquele?” — as setas ↓ marcam as opções que mudaram.`
              : undefined
          }
          breakBefore
        >
          {baseScheme ? (
            <HandComparisonTable project={project} base={baseScheme} schemes={otherSchemes} />
          ) : (
            <p className="hand text-xl text-stone-500">— linha de base ainda não escolhida (etapa 10) —</p>
          )}
        </Section>

        {/* 9. gráficos de vantagem comparativa de TODAS as comparações */}
        <Section
          title="9 · Os julgamentos de vantagem comparativa"
          lead="Para cada comparação com a base, o gráfico registra o julgamento do grupo em todas as áreas: o intervalo ⟷ expressa a incerteza (sobre fatos e sobre valores) e o losango ◇ a melhor estimativa."
          breakBefore
        >
          {baseScheme && judgedSchemes.length > 0 ? (
            <div className="space-y-10">
              {judgedSchemes.map((s) => (
                <div key={s.key} className="avoid-break">
                  <AdvantageChart
                    baseName={baseScheme.name}
                    otherName={s.name}
                    areas={project.comparisonAreas}
                    getJ={getJFor(s.key)}
                    onSet={() => {}}
                    readOnly
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="hand text-xl text-stone-500">— nenhum julgamento de vantagem registrado ainda (etapa 11) —</p>
          )}
        </Section>

        {/* 10. áreas de incerteza (UE·UV·UR) — etapa 12 */}
        <Section
          title="10 · As áreas de incerteza"
          lead="Por que ainda não é possível afirmar com segurança qual esquema é melhor? O SCA distingue três direções de incerteza: UE (ambiente de trabalho), UV (valores norteadores) e UR (decisões relacionadas)."
          breakBefore
        >
          {project.uncertainties.length === 0 ? (
            <p className="hand text-xl text-stone-500">— nenhuma área de incerteza registrada ainda (etapa 12) —</p>
          ) : (
            <div className="hand avoid-break">
              <HandHead cols={['Área de incerteza', 'Rótulo', 'Tipo', 'Observação']} grid="grid-cols-[1.4fr_7rem_3rem_1.1fr]" />
              <div className="space-y-3">
                {project.uncertainties.map((u) => {
                  const parts = splitUncertainty(u);
                  return (
                    <div key={u.id} className="grid grid-cols-[1.4fr_7rem_3rem_1.1fr] gap-x-6 items-baseline">
                      <span className="text-xl leading-snug text-stone-800 lowercase">? {parts.text || parts.label}</span>
                      <span className="text-xl font-bold text-stone-900 uppercase whitespace-nowrap">{parts.label}</span>
                      <span className="text-xl font-bold text-stone-900">{u.type}</span>
                      <span className="text-lg text-stone-600 leading-snug">{u.note || '—'}</span>
                    </div>
                  );
                })}
              </div>
              <p className="hand text-lg text-stone-500 mt-3">UE = ambiente · UV = valores · UR = decisões relacionadas.</p>
            </div>
          )}
        </Section>

        {/* 11. opções exploratórias — etapa 13 */}
        <Section
          title="11 · As opções exploratórias"
          lead="Nem toda incerteza precisa ser aceita passivamente: as opções exploratórias são ações de investigação, consulta, negociação ou coordenação capazes de reduzir uma incerteza antes de compromissos mais firmes."
          breakBefore
        >
          {project.exploratory.length === 0 ? (
            <p className="hand text-xl text-stone-500">— nenhuma opção exploratória registrada ainda (etapa 13) —</p>
          ) : (
            <div className="hand avoid-break">
              <HandHead cols={['Área de incerteza', 'Opção exploratória', 'Comparação das opções exploratórias', 'Decisão']} grid="grid-cols-[0.8fr_1fr_1.5fr_7rem]" />
              <div className="space-y-3">
                {project.exploratory.map((e) => {
                  const u = project.uncertainties.find((x) => x.id === e.uncertaintyId);
                  const parts = u ? splitUncertainty(u) : { label: '?', text: '' };
                  return (
                    <div key={e.id} className="grid grid-cols-[0.8fr_1fr_1.5fr_7rem] gap-x-6 py-2 items-start">
                      <div>
                        <span className="text-xl font-bold text-stone-900 uppercase">{parts.label}</span>{' '}
                        <span className="text-lg text-stone-600">({u?.type ?? '?'})</span>
                      </div>
                      <div>
                        <div className="text-xl leading-snug text-stone-800 lowercase">{e.name}</div>
                        {e.description && <div className="text-base text-stone-500 leading-snug">{e.description}</div>}
                      </div>
                      <div className="text-lg text-stone-700 leading-snug whitespace-pre-wrap">
                        {e.comparison || '—'}
                        <div className="text-base text-stone-500 mt-1">recursos: {e.cost || '—'} · prazo: {e.deadline || '—'}</div>
                      </div>
                      <div className="text-lg text-stone-700">{WORTH_LABEL[e.worthIt] ?? e.worthIt}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Section>

        {/* 12. pacote de compromisso (matriz) — etapa 15 */}
        <Section
          title="12 · O pacote de compromisso"
          lead="O pacote não é “a alternativa ótima”, e sim um plano de progresso incremental. Para cada área de decisão: o que se assume agora (ações), o que se investiga agora (explorações), o que fica adiado com prazo (escolhas adiadas) e as respostas preparadas caso um pressuposto mude (contingências)."
          breakBefore
        >
          {pkgAreas.length === 0 ? (
            <p className="hand text-xl text-stone-500">— nenhuma área de decisão selecionada para o pacote (etapa 15) —</p>
          ) : (
            <div className="avoid-break overflow-x-auto">
              <table className="w-full border-collapse hand">
                <thead>
                  <tr>
                    <th rowSpan={2} className="border border-stone-400/70 p-2 align-bottom text-center text-base font-bold uppercase text-stone-800">Áreas de decisão</th>
                    <th colSpan={2} className="border border-stone-400/70 p-2 text-center text-base font-bold uppercase text-stone-800">Decisões imediatas</th>
                    <th colSpan={2} className="border border-stone-400/70 p-2 text-center text-base font-bold uppercase text-stone-800">Espaço de decisão futura</th>
                  </tr>
                  <tr>
                    {['Ações', 'Explorações', 'Escolhas adiadas', 'Planejamento de contingência'].map((h) => (
                      <th key={h} className="border border-stone-400/70 p-2 text-center text-base font-bold uppercase text-stone-800">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pkgAreas.map((a) => {
                    const c = project.commitmentMatrix?.[a.id];
                    const dash = (s: string) => (s.trim() ? s : '—');
                    const actionTxt = c?.actionOptionId ? (optByIdR[c.actionOptionId]?.label ?? '?') : '—';
                    const cells: string[] = [actionTxt, dash(c?.exploration ?? ''), dash(c?.deferred ?? ''), dash(c?.contingency ?? '')];
                    return (
                      <tr key={a.id}>
                        <td className="border border-stone-400/70 p-2 text-center align-middle text-xl font-bold uppercase text-stone-900 whitespace-nowrap">{a.label}</td>
                        {cells.map((v, i) => (
                          <td key={i} className="border border-stone-400/70 p-2 align-top text-center text-lg leading-snug text-stone-800 whitespace-pre-wrap">{v}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <footer className="mt-12 pt-4 border-t-2 border-stone-400/70 flex justify-between items-baseline">
          <span className="hand text-lg text-stone-500">gerado pela aplicação SCA · {hoje}</span>
          <span className="text-xs text-stone-400">Friend &amp; Hickling — Planning Under Pressure</span>
        </footer>
      </div>
    </div>
   </DesignContext.Provider>
  );
}
