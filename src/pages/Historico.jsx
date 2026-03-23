import React, { useState, useEffect } from "react";
import { Cliente } from "@/entities/Cliente.js";
import { Visita } from "@/entities/Visita.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, Users, Filter } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Historico() {
  const [clientes, setClientes] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataInicioTop10, setDataInicioTop10] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFimTop10, setDataFimTop10] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(true);

  const formatarValor = (valor) => {
    if (valor === null || valor === undefined) return "-";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar TODOS os clientes com paginação
      let todosClientes = [];
      let carregando = true;
      let offset = 0;
      const limit = 500; // Limite por lote

      while (carregando) {
        // Assumindo que Cliente.list suporta order, limit e offset para paginação
        const clientesLote = await Cliente.list("nome", limit, offset);
        
        if (clientesLote.length === 0) {
          carregando = false;
        } else {
          todosClientes = [...todosClientes, ...clientesLote];
          offset += clientesLote.length;
          
          if (clientesLote.length < limit) {
            carregando = false; // Se o lote for menor que o limite, é a última página
          }
        }
      }
      
      // Remover duplicatas de clientes, caso haja (útil para APIs que podem retornar dups ou para garantir)
      const clientesUnicos = todosClientes.filter((cliente, index, self) =>
        index === self.findIndex((c) => c.id === cliente.id)
      );
      
      // Carregar visitas (mantendo o limite de 1000 conforme outline, se necessário carregar todas, adaptar este ponto)
      const visitasData = await Visita.list("-data_visita", 1000); 
      
      console.log("✅ Histórico - Total de clientes:", clientesUnicos.length);
      
      setClientes(clientesUnicos);
      setVisitas(visitasData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  };

  const filtrarVisitasPorPeriodo = (visitasCliente) => {
    return visitasCliente.filter(visita => {
      const dataVisita = parseISO(visita.data_visita);
      return isWithinInterval(dataVisita, {
        start: parseISO(dataInicio),
        end: parseISO(dataFim)
      });
    });
  };

  const getEstatisticasCliente = (clienteId) => {
    const visitasCliente = visitas.filter(v => v.cliente_id === clienteId);
    const visitasFiltradas = filtrarVisitasPorPeriodo(visitasCliente);
    
    const porDepartamento = visitasFiltradas.reduce((acc, v) => {
      acc[v.departamento] = (acc[v.departamento] || 0) + 1;
      return acc;
    }, {});

    const porResponsavel = visitasFiltradas.reduce((acc, v) => {
      if (v.responsavel) {
        acc[v.responsavel] = (acc[v.responsavel] || 0) + 1;
      }
      return acc;
    }, {});

    const porStatus = visitasFiltradas.reduce((acc, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    }, {});

    return {
      total: visitasFiltradas.length,
      realizadas: porStatus["REALIZADA"] || 0,
      pendentes: (porStatus["NÃO REALIZADA"] || 0) + (porStatus["AGENDADA"] || 0),
      porDepartamento,
      porResponsavel,
      visitas: visitasFiltradas
    };
  };

  const getClientesMaisVisitados = () => {
    const visitasRealizadasPeriodo = visitas.filter(v => {
      const dataVisita = parseISO(v.data_visita);
      return isWithinInterval(dataVisita, {
        start: parseISO(dataInicioTop10),
        end: parseISO(dataFimTop10)
      }) && v.status === "REALIZADA";
    });

    const contagemPorCliente = {};
    visitasRealizadasPeriodo.forEach(v => {
      contagemPorCliente[v.cliente_id] = (contagemPorCliente[v.cliente_id] || 0) + 1;
    });

    return clientes
      .map(cliente => ({
        ...cliente,
        totalVisitas: contagemPorCliente[cliente.id] || 0
      }))
      .filter(c => c.totalVisitas > 0)
      .sort((a, b) => b.totalVisitas - a.totalVisitas)
      .slice(0, 10);
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clientesMaisVisitados = getClientesMaisVisitados();

  const chartDataDepartamentos = selectedCliente 
    ? Object.entries(getEstatisticasCliente(selectedCliente.id).porDepartamento).map(([name, value]) => ({
        departamento: name,
        visitas: value
      }))
    : [];

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Histórico de Visitas
          </h1>
          <p className="text-slate-600">Análise detalhada de visitas por cliente e período</p>
        </div>

        {/* Filtros de Período */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Período (Análise Individual)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={() => setSelectedCliente(null)}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  Aplicar Filtro
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Clientes */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-800">
                Selecionar Cliente
              </CardTitle>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredClientes.map((cliente) => {
                  const stats = getEstatisticasCliente(cliente.id);
                  return (
                    <button
                      key={cliente.id}
                      onClick={() => setSelectedCliente(cliente)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        selectedCliente?.id === cliente.id
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <p className="font-semibold">{cliente.nome}</p>
                      {cliente.honorarios !== null && cliente.honorarios !== undefined && (
                        <p className={`text-xs ${
                          selectedCliente?.id === cliente.id ? 'text-white/90' : 'text-red-600'
                        } font-medium`}>
                          {formatarValor(cliente.honorarios)}
                        </p>
                      )}
                      <p className={`text-xs mt-1 ${
                        selectedCliente?.id === cliente.id ? 'text-white/80' : 'text-slate-500'
                      }`}>
                        {stats.total} visitas no período
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Detalhes do Cliente Selecionado */}
          <div className="lg:col-span-2 space-y-6">
            {selectedCliente ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-none shadow-lg bg-slate-800 text-white">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium opacity-90">
                        Total de Visitas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">
                        {getEstatisticasCliente(selectedCliente.id).total}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg bg-slate-700 text-white">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium opacity-90">
                        Realizadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">
                        {getEstatisticasCliente(selectedCliente.id).realizadas}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg bg-red-600 text-white">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium opacity-90">
                        Pendentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold">
                        {getEstatisticasCliente(selectedCliente.id).pendentes}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Gráfico por Departamento */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-slate-800">
                      Visitas por Departamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartDataDepartamentos}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="departamento" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: 'none', 
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                          }} 
                        />
                        <Bar dataKey="visitas" fill="#dc2626" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Lista de Responsáveis */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-slate-800">
                      Visitas por Responsável
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(getEstatisticasCliente(selectedCliente.id).porResponsavel)
                        .sort(([,a], [,b]) => b - a)
                        .map(([responsavel, quantidade]) => (
                          <div key={responsavel} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="font-medium text-slate-800">{responsavel}</span>
                            <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded-full text-sm font-semibold">
                              {quantidade} visita{quantidade > 1 ? 's' : ''}
                            </span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Histórico Detalhado */}
                <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-slate-800">
                      Histórico Detalhado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getEstatisticasCliente(selectedCliente.id).visitas.map((visita) => (
                        <div key={visita.id} className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-slate-800">
                                {format(parseISO(visita.data_visita), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                              <p className="text-sm text-slate-600">
                                {visita.responsavel && <span className="font-medium">{visita.responsavel} • </span>}
                                {visita.departamento}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              visita.status === "REALIZADA" 
                                ? 'bg-slate-200 text-slate-800'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {visita.status}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700">{visita.atividade}</p>
                          {visita.observacoes && (
                            <p className="text-xs text-slate-500 mt-2">{visita.observacoes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">
                      Selecione um cliente para ver o histórico detalhado
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Top 10 Clientes Mais Visitados com Período */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top 10 Clientes Mais Visitados
            </CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicioTop10}
                  onChange={(e) => setDataInicioTop10(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFimTop10}
                  onChange={(e) => setDataFimTop10(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {clientesMaisVisitados.map((cliente, index) => (
                <div
                  key={cliente.id}
                  className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedCliente(cliente)}
                  >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded-full text-sm font-bold">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{cliente.nome}</p>
                    </div>
                  </div>
                  {cliente.honorarios !== null && cliente.honorarios !== undefined && (
                    <p className="text-xs text-red-600 font-semibold mb-1">
                      {formatarValor(cliente.honorarios)}
                    </p>
                  )}
                  <p className="text-2xl font-bold text-slate-900">{cliente.totalVisitas}</p>
                  <p className="text-xs text-slate-500">visitas realizadas</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}