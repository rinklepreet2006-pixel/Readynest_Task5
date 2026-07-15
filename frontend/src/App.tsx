import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NavBar } from './components/NavBar';
import { AuthPages } from './components/AuthPages';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { TaskList } from './components/TaskList';
import { AdminPanel } from './components/AdminPanel';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Initializing Tenant Security...</h2>
      </div>
    );
  }

  if (!user) {
    return <AuthPages onSuccess={() => setCurrentTab('dashboard')} />;
  }

  return (
    <SocketProvider>
      <div className="app-container">
        <NavBar currentTab={currentTab} setCurrentTab={setCurrentTab} />
        <main className="main-content">
          {currentTab === 'dashboard' && <Dashboard />}
          {currentTab === 'tasks' && <TaskList />}
          {currentTab === 'projects' && <ProjectList />}
          {currentTab === 'admin' && <AdminPanel />}
        </main>
      </div>
    </SocketProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
