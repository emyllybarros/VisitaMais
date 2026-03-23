export const Visita = {
  async list() {
    return [
      {
        id: "1",
        cliente_id: "1",
        cliente_nome: "Cliente Exemplo 1",
        responsavel: "Maria",
        departamento: "FISCAL",
        atividade: "VISITA PADRÃO",
        status: "REALIZADA",
        data_visita: "2026-03-10",
        competencia: "03/2026",
        observacoes: "Tudo certo",
      },
      {
        id: "2",
        cliente_id: "2",
        cliente_nome: "Cliente Exemplo 2",
        responsavel: "João",
        departamento: "CONTABIL",
        atividade: "VISITA DE ALINHAMENTO",
        status: "AGENDADA",
        data_visita: "2026-03-15",
        competencia: "03/2026",
        observacoes: "",
      },
    ];
  },
};