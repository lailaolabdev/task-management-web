import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import api from './lib/axios';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import KanbanPage from './pages/KanbanPage';
import StandupPage from './pages/StandupPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import UsersPage from './pages/UsersPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import TeamsPage from './pages/TeamsPage';
import InitiativesPage from './pages/InitiativesPage';
import ImportPage from './pages/ImportPage';
import Layout from './components/Layout';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Admin + PM + Lead Team — Dashboard and Teams
const ELEVATED_ROLES = ['Admin', 'Project Manager', 'Lead Team'];
// Admin + PM only — Import and Users management
const ADMIN_MANAGER_ROLES = ['Admin', 'Project Manager'];

const ElevatedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !ELEVATED_ROLES.includes(user.role)) return <Navigate to="/kanban" replace />;
  return <>{children}</>;
};

const AdminManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !ADMIN_MANAGER_ROLES.includes(user.role)) return <Navigate to="/kanban" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || user.role !== 'Admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const updateUser = useAuthStore((s) => s.updateUser);

  // Re-fetch the user profile on every mount so stale cached roles (e.g. after
  // a server-side role rename) are corrected without requiring a manual re-login.
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    api.get('/auth/me').then((res) => {
      const fresh = res.data?.data?.user;
      if (fresh) updateUser(fresh);
    }).catch(() => {/* silently ignore — the cached user is still usable */});
  }, [isAuthenticated, token, updateUser]);

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <ElevatedRoute>
              <DashboardPage />
            </ElevatedRoute>
          }
        />
        <Route path="kanban" element={<KanbanPage />} />
        <Route path="standup" element={<StandupPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="weekly" element={<WeeklyReportPage />} />
        <Route path="initiatives" element={<InitiativesPage />} />
        <Route
          path="teams"
          element={
            <ElevatedRoute>
              <TeamsPage />
            </ElevatedRoute>
          }
        />
        <Route
          path="import"
          element={
            <AdminManagerRoute>
              <ImportPage />
            </AdminManagerRoute>
          }
        />
        <Route
          path="users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
