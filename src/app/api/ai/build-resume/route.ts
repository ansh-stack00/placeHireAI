import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const client = new OpenAI({
  apiKey:  process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { resume_text, jd_text, template = 'classic' } = await req.json()

    if (!resume_text?.trim()) {
      return NextResponse.json({ error: 'resume_text is required' }, { status: 400 })
    }
    if (!jd_text?.trim()) {
      return NextResponse.json({ error: 'jd_text is required' }, { status: 400 })
    }

    const completion = await client.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  4000,
      temperature: 0.3,
      messages: [
        {
          role:    'system',
          content: 'You are an expert resume writer and ATS optimization specialist. You rewrite resumes to be tailored for specific job descriptions while keeping all factual information accurate. Return ONLY valid JSON, no markdown, no explanation.',
        },
        {
          role:    'user',
          content: `Rewrite this resume to be perfectly tailored for the job description below.

EXISTING RESUME:
${resume_text.slice(0, 4000)}

JOB DESCRIPTION:
${jd_text.slice(0, 2000)}

Instructions:
- Keep all factual information (companies, dates, degrees) exactly as-is — never invent facts
- Rewrite bullet points to use keywords from the JD naturally
- Rewrite the professional summary to target this specific role
- Reorder skills to put the most JD-relevant ones first
- Use strong action verbs (Led, Built, Designed, Reduced, Increased etc)
- Quantify achievements wherever the original has numbers
- Make bullet points start with action verbs, be specific, and show impact
- Keep the same number of bullet points per role — don't add fake experience

Return ONLY this JSON structure:
{
  "personal": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "+91 98765 43210",
    "location": "City, State",
    "linkedin": "linkedin.com/in/username",
    "github": "github.com/username",
    "portfolio": "portfolio.com"
  },
  "summary": "2-3 sentence professional summary tailored to this role",
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "start": "Jan 2022",
      "end": "Present",
      "location": "City, State",
      "bullets": [
        "Action verb + what you did + measurable result",
        "Action verb + what you did + measurable result"
      ]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "B.Tech Computer Science",
      "start": "2018",
      "end": "2022",
      "gpa": "8.5/10",
      "location": "City, State"
    }
  ],
  "skills": {
    "languages":   ["Python", "JavaScript", "TypeScript"],
    "frameworks":  ["React", "Node.js", "FastAPI"],
    "databases":   ["PostgreSQL", "MongoDB", "Redis"],
    "tools":       ["Docker", "AWS", "Git", "Kubernetes"],
    "other":       ["System Design", "REST APIs", "Agile"]
  },
  "projects": [
    {
      "name": "Project Name",
      "description": "One sentence about what it does and tech used",
      "link": "github.com/user/project",
      "bullets": [
        "Key achievement or feature"
      ]
    }
  ],
  "certifications": [
    {
      "name": "AWS Solutions Architect",
      "issuer": "Amazon",
      "date": "2023"
    }
  ],
  "ats_keywords": ["keyword1", "keyword2", "keyword3"]
}

Rules:
- If a field is not in the original resume, use null or empty array
- personal.linkedin, personal.github, personal.portfolio — use null if not present
- certifications — use empty array [] if none
- projects — use empty array [] if none
- ats_keywords — list 8-12 important keywords from the JD that appear in the rewritten resume`,
        },
      ],
    })

    const rawContent = completion.choices[0]?.message?.content
    if (!rawContent) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    const cleaned = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    let result
    try {
      result = JSON.parse(cleaned)
    } catch {
      console.error('[build-resume] JSON parse error. Raw:', rawContent.slice(0, 500))
      return NextResponse.json(
        { error: 'AI returned invalid format. Please try again.' },
        { status: 500 }
      )
    }


    result.experience     = result.experience     ?? []
    result.education      = result.education      ?? []
    result.projects       = result.projects       ?? []
    result.certifications = result.certifications ?? []
    result.ats_keywords   = result.ats_keywords   ?? []
    result.skills         = result.skills ?? {
      languages: [], frameworks: [], databases: [], tools: [], other: [],
    }

    return NextResponse.json({ resume: result, template })

  } catch (err: any) {
    console.error('[build-resume] error:', err)
    if (err?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait a moment and try again.' },
        { status: 429 }
      )
    }
    return NextResponse.json({ error: 'Failed to build resume' }, { status: 500 })
  }
}