// ============================================================
// Modelo de dados do SCA (Strategic Choice Approach)
// Baseado em Friend & Hickling — Planning Under Pressure / AIDA
// ============================================================

export type Priority = 'prioritaria' | 'secundaria' | 'fora';

/** Critérios de focalização estratégica (etapa 5), escala 1–5 */
export interface AreaRatings {
  centralidade: number;
  urgencia: number;
  consequencia: number;
  incerteza: number;
  governabilidade: number;
  controversia: number;
}

/**
 * Área de decisão: uma PERGUNTA que exige escolha entre opções.
 * Por convenção do SCA, o rótulo curto termina com "?".
 */
export interface DecisionArea {
  id: string;
  label: string; // rótulo curto, terminado em "?"
  question: string; // pergunta decisória completa
  description: string;
  notes: string;
  ratings: AreaRatings;
  priority: Priority | null;
  // posição no gráfico de decisão (editável por arraste)
  x: number;
  y: number;
  // posição manual do cluster no GRÁFICO DE OPÇÕES
  // (undefined = layout automático em círculo)
  gx?: number;
  gy?: number;
}

/** Intensidade da conexão decisória. */
export type LinkStrength = 'forte' | 'moderada';

/**
 * Conexão decisória: interdependência, influência ou condicionamento
 * entre duas áreas de decisão. NÃO é sequência cronológica nem
 * causalidade rígida.
 * forte = linha contínua; moderada = linha tracejada.
 */
export interface DecisionLink {
  id: string;
  from: string; // id da área de decisão
  to: string; // id da área de decisão
  description: string;
  strength: LinkStrength;
}

/** Opção: uma possível RESPOSTA dentro de uma área de decisão. */
export interface DecisionOption {
  id: string;
  areaId: string;
  name: string; // nome completo
  label: string; // rótulo curto
  description: string;
  // deslocamento manual dentro do círculo da área no gráfico de opções
  // (relativo ao centro do cluster; undefined = layout automático)
  ox?: number;
  oy?: number;
}

export type CompatStatus = 'compativel' | 'incompativel' | 'indefinido';

export type IncompatType =
  | 'fisica'
  | 'tecnica'
  | 'economica'
  | 'politica'
  | 'temporal'
  | 'normativa'
  | 'outra';

/**
 * Relação de compatibilidade entre duas opções de áreas DIFERENTES.
 * Incompatibilidades são as "option bars" do SCA/AIDA.
 */
export interface CompatibilityRelation {
  id: string;
  a: string; // id da opção A
  b: string; // id da opção B
  status: CompatStatus;
  incompatType?: IncompatType;
  justification?: string;
}

/**
 * Esquema de decisão: exatamente uma opção de cada área em foco,
 * sem nenhum par interno incompatível. É CALCULADO, não cadastrado.
 * A chave (key) é estável: ids das opções ordenados e unidos por "+",
 * o que preserva avaliações mesmo quando os esquemas são recalculados.
 */
export interface DecisionScheme {
  key: string;
  name: string; // Esquema A, Esquema B, ...
  optionIds: string[];
}

export type EvalType =
  | 'numerica'
  | 'monetaria'
  | 'ordinal'
  | 'linguistica'
  | 'qualitativa'
  | 'mista';

/**
 * Área de comparação: campo de preocupação usado para comparar as
 * consequências dos esquemas. Por convenção, o rótulo termina com ":".
 */
export interface ComparisonArea {
  id: string;
  label: string; // termina com ":"
  description: string;
  evalType: EvalType;
  group: string; // agrupamento opcional, ex.: FINANÇAS:
}

export type Direction = 'vantagem' | 'desvantagem' | 'neutra' | 'incerta';

/**
 * Avaliação relativa de um esquema EM RELAÇÃO ao esquema-base.
 * A pergunta não é "quanto custa?", mas "o que muda se escolhermos
 * este esquema em vez do esquema-base?".
 */
export interface RelativeAssessment {
  id: string;
  schemeKey: string;
  comparisonAreaId: string;
  direction: Direction;
  value: string; // valor numérico, intervalo ou descrição linguística
  note: string;
  confidence: number; // 1–5 (1 = muito incerto, 5 = muito confiante)
}

/**
 * Julgamento de vantagem comparativa (base × comparado) em uma área
 * de comparação. Escala de -6 a +6:
 *  negativo = vantagem do esquema-base; positivo = do comparado.
 *  |1| negligenciável, |2| marginal, |3| insignificante,
 *  |4| significativa, |5| considerável, |6| extrema.
 * O intervalo [min, max] representa incerteza do julgamento.
 */
export interface AdvantageJudgment {
  id: string;
  schemeKey: string;
  comparisonAreaId: string;
  min: number; // -6..6 (limite inferior do intervalo de crença)
  max: number; // -6..6 (limite superior)
  best?: number; // melhor estimativa (◇), dentro de [min, max]
  comment: string;
}

export type UncertaintyType = 'UE' | 'UV' | 'UR';

