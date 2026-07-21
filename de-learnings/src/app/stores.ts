import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tier = 'layman' | 'student' | 'phd'

export const TIERS: { id: Tier; label: string; blurb: string }[] = [
  { id: 'layman', label: 'Layman', blurb: 'Plain-language analogies. Zero jargon.' },
  { id: 'student', label: 'Student', blurb: 'Practitioner mechanics: code, labs, interview depth.' },
  { id: 'phd', label: 'PhD', blurb: 'Internals, papers, formal trade-offs.' },
]

interface TierState {
  tier: Tier
  setTier: (t: Tier) => void
}

export const useTierStore = create<TierState>()(
  persist((set) => ({ tier: 'student', setTier: (tier) => set({ tier }) }), { name: 'de-tier' }),
)

interface ThemeState {
  theme: 'dark' | 'light'
  toggle: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      toggle: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'de-theme' },
  ),
)

export interface QuizResult {
  score: number
  total: number
}

interface ProgressState {
  /** lessonId -> ISO date completed */
  done: Record<string, string>
  /** lessonId -> last quiz result */
  quiz: Record<string, QuizResult>
  /** "<lessonId>:<stepIndex>" -> checked */
  labChecks: Record<string, boolean>
  toggleDone: (id: string) => void
  setQuiz: (id: string, r: QuizResult) => void
  toggleLabCheck: (key: string) => void
  importState: (json: string) => boolean
  resetAll: () => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      done: {},
      quiz: {},
      labChecks: {},
      toggleDone: (id) =>
        set((s) => {
          const done = { ...s.done }
          if (done[id]) delete done[id]
          else done[id] = new Date().toISOString().slice(0, 10)
          return { done }
        }),
      setQuiz: (id, r) => set((s) => ({ quiz: { ...s.quiz, [id]: r } })),
      toggleLabCheck: (key) => set((s) => ({ labChecks: { ...s.labChecks, [key]: !s.labChecks[key] } })),
      importState: (json) => {
        try {
          const d: unknown = JSON.parse(json)
          if (typeof d !== 'object' || d === null) return false
          const o = d as Partial<Pick<ProgressState, 'done' | 'quiz' | 'labChecks'>>
          set({ done: o.done ?? {}, quiz: o.quiz ?? {}, labChecks: o.labChecks ?? {} })
          return true
        } catch {
          return false
        }
      },
      resetAll: () => set({ done: {}, quiz: {}, labChecks: {} }),
    }),
    { name: 'de-progress' },
  ),
)

export function exportProgress(): string {
  const { done, quiz, labChecks } = useProgressStore.getState()
  return JSON.stringify({ done, quiz, labChecks }, null, 2)
}
