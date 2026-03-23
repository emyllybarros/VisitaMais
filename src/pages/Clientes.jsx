import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Search, AlertCircle, CheckCircle, Plus, Download, FileText, Info, Edit, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState(0);
  const [detalhesImportacao, setDetalhesImportacao] = useState(null);
  const [clientesComErro, setClientesComErro] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);
  const [novoCliente, setNovoCliente] = useState({
    nome: "",
    honorarios: ""
  });
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const formatarHonorarios = (valor) => {
    if (!valor && valor !== 0) return "-";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let todosClientes = [];
      let carregando = true;
      
      while (carregando) {
        const clientesLote = await base44.entities.Cliente.list('-ranking', 500);
        
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
      
      console.log("✅ Total REAL de clientes carregados:", clientesUnicos.length);
      
      const clientesOrdenados = clientesUnicos.sort((a, b) => {
        const honorariosA = a.honorarios || 0;
        const honorariosB = b.honorarios || 0;
        
        if (honorariosB !== honorariosA) {
          return honorariosB - honorariosA;
        }
        return (a.nome || "").localeCompare(b.nome || "");
      });
      
      setClientes(clientesOrdenados);
      setVisitas(visitasData);
      
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setError("Erro ao carregar dados. Por favor, recarregue a página.");
    }
    setLoading(false);
  };

  const recalcularRankings = async () => {
    try {
      let todosClientes = [];
      let carregando = true;
      
      while (carregando) {
        const clientesLote = await base44.entities.Cliente.list('-honorarios', 500);
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

      const clientesOrdenados = clientesUnicos.sort((a, b) => {
        const honorariosA = a.honorarios || 0;
        const honorariosB = b.honorarios || 0;
        
        if (honorariosB !== honorariosA) {
          return honorariosB - honorariosA;
        }
        return (a.nome || "").localeCompare(b.nome || "");
      });

      // Atualizar rankings um por vez com delay
      let atualizados = 0;
      
      for (let i = 0; i < clientesOrdenados.length; i++) {
        const cliente = clientesOrdenados[i];
        const novoRanking = i + 1;
        
        if (cliente.ranking !== novoRanking) {
          try {
            await base44.entities.Cliente.update(cliente.id, {
              ...cliente,
              ranking: novoRanking
            });
            atualizados++;
            
            // Delay de 300ms entre cada atualização
            if (i < clientesOrdenados.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } catch (err) {
            console.error(`Erro ao atualizar ranking do cliente ${cliente.nome}:`, err);
          }
        }
      }

      console.log(`✅ Rankings recalculados para ${atualizados} clientes`);
    } catch (error) {
      console.error("Erro ao recalcular rankings:", error);
      throw error;
    }
  };

  const handleSalvarCliente = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const dadosCliente = {
        nome: novoCliente.nome.trim(),
        honorarios: novoCliente.honorarios ? parseFloat(novoCliente.honorarios) : 0,
        competencia: format(new Date(), "MM/yyyy"),
        ranking: 0
      };

      await base44.entities.Cliente.create(dadosCliente);
      await recalcularRankings();
      
      setSuccess(`Cliente "${dadosCliente.nome}" cadastrado com sucesso! Ranking calculado automaticamente.`);
      setShowDialog(false);
      setNovoCliente({ nome: "", honorarios: "" });
      
      await loadData();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      setError("Erro ao salvar cliente. Tente novamente.");
    }

    setSaving(false);
  };

  const handleEditarCliente = (cliente) => {
    setClienteEditando({
      ...cliente,
      honorarios: cliente.honorarios || 0
    });
    setShowEditDialog(true);
  };

  const handleSalvarEdicao = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const dadosAtualizados = {
        ...clienteEditando,
        nome: clienteEditando.nome.trim(),
        honorarios: clienteEditando.honorarios ? parseFloat(clienteEditando.honorarios) : 0,
      };

      await base44.entities.Cliente.update(clienteEditando.id, dadosAtualizados);
      await recalcularRankings();
      
      setSuccess(`Cliente "${dadosAtualizados.nome}" atualizado com sucesso! Ranking recalculado.`);
      setShowEditDialog(false);
      setClienteEditando(null);
      
      await loadData();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error("Erro ao editar cliente:", error);
      setError("Erro ao editar cliente. Tente novamente.");
    }

    setSaving(false);
  };

  const handleExcluirCliente = async (cliente) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente "${cliente.nome}"?\n\nEsta ação não pode ser desfeita e todas as visitas vinculadas a este cliente permanecerão no sistema.`)) {
      return;
    }

    try {
      await base44.entities.Cliente.delete(cliente.id);
      await recalcularRankings();
      
      setSuccess(`Cliente "${cliente.nome}" excluído com sucesso! Rankings recalculados.`);
      await loadData();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      setError("Erro ao excluir cliente. Tente novamente.");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (fileExtension !== '.csv') {
      setError(`Por favor, use apenas arquivos CSV (.csv).`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);
    setDetalhesImportacao(null);
    setClientesComErro([]);
    setProgress(10);

    try {
      console.log("Iniciando upload do arquivo:", file.name);

      const fileUploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = fileUploadResult.file_url;
      console.log("Arquivo enviado com sucesso:", fileUrl);
      setProgress(30);

      const schema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            posicao: { type: "integer" },
            grupo: { type: "string" },
            honorarios: { type: "number" }
          },
          required: ["grupo"]
        }
      };

      console.log("Extraindo dados do arquivo CSV...");
      
      let clientesExcel = [];
      try {
        const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: fileUrl,
          json_schema: schema
        });

        if (result.status === "success" && result.output) {
          clientesExcel = Array.isArray(result.output) ? result.output : [result.output];
        } else if (result.status === "error") {
          throw new Error(result.details || "Erro ao processar arquivo");
        }
      } catch (extractError) {
        console.error("Erro na extração automática:", extractError);
        setError(`⚠️ Não foi possível ler o arquivo CSV. Certifique-se de que: 1) O arquivo está no formato .csv correto, 2) As colunas são: Posição, Grupo e Honorários, 3) Use vírgula como separador.`);
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      setProgress(50);

      if (clientesExcel.length === 0) {
        setError("O arquivo não contém dados válidos. Verifique se o CSV tem as colunas: Posição, Grupo e Honorários.");
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      console.log(`${clientesExcel.length} registros encontrados no arquivo`);
      
      let novos = 0;
      let atualizados = 0;
      let erros = 0;
      const errosList = [];
      const clientesParaCriar = [];
      const clientesParaAtualizar = [];

      setProgress(60);

      // Separar clientes em lotes para criar/atualizar
      for (let i = 0; i < clientesExcel.length; i++) {
        const clienteExcel = clientesExcel[i];
        
        if (!clienteExcel.grupo || clienteExcel.grupo.trim() === '') {
          console.log(`Linha ${i + 1}: ignorada (sem nome do grupo)`);
          erros++;
          errosList.push({
            ranking: clienteExcel.posicao || "-",
            nome: "SEM NOME",
            honorarios: clienteExcel.honorarios || 0
          });
          continue;
        }

        const clienteExistente = clientes.find(c => 
          c.nome && c.nome.toLowerCase().trim() === clienteExcel.grupo.toLowerCase().trim()
        );

        const dadosCliente = {
          nome: clienteExcel.grupo.trim(),
          ranking: 0,
          honorarios: clienteExcel.honorarios || 0,
          competencia: format(new Date(), "MM/yyyy")
        };

        if (clienteExistente) {
          clientesParaAtualizar.push({ id: clienteExistente.id, dados: dadosCliente });
        } else {
          clientesParaCriar.push(dadosCliente);
        }
      }

      // Criar novos clientes em lote
      if (clientesParaCriar.length > 0) {
        try {
          await base44.entities.Cliente.bulkCreate(clientesParaCriar);
          novos = clientesParaCriar.length;
          console.log(`✅ ${novos} novos clientes criados em lote`);
        } catch (err) {
          console.error("Erro ao criar clientes em lote:", err);
          erros += clientesParaCriar.length;
          clientesParaCriar.forEach(c => {
            errosList.push({
              ranking: "-",
              nome: c.nome,
              honorarios: c.honorarios
            });
          });
        }
      }

      setProgress(70);

      // Atualizar clientes existentes um por vez com delay
      for (let i = 0; i < clientesParaAtualizar.length; i++) {
        const item = clientesParaAtualizar[i];
        
        try {
          await base44.entities.Cliente.update(item.id, item.dados);
          atualizados++;
          
          const progressoParcial = 70 + ((i + 1) / clientesParaAtualizar.length) * 10;
          setProgress(Math.round(progressoParcial));
          
          // Delay de 300ms entre cada atualização
          if (i < clientesParaAtualizar.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (err) {
          console.error(`Erro ao atualizar cliente ${item.dados.nome}:`, err);
          erros++;
          errosList.push({
            ranking: "-",
            nome: item.dados.nome,
            honorarios: item.dados.honorarios
          });
        }
      }

      setProgress(85);
      
      // Evitar recalcular imediatamente após importação massiva
      if (clientesExcel.length > 50) {
        setSuccess(`Importação concluída! ${novos} novos, ${atualizados} atualizados, ${erros} erros. ⚠️ Rankings serão recalculados em segundo plano.`);
        setProgress(100);
        
        // Recalcular após 5 segundos
        setTimeout(async () => {
          try {
            await recalcularRankings();
            await loadData();
          } catch (err) {
            console.error("Erro ao recalcular rankings:", err);
          }
        }, 5000);
      } else {
        await recalcularRankings();
        setProgress(100);
        await loadData();
      }

      setDetalhesImportacao({
        total: clientesExcel.length,
        novos,
        atualizados,
        erros
      });

      setClientesComErro(errosList);

      if (erros > 0) {
        setSuccess(`Importação concluída! ${novos} novos, ${atualizados} atualizados, ${erros} erros. Rankings recalculados automaticamente.`);
      } else {
        setSuccess(`Importação concluída! ${novos} clientes adicionados, ${atualizados} atualizados. Rankings recalculados automaticamente.`);
      }

    } catch (error) {
      console.error("Erro completo na importação:", error);
      setError(`Erro na importação: ${error.message || "Erro desconhecido"}. Verifique se o arquivo CSV está formatado corretamente.`);
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const baixarArquivoErros = () => {
    if (clientesComErro.length === 0) return;

    let conteudoCSV = "Ranking,Nome do Cliente,Honorários\n";
    clientesComErro.forEach(cliente => {
      conteudoCSV += `${cliente.ranking},"${cliente.nome}",${cliente.honorarios}\n`;
    });

    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_com_erro_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();
  };

  const gerarRelatorioPDFClientes = () => {
    const conteudoHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Clientes - Visita+</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
          .header h1 { color: #2563eb; margin: 0; font-size: 28px; }
          .header p { color: #64748b; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #2563eb; color: white; padding: 12px; text-align: left; font-size: 12px; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
          tr:hover { background: #f8fafc; }
          .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 2px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Relatório Completo de Clientes - Visita+</h1>
          <p>Total de clientes: ${clientes.length}</p>
          <p>Ordenado por honorários (maior para menor)</p>
          <p>Data de geração: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Ranking</th>
              <th>Nome do Cliente</th>
              <th>Honorários</th>
              <th>Competência</th>
            </tr>
          </thead>
          <tbody>
            ${clientes.map(cliente => `
              <tr>
                <td><strong>${cliente.ranking || "-"}</strong></td>
                <td>${cliente.nome}</td>
                <td>${formatarHonorarios(cliente.honorarios)}</td>
                <td>${cliente.competencia || "-"}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Relatório gerado automaticamente pelo sistema Visita+</p>
          <p>Rankings calculados automaticamente com base nos honorários</p>
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

  const getUltimaVisita = (clienteId) => {
    const visitasCliente = visitas
      .filter(v => v.cliente_id === clienteId && v.status === "REALIZADA")
      .sort((a, b) => new Date(b.data_visita) - new Date(a.data_visita));
    
    return visitasCliente[0];
  };

  const getDiasSemVisita = (clienteId) => {
    const ultimaVisita = getUltimaVisita(clienteId);
    if (!ultimaVisita) return Infinity;
    
    const dias = Math.floor((new Date() - new Date(ultimaVisita.data_visita)) / (1000 * 60 * 60 * 24));
    return dias;
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalClientes = clientes.length;
  const totalHonorarios = clientes.reduce((sum, cliente) => sum + (cliente.honorarios || 0), 0);

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Gestão de Clientes
            </h1>
            <p className="text-slate-600">
              {filteredClientes.length === totalClientes 
                ? `${totalClientes} ${totalClientes === 1 ? 'cliente cadastrado' : 'clientes cadastrados'} | Ranking automático por honorários`
                : `Mostrando ${filteredClientes.length} de ${totalClientes} clientes`
              }
            </p>
          </div>

          <div className="flex gap-3">
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700 shadow-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Cliente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSalvarCliente} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome do Cliente *</Label>
                    <Input
                      id="nome"
                      placeholder="Ex: Empresa ABC Ltda"
                      value={novoCliente.nome}
                      onChange={(e) => setNovoCliente({...novoCliente, nome: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="honorarios">Honorários (R$) *</Label>
                    <Input
                      id="honorarios"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 5000.00"
                      value={novoCliente.honorarios}
                      onChange={(e) => setNovoCliente({...novoCliente, honorarios: e.target.value})}
                      required
                    />
                  </div>

                  <Alert className="border-slate-300 bg-slate-100">
                    <Info className="h-4 w-4 text-slate-700" />
                    <AlertDescription className="text-slate-800 text-sm">
                      O <strong>ranking</strong> será calculado <strong>automaticamente</strong> com base nos honorários (maior para menor).
                    </AlertDescription>
                  </Alert>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDialog(false);
                        setNovoCliente({ nome: "", honorarios: "" });
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {saving ? "Salvando..." : "Salvar Cliente"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              onClick={gerarRelatorioPDFClientes}
              variant="outline"
              className="border-slate-800 text-slate-800 hover:bg-slate-100"
            >
              <FileText className="w-4 h-4 mr-2" />
              Relatório PDF
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-slate-300 bg-slate-100">
            <CheckCircle className="h-4 w-4 text-slate-700" />
            <AlertDescription className="text-slate-800">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="border-none shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importar Clientes via CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-slate-300 bg-slate-100">
              <Info className="h-4 w-4 text-slate-700" />
              <AlertDescription className="text-slate-800">
                <strong>Formato aceito:</strong> Apenas arquivos <strong>CSV (.csv)</strong><br/>
                <strong>Colunas necessárias:</strong> Posição, Grupo, Honorários<br/>
                <strong>Separador:</strong> Vírgula (,)<br/>
                <strong className="text-red-700">✅ O ranking será recalculado automaticamente após a importação!</strong><br/>
                <strong>Exemplo de formato CSV:</strong><br/>
                <div className="bg-white px-3 py-2 rounded mt-2 text-xs font-mono">
                  Posição,Grupo,Honorários<br/>
                  1,Empresa ABC,5000.00<br/>
                  2,Empresa XYZ,3500.50<br/>
                  3,Empresa 123,2800.00
                </div>
                <div className="mt-2 text-xs">
                  💡 <strong>Dica:</strong> Exporte sua planilha Excel como CSV no Excel (Arquivo → Salvar Como → CSV)
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-4">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1"
              />
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Processando arquivo...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            {detalhesImportacao && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-slate-600">Total</p>
                  <p className="text-2xl font-bold text-slate-900">{detalhesImportacao.total}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-slate-600">Novos</p>
                  <p className="text-2xl font-bold text-slate-700">{detalhesImportacao.novos}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-slate-600">Atualizados</p>
                  <p className="text-2xl font-bold text-slate-600">{detalhesImportacao.atualizados}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <p className="text-sm text-slate-600">Erros</p>
                  <p className="text-2xl font-bold text-red-600">{detalhesImportacao.erros}</p>
                </div>
              </div>
            )}

            {clientesComErro.length > 0 && (
              <div className="mt-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {clientesComErro.length} cliente(s) não puderam ser importados.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={baixarArquivoErros}
                  variant="outline"
                  className="mt-3"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar Lista de Erros (CSV)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Edição */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
            </DialogHeader>
            {clienteEditando && (
              <form onSubmit={handleSalvarEdicao} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nome">Nome do Cliente *</Label>
                  <Input
                    id="edit-nome"
                    placeholder="Ex: Empresa ABC Ltda"
                    value={clienteEditando.nome}
                    onChange={(e) => setClienteEditando({...clienteEditando, nome: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-honorarios">Honorários (R$) *</Label>
                  <Input
                    id="edit-honorarios"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 5000.00"
                    value={clienteEditando.honorarios}
                    onChange={(e) => setClienteEditando({...clienteEditando, honorarios: e.target.value})}
                    required
                  />
                </div>

                <Alert className="border-slate-300 bg-slate-100">
                  <Info className="h-4 w-4 text-slate-700" />
                  <AlertDescription className="text-slate-800 text-sm">
                    O <strong>ranking</strong> será <strong>recalculado automaticamente</strong> após salvar as alterações.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditDialog(false);
                      setClienteEditando(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle className="text-xl font-bold text-slate-800">
                Lista de Clientes ({totalClientes} {totalClientes === 1 ? 'cliente' : 'clientes'} | Ranking automático por honorários)
              </CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {searchTerm && (
              <p className="text-sm text-slate-500 mt-2">
                Mostrando {filteredClientes.length} resultado{filteredClientes.length !== 1 ? 's' : ''}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Ranking</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Honorários</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Última Visita</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClientes.map((cliente) => {
                    const diasSemVisita = getDiasSemVisita(cliente.id);
                    const ultimaVisita = getUltimaVisita(cliente.id);
                    
                    return (
                      <tr key={cliente.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded-full text-sm font-bold">
                            {cliente.ranking || "-"}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-slate-800">{cliente.nome}</p>
                          {cliente.competencia && (
                            <p className="text-xs text-slate-500">Comp: {cliente.competencia}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-red-600">
                            {formatarHonorarios(cliente.honorarios)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          {ultimaVisita 
                            ? format(new Date(ultimaVisita.data_visita), "dd/MM/yyyy", { locale: ptBR })
                            : "Nunca"}
                        </td>
                        <td className="py-4 px-4">
                          {diasSemVisita > 90 ? (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                              <AlertCircle className="w-3 h-3" />
                              Alerta
                            </span>
                          ) : diasSemVisita === Infinity ? (
                            <span className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-medium">
                              Sem visita
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-slate-300 text-slate-900 rounded-full text-xs font-medium">
                              OK
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditarCliente(cliente)}
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 border-slate-700 text-slate-700 hover:bg-slate-100"
                              title="Editar cliente"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleExcluirCliente(cliente)}
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 border-red-600 text-red-600 hover:bg-red-50"
                              title="Excluir cliente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-800 text-white font-bold">
                    <td className="py-4 px-4" colSpan="2">
                      TOTAL
                    </td>
                    <td className="py-4 px-4 text-lg">
                      {formatarHonorarios(totalHonorarios)}
                    </td>
                    <td className="py-4 px-4" colSpan="3"></td>
                  </tr>
                </tfoot>
              </table>
              
              {filteredClientes.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">
                    {searchTerm 
                      ? "Nenhum cliente encontrado com esse nome."
                      : "Nenhum cliente cadastrado ainda."}
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