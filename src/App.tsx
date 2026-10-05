import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { type Permission, useAuth } from './auth/AuthContext';
import { Shell } from './components/Shell';
import { Empty, Loading } from './components/ui';
import { AccountPage } from './pages/AccountPage';
import { ChargesPage } from './pages/ChargesPage';
import { CommissionsPage } from './pages/CommissionsPage';
import { HomePage } from './pages/HomePage';
import { LeadsPage } from './pages/LeadsPage';
import { LeaseDetailPage } from './pages/LeaseDetailPage';
import { LeasesPage } from './pages/LeasesPage';
import { LoginPage } from './pages/LoginPage';
import { PeoplePage } from './pages/PeoplePage';
import { PropertiesPage } from './pages/PropertiesPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { ProposalsPage } from './pages/ProposalsPage';
import { SaleDetailPage } from './pages/SaleDetailPage';
import { SalesPage } from './pages/SalesPage';
import { UsersPage } from './pages/UsersPage';
import { VisitsPage } from './pages/VisitsPage';

function Restricted({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { can } = useAuth();
  if (can(permission)) return <>{children}</>;
  return (
    <div className="page">
      <Empty title="Seu perfil não tem acesso a esta área.">Peça a um administrador, se precisar.</Empty>
    </div>
  );
}

export function App() {
  const { user } = useAuth();
  const location = useLocation();

  if (user === undefined) return <Loading label="Conferindo sua sessão…" />;

  if (user === null) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Guarda a página pedida para voltar a ela depois do login. */}
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location.pathname }} />} />
      </Routes>
    );
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/imoveis" element={<PropertiesPage />} />
        <Route path="/imoveis/:id" element={<PropertyDetailPage />} />
        <Route path="/pessoas" element={<PeoplePage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/visitas" element={<VisitsPage />} />
        <Route path="/locacoes" element={<LeasesPage />} />
        <Route path="/locacoes/:id" element={<LeaseDetailPage />} />
        <Route path="/cobrancas" element={<ChargesPage />} />
        <Route path="/propostas" element={<ProposalsPage />} />
        <Route path="/vendas" element={<SalesPage />} />
        <Route path="/vendas/:id" element={<SaleDetailPage />} />
        <Route path="/comissoes" element={<CommissionsPage />} />
        <Route path="/usuarios" element={<Restricted permission="listUsers"><UsersPage /></Restricted>} />
        <Route path="/conta" element={<AccountPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route
          path="*"
          element={
            <div className="page">
              <Empty title="Página não encontrada.">Use o menu para continuar.</Empty>
            </div>
          }
        />
      </Routes>
    </Shell>
  );
}