/**
 * Área de incerteza:
 *  UE — ambiente de trabalho (dados, mercado, tecnologia, tendências);
 *  UV — valores norteadores (prioridades, critérios, orientação política);
 *  UR — decisões relacionadas (escolhas futuras fora do foco atual).
 */
export interface UncertaintyArea {
  id: string;
  title: string;
  description: string;
  type: UncertaintyType;
  schemeKeys: string[];
  areaIds: string[];
  comparisonAreaIds: string[];
  criticality?: number; // 1–5 (em desuso — não exibido)
  owner: string;
  deadline: string;
  /** observação livre (ex.: "influência maior na comparação A:B em JOBS:") */
  note?: string;
}

export type ExploratoryType =
  | 'estudo_tecnico'
  | 'consulta_publica'
  | 'reuniao'
  | 'negociacao'
  | 'coleta_dados'
  | 'simulacao'
  | 'analise_juridica'
  | 'analise_economica'
  | 'outro';

/**
 * Opção exploratória: ação de investigação, consulta, negociação ou
 * coordenação para reduzir uma incerteza antes de compromissos fortes.
 */
export interface ExploratoryOption {
  id: string;
  uncertaintyId: string;
  name: string;
  description: string;
  cost: string;
  deadline: string;
  owner: string;
  type: ExploratoryType;
  impact?: number; // (em desuso) impacto esperado na redução da incerteza
  /** comparação livre, escrita diretamente na tabela (confiança, recursos, prazo…) */
  comparison?: string;
  worthIt: 'sim' | 'nao' | 'avaliar';
}

/**
 * Esquema de ação: compromisso PARCIAL imediato — fecha algumas
 * opções agora e deixa as demais áreas em aberto.
 */
export interface ActionScheme {
  id: string;
  name: string; // I, II, III...
  optionIds: string[]; // opções comprometidas agora
}

/** Critério de aceitabilidade usado no índice de robustez. */
export interface AcceptabilityCriterion {
  mode: 'manual' | 'regra';
  manualKeys: string[]; // esquemas marcados manualmente como aceitáveis
  comparisonAreaId: string | null;
  op: 'max' | 'min'; // valor máximo permitido / valor mínimo exigido
  threshold: number;
  minConfidence: number; // 0 = não exigir
  description: string;
}

export interface PackageItem {
  id: string;
  text: string;
  owner: string;
  date: string;
  condition: string; // condição de retomada (decisões adiadas)
  kind: 'substantiva' | 'exploratoria';
}

export interface Contingency {
  id: string;
  assumption: string; // pressuposto que pode não se confirmar
  action: string; // o que faremos nesse caso
}

/**
 * Pacote de compromisso: NÃO é "a alternativa ótima", e sim um plano
 * de progresso incremental que equilibra compromissos imediatos,
 * explorações, decisões adiadas, arranjos futuros e contingências.
 */
export interface CommitmentPackage {
  immediate: PackageItem[];
  exploratory: PackageItem[];
  deferred: PackageItem[];
  arrangements: PackageItem[];
  contingencies: Contingency[];
}

/**
 * Célula do pacote de compromisso por área de decisão, no formato
 * clássico de Friend & Hickling (commitment package):
 *  - Decisões imediatas: ações (substantivas) e explorações;
 *  - Espaço de decisão futura: escolhas adiadas e planejamento de
 *    contingência ("se… então…").
 */
export interface CommitmentCell {
  /** Ações: opção escolhida da própria área de decisão (id da opção) */
  actionOptionId?: string;
  /** Explorações: texto livre */
  exploration?: string;
  /** Escolhas adiadas: texto livre */
  deferred?: string;
  /** Planejamento de contingência: texto livre */
  contingency?: string;
}

/** Regra de filtragem da lista restrita de trabalho (etapa 12.1). */
export interface SchemeFilterRule {
  id: string;
  comparisonAreaId: string;
  op: 'max' | 'min';
  value: number;
  label: string; // ex.: "custo máximo", "receita mínima"
}

export interface Shortlist {
  active: boolean;
  rules: SchemeFilterRule[];
  minConfidence: number; // 0 = não exigir
  manualExcluded: string[]; // chaves excluídas manualmente
}

export interface Project {
  version: 1;
  name: string;
  problem: {
    situation: string; // descrição da situação problemática
    decisions: string; // reformulação como conjunto de decisões concretas
  };
  areas: DecisionArea[];
  links: DecisionLink[];
  focusIds: string[]; // áreas dentro do foco do ciclo atual
  options: DecisionOption[];
  compat: CompatibilityRelation[];
  comparisonAreas: ComparisonArea[];
  baseSchemeKey: string | null;
  assessments: RelativeAssessment[];
  judgments: AdvantageJudgment[];
  shortlist: Shortlist;
  uncertainties: UncertaintyArea[];
  exploratory: ExploratoryOption[];
  actionSchemes: ActionScheme[];
  acceptability: AcceptabilityCriterion;
  pkg: CommitmentPackage;
  /** áreas de decisão selecionadas para compor o pacote de compromisso (ids) */
  commitmentAreaIds?: string[];
  /** pacote de compromisso em matriz, por área de decisão (id → célula) */
  commitmentMatrix?: Record<string, CommitmentCell>;
}
