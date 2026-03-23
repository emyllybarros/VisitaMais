import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, CheckCircle2, AlertTriangle, Calendar, Target } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const [clientes, setClientes] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [projecoes, setProjecoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [novaProjecao, setNovaProjecao] = useState({
    competencia: format(new Date(), "MM/yyyy"),
    quantidade_projetada: 0
  });
  const [showProjecaoDialog, setShowProjecaoDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar TODOS os clientes sem limite - múltiplas requisições até pegar todos
      let todosClientes = [];
      let offset = 0;
      const limit = 1000;
      let carregando = true;
      
      while (carregando) {
        // Tentar carregar o máximo possível por vez
        const clientesLote = await base44.entities.Cliente.list('-ranking', limit);
        
        if (clientesLote.length === 0) {
          carregando = false;
        } else {
          // Adicionar novos clientes (evitar duplicados)
          clientesLote.forEach(cliente => {
            if (!todosClientes.find(c => c.id === cliente.id)) {
              todosClientes.push(cliente);
            }
          });
          
          // Se veio menos que o limite, já pegamos todos
          if (clientesLote.length < limit) {
            carregando = false;
          } else {
            offset += limit;
          }
        }
        
        // Segurança para não entrar em loop infinito
        if (todosClientes.length > 5000) {
          carregando = false;
        }
      }
      
      const [visitasData, projecoesData, userData] = await Promise.all([
        base44.entities.Visita.list("-created_date", 1000),
        base44.entities.ProjecaoVisita.list("-competencia", 100),
        base44.auth.me()
      ]);
      
      console.log("✅ Dashboard - Total REAL de clientes carregados:", todosClientes.length);
      
      setClientes(todosClientes);
      setVisitas(visitasData);
      setProjecoes(projecoesData);
      setUser(userData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  };

  const queryClient = useQueryClient();

  const formatarValor = (valor) => {
    if (!valor && valor !== 0) return "-";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const handleSalvarProjecao = async () => {
    try {
      const [mes, ano] = novaProjecao.competencia.split('/');
      await base44.entities.ProjecaoVisita.create({
        ...novaProjecao,
        mes: parseInt(mes),
        ano: parseInt(ano),
        quantidade_projetada: parseInt(novaProjecao.quantidade_projetada)
      });
      setShowProjecaoDialog(false);
      loadData();
    } catch (error) {
      console.error("Erro ao salvar projeção:", error);
    }
  };

  const stats = {
    totalClientes: clientes.length,
    visitasRealizadas: visitas.filter(v => v.status === "REALIZADA").length,
    visitasPendentes: visitas.filter(v => v.status === "NÃO REALIZADA" || v.status === "AGENDADA").length,
    clientesSemVisita: clientes.filter(cliente => {
      const visitasCliente = visitas.filter(v => v.cliente_id === cliente.id && v.status === "REALIZADA");
      if (visitasCliente.length === 0) return true;
      const ultimaVisita = visitasCliente[0];
      const diasSemVisita = Math.floor((new Date() - new Date(ultimaVisita.data_visita)) / (1000 * 60 * 60 * 24));
      return diasSemVisita > 90;
    }).length
  };

  const visitasPorMes = visitas.reduce((acc, visita) => {
    const mes = visita.competencia || format(new Date(visita.data_visita), "MM/yyyy", { locale: ptBR });
    if (!acc[mes]) {
      acc[mes] = { realizadas: 0, pendentes: 0 };
    }
    if (visita.status === "REALIZADA") {
      acc[mes].realizadas++;
    } else {
      acc[mes].pendentes++;
    }
    return acc;
  }, {});

  const chartData = Object.entries(visitasPorMes)
    .map(([mes, dados]) => {
      const projecao = projecoes.find(p => p.competencia === mes);
      return {
        mes,
        realizadas: dados.realizadas,
        pendentes: dados.pendentes,
        projetadas: projecao?.quantidade_projetada || 0
      };
    })
    .slice(0, 6);

  const visitasPorDepartamento = visitas
    .filter(v => v.status === "REALIZADA")
    .reduce((acc, visita) => {
      const dept = visita.departamento || "Outros";
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

  const pieData = Object.entries(visitasPorDepartamento).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#dc2626'];

  // Calcular performance vs projeção
  const competenciaAtual = format(new Date(), "MM/yyyy");
  const projecaoAtual = projecoes.find(p => p.competencia === competenciaAtual);
  const visitasRealizadasMesAtual = visitas.filter(v => 
    v.competencia === competenciaAtual && v.status === "REALIZADA"
  ).length;
  const performancePercentual = projecaoAtual 
    ? Math.round((visitasRealizadasMesAtual / projecaoAtual.quantidade_projetada) * 100)
    : 0;

  if (loading) {
    return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Carregando dados...</p>
      </div>
    </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Dashboard de Visitas
            </h1>
            <p className="text-slate-600">
              Acompanhe o desempenho e status das visitas aos clientes
            </p>
          </div>

          <Dialog open={showProjecaoDialog} onOpenChange={setShowProjecaoDialog}>
            <DialogTrigger asChild>
              <Button className="bg-slate-800 hover:bg-black shadow-lg">
                <Target className="w-4 h-4 mr-2" />
                Definir Projeção
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Definir Projeção de Visitas</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Competência (MM/AAAA)</Label>
                  <Input
                    placeholder="Ex: 01/2025"
                    value={novaProjecao.competencia}
                    onChange={(e) => setNovaProjecao({...novaProjecao, competencia: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantidade Projetada</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 50"
                    value={novaProjecao.quantidade_projetada}
                    onChange={(e) => setNovaProjecao({...novaProjecao, quantidade_projetada: e.target.value})}
                  />
                </div>
                <Button 
                  onClick={handleSalvarProjecao}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  Salvar Projeção
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="border-none shadow-lg bg-slate-800 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                <Users className="w-4 h-4" />
                Total de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.totalClientes}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-slate-700 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                <CheckCircle2 className="w-4 h-4" />
                Visitas Realizadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.visitasRealizadas}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-slate-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                <Calendar className="w-4 h-4" />
                Visitas Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.visitasPendentes}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-red-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                <AlertTriangle className="w-4 h-4" />
                Alertas (+90 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{stats.clientesSemVisita}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-slate-900 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                <Target className="w-4 h-4" />
                Performance Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{performancePercentual}%</p>
              {projecaoAtual && (
                <p className="text-xs mt-1 opacity-90">
                  {visitasRealizadasMesAtual} de {projecaoAtual.quantidade_projetada}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-800">
                Visitas vs Projeção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Legend />
                  <Bar dataKey="projetadas" fill="#475569" name="Projetadas" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="realizadas" fill="#dc2626" name="Realizadas" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="pendentes" fill="#9ca3af" name="Pendentes" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-800">
                Visitas por Departamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Últimas Visitas */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800">
              Últimas Visitas Registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visitas.slice(0, 5).map((visita) => {
                const cliente = clientes.find(c => c.id === visita.cliente_id);
                return (
                  <div 
                    key={visita.id} 
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{visita.cliente_nome}</p>
                      {cliente?.honorarios && (
                        <p className="text-xs text-red-600 font-medium">
                          {formatarValor(cliente.honorarios)}
                        </p>
                      )}
                      <p className="text-sm text-slate-600">
                        {visita.responsavel && <span className="font-medium">{visita.responsavel}</span>}
                        {visita.responsavel && " • "}
                        {visita.departamento} - {visita.atividade}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(visita.data_visita), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      {visita.status === "REALIZADA" ? (
                        <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded-full text-sm font-medium">
                          Realizada
                        </span>
                      ) : visita.status === "AGENDADA" ? (
                        <span className="px-3 py-1 bg-slate-300 text-slate-900 rounded-full text-sm font-medium">
                          Agendada
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          Pendente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}