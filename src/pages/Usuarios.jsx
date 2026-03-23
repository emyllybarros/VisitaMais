import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Key, AlertCircle, Shield, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";


import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usuariosData, userData] = await Promise.all([
        base44.entities.User.list(),
        base44.auth.me()
      ]);
      setUsuarios(usuariosData);
      setCurrentUser(userData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
    setLoading(false);
  };

  const handleAlterarRole = async (userId, newRole) => {
    try {
      await base44.entities.User.update(userId, { role: newRole });
      await loadData();
    } catch (error) {
      console.error("Erro ao alterar permissão:", error);
    }
  };

  const isAdmin = currentUser?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="p-6 md:p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar usuários.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 to-emerald-600 bg-clip-text text-transparent mb-2">
              Gerenciamento de Usuários
            </h1>
            <p className="text-slate-600">Controle de acesso e permissões do sistema</p>
          </div>
        </div>

        {/* Informação sobre Autenticação */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Sobre a Autenticação do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-blue-800">
            <div className="space-y-2">
              <p className="font-semibold">🔐 O sistema já possui autenticação ativa!</p>
              <p className="text-sm">
                Quando alguém acessa o link do seu app pela primeira vez, automaticamente será solicitado login e senha. 
                Apenas usuários cadastrados conseguem acessar a ferramenta.
              </p>
            </div>

            <div className="bg-blue-100 p-4 rounded-lg space-y-2">
              <p className="font-semibold">📋 Como Criar Novos Usuários:</p>
              <ol className="list-decimal list-inside text-sm space-y-1 ml-2">
                <li>Acesse o <strong>Dashboard Base44</strong> (botão no menu lateral esquerdo)</li>
                <li>Clique na seção <strong>"Usuários"</strong></li>
                <li>Clique no botão <strong>"Convidar Usuário"</strong></li>
                <li>Digite o <strong>email</strong> do novo usuário</li>
                <li>Escolha o <strong>perfil</strong>: Admin ou Usuário</li>
                <li>O convidado receberá um <strong>email</strong> com link para criar sua senha</li>
              </ol>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <p className="font-semibold text-amber-900">⚠️ Importante:</p>
              <p className="text-sm text-amber-800 mt-1">
                A criação de usuários deve ser feita através do Dashboard Base44, não pelo app diretamente. 
                Isso garante a segurança e o envio correto dos emails de convite.
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="cadastrados" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cadastrados">
              <Users className="w-4 h-4 mr-2" />
              Usuários Cadastrados ({usuarios.length})
            </TabsTrigger>
            <TabsTrigger value="instrucoes">
              <Key className="w-4 h-4 mr-2" />
              Como Gerenciar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cadastrados">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-800">
                  Usuários com Acesso ao Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Nome</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Perfil</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map((usuario) => (
                        <tr key={usuario.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {usuario.full_name?.charAt(0) || usuario.email?.charAt(0)}
                                </span>
                              </div>
                              <span className="font-semibold text-slate-800">
                                {usuario.full_name || "Sem nome"}
                                {usuario.id === currentUser?.id && <span className="text-xs text-slate-500 ml-2">(Você)</span>}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-600">{usuario.email}</td>
                          <td className="py-4 px-4">
                            {usuario.id === currentUser?.id ? (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                usuario.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-700' 
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {usuario.role === 'admin' ? 'Administrador' : 'Usuário'}
                              </span>
                            ) : (
                              <Select
                                value={usuario.role}
                                onValueChange={(value) => handleAlterarRole(usuario.id, value)}
                              >
                                <SelectTrigger className="w-36">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                  <SelectItem value="user">Usuário</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instrucoes">
            <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-slate-800">
                  Guia Completo de Gerenciamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex gap-4 p-4 bg-blue-50 rounded-lg">
                    <UserPlus className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-2">1. Convidar Novos Usuários</h3>
                      <ol className="list-decimal list-inside text-blue-800 text-sm space-y-1">
                        <li>Acesse o <strong>Dashboard Base44</strong></li>
                        <li>Clique em <strong>Usuários</strong> no menu lateral</li>
                        <li>Clique no botão <strong>"Convidar Usuário"</strong></li>
                        <li>Preencha o email e escolha o perfil (Admin ou Usuário)</li>
                        <li>O usuário receberá um email com link para criar senha</li>
                        <li>Após criar a senha, poderá acessar o sistema normalmente</li>
                      </ol>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-emerald-50 rounded-lg">
                    <Key className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-emerald-900 mb-2">2. Alterar ou Recuperar Senha</h3>
                      <ul className="list-disc list-inside text-emerald-800 text-sm space-y-1">
                        <li><strong>Usuário esqueceu a senha:</strong> Na tela de login, clique em "Esqueci minha senha"</li>
                        <li><strong>Admin resetar senha:</strong> No Dashboard Base44 → Usuários → selecione o usuário → "Resetar Senha"</li>
                        <li>Um email será enviado com link para criar nova senha</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-purple-50 rounded-lg">
                    <Shield className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-purple-900 mb-2">3. Gerenciar Permissões</h3>
                      <p className="text-purple-800 text-sm mb-2">
                        Você pode alterar o perfil dos usuários na aba "Usuários Cadastrados" acima:
                      </p>
                      <ul className="list-disc list-inside text-purple-800 text-sm space-y-1">
                        <li><strong>Administrador:</strong> Acesso total + gerenciar usuários + alterar permissões</li>
                        <li><strong>Usuário:</strong> Acesso às funcionalidades de visitas, clientes, relatórios e alertas</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <ExternalLink className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-amber-900 mb-2">4. Remover Acesso de Usuário</h3>
                      <ol className="list-decimal list-inside text-amber-800 text-sm space-y-1">
                        <li>Acesse o Dashboard Base44</li>
                        <li>Vá em Usuários</li>
                        <li>Localize o usuário que deseja remover</li>
                        <li>Clique em "Remover" ou "Desativar"</li>
                        <li>O usuário não poderá mais fazer login no sistema</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}