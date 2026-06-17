// ============================================================
// Estado global do projeto + persistência em localStorage
// ============================================================
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Project } from './types';
import { emptyProject } from './lib/sca';
import { southSide } from './data/southside';

const STORAGE_KEY = 'sca-projeto-v1';

interface Store {
  project: Project;
  /** Atualização imutável: recebe uma cópia profunda e devolve o novo projeto. */
  update: (fn: (draft: Project) => void) => void;
  replace: (p: Project) => void;
  reset: () => void;
  loadSample: () => void;
}

const Ctx = createContext<Store | null>(null);

/** Migração de projetos salvos antes dos novos campos. */
function migrate(p: Project): Project {
  p.links = (p.links ?? []).map((l) => ({ ...l, strength: l.strength === 'moderada' ? 'moderada' : 'forte' }));
  p.commitmentMatrix = p.commitmentMatrix ?? {};
  p.commitmentAreaIds = p.commitmentAreaIds ?? [];
  return p;
}

function load(): Project {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Project;
      if (p && p.version === 1 && Array.isArray(p.areas)) return migrate(p);
    }
  } catch {
    /* armazenamento corrompido: recomeça com o exemplo */
  }
  return southSide();
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project>(load);

  // Salvamento automático a cada alteração
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch {
      /* cota excedida: ignora silenciosamente */
    }
  }, [project]);

  const store = useMemo<Store>(
    () => ({
      project,
      update: (fn) =>
        setProject((prev) => {
          const draft = structuredClone(prev);
          fn(draft);
          return draft;
        }),
      replace: (p) => setProject(p),
      reset: () => setProject(emptyProject()),
      loadSample: () => setProject(southSide()),
    }),
    [project],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useProject(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useProject deve ser usado dentro de <ProjectProvider>');
  return s;
}

// ---------- Exportar / importar JSON ----------

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportProjectJSON(p: Project) {
  downloadFile(
    (p.name || 'projeto-sca').replace(/[^\p{L}\p{N}-]+/gu, '-').toLowerCase() + '.json',
    JSON.stringify(p, null, 2),
    'application/json',
  );
}

/** Validação mínima do arquivo importado. */
export function parseImportedProject(text: string): Project {
  const p = JSON.parse(text);
  if (!p || p.version !== 1 || !Array.isArray(p.areas) || !Array.isArray(p.options)) {
    throw new Error('Arquivo não reconhecido como projeto SCA (versão 1).');
  }
  return migrate(p as Project);
}
