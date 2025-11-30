
export enum ReviewCategory {
  UNDERGRADUATE = 'Undergraduate Essay',
  JOURNAL = 'Journal Article'
}

export type Score = 'Excellent' | 'Good' | 'Fair' | 'Poor';

export type CritiqueLevel = 'Supportive' | 'Standard' | 'Ruthless';

export interface FeedbackPoint {
  point: string;
  highlight?: string;
  general_feedback?: boolean;
}

export interface CriterionResult {
  criterion: string;
  score: Score;
  visualBar: string;
  feedbackPoints: FeedbackPoint[];
}

export interface ReviewFeedback {
  summary: string;
  overallScore: number;
  reviews: CriterionResult[];
}

export interface ReviewState {
  isLoading: boolean;
  error: string | null;
  feedback: ReviewFeedback | null;
}

export type FileData = {
  mimeType: string;
  data: string; // Base64 encoded
  name: string;
} | null;

export interface CustomCriterion {
  id: string;
  name: string;
  keywords: string;
}

export const AVAILABLE_CRITERIA = [
  'Clarity',
  'Argument Structure',
  'Originality',
  'Evidence Use',
  'Grammar & Style',
  'Referencing',
  'Critical Thinking',
  'Adherence to Academic Conventions'
];
