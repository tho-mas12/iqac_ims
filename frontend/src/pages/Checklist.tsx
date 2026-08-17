import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  Square, 
  Calendar, 
  User, 
  FolderCheck,
  Edit2,
  Check,
  X,
  FileDown,
  ArrowLeft,
  Award
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Question {
  id: number;
  text: string;
  status?: {
    is_checked: boolean;
    ticked_at?: string;
    is_manual_time: boolean;
    updated_by_user_id?: number;
    user?: {
      username: string;
    };
  };
}

interface Title {
  id: number;
  name: string;
  description?: string;
  total_questions: number;
  completed_questions: number;
}

const Checklist: React.FC = () => {
  const [titles, setTitles] = useState<Title[]>([]);
  const [activeTitle, setActiveTitle] = useState<Title | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Time overrides state
  const [editingStatusId, setEditingStatusId] = useState<number | null>(null);
  const [manualDateTime, setManualDateTime] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetchTitles();
  }, []);

  const fetchTitles = async (selectId?: number) => {
    try {
      const res = await api.get('/titles');
      setTitles(res.data);
      if (selectId) {
        const updatedTitle = res.data.find((t: Title) => t.id === selectId);
        if (updatedTitle) {
          setActiveTitle(updatedTitle);
          fetchChecklistForTitle(selectId);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load checklist categories.');
    } finally {
      setLoading(false);
    }
  };

  const fetchChecklistForTitle = async (titleId: number) => {
    try {
      const res = await api.get(`/titles/${titleId}`);
      setQuestions(res.data.questions);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load title questions checklist.');
    }
  };

  const handleOpenChecklistOverlay = (title: Title) => {
    setActiveTitle(title);
    fetchChecklistForTitle(title.id);
  };

  const handleCloseChecklistOverlay = () => {
    setActiveTitle(null);
    setQuestions([]);
    // Refresh titles stats
    fetchTitles();
  };

  // Toggle tick box status
  const handleToggleCheck = async (questionId: number, isChecked: boolean) => {
    try {
      const localCurrentTime = new Date().toISOString();
      const payload = {
        is_checked: isChecked,
        ticked_at: isChecked ? localCurrentTime : null,
        is_manual_time: false
      };

      await api.put(`/questions/${questionId}/toggle`, payload);
      toast.success(isChecked ? 'Question marked as completed!' : 'Status reset.');
      
      const username = localStorage.getItem('username') || 'You';
      setQuestions(questions.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            status: {
              is_checked: isChecked,
              ticked_at: isChecked ? localCurrentTime : undefined,
              is_manual_time: false,
              user: isChecked ? { username } : undefined
            }
          };
        }
        return q;
      }));

      // Update active title score
      if (activeTitle) {
        const delta = isChecked ? 1 : -1;
        const updatedScore = Math.max(0, activeTitle.completed_questions + delta);
        setActiveTitle({
          ...activeTitle,
          completed_questions: updatedScore
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update question checklist status.');
    }
  };

  // Start Manual DateTime override
  const handleStartManualEdit = (questionId: number, currentTickedAt?: string) => {
    setEditingStatusId(questionId);
    if (currentTickedAt) {
      const date = new Date(currentTickedAt);
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
      setManualDateTime(localISOTime);
    } else {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
      setManualDateTime(localISOTime);
    }
  };

  const handleSaveManualDateTime = async (questionId: number) => {
    if (!manualDateTime) {
      toast.error('Please specify a date and time.');
      return;
    }

    try {
      const parsedDate = new Date(manualDateTime).toISOString();
      const payload = {
        is_checked: true,
        ticked_at: parsedDate,
        is_manual_time: true
      };

      await api.put(`/questions/${questionId}/toggle`, payload);
      toast.success('Timestamp updated manually!');
      
      setQuestions(questions.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            status: {
              ...(q.status || { is_checked: true }),
              is_checked: true,
              ticked_at: parsedDate,
              is_manual_time: true
            }
          };
        }
        return q;
      }));
      setEditingStatusId(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to override manual timestamp.');
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

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <h3 className="text-xl font-bold text-slate-800">Checklist Monitoring Audit</h3>
        <p className="text-sm text-slate-500 mt-1">Select any checklist category card to review questions and register manual ticks.</p>
      </div>

      {/* Grid of Title Cards */}
      {loading && titles.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-44 bg-white rounded-3xl animate-pulse border border-slate-100 p-6 space-y-4">
              <div className="h-5 w-2/3 bg-slate-100 rounded"></div>
              <div className="h-4 w-full bg-slate-50 rounded"></div>
              <div className="h-4 w-1/3 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : titles.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-slate-100 text-slate-400 text-sm max-w-lg mx-auto flex flex-col items-center">
          <FolderCheck className="h-12 w-12 text-slate-200 mb-3" />
          <h4 className="font-bold text-slate-700">No checklists created yet</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">Please create a Title and add checklist questions under the "Titles & Questions" configurations tab first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {titles.map((title) => {
            const scoreText = `${title.completed_questions}/${title.total_questions}`;
            const pct = title.total_questions > 0 ? (title.completed_questions / title.total_questions) * 100 : 0;
            const isCompliant = pct === 100;
            
            return (
              <motion.div
                key={title.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
                onClick={() => handleOpenChecklistOverlay(title)}
                className="bg-white rounded-3xl border border-slate-100 hover:border-indigo-100 shadow-xs hover:shadow-md p-6 flex flex-col justify-between cursor-pointer group transition-all duration-300 relative overflow-hidden"
              >
                {isCompliant && (
                  <div className="absolute top-0 right-0 p-3 text-emerald-500 opacity-20">
                    <Award className="h-16 w-16" />
                  </div>
                )}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-200 to-slate-200 group-hover:from-indigo-500 group-hover:to-indigo-600 transition-all duration-500" />

                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isCompliant ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                    }`}>
                      {scoreText} Completed
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {Math.round(pct)}% Done
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-800 text-sm tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">
                    {title.name}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-3 min-h-[3rem]">
                    {title.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        isCompliant ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`} 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-indigo-600 pt-1">
                    <span>Fill Checklist</span>
                    <ArrowLeft className="h-4 w-4 rotate-180 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* --- DETAIL CHECKLIST OVERLAY MODAL SHEET --- */}
      <AnimatePresence>
        {activeTitle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900"
              onClick={handleCloseChecklistOverlay}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.4 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={handleCloseChecklistOverlay}
                    className="flex items-center text-[10px] font-bold text-slate-400 hover:text-slate-600 mb-2 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Return to categories
                  </button>
                  <h3 className="text-base font-bold text-slate-800 truncate tracking-tight">{activeTitle.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{activeTitle.description || 'No description added to this monitoring title.'}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleDownload(`/reports/title/${activeTitle.id}/pdf`, `${activeTitle.name.toLowerCase().replace(/\s+/g, '_')}_report.pdf`, `pdf-${activeTitle.id}`)}
                    disabled={downloading !== null}
                    className="flex items-center px-3 py-2 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1 text-slate-400" />
                    PDF
                  </button>
                  <button
                    onClick={() => handleDownload(`/reports/title/${activeTitle.id}/excel`, `${activeTitle.name.toLowerCase().replace(/\s+/g, '_')}_report.xlsx`, `excel-${activeTitle.id}`)}
                    disabled={downloading !== null}
                    className="flex items-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1 text-indigo-200" />
                    Excel
                  </button>
                </div>
              </div>

              {/* Progress Tracker */}
              <div className="px-6 py-4 border-b border-slate-50 bg-indigo-50/10 flex justify-between items-center gap-4">
                <div className="flex-1">
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(activeTitle.completed_questions / activeTitle.total_questions) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-700 px-3 py-1 bg-indigo-50 rounded-lg flex-shrink-0">
                  Completed: {activeTitle.completed_questions} / {activeTitle.total_questions}
                </span>
              </div>

              {/* Scrollable Checklist */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3.5 custom-scrollbar">
                {questions.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">No check metric questions recorded under this title.</div>
                ) : (
                  questions.map((q) => {
                    const isChecked = q.status?.is_checked || false;
                    const tickedAt = q.status?.ticked_at;
                    const isManual = q.status?.is_manual_time || false;
                    const userStaff = q.status?.user?.username || 'System';
                    const isEditingTime = editingStatusId === q.id;

                    return (
                      <div
                        key={q.id}
                        className={`p-4 rounded-2xl border transition-all duration-300 ${
                          isChecked 
                            ? 'bg-slate-50/60 border-indigo-100 shadow-3xs' 
                            : 'bg-white border-slate-100'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <button
                            onClick={() => handleToggleCheck(q.id, !isChecked)}
                            className="mt-0.5 text-indigo-600 hover:text-indigo-700 cursor-pointer select-none flex-shrink-0"
                          >
                            {isChecked ? (
                              <CheckSquare className="h-5 w-5 text-indigo-600 fill-indigo-50/30" />
                            ) : (
                              <Square className="h-5 w-5 text-slate-300 hover:text-slate-400" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold leading-relaxed break-words ${isChecked ? 'text-slate-400 line-through font-medium' : 'text-slate-700'}`}>
                              {q.text}
                            </p>

                            {isChecked && (
                              <div className="mt-3 flex flex-wrap items-center gap-y-2 gap-x-4 text-[10px] text-slate-400 font-medium">
                                {isEditingTime ? (
                                  <div className="flex items-center gap-1 bg-white p-1 border border-slate-200 rounded-lg">
                                    <input
                                      type="datetime-local"
                                      value={manualDateTime}
                                      onChange={(e) => setManualDateTime(e.target.value)}
                                      className="px-2 py-0.5 text-[9px] focus:outline-hidden text-slate-700"
                                    />
                                    <button
                                      onClick={() => handleSaveManualDateTime(q.id)}
                                      className="p-1 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md cursor-pointer"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => setEditingStatusId(null)}
                                      className="p-1 bg-slate-50 text-slate-400 hover:bg-slate-100 rounded-md cursor-pointer"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 text-slate-300" />
                                    <span>
                                      {tickedAt 
                                        ? new Date(tickedAt).toLocaleString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                          }) 
                                        : '-'
                                      }
                                      {isManual ? ' (Manual)' : ' (Auto)'}
                                    </span>
                                    <button
                                      onClick={() => handleStartManualEdit(q.id, tickedAt)}
                                      className="ml-1 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-indigo-600 rounded-md transition-all cursor-pointer flex items-center"
                                    >
                                      Edit Time
                                    </button>
                                  </div>
                                )}

                                <div className="flex items-center gap-1">
                                  <User className="h-3.5 w-3.5 text-slate-300" />
                                  <span>Checked: <b className="text-slate-500">{userStaff}</b></span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={handleCloseChecklistOverlay}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Close Checklist
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Checklist;
