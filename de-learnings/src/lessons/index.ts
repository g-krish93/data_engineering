import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'

// Lesson component registry: lesson id -> lazily loaded page.
// Every lesson flagged `authored: true` in src/curriculum.ts MUST have an entry here.
export const lessonComponents: Record<string, LazyExoticComponent<ComponentType>> = {
  '0.1.1': lazy(() => import('./phase-0/module-01/01-windows-de-workstation')),
  '0.1.2': lazy(() => import('./phase-0/module-01/02-git-and-github')),
  '0.1.3': lazy(() => import('./phase-0/module-01/03-how-this-curriculum-works')),
}
