// ============================================================
// Página inicial — experiência "caderno de planejamento":
// - Hero com rede de decisões 3D (Three.js) flutuando como
//   grafite sobre papel, com paralaxe ao mouse;
// - Cena da mesa (SVG desenhado à mão) com balão de pensamento,
//   traços que se desenham sozinhos no scroll (GSAP);
// - Seções dos 4 modos do SCA com entrada em cascata.
// ============================================================
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const PENCIL = 0x3f4a5a;
const WORDS = ['PENSANDO…', 'MOLDANDO…', 'DESENHANDO…', 'COMPARANDO…', 'ESCOLHENDO…'];

// ------------------------------------------------------------
// Rede de decisões 3D "pensante": um lápis escreve os nós e as
// conexões um a um; depois uma borracha apaga tudo — como alguém
// rascunhando e repensando decisões. Rotação lenta + paralaxe.
// Ciclo: ESCREVER → CONTEMPLAR → APAGAR → pausa → recomeça.
// ------------------------------------------------------------
function useDecisionNetwork(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 16;

    // nós: pontos distribuídos numa esfera achatada
    const N = 22;
    const positions: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      const b = Math.acos(2 * Math.random() - 1);
      const r = 5.2 + Math.random() * 2.6;
      positions.push(
        new THREE.Vector3(r * Math.sin(b) * Math.cos(a), r * Math.sin(b) * Math.sin(a) * 0.62, r * Math.cos(b)),
      );
    }

    // ordem em que o lápis "escreve" os nós (embaralhada)
    const order = positions.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const rank: number[] = [];
    order.forEach((nodeIdx, k) => (rank[nodeIdx] = k));

    // textura circular suave para os nós (desenhada num canvas)
    const dot = document.createElement('canvas');
    dot.width = dot.height = 64;
    const dctx = dot.getContext('2d')!;
    dctx.beginPath();
    dctx.arc(32, 32, 13, 0, Math.PI * 2);
    dctx.lineWidth = 5;
    dctx.strokeStyle = '#3f4a5a';
    dctx.stroke();
    dctx.beginPath();
    dctx.arc(32, 32, 6, 0, Math.PI * 2);
    dctx.fillStyle = 'rgba(63,74,90,0.55)';
    dctx.fill();
    const dotTex = new THREE.CanvasTexture(dot);

    // um sprite por nó, para controlar a opacidade individual
    // (cada nó "surge" quando o lápis chega até ele)
    const sprites: THREE.Sprite[] = positions.map((p) => {
      const m = new THREE.SpriteMaterial({ map: dotTex, transparent: true, opacity: 0, depthWrite: false });
      const s = new THREE.Sprite(m);
      s.position.copy(p);
      s.scale.setScalar(0.62);
      return s;
    });

    // conexões (2 vizinhos mais próximos), ordenadas pelo momento em
    // que podem aparecer: quando o ÚLTIMO dos dois nós for escrito
    interface Seg { a: number; b: number; when: number }
    const segs: Seg[] = [];
    positions.forEach((p, i) => {
      positions
        .map((q, j) => ({ j, d: p.distanceTo(q) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
        .forEach((x) => {
          if (!segs.some((s) => (s.a === x.j && s.b === i) || (s.a === i && s.b === x.j))) {
            segs.push({ a: i, b: x.j, when: Math.max(rank[i], rank[x.j]) });
          }
        });
    });
    segs.sort((s1, s2) => s1.when - s2.when);
    const linePos: number[] = [];
    segs.forEach((s) => linePos.push(...positions[s.a].toArray(), ...positions[s.b].toArray()));
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
    lineGeo.setDrawRange(0, 0); // nada desenhado no início
    const lines = new THREE.LineSegments(
      lineGeo,
      new THREE.LineBasicMaterial({ color: PENCIL, transparent: true, opacity: 0.22 }),
    );

    // segCount[k] = nº de VÉRTICES de linha visíveis quando k nós já existem
    const segCount: number[] = [];
    for (let k = 0; k <= N; k++) segCount[k] = segs.filter((s) => s.when < k).length * 2;

    // ---- lápis (corpo cilíndrico + ponta de grafite) ----
    const pencil = new THREE.Group();
    const pencilBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 1.7, 8),
      new THREE.MeshBasicMaterial({ color: 0x8a8f99 }),
    );
    pencilBody.position.y = 1.05;
    const pencilTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.38, 8),
      new THREE.MeshBasicMaterial({ color: 0x3f4a5a }),
    );
    pencilTip.rotation.x = Math.PI; // ponta para baixo
    pencilTip.position.y = 0.16;
    pencil.add(pencilBody, pencilTip);
    pencil.rotation.z = -0.45; // inclinado, como na escrita
    pencil.visible = false;

    // ---- borracha ----
    const eraser = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.4, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xcfc8b8 }),
    );
    eraser.visible = false;

    const group = new THREE.Group();
    sprites.forEach((s) => group.add(s));
    group.add(lines, pencil, eraser);
    scene.add(group);

    // paralaxe suave com o mouse
    const mouse = { x: 0, y: 0 };
    const onMouse = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouse);

    const resize = () => {
      const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 800;
      const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 600;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    // fases do ciclo de "pensamento" (segundos)
    const WRITE = 11;
    const HOLD = 3.5;
    const ERASE = 7;
    const PAUSE = 1.4;
    const CYCLE = WRITE + HOLD + ERASE + PAUSE;
    const clamp01 = (v: number) => THREE.MathUtils.clamp(v, 0, 1);

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      const local = t % CYCLE;

      if (local < WRITE) {
        // ---- lápis escrevendo: nós e conexões surgem em sequência ----
        const f = (local / WRITE) * N; // posição fracionária na ordem de escrita
        sprites.forEach((s, i) => (s.material.opacity = clamp01(f - rank[i]) * 0.95));
        lineGeo.setDrawRange(0, segCount[Math.min(N, Math.floor(f))]);
        const k = Math.min(N - 1, Math.floor(f));
        const from = positions[order[Math.max(0, k - 1)]];
        const to = positions[order[k]];
        pencil.position.lerpVectors(from, to, clamp01((f - k) * 1.35));
        pencil.position.z += 0.25;
        pencil.rotation.z = -0.45 + Math.sin(t * 14) * 0.07; // tremor de escrita
        pencil.visible = true;
        eraser.visible = false;
      } else if (local < WRITE + HOLD) {
        // ---- contemplação: tudo escrito, lápis descansa ao lado ----
        sprites.forEach((s) => (s.material.opacity = 0.95));
        lineGeo.setDrawRange(0, segCount[N]);
        pencil.position.set(8.6, 2.4 + Math.sin(t * 1.2) * 0.35, 1.2);
        pencil.rotation.z = -0.45;
        pencil.visible = true;
        eraser.visible = false;
      } else if (local < WRITE + HOLD + ERASE) {
        // ---- borracha apagando na ordem inversa (repensando) ----
        const e = ((local - WRITE - HOLD) / ERASE) * N; // nós já apagados
        sprites.forEach((s, i) => (s.material.opacity = clamp01(N - rank[i] - e) * 0.95));
        lineGeo.setDrawRange(0, segCount[Math.max(0, N - Math.ceil(e))]);
        const k = Math.min(N - 1, Math.floor(e));
        const from = positions[order[N - 1 - Math.max(0, k - 1)]];
        const to = positions[order[N - 1 - k]];
        eraser.position.lerpVectors(from, to, clamp01((e - k) * 1.35));
        eraser.position.x += Math.sin(t * 18) * 0.2; // esfregando
        eraser.position.z += 0.3;
        eraser.rotation.z = Math.sin(t * 9) * 0.2;
        eraser.visible = true;
        pencil.visible = false;
      } else {
        // ---- pausa em branco antes de recomeçar a pensar ----
        sprites.forEach((s) => (s.material.opacity = 0));
        lineGeo.setDrawRange(0, 0);
        pencil.visible = false;
        eraser.visible = false;
      }

      group.rotation.y = t * 0.05 + mouse.x * 0.18;
      group.rotation.x = Math.sin(t * 0.1) * 0.07 + mouse.y * 0.12;
      group.position.y = Math.sin(t * 0.4) * 0.18;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      sprites.forEach((s) => s.material.dispose());
      lineGeo.dispose();
      pencilBody.geometry.dispose();
      (pencilBody.material as THREE.Material).dispose();
      pencilTip.geometry.dispose();
      (pencilTip.material as THREE.Material).dispose();
      eraser.geometry.dispose();
      (eraser.material as THREE.Material).dispose();
      dotTex.dispose();
      renderer.dispose();
    };
  }, [canvasRef]);
}

