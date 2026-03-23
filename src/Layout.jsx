import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  AlertTriangle,
  History,
  FileText,
  UserCog,
  LogOut
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "Registrar Visita",
    url: createPageUrl("RegistrarVisita"),
    icon: ClipboardList,
  },
  {
    title: "Histórico",
    url: createPageUrl("Historico"),
    icon: History,
  },
  {
    title: "Relatórios",
    url: createPageUrl("Relatorios"),
    icon: FileText,
  },
  {
    title: "Clientes",
    url: createPageUrl("Clientes"),
    icon: Users,
  },
  {
    title: "Alertas",
    url: createPageUrl("Alertas"),
    icon: AlertTriangle,
  },
  {
    title: "Usuários",
    url: createPageUrl("Usuarios"),
    icon: UserCog,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      
      if (!isAuthenticated) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
      base44.auth.redirectToLogin(window.location.href);
    }
  };

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
      window.location.href = createPageUrl("Index");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
        <Sidebar className="border-r border-slate-200 bg-white/95 backdrop-blur-sm">
          <SidebarHeader className="border-b border-slate-200 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-black rounded-xl flex items-center justify-center shadow-lg">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-slate-900">
                  Visita+
                </h2>
                <p className="text-xs text-slate-500">Gestão de Visitas</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Menu Principal
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-slate-100 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url 
                            ? 'bg-red-600 text-white shadow-lg' 
                            : 'text-slate-700'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 p-4">
            {user && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user.full_name?.charAt(0) || user.email?.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sair</span>
                </button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-4 md:hidden flex-shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold text-slate-900">
                Visita+
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}