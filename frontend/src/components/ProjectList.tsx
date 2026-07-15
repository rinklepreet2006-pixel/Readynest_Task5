import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Plus, Trash2, Edit3, Save, X, Calendar } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export const ProjectList: React.FC = () => {
  const { apiFetch, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  
  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const fetchProjects = async () => {
    try {
      const data = await apiFetch('/projects');
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const created = await apiFetch('/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc }),
      });
      setProjects([created, ...projects]);
      setNewProjectName('');
      setNewProjectDesc('');
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create project');
    }
  };

  const handleStartEdit = (project: Project) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditDesc(project.description || '');
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const updated = await apiFetch(`/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDesc }),
      });
      setProjects(projects.map(p => p.id === id ? updated : p));
      setEditingId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update project');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This will also delete all associated tasks.')) return;
    try {
      await apiFetch(`/projects/${id}`, {
        method: 'DELETE',
      });
      setProjects(projects.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading project workspaces...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>{error}</div>;

  return (
    <div className="animate-fade-in">
      <div className="content-header">
        <div>
          <h1>Project Workspaces</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Create and manage isolated project contexts</p>
        </div>
        {!showAddForm && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={16} />
            New Project
          </button>
        )}
      </div>

      {/* Creation form */}
      {showAddForm && (
        <div className="card mb-4" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3>Create a New Project Workspace</h3>
            <button className="theme-toggle-btn" onClick={() => setShowAddForm(false)}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreateProject}>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Product Launch Campaign"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description (Optional)</label>
              <textarea
                className="form-control"
                placeholder="Brief summary outlining goals, target dates, or customer targets"
                rows={3}
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects list grid */}
      {projects.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem 2rem' }}>
          <Briefcase size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem auto' }} />
          <h3>No projects found</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            Get started by initializing your first organization project workspace.
          </p>
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            Create Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {projects.map((project) => (
            <div key={project.id} className="card">
              {editingId === project.id ? (
                // Edit state
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Edit Project Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Edit Description</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                      <X size={14} /> Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(project.id)}>
                      <Save size={14} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                // Read state
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <h3 style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{project.name}</h3>
                      <Briefcase size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '4px' }} />
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', minHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {project.description || 'No description provided.'}
                    </p>
                  </div>
                  
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-2">
                      <Calendar size={12} />
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex gap-2">
                      <button className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem' }} onClick={() => handleStartEdit(project)} title="Edit Project">
                        <Edit3 size={12} />
                      </button>
                      {user?.role === 'tenant_admin' && (
                        <button className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem', color: 'var(--danger)' }} onClick={() => handleDeleteProject(project.id)} title="Delete Project">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