// ------------------------------------------------------------
// Cena da mesa (inspirada na ilustração clássica): SVG à mão
// ------------------------------------------------------------
function DeskScene() {
  return (
    <svg viewBox="0 0 900 600" className="w-full max-w-3xl mx-auto hand" aria-label="Pessoa pensando em uma mesa de trabalho">
      <g fill="none" stroke="#1f2937" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        {/* balão de pensamento (nuvem) */}
        <path
          className="draw"
          d="M330 130 q-18 -34 16 -44 q4 -30 40 -26 q14 -26 48 -18 q22 -22 52 -8 q30 -14 50 8 q34 -6 42 22 q34 2 30 34 q22 16 2 38 q6 28 -28 30 q-12 26 -44 16 q-22 20 -48 6 q-28 16 -50 -4 q-34 10 -44 -16 q-34 4 -38 -26 q-22 -12 -8 -32"
        />
        <circle className="draw" cx="508" cy="208" r="12" />
        <circle className="draw" cx="528" cy="238" r="7" />
        {/* cabeça inclinada sobre o papel */}
        <path className="draw" d="M415 268 q-6 -42 36 -48 q40 -6 48 32 q4 26 -14 40" />
        {/* cabelo */}
        <path className="draw" d="M416 252 q10 -34 52 -32 q26 2 30 22 M438 232 q8 14 4 30 M462 226 q6 16 2 32" />
        {/* ombros e tronco debruçado */}
        <path className="draw" d="M372 412 q2 -78 50 -110 M498 290 q56 28 62 118" />
        {/* braços até o papel */}
        <path className="draw" d="M392 352 q18 38 58 48 M524 348 q-14 36 -52 50" />
        {/* caneta e folha sendo escrita */}
        <path className="draw" d="M452 396 l24 14 M414 418 l96 -10 l14 22 l-98 12 z M430 430 l60 -6 M434 440 l52 -6" strokeWidth="2.2" />
        {/* mesa */}
        <path className="draw" d="M70 452 L840 440 M80 452 L96 560 M828 441 L852 556 M70 452 q390 -16 770 -12" strokeWidth="3" />
        {/* bandeja IN */}
        <path className="draw" d="M130 392 l140 -8 l24 56 l-150 10 z M130 392 l10 50 l154 -2 M148 402 l116 -6" />
        {/* xícara */}
        <path className="draw" d="M318 424 q2 18 22 18 q20 0 22 -20 l-44 0 M362 426 q14 -2 12 10 q-2 10 -14 6 M306 446 q26 8 56 0" strokeWidth="2.2" />
        {/* bandeja OUT com papéis */}
        <path className="draw" d="M598 392 l150 -6 l20 52 l-158 8 z M598 392 l12 46 l158 -2 M620 402 l112 -4 M624 412 l110 -4 M630 422 l104 -4" />
      </g>
      {/* palavra dentro do balão (animada via GSAP) */}
      <text id="bubble-word" x="450" y="106" textAnchor="middle" fontSize="34" fontWeight="700" fill="#1f2937">
        PENSANDO…
      </text>
      {/* rótulos das bandejas */}
      <text x="172" y="436" fontSize="26" fontWeight="700" fill="#1f2937">IN</text>
      <text x="648" y="436" fontSize="26" fontWeight="700" fill="#1f2937">OUT</text>
    </svg>
  );
}

// ------------------------------------------------------------
const MODES = [
  { n: '01', name: 'Shaping', pt: 'Moldar o problema', desc: 'Formular a situação como um campo de escolhas interdependentes: áreas de decisão, conexões e foco — não sintomas genéricos.' },
  { n: '02', name: 'Designing', pt: 'Construir alternativas', desc: 'Opções por área, option bars (incompatibilidades) e geração combinatória dos esquemas de decisão viáveis.' },
  { n: '03', name: 'Comparing', pt: 'Comparar consequências', desc: 'Áreas de comparação, avaliação relativa a um esquema-base e julgamento de vantagens com incerteza explícita.' },
  { n: '04', name: 'Choosing', pt: 'Escolher e progredir', desc: 'Incertezas UE/UV/UR, explorações, robustez de compromissos parciais e o pacote de compromisso final.' },
];

export default function Landing({ onEnter, onLoadSample }: { onEnter: () => void; onLoadSample: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useDecisionNetwork(canvasRef);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // ---- entrada do hero ----
      gsap.from('.hero-line', { y: 46, opacity: 0, duration: 1, stagger: 0.14, ease: 'power3.out', delay: 0.15 });
      gsap.from('.hero-canvas', { opacity: 0, duration: 2, ease: 'power2.out' });
      gsap.to('.scroll-hint', { y: 8, repeat: -1, yoyo: true, duration: 0.9, ease: 'sine.inOut' });

      // ---- traços da cena da mesa se desenham no scroll ----
      const paths = gsap.utils.toArray<SVGPathElement | SVGCircleElement>('.draw');
      paths.forEach((p) => {
        const len = (p as SVGGeometryElement).getTotalLength();
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });
      gsap.to(paths, {
        strokeDashoffset: 0,
        duration: 2.4,
        stagger: 0.07,
        ease: 'power1.inOut',
        scrollTrigger: { trigger: '.desk-section', start: 'top 70%' },
      });
      // balão flutua
      gsap.to('.desk-float', { y: -10, repeat: -1, yoyo: true, duration: 2.4, ease: 'sine.inOut' });

      // ---- palavras do balão (modos do SCA) ----
      const word = document.getElementById('bubble-word');
      if (word) {
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.9, delay: 1.4 });
        WORDS.forEach((w) => {
          tl.to(word, { opacity: 0, duration: 0.35, ease: 'power1.in' })
            .add(() => { word.textContent = w; })
            .to(word, { opacity: 1, duration: 0.45, ease: 'power1.out' })
            .to({}, { duration: 1.4 });
        });
      }

      // ---- cards dos modos ----
      gsap.from('.mode-card', {
        y: 60,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.modes-section', start: 'top 72%' },
      });

      // ---- números finais ----
      gsap.from('.stat-item', {
        scale: 0.7,
        opacity: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: 'back.out(1.6)',
        scrollTrigger: { trigger: '.stats-section', start: 'top 78%' },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-[#f1ecdf] text-stone-800 overflow-x-hidden">
      {/* ================= HERO ================= */}
      <section className="relative h-screen flex flex-col items-center justify-center px-6">
        <canvas ref={canvasRef} className="hero-canvas absolute inset-0 w-full h-full" />
        <div className="relative text-center max-w-4xl pointer-events-none">
          <p className="hero-line hand text-xl md:text-2xl text-stone-500 mb-2">um caderno digital para decidir sob incerteza</p>
          <h1 className="hero-line hand2 text-7xl md:text-8xl font-bold leading-none text-stone-900">
            Strategic Choice<br />Approach
          </h1>
          <p className="hero-line mt-5 text-base md:text-lg text-stone-600 max-w-2xl mx-auto">
            Estruture decisões interdependentes como num rascunho à lápis: áreas de decisão, opções, incompatibilidades,
            esquemas viáveis e pacotes de compromisso — o método de Friend &amp; Hickling, do papel para a tela.
          </p>
          <div className="hero-line mt-8 flex flex-wrap gap-3 justify-center pointer-events-auto">
            <button
              onClick={onEnter}
              className="px-6 py-3 rounded-lg bg-stone-900 text-amber-50 text-base font-semibold hover:bg-stone-700 hover:-translate-y-0.5 transition-all shadow-md"
            >
              Abrir o caderno →
            </button>
            <button
              onClick={onLoadSample}
              className="px-6 py-3 rounded-lg border-2 border-stone-700 text-stone-800 text-base font-semibold hover:bg-stone-900 hover:text-amber-50 transition-all"
            >
              Ver o exemplo South Side
            </button>
          </div>
        </div>
        <div className="scroll-hint absolute bottom-8 text-stone-500 hand text-lg">↓ role para folhear</div>
      </section>

      {/* ================= CENA DA MESA ================= */}
      <section className="desk-section relative py-24 px-6">
        <div className="max-w-5xl mx-auto text-center mb-8">
          <h2 className="hand2 text-5xl md:text-6xl font-bold text-stone-900">Todo plano começa com alguém pensando.</h2>
          <p className="mt-3 text-stone-600 max-w-2xl mx-auto">
            O SCA transforma o “pensando…” em estrutura: em vez de buscar a resposta ótima de uma vez, ele organiza as
            escolhas, torna as incompatibilidades visíveis e permite avançar por compromissos parciais.
          </p>
        </div>
        <div className="desk-float">
          <DeskScene />
        </div>
      </section>

      {/* ================= MODOS ================= */}
      <section className="modes-section py-24 px-6 bg-[#ebe5d4]/60">
        <div className="max-w-6xl mx-auto">
          <h2 className="hand2 text-5xl font-bold text-stone-900 text-center mb-12">Quatro modos, um processo contínuo</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {MODES.map((m) => (
              <div key={m.n} className="mode-card bg-[#fdfcf7] border border-stone-300 rounded-xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="hand2 text-5xl font-bold text-stone-300">{m.n}</div>
                <div className="hand text-2xl font-bold text-stone-900 mt-1">{m.name}</div>
                <div className="text-sm font-semibold text-stone-500 mb-2">{m.pt}</div>
                <p className="text-sm text-stone-600 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-stone-500 mt-6">
            Os modos não são fases rígidas: o processo é incremental, participativo e interativo — pode-se voltar e refinar a qualquer momento.
          </p>
        </div>
      </section>

      {/* ================= NÚMEROS / CTA ================= */}
      <section className="stats-section py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-14">
          {[
            ['15', 'etapas guiadas'],
            ['3', 'tipos de incerteza (UE·UV·UR)'],
            ['2', 'indicadores de robustez'],
            ['1', 'pacote de compromisso'],
          ].map(([n, l]) => (
            <div key={l} className="stat-item">
              <div className="hand2 text-7xl font-bold text-stone-900">{n}</div>
              <div className="text-sm text-stone-600">{l}</div>
            </div>
          ))}
        </div>
        <button
          onClick={onEnter}
          className="px-8 py-4 rounded-lg bg-stone-900 text-amber-50 text-lg font-semibold hover:bg-stone-700 hover:-translate-y-0.5 transition-all shadow-md"
        >
          Começar a estruturar →
        </button>
        <p className="hand text-lg text-stone-500 mt-10">
          baseado em Friend &amp; Hickling, <em>Planning Under Pressure</em> — seus dados ficam no seu navegador.
        </p>
      </section>
    </div>
  );
}
