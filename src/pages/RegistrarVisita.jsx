import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, CheckCircle, PlusCircle, Trash2, Edit, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RegistrarVisita() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [editingVisit, setEditingVisit] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    cliente_id: "",
    cliente_nome: "",
    responsavel: "",
    departamento: "",
    atividade: "",
    status: "REALIZADA",
    data_visita: new Date(),
    observacoes: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
      
      const [visitasData, userData] = await Promise.all([
        base44.entities.Visita.list("-data_visita", 1000),
        base44.auth.me()
      ]);
      
      setClientes(clientesUnicos);
      setVisitas(visitasData);
      setUser(userData);

      if (!formData.responsavel && userData) {
        setFormData(prev => ({ ...prev, responsavel: userData.full_name || userData.email || "" }));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setError("Não foi possível carregar os dados. Tente novamente.");
    }
  };

  const handleClienteChange = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    setFormData({
      ...formData,
      cliente_id: clienteId,
      cliente_nome: cliente?.nome || ""
    });
  };

  const handleNewClientToggle = () => {
    setShowNewClientInput(prev => !prev);
    setNewClientName("");
    if (showNewClientInput) {
      setFormData(prev => ({ ...prev, cliente_id: "", cliente_nome: "" }));
    }
  };

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      cliente_nome: "",
      responsavel: user?.full_name || user?.email || "",
      departamento: "",
      atividade: "",
      status: "REALIZADA",
      data_visita: new Date(),
      observacoes: ""
    });
    setEditingVisit(null);
    setShowNewClientInput(false);
    setNewClientName("");
  };

  const handleEditVisit = (visita) => {
    setEditingVisit(visita);
    setFormData({
      cliente_id: visita.cliente_id || "",
      cliente_nome: visita.cliente_nome || "",
      responsavel: visita.responsavel || "",
      departamento: visita.departamento || "",
      atividade: visita.atividade || "",
      status: visita.status || "REALIZADA",
      data_visita: visita.data_visita ? parseISO(visita.data_visita) : new Date(),
      observacoes: visita.observacoes || ""
    });
    setShowListDialog(false);
    setShowDialog(true);
  };

  const handleDeleteVisit = async (visitaId) => {
    if (window.confirm("Tem certeza que deseja excluir esta visita?")) {
      try {
        await base44.entities.Visita.delete(visitaId);
        setSuccess("Visita excluída com sucesso!");
        await loadData();
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        console.error("Erro ao excluir visita:", error);
        setError("Não foi possível excluir a visita. Tente novamente.");
        setTimeout(() => setError(null), 3000);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let currentClienteId = formData.cliente_id;
      let currentClienteNome = formData.cliente_nome;

      if (showNewClientInput && newClientName.trim() !== "") {
        const newClient = await base44.entities.Cliente.create({ 
          nome: newClientName.trim(),
          honorarios: 0,
          ranking: 0
        });
        currentClienteId = newClient.id;
        currentClienteNome = newClient.nome;
      } else if (!currentClienteId) {
        setError("Por favor, selecione um cliente ou crie um novo.");
        setSaving(false);
        return;
      }

      const competencia = format(formData.data_visita, "MM/yyyy", { locale: ptBR });
      const dataToSave = {
        ...formData,
        cliente_id: currentClienteId,
        cliente_nome: currentClienteNome,
        responsavel: formData.responsavel || user?.full_name || user?.email,
        competencia,
        data_visita: format(formData.data_visita, "yyyy-MM-dd")
      };

      if (editingVisit) {
        await base44.entities.Visita.update(editingVisit.id, dataToSave);
        setSuccess("Visita atualizada com sucesso!");
      } else {
        await base44.entities.Visita.create(dataToSave);
        setSuccess("Visita registrada com sucesso!");
      }

      resetForm();
      setShowDialog(false);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Erro ao salvar visita:", error);
      setError(`Não foi possível salvar a visita: ${error.message || "Erro desconhecido"}`);
    }

    setSaving(false);
  };

  const formatarHonorarios = (valor) => {
    if (!valor && valor !== 0) return "-";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
              Registrar Visita
            </h1>
            <p className="text-slate-600">Gerencie as visitas aos clientes</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
              className="bg-red-600 hover:bg-red-700 shadow-lg"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Nova Visita
            </Button>
            <Button
              onClick={() => setShowListDialog(true)}
              variant="outline"
              className="border-slate-800 text-slate-800 hover:bg-slate-100"
            >
              <List className="w-4 h-4 mr-2" />
              Ver Todas ({visitas.length})
            </Button>
          </div>
        </div>

        {success && (
          <Alert className="border-slate-300 bg-slate-100">
            <CheckCircle className="h-4 w-4 text-slate-700" />
            <AlertDescription className="text-slate-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Últimas Visitas */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-800">
              Últimas Visitas Registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visitas.slice(0, 10).map((visita) => (
                <div 
                  key={visita.id} 
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:shadow-md transition-all duration-200"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{visita.cliente_nome}</p>
                    <p className="text-sm text-slate-600">
                      {visita.responsavel && <span className="font-medium">{visita.responsavel}</span>}
                      {visita.responsavel && " • "}
                      {visita.departamento} - {visita.atividade}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(visita.data_visita), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
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
                        Não Realizada
                      </span>
                    )}
                    <Button
                      onClick={() => handleEditVisit(visita)}
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteVisit(visita.id)}
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dialog de Lista Completa */}
        <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Todas as Visitas ({visitas.length})</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {visitas.map((visita) => (
                <div 
                  key={visita.id} 
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{visita.cliente_nome}</p>
                    <p className="text-sm text-slate-600">
                      {visita.responsavel && <span>{visita.responsavel} • </span>}
                      {visita.departamento} - {visita.atividade}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(visita.data_visita), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      visita.status === "REALIZADA" 
                        ? 'bg-slate-200 text-slate-800'
                        : visita.status === "AGENDADA"
                        ? 'bg-slate-300 text-slate-900'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {visita.status}
                    </span>
                    <Button
                      onClick={() => handleEditVisit(visita)}
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteVisit(visita.id)}
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Formulário */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {editingVisit ? "Editar Visita" : "Nova Visita"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label htmlFor="cliente">Cliente *</Label>
                  <div className="flex gap-2">
                    {!showNewClientInput ? (
                      <Select
                        value={formData.cliente_id}
                        onValueChange={handleClienteChange}
                        required={!showNewClientInput}
                        disabled={showNewClientInput}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clientes.map((cliente) => (
                            <SelectItem key={cliente.id} value={cliente.id}>
                              {cliente.nome} {cliente.honorarios ? `(${formatarHonorarios(cliente.honorarios)})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="newClientName"
                        placeholder="Nome do novo cliente"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        required={showNewClientInput}
                      />
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleNewClientToggle}
                      title={showNewClientInput ? "Cancelar" : "Novo cliente"}
                    >
                      {showNewClientInput ? "✕" : <PlusCircle className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Input
                    id="responsavel"
                    placeholder="Nome do responsável"
                    value={formData.responsavel}
                    onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento *</Label>
                  <Select
                    value={formData.departamento}
                    onValueChange={(value) => setFormData({ ...formData, departamento: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOCIO">Sócio</SelectItem>
                      <SelectItem value="FISCAL">Fiscal</SelectItem>
                      <SelectItem value="CONTABIL">Contábil</SelectItem>
                      <SelectItem value="DP">DP</SelectItem>
                      <SelectItem value="RH">RH</SelectItem>
                      <SelectItem value="PREVENÇÃO">Prevenção</SelectItem>
                      <SelectItem value="FINANCEIRO">Financeiro</SelectItem>
                      <SelectItem value="REINF">Reinf</SelectItem>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="JURIDICO">Jurídico</SelectItem>
                      <SelectItem value="COMERCIAL">Comercial</SelectItem>
                      <SelectItem value="EQUIPE EXTERNA">Equipe Externa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="atividade">Atividade *</Label>
                  <Select
                    value={formData.atividade}
                    onValueChange={(value) => setFormData({ ...formData, atividade: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VISITA PADRÃO">Visita Padrão</SelectItem>
                      <SelectItem value="VISITA FINAL DE ANO">Visita Final de Ano</SelectItem>
                      <SelectItem value="VISITA SOLICITADA">Visita Solicitada</SelectItem>
                      <SelectItem value="TREINAMENTO">Treinamento</SelectItem>
                      <SelectItem value="PROCESSO SELETIVO">Processo Seletivo</SelectItem>
                      <SelectItem value="INTEGRAÇÃO">Integração</SelectItem>
                      <SelectItem value="VISITA DE ALINHAMENTO">Visita de Alinhamento</SelectItem>
                      <SelectItem value="PROSPECÇÃO">Prospecção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REALIZADA">Realizada</SelectItem>
                      <SelectItem value="NÃO REALIZADA">Não Realizada</SelectItem>
                      <SelectItem value="AGENDADA">Agendada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Data da Visita *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.data_visita ? (
                          format(formData.data_visita, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.data_visita}
                        onSelect={(date) => date && setFormData({ ...formData, data_visita: date })}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Adicione observações..."
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="h-32"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {saving ? "Salvando..." : editingVisit ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}