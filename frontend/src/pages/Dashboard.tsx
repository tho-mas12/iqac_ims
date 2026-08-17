import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileDown, 
  CheckCircle2, 
  Layers, 
  Mail, 
  TrendingUp,
  Percent,
  Download,
  Eye,
  X,
  Check,
  AlertCircle,
  Calendar,
  Layers3,
  ArrowLeft
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Title {
  id: number;
  name: string;
  description?: string;
  total_questions: number;
  completed_questions: number;
}

interface MailQuery {
  id: number;
  subject: string;
  sender_staff: string;
  sent_at: string;
  is_answered: boolean;
  answered_at?: string;
}

interface Question {
  id: number;
  text: string;
  data_from_units?: string;
  email_sent_date?: string;
  due_date?: string;
  status?: {
    is_checked: boolean;
    ticked_at?: string;
  };
}

const Dashboard: React.FC = () => {
  const [titles, setTitles] = useState<Title[]>([]);
  const [mails, setMails] = useState<MailQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Overview Modal State
  const [overviewTitle, setOverviewTitle] = useState<Title | null>(null);
  const [overviewQuestions, setOverviewQuestions] = useState<Question[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [titlesRes, mailsRes] = await Promise.all([
        api.get('/titles'),
        api.get('/mails')
      ]);
      setTitles(titlesRes.data);
      setMails(mailsRes.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenOverview = async (title: Title) => {
    setOverviewTitle(title);
    setOverviewLoading(true);
    try {
      const res = await api.get(`/titles/${title.id}`);
      setOverviewQuestions(res.data.questions);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load checklist details.');
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleCloseOverview = () => {
    setOverviewTitle(null);
    setOverviewQuestions([]);
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
      toast.error('Failed to generate and download report.');
    } finally {
      setDownloading(null);
    }
  };

  // Calculations for stats
  const totalTitles = titles.length;
  const totalQuestions = titles.reduce((acc, t) => acc + t.total_questions, 0);
  const totalCompletedQuestions = titles.reduce((acc, t) => acc + t.completed_questions, 0);
  const complianceRate = totalQuestions > 0 ? (totalCompletedQuestions / totalQuestions) * 100 : 0;
  
  const totalMails = mails.length;
  const answeredMails = mails.filter(m => m.is_answered).length;
  const pendingMails = totalMails - answeredMails;
  const mailAnswerRate = totalMails > 0 ? (answeredMails / totalMails) * 100 : 0;

  const mailChartData = [
    { name: 'Answered', value: answeredMails, color: '#0d9488' },
    { name: 'Pending Office', value: pendingMails, color: '#f59e0b' }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-white rounded-3xl animate-pulse shadow-sm border border-slate-100 p-6 space-y-4">
              <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
              <div className="h-8 w-1/3 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="h-80 bg-white rounded-3xl animate-pulse shadow-sm border border-slate-100"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Cards Statistics Grid (At the Top) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Layers className="h-24 w-24" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Monitor Titles</span>
            <span className="text-3xl font-bold text-slate-800 mt-2 block">{totalTitles}</span>
            <span className="text-xs text-slate-500 mt-1 block">Registered categories</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
            <Layers className="h-6 w-6" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <CheckCircle2 className="h-24 w-24" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Checklist Items</span>
            <span className="text-3xl font-bold text-slate-800 mt-2 block">{totalCompletedQuestions} / {totalQuestions}</span>
            <span className="text-xs text-slate-500 mt-1 block">Total metrics ticked</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Percent className="h-24 w-24" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">IMS Compliance</span>
            <span className="text-3xl font-bold text-indigo-600 mt-2 block">{complianceRate.toFixed(1)}%</span>
            <span className="text-xs text-slate-500 mt-1 block">Total completion rate</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
            <TrendingUp className="h-6 w-6" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Mail className="h-24 w-24" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Registry Mails</span>
            <span className="text-3xl font-bold text-slate-800 mt-2 block">{answeredMails} / {totalMails}</span>
            <span className="text-xs text-slate-500 mt-1 block">{pendingMails} pending answers</span>
          </div>
          <div className="p-3 bg-teal-50 rounded-2xl text-teal-600">
            <Mail className="h-6 w-6" />
          </div>
        </motion.div>
      </div>

      {/* 2. Current Title Progress Records (Moved Up) */}
      <div>
        <h4 className="text-base font-bold text-slate-800 mb-5">Current Title Progress Records</h4>
        {titles.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl text-center border border-slate-100 text-slate-400 text-sm">
            No titles or checklist reports available. Create a monitoring title first.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {titles.map((title) => {
              const scoreText = `${title.completed_questions}/${title.total_questions}`;
              const pct = title.total_questions > 0 ? (title.completed_questions / title.total_questions) * 100 : 0;
              return (
                <div key={title.id} className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full">
                        Score: {scoreText}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {Math.round(pct)}% Done
                      </span>
                    </div>
                    <h5 className="font-bold text-slate-800 text-sm tracking-tight truncate mb-1">{title.name}</h5>
                    <p className="text-xs text-slate-400 line-clamp-2 min-h-[2rem]">
                      {title.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      {/* Overview Action Button */}
                      <button
                        onClick={() => handleOpenOverview(title)}
                        className="w-full flex justify-center items-center py-2 bg-indigo-50 hover:bg-indigo-100 text-[11px] font-bold text-indigo-600 rounded-xl cursor-pointer transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Overview
                      </button>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(`/reports/title/${title.id}/pdf`, `${title.name.toLowerCase().replace(/\s+/g, '_')}_report.pdf`, `pdf-${title.id}`)}
                          disabled={downloading !== null}
                          className="flex-1 flex justify-center items-center py-2 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-600 rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <FileDown className="h-3.5 w-3.5 mr-1 text-slate-400" />
                          PDF
                        </button>
                        <button
                          onClick={() => handleDownload(`/reports/title/${title.id}/excel`, `${title.name.toLowerCase().replace(/\s+/g, '_')}_report.xlsx`, `excel-${title.id}`)}
                          disabled={downloading !== null}
                          className="flex-1 flex justify-center items-center py-2 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-600 rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <Download className="h-3.5 w-3.5 mr-1 text-slate-400" />
                          Excel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Mail Response Share (Moved Down) */}
      <div className="max-w-xl mx-auto w-full">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h4 className="text-sm font-bold text-slate-800 mb-6 text-center">Mail Response Share</h4>
          {totalMails === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-sm">
              No registry logs recorded.
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center">
              <div className="h-44 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mailChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {mailChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-slate-700">{mailAnswerRate.toFixed(0)}%</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Answered</span>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-4">
                {mailChartData.map((item, idx) => (
                  <div key={idx} className="flex items-center text-xs">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-500 font-medium mr-1">{item.name}:</span>
                    <span className="font-bold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. IMS Dashboard Summary Header (At the Bottom) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-slate-800">IMS Dashboard Summary Exports</h3>
          <p className="text-sm text-slate-500 mt-1">Export full registries to PDF or Excel formats for external reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDownload('/reports/mails/pdf', 'mail_registry_report.pdf', 'mail-pdf')}
            disabled={downloading !== null}
            className="flex items-center px-4 py-2.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <FileDown className="h-4 w-4 mr-2 text-slate-500" />
            PDF Report
          </button>
          <button
            onClick={() => handleDownload('/reports/mails/excel', 'mail_registry_report.xlsx', 'mail-excel')}
            disabled={downloading !== null}
            className="flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Excel Report
          </button>
        </div>
      </div>

      {/* --- OVERVIEW GLASSMORPHISM POPUP MODAL (Now Full Page Overlay) --- */}
      <AnimatePresence>
        {overviewTitle && (
          <div className="fixed inset-0 z-50 bg-white overflow-hidden flex flex-col font-sans">
            {/* Full-page animation wrapper */}
            <motion.div
              initial={{ opacity: 0, y: '30px' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '30px' }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex-1 flex flex-col p-6 md:p-12 max-w-7xl mx-auto w-full h-full relative"
            >
              {/* Header with Back/Close action */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCloseOverview}
                    className="p-2.5 hover:bg-slate-100 rounded-2xl text-slate-600 transition-all cursor-pointer mr-2 border border-slate-200/60"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center">
                      <Layers3 className="h-6 w-6 mr-2.5 text-indigo-600" />
                      {overviewTitle.name} Checklist Overview
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{overviewTitle.description || 'No description provided.'}</p>
                  </div>
                </div>
                
                <button
                  onClick={handleCloseOverview}
                  className="hidden md:flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold text-xs cursor-pointer transition-colors"
                >
                  <X className="h-4 w-4 mr-1.5" /> Close Overview
                </button>
              </div>

              {/* Questions List (Large text, high contrast) */}
              <div className="flex-1 overflow-y-auto space-y-4 py-6 pr-2 custom-scrollbar">
                {overviewLoading ? (
                  <div className="space-y-4 py-10">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className="h-20 bg-slate-50 rounded-3xl animate-pulse"></div>
                    ))}
                  </div>
                ) : overviewQuestions.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 text-sm">No questions in this checklist category.</div>
                ) : (
                  overviewQuestions.map((q) => {
                    const isChecked = q.status?.is_checked || false;
                    return (
                      <div 
                        key={q.id}
                        className={`p-6 rounded-3xl border transition-all ${
                          isChecked 
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 shadow-2xs' 
                            : 'bg-rose-50/70 border-rose-100 text-rose-950 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-6">
                          <div className="flex-1 min-w-0">
                            <p className="text-base md:text-lg font-black text-slate-800 leading-relaxed">
                              {q.text}
                            </p>
                            
                            {/* Question meta parameters */}
                            {(q.data_from_units || q.email_sent_date || q.due_date) && (
                              <div className="mt-4 flex flex-wrap gap-2.5 text-xs font-bold">
                                {q.data_from_units && (
                                  <span className={`px-3 py-1 rounded-xl border ${
                                    isChecked 
                                      ? 'bg-emerald-100/50 border-emerald-200 text-emerald-800' 
                                      : 'bg-rose-100/50 border-rose-200 text-rose-800'
                                  }`}>
                                    <b>Units:</b> {q.data_from_units}
                                  </span>
                                )}
                                {q.email_sent_date && (
                                  <span className={`px-3 py-1 rounded-xl border ${
                                    isChecked 
                                      ? 'bg-emerald-100/50 border-emerald-200 text-emerald-750' 
                                      : 'bg-rose-100/50 border-rose-200 text-rose-750'
                                  }`}>
                                    <b>Sent Date:</b> {new Date(q.email_sent_date).toLocaleDateString()}
                                  </span>
                                )}
                                {q.due_date && (
                                  <span className={`px-3 py-1 rounded-xl border ${
                                    isChecked 
                                      ? 'bg-emerald-100/50 border-emerald-200 text-emerald-755' 
                                      : 'bg-rose-100/50 border-rose-200 text-rose-755'
                                  }`}>
                                    <b>Due Date:</b> {new Date(q.due_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex-shrink-0 mt-1">
                            {isChecked ? (
                              <span className="h-9 w-9 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-md">
                                <Check className="h-5 w-5" />
                              </span>
                            ) : (
                              <span className="h-9 w-9 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md">
                                <AlertCircle className="h-5 w-5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom bar with action details */}
              <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                <div className="text-xs text-slate-400 font-bold">
                  SJC IQAC-IMS • Compliance: {overviewTitle.total_questions > 0 ? Math.round((overviewTitle.completed_questions / overviewTitle.total_questions) * 100) : 0}%
                </div>
                <button
                  onClick={handleCloseOverview}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
