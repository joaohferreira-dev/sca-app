// ============================================================
// Dados de exemplo — caso South Side (Friend & Hickling).
// São APENAS exemplos editáveis para demonstrar o método.
// ============================================================
import { Project } from '../types';
import { emptyProject } from '../lib/sca';

const R = { centralidade: 3, urgencia: 3, consequencia: 3, incerteza: 3, governabilidade: 3, controversia: 3 };

export function southSide(): Project {
  const p = emptyProject();
  p.name = 'Exemplo — South Side (editável)';
  p.problem.situation =
    'O distrito de South Side enfrenta declínio urbano: habitações degradadas, indefinição sobre a rota de uma nova via arterial, áreas industriais desativadas (gasômetro), pressão por empregos locais e perda de confiança dos moradores. (Exemplo do guia, baseado em Planning Under Pressure.)';
  p.problem.decisions =
    'Quais escolhas concretas precisam ser feitas? Decidir a rota da via arterial; a localização do novo centro comercial; o uso do terreno central; o horizonte de vida útil do distrito residencial; o tratamento da West Street; o reuso do terreno do gasômetro; e o futuro da escola Griffin.';

  // ---- Áreas de decisão (rótulos terminam com "?") ----
  const areas = [
    { id: 'road', label: 'ROAD LINE?', question: 'Qual rota escolher para a nova via arterial?', x: 300, y: 120 },
    { id: 'shop', label: "SHOP LOC'N?", question: 'Onde localizar o novo centro comercial?', x: 530, y: 180 },
    { id: 'cent', label: "CENT'L SITE?", question: 'Qual uso dar ao terreno central?', x: 430, y: 340 },
    { id: 'dist', label: 'DIST LIFE?', question: 'Qual horizonte de vida útil adotar para o distrito residencial?', x: 200, y: 300 },
    { id: 'west', label: 'WEST ST?', question: 'O que fazer com a West Street?', x: 90, y: 140 },
    { id: 'gas', label: 'GAS SITE?', question: 'Como reaproveitar o terreno do antigo gasômetro?', x: 700, y: 320 },
    { id: 'schl', label: 'GRIFF SCHL?', question: 'Fechar ou manter a escola Griffin?', x: 650, y: 80 },
  ];
  p.areas = areas.map((a) => ({ ...a, description: '', notes: '', ratings: { ...R }, priority: null }));

  // ---- Conexões decisórias (interdependência, não cronologia) ----
  // forte = linha contínua; moderada = linha tracejada
  const links: [string, string, string, 'forte' | 'moderada'][] = [
    ['road', 'shop', 'A rota da via condiciona a localização viável do comércio.', 'forte'],
    ['road', 'dist', 'A rota afeta o investimento e a vida útil da área residencial.', 'forte'],
    ['road', 'west', 'A rota interfere no tratamento da West Street.', 'moderada'],
    ['shop', 'cent', 'A localização comercial afeta o uso do terreno central.', 'forte'],
    ['shop', 'gas', 'O gasômetro é um dos locais candidatos ao comércio.', 'moderada'],
    ['cent', 'dist', 'O uso do terreno central condiciona o horizonte residencial.', 'forte'],
    ['road', 'cent', 'A rota da via afeta o acesso ao terreno central.', 'forte'],
    ['shop', 'schl', 'O fluxo gerado pelo comércio afeta a decisão sobre a escola.', 'moderada'],
  ];
  p.links = links.map(([from, to, description, strength], i) => ({ id: 'l' + i, from, to, description, strength }));

  // ---- Foco do problema (4 áreas centrais) ----
  p.focusIds = ['road', 'shop', 'cent', 'dist'];
  p.areas = p.areas.map((a) => ({
    ...a,
    priority: p.focusIds.includes(a.id) ? 'prioritaria' : 'secundaria',
  }));

  // ---- Opções ----
  const opts: [string, string, string, string][] = [
    ['o-north', 'road', 'Rota norte', 'NORTH'],
    ['o-south', 'road', 'Rota sul', 'SOUTH'],
    ['o-main', 'shop', 'Main Street', 'MAIN'],
    ['o-king', 'shop', 'King Square', 'KING'],
    ['o-gas', 'shop', 'Terreno do gasômetro', 'GAS'],
    ['o-ind', 'cent', 'Indústria', 'IND'],
    ['o-hous', 'cent', 'Habitação', 'HOUS'],
    ['o-open', 'cent', 'Espaço aberto', 'OPEN'],
    ['o-10', 'dist', 'Horizonte de 10 anos', '10YR'],
    ['o-20', 'dist', 'Horizonte de 20 anos', '20YR'],
    ['o-40', 'dist', 'Horizonte de 40 anos', '40YR'],
  ];
  p.options = opts.map(([id, areaId, name, label]) => ({ id, areaId, name, label, description: '' }));

  // ---- Option bars de exemplo (incompatibilidades) ----
  const bars: [string, string, Project['compat'][0]['incompatType'], string][] = [
    ['o-north', 'o-gas', 'fisica', 'A rota norte ocupa o acesso ao terreno do gasômetro.'],
    ['o-gas', 'o-10', 'economica', 'O investimento no gasômetro não se paga em horizonte de 10 anos.'],
    ['o-10', 'o-open', 'economica', 'Espaço aberto não justifica investimento com vida útil de 10 anos.'],
    ['o-south', 'o-main', 'fisica', 'A rota sul corta a Main Street, inviabilizando o comércio ali.'],
    ['o-40', 'o-ind', 'politica', 'Indústria no centro é inaceitável com permanência residencial de 40 anos.'],
    ['o-south', 'o-10', 'temporal', 'A rota sul exige obras incompatíveis com horizonte de 10 anos.'],
  ];
  let ci = 0;
  for (const [a, b, t, j] of bars) {
    p.compat.push({ id: 'c' + ci++, a, b, status: 'incompativel', incompatType: t, justification: j });
  }
  // Demais pares: compatíveis (exemplo já preenchido)
  const focusOptions = p.options.filter((o) => p.focusIds.includes(o.areaId));
  for (let i = 0; i < focusOptions.length; i++) {
    for (let j = i + 1; j < focusOptions.length; j++) {
      const a = focusOptions[i];
      const b = focusOptions[j];
      if (a.areaId === b.areaId) continue;
      if (!p.compat.some((r) => (r.a === a.id && r.b === b.id) || (r.a === b.id && r.b === a.id))) {
        p.compat.push({ id: 'c' + ci++, a: a.id, b: b.id, status: 'compativel' });
      }
    }
  }

  // ---- Áreas de comparação (rótulos terminam com ":") ----
  p.comparisonAreas = [
    { id: 'cap', label: 'CAPITAL:', description: 'Diferenças no desembolso de capital com obras e aquisição de propriedades.', evalType: 'monetaria', group: 'FINANÇAS:' },
    { id: 'inc', label: 'INCOME:', description: 'Diferenças nos fluxos líquidos de receita para a autoridade pública (fluxo anual).', evalType: 'monetaria', group: 'FINANÇAS:' },
    { id: 'jobs', label: 'JOBS:', description: 'Diferenças nas oportunidades locais de emprego.', evalType: 'numerica', group: '' },
    { id: 'res', label: 'RESIDENTS:', description: 'Diferenças na confiança e na qualidade de vida dos moradores do South Side.', evalType: 'linguistica', group: '' },
  ];

  // ---- Incerteza e opção exploratória de exemplo ----
  p.uncertainties = [
    {
      id: 'u1',
      title: '?SITEJOBS — atratividade do terreno central para indústrias',
      description: 'O terreno central realmente atrairia indústrias intensivas em emprego? Dúvida técnico-econômica sobre o ambiente de mercado.',
      type: 'UE',
      schemeKeys: [],
      areaIds: ['cent'],
      comparisonAreaIds: ['jobs', 'inc'],
      criticality: 4,
      owner: 'Equipe de planejamento',
      deadline: '',
    },
  ];
  p.exploratory = [
    {
      id: 'e1',
      uncertaintyId: 'u1',
      name: 'Pesquisa de mercado com consultores',
      description: 'Contratar consultoria para pesquisa de mercado sobre demanda industrial pelo terreno central. Aumenta ligeiramente a confiança na comparação entre esquemas.',
      cost: '20k',
      deadline: '3 meses',
      owner: 'Secretaria de Desenvolvimento',
      type: 'estudo_tecnico',
      impact: 3,
      worthIt: 'avaliar',
    },
  ];

  return p;
}
