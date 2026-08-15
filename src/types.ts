export interface Task {
  id: string;
  title: string;
  completed: boolean;
  pomodoros: number;
  createdAt: number;
}

export interface SessionLog {
  id: string;
  taskTitle?: string;
  durationMinutes: number;
  completedAt: number; // timestamp
  type: 'pomodoro' | 'short-break' | 'long-break';
}

export type TimerMode = 'pomodoro' | 'short-break' | 'long-break';

export interface TimerSettings {
  pomodoro: number; // minutes
  'short-break': number;
  'long-break': number;
}
