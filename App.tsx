
import React, { useState, useCallback, useRef } from 'react';
import { FileText, Upload, GraduationCap, ScrollText, X, AlertTriangle, Check, Filter, Plus, Settings2, Thermometer, Heart, Scale, Gavel, ArrowLeft } from 'lucide-react';
import { ReviewCategory, ReviewFeedback, ReviewState, FileData, AVAILABLE_CRITERIA, CustomCriterion, CritiqueLevel } from './types';
import { analyzeDocument } from './services/geminiService';
import { Button } from './components/Button';
import { ReviewResults } from './components/ReviewResults';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB to be safe with base64 overhead
const MAX_WORD_COUNT = 200;

const USAGE_TIPS_TEXT = "This AI reviewer is intended for educational purposes, to help you reflect on and improve your writing. It can also be used as a learning tool to explore how AI generates feedback and how biases may appear in automated assessments. The feedback, scores, highlights, and recommendations are indicative only, as they may be incomplete, inaccurate, or influenced by biases. This tool is not a substitute for human judgment, and all suggestions should be critically evaluated. Always verify feedback yourself and consult instructors or peers for final assessment decisions.";

function App() {
  const [category, setCategory] = useState<ReviewCategory>(ReviewCategory.UNDERGRADUATE);
  const [critiqueLevel, setCritiqueLevel] = useState<CritiqueLevel>('Standard');
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>([]);
  const [customCriteria, setCustomCriteria] = useState<CustomCriterion[]>([
    { id: '1', name: '', keywords: '' },
    { id: '2', name: '', keywords: '' }
  ]);
  const [textInput, setTextInput] = useState('');
  const [file, setFile] = useState<FileData>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState>({
    isLoading: false,
    error: null,
    feedback: null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      setReviewState(prev => ({ ...prev, error: "File size exceeds 4MB limit. Please try a smaller file." }));
      return;
    }

    // Determine correct MIME type based on extension first for reliability
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    let mimeType = selectedFile.type;

    if (ext === 'pdf') {
      mimeType = 'application/pdf';
    } else if (ext === 'docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else {
      setReviewState(prev => ({ ...prev, error: "Only PDF and DOCX files are supported." }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      const base64Data = base64String.split(',')[1];
      
      setFile({
        name: selectedFile.name,
        mimeType: mimeType, 
        data: base64Data
      });
      setReviewState(prev => ({ ...prev, error: null }));
    };
    reader.onerror = () => {
      setReviewState(prev => ({ ...prev, error: "Failed to read file." }));
    };
    reader.readAsDataURL(selectedFile);
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  }, [processFile]);

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleCriterion = (criterion: string) => {
    setSelectedCriteria(prev => 
      prev.includes(criterion)
        ? prev.filter(c => c !== criterion)
        : [...prev, criterion]
    );
  };

  const allSelected = AVAILABLE_CRITERIA.length > 0 && AVAILABLE_CRITERIA.every(c => selectedCriteria.includes(c));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedCriteria([]);
    } else {
      setSelectedCriteria([...AVAILABLE_CRITERIA]);
    }
  };

  const countWords = (str: string) => {
    const trimmed = str.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };

  const handleCustomCriterionChange = (id: string, field: 'name' | 'keywords', value: string) => {
    if (field === 'keywords') {
      const currentWords = countWords(value);
      // Allow deletion or if under limit
      const prevValue = customCriteria.find(c => c.id === id)?.keywords || '';
      const prevWords = countWords(prevValue);
      
      if (currentWords > MAX_WORD_COUNT && currentWords > prevWords) {
        return; // Prevent adding words beyond limit
      }
    }

    setCustomCriteria(prev => prev.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleReview = async () => {
    if (!textInput && !file) {
      setReviewState(prev => ({ ...prev, error: "Please upload a document or paste text to review." }));
      return;
    }

    const activeCustomCriteria = customCriteria.filter(c => c.name.trim() !== '');

    if (selectedCriteria.length === 0 && activeCustomCriteria.length === 0) {
      setReviewState(prev => ({ ...prev, error: "Please select at least one evaluation criterion or add a custom one." }));
      return;
    }

    setReviewState({ isLoading: true, error: null, feedback: null });

    try {
      const feedback = await analyzeDocument(
        category, 
        selectedCriteria, 
        activeCustomCriteria,
        critiqueLevel,
        textInput, 
        file
      );
      setReviewState({ isLoading: false, error: null, feedback });
    } catch (err: any) {
      setReviewState({ 
        isLoading: false, 
        error: err.message || "An unexpected error occurred during analysis.", 
        feedback: null 
      });
    }
  };

  const reset = () => {
    setReviewState({ isLoading: false, error: null, feedback: null });
    setTextInput('');
    clearFile();
    setSelectedCriteria([]);
    setCritiqueLevel('Standard');
    setCustomCriteria([
      { id: '1', name: '', keywords: '' },
      { id: '2', name: '', keywords: '' }
    ]);
  };

  const isReviewing = reviewState.isLoading;

  const getCritiqueLevelInfo = (level: CritiqueLevel) => {
    if (category === ReviewCategory.UNDERGRADUATE) {
      if (level === 'Supportive') return { title: 'The Mentor', desc: 'Encouraging & Warm', icon: Heart, color: 'text-green-600 bg-green-50 border-green-200' };
      if (level === 'Standard') return { title: 'The Grader', desc: 'Objective & Grade-Focused', icon: Scale, color: 'text-blue-600 bg-blue-50 border-blue-200' };
      return { title: 'The Strict Examiner', desc: 'Dry & Unsparing', icon: Gavel, color: 'text-red-600 bg-red-50 border-red-200' };
    } else {
      if (level === 'Supportive') return { title: 'Constructive Peer', desc: 'Collaborative & Helpful', icon: Heart, color: 'text-green-600 bg-green-50 border-green-200' };
      if (level === 'Standard') return { title: 'Peer Reviewer', desc: 'Formal & Rigorous', icon: Scale, color: 'text-blue-600 bg-blue-50 border-blue-200' };
      return { title: 'The Gatekeeper', desc: 'Skeptical & Abrasive', icon: Gavel, color: 'text-red-600 bg-red-50 border-red-200' };
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-academic-900 bg-gray-50/50">
      {/* Header */}
      <header className="bg-white border-b border-academic-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-academic-900 text-white p-1.5 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-serif font-bold text-academic-900 tracking-tight">ScholarScan</h1>
          </div>
          <div className="text-xs font-medium text-academic-400 uppercase tracking-wider hidden sm:block">
            Professional Document Review
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        
        {/* Intro */}
        {!reviewState.feedback && (
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-academic-900 mb-4">
              Academic Review, <span className="text-academic-500 italic">Simplified.</span>
            </h2>
            <p className="text-academic-600 max-w-2xl mx-auto text-lg">
              Use structured AI feedback for learning and AI-bias awareness. Customize your criteria and critique intensity.
            </p>
          </div>
        )}

        {/* Input Section */}
        {!reviewState.feedback ? (
          <>
            <div className="bg-white rounded-2xl shadow-xl shadow-academic-200/40 border border-white overflow-hidden max-w-3xl mx-auto transition-all">
              
              {/* Document Type Tabs */}
              <div className="grid grid-cols-2 border-b border-academic-100">
                <button
                  onClick={() => setCategory(ReviewCategory.UNDERGRADUATE)}
                  className={`p-4 sm:p-6 flex items-center justify-center gap-3 transition-colors duration-200 ${
                    category === ReviewCategory.UNDERGRADUATE 
                      ? 'bg-academic-50/50 text-academic-900 font-semibold shadow-[inset_0_-2px_0_0_#2c3e4e]' 
                      : 'text-academic-500 hover:bg-gray-50 hover:text-academic-700'
                  }`}
                >
                  <GraduationCap className="w-5 h-5" />
                  <span className="text-sm sm:text-base">Undergraduate Essay</span>
                </button>
                <button
                  onClick={() => setCategory(ReviewCategory.JOURNAL)}
                  className={`p-4 sm:p-6 flex items-center justify-center gap-3 transition-colors duration-200 ${
                    category === ReviewCategory.JOURNAL 
                      ? 'bg-academic-50/50 text-academic-900 font-semibold shadow-[inset_0_-2px_0_0_#2c3e4e]' 
                      : 'text-academic-500 hover:bg-gray-50 hover:text-academic-700'
                  }`}
                >
                  <ScrollText className="w-5 h-5" />
                  <span className="text-sm sm:text-base">Journal Article</span>
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                
                {/* Critique Level Selection */}
                <div>
                   <div className="flex items-center gap-2 text-academic-800 mb-4">
                      <Thermometer className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Select Critique Level</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['Supportive', 'Standard', 'Ruthless'] as CritiqueLevel[]).map((level) => {
                        const info = getCritiqueLevelInfo(level);
                        const Icon = info.icon;
                        const isSelected = critiqueLevel === level;
                        return (
                          <button
                            key={level}
                            onClick={() => setCritiqueLevel(level)}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 ${
                              isSelected 
                                ? `${info.color} shadow-sm ring-1 ring-inset` 
                                : 'bg-white border-academic-200 text-academic-500 hover:border-academic-300 hover:bg-academic-50'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'fill-current opacity-20' : ''}`} />
                            <span className="font-semibold text-sm">{info.title}</span>
                            <span className="text-xs opacity-80 mt-1">{info.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                </div>

                <hr className="border-academic-100" />

                {/* Criteria Selection */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-academic-800">
                      <Filter className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Select Evaluation Criteria</h3>
                    </div>
                    <button 
                      onClick={toggleSelectAll}
                      className="text-xs font-medium text-academic-500 hover:text-academic-800 transition-colors"
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {AVAILABLE_CRITERIA.map((c) => {
                      const isSelected = selectedCriteria.includes(c);
                      return (
                        <button
                          key={c}
                          onClick={() => toggleCriterion(c)}
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 flex items-center gap-2 ${
                            isSelected
                              ? 'bg-academic-700 text-white border-academic-700 shadow-md'
                              : 'bg-white text-academic-600 border-academic-200 hover:border-academic-400 hover:bg-academic-50'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {c}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Criteria Section */}
                  <div className="mt-8 pt-6 border-t border-academic-100">
                    <div className="flex items-center gap-2 text-academic-800 mb-5">
                      <Settings2 className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Custom Criteria (Optional)</h3>
                    </div>
                    <div className="space-y-4">
                      {customCriteria.map((criterion, index) => {
                        const wordCount = countWords(criterion.keywords);
                        return (
                          <div key={criterion.id} className="flex flex-col sm:flex-row gap-4 p-4 bg-academic-50/50 rounded-lg border border-academic-100">
                            <div className="flex-1 min-w-[150px]">
                              <label className="block text-xs font-semibold text-academic-500 mb-1.5 uppercase">
                                Criterion Name
                              </label>
                               <input 
                                  type="text" 
                                  placeholder={`e.g., Methodology`}
                                  value={criterion.name}
                                  onChange={(e) => handleCustomCriterionChange(criterion.id, 'name', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-academic-200 text-sm focus:border-academic-500 focus:ring-1 focus:ring-academic-500 outline-none transition-all placeholder:text-academic-300 bg-white"
                               />
                            </div>
                            <div className="flex-[2]">
                               <label className="block text-xs font-semibold text-academic-500 mb-1.5 uppercase flex justify-between">
                                  Focus Areas / Instructions
                                  <span className={`font-mono font-normal ${wordCount >= MAX_WORD_COUNT ? 'text-red-500' : 'text-academic-400'}`}>
                                    {wordCount}/{MAX_WORD_COUNT} words
                                  </span>
                               </label>
                               <textarea 
                                  placeholder="Enter specific instructions..."
                                  value={criterion.keywords}
                                  onChange={(e) => handleCustomCriterionChange(criterion.id, 'keywords', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border border-academic-200 text-sm focus:border-academic-500 focus:ring-1 focus:ring-academic-500 outline-none transition-all placeholder:text-academic-300 bg-white resize-none"
                                  rows={2}
                               />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedCriteria.length === 0 && customCriteria.every(c => !c.name.trim()) && (
                      <p className="text-xs text-academic-400 mt-4 italic">Select at least one criterion or add a custom one to proceed.</p>
                  )}
                </div>

                <hr className="border-academic-100" />

                {/* Upload Area */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-academic-700 mb-1">
                    Document Upload
                  </label>
                  
                  {!file ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all group ${
                        isDragging 
                          ? 'border-academic-500 bg-academic-50' 
                          : 'border-academic-200 hover:border-academic-400 hover:bg-academic-50/30'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110 ${
                        isDragging ? 'bg-academic-200 text-academic-700' : 'bg-academic-100 text-academic-500'
                      }`}>
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-academic-800 font-medium">
                        {isDragging ? 'Drop file here' : 'Click to upload or drag & drop'}
                      </p>
                      <p className="text-academic-500 text-sm mt-1">PDF or DOCX (Max 4MB)</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-academic-50 border border-academic-200 rounded-xl p-4">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 bg-white rounded-lg border border-academic-200 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-academic-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-academic-900 truncate">{file.name}</p>
                          <p className="text-xs text-academic-500 uppercase">{file.mimeType.split('/')[1] || 'FILE'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); clearFile(); }}
                        className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-academic-400 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-academic-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-academic-400">OR</span>
                  </div>
                </div>

                {/* Text Area */}
                <div>
                  <label className="block text-sm font-medium text-academic-700 mb-2">
                    Paste Content
                  </label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste your abstract, introduction, or full text here..."
                    className="w-full h-40 p-4 rounded-xl border border-academic-200 focus:border-academic-500 focus:ring-2 focus:ring-academic-500/20 resize-none text-academic-800 placeholder:text-academic-300 transition-all text-sm leading-relaxed"
                  />
                </div>

                {/* Error Message */}
                {reviewState.error && (
                  <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3 text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{reviewState.error}</span>
                  </div>
                )}

                {/* Action Button */}
                <div className="pt-4">
                  <Button 
                    onClick={handleReview} 
                    isLoading={isReviewing} 
                    className="w-full"
                  >
                    {isReviewing ? 'Analyzing Document...' : 'Run Review'}
                  </Button>
                </div>

              </div>
            </div>
            {/* Disclaimer / Usage Tips */}
            <div className="max-w-3xl mx-auto mt-6 px-6">
              <p className="text-[11px] leading-relaxed text-academic-400 text-center">
                <span className="font-semibold">Usage Tips:</span> {USAGE_TIPS_TEXT}
              </p>
            </div>
          </>
        ) : (
          <div className="animate-fade-in">
            <button 
              onClick={reset}
              className="mb-6 flex items-center text-sm font-medium text-academic-500 hover:text-academic-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Start New Review
            </button>
            <ReviewResults feedback={reviewState.feedback} />
            
            {/* Usage Tips for Results */}
            <div className="max-w-3xl mx-auto mt-12 px-6 pb-8">
              <p className="text-[11px] leading-relaxed text-academic-400 text-center">
                <span className="font-semibold">Usage Tips:</span> {USAGE_TIPS_TEXT}
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
