import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Briefcase, CheckSquare, Users, Activity } from 'lucide-react';

interface DashboardStats {
  summary: {
    totalProjects: number;
    totalTasks: number;
    totalMembers: number;
  };
  tasksByStatus: {
    todo: number;
    in_progress: number;
    done: number;
  };
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
  };
  projectsOverview: Array<{ id: string; name: string; taskCount: number }>;
  recentActivity: Array<{
    id: string;
    action: string;
    details: string;
    userName: string;
    userEmail: string | null;
    createdAt: string;
  }>;
}

export const Dashboard: React.FC = () => {
  const { apiFetch } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const data = await apiFetch('/dashboard/stats');
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) return <div className="animate-fade-in" style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard analytics...</div>;
  if (error) return <div className="animate-fade-in" style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>{error}</div>;
  if (!stats) return null;

  // Format charts data
  const projectChartData = stats.projectsOverview.map(p => ({
    name: p.name.length > 12 ? p.name.substring(0, 10) + '...' : p.name,
    Tasks: p.taskCount
  }));

  const priorityPieData = [
    { name: 'Low', value: stats.tasksByPriority.low },
    { name: 'Medium', value: stats.tasksByPriority.medium },
    { name: 'High', value: stats.tasksByPriority.high },
  ].filter(item => item.value > 0);

  const PRIORITY_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  const statusColors = {
    todo: '#94a3b8',
    in_progress: '#4f46e5',
    done: '#10b981'
  };

  return (
    <div className="animate-fade-in">
      <div className="content-header">
        <div>
          <h1>Tenant Analytics Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Real-time overview of organization activities</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchStats}>Refresh Stats</button>
      </div>

      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        <div className="card metric-card">
          <div className="metric-info">
            <span className="metric-title">Active Projects</span>
            <span className="metric-value">{stats.summary.totalProjects}</span>
          </div>
          <div className="metric-icon primary">
            <Briefcase size={24} />
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-info">
            <span className="metric-title">Total Tasks</span>
            <span className="metric-value">{stats.summary.totalTasks}</span>
          </div>
          <div className="metric-icon accent">
            <CheckSquare size={24} />
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-info">
            <span className="metric-title">Team Members</span>
            <span className="metric-value">{stats.summary.totalMembers}</span>
          </div>
          <div className="metric-icon success">
            <Users size={24} />
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="dashboard-grid">
        {/* Project Tasks Bar Chart */}
        <div className="card">
          <h3>Tasks Distribution by Project</h3>
          {projectChartData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '280px', color: 'var(--text-muted)' }}>
              No projects created yet.
            </div>
          ) : (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                  <Bar dataKey="Tasks" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Task Priority Pie Chart */}
        <div className="card">
          <h3>Tasks Priority Breakdown</h3>
          {priorityPieData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '280px', color: 'var(--text-muted)' }}>
              No tasks logged.
            </div>
          ) : (
            <div className="chart-container" style={{ position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {priorityPieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PRIORITY_COLORS[index % PRIORITY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Tasks status count summary */}
        <div className="card">
          <h3>Tasks Status Board</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: statusColors.todo }}></div>
                <span style={{ fontWeight: 600 }}>To Do</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{stats.tasksByStatus.todo}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: statusColors.in_progress }}></div>
                <span style={{ fontWeight: 600 }}>In Progress</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{stats.tasksByStatus.in_progress}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: statusColors.done }}></div>
                <span style={{ fontWeight: 600 }}>Completed</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{stats.tasksByStatus.done}</span>
            </div>
          </div>
        </div>

        {/* Audit Logs Quick Feed */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} style={{ color: 'var(--primary)' }} />
            <h3>Recent Organization Activities</h3>
          </div>
          
          <div className="activity-list">
            {stats.recentActivity.length === 0 ? (
              <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No recorded actions yet.
              </div>
            ) : (
              stats.recentActivity.map(log => (
                <div key={log.id} className="activity-item">
                  <div className="activity-dot" style={{ backgroundColor: log.action.includes('deleted') ? 'var(--danger)' : 'var(--primary)' }}></div>
                  <div className="activity-details">
                    <span className="activity-action">{log.action.replace('_', ' ').toUpperCase()}</span>
                    <span className="activity-text">{log.details}</span>
                    <span className="activity-time">
                      By {log.userName} • {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
