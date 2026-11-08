/**
 * Catálogo dos documentos para imprimir (receituário, atestado, pedidos). Texto fixo nosso, sem dados de paciente.
 * Cada `arquivo` é um PDF em `public/documentos/` (o teste confere que todos existem).
 */
export interface FormatoDoc { rotulo: string; arquivo: string }
export interface Documento {
  id: string;
  nome: string;
  meta: string;
  nota: string;
  /** prévia pequena (PNG em public/documentos/previas/) */
  previa: string;
  formatos: FormatoDoc[];
}

export const DOCUMENTOS: Documento[] = [
  {
    id: 'receituario', nome: 'Receituário', meta: 'Em branco · A4 ou A5',
    nota: 'Área livre para a prescrição, data e assinatura.',
    previa: 'previas/Receituario-Andressa-Namba.png',
    formatos: [
      { rotulo: 'A4 · 1 por folha', arquivo: 'A4/Receituario-Andressa-Namba.pdf' },
      { rotulo: 'A5 · talão', arquivo: 'A5/Receituario-A5.pdf' },
      { rotulo: 'A5 · 2 por folha A4', arquivo: 'A5/Receituario-A5-2-por-folha-A4.pdf' },
    ],
  },
  {
    id: 'atestado', nome: 'Atestado', meta: 'Em branco · A5',
    nota: 'Texto padrão com horário, dias de convalescença e CID (só com autorização do paciente).',
    previa: 'previas/Atestado-A5.png',
    formatos: [
      { rotulo: 'A5 · talão', arquivo: 'A5/Atestado-A5.pdf' },
      { rotulo: 'A5 · 2 por folha A4', arquivo: 'A5/Atestado-2-por-folha-A4.pdf' },
    ],
  },
  {
    id: 'intraoral', nome: 'Pedido de escaneamento intraoral', meta: 'A4 · 1 página',
    nota: 'Paciente, observações, local/data e assinatura.',
    previa: 'previas/Pedido-Escaneamento-Intraoral.png',
    formatos: [{ rotulo: 'A4 · 1 página', arquivo: 'A4/Pedido-Escaneamento-Intraoral.pdf' }],
  },
  {
    id: 'ortodontico', nome: 'Pedido de documentação ortodôntica', meta: 'A4 · 2 páginas',
    nota: 'Checklist de fotos, panorâmica, telerradiografia e escaneamento. A página 2 traz as orientações de escaneamento.',
    previa: 'previas/Pedido-Documentacao-Ortodontica-Escaneamento.png',
    formatos: [{ rotulo: 'A4 · 2 páginas', arquivo: 'A4/Pedido-Documentacao-Ortodontica-Escaneamento.pdf' }],
  },
];

export const achar = (id: string): Documento | undefined => DOCUMENTOS.find(d => d.id === id);
