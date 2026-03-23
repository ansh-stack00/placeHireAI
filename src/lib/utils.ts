import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Tailwind class merger — use this everywhere instead of plain clsx
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date to "Mar 12" or "Mar 12, 2025"
export function formatDate(date: string | null, includeYear = false): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' } : {}),
  })
}

// Days since a date
export function daysSince(date: string | null): number | null {
  if (!date) return null
  const diff = Date.now() - new Date(date).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// Get company logo URL from Clearbit
export function getCompanyLogo(companyName: string): string {
  const domain = companyName.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '')
  return `https://logo.clearbit.com/${domain}.com`
}

// Generate initials from company name for fallback avatar
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

// Generate unique forwarding email hash for user
export function generateForwardingEmail(userId: string): string {
  const hash = userId.slice(0, 8)
  return `${hash}@mail.${process.env.NEXT_PUBLIC_APP_URL?.replace('https://', '') ?? 'placehire.app'}`
}