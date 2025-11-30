import React from 'react';
import { ReviewFeedback, CriterionResult, Score } from '../types';
import { Lightbulb, Quote, CheckCircle2, AlertCircle, HelpCircle, Star, Sparkles, Trophy, Download } from 'lucide-react';

interface ReviewResultsProps {
  feedback: ReviewFeedback;
}

const ScoreBadge: React.FC<{ score: Score }> = ({ score }) => {
  const styles = {
    Excellent: "bg-green-100 text-green-800 border-green-200",
    Good: "bg-blue-100 text-blue-800 border-blue-200",
    Fair: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Poor: "bg-red-100 text-red-800 border-red-200"
  };

  const icons = {
    Excellent: <Star className="w-4 h-4 fill-current" />,
    Good: <CheckCircle2 className="w-4 h-4" />,
    Fair: <HelpCircle className="w-4 h-4" />,
    Poor: <AlertCircle className="w-4 h-4" />
  };

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${styles[score]}`}>
      {icons[score]}
      <span>{score}</span>
    </div>
  );
};

const OverallScoreCard: React.FC<{ score: number }> = ({ score }) => {
  let colorClass = "text-red-700 bg-red-50 border-red-200 ring-red-100";
  let label = "Needs Improvement";
  
  if (score >= 90) {
    colorClass = "text-green-700 bg-green-50 border-green-200 ring-green-100";
    label = "Exceptional";
  } else if (score >= 80) {
    colorClass = "text-blue-700 bg-blue-50 border-blue-200 ring-blue-100";
    label = "Very Good";
  } else if (score >= 70) {
    colorClass = "text-sky-700 bg-sky-50 border-sky-200 ring-sky-100";
    label = "Good";
  } else if (score >= 60) {
    colorClass = "text-yellow-700 bg-yellow-50 border-yellow-200 ring-yellow-100";
    label = "Fair";
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-xl border ${colorClass} h-full relative overflow-hidden group shadow-sm`}>
       <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <Trophy className="w-16 h-16" />
       </div>
       <span className="text-5xl font-serif font-bold tracking-tight mb-1">{score}</span>
       <div className="flex flex-col items-center">
        <span className="text-xs font-semibold uppercase tracking-widest opacity-80">Overall Score</span>
        <span className="text-sm font-medium mt-1 opacity-90">({label})</span>
       </div>
    </div>
  );
};

const ResultCard: React.FC<{
  item: CriterionResult;
  index: number;
}> = ({ item, index }) => (
  <div 
    className="bg-white rounded-xl shadow-sm border border-academic-100 overflow-hidden animate-fade-in-up fill-mode-both opacity-0"
    style={{ animationDelay: `${(index + 1) * 100}ms`, animationFillMode: 'forwards' }}
  >
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-serif font-bold text-academic-800">{item.criterion}</h3>
        <div className="flex items-center gap-3">
          <span className="font-mono text-academic-400 text-xs tracking-widest hidden sm:block" aria-label={`Score visualization: ${item.score}`}>
            {item.visualBar}
          </span>
          <ScoreBadge score={item.score} />
        </div>
      </div>
      
      <div className="space-y-5">
        {item.feedbackPoints && item.feedbackPoints.map((fp, i) => (
          <div key={i} className="flex gap-4 items-start">
             <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-academic-100 text-academic-700 text-xs font-bold mt-0.5 border border-academic-200">
               {i + 1}
             </div>
             <div className="space-y-2 w-full">
                <p className="text-academic-800 leading-relaxed">{fp.point}</p>
                {fp.highlight && !fp.general_feedback && (
                   <div className="flex items-start gap-3 text-sm text-academic-600 bg-academic-50 p-3 rounded-lg border-l-4 border-academic-300">
                      <Quote className="w-4 h-4 shrink-0 mt-0.5 text-academic-400" />
                      <div className="italic">
                        "{fp.highlight}"
                      </div>
                   </div>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ReviewResults: React.FC<ReviewResultsProps> = ({ feedback }) => {
  const handleDownload = (format: 'pdf' | 'docx') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `ScholarScan_Report_${timestamp}.${format}`;
    // Placeholder for actual PDF/DOCX generation logic
    alert(`Initiating download for ${filename}...\n\n(This feature uses a placeholder for ${format.toUpperCase()} generation)`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto mt-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 animate-fade-in">
        <div>
           <h2 className="text-2xl font-serif font-bold text-academic-900">Evaluation Report</h2>
           <div className="text-sm text-academic-500 mt-1">
            {feedback.reviews.length} Criteria Analyzed
           </div>
        </div>
        
        <div className="flex items-center gap-3">
             <span className="text-xs font-semibold text-academic-400 uppercase tracking-wider hidden sm:block">Export Results</span>
             <div className="flex bg-white rounded-lg border border-academic-200 p-1 shadow-sm">
                <button 
                  onClick={() => handleDownload('pdf')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-academic-600 hover:bg-academic-50 hover:text-academic-900 transition-colors"
                  title="Download as PDF"
                >
                    <Download className="w-4 h-4" />
                    PDF
                </button>
                <div className="w-px bg-academic-200 my-1"></div>
                <button 
                  onClick={() => handleDownload('docx')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium text-academic-600 hover:bg-academic-50 hover:text-academic-900 transition-colors"
                  title="Download as DOCX"
                >
                    <Download className="w-4 h-4" />
                    DOCX
                </button>
             </div>
        </div>
      </div>

      {/* Summary and Score Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
        <div className="md:col-span-2 bg-academic-50 border border-academic-200 rounded-xl p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2.5 mb-3 text-academic-800">
            <Sparkles className="w-5 h-5 text-academic-600" />
            <h3 className="text-lg font-serif font-bold">Executive Summary</h3>
          </div>
          <p className="text-academic-700 leading-relaxed whitespace-pre-wrap">
            {feedback.summary}
          </p>
        </div>
        <div className="md:col-span-1">
          <OverallScoreCard score={feedback.overallScore} />
        </div>
      </div>

      <div className="grid gap-6">
        {feedback.reviews.map((item, idx) => (
          <ResultCard key={idx} item={item} index={idx} />
        ))}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeInUp 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};