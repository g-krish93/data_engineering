import { create } from 'zustand'

export type EngineState = 'idle' | 'loading' | 'ready' | 'error'

interface EnginesStatus {
  python: EngineState
  sql: EngineState
  setStatus: (k: 'python' | 'sql', s: EngineState) => void
}

/** Shared across every CodeRunner so the "engine loading" state is global. */
export const useEngineStatus = create<EnginesStatus>()((set) => ({
  python: 'idle',
  sql: 'idle',
  setStatus: (k, s) => set({ [k]: s } as Partial<EnginesStatus>),
}))
