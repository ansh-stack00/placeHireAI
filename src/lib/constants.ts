import { KanbanColumn, ApplicationStatus } from '@/types'

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'wishlist',      label: 'Wishlist',      color: '#888780', bgColor: '#F1EFE8' },
  { id: 'applied',       label: 'Applied',       color: '#534AB7', bgColor: '#EEEDFE' },
  { id: 'oa_test',       label: 'OA / Test',     color: '#854F0B', bgColor: '#FAEEDA' },
  { id: 'interview_r1',  label: 'Interview R1',  color: '#185FA5', bgColor: '#E6F1FB' },
  { id: 'interview_r2',  label: 'Interview R2+', color: '#3B6D11', bgColor: '#EAF3DE' },
  { id: 'offer',         label: 'Offer',         color: '#0F6E56', bgColor: '#E1F5EE' },
  { id: 'rejected',      label: 'Rejected',      color: '#993C1D', bgColor: '#FAECE7' },
]

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist:      'Wishlist',
  applied:       'Applied',
  oa_test:       'OA / Test',
  interview_r1:  'Interview R1',
  interview_r2:  'Interview R2+',
  offer:         'Offer',
  rejected:      'Rejected',
  ghosted:       'Ghosted',
}

export const FREE_PLAN_LIMITS = {
  applications: 15,
  resumes: 2,
  jd_parses_per_month: 3,
}

export const PLANS = {
  free: 'free',
  pro: 'pro',
} as const