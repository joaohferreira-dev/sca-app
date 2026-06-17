// ============================================================
// Aplicação principal: wizard com menu lateral, painel de
// validações, exportação/importação JSON e relatório
// (a etapa de priorização por critérios está oculta do fluxo)
// ============================================================
import React, { Suspense, useMemo, useRef, useState } from 'react';
import { ProjectProvider, downloadFile, exportProjectJSON, parseImportedProject, useProject } from './store';
import { validateProject } from './lib/sca';
import { buildReport } from './lib/report';
import { Btn, TextInput } from './components/ui';
import { Step1Problem, Step2Areas, Step3Links, Step4Graph, Step6Focus } from './steps/shaping';
import { Step7Compatibility, Step8OptionsGraph, Step9Schemes } from './steps/designing';
import { Step10ComparisonAreas, Step11Assessment, Step12Advantage } from './steps/comparing';
import { Step13Uncertainty, Step14Exploratory, Step15Robustness, Step16Package } from './steps/choosing';

// A página inicial (Three.js + GSAP) e o relatório são carregados
// sob demanda para não pesar o bundle principal da aplicação.
const Landing = React.lazy(() => import('./landing/Landing'));
const PrintReport = React.lazy(() => import('./report/PrintReport'));

interface StepDef {
  n: number;
  title: string;
  component: React.ComponentType;
}

interface ModeDef {
  mode: string;
  steps: StepDef[];
}

const MODES: ModeDef[] = [
  {
    mode: 'Shaping — estruturar o problema',
    steps: [
      { n: 1, title: 'Definir o problema', component: Step1Problem },
      { n: 2, title: 'Lista de decisões', component: Step2Areas },
      { n: 3, title: 'Conexões decisórias', component: Step3Links },
      { n: 4, title: 'Gráfico de decisão', component: Step4Graph },
      { n: 5, title: 'Foco do problema', component: Step6Focus },
    ],
  },
  {
    mode: 'Designing — construir alternativas',
    steps: [
      { n: 6, title: 'Opções e matriz de compatibilidade', component: Step7Compatibility },
      { n: 7, title: 'Gráfico de opções', component: Step8OptionsGraph },
      { n: 8, title: 'Esquemas viáveis', component: Step9Schemes },
    ],
  },
  {
    mode: 'Comparing — comparar consequências',
    steps: [
      { n: 9, title: 'Áreas de comparação', component: Step10ComparisonAreas },
      { n: 10, title: 'Avaliação relativa', component: Step11Assessment },
      { n: 11, title: 'Vantagem comparativa (+11.1)', component: Step12Advantage },
    ],
  },
  {
    mode: 'Choosing — escolher e progredir',
    steps: [
      { n: 12, title: 'Áreas de incerteza (UE/UV/UR)', component: Step13Uncertainty },
      { n: 13, title: 'Opções exploratórias', component: Step14Exploratory },
      { n: 14, title: 'Esquemas de ação e robustez', component: Step15Robustness },
      { n: 15, title: 'Pacote de compromisso', component: Step16Package },
    ],
  },
];

const ALL_STEPS = MODES.flatMap((m) => m.steps);
const LAST_STEP = ALL_STEPS[ALL_STEPS.length - 1].n;

interface ConfirmAsk {
  message: string;
  action: () => void;
}

function Shell() {
  const { project, update, replace, reset, loadSample } = useProject();
  const [step, setStep] = useState(1);
  // página inicial: aparece na primeira visita; depois fica acessível pelo menu
  const [landing, setLanding] = useState(() => !localStorage.getItem('sca-entrou'));
  const [reportView, setReportView] = useState(false);
  const [showAlerts, setShowAlerts] = useState(true);
  // confirmação estilizada para ações destrutivas (exemplo / novo projeto)
  const [confirmAsk, setConfirmAsk] = useState<ConfirmAsk | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const msgs = useMemo(() => validateProject(project), [project]);
  const current = ALL_STEPS.find((s) => s.n === step) ?? ALL_STEPS[0];
  const Component = current.component;

  function enterApp() {
    try { localStorage.setItem('sca-entrou', '1'); } catch { /* sem armazenamento */ }
    setLanding(false);
  }

  function importJSON(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        replace(parseImportedProject(String(reader.result)));
      } catch (e) {
        alert('Falha ao importar: ' + (e instanceof Error ? e.message : 'arquivo inválido.'));
      }
    };
    reader.readAsText(file);
  }

  const confirmModal = confirmAsk && (
    <div className="fixed inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-6">
      <div className="bg-[#fdfcf7] border border-stone-300 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="hand2 text-4xl font-bold text-stone-900 mb-1">Tem certeza?</div>
        <p className="text-sm text-stone-600 mb-6">{confirmAsk.message}</p>
        <div className="flex gap-2 justify-end">
          <Btn variant="secondary" onClick={() => setConfirmAsk(null)}>Cancelar</Btn>
          <Btn onClick={() => { confirmAsk.action(); setConfirmAsk(null); }}>Sim, continuar</Btn>
        </div>
      </div>
    </div>
  );

  if (reportView) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#f1ecdf] flex items-center justify-center text-stone-500 hand text-2xl">preparando o relatório…</div>}>
        <PrintReport onBack={() => setReportView(false)} />
      </Suspense>
    );
  }

  if (landing) {
    return (
      <>
        {confirmModal}
        <Suspense fallback={<div className="min-h-screen bg-[#f1ecdf] flex items-center justify-center text-stone-500 hand text-2xl">abrindo o caderno…</div>}>
          <Landing
            onEnter={enterApp}
            onLoadSample={() =>
              setConfirmAsk({
                message: 'O projeto atual salvo neste navegador será substituído pelo exemplo South Side. Deseja continuar?',
                action: () => { loadSample(); enterApp(); },
              })
            }
          />
        </Suspense>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1ecdf] flex">
      {confirmModal}
      {/* -------- Menu lateral (wizard) -------- */}
      <aside className="w-72 shrink-0 bg-stone-900 text-stone-200 flex flex-col">
        <div className="p-4 border-b border-stone-700">
          <div className="font-bold text-amber-50 text-2xl leading-tight hand2">Strategic Choice Approach</div>
          <div className="text-xs text-stone-400 mt-1">
            Estruturação participativa e incremental de decisões interdependentes sob incerteza (Friend &amp; Hickling).
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {MODES.map((m) => (
            <div key={m.mode} className="mb-2">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 px-2 py-1">{m.mode}</div>
              {m.steps.map((s) => (
                <button
                  key={s.n}
                  onClick={() => setStep(s.n)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 ${
                    step === s.n ? 'bg-stone-700 text-amber-50' : 'hover:bg-stone-800'
                  }`}
                >
                  <span className={`w-6 h-6 shrink-0 rounded-full text-xs flex items-center justify-center font-bold ${
                    step === s.n ? 'bg-amber-50 text-stone-900' : 'bg-stone-700'
                  }`}>{s.n}</span>
                  {s.title}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-stone-700 space-y-2 text-sm">
          <button className="w-full text-left px-2 py-1 rounded hover:bg-stone-800" onClick={() => setLanding(true)}>✦ Página inicial</button>
          <button className="w-full text-left px-2 py-1 rounded hover:bg-stone-800" onClick={() => exportProjectJSON(project)}>⬇ Exportar projeto (JSON)</button>
          <button className="w-full text-left px-2 py-1 rounded hover:bg-stone-800" onClick={() => fileRef.current?.click()}>⬆ Importar projeto (JSON)</button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importJSON(f); e.target.value = ''; }} />
          <button className="w-full text-left px-2 py-1 rounded hover:bg-stone-800"
            onClick={() => downloadFile('relatorio-sca.md', buildReport(project), 'text/markdown')}>
            📄 Exportar relatório (Markdown)
          </button>
          <button className="w-full text-left px-2 py-1 rounded hover:bg-stone-800" onClick={() => setReportView(true)}>
            🖨 Exportar relatório (PDF)
          </button>
          <button
            className="w-full text-left px-2 py-1 rounded hover:bg-stone-800"
            onClick={() =>
              setConfirmAsk({
                message: 'O projeto atual salvo neste navegador será substituído pelo exemplo South Side. Deseja continuar?',
                action: loadSample,
              })
            }
          >
            ⟳ Carregar exemplo South Side
          </button>
          <button
            className="w-full text-left px-2 py-1 rounded hover:bg-stone-800 text-red-300"
            onClick={() =>
              setConfirmAsk({
                message: 'Todo o projeto atual será apagado e um projeto em branco será criado. Deseja continuar?',
                action: reset,
              })
            }
          >
            ✕ Novo projeto em branco
          </button>
          <div className="text-[10px] text-stone-500 pt-1">Salvamento automático no navegador (localStorage).</div>
        </div>
      </aside>

      {/* -------- Conteúdo -------- */}
      <main className="flex-1 min-w-0">
        <header className="bg-[#fbfaf6] border-b border-stone-300 px-6 py-3 flex items-center justify-between gap-4">
          <TextInput
            value={project.name}
            onChange={(e) => update((p) => void (p.name = e.target.value))}
            className="!w-96 font-semibold"
            aria-label="Nome do projeto"
          />
          {msgs.length > 0 && (
            <button onClick={() => setShowAlerts(!showAlerts)} className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
              ⚠ {msgs.length} aviso(s) {showAlerts ? '▾' : '▸'}
            </button>
          )}
        </header>

        {showAlerts && msgs.length > 0 && (
          <div className="px-6 pt-4">
            <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-1">
              {msgs.map((m, i) => (
                <button key={i} onClick={() => setStep(m.step)} className="block w-full text-left text-sm hover:underline">
                  <span className={m.level === 'erro' ? 'text-red-600 font-semibold' : 'text-amber-700'}>
                    [{m.level === 'erro' ? 'pendência' : 'aviso'} — etapa {m.step}]
                  </span>{' '}
                  {m.text}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="p-6 max-w-6xl">
          <Component />
          <div className="flex justify-between mt-8 pb-10">
            <Btn variant="secondary" disabled={step === 1} onClick={() => setStep(step - 1)}>← Etapa anterior</Btn>
            <Btn disabled={step === LAST_STEP} onClick={() => setStep(step + 1)}>Próxima etapa →</Btn>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <Shell />
    </ProjectProvider>
  );
}
