export type Plan = 'free' | 'pro'

export type ApplicationStatus =
  | 'wishlist'
  | 'applied'
  | 'oa_test'
  | 'interview_r1'
  | 'interview_r2'
  | 'offer'
  | 'rejected'
  | 'ghosted'

export type InterviewRoundType = 'R1' | 'R2' | 'R3' | 'HR' | 'OA' | 'Final'

export interface User {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  plan: Plan
  forwarding_email: string | null
  lemon_squeezy_customer_id: string | null
  created_at: string
}

export interface Board {
  id: string
  user_id: string
  name: string
  season: string | null
  created_at: string
}

export interface Resume {
  id: string
  user_id: string
  label: string
  file_url: string | null
  resume_text: string | null
  uploaded_at: string
}

export interface Application {
  id: string
  board_id: string
  resume_id: string | null
  company_name: string
  role_title: string
  location: string | null
  salary_range: string | null
  source: string | null
  status: ApplicationStatus
  jd_snapshot: string | null
  hr_name: string | null
  hr_linkedin: string | null
  referral_by: string | null
  tech_stack: string[] | null
  must_have_skills: string[] | null
  position: number
  applied_at: string | null
  updated_at: string
  // joined
  resume?: Resume
}


export interface InterviewRound {
  id: string
  application_id: string
  round_type: InterviewRoundType
  status: 'scheduled' | 'completed' | 'cancelled'
  scheduled_at: string | null
  pre_notes: string | null
  post_notes: string | null
  questions_asked: string | null
  gut_feeling: number | null
  created_at: string
}

export interface AIPrepCache {
  id: string
  application_id: string
  questions_json: string
  company_context: string
  generated_at: string
}