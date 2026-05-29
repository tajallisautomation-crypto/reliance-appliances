'use client'

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, UserPlus, UserX, UserCheck, ShieldAlert } from 'lucide-react';
import type { StaffMember, StaffRole } from '@/store/adminAuthStore';

interface StaffRow extends StaffMember {
  is_active: boolean;
  created_at: string;
}

const ROLES: StaffRole[] = ['owner', 'admin', 'sales', 'finance', 'service', 'reports'];

const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  owner:   'Full access + team management',
  admin:   'Full product & order access',
  sales:   'Leads, orders, quotations',
  finance: 'Invoices, installments',
  service: 'Service requests, customers',
  reports: 'Read-only BI reports',
};

const ROLE_COLOR: Record<StaffRole, string> = {
  owner:   'bg-purple-100 text-purple-700',
  admin:   'bg-blue-100 text-blue-700',
  sales:   'bg-green-100 text-green-700',
  finance: 'bg-yellow-100 text-yellow-700',
  service: 'bg-orange-100 text-orange-700',
  reports: 'bg-gray-100 text-gray-600',
};

interface Props {
  currentStaff: StaffMember | null;
}

export default function StaffMembersTab({ currentStaff }: Props) {
  const isOwner = currentStaff?.role === 'owner';

  const [members, setMembers] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState<StaffRole>('admin');
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState('');
  const [addOk, setAddOk] = useState('');

  // Inline editing
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr('');
    const { data, error } = await supabase
      .from('staff_members')
      .select('id, email, name, role, is_active, created_at')
      .order('created_at');
    if (error) setErr(error.message);
    else setMembers((data ?? []) as StaffRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true); setAddErr(''); setAddOk('');
    const { data, error } = await supabase.rpc('upsert_staff_by_email', {
      p_email: addEmail.trim().toLowerCase(),
      p_name:  addName.trim(),
      p_role:  addRole,
    });
    if (error) { setAddErr(error.message); }
    else {
      setAddOk(`${addName || addEmail} added as ${addRole}.`);
      setAddEmail(''); setAddName(''); setAddRole('admin');
      await load();
    }
    setAdding(false);
  }

  async function updateRole(member: StaffRow, newRole: StaffRole) {
    setSavingId(member.id);
    const { error } = await supabase
      .from('staff_members')
      .update({ role: newRole })
      .eq('id', member.id);
    if (error) setErr(error.message);
    else setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: newRole } : m));
    setSavingId(null);
  }

  async function toggleActive(member: StaffRow) {
    if (member.id === currentStaff?.id) return; // can't deactivate yourself
    setSavingId(member.id);
    const { error } = await supabase
      .from('staff_members')
      .update({ is_active: !member.is_active })
      .eq('id', member.id);
    if (error) setErr(error.message);
    else setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: !m.is_active } : m));
    setSavingId(null);
  }

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <ShieldAlert className="w-10 h-10 text-gray-300" />
        <p className="text-gray-500 font-medium">Owner access required</p>
        <p className="text-sm text-gray-400">Only the owner can manage team members.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Team Members</h2>
          <p className="text-sm text-gray-500 mt-0.5">Staff who can access the admin portal</p>
        </div>
        <button onClick={() => { setShowAdd(v => !v); setAddErr(''); setAddOk(''); }}
          className="flex items-center gap-2 px-3 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
          <UserPlus className="w-4 h-4" />
          Add member
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Add or restore a staff member</p>
          <p className="text-xs text-gray-500">The person must have already created a Supabase auth account (visited the login page at least once).</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input required type="email" placeholder="Email address" value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            <input required type="text" placeholder="Display name" value={addName}
              onChange={e => setAddName(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400" />
            <select value={addRole} onChange={e => setAddRole(e.target.value as StaffRole)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white">
              {ROLES.map(r => <option key={r} value={r}>{r} — {ROLE_DESCRIPTIONS[r]}</option>)}
            </select>
          </div>
          {addErr && <p className="text-sm text-red-600">{addErr}</p>}
          {addOk  && <p className="text-sm text-green-600">{addOk}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={adding}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {adding ? 'Adding…' : 'Add member'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)}
              className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(m => {
                const isSelf = m.id === currentStaff?.id;
                const saving = savingId === m.id;
                return (
                  <tr key={m.id} className={`${!m.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {m.name || '—'}
                      {isSelf && <span className="ml-2 text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-wide">you</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.email}</td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLOR[m.role]}`}>
                          {m.role}
                        </span>
                      ) : (
                        <select value={m.role} disabled={saving || !m.is_active}
                          onChange={e => updateRole(m, e.target.value as StaffRole)}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-brand-400 cursor-pointer ${ROLE_COLOR[m.role]} bg-transparent disabled:cursor-default`}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(m.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      {!isSelf && (
                        <button onClick={() => toggleActive(m)} disabled={saving}
                          title={m.is_active ? 'Deactivate' : 'Reactivate'}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors">
                          {saving
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : m.is_active
                            ? <><UserX className="w-3.5 h-3.5 text-red-400" /> Deactivate</>
                            : <><UserCheck className="w-3.5 h-3.5 text-green-500" /> Reactivate</>}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 text-sm">No staff members yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Role reference */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Role permissions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ROLES.map(r => (
            <div key={r} className="bg-white border border-gray-100 rounded-lg px-3 py-2">
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-1 ${ROLE_COLOR[r]}`}>{r}</span>
              <p className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[r]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
