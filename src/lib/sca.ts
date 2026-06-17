// ============================================================
// Núcleo algorítmico do SCA: combinações, option bars, esquemas
// viáveis, métricas de grafo, aceitabilidade e robustez.
// ============================================================
import {
  AcceptabilityCriterion,
  CompatibilityRelation,
  CompatStatus,
  DecisionArea,
  DecisionLink,
  DecisionOption,
  DecisionScheme,
  Project,
  RelativeAssessment,
  Shortlist,
} from '../types';

let counter = 0;
/** Id único simples (suficiente para uso local). */
export function uid(): string {
  counter = (counter + 1) % 1000;
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7) + '-' + counter;
}

/** Nomeia esquemas: A..Z, AA, AB, ... */
export function letterName(i: number): string {
  let s = '';
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** Chave estável de um conjunto de opções (ordem-independente). */
export function schemeKey(optionIds: string[]): string {
  return [...optionIds].sort().join('+');
}

/** Busca a relação de compatibilidade de um par, em qualquer ordem. */
export function findRelation(
  compat: CompatibilityRelation[],
  a: string,
  b: string,
): CompatibilityRelation | undefined {
  return compat.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
}

export function pairStatus(compat: CompatibilityRelation[], a: string, b: string): CompatStatus {
  return findRelation(compat, a, b)?.status ?? 'indefinido';
}

// ------------------------------------------------------------
// Métricas do gráfico de decisão
// ------------------------------------------------------------
export interface GraphMetrics {
  degree: Record<string, number>;
  totalLinks: number;
  isolated: DecisionArea[];
  central: DecisionArea[]; // áreas de maior grau
}

export function graphMetrics(areas: DecisionArea[], links: DecisionLink[]): GraphMetrics {
  const degree: Record<string, number> = {};
  areas.forEach((a) => (degree[a.id] = 0));
  links.forEach((l) => {
    if (degree[l.from] !== undefined) degree[l.from]++;
    if (degree[l.to] !== undefined) degree[l.to]++;
  });
  const max = Math.max(0, ...Object.values(degree));
  return {
    degree,
    totalLinks: links.length,
    isolated: areas.filter((a) => degree[a.id] === 0),
    central: max > 0 ? areas.filter((a) => degree[a.id] === max) : [],
  };
}

// ------------------------------------------------------------
// Geração de esquemas de decisão viáveis
// ------------------------------------------------------------
export interface EliminatedBranch {
  optionIds: string[]; // combinação parcial no momento do bloqueio
  conflict: [string, string]; // par incompatível encontrado
  combosRemoved: number; // quantas combinações completas o corte elimina
}

export interface SchemeGenResult {
  ok: boolean;
  error?: string;
  totalCombos: number; // produto cartesiano total (antes da filtragem)
  schemes: DecisionScheme[]; // esquemas viáveis, nomeados A, B, C...
  eliminated: EliminatedBranch[]; // cortes por incompatibilidade
}

const MAX_COMBOS = 50000;

/**
 * Algoritmo combinatório central do SCA:
 * 1. percorre o produto cartesiano das opções das áreas em foco
 *    (busca em profundidade, área por área);
 * 2. PODA: ao adicionar uma opção, verifica incompatibilidade contra
 *    as opções já presentes na combinação parcial — se houver option
 *    bar, todo o ramo é eliminado de uma vez (registrando o motivo e
 *    quantas combinações completas o corte removeu);
 * 3. cada caminho completo sem conflito vira um esquema de decisão
 *    viável, nomeado Esquema A, B, C...
 */
export function generateSchemes(p: Project): SchemeGenResult {
  const focusAreas = p.areas.filter((a) => p.focusIds.includes(a.id));
  const optionsByArea = focusAreas.map((a) => p.options.filter((o) => o.areaId === a.id));

  if (focusAreas.length === 0) {
    return { ok: false, error: 'Nenhuma área de decisão dentro do foco.', totalCombos: 0, schemes: [], eliminated: [] };
  }
  const emptyIdx = optionsByArea.findIndex((l) => l.length === 0);
  if (emptyIdx >= 0) {
    return {
      ok: false,
      error: `A área "${focusAreas[emptyIdx].label}" está no foco mas não possui opções cadastradas.`,
      totalCombos: 0,
      schemes: [],
      eliminated: [],
    };
  }

  const totalCombos = optionsByArea.reduce((acc, l) => acc * l.length, 1);
  if (totalCombos > MAX_COMBOS) {
    return {
      ok: false,
      error: `O foco atual gera ${totalCombos} combinações (limite: ${MAX_COMBOS}). Reduza o foco do problema.`,
      totalCombos,
      schemes: [],
      eliminated: [],
    };
  }

  // nº de combinações completas abaixo de um nível da árvore
  const remainingProduct: number[] = new Array(focusAreas.length + 1).fill(1);
  for (let i = focusAreas.length - 1; i >= 0; i--) {
    remainingProduct[i] = remainingProduct[i + 1] * optionsByArea[i].length;
  }

  const schemes: DecisionScheme[] = [];
  const eliminated: EliminatedBranch[] = [];
  const partial: string[] = [];

  function dfs(level: number) {
    if (level === focusAreas.length) {
      schemes.push({
        key: schemeKey(partial),
        name: 'Esquema ' + letterName(schemes.length),
        optionIds: [...partial],
      });
      return;
    }
    for (const opt of optionsByArea[level]) {
      // filtragem por incompatibilidade: testa a nova opção contra
      // todas as opções já escolhidas na combinação parcial
      let conflict: [string, string] | null = null;
      for (const chosen of partial) {
        if (pairStatus(p.compat, chosen, opt.id) === 'incompativel') {
          conflict = [chosen, opt.id];
          break;
        }
      }
      if (conflict) {
        eliminated.push({
          optionIds: [...partial, opt.id],
          conflict,
          combosRemoved: remainingProduct[level + 1],
        });
        continue; // ramo bloqueado (option bar)
      }
      partial.push(opt.id);
      dfs(level + 1);
      partial.pop();
    }
  }
  dfs(0);

  return { ok: true, totalCombos, schemes, eliminated };
}

// ------------------------------------------------------------
// Matriz de compatibilidade: pares pendentes
// ------------------------------------------------------------
export interface OptionPair {
  a: DecisionOption;
  b: DecisionOption;
  status: CompatStatus;
}

/** Todas as combinações par-a-par entre opções de áreas diferentes do foco. */
export function allOptionPairs(p: Project): OptionPair[] {
  const focusOptions = p.options.filter((o) => p.focusIds.includes(o.areaId));
  const pairs: OptionPair[] = [];
  for (let i = 0; i < focusOptions.length; i++) {
    for (let j = i + 1; j < focusOptions.length; j++) {
      const a = focusOptions[i];
      const b = focusOptions[j];
      if (a.areaId === b.areaId) continue; // só áreas diferentes
      pairs.push({ a, b, status: pairStatus(p.compat, a.id, b.id) });
    }
  }
  return pairs;
}

export function pendingPairs(p: Project): number {
  return allOptionPairs(p).filter((x) => x.status === 'indefinido').length;
}

// ------------------------------------------------------------
// Avaliações, aceitabilidade e robustez
// ------------------------------------------------------------
export function getAssessment(
  assessments: RelativeAssessment[],
  schemeKey0: string,
  comparisonAreaId: string,
): RelativeAssessment | undefined {
  return assessments.find((a) => a.schemeKey === schemeKey0 && a.comparisonAreaId === comparisonAreaId);
}

/** Extrai o primeiro número de um texto livre ("R$ 120k" → 120). */
export function parseNumeric(value: string): number | null {
  const m = value.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/**
 * Aceitabilidade de um esquema segundo o critério definido pelo usuário.
 * - modo manual: o grupo marca explicitamente quais esquemas considera
 *   aceitáveis (julgamento, não cálculo);
 * - modo regra: compara o valor numérico da avaliação relativa em uma
 *   área de comparação com um limiar (custo máximo, receita mínima...)
 *   e, opcionalmente, exige confiança mínima.
 * O esquema-base é tratado como aceitável por definição no modo regra
 * (é a referência: diferença zero).
 */
export function isAcceptable(scheme: DecisionScheme, p: Project): boolean {
  const c: AcceptabilityCriterion = p.acceptability;
  if (c.mode === 'manual') return c.manualKeys.includes(scheme.key);
  if (!c.comparisonAreaId) return false;
  if (scheme.key === p.baseSchemeKey) return true;
  const a = getAssessment(p.assessments, scheme.key, c.comparisonAreaId);
  if (!a) return false;
  if (c.minConfidence > 0 && a.confidence < c.minConfidence) return false;
  const v = parseNumeric(a.value);
  if (v === null) return false;
  return c.op === 'max' ? v <= c.threshold : v >= c.threshold;
}

export interface ActionSchemeStats {
  available: DecisionScheme[]; // esquemas futuros ainda possíveis
  totalCount: number; // "total count of available decision schemes"
  robustnessIndex: number; // nº de disponíveis que são aceitáveis
}

/**
 * Indicadores de flexibilidade de um compromisso parcial:
 * - totalCount: quantos esquemas de decisão completos permanecem
 *   disponíveis após comprometer as opções selecionadas;
 * - robustnessIndex: quantos desses atingem o nível mínimo de
 *   aceitabilidade definido pelo usuário.
 * Um compromisso pode ser ruim não pela opção em si, mas por fechar
 * caminhos futuros importantes.
 */
export function actionSchemeStats(
  committedOptionIds: string[],
  schemes: DecisionScheme[],
  p: Project,
): ActionSchemeStats {
  const available = schemes.filter((s) => committedOptionIds.every((o) => s.optionIds.includes(o)));
  const acceptable = available.filter((s) => isAcceptable(s, p));
  return { available, totalCount: available.length, robustnessIndex: acceptable.length };
}

// ------------------------------------------------------------
// Lista restrita de trabalho (etapa 12.1)
// ------------------------------------------------------------
export interface ShortlistResult {
  kept: DecisionScheme[];
  removed: { scheme: DecisionScheme; reason: string }[];
  noData: DecisionScheme[]; // mantidos por falta de dados (aviso)
}

/** Aplica as regras de restrição (custo máximo, receita mínima etc.). */
export function applyShortlist(schemes: DecisionScheme[], p: Project): ShortlistResult {
  const sl: Shortlist = p.shortlist;
  const kept: DecisionScheme[] = [];
  const removed: { scheme: DecisionScheme; reason: string }[] = [];
  const noData: DecisionScheme[] = [];

  for (const s of schemes) {
    if (sl.manualExcluded.includes(s.key)) {
      removed.push({ scheme: s, reason: 'excluído manualmente pelo grupo' });
      continue;
    }
    if (!sl.active) {
      kept.push(s);
      continue;
    }
    if (s.key === p.baseSchemeKey) {
      kept.push(s); // a linha de base permanece como referência
      continue;
    }
    let reason: string | null = null;
    let missing = false;
    for (const rule of sl.rules) {
      const a = getAssessment(p.assessments, s.key, rule.comparisonAreaId);
      const v = a ? parseNumeric(a.value) : null;
      if (v === null) {
        missing = true;
        continue;
      }
      if (rule.op === 'max' && v > rule.value) reason = `${rule.label}: ${v} > ${rule.value}`;
      if (rule.op === 'min' && v < rule.value) reason = `${rule.label}: ${v} < ${rule.value}`;
      if (reason) break;
    }
    if (!reason && sl.minConfidence > 0) {
      const ass = p.assessments.filter((a) => a.schemeKey === s.key);
      if (ass.length > 0 && ass.some((a) => a.confidence < sl.minConfidence)) {
        reason = `confiança abaixo do mínimo (${sl.minConfidence})`;
      }
    }
    if (reason) removed.push({ scheme: s, reason });
    else {
      kept.push(s);
      if (missing) noData.push(s);
    }
  }
  return { kept, removed, noData };
}

// ------------------------------------------------------------
// Escala de vantagem comparativa
// ------------------------------------------------------------
export const ADVANTAGE_LEVELS = [
  'negligenciável',
  'marginal',
  'insignificante',
  'significativa',
  'considerável',
  'extrema',
];

export function advantageLabel(v: number): string {
  if (v === 0) return 'neutra';
  const mag = ADVANTAGE_LEVELS[Math.min(Math.abs(v), 6) - 1];
  return `${mag} para o esquema ${v < 0 ? 'base' : 'comparado'}`;
}

// ------------------------------------------------------------
// Validações globais (exibidas no painel de avisos)
// ------------------------------------------------------------
export interface ValidationMsg {
  level: 'erro' | 'aviso';
  step: number;
  text: string;
}

export function validateProject(p: Project): ValidationMsg[] {
  const msgs: ValidationMsg[] = [];
  const metrics = graphMetrics(p.areas, p.links);

  if (p.areas.length === 0) {
    msgs.push({ level: 'aviso', step: 2, text: 'Nenhuma área de decisão cadastrada.' });
    return msgs;
  }
  if (metrics.isolated.length > 0) {
    msgs.push({
      level: 'aviso',
      step: 3,
      text: 'Áreas de decisão sem conexão: ' + metrics.isolated.map((a) => a.label).join(', '),
    });
  }
  if (p.focusIds.length === 0) {
    msgs.push({ level: 'erro', step: 5, text: 'Nenhum foco do problema definido. Selecione as áreas do ciclo atual.' });
  } else {
    const noOptions = p.areas.filter(
      (a) => p.focusIds.includes(a.id) && !p.options.some((o) => o.areaId === a.id),
    );
    if (noOptions.length > 0) {
      msgs.push({
        level: 'erro',
        step: 6,
        text: 'Áreas em foco sem opções cadastradas: ' + noOptions.map((a) => a.label).join(', '),
      });
    }
    // Na matriz binária (etapa 7), células não marcadas valem "compatível";
    // por isso não há mais aviso de matriz incompleta.
  }
  if (p.comparisonAreas.length === 0) {
    msgs.push({ level: 'aviso', step: 9, text: 'Nenhuma área de comparação foi criada.' });
  }
  return msgs;
}

// ------------------------------------------------------------
// Projeto vazio
// ------------------------------------------------------------
export function emptyProject(): Project {
  return {
    version: 1,
    name: 'Novo projeto SCA',
    problem: { situation: '', decisions: '' },
    areas: [],
    links: [],
    focusIds: [],
    options: [],
    compat: [],
    comparisonAreas: [],
    baseSchemeKey: null,
    assessments: [],
    judgments: [],
    shortlist: { active: false, rules: [], minConfidence: 0, manualExcluded: [] },
    uncertainties: [],
    exploratory: [],
    actionSchemes: [],
    acceptability: {
      mode: 'manual',
      manualKeys: [],
      comparisonAreaId: null,
      op: 'max',
      threshold: 0,
      minConfidence: 0,
      description: '',
    },
    pkg: { immediate: [], exploratory: [], deferred: [], arrangements: [], contingencies: [] },
    commitmentAreaIds: [],
    commitmentMatrix: {},
  };
}
