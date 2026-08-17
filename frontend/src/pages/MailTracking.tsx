import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Send, 
  Paperclip, 
  Calendar, 
  CheckCircle, 
  Hourglass, 
  Trash2, 
  Download, 
  ExternalLink,
  Edit3,
  Check,
  X,
  FileDown,
  Plus,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface MailQuery {
  id: number;
  subject: string;
  sender_staff: string;
  sent_at: string;
  is_answered: boolean;
  answered_at?: string;
  is_manual_sent_time: boolean;
  is_manual_answered_time: boolean;
  attachment_path?: string;
}

const MailTracking: React.FC = () => {
  const [mails, setMails] = useState<MailQuery[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawer / Popup states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('add');
  const [activeMail, setActiveMail] = useState<MailQuery | null>(null);

  // Form Fields State
  const [subject, setSubject] = useState('');
  const [senderStaff, setSenderStaff] = useState('');
  const [isManualSentTime, setIsManualSentTime] = useState(false);
  const [manualSentDateTime, setManualSentDateTime] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Answer state when editing
  const [isAnswered, setIsAnswered] = useState(false);
  const [isManualAnsweredTime, setIsManualAnsweredTime] = useState(false);
  const [manualAnsweredDateTime, setManualAnsweredDateTime] = useState('');

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchMails();
  }, []);

  const fetchMails = async () => {
    try {
      const res = await api.get('/mails');
      setMails(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve mail registry logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDrawer = () => {
    setDrawerMode('add');
    setSubject('');
    setSenderStaff('');
    setIsManualSentTime(false);
    setManualSentDateTime('');
    setFile(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (mail: MailQuery) => {
    setDrawerMode('edit');
    setActiveMail(mail);
    setSubject(mail.subject);
    setSenderStaff(mail.sender_staff);
    setIsManualSentTime(mail.is_manual_sent_time);
    
    const sentDate = new Date(mail.sent_at);
    const sentOffset = sentDate.getTimezoneOffset() * 60000;
    const sentISO = (new Date(sentDate.getTime() - sentOffset)).toISOString().slice(0, 16);
    setManualSentDateTime(sentISO);

    setIsAnswered(mail.is_answered);
    setIsManualAnsweredTime(mail.is_manual_answered_time);
    
    if (mail.answered_at) {
      const ansDate = new Date(mail.answered_at);
      const ansOffset = ansDate.getTimezoneOffset() * 60000;
      const ansISO = (new Date(ansDate.getTime() - ansOffset)).toISOString().slice(0, 16);
      setManualAnsweredDateTime(ansISO);
    } else {
      setManualAnsweredDateTime('');
    }
    
    setFile(null);
    setIsDrawerOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleCreateMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !senderStaff.trim()) {
      toast.error('Subject and Sender Staff are required.');
      return;
    }

    setSubmitting(true);
    try {
      let sentTimestamp = new Date().toISOString();
      if (isManualSentTime) {
        if (!manualSentDateTime) {
          toast.error('Please specify the manual sent date and time.');
          setSubmitting(false);
          return;
        }
        sentTimestamp = new Date(manualSentDateTime).toISOString();
      }

      const formData = new FormData();
      formData.append('subject', subject.trim());
      formData.append('sender_staff', senderStaff.trim());
      formData.append('sent_at', sentTimestamp);
      formData.append('is_manual_sent_time', String(isManualSentTime));
      if (file) {
        formData.append('file', file);
      }

      await api.post('/mails', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Outbound query mail registered successfully!');
      setIsDrawerOpen(false);
      fetchMails();
    } catch (err) {
      console.error(err);
      toast.error('Failed to register mail query.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMail) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('is_answered', String(isAnswered));
      formData.append('is_manual_answered_time', String(isManualAnsweredTime));
      
      if (isAnswered) {
        const ansTime = isManualAnsweredTime && manualAnsweredDateTime
          ? new Date(manualAnsweredDateTime).toISOString()
          : new Date().toISOString();
        formData.append('answered_at', ansTime);
      }

      await api.put(`/mails/${activeMail.id}/toggle`, formData);
      toast.success('Mail registry logs modified successfully!');
      setIsDrawerOpen(false);
      fetchMails();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save registry updates.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Answer Status directly (from Mark Received button in table)
  const handleToggleAnswerDirect = async (mailId: number, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus;
      const timestamp = nextStatus ? new Date().toISOString() : null;

      const formData = new FormData();
      formData.append('is_answered', String(nextStatus));
      if (timestamp) {
        formData.append('answered_at', timestamp);
      }
      formData.append('is_manual_answered_time', 'false');

      const res = await api.put(`/mails/${mailId}/toggle`, formData);
      toast.success(nextStatus ? 'Query marked as Received!' : 'Status reset to pending.');
      
      setMails(mails.map(m => m.id === mailId ? res.data : m));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update response status.');
    }
  };

  const handleDeleteTrigger = (id: number) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteMail = async () => {
    if (!deleteTargetId) return;

    try {
      await api.delete(`/mails/${deleteTargetId}`);
      toast.success('Registry entry deleted successfully.');
      setDeleteTargetId(null);
      fetchMails();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete registry entry.');
    }
  };

  const handleDownload = async (url: string, defaultFilename: string, key: string) => {
    setDownloading(key);
    try {
      const response = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Report downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate report.');
    } finally {
      setDownloading(null);
    }
  };

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  return (
    <div className="space-y-6 relative">
      {/* Top action header for downloads & Create */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center">
            <Mail className="h-5 w-5 mr-2 text-teal-600" />
            Outbound Mail Registry
          </h3>
          <p className="text-xs text-slate-500 mt-1">Official queries dispatched and office reply response tracking logs.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDownload('/reports/mails/pdf', 'mail_registry_report.pdf', 'pdf')}
            disabled={downloading !== null}
            className="flex items-center px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl cursor-pointer transition-colors disabled:opacity-50"
          >
            <FileDown className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
            PDF Report
          </button>
          <button
            onClick={() => handleDownload('/reports/mails/excel', 'mail_registry_report.xlsx', 'excel')}
            disabled={downloading !== null}
            className="flex items-center px-3.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-600 font-bold text-xs rounded-xl cursor-pointer transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-teal-400" />
            Excel Report
          </button>
          <div className="h-5 w-[1px] bg-slate-200"></div>
          <button
            onClick={handleOpenAddDrawer}
            className="flex items-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 mr-1.5" /> Register Outbound Mail
          </button>
        </div>
      </div>

      {/* Modern animated table/ledger list */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 min-h-[400px]">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-20 bg-slate-50 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : mails.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs flex flex-col items-center justify-center">
            <Mail className="h-12 w-12 text-slate-200 mb-3" />
            <h5 className="font-bold text-slate-700 text-sm">No Dispatched Mails Found</h5>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mb-5">Click the "Register Outbound Mail" button to record a query waiting for office reply.</p>
            <button
              onClick={handleOpenAddDrawer}
              className="flex items-center px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Start First Log
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 font-sans">
            <table className="w-full border-collapse text-left text-xs text-slate-500">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Subject / Query</th>
                  <th className="px-5 py-3">Sender Staff</th>
                  <th className="px-5 py-3">Dispatched Date</th>
                  <th className="px-5 py-3">Reply Status</th>
                  <th className="px-5 py-3">Answer Date</th>
                  <th className="px-5 py-3">Attachment</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {mails.map((mail) => (
                  <motion.tr 
                    layout
                    key={mail.id}
                    className="hover:bg-slate-50/30 transition-colors"
                  >
                    <td className="px-5 py-4 font-bold text-slate-700 max-w-xs truncate">
                      {mail.subject}
                    </td>

                    <td className="px-5 py-4 text-slate-500 font-semibold">
                      {mail.sender_staff}
                    </td>

                    <td className="px-5 py-4 text-slate-400">
                      {new Date(mail.sent_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                      {mail.is_manual_sent_time && <span className="text-[9px] bg-amber-50 text-amber-600 px-1 py-0.5 rounded ml-1.5">M</span>}
                    </td>

                    {/* Reply Status badge */}
                    <td className="px-5 py-4">
                      {mail.is_answered ? (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center w-max bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <Check className="h-3 w-3 mr-1" /> Answered
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center w-max bg-amber-50 text-amber-700 border border-amber-100">
                          <Hourglass className="h-3 w-3 mr-1 animate-spin" /> Pending
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {mail.is_answered && mail.answered_at ? (
                        <div className="flex flex-col">
                          <span>
                            {new Date(mail.answered_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                          {mail.is_manual_answered_time && <span className="text-[9px] text-amber-500 font-semibold mt-0.5">Manual Timestamp</span>}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {mail.attachment_path ? (
                        <a 
                          href={`${backendUrl.replace(/\/api$/, '')}/${mail.attachment_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                        >
                          <Paperclip className="h-3.5 w-3.5 mr-1" /> View File
                        </a>
                      ) : (
                        <span className="text-slate-300">None</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        {!mail.is_answered && (
                          <button
                            onClick={() => handleToggleAnswerDirect(mail.id, mail.is_answered)}
                            className="flex items-center px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold text-[10px] rounded-lg transition-colors cursor-pointer border border-teal-200/50 mr-1"
                          >
                            <Check className="h-3 w-3 mr-0.5" /> Received
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEditDrawer(mail)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTrigger(mail.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- TOP-RIGHT SLIDING DRAWER POPUP PANEL --- */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900"
              onClick={() => setIsDrawerOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-white h-screen shadow-2xl flex flex-col justify-between z-10"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-800 flex items-center">
                  <Mail className="h-4.5 w-4.5 mr-2 text-teal-600" />
                  {drawerMode === 'add' ? 'Register Outbound Mail' : 'Edit Registry Log'}
                </h4>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form 
                onSubmit={drawerMode === 'add' ? handleCreateMail : handleUpdateMail}
                className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Mail Subject / Query Description</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={drawerMode === 'edit'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-hidden disabled:opacity-75"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 block">Sender Staff Name</label>
                  <input
                    type="text"
                    value={senderStaff}
                    onChange={(e) => setSenderStaff(e.target.value)}
                    disabled={drawerMode === 'edit'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-hidden disabled:opacity-75"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500">Sent Date & Time</label>
                    {drawerMode === 'add' && (
                      <button
                        type="button"
                        onClick={() => setIsManualSentTime(!isManualSentTime)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-colors ${
                          isManualSentTime 
                            ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isManualSentTime ? 'Set Manually' : 'Use Current Time'}
                      </button>
                    )}
                  </div>
                  {(isManualSentTime || drawerMode === 'edit') && (
                    <input
                      type="datetime-local"
                      value={manualSentDateTime}
                      onChange={(e) => setManualSentDateTime(e.target.value)}
                      disabled={drawerMode === 'edit'}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden disabled:opacity-75"
                    />
                  )}
                </div>

                {drawerMode === 'add' && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 block">Attachment File (Optional)</label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-100/50">
                        <div className="flex flex-col items-center justify-center pt-3 pb-3 text-center px-4">
                          <Paperclip className="w-5 h-5 mb-1.5 text-slate-400" />
                          <p className="text-[10px] font-bold text-slate-500">
                            {file ? file.name : 'Select PDF/Word/Excel/Image'}
                          </p>
                        </div>
                        <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} />
                      </label>
                    </div>
                  </div>
                )}

                {/* Edit Mode reply ticking details (Received Button) */}
                {drawerMode === 'edit' && (
                  <div className="p-4 bg-teal-50/45 border border-teal-100/60 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h5 className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Office Reply Details</h5>
                      {isAnswered && (
                        <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                          Answer Logged
                        </span>
                      )}
                    </div>
                    
                    {/* Received Button replaces checkbox */}
                    <div className="flex items-center gap-3">
                      {isAnswered ? (
                        <button
                          type="button"
                          onClick={() => setIsAnswered(false)}
                          className="flex items-center px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                        >
                          <X className="h-4 w-4 mr-1.5" /> Revert to Pending
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsAnswered(true)}
                          className="flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                        >
                          <Check className="h-4 w-4 mr-1.5" /> Received
                        </button>
                      )}
                    </div>

                    {isAnswered && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Answer Date & Time</label>
                          <button
                            type="button"
                            onClick={() => setIsManualAnsweredTime(!isManualAnsweredTime)}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded transition-colors ${
                              isManualAnsweredTime 
                                ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isManualAnsweredTime ? 'Set Manually' : 'Use Current Time'}
                          </button>
                        </div>
                        {isManualAnsweredTime && (
                          <input
                            type="datetime-local"
                            value={manualAnsweredDateTime}
                            onChange={(e) => setManualAnsweredDateTime(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : drawerMode === 'add' ? 'Register Query' : 'Save Updates'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DYNAMIC DELETE CONFIRMATION POPUP MODAL --- */}
      <AnimatePresence>
        {deleteTargetId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900"
              onClick={() => setDeleteTargetId(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Delete Mail Log Registry?</h4>
                <p className="text-xs text-slate-400 mt-1">This action cannot be undone. Associated query records and uploaded files will be deleted.</p>
              </div>
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setDeleteTargetId(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteMail}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-xs"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MailTracking;
