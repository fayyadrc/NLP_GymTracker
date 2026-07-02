"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import type { WorkoutSession, WorkoutEntry } from '@/lib/types';
import { api } from '@/lib/api';

// ─── State Shape ───

interface WorkoutState {
  sessions: WorkoutSession[];
  loading: boolean;
  error: string | null;
}

// ─── Actions ───

type WorkoutAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: WorkoutSession[] }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'ADD_SESSION'; payload: WorkoutSession }
  | { type: 'CLEAR_SESSIONS' };

// ─── Helpers ───

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Reducer ───

function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, sessions: action.payload };
    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'ADD_SESSION': {
      const existingIdx = state.sessions.findIndex(s => s.date === action.payload.date);
      if (existingIdx !== -1) {
        const updatedSessions = [...state.sessions];
        const existing = updatedSessions[existingIdx];
        
        // Merge entries
        const mergedEntries = [...existing.entries, ...action.payload.entries];
        
        // Re-calculate volume if it exists
        const totalVolume = mergedEntries.reduce((sum, e) => sum + (e.weight * e.sets * e.reps), 0);
        
        updatedSessions[existingIdx] = {
          ...existing,
          entries: mergedEntries,
          totalVolumeKg: totalVolume,
          rawInput: existing.rawInput + "\n" + action.payload.rawInput
        };
        return { ...state, sessions: updatedSessions };
      }
      return { ...state, sessions: [action.payload, ...state.sessions] };
    }
    case 'CLEAR_SESSIONS': {
      return { ...state, sessions: [] };
    }
    default:
      return state;
  }
}

// ─── Context ───

interface WorkoutContextValue {
  sessions: WorkoutSession[];
  loading: boolean;
  error: string | null;
  addSession: (entries: WorkoutEntry[], rawInput: string) => Promise<void>;
  clearSessions: () => void;
  refreshSessions: () => Promise<void>;
  syncStrava: () => Promise<void>;
  updateLog: (logId: string, entry: WorkoutEntry) => Promise<void>;
  deleteLog: (logId: string) => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(workoutReducer, { 
    sessions: [], 
    loading: true, 
    error: null 
  });

  const refreshSessions = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const data = await api.fetchWorkoutHistory();
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: 'Failed to load workout history.' });
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  const addSession = useCallback(async (entries: WorkoutEntry[], rawInput: string) => {
    const newSession: WorkoutSession = {
      id: generateSessionId(),
      date: todayISO(),
      entries,
      rawInput,
    };

    // No backend in export view
    setTimeout(() => {
      dispatch({ type: 'ADD_SESSION', payload: newSession });
    }, 300);
  }, []);

  const clearSessions = useCallback(() => {
    dispatch({ type: 'CLEAR_SESSIONS' });
  }, []);

  const syncStrava = useCallback(async () => {
    try {
      await api.syncStravaData();
      await refreshSessions();
    } catch (error) {
      dispatch({ type: 'FETCH_ERROR', payload: 'Failed to sync with Strava.' });
      throw error;
    }
  }, [refreshSessions]);

  const updateLog = useCallback(async (logId: string, entry: WorkoutEntry) => {
    try {
      await api.updateWorkoutLog(logId, entry);
      await refreshSessions();
    } catch (error) {
      console.error('Update log error:', error);
      throw error;
    }
  }, [refreshSessions]);

  const deleteLog = useCallback(async (logId: string) => {
    try {
      await api.deleteWorkoutLog(logId);
      await refreshSessions();
    } catch (error) {
      console.error('Delete log error:', error);
      throw error;
    }
  }, [refreshSessions]);

  return (
    <WorkoutContext.Provider value={{ 
      sessions: state.sessions, 
      loading: state.loading,
      error: state.error,
      addSession, 
      clearSessions,
      refreshSessions,
      syncStrava,
      updateLog,
      deleteLog
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkoutStore(): WorkoutContextValue {
  const ctx = useContext(WorkoutContext);
  if (!ctx) {
    throw new Error('useWorkoutStore must be used within a <WorkoutProvider>');
  }
  return ctx;
}
