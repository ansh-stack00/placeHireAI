export interface ResumePersonal {
  name:       string
  email:      string
  phone:      string
  location:   string
  linkedin:   string | null
  github:     string | null
  portfolio:  string | null
}

export interface ResumeExperience {
  company:  string
  role:     string
  start:    string
  end:      string
  location: string
  bullets:  string[]
}

export interface ResumeEducation {
  institution: string
  degree:      string
  start:       string
  end:         string
  gpa:         string | null
  location:    string
}

export interface ResumeSkills {
  languages:  string[]
  frameworks: string[]
  databases:  string[]
  tools:      string[]
  other:      string[]
}

export interface ResumeProject {
  name:        string
  description: string
  link:        string | null
  bullets:     string[]
}

export interface ResumeCertification {
  name:   string
  issuer: string
  date:   string
}

export interface ResumeData {
  personal:        ResumePersonal
  summary:         string
  experience:      ResumeExperience[]
  education:       ResumeEducation[]
  skills:          ResumeSkills
  projects:        ResumeProject[]
  certifications:  ResumeCertification[]
  ats_keywords:    string[]
}