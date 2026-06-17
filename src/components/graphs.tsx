// ============================================================
// Gráficos SVG interativos com estética "desenhado à mão/lápis":
// - gráfico de decisão (nós arrastáveis, conexões forte/moderada,
//   laço de foco desenhado com o mouse como um lápis)
// - gráfico de opções (clusters por área em traço de lápis preto +
//   option bars em vermelho; opções reposicionáveis)
// Os traços usam curvas Bézier com leve irregularidade
// DETERMINÍSTICA (semente por id), para não "tremer" a cada render.
// ============================================================
import React, { useRef, useState } from 'react';
import { CompatibilityRelation, DecisionArea, DecisionLink, DecisionOption, IncompatType, LinkStrength } from '../types';
import { useDesign } from '../design'; // modo caderno | científico

const VW = 900;
const VH = 520;
const PENCIL = '#3f4a5a'; // grafite
const PAPER = '#fbfaf6';

function svgCoords(svg: SVGSVGElement, clientX: number, clientY: number) {
  const r = svg.getBoundingClientRect();
  return { x: ((clientX - r.left) / r.width) * VW, y: ((clientY - r.top) / r.height) * VH };
}

// ---------- utilitários de traço manual (determinísticos) ----------
function seedRand(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = (Math.imul(h, 1103515245) + 12345) | 0;
    return ((h >>> 16) & 0x7fff) / 0x8000;
  };
}

/** Linha "à lápis": curva quadrática com leve desvio perpendicular.
 *  No modo científico (clean=true) devolve uma reta exata. */
export function sketchLine(x1: number, y1: number, x2: number, y2: number, seed: string, clean = false): string {
  if (clean) return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  const rnd = seedRand(seed);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const amp = Math.min(14, Math.max(4, len * 0.07)) * (rnd() < 0.5 ? -1 : 1) * (0.6 + 0.8 * rnd());
  const mx = (x1 + x2) / 2 - (dy / len) * amp;
  const my = (y1 + y2) / 2 + (dx / len) * amp;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** Caminho fechado suave (Catmull-Rom → Bézier) por uma lista de pontos. */
function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}

/** Círculo "desenhado à mão": pontos jitterizados unidos por Catmull-Rom.
 *  No modo científico (clean=true) devolve um círculo geométrico exato. */
export function blobPath(cx: number, cy: number, r: number, seed: string, clean = false): string {
  if (clean) {
    return `M ${(cx - r).toFixed(1)} ${cy.toFixed(1)} a ${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0 a ${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0 Z`;
  }
  const rnd = seedRand(seed);
  const n = 10;
  const pts: [number, number][] = [];
  const a0 = rnd() * Math.PI;
  for (let i = 0; i < n; i++) {
    const a = a0 + (2 * Math.PI * i) / n;
    const rr = r * (0.96 + 0.07 * rnd());
    pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
  }
  return smoothClosed(pts);
}

/** Estilo de traço por intensidade: forte = contínua; moderada = tracejada. */
export function strokeForStrength(s: LinkStrength): { dash?: string; width: number } {
  return s === 'moderada' ? { dash: '7 6', width: 1.3 } : { width: 1.7 };
}

