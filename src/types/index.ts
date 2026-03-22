export * from './database'

export interface KanbanColumn {
  id: string
  label: string
  color: string
  bgColor: string
}

export interface AIScoreResult {
  overall_score: number
  dimensions: {
    skills: { score: number; matched: string[]; missing: string[] }
    experience: { score: number; gap: string | null }
    domain: { score: number; note: string }
    projects: { score: number; note: string }
  }
  quick_wins: string[]
  verdict: 'strong' | 'moderate' | 'stretch'
}

export interface ParsedJD {
  role_title: string | null
  company_name: string | null
  location: string | null
  salary_range: string | null
  employment_type: string | null
  tech_stack: string[]
  must_have_skills: string[]
  good_to_have_skills: string[]
}