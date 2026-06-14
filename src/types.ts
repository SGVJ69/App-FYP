
export enum Screen {
  LOGIN = 'LOGIN',
  HOME = 'HOME',
  DASHBOARD = 'DASHBOARD',
  VOCABULARY = 'VOCABULARY',
  SPELLING = 'SPELLING',
  SENTENCES = 'SENTENCES',
  QUIZ = 'QUIZ',
  FEEDBACK = 'FEEDBACK',
  LOADING = 'LOADING',
  ABOUT = 'ABOUT',
  PROGRESS = 'PROGRESS',
  MEMORY_GAME = 'MEMORY_GAME',
  MEMORY_THEMES = 'MEMORY_THEMES',
  ADMIN = 'ADMIN',
  DICTIONARY = 'DICTIONARY'
}

export interface UserProgress {
  totalScore: number;
  quizzesCompleted: number;
  spellingCompleted: number;
  sentencesCompleted: number;
  memoryCompleted: number;
  streak: number;
  lastActiveDate: string | null;
  badges: string[];
  role?: 'user' | 'admin';
  email?: string;
}

export interface WordPair {
  english: string;
  kadazan: string;
  malay: string;
  example?: string;
  exampleEnglish?: string;
  exampleMalay?: string;
  category: string;
  imageUrl?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface SpellingChallenge {
  english: string;
  kadazan: string;
  imageUrl: string;
  hint: string;
}
