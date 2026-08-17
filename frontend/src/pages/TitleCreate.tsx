import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Layers, 
  FileText, 
  Check, 
  ChevronRight,
  Info,
  ArrowLeft,
  Settings
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Question {
  id: number;
  text: string;
  data_from_units?: string;
  email_sent_date?: string;
  due_date?: string;
}

interface Title {
  id: number;
  name: string;
  description?: string;
  total_questions: number;
  completed_questions: number;
}

const TitleCreate: React.FC = () => {
  const [titles, setTitles] = useState<Title[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<Title | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Title Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitleName, setNewTitleName] = useState('');
  const [newTitleDesc, setNewTitleDesc] = useState('');

  // Editing Title Metadata State (inside drawer)
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleName, setEditTitleName] = useState('');
  const [editTitleDesc, setEditTitleDesc] = useState('');

  // New Question State
  const [newQuestionText, setNewQuestionText] = useState('');
  const [dataFromUnits, setDataFromUnits] = useState('');
  const [emailSentDate, setEmailSentDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Editing Question State
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editingQuestionText, setEditingQuestionText] = useState('');

  useEffect(() => {
    fetchTitles();
  }, []);

  const fetchTitles = async (selectId?: number) => {
    setLoading(true);
    try {
      const res = await api.get('/titles');
      setTitles(res.data);
      if (selectId) {
        const updatedSelected = res.data.find((t: Title) => t.id === selectId);
        if (updatedSelected) {
          setSelectedTitle(updatedSelected);
          fetchQuestionsForTitle(selectId);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to retrieve monitoring titles.');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionsForTitle = async (titleId: number) => {
    try {
      const res = await api.get(`/titles/${titleId}`);
      setQuestions(res.data.questions);
      setEditTitleName(res.data.name);
      setEditTitleDesc(res.data.description || '');
      setIsEditingTitle(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load title questions.');
    }
  };

  const handleOpenQuestionsDrawer = (title: Title) => {
    setSelectedTitle(title);
    fetchQuestionsForTitle(title.id);
  };

  const handleCloseQuestionsDrawer = () => {
    setSelectedTitle(null);
    setQuestions([]);
    // Refresh parent list stats
    fetchTitles();
  };

  // --- Title CRUD Handlers ---

  const handleCreateTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleName.trim()) {
      toast.error('Please enter a Title Name.');
      return;
    }

    try {
      const payload = {
        name: newTitleName.trim(),
        description: newTitleDesc.trim(),
        questions: []
      };

      const res = await api.post('/titles', payload);
      toast.success('Monitoring title created successfully!');
      
      // Reset Form and Modal
      setNewTitleName('');
      setNewTitleDesc('');
      setIsCreateModalOpen(false);
      
      // Refresh list
      fetchTitles(res.data.id);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create title.');
    }
  };

  const handleUpdateTitleMeta = async () => {
    if (!selectedTitle) return;
    if (!editTitleName.trim()) {
      toast.error('Title name cannot be blank.');
      return;
    }

    try {
      const res = await api.put(`/titles/${selectedTitle.id}`, {
        name: editTitleName.trim(),
        description: editTitleDesc.trim()
      });
      toast.success('Title information updated!');
      setIsEditingTitle(false);
      
      // Update local state
      setSelectedTitle(res.data);
      setTitles(titles.map(t => t.id === selectedTitle.id ? res.data : t));
    } catch (err) {
      console.error(err);
      toast.error('Failed to save title updates.');
    }
  };

  const handleDeleteTitle = async () => {
    if (!selectedTitle) return;
    if (!window.confirm('Are you sure you want to delete this monitoring title? All associated questions and status history will be permanently deleted.')) {
      return;
    }

    try {
      await api.delete(`/titles/${selectedTitle.id}`);
      toast.success('Title deleted successfully.');
      handleCloseQuestionsDrawer();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete title.');
    }
  };

  // --- Question CRUD Handlers ---

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTitle) return;
    if (!newQuestionText.trim()) return;

    try {
      const payload = {
        text: newQuestionText.trim(),
        data_from_units: dataFromUnits.trim() || null,
        email_sent_date: emailSentDate ? new Date(emailSentDate).toISOString() : null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null
      };

      const res = await api.post(`/titles/${selectedTitle.id}/questions`, payload);
      toast.success('Question added!');
      setNewQuestionText('');
      setDataFromUnits('');
      setEmailSentDate('');
      setDueDate('');
      setQuestions([...questions, res.data]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to append question.');
    }
  };

  const handleStartEditQuestion = (q: Question) => {
    setEditingQuestionId(q.id);
    setEditingQuestionText(q.text);
  };

  const handleSaveQuestion = async (qId: number) => {
    if (!editingQuestionText.trim()) {
      toast.error('Question text cannot be blank.');
      return;
    }

    try {
      const existingQ = questions.find(q => q.id === qId);
      const payload = {
        text: editingQuestionText.trim(),
        data_from_units: existingQ?.data_from_units || null,
        email_sent_date: existingQ?.email_sent_date || null,
        due_date: existingQ?.due_date || null
      };

      await api.put(`/questions/${qId}`, payload);
      toast.success('Question updated!');
      setQuestions(questions.map(q => q.id === qId ? { ...q, text: editingQuestionText.trim() } : q));
      setEditingQuestionId(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save question.');
    }
  };

  const handleDeleteQuestion = async (qId: number) => {
    if (!window.confirm('Delete this question from checklist?')) return;

    try {
      await api.delete(`/questions/${qId}`);
      toast.success('Question deleted.');
      setQuestions(questions.filter(q => q.id !== qId));
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete question.');
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Title Header area */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Title & Question Configurations</h3>
          <p className="text-sm text-slate-500 mt-1">Configure monitoring checklists, edit meta criteria, and seed checklist targets.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
        >
          <Plus className="h-4.5 w-4.5 mr-2" />
          Create Monitor Title
        </button>
      </div>

      {/* Grid of Title Cards */}
      {loading && titles.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-48 bg-white rounded-3xl animate-pulse border border-slate-100 p-6 space-y-4">
              <div className="h-5 w-2/3 bg-slate-100 rounded"></div>
              <div className="h-12 w-full bg-slate-50 rounded"></div>
              <div className="h-4 w-1/3 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : titles.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-slate-100 text-slate-400 text-sm max-w-lg mx-auto flex flex-col items-center">
          <Layers className="h-12 w-12 text-slate-200 mb-3" />
          <h4 className="font-bold text-slate-700">No titles created yet</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mb-5">Click the "Create Monitor Title" button to initialize your first audit category card.</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Start First Title
          </button>
        </div>
      ) : (
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {titles.map((title) => {
            const progressPct = title.total_questions > 0 ? (title.completed_questions / title.total_questions) * 100 : 0;
            return (
              <motion.div
                key={title.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-xs hover:shadow-md p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 relative group overflow-hidden"
                onClick={() => handleOpenQuestionsDrawer(title)}
              >
                <div className="absolute top-0 right-0 h-1 w-0 bg-indigo-500 group-hover:w-full transition-all duration-500" />
                
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                      {title.total_questions} Questions
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {Math.round(progressPct)}% Progress
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-slate-800 text-sm tracking-tight leading-snug group-hover:text-indigo-600 transition-colors">
                    {title.name}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-3 min-h-[3rem]">
                    {title.description || 'No description added to this monitoring title.'}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-between text-indigo-600 font-bold text-xs">
                  <span>Manage Questions</span>
                  <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* --- CREATE TITLE MODAL POPUP --- */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900"
              onClick={() => setIsCreateModalOpen(false)}
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600" />
              
              <div className="flex justify-between items-center mb-5">
                <h4 className="text-sm font-bold text-slate-800 flex items-center">
                  <Layers className="h-4.5 w-4.5 mr-2 text-indigo-600" />
                  Create Monitor Title
                </h4>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTitle} className="space-y-4">
                 <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Title Name</label>
                  <input
                    type="text"
                    value={newTitleName}
                    onChange={(e) => setNewTitleName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Description / Audit Scope</label>
                  <textarea
                    value={newTitleDesc}
                    onChange={(e) => setNewTitleDesc(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs resize-none"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all cursor-pointer text-center"
                  >
                    Initialize Title
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- SELECTED TITLE SLIDE-OVER DRAWER (QUESTIONS WORKSPACE) --- */}
      <AnimatePresence>
        {selectedTitle && (
          <div className="fixed inset-0 z-40 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900"
              onClick={handleCloseQuestionsDrawer}
            />

            {/* Slide-over Content Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-xl bg-white h-screen shadow-2xl flex flex-col justify-between z-10"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <button
                  onClick={handleCloseQuestionsDrawer}
                  className="flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Titles
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditingTitle(!isEditingTitle)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleCloseQuestionsDrawer}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Work body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Title Metadata header */}
                <div className="bg-indigo-50/40 border border-indigo-100/50 p-5 rounded-2xl">
                  {isEditingTitle ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Title Name</label>
                        <input
                          type="text"
                          value={editTitleName}
                          onChange={(e) => setEditTitleName(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-hidden"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                        <textarea
                          value={editTitleDesc}
                          onChange={(e) => setEditTitleDesc(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden resize-none"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateTitleMeta}
                          className="flex items-center px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded-md cursor-pointer"
                        >
                          <Save className="h-3.5 w-3.5 mr-1" /> Save
                        </button>
                        <button
                          onClick={() => setIsEditingTitle(false)}
                          className="flex items-center px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="text-base font-bold text-slate-800">{selectedTitle.name}</h3>
                        <button
                          onClick={handleDeleteTitle}
                          className="p-1 text-slate-400 hover:text-red-600 rounded-md cursor-pointer transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed flex items-start">
                        <Info className="h-3.5 w-3.5 mr-1.5 text-slate-300 flex-shrink-0 mt-0.5" />
                        {selectedTitle.description || 'No description added to this monitoring title.'}
                      </p>
                    </div>
                  )}
                </div>

                 {/* Add Question block */}
                <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
                  <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Append Checklist Question</h4>
                  <form onSubmit={handleAddQuestion} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500">Question Text</label>
                      <input
                        type="text"
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Data from Units (Opt)</label>
                        <input
                          type="text"
                          value={dataFromUnits}
                          onChange={(e) => setDataFromUnits(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-[11px] focus:outline-hidden"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Email Sent Date (Opt)</label>
                        <input
                          type="date"
                          value={emailSentDate}
                          onChange={(e) => setEmailSentDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-[11px] focus:outline-hidden"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Due Date (Opt)</label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-[11px] focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Question to Checklist
                    </button>
                  </form>
                </div>

                {/* Questions List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Checklist Questions ({questions.length})</h4>
                  {questions.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-100 rounded-2xl">
                      No checklist questions in this title yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                      {questions.map((q) => {
                        const isEditing = editingQuestionId === q.id;
                        return (
                          <div 
                            key={q.id}
                            className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl flex items-center justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editingQuestionText}
                                  onChange={(e) => setEditingQuestionText(e.target.value)}
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs focus:outline-hidden"
                                />
                              ) : (
                              <div>
                                <p className="text-xs text-slate-700 font-semibold break-words leading-relaxed">
                                  {q.text}
                                </p>
                                {(q.data_from_units || q.email_sent_date || q.due_date) && (
                                  <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-bold">
                                    {q.data_from_units && (
                                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                        Units: {q.data_from_units}
                                      </span>
                                    )}
                                    {q.email_sent_date && (
                                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                                        Sent: {new Date(q.email_sent_date).toLocaleDateString()}
                                      </span>
                                    )}
                                    {q.due_date && (
                                      <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-100">
                                        Due: {new Date(q.due_date).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveQuestion(q.id)}
                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingQuestionId(null)}
                                    className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartEditQuestion(q)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteQuestion(q.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={handleCloseQuestionsDrawer}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Done Editing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TitleCreate;
