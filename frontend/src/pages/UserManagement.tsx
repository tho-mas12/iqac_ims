import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Key, 
  Edit3, 
  Check, 
  X, 
  ShieldAlert, 
  UserCheck, 
  Building
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface User {
  id: number;
  username: string;
  role: string; // Admin, Staff, Office
  created_at: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUsername = localStorage.getItem('username') || '';

  // Create User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Staff');

  // Edit User Form State
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load registered users database.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      toast.error('Both username and password are required.');
      return;
    }

    try {
      const payload = {
        username: newUsername.trim(),
        password: newPassword.trim(),
        role: newRole
      };
      await api.post('/users', payload);
      toast.success(`User '${newUsername}' registered successfully!`);
      
      // Reset form
      setNewUsername('');
      setNewPassword('');
      setNewRole('Staff');
      
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'Failed to create user.';
      toast.error(errMsg);
    }
  };

  const handleStartEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditPassword('');
    setEditRole(user.role);
  };

  const handleSaveUser = async (userId: number) => {
    try {
      const payload: any = { role: editRole };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }
      
      await api.put(`/users/${userId}`, payload);
      toast.success('User access details updated!');
      setEditingUserId(null);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.detail || 'Failed to update user details.';
      toast.error(errMsg);
    }
  };

  const handleDeleteUser = async (userId: number, targetUsername: string) => {
    if (targetUsername === 'admin') {
      toast.error('Cannot delete the default administrator account.');
      return;
    }
    if (targetUsername === currentUsername) {
      toast.error('Cannot delete your own active login session account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user '${targetUsername}'? This user will lose all portal access.`)) {
      return;
    }

    try {
      await api.delete(`/users/${userId}`);
      toast.success(`User '${targetUsername}' deleted.`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete user.');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin':
        return <ShieldAlert className="h-4 w-4 text-rose-500" />;
      case 'Office':
        return <Building className="h-4 w-4 text-amber-500" />;
      default:
        return <UserCheck className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Create User Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
          <div>
            <h4 className="text-base font-bold text-slate-800 flex items-center">
              <UserPlus className="h-5 w-5 mr-2 text-indigo-600" />
              Register User Account
            </h4>
            <p className="text-xs text-slate-400 mt-1 font-medium">Create credentials for staff or office personnel.</p>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Username / User ID</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Portal Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
              >
                <option value="Staff">Staff (View checklists/mails, tick items)</option>
                <option value="Office">Office Admin (View checklists/mails, tick mail replies)</option>
                <option value="Admin">System Administrator (Full access + User control)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center"
            >
              <UserPlus className="h-4 w-4 mr-1.5" /> Provision User
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Users List */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-slate-800 flex items-center">
                <Users className="h-5 w-5 mr-2 text-indigo-600" />
                Portal Users Registry
              </h4>
              <p className="text-xs text-slate-400 mt-1 font-medium">Manage access credentials and role assignments.</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full">
              Total: {users.length}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-16 bg-slate-50 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full border-collapse text-left text-xs text-slate-500">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Username</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Created On</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((user) => {
                    const isEditing = editingUserId === user.id;
                    const isSelf = user.username === currentUsername;
                    const isSystemAdmin = user.username === 'admin';
                    
                    return (
                      <tr 
                        key={user.id} 
                        className={`hover:bg-slate-50/30 transition-colors ${isEditing ? 'bg-indigo-50/10' : ''}`}
                      >
                        {/* Username */}
                        <td className="px-5 py-4 font-bold text-slate-700">
                          <div className="flex items-center gap-2">
                            <span>{user.username}</span>
                            {isSelf && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <select
                              value={editRole}
                              onChange={(e) => setEditRole(e.target.value)}
                              disabled={isSystemAdmin}
                              className="px-2 py-1 rounded border border-slate-200 text-xs focus:outline-hidden"
                            >
                              <option value="Staff">Staff</option>
                              <option value="Office">Office</option>
                              <option value="Admin">Admin</option>
                            </select>
                          ) : (
                            <span className="flex items-center gap-1.5 font-semibold">
                              {getRoleIcon(user.role)}
                              <span>{user.role}</span>
                            </span>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="px-5 py-4 text-slate-400 font-semibold">
                          {new Date(user.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          {isEditing ? (
                            <div className="flex justify-end items-center gap-2">
                              {/* Inline password input */}
                              <div className="relative mr-2 flex items-center">
                                <Key className="absolute left-2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                  type="password"
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  className="pl-8 pr-2 py-1 rounded border border-slate-200 text-xs w-40 focus:outline-hidden"
                                />
                              </div>

                              <button
                                onClick={() => handleSaveUser(user.id)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() => handleStartEdit(user)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.username)}
                                disabled={isSystemAdmin || isSelf}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
