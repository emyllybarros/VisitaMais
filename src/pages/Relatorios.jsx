import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Calendar, TrendingUp, BarChart3 } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function Relatorios() {
  const [clientes, setClientes] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [statusFiltro, setStatusFiltro] = useState("REALIZADA");
  const [tipoAgrupamento, setTipoAgrupamento] = useState("geral");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar TODOS os clientes
      let todosClientes = [];
      let carregando = true;
      const limit = 500;

      while (carregando) {
        const clientesLote = await base44.entities.Cliente.list('-ranking', limit); 
        
        if (clientesLote.length === 0) {
          carregando = false;
        } else {
          todosClientes = [...todosClientes, ...clientesLote];
          
          if (clientesLote.length < limit) { 
            carregando = false;
          }
        }
        if (clientesLote.length === limit && todosClientes.length > 50000) { 
          console.warn("Safety break: Too many clients loaded, potentially infinite loop.");
          carregando = false;
        }
      }
      
      const clientesUnicos = todosClientes.filter((cliente, index, self) =>
        index === self.findIndex((c) => c.id === cliente.id)
      );
      
      const visitasData = await base44.entities.Visita.list("-data_visita", 1000); 
      
      console.log("✅ Relatórios - Total de clientes:", clientesUnicos.length);
      
      setClientes(clientesUnicos);
      setVisitas(visitasData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  };

  const formatarValor = (valor) => {
    if (!valor && valor !== 0) return "-";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const gerarRelatorioTop10PDF = () => {
    const visitasRealizadasPeriodo = visitas.filter(v => {
      const dataVisita = parseISO(v.data_visita);
      return isWithinInterval(dataVisita, { start: parseISO(dataInicio), end: parseISO(dataFim) }) && v.status === "REALIZADA";
    });

    const porCliente = {};
    visitasRealizadasPeriodo.forEach(v => {
      if (!porCliente[v.cliente_nome]) {
        porCliente[v.cliente_nome] = { total: 0, visitas: [], cliente_id: v.cliente_id };
      }
      porCliente[v.cliente_nome].total++;
      porCliente[v.cliente_nome].visitas.push(v);
    });

    const top10DataForPDF = Object.entries(porCliente)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    const conteudoHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Top 10 Clientes Mais Visitados - Visita+</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
          .header h1 { color: #2563eb; margin: 0; font-size: 28px; }
          .header p { color: #64748b; margin: 5px 0; }
          .ranking-item { background: #f8fafc; padding: 20px; margin-bottom: 20px; border-radius: 12px; border-left: 5px solid #dc2626; page-break-inside: avoid; }
          .ranking-item h2 { color: #1e293b; margin: 0 0 15px 0; font-size: 20px; }
          .ranking-item .stats { background: white; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
          .ranking-item .stats strong { color: #dc2626; font-size: 32px; }
          .ranking-item .honorarios { color: #dc2626; font-size: 14px; font-weight: bold; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #1f2937; color: white; padding: 10px; text-align: left; font-size: 11px; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
          .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 2px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏆 Top 10 Clientes Mais Visitados - Visita+</h1>
          <p>Período: ${format(parseISO(dataInicio), "dd/MM/yyyy", { locale: ptBR })} - ${format(parseISO(dataFim), "dd/MM/yyyy", { locale: ptBR })}</p>
          <p>Apenas visitas realizadas</p>
        </div>
        
        ${top10DataForPDF.map(([clienteNome, dados], index) => {
          const cliente = clientes.find(c => c.id === dados.cliente_id);
          return `
            <div class="ranking-item">
              <h2>${index + 1}º Lugar - ${clienteNome}</h2>
              ${cliente?.honorarios ? `<div class="honorarios">Honorários: ${formatarValor(cliente.honorarios)}</div>` : ''}
              <div class="stats">
                <strong>${dados.total}</strong> visita${dados.total > 1 ? 's' : ''} realizada${dados.total > 1 ? 's' : ''}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Responsável</th>
                    <th>Departamento</th>
                    <th>Atividade</th>
                  </tr>
                </thead>
                <tbody>
                  ${dados.visitas.map(v => `
                    <tr>
                      <td>${format(parseISO(v.data_visita), "dd/MM/yyyy", { locale: ptBR })}</td>
                      <td>${v.responsavel || "-"}</td>
                      <td>${v.departamento}</td>
                      <td>${v.atividade}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }).join('')}

        <div class="footer">
          <p>Relatório gerado automaticamente pelo sistema Visita+</p>
          <p>Data de geração: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(conteudoHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const filtrarVisitas = () => {
    return visitas.filter(visita => {
      const dataVisita = parseISO(visita.data_visita);
      const dentroIntervalo = isWithinInterval(dataVisita, {
        start: parseISO(dataInicio),
        end: parseISO(dataFim)
      });
      
      return dentroIntervalo && visita.status === statusFiltro;
    });
  };

  const gerarRelatorioPDF = () => {
    const visitasFiltradas = filtrarVisitas();
    let conteudoPrincipal = "";

    if (tipoAgrupamento === "geral") {
      conteudoPrincipal = `
        <h2 style="color: #1e293b;">Visitas ${statusFiltro === "REALIZADA" ? "Realizadas" : statusFiltro === "AGENDADA" ? "Agendadas" : "Não Realizadas"}</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Responsável</th>
              <th>Departamento</th>
              <th>Atividade</th>
            </tr>
          </thead>
          <tbody>
            ${visitasFiltradas.map(v => `
              <tr>
                <td>${format(parseISO(v.data_visita), "dd/MM/yyyy", { locale: ptBR })}</td>
                <td><strong>${v.cliente_nome}</strong></td>
                <td>${v.responsavel || "-"}</td>
                <td>${v.departamento}</td>
                <td>${v.atividade}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (tipoAgrupamento === "cliente") {
      const porCliente = {};
      visitasFiltradas.forEach(v => {
        if (!porCliente[v.cliente_nome]) porCliente[v.cliente_nome] = [];
        porCliente[v.cliente_nome].push(v);
      });

      conteudoPrincipal = Object.entries(porCliente)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([cliente, visitas]) => `
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <h3 style="color: #1e293b; background: #f1f5f9; padding: 10px; border-radius: 8px;">
              🏢 ${cliente} <span style="color: #dc2626;">(${visitas.length} visita${visitas.length > 1 ? 's' : ''})</span>
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Responsável</th>
                  <th>Departamento</th>
                  <th>Atividade</th>
                </tr>
              </thead>
              <tbody>
                ${visitas.map(v => `
                  <tr>
                    <td>${format(parseISO(v.data_visita), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td>${v.responsavel || "-"}</td>
                    <td>${v.departamento}</td>
                    <td>${v.atividade}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('');

    } else if (tipoAgrupamento === "departamento") {
      const porDepartamento = {};
      visitasFiltradas.forEach(v => {
        if (!porDepartamento[v.departamento]) porDepartamento[v.departamento] = [];
        porDepartamento[v.departamento].push(v);
      });

      conteudoPrincipal = Object.entries(porDepartamento)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([dept, visitas]) => `
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <h3 style="color: #1e293b; background: #f1f5f9; padding: 10px; border-radius: 8px;">
              📁 ${dept} <span style="color: #dc2626;">(${visitas.length} visita${visitas.length > 1 ? 's' : ''})</span>
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Responsável</th>
                  <th>Atividade</th>
                </tr>
              </thead>
              <tbody>
                ${visitas.map(v => `
                  <tr>
                    <td>${format(parseISO(v.data_visita), "dd/MM/yyyy", { locale: ptBR })}</td>
                    <td><strong>${v.cliente_nome}</strong></td>
                    <td>${v.responsavel || "-"}</td>
                    <td>${v.atividade}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('');

    } else if (tipoAgrupamento === "responsavel") {
      const porResponsavel = {};
      visitasFiltradas.forEach(v => {
        const resp = v.responsavel || "Não informado";
        if (!porResponsavel[resp]) porResponsavel[resp] = [];
        porResponsavel[resp].push(v);
      });

      conteudoPrincipal = Object.entries(porResponsavel)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([resp, visitas]) => {
          const clientesUnicos = new Set(visitas.map(v => v.cliente_nome));
          return `
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
              <h3 style="color: #1e293b; background: #f1f5f9; padding: 10px; border-radius: 8px;">
                👤 ${resp} <span style="color: #dc2626;">(${visitas.length} visita${visitas.length > 1 ? 's' : ''} • ${clientesUnicos.size} cliente${clientesUnicos.size > 1 ? 's' : ''})</span>
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Departamento</th>
                    <th>Atividade</th>
                  </tr>
                </thead>
                <tbody>
                  ${visitas.map(v => `
                    <tr>
                      <td>${format(parseISO(v.data_visita), "dd/MM/yyyy", { locale: ptBR })}</td>
                      <td><strong>${v.cliente_nome}</strong></td>
                      <td>${v.departamento}</td>
                      <td>${v.atividade}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div style="background: #f8fafc; padding: 10px; border-radius: 8px; margin-top: 10px;">
                <strong>Clientes visitados:</strong> ${Array.from(clientesUnicos).join(", ")}
              </div>
            </div>
          `;
        }).join('');
    }

    const conteudoHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório - Visita+</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #dc2626; padding-bottom: 20px; }
          .header h1 { color: #dc2626; margin: 0; font-size: 28px; }
          .header p { color: #64748b; margin: 5px 0; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
          .stat-card { background: #1f2937; color: white; padding: 20px; border-radius: 12px; text-align: center; }
          .stat-card h3 { margin: 0; font-size: 14px; opacity: 0.9; }
          .stat-card .number { font-size: 36px; font-weight: bold; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #1f2937; color: white; padding: 12px; text-align: left; font-size: 12px; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
          tr:hover { background: #f8fafc; }
          .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 2px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Relatório de Visitas - Visita+</h1>
          <p>Período: ${format(parseISO(dataInicio), "dd/MM/yyyy", { locale: ptBR })} - ${format(parseISO(dataFim), "dd/MM/yyyy", { locale: ptBR })}</p>
          <p>Status: ${statusFiltro} | Agrupamento: ${tipoAgrupamento === "geral" ? "Geral" : tipoAgrupamento === "cliente" ? "Por Cliente" : tipoAgrupamento === "departamento" ? "Por Departamento" : "Por Responsável"}</p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total de Visitas</h3>
            <div class="number">${filtrarVisitas().length}</div>
          </div>
          <div class="stat-card" style="background: #374151;">
            <h3>Clientes Únicos</h3>
            <div class="number">${new Set(filtrarVisitas().map(v => v.cliente_nome)).size}</div>
          </div>
          <div class="stat-card" style="background: #475569;">
            <h3>Responsáveis</h3>
            <div class="number">${new Set(filtrarVisitas().map(v => v.responsavel)).size}</div>
          </div>
          <div class="stat-card" style="background: #dc2626;">
            <h3>Departamentos</h3>
            <div class="number">${new Set(filtrarVisitas().map(v => v.departamento)).size}</div>
          </div>
        </div>

        ${conteudoPrincipal}

        <div class="footer">
          <p>Relatório gerado automaticamente pelo sistema Visita+</p>
          <p>Data de geração: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(conteudoHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const visitasFiltradas = filtrarVisitas();

  // Dados para gráfico de visão geral (por status no período)
  const visitasPorStatus = {
    realizadas: visitas.filter(v => {
      const dataVisita = parseISO(v.data_visita);
      return isWithinInterval(dataVisita, { start: parseISO(dataInicio), end: parseISO(dataFim) }) && v.status === "REALIZADA";
    }).length,
    naoRealizadas: visitas.filter(v => {
      const dataVisita = parseISO(v.data_visita);
      return isWithinInterval(dataVisita, { start: parseISO(dataInicio), end: parseISO(dataFim) }) && v.status === "NÃO REALIZADA";
    }).length,
    agendadas: visitas.filter(v => {
      const dataVisita = parseISO(v.data_visita);
      return isWithinInterval(dataVisita, { start: parseISO(dataInicio), end: parseISO(dataFim) }) && v.status === "AGENDADA";
    }).length
  };

  const dadosVisaoGeral = [
    { nome: "Realizadas", quantidade: visitasPorStatus.realizadas, cor: "#475569" },
    { nome: "Não Realizadas", quantidade: visitasPorStatus.naoRealizadas, cor: "#ef4444" },
    { nome: "Agendadas", quantidade: visitasPorStatus.agendadas, cor: "#9ca3af" }
  ];

  // Dados para Top 10 (apenas visitas REALIZADAS)
  const visitasRealizadasPeriodo = visitas.filter(v => {
    const dataVisita = parseISO(v.data_visita);
    return isWithinInterval(dataVisita, { start: parseISO(dataInicio), end: parseISO(dataFim) }) && v.status === "REALIZADA";
  });

  const porCliente = {};
  visitasRealizadasPeriodo.forEach(v => {
    if (!porCliente[v.cliente_nome]) {
      porCliente[v.cliente_nome] = 0;
    }
    porCliente[v.cliente_nome]++;
  });

  const top10 = Object.entries(porCliente)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nome, quantidade]) => ({ nome, quantidade }));

  // Dados para visitas por departamento
  const visitasPorDepartamento = {};
  visitasRealizadasPeriodo.forEach(v => {
    if (!visitasPorDepartamento[v.departamento]) {
      visitasPorDepartamento[v.departamento] = 0;
    }
    visitasPorDepartamento[v.departamento]++;
  });

  const dadosDepartamento = Object.entries(visitasPorDepartamento)
    .sort((a, b) => b[1] - a[1])
    .map(([nome, quantidade]) => ({ nome, quantidade }));

  const COLORS = ['#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#dc2626', '#ef4444', '#475569', '#64748b', '#94a3b8'];

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Relatórios
          </h1>
          <p className="text-slate-600">Configure e gere relatórios personalizados em PDF</p>
        </div>

        {/* Configuração do Relatório */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Configurar Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REALIZADA">Realizadas</SelectItem>
                    <SelectItem value="NÃO REALIZADA">Não Realizadas</SelectItem>
                    <SelectItem value="AGENDADA">Agendadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Agrupar Por</Label>
                <Select value={tipoAgrupamento} onValueChange={setTipoAgrupamento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral</SelectItem>
                    <SelectItem value="cliente">Por Cliente</SelectItem>
                    <SelectItem value="departamento">Por Departamento</SelectItem>
                    <SelectItem value="responsavel">Por Responsável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button 
                onClick={gerarRelatorioPDF}
                className="bg-red-600 hover:bg-red-700 shadow-lg"
                size="lg"
              >
                <Download className="w-5 h-5 mr-2" />
                Gerar PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-lg bg-slate-800 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">
                Total de Visitas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{visitasFiltradas.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-slate-700 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">
                Clientes Únicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {new Set(visitasFiltradas.map(v => v.cliente_nome)).size}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-slate-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">
                Responsáveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {new Set(visitasFiltradas.map(v => v.responsavel)).size}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-red-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium opacity-90">
                Departamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {new Set(visitasFiltradas.map(v => v.departamento)).size}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico Visão Geral */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Visão Geral do Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosVisaoGeral}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="nome" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Bar dataKey="quantidade" radius={[8, 8, 0, 0]}>
                    {dadosVisaoGeral.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico Top 10 com botão de PDF */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Top 10 Clientes Mais Visitados
                </CardTitle>
                <Button
                  onClick={gerarRelatorioTop10PDF}
                  variant="outline"
                  size="sm"
                  className="border-slate-800 text-slate-800 hover:bg-slate-100"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={top10} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" />
                  <YAxis dataKey="nome" type="category" stroke="#64748b" width={100} style={{ fontSize: '10px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Bar dataKey="quantidade" radius={[0, 8, 8, 0]}>
                    {top10.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico Visitas por Departamento */}
          <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Visitas por Departamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosDepartamento}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="nome" stroke="#64748b" angle={-45} textAnchor="end" height={80} style={{ fontSize: '11px' }} />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                    }} 
                  />
                  <Bar dataKey="quantidade" radius={[8, 8, 0, 0]}>
                    {dadosDepartamento.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}