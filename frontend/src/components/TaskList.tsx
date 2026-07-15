import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { TaskModal } from './TaskModal';
import { Plus, Search, Filter, Calendar, Paperclip, Edit3, Trash2, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  projectId: string;
  assignedToId: string | null;
  attachmentUrl: string | null;
  project: { id: string; name: string };
  assignedTo: { id: string; name: string; email: string } | null;
  createdAt: string;
}

export const TaskList: React.FC = () => {
  const { apiFetch } = useAuth();
  const socket = useSocket();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and Sorting state
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal Control state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // WebSocket Live Alert State
  const [liveAlert, setLiveAlert] = useState<string | null>(null);

  const fetchFiltersData = async () => {
    try {
      const [projData, membData] = await Promise.all([
        apiFetch('/projects'),
        apiFetch('/auth/members'),
      ]);
      setProjects(projData);
      setMembers(membData);
    } catch (err) {
      console.error('Failed to load filter sources', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const queryParams = new URLSearchParams({
        search,
        projectId: selectedProject,
        priority: selectedPriority,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: '50', // High limit for kanban columns, or paginated
      });
      
      const data = await apiFetch(`/tasks?${queryParams.toString()}`);
      setTasks(data.tasks);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger tasks fetch on query change
  useEffect(() => {
    fetchTasks();
  }, [search, selectedProject, selectedPriority, sortBy, sortOrder, page]);

  // Initial load
  useEffect(() => {
    fetchFiltersData();
  }, []);

  // Set up WebSocket real-time triggers
  useEffect(() => {
    if (!socket) return;

    const handleTaskUpdateEvent = (event: { type: string; task?: any; taskId?: string }) => {
      console.log('[WebSocket Task Update Received]', event);
      setLiveAlert(`Live update: A task was ${event.type}d`);
      setTimeout(() => setLiveAlert(null), 3000);
      fetchTasks();
    };

    socket.on('task_updated', handleTaskUpdateEvent);

    return () => {
      socket.off('task_updated', handleTaskUpdateEvent);
    };
  }, [socket, search, selectedProject, selectedPriority, sortBy, sortOrder, page]);

  // HTML5 Native Drag & Drop actions
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Required to allow drop
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Drop synchronization failed', err);
      fetchTasks(); // Rollback
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
      setTasks(tasks.filter(t => t.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete task');
    }
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleCreateTaskOpen = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  // Group tasks by column
  const tasksTodo = tasks.filter(t => t.status === 'todo');
  const tasksInProgress = tasks.filter(t => t.status === 'in_progress');
  const tasksDone = tasks.filter(t => t.status === 'done');

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'low': return 'badge badge-low';
      case 'high': return 'badge badge-high';
      default: return 'badge badge-medium';
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading tasks board...</div>;

  return (
    <div className="animate-fade-in">
      {liveAlert && (
        <div className="toast info">
          {liveAlert}
        </div>
      )}

      <div className="content-header">
        <div>
          <h1>Kanban Task Board</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Drag cards to update task status in real time</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateTaskOpen} disabled={projects.length === 0}>
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="filter-bar">
        {/* Search */}
        <div className="form-group" style={{ margin: 0, flexGrow: 1, minWidth: '200px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Project Selection */}
        <div className="filter-group">
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-control"
            style={{ width: '180px', padding: '0.5rem 0.75rem' }}
            value={selectedProject}
            onChange={(e) => { setSelectedProject(e.target.value); setPage(1); }}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Priority Selection */}
        <div className="filter-group">
          <select
            className="form-control"
            style={{ width: '140px', padding: '0.5rem 0.75rem' }}
            value={selectedPriority}
            onChange={(e) => { setSelectedPriority(e.target.value); setPage(1); }}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {/* Sorting Selection */}
        <div className="filter-group">
          <ArrowUpDown size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-control"
            style={{ width: '150px', padding: '0.5rem 0.75rem' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="createdAt">Date Created</option>
            <option value="dueDate">Due Date</option>
            <option value="title">Alphabetical</option>
            <option value="priority">Priority</option>
          </select>
          <select
            className="form-control"
            style={{ width: '100px', padding: '0.5rem 0.75rem' }}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>
        </div>
      </div>

      {projects.length === 0 && (
        <div className="card text-center" style={{ padding: '3rem' }}>
          <h3>No projects workspaces configured</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Please create at least one project under the Projects tab before creating tasks.
          </p>
        </div>
      )}

      {/* Kanban Board Grid */}
      {projects.length > 0 && (
        <div className="kanban-board">
          {/* Column: To Do */}
          <div
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'todo')}
          >
            <div className="kanban-column-header">
              <span className="kanban-column-title">
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#94a3b8' }}></div>
                To Do
              </span>
              <span className="kanban-column-count">{tasksTodo.length}</span>
            </div>
            
            <div className="kanban-tasks-list">
              {tasksTodo.map(t => (
                <TaskCard key={t.id} task={t} onEdit={handleEditTask} onDelete={handleDeleteTask} onDragStart={handleDragStart} getPriorityBadgeClass={getPriorityBadgeClass} />
              ))}
            </div>
          </div>

          {/* Column: In Progress */}
          <div
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'in_progress')}
          >
            <div className="kanban-column-header">
              <span className="kanban-column-title">
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#4f46e5' }}></div>
                In Progress
              </span>
              <span className="kanban-column-count">{tasksInProgress.length}</span>
            </div>

            <div className="kanban-tasks-list">
              {tasksInProgress.map(t => (
                <TaskCard key={t.id} task={t} onEdit={handleEditTask} onDelete={handleDeleteTask} onDragStart={handleDragStart} getPriorityBadgeClass={getPriorityBadgeClass} />
              ))}
            </div>
          </div>

          {/* Column: Completed */}
          <div
            className="kanban-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'done')}
          >
            <div className="kanban-column-header">
              <span className="kanban-column-title">
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                Completed
              </span>
              <span className="kanban-column-count">{tasksDone.length}</span>
            </div>

            <div className="kanban-tasks-list">
              {tasksDone.map(t => (
                <TaskCard key={t.id} task={t} onEdit={handleEditTask} onDelete={handleDeleteTask} onDragStart={handleDragStart} getPriorityBadgeClass={getPriorityBadgeClass} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pagination controls for list view if necessary */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        projects={projects}
        members={members}
        onSave={fetchTasks}
      />
    </div>
  );
};

// Sub-Component: TaskCard
interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  getPriorityBadgeClass: (priority: string) => string;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onDragStart, getPriorityBadgeClass }) => {
  return (
    <div
      className="task-card"
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {task.project.name}
        </span>
        <div className="flex gap-1">
          <button
            className="theme-toggle-btn"
            style={{ width: '24px', height: '24px', fontSize: '0.75rem' }}
            onClick={() => onEdit(task)}
          >
            <Edit3 size={12} />
          </button>
          <button
            className="theme-toggle-btn"
            style={{ width: '24px', height: '24px', fontSize: '0.75rem', color: 'var(--danger)' }}
            onClick={() => onDelete(task.id)}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      <div className="task-title">{task.title}</div>
      {task.description && <div className="task-desc">{task.description}</div>}

      <div className="task-badges">
        <span className={getPriorityBadgeClass(task.priority)}>{task.priority.toUpperCase()}</span>
        {task.attachmentUrl && (
          <a
            href={`http://localhost:5000${task.attachmentUrl}`}
            target="_blank"
            rel="noreferrer"
            className="badge badge-low"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            <Paperclip size={10} /> ATTACHMENT
          </a>
        )}
      </div>

      <div className="task-meta">
        <div className="task-assignee">
          <div className="avatar-initials">
            {task.assignedTo ? task.assignedTo.name.substring(0, 2).toUpperCase() : '?'}
          </div>
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80px' }}>
            {task.assignedTo ? task.assignedTo.name : 'Unassigned'}
          </span>
        </div>

        {task.dueDate && (
          <span className="flex items-center gap-2">
            <Calendar size={10} />
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
};
