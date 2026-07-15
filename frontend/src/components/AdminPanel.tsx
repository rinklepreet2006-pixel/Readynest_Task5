import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, History, Plus, Mail, Key, CreditCard, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user: { name: string; email: string } | null;
}

export const AdminPanel: React.FC = () => {
  const { apiFetch, user, updateSubscriptionState } = useAuth();
  
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'billing' | 'audit'>('members');

  // Members state
  const [members, setMembers] = useState<Member[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Billing state
  const [subscription, setSubscription] = useState(user?.tenantSubscription || 'free');

  // Audit Logs state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchLog, setSearchLog] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const data = await apiFetch('/auth/members');
      setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const queryParams = new URLSearchParams({
        search: searchLog,
        page: page.toString(),
        limit: '15'
      });
      const data = await apiFetch(`/audit/logs?${queryParams.toString()}`);
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'members') fetchMembers();
    if (activeSubTab === 'audit') fetchLogs();
  }, [activeSubTab, searchLog, page]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail || !invitePassword) return;

    try {
      const result = await apiFetch('/auth/create-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          password: invitePassword,
          role: inviteRole,
        }),
      });
      alert(result.message || 'Member created successfully!');
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('');
      setInviteRole('member');
      setShowInviteForm(false);
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Failed to add user');
    }
  };

  const handlePlanChange = async (plan: string) => {
    if (plan === subscription) return;
    try {
      const data = await apiFetch('/auth/subscription', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: plan }),
      });
      setSubscription(plan);
      updateSubscriptionState(plan);
      alert(data.message || `Subscribed to ${plan} plan!`);
    } catch (err: any) {
      alert(err.message || 'Plan update failed');
    }
  };

  if (user?.role !== 'tenant_admin') {
    return (
      <div className="card text-center" style={{ padding: '4rem 2rem' }}>
        <Shield size={48} style={{ color: 'var(--danger)', margin: '0 auto 1rem auto' }} />
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          You do not have administration permissions for this tenant.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="content-header">
        <div>
          <h1>Tenant Administration</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Manage members, subscription packages, and view audit history logs</p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 mb-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeSubTab === 'members' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('members')}
        >
          <Users size={16} /> Team Members
        </button>
        <button
          className={`btn ${activeSubTab === 'billing' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('billing')}
        >
          <CreditCard size={16} /> Billing Plans
        </button>
        <button
          className={`btn ${activeSubTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('audit')}
        >
          <History size={16} /> Activity Audit Logs
        </button>
      </div>

      {/* Sub-Tab Content: Members */}
      {activeSubTab === 'members' && (
        <div className="card animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h3>Active Organization Members ({members.length})</h3>
            {!showInviteForm && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowInviteForm(true)}>
                <Plus size={14} /> Add Team Member
              </button>
            )}
          </div>

          {showInviteForm && (
            <div className="card mb-4" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div style={{ display: 'flex', justifySelf: 'flex-start', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1rem' }}>
                <h4>Invite New User</h4>
                <button className="theme-toggle-btn" style={{ height: '30px', width: '30px' }} onClick={() => setShowInviteForm(false)}>×</button>
              </div>
              <form onSubmit={handleInviteUser}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Jane Doe"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={14} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                      <input
                        type="email"
                        className="form-control"
                        style={{ paddingLeft: '2.5rem' }}
                        placeholder="jane@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Initial Password</label>
                    <div style={{ position: 'relative' }}>
                      <Key size={14} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                      <input
                        type="password"
                        className="form-control"
                        style={{ paddingLeft: '2.5rem' }}
                        placeholder="••••••••"
                        value={invitePassword}
                        onChange={(e) => setInvitePassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">System Role</label>
                    <select
                      className="form-control"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      <option value="member">Tenant Member (CRUD permissions)</option>
                      <option value="tenant_admin">Tenant Administrator (Full permissions)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowInviteForm(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm">Add Member</button>
                </div>
              </form>
            </div>
          )}

          {loadingMembers ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Fetching users...</div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Date Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td>{m.email}</td>
                      <td>
                        <span className={`badge ${m.role === 'tenant_admin' ? 'badge-high' : 'badge-low'}`}>
                          {m.role === 'tenant_admin' ? 'ADMIN' : 'MEMBER'}
                        </span>
                      </td>
                      <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab Content: Billing */}
      {activeSubTab === 'billing' && (
        <div className="card animate-fade-in">
          <h3>Organization Subscription Packages</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Scale your limits and activate additional workspace functions.
          </p>

          <div className="pricing-grid">
            {/* Tier Free */}
            <div className={`price-card ${subscription === 'free' ? 'active' : ''}`}>
              <div className="price-tier">Free Tier</div>
              <div className="price-amount">$0</div>
              <ul className="price-features">
                <li>Up to 3 Active Projects</li>
                <li>Standard SQLite Database</li>
                <li>100 Tasks Maximum</li>
                <li>Normal WebSocket Sync</li>
              </ul>
              <button
                className={`btn w-full btn-sm ${subscription === 'free' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handlePlanChange('free')}
                disabled={subscription === 'free'}
              >
                {subscription === 'free' ? <span className="flex items-center justify-center gap-1"><Check size={12} /> Active</span> : 'Select Free'}
              </button>
            </div>

            {/* Tier Premium */}
            <div className={`price-card ${subscription === 'premium' ? 'active' : ''}`}>
              <div className="price-tier">Premium Plan</div>
              <div className="price-amount">$49<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/mo</span></div>
              <ul className="price-features">
                <li>Unlimited Projects</li>
                <li>Prisma Schema Syncing</li>
                <li>File Attachments (Up to 5MB)</li>
                <li>Real-Time Kanban Refresh</li>
                <li>Detailed Audit Trails</li>
              </ul>
              <button
                className={`btn w-full btn-sm ${subscription === 'premium' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handlePlanChange('premium')}
                disabled={subscription === 'premium'}
              >
                {subscription === 'premium' ? <span className="flex items-center justify-center gap-1"><Check size={12} /> Active</span> : 'Select Premium'}
              </button>
            </div>

            {/* Tier Enterprise */}
            <div className={`price-card ${subscription === 'enterprise' ? 'active' : ''}`}>
              <div className="price-tier">Enterprise Suite</div>
              <div className="price-amount">$249<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/mo</span></div>
              <ul className="price-features">
                <li>Everything in Premium</li>
                <li>Custom Domains Routing</li>
                <li>SLA 99.9% Guarantee</li>
                <li>Dedicated Storage Hooks</li>
                <li>Custom Billing Logs</li>
              </ul>
              <button
                className={`btn w-full btn-sm ${subscription === 'enterprise' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handlePlanChange('enterprise')}
                disabled={subscription === 'enterprise'}
              >
                {subscription === 'enterprise' ? <span className="flex items-center justify-center gap-1"><Check size={12} /> Active</span> : 'Select Enterprise'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab Content: Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="card animate-fade-in">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
            <h3>Tenant Actions Audit Trail</h3>
            
            {/* Search filter for logs */}
            <div className="form-group" style={{ margin: 0, width: '260px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-control"
                  style={{ padding: '0.45rem 0.75rem 0.45rem 2rem', fontSize: '0.85rem' }}
                  placeholder="Filter logs by keyword..."
                  value={searchLog}
                  onChange={(e) => { setSearchLog(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </div>

          {loadingLogs ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Querying audit database...</div>
          ) : (
            <div>
              <div className="data-table-container">
                <table className="data-table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Detail Narrative</th>
                      <th>Performed By</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          No audit logs found.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 700, color: log.action.includes('deleted') ? 'var(--danger)' : 'var(--primary)' }}>
                            {log.action.replace('_', ' ').toUpperCase()}
                          </td>
                          <td>{log.details}</td>
                          <td>{log.user ? `${log.user.name} (${log.user.email})` : 'System / Admin'}</td>
                          <td>{new Date(log.createdAt).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
