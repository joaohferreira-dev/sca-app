// ============================================================
// Contexto de design do relatório/figuras.
//  - 'caderno'    → estética manuscrita (lápis, papel, Patrick Hand)
//  - 'cientifico' → figuras limpas (linhas retas, círculos, Times)
// Padrão = 'caderno', de modo que a aplicação interativa permanece
// inalterada; o modo científico é ativado apenas dentro do relatório.
// ============================================================
import { createContext, useContext } from 'react';

export type ReportDesign = 'caderno' | 'cientifico';

export const DesignContext = createContext<ReportDesign>('caderno');

export function useDesign(): ReportDesign {
  return useContext(DesignContext);
}
