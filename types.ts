export enum AppView {
  HOME = 'HOME',
  STORY = 'STORY',
  QUIZ = 'QUIZ',
  CHAT = 'CHAT',
  CROSSWORD = 'CROSSWORD',
  DICTATION = 'DICTATION',
  CALENDAR = 'CALENDAR'
}

export interface Question {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface StoryData {
  title: string;
  content: string;
  chineseSummary: string;
  questions: Question[];
  vocabulary: string[]; // New field for tracking words
}

export interface WordChallenge {
  word: string;
  emoji: string;
  chineseMeaning: string;
  sentence: string;
  options: string[];
  correctIndex: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface CrosswordWord {
  id: number;
  word: string;
  clue: string;
  startX: number;
  startY: number;
  direction: 'across' | 'down';
}

export interface CrosswordData {
  title: string;
  words: CrosswordWord[];
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  words: string[];
}