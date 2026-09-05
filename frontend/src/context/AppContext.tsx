import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CopilotResponse } from '../types/api';

export interface CasesState {
  page: number;
  searchQuery: string;
  classification: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  selectedCases: string[];
}

export interface CopilotMessage {
  role: 'user' | 'ai';
  content: string;
  data?: CopilotResponse;
}

export interface CopilotState {
  selectedDatasetId: string;
  messages: CopilotMessage[];
  input: string;
}

interface AppContextType {
  activeDatasetId: string | null;
  setActiveDatasetId: (id: string | null) => void;
  casesState: CasesState;
  setCasesState: React.Dispatch<React.SetStateAction<CasesState>>;
  copilotState: CopilotState;
  setCopilotState: React.Dispatch<React.SetStateAction<CopilotState>>;
  resetCasesFilter: () => void;
}

const DEFAULT_CASES_STATE: CasesState = {
  page: 1,
  searchQuery: '',
  classification: '',
  status: '',
  sortBy: 'confidence_score',
  sortOrder: 'desc',
  selectedCases: [],
};

const DEFAULT_COPILOT_STATE: CopilotState = {
  selectedDatasetId: '',
  messages: [],
  input: '',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_DATASET_KEY = 'exceptionos_active_dataset_id';
const SESSION_STORAGE_CASES_KEY = 'exceptionos_cases_state';
const SESSION_STORAGE_COPILOT_KEY = 'exceptionos_copilot_state';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDatasetId, setActiveDatasetIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_DATASET_KEY) || null;
    } catch {
      return null;
    }
  });

  const setActiveDatasetId = (id: string | null) => {
    setActiveDatasetIdState(id);
    try {
      if (id) {
        localStorage.setItem(LOCAL_STORAGE_DATASET_KEY, id);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_DATASET_KEY);
      }
    } catch (e) {
      console.warn('Failed to write dataset ID to localStorage', e);
    }
  };

  const [casesState, setCasesState] = useState<CasesState>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_CASES_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CASES_STATE;
    } catch {
      return DEFAULT_CASES_STATE;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_CASES_KEY, JSON.stringify(casesState));
    } catch (e) {
      console.warn('Failed to write cases state to sessionStorage', e);
    }
  }, [casesState]);

  const [copilotState, setCopilotState] = useState<CopilotState>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_COPILOT_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_COPILOT_STATE;
    } catch {
      return DEFAULT_COPILOT_STATE;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_COPILOT_KEY, JSON.stringify(copilotState));
    } catch (e) {
      console.warn('Failed to write copilot state to sessionStorage', e);
    }
  }, [copilotState]);

  const resetCasesFilter = () => {
    setCasesState(DEFAULT_CASES_STATE);
  };

  return (
    <AppContext.Provider
      value={{
        activeDatasetId,
        setActiveDatasetId,
        casesState,
        setCasesState,
        copilotState,
        setCopilotState,
        resetCasesFilter,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
