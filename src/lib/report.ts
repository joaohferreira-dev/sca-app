// ============================================================
// Exportação do relatório completo em Markdown
// ============================================================
import { Project } from '../types';
import {
  actionSchemeStats,
  advantageLabel,
  applyShortlist,
  generateSchemes,
  graphMetrics,
  isAcceptable,
} from './sca';
import { INCOMPAT_LABELS } from '../components/graphs';

const DIR_LABEL: Record<string, string> = {
  vantagem: 'vantagem',
  desvantagem: 'desvantagem',
  neutra: 'neutra',
  incerta: 'incerta',
};

export function buildReport(p: Project): string {
  const L: string[] = [];
  const optById = Object.fromEntries(p.options.map((o) => [o.id, o]));
  const areaById = Object.fromEntries(p.areas.map((a) => [a.id, a]));
  const compById = Object.fromEntries(p.comparisonAreas.map((c) => [c.id, c]));
  const gen = generateSchemes(p);
  const schemeName = (key: string) => gen.schemes.find((s) => s.key === key)?.name ?? key;
  const metrics = graphMetrics(p.areas, p.links);

  L.push(`# Relatório SCA — ${p.name}`);
  L.push(`\n_Gerado em ${new Date().toLocaleString('pt-BR')} pela aplicação SCA (Strategic Choice Approach)._\n`);

  L.push(`## 1. Problema decisório`);
  L.push(`\n**Situação problemática:**\n\n${p.problem.situation || '_não preenchido_'}`);
  L.push(`\n**Reformulação como conjunto de decisões:**\n\n${p.problem.decisions || '_não preenchido_'}`);

  L.push(`\n## 2. Áreas de decisão`);
  L.push(`\n| Rótulo | Pergunta decisória | Prioridade | Conexões |`);
  L.push(`|---|---|---|---|`);
  for (const a of p.areas) {
    L.push(`| ${a.label} | ${a.question} | ${a.priority ?? '—'} | ${metrics.degree[a.id] ?? 0} |`);
  }

  L.push(`\n## 3. Gráfico de decisão (conexões)`);
  L.push(`\nTotal de conexões: ${metrics.totalLinks}. Mapa de interdependência decisória — não é fluxograma cronológico. F = conexão forte (linha contínua); M = conexão moderada (linha tracejada).\n`);

  // Matriz de conexões entre áreas de decisão (metade superior)
  if (p.areas.length > 1) {
    const strengthOf = (a: string, b: string) => {
      const l = p.links.find((x) => (x.from === a && x.to === b) || (x.from === b && x.to === a));
      return l ? (l.strength === 'forte' ? 'F' : 'M') : '';
    };
    L.push(`| | ${p.areas.map((a) => a.label).join(' | ')} |`);
    L.push(`|---|${p.areas.map(() => '---').join('|')}|`);
    p.areas.forEach((ra, i) => {
      const cells = p.areas.map((ca, j) => (i === j ? '—' : j < i ? '' : strengthOf(ra.id, ca.id)));
      L.push(`| **${ra.label}** | ${cells.join(' | ')} |`);
    });
    L.push('');
  }
  for (const l of p.links) {
    L.push(`- ${areaById[l.from]?.label ?? '?'} — ${areaById[l.to]?.label ?? '?'} (${l.strength})${l.description ? `: ${l.description}` : ''}`);
  }

  L.push(`\n## 4. Foco do problema`);
  const focus = p.areas.filter((a) => p.focusIds.includes(a.id));
  const outside = p.areas.filter((a) => !p.focusIds.includes(a.id));
  L.push(`\nDentro do foco: ${focus.map((a) => a.label).join(', ') || '—'}.`);
  L.push(`\nFora do foco neste ciclo (não descartadas): ${outside.map((a) => a.label).join(', ') || '—'}.`);

  L.push(`\n## 5. Opções por área de decisão`);
  for (const a of focus) {
    const opts = p.options.filter((o) => o.areaId === a.id);
    L.push(`\n**${a.label}** ${opts.map((o) => `${o.label} (${o.name})`).join('; ') || '_sem opções_'}`);
  }

  L.push(`\n## 6. Matriz de compatibilidade (option bars)`);
  const bars = p.compat.filter((c) => c.status === 'incompativel');
  if (bars.length === 0) L.push(`\n_Nenhuma incompatibilidade registrada._`);
  else {
    L.push(`\n| Opção A | Opção B | Tipo | Justificativa |`);
    L.push(`|---|---|---|---|`);
    for (const b of bars) {
      L.push(
        `| ${optById[b.a]?.label ?? '?'} | ${optById[b.b]?.label ?? '?'} | ${INCOMPAT_LABELS[b.incompatType ?? 'outra']} | ${b.justification ?? ''} |`,
      );
    }
  }

  L.push(`\n## 7. Esquemas de decisão viáveis`);
  if (!gen.ok) L.push(`\n_${gen.error}_`);
  else {
    L.push(`\nCombinações possíveis antes da filtragem: **${gen.totalCombos}**. Esquemas viáveis: **${gen.schemes.length}**. Ramos eliminados por incompatibilidade: ${gen.eliminated.length}.\n`);
    L.push(`| Esquema | Composição |`);
    L.push(`|---|---|`);
    for (const s of gen.schemes) {
      L.push(`| ${s.name}${s.key === p.baseSchemeKey ? ' (base)' : ''} | ${s.optionIds.map((id) => optById[id]?.label ?? '?').join(' + ')} |`);
    }

    // Árvore de esquemas (ramos viáveis e interrompidos)
    L.push(`\n### Árvore de esquemas (✕ = ramo interrompido por option bar)`);
    const focusAreas = p.areas.filter((a) => p.focusIds.includes(a.id));
    const optionsByArea = focusAreas.map((a) => p.options.filter((o) => o.areaId === a.id));
    let schemeIdx = 0;
    const treeLines: string[] = ['```', focusAreas.map((a) => a.label).join('  →  ')];
    const letter = (i: number) => gen.schemes[i]?.name ?? '?';
    (function rec(level: number, partial: string[], indent: string) {
      for (const opt of optionsByArea[level] ?? []) {
        let conflict: string | null = null;
        for (const chosen of partial) {
          const rel = p.compat.find((r) => ((r.a === chosen && r.b === opt.id) || (r.a === opt.id && r.b === chosen)) && r.status === 'incompativel');
          if (rel) { conflict = optById[chosen]?.label ?? '?'; break; }
        }
        if (conflict) treeLines.push(`${indent}├─ ${opt.label} ✕ (incompatível com ${conflict})`);
        else if (level === focusAreas.length - 1) treeLines.push(`${indent}├─ ${opt.label} → ${letter(schemeIdx++)}`);
        else {
          treeLines.push(`${indent}├─ ${opt.label}`);
          rec(level + 1, [...partial, opt.id], indent + '│   ');
        }
      }
    })(0, [], '');
    treeLines.push('```');
    L.push(treeLines.join('\n'));
  }

  L.push(`\n## 8. Áreas de comparação`);
  if (p.comparisonAreas.length === 0) L.push(`\n_Nenhuma área de comparação criada._`);
  else {
    L.push(`\n| Rótulo | Descrição | Tipo | Grupo |`);
    L.push(`|---|---|---|---|`);
    for (const c of p.comparisonAreas) L.push(`| ${c.label} | ${c.description} | ${c.evalType} | ${c.group || '—'} |`);
  }

  L.push(`\n## 9. Avaliações relativas (em relação ao esquema-base ${p.baseSchemeKey ? schemeName(p.baseSchemeKey) : '—'})`);
  if (p.assessments.length === 0) L.push(`\n_Nenhuma avaliação registrada._`);
  else {
    L.push(`\n| Esquema | Área de comparação | Direção | Valor | Confiança (1–5) | Observação |`);
    L.push(`|---|---|---|---|---|---|`);
    for (const a of p.assessments) {
      L.push(
        `| ${schemeName(a.schemeKey)} | ${compById[a.comparisonAreaId]?.label ?? '?'} | ${DIR_LABEL[a.direction]} | ${a.value} | ${a.confidence} | ${a.note} |`,
      );
    }
  }

  L.push(`\n## 10. Vantagens comparativas`);
  if (p.judgments.length === 0) L.push(`\n_Nenhum julgamento registrado._`);
  else {
    L.push(`\n| Esquema comparado | Área | Julgamento (intervalo) | Comentário |`);
    L.push(`|---|---|---|---|`);
    for (const j of p.judgments) {
      const intervalo =
        j.min === j.max ? advantageLabel(j.min) : `${advantageLabel(j.min)} … ${advantageLabel(j.max)}`;
      L.push(`| ${schemeName(j.schemeKey)} | ${compById[j.comparisonAreaId]?.label ?? '?'} | ${intervalo} | ${j.comment} |`);
    }
  }

  if (p.shortlist.active && gen.ok) {
    const sl = applyShortlist(gen.schemes, p);
    L.push(`\n### 10.1 Lista restrita de trabalho (provisória e revisável)`);
    L.push(`\nMantidos: ${sl.kept.map((s) => s.name).join(', ') || '—'}.`);
    if (sl.removed.length > 0) {
      L.push(`\nExcluídos provisoriamente:`);
      for (const r of sl.removed) L.push(`- ${r.scheme.name}: ${r.reason}`);
    }
    L.push(`\n_Aviso: simplificar o problema pode excluir esquemas relevantes em outras dimensões._`);
  }

  L.push(`\n## 11. Áreas de incerteza (UE / UV / UR)`);
  if (p.uncertainties.length === 0) L.push(`\n_Nenhuma incerteza registrada._`);
  else {
    L.push(`\n| Incerteza | Tipo | Responsável | Prazo | Observação |`);
    L.push(`|---|---|---|---|---|`);
    for (const u of p.uncertainties) L.push(`| ${u.title} | ${u.type} | ${u.owner || '—'} | ${u.deadline || '—'} | ${u.note || ''} |`);
  }

  L.push(`\n## 12. Opções exploratórias`);
  if (p.exploratory.length === 0) L.push(`\n_Nenhuma opção exploratória registrada._`);
  else {
    const uById = Object.fromEntries(p.uncertainties.map((u) => [u.id, u]));
    L.push(`\n| Ação | Incerteza | Custo | Prazo | Comparação | Vale a pena? |`);
    L.push(`|---|---|---|---|---|---|`);
    for (const e of p.exploratory) {
      L.push(`| ${e.name} | ${uById[e.uncertaintyId]?.title ?? '?'} | ${e.cost || '—'} | ${e.deadline || '—'} | ${(e.comparison || '').replace(/\n/g, ' ')} | ${e.worthIt} |`);
    }
  }

  L.push(`\n## 13. Esquemas de ação e robustez`);
  if (p.actionSchemes.length === 0 || !gen.ok) L.push(`\n_Nenhum esquema de ação definido._`);
  else {
    L.push(`\nCritério de aceitabilidade: ${p.acceptability.description || (p.acceptability.mode === 'manual' ? 'marcação manual do grupo' : 'regra sobre área de comparação')}.\n`);
    L.push(`| Esquema de ação | Compromisso imediato | Esquemas disponíveis | Índice de robustez |`);
    L.push(`|---|---|---|---|`);
    for (const as of p.actionSchemes) {
      const st = actionSchemeStats(as.optionIds, gen.schemes, p);
      L.push(
        `| ${as.name} | ${as.optionIds.map((id) => optById[id]?.label ?? '?').join(' + ') || '—'} | ${st.totalCount} (${st.available.map((s) => s.name.replace('Esquema ', '')).join(', ')}) | ${st.robustnessIndex} |`,
      );
    }
    const acceptable = gen.schemes.filter((s) => isAcceptable(s, p));
    L.push(`\nEsquemas aceitáveis segundo o critério: ${acceptable.map((s) => s.name).join(', ') || 'nenhum'}.`);
  }

  L.push(`\n## 14. Pacote de compromisso`);
  L.push(`\n_O pacote não é "a alternativa ótima": é um plano de progresso incremental, organizado por área de decisão._`);
  const pkgAreas = p.areas.filter((a) => (p.commitmentAreaIds ?? []).includes(a.id));
  if (pkgAreas.length === 0) L.push(`\n_Nenhuma área de decisão selecionada para o pacote._`);
  else {
    const oneLine = (s?: string) => (s || '').replace(/\n/g, ' ').trim();
    const actionTxt = (c?: { actionOptionId?: string }) => (c?.actionOptionId ? optById[c.actionOptionId]?.label ?? '?' : '—');
    L.push(`\n| Área de decisão | Decisões imediatas — Ações | Decisões imediatas — Explorações | Espaço futuro — Escolhas adiadas | Espaço futuro — Contingência |`);
    L.push(`|---|---|---|---|---|`);
    for (const a of pkgAreas) {
      const c = p.commitmentMatrix?.[a.id];
      L.push(`| ${a.label} | ${actionTxt(c)} | ${oneLine(c?.exploration) || '—'} | ${oneLine(c?.deferred) || '—'} | ${oneLine(c?.contingency) || '—'} |`);
    }
  }

  return L.join('\n');
}
