import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Calendar, TrendingDown, Download, Filter } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Alertas() {
  const [clientes, setClientes] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      let todosClientes = [];
      let carregando = true;
      
      while (carregando) {
        const clientesLote = await base44.entities.Cliente.list("-ranking", 500);
        
        if (clientesLote.length === 0) {
          carregando = false;
        } else {
          todosClientes = [...todosClientes, ...clientesLote];
          
          if (clientesLote.length < 500) {
            carregando = false;
          }
        }
      }
      
      const clientesUnicos = todosClientes.filter((cliente, index, self) =>
        index === self.findIndex((c) => c.id === cliente.id)
      );
      
      const visitasData = await base44.entities.Visita.list('-data_visita', 1000);
      
      console.log("✅ Alertas - Total de clientes:", clientesUnicos.length);
      
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

  const getClientesComAlerta = () => {
    const dataFinal = parseISO(dataFim);
    
    return clientes
      .map(cliente => {
        const visitasCliente = visitas.filter(
          v => v.cliente_id === cliente.id && v.status === "REALIZADA" && parseISO(v.data_visita) <= dataFinal
        );

        if (visitasCliente.length === 0) {
          return {
            ...cliente,
            diasSemVisita: Infinity,
            ultimaVisita: null
          };
        }

        const visitasOrdenadas = visitasCliente.sort(
          (a, b) => new Date(b.data_visita) - new Date(a.data_visita)
        );
        const ultimaVisita = visitasOrdenadas[0];
        const diasSemVisita = Math.floor(
          (dataFinal - new Date(ultimaVisita.data_visita)) / (1000 * 60 * 60 * 24)
        );

        return {
          ...cliente,
          diasSemVisita,
          ultimaVisita
        };
      })
      .filter(cliente => cliente.diasSemVisita > 90 || cliente.diasSemVisita === Infinity)
      .sort((a, b) => {
        if (a.diasSemVisita === Infinity) return -1;
        if (b.diasSemVisita === Infinity) return 1;
        return b.diasSemVisita - a.diasSemVisita;
      });
  };

  const gerarRelatorioPDF = () => {
    const clientesComAlerta = getClientesComAlerta();

    const conteudoHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Alertas - Visita+</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #ef4444; padding-bottom: 20px; }
          .header h1 { color: #ef4444; margin: 0; font-size: 28px; }
          .header p { color: #64748b; margin: 5px 0; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
          .stat-card { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; }
          .stat-card h3 { margin: 0; font-size: 14px; opacity: 0.9; }
          .stat-card .number { font-size: 36px; font-weight: bold; margin: 10px 0; }
          .alert-item { padding: 20px; margin-bottom: 15px; border-radius: 12px; border-left: 5px solid #ef4444; page-break-inside: avoid; }
          .alert-item.critico { background: #fee2e2; border-color: #dc2626; }
          .alert-item.atencao { background: #fed7aa; border-color: #ea580c; }
          .alert-item.nunca { background: #fef3c7; border-color: #f59e0b; }
          .alert-item h3 { margin: 0 0 10px 0; color: #1e293b; }
          .alert-item .info { color: #475569; font-size: 14px; }
          .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 5px; }
          .badge.critico { background: #dc2626; color: white; }
          .badge.atencao { background: #ea580c; color: white; }
          .badge.nunca { background: #f59e0b; color: white; }
          .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 2px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ Relatório de Alertas de Visitas - Visita+</h1>
          <p>Referência até: ${format(parseISO(dataFim), "dd/MM/yyyy", { locale: ptBR })}</p>
          <p>Clientes sem visita há mais de 90 dias</p>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total de Alertas</h3>
            <div class="number">${clientesComAlerta.length}</div>
          </div>
          <div class="stat-card">
            <h3>Críticos (+180 dias)</h3>
            <div class="number">${clientesComAlerta.filter(c => c.diasSemVisita > 180 && c.diasSemVisita !== Infinity).length}</div>
          </div>
          <div class="stat-card">
            <h3>Nunca Visitados</h3>
            <div class="number">${clientesComAlerta.filter(c => c.diasSemVisita === Infinity).length}</div>
          </div>
        </div>

        <h2 style="color: #1e293b; margin-top: 30px;">Clientes que Precisam de Atenção</h2>
        
        ${clientesComAlerta.map(cliente => {
          const classe = cliente.diasSemVisita === Infinity ? 'nunca' : cliente.diasSemVisita > 180 ? 'critico' : 'atencao';
          const badgeTexto = cliente.diasSemVisita === Infinity ? 'Nunca Visitado' : `${cliente.diasSemVisita} dias sem visita`;
          
          return `
            <div class="alert-item ${classe}">
              <h3>
                ${cliente.ranking ? `#${cliente.ranking} - ` : ''}${cliente.nome}
              </h3>
              <div class="info">
                ${cliente.honorarios ? `<strong>Honorários:</strong> ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.honorarios)}<br>` : ''}
                ${cliente.ultimaVisita ? `<strong>Última visita:</strong> ${format(new Date(cliente.ultimaVisita.data_visita), "dd/MM/yyyy", { locale: ptBR })}<br>` : ''}
                ${cliente.ultimaVisita ? `<strong>Departamento:</strong> ${cliente.ultimaVisita.departamento} | <strong>Responsável:</strong> ${cliente.ultimaVisita.responsavel || '-'}<br>` : ''}
              </div>
              <span class="badge ${classe}">${badgeTexto}</span>
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

  const clientesComAlerta = getClientesComAlerta();

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Alertas de Visitas
            </h1>
            <p className="text-slate-600">
              Clientes sem visita há mais de 90 dias
            </p>
          </div>

          <Link to={createPageUrl("RegistrarVisita")}>
            <Button className="bg-red-600 hover:bg-red-700">
              Registrar Visita
            </Button>
          </Link>
        </div>

        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtro de Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data de Referência</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
                <p className="text-xs text-slate-500">Alertas calculados até esta data</p>
              </div>
              <div className="col-span-1 md:col-span-2 flex items-end">
                <Button 
                  onClick={gerarRelatorioPDF}
                  className="w-full bg-slate-800 hover:bg-black"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Gerar PDF dos Alertas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg bg-red-600 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                <AlertTriangle className="w-4 h-4" />
                Total de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{clientesComAlerta.length}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-slate-700 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                <TrendingDown className="w-4 h-4" />
                Críticos (+180 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {clientesComAlerta.filter(c => c.diasSemVisita > 180 && c.diasSemVisita !== Infinity).length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-slate-800 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2 opacity-90">
                <Calendar className="w-4 h-4" />
                Nunca Visitados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {clientesComAlerta.filter(c => c.diasSemVisita === Infinity).length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Clientes que Precisam de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientesComAlerta.map((cliente) => (
                <div
                  key={cliente.id}
                  className="p-4 rounded-xl border-l-4 hover:shadow-md transition-shadow duration-200"
                  style={{
                    backgroundColor: cliente.diasSemVisita === Infinity 
                      ? '#fef3c7' 
                      : cliente.diasSemVisita > 180 
                      ? '#fee2e2' 
                      : '#fed7aa',
                    borderColor: cliente.diasSemVisita === Infinity 
                      ? '#f59e0b' 
                      : cliente.diasSemVisita > 180 
                      ? '#ef4444' 
                      : '#f97316'
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-white rounded-full text-sm font-bold text-slate-700">
                          {cliente.ranking || "-"}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{cliente.nome}</p>
                          {cliente.honorarios !== undefined && (
                            <p className="text-sm text-red-700 font-semibold">
                              Honorários: {formatarValor(cliente.honorarios)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {cliente.diasSemVisita === Infinity ? (
                        <>
                          <span className="px-4 py-2 bg-slate-700 text-white rounded-full text-sm font-bold">
                            Nunca Visitado
                          </span>
                          <p className="text-xs text-slate-700">Cliente sem nenhuma visita registrada</p>
                        </>
                      ) : (
                        <>
                          <span className={`px-4 py-2 rounded-full text-sm font-bold text-white ${
                            cliente.diasSemVisita > 180 ? 'bg-red-600' : 'bg-slate-600'
                          }`}>
                            {cliente.diasSemVisita} dias
                          </span>
                          {cliente.ultimaVisita && (
                            <p className="text-xs text-slate-700">
                              Última visita: {format(new Date(cliente.ultimaVisita.data_visita), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {clientesComAlerta.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-200 rounded-full mb-4">
                    <AlertTriangle className="w-8 h-8 text-slate-600" />
                  </div>
                  <p className="text-slate-600 font-medium">
                    Ótimo! Não há clientes com alertas no momento.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}