import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DOCUMENTOS, achar } from '../src/motor/documentos.ts';

const pasta = (arq: string) => new URL(`../public/documentos/${arq}`, import.meta.url);

describe('catálogo de documentos', () => {
  it('tem os 4 documentos, sem ids repetidos', () => {
    expect(DOCUMENTOS).toHaveLength(4);
    const ids = DOCUMENTOS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('todo PDF e toda prévia citados existem em public/documentos/', () => {
    for (const d of DOCUMENTOS) {
      expect(existsSync(pasta(d.previa)), d.previa).toBe(true);
      expect(d.formatos.length).toBeGreaterThan(0);
      for (const f of d.formatos) { expect(existsSync(pasta(f.arquivo)), f.arquivo).toBe(true); expect(f.arquivo.endsWith('.pdf')).toBe(true); }
    }
  });
  it('nenhum arquivo repetido entre formatos e nomes só com caracteres seguros para o endereço', () => {
    const arqs = DOCUMENTOS.flatMap(d => d.formatos.map(f => f.arquivo));
    expect(new Set(arqs).size).toBe(arqs.length);
    for (const a of arqs) expect(a).toMatch(/^[A-Za-z0-9/_.-]+$/);
  });
  it('achar devolve o documento ou nada', () => {
    expect(achar('atestado')?.nome).toBe('Atestado');
    expect(achar('xis')).toBeUndefined();
  });
});