/** Teste ponto-em-polígono (ray casting) — usado pelo laço de foco. */
function insidePolygon(px: number, py: number, poly: { x: number; y: number }[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

/** Casco convexo (monotone chain) — contorno do foco do problema. */
function convexHull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
    lower.push(pt);
  }
  const upper: [number, number][] = [];
  for (const pt of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
    upper.push(pt);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

// ------------------------------------------------------------
// Gráfico de decisão — mapa de interdependência (não é fluxograma)
// ------------------------------------------------------------
export function DecisionGraph({
  areas,
  links,
  focusIds,
  degree,
  connectMode,
  lassoMode,
  showFocusHull,
  onMove,
  onConnect,
  onRemoveLink,
  onLasso,
}: {
  areas: DecisionArea[];
  links: DecisionLink[];
  focusIds: string[];
  degree: Record<string, number>;
  connectMode?: boolean;
  /** desenhar um laço com o mouse (como um lápis) para escolher o foco */
  lassoMode?: boolean;
  /** desenhar o contorno tracejado em volta das áreas em foco */
  showFocusHull?: boolean;
  onMove?: (id: string, x: number, y: number) => void;
  onConnect?: (a: string, b: string) => void;
  onRemoveLink?: (id: string) => void;
  /** devolve os ids das áreas capturadas pelo laço */
  onLasso?: (areaIds: string[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [lassoPts, setLassoPts] = useState<{ x: number; y: number }[]>([]);
  const [drawing, setDrawing] = useState(false);
  const byId = Object.fromEntries(areas.map((a) => [a.id, a]));
  const clean = useDesign() === 'cientifico';

  function handlePointerDown(e: React.PointerEvent) {
    if (lassoMode && svgRef.current) {
      setDrawing(true);
      setLassoPts([svgCoords(svgRef.current, e.clientX, e.clientY)]);
    }
  }

  function handleMove(e: React.PointerEvent) {
    if (lassoMode && drawing && svgRef.current) {
      const pt = svgCoords(svgRef.current, e.clientX, e.clientY);
      setLassoPts((pts) => {
        const last = pts[pts.length - 1];
        return !last || Math.hypot(pt.x - last.x, pt.y - last.y) > 4 ? [...pts, pt] : pts;
      });
      return;
    }
    if (!dragId || !svgRef.current || !onMove) return;
    const { x, y } = svgCoords(svgRef.current, e.clientX, e.clientY);
    onMove(dragId, Math.max(45, Math.min(VW - 45, x)), Math.max(35, Math.min(VH - 35, y)));
  }

  function handlePointerUp() {
    if (lassoMode && drawing) {
      setDrawing(false);
      // fecha o laço e captura as áreas cujo centro caiu dentro dele
      if (lassoPts.length > 5 && onLasso) {
        const ids = areas.filter((a) => insidePolygon(a.x, a.y, lassoPts)).map((a) => a.id);
        onLasso(ids);
      }
      setLassoPts([]);
    }
    setDragId(null);
  }

  function handleNodeDown(id: string) {
    if (lassoMode) return; // no modo laço, o desenho tem prioridade
    if (connectMode && onConnect) {
      if (pending === null) setPending(id);
      else {
        if (pending !== id) onConnect(pending, id);
        setPending(null);
      }
    } else {
      setDragId(id);
    }
  }

  // contorno tracejado do foco (casco convexo com folga, traço suave)
  let hullPath: string | null = null;
  if (showFocusHull && focusIds.length > 0) {
    const padded: [number, number][] = [];
    areas
      .filter((a) => focusIds.includes(a.id))
      .forEach((a) => {
        const R = 56;
        for (let k = 0; k < 8; k++) {
          const ang = (Math.PI * 2 * k) / 8;
          padded.push([a.x + R * Math.cos(ang), a.y + R * Math.sin(ang)]);
        }
      });
    const hull = convexHull(padded);
    if (hull.length >= 3) hullPath = smoothClosed(hull);
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      className={`w-full ${clean ? 'bg-white border-stone-400' : 'bg-[#fbfaf6] border-stone-300'} border rounded-lg select-none touch-none hand ${lassoMode ? 'cursor-crosshair' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handleMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* contorno do foco do problema */}
      {hullPath && (
        <path d={hullPath} fill="none" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="11 8" strokeLinecap="round" opacity={0.85}>
          <title>Foco do problema (ciclo atual)</title>
        </path>
      )}
      {/* conexões: forte = contínua, moderada = tracejada */}
      {links.map((l) => {
        const a = byId[l.from];
        const b = byId[l.to];
        if (!a || !b) return null;
        const st = strokeForStrength(l.strength);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        return (
          <g key={l.id}>
            <path
              d={sketchLine(a.x, a.y, b.x, b.y, l.id, clean)}
              fill="none"
              stroke={PENCIL}
              strokeWidth={st.width}
              strokeDasharray={st.dash}
              strokeLinecap="round"
              opacity={0.85}
            >
              <title>{`${l.strength === 'moderada' ? 'Conexão moderada' : 'Conexão forte'}${l.description ? ' — ' + l.description : ''}`}</title>
            </path>
            {onRemoveLink && !lassoMode && (
              <g onClick={() => onRemoveLink(l.id)} className="cursor-pointer">
                <path d={blobPath(mx, my, 8, l.id + 'x', clean)} fill={clean ? '#fff' : PAPER} stroke="#cbd5e1" strokeWidth={0.8} />
                <text x={mx} y={my + 4} textAnchor="middle" fontSize={11} fill="#ef4444">×</text>
                <title>Remover conexão</title>
              </g>
            )}
          </g>
        );
      })}
      {/* nós */}
      {areas.map((a) => {
        const inFocus = focusIds.includes(a.id);
        const isPending = pending === a.id;
        return (
          <g
            key={a.id}
            transform={`translate(${a.x},${a.y})`}
            onPointerDown={(e) => {
              if (lassoMode) return; // deixa o evento chegar ao svg (laço)
              e.stopPropagation();
              handleNodeDown(a.id);
            }}
            className={lassoMode ? undefined : connectMode ? 'cursor-crosshair' : 'cursor-grab'}
          >
            <path
              d={blobPath(0, 0, 38, a.id, clean)}
              fill={inFocus ? (clean ? '#eef2f7' : '#f0ede2') : clean ? '#fff' : PAPER}
              stroke={isPending ? '#f59e0b' : PENCIL}
              strokeWidth={isPending ? 2.6 : inFocus ? 1.8 : 1.3}
              strokeDasharray={inFocus ? undefined : '6 5'}
              strokeLinecap="round"
            />
            <text textAnchor="middle" y={0} fontSize={13} fontWeight={700} fill="#1e293b">
              {a.label.length > 13 ? a.label.slice(0, 12) + '…' : a.label}
            </text>
            <text textAnchor="middle" y={15} fontSize={10} fill="#64748b">
              {degree[a.id] ?? 0} conexão(ões)
            </text>
            <title>{a.question}</title>
          </g>
        );
      })}
      {/* traço do laço enquanto é desenhado */}
      {lassoPts.length > 1 && (
        <path
          d={'M ' + lassoPts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')}
          fill="rgba(99,102,241,0.05)"
          stroke="#6b7280"
          strokeWidth={1.6}
          strokeDasharray="6 5"
          strokeLinecap="round"
        />
      )}
      {connectMode && (
        <text x={10} y={22} fontSize={14} fill="#b45309">
          Modo conectar: clique em duas áreas para criar uma ligação.{pending ? ` Origem: ${byId[pending]?.label}` : ''}
        </text>
      )}
      {lassoMode && (
        <text x={10} y={22} fontSize={14} fill="#6b7280">
          Circule com o mouse (como um lápis) as áreas que farão parte do foco.
        </text>
      )}
    </svg>
  );
}

// ------------------------------------------------------------
// Gráfico de opções — traço de lápis preto; incompatibilidades
// (option bars) em VERMELHO
// ------------------------------------------------------------
export const INCOMPAT_COLORS: Record<IncompatType, string> = {
  fisica: '#ef4444',
  tecnica: '#f97316',
  economica: '#8b5cf6',
  politica: '#0ea5e9',
  temporal: '#10b981',
  normativa: '#64748b',
  outra: '#d946ef',
};

export const INCOMPAT_LABELS: Record<IncompatType, string> = {
  fisica: 'Física/espacial',
  tecnica: 'Técnica',
  economica: 'Econômica',
  politica: 'Política',
  temporal: 'Temporal',
  normativa: 'Normativa/legal',
  outra: 'Outra',
};

const BAR_RED = '#dc2626';
const CLUSTER_R = 80;
const OPT_R = 20;

export interface MultipleOptionBar {
  id: string;
  optionIds: string[]; // ≥3 opções mutuamente incompatíveis
  title: string;
}

export function OptionsGraph({
  areas,
  options,
  bars,
  highlightOptionId,
  onMoveOption,
  compatMode,
  hubs,
  extraGreen,
  onMoveArea,
  areaBars,
  deadOptionIds,
}: {
  areas: DecisionArea[];
  options: DecisionOption[];
  bars: CompatibilityRelation[];
  highlightOptionId?: string | null;
  onMoveOption?: (id: string, ox: number, oy: number) => void;
  /** true = as linhas representam COMPATIBILIDADES (verde), não option bars */
  compatMode?: boolean;
  /** "multiple option bars": cliques de incompatibilidade mútua → nó central ○ */
  hubs?: MultipleOptionBar[];
  /** barras verdes substitutivas ("compatível com a única restante") */
  extraGreen?: { id: string; a: string; b: string }[];
  /** arraste do CLUSTER da área inteira (posição persistida em gx/gy) */
  onMoveArea?: (id: string, x: number, y: number) => void;
  /** barra agregada: a opção é incompatível com TODAS as opções da área */
  areaBars?: { id: string; optionId: string; areaId: string; title: string }[];
  /** opções inviáveis (incompatíveis com todas as demais): esmaecidas com ✕ */
  deadOptionIds?: string[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragAreaId, setDragAreaId] = useState<string | null>(null);
  const clean = useDesign() === 'cientifico';

  const cx = VW / 2;
  const cy = VH / 2;
  const ringR = Math.min(VW, VH) / 2 - 110;

  const areaCenters: Record<string, { x: number; y: number }> = {};
  areas.forEach((area, i) => {
    // posição manual (gx/gy) tem prioridade sobre o layout automático
    if (area.gx !== undefined && area.gy !== undefined) {
      areaCenters[area.id] = { x: area.gx, y: area.gy };
      return;
    }
    const ang = (2 * Math.PI * i) / Math.max(areas.length, 1) - Math.PI / 2;
    areaCenters[area.id] = {
      x: areas.length === 1 ? cx : cx + ringR * Math.cos(ang),
      y: areas.length === 1 ? cy : cy + ringR * Math.sin(ang),
    };
  });

  const positions: Record<string, { x: number; y: number }> = {};
  areas.forEach((area) => {
    const c = areaCenters[area.id];
    const opts = options.filter((o) => o.areaId === area.id);
    opts.forEach((o, j) => {
      if (o.ox !== undefined && o.oy !== undefined) {
        positions[o.id] = { x: c.x + o.ox, y: c.y + o.oy };
      } else if (opts.length === 1) {
        positions[o.id] = { x: c.x, y: c.y };
      } else {
        const oa = (2 * Math.PI * j) / opts.length - Math.PI / 2;
        positions[o.id] = { x: c.x + 46 * Math.cos(oa), y: c.y + 46 * Math.sin(oa) };
      }
    });
  });

  function handleMove(e: React.PointerEvent) {
    if (!svgRef.current) return;
    // arraste do cluster inteiro (as opções acompanham, pois os
    // deslocamentos ox/oy são relativos ao centro da área)
    if (dragAreaId && onMoveArea) {
      const { x, y } = svgCoords(svgRef.current, e.clientX, e.clientY);
      onMoveArea(
        dragAreaId,
        Math.round(Math.max(CLUSTER_R, Math.min(VW - CLUSTER_R, x))),
        Math.round(Math.max(CLUSTER_R + 26, Math.min(VH - CLUSTER_R, y))),
      );
      return;
    }
    if (!dragId || !onMoveOption) return;
    const opt = options.find((o) => o.id === dragId);
    if (!opt) return;
    const c = areaCenters[opt.areaId];
    if (!c) return;
    const { x, y } = svgCoords(svgRef.current, e.clientX, e.clientY);
    let ox = x - c.x;
    let oy = y - c.y;
    const maxR = CLUSTER_R - OPT_R - 2;
    const len = Math.hypot(ox, oy);
    if (len > maxR) {
      ox = (ox / len) * maxR;
      oy = (oy / len) * maxR;
    }
    onMoveOption(dragId, Math.round(ox), Math.round(oy));
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      className={`w-full ${clean ? 'bg-white border-stone-400' : 'bg-[#fbfaf6] border-stone-300'} border rounded-lg select-none touch-none hand`}
      onPointerMove={handleMove}
      onPointerUp={() => { setDragId(null); setDragAreaId(null); }}
      onPointerLeave={() => { setDragId(null); setDragAreaId(null); }}
    >
      {areas.map((a) => {
        const c = areaCenters[a.id];
        return (
          <g
            key={a.id}
            className={onMoveArea ? 'cursor-grab' : undefined}
            onPointerDown={(e) => {
              if (onMoveArea) {
                e.stopPropagation();
                setDragAreaId(a.id);
              }
            }}
          >
            <path d={blobPath(c.x, c.y, CLUSTER_R, a.id + 'cl', clean)} fill={clean ? '#fff' : PAPER} stroke={PENCIL} strokeWidth={1.4} strokeLinecap="round" opacity={0.95} />
            <text x={c.x} y={c.y - CLUSTER_R - 10} textAnchor="middle" fontSize={15} fontWeight={700} fill="#1f2937">
              {a.label}
            </text>
            <title>{`${a.question}${onMoveArea ? ' (arraste para mover a área inteira)' : ''}`}</title>
          </g>
        );
      })}
      {bars.map((r) => {
        const pa = positions[r.a];
        const pb = positions[r.b];
        if (!pa || !pb) return null;
        const dim = highlightOptionId && r.a !== highlightOptionId && r.b !== highlightOptionId;
        return (
          <path
            key={r.id}
            d={sketchLine(pa.x, pa.y, pb.x, pb.y, r.id, clean)}
            fill="none"
            stroke={compatMode ? '#15803d' : BAR_RED}
            strokeWidth={dim ? 1 : compatMode ? 1.5 : 2}
            strokeLinecap="round"
            opacity={dim ? 0.15 : compatMode ? 0.55 : 0.9}
          >
            <title>
              {compatMode
                ? 'Compatível — estas opções podem coexistir no mesmo esquema'
                : `${INCOMPAT_LABELS[r.incompatType ?? 'outra']}${r.justification ? ' — ' + r.justification : ''}`}
            </title>
          </path>
        );
      })}
      {/* barras verdes substitutivas: compatibilidade com a ÚNICA opção
          restante de uma área cujas demais opções são todas incompatíveis */}
      {(extraGreen ?? []).map((g) => {
        const pa = positions[g.a];
        const pb = positions[g.b];
        if (!pa || !pb) return null;
        const dim = highlightOptionId && g.a !== highlightOptionId && g.b !== highlightOptionId;
        return (
          <path
            key={g.id}
            d={sketchLine(pa.x, pa.y, pb.x, pb.y, g.id, clean)}
            fill="none"
            stroke="#15803d"
            strokeWidth={dim ? 1 : 2.2}
            strokeLinecap="round"
            opacity={dim ? 0.15 : 0.85}
          >
            <title>Compatibilidade restante — todas as outras opções desta área são incompatíveis com esta opção</title>
          </path>
        );
      })}
      {/* barras agregadas: a opção é incompatível com TODAS as opções
          da outra área → uma única linha grossa até o círculo da área */}
      {(areaBars ?? []).map((ab) => {
        const p = positions[ab.optionId];
        const c = areaCenters[ab.areaId];
        if (!p || !c) return null;
        const dx = c.x - p.x;
        const dy = c.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const ex = c.x - (dx / len) * (CLUSTER_R + 4);
        const ey = c.y - (dy / len) * (CLUSTER_R + 4);
        const px = -(dy / len);
        const py = dx / len;
        const dim = highlightOptionId && ab.optionId !== highlightOptionId;
        return (
          <g key={ab.id} opacity={dim ? 0.15 : 0.9}>
            <path d={sketchLine(p.x, p.y, ex, ey, ab.id, clean)} fill="none" stroke={BAR_RED} strokeWidth={3} strokeLinecap="round" />
            {/* tique duplo no fim: bloqueia a área inteira */}
            <line x1={ex - px * 7} y1={ey - py * 7} x2={ex + px * 7} y2={ey + py * 7} stroke={BAR_RED} strokeWidth={2.5} strokeLinecap="round" />
            <line
              x1={ex - px * 7 - (dx / len) * 5}
              y1={ey - py * 7 - (dy / len) * 5}
              x2={ex + px * 7 - (dx / len) * 5}
              y2={ey + py * 7 - (dy / len) * 5}
              stroke={BAR_RED}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <title>{ab.title}</title>
          </g>
        );
      })}
      {/* multiple option bars: cliques de incompatibilidade mútua
          representados por um nó central ○ com raios (diagrama clássico) */}
      {(hubs ?? []).map((h) => {
        const pts = h.optionIds.map((id) => positions[id]).filter(Boolean);
        if (pts.length < 3) return null;
        const hx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const hy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
        const dim = highlightOptionId && !h.optionIds.includes(highlightOptionId);
        return (
          <g key={h.id} opacity={dim ? 0.15 : 0.92}>
            {pts.map((p, i) => (
              <path
                key={i}
                d={sketchLine(p.x, p.y, hx, hy, h.id + i, clean)}
                fill="none"
                stroke={BAR_RED}
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            ))}
            <circle cx={hx} cy={hy} r={5.5} fill={clean ? '#fff' : PAPER} stroke={BAR_RED} strokeWidth={2} />
            <title>{h.title}</title>
          </g>
        );
      })}
      {options.map((o) => {
        const pos = positions[o.id];
        if (!pos) return null;
        const hl = highlightOptionId === o.id;
        // opção inviável: incompatível com todas as opções das demais áreas
        const dead = deadOptionIds?.includes(o.id) ?? false;
        return (
          <g
            key={o.id}
            transform={`translate(${pos.x},${pos.y})`}
            className={onMoveOption ? 'cursor-grab' : undefined}
            opacity={dead ? 0.45 : 1}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (onMoveOption) setDragId(o.id);
            }}
          >
            <path
              d={blobPath(0, 0, OPT_R, o.id, clean)}
              fill={hl ? '#fef3c7' : clean ? '#fff' : PAPER}
              stroke={hl ? '#f59e0b' : PENCIL}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <text textAnchor="middle" y={4} fontSize={11} fontWeight={700} fill="#1f2937">
              {o.label.length > 7 ? o.label.slice(0, 6) + '…' : o.label}
            </text>
            {dead && (
              <g stroke="#dc2626" strokeWidth={2.6} strokeLinecap="round">
                <path d={sketchLine(-OPT_R + 4, -OPT_R + 4, OPT_R - 4, OPT_R - 4, o.id + 'x1', clean)} fill="none" />
                <path d={sketchLine(-OPT_R + 4, OPT_R - 4, OPT_R - 4, -OPT_R + 4, o.id + 'x2', clean)} fill="none" />
              </g>
            )}
            <title>
              {`${o.name}${dead ? ' — INVIÁVEL: incompatível com todas as opções das demais áreas em foco' : ''}${onMoveOption ? ' (arraste para reposicionar dentro da área)' : ''}`}
            </title>
          </g>
        );
      })}
    </svg>
  );
}
