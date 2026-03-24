import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'
import { cn } from "@/lib/utils"

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://placehire.online'),

  title: {
    default: 'PlaceHire — Job Application Tracker & Placement Preparation',
    template: '%s | PlaceHire',
  },

  description:
    'PlaceHire helps campus students and job switchers track job applications with a Kanban board, prep for placements with AI interview prep, match resumes to JDs, and build ATS-friendly resumes — all in one place.',

  keywords: [
    'job application tracker',
    'placement preparation',
    'campus placement tracker',
    'AI interview preparation',
    'resume JD matching',
    'AI resume builder',
    'job search tracker',
    'kanban job board',
    'placement season tools',
    'job switcher tracker',
    'ATS resume builder',
    'college placement preparation',
  ],

  authors: [{ name: 'PlaceHire', url: 'https://placehire.online' }],
  creator: 'PlaceHire',
  publisher: 'PlaceHire',

  alternates: {
    canonical: 'https://placehire.online',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },

  openGraph: {
    title: 'PlaceHire — Job Tracker & AI Placement Prep for Students',
    description:
      'Track every job application on a Kanban board. Prep smarter with AI company-specific interview prep. Match your resume to any JD. Built for campus placements & job switches.',
    url: 'https://placehire.online',
    siteName: 'PlaceHire',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/og-image.png', // Create a 1200x630px branded image
        width: 1200,
        height: 630,
        alt: 'PlaceHire — Job Application Tracker and AI Placement Preparation',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'PlaceHire — Job Tracker & AI Placement Prep',
    description:
      'Kanban job tracker + AI interview prep + resume-JD matching. Built for students & job switchers.',
    images: ['/og-image.png'],
    creator: '@placehire', // update if you have a handle
  },

  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn("font-mono", jetbrainsMono.variable)}>
      <head>
        {/* JSON-LD Structured Data — helps Google understand your product */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'PlaceHire',
              url: 'https://placehire.online',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              description:
                'AI-powered job application tracker with Kanban board, AI placement prep, resume-JD matching, and AI resume builder for campus students and job switchers.',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'INR',
              },
              featureList: [
                'Kanban job application board',
                'AI interview preparation by company',
                'Resume to JD matching score',
                'AI resume builder',
                'Gmail auto-detection',
                'Placement season tracker',
              ],
              audience: {
                '@type': 'Audience',
                audienceType: 'Students, Job Seekers, Campus Placement Candidates',
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#1a1a1a',
              border: '0.5px solid #e5e5e5',
              borderRadius: '8px',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}