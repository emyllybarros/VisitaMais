export const Cliente = {
  async list() {
    return [
      {
        id: "1",
        nome: "Cliente Exemplo 1",
        cnpj: "00.000.000/0001-00",
        honorarios: 1500,
        ranking: 1,
        competencia: "03/2026",
      },
      {
        id: "2",
        nome: "Cliente Exemplo 2",
        cnpj: "11.111.111/0001-11",
        honorarios: 2200,
        ranking: 2,
        competencia: "03/2026",
      },
    ];
  },
};