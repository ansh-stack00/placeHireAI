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

    const { application_id, resume_id } = await req.json()

    if (!application_id || !resume_id) {
      return NextResponse.json(
        { error: 'application_id and resume_id are required' },
        { status: 400 }
      )
    }

    // Fetch application — verify ownership via board in a separate query
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, board_id, company_name, role_title, jd_snapshot, must_have_skills, tech_stack')
      .eq('id', application_id)
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Verify the board belongs to this user
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('user_id')
      .eq('id', application.board_id)
      .single()

    if (boardError || !board || board.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch resume text
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('id, label, resume_text')
      .eq('id', resume_id)
      .eq('user_id', user.id)
      .single()

    if (resumeError || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    if (!resume.resume_text) {
      return NextResponse.json(
        { error: 'This resume has no extracted text. Go to the Resumes page and click Extract text.' },
        { status: 400 }
      )
    }

    if (!application.jd_snapshot) {
      return NextResponse.json(
        { error: 'No JD saved for this application. Edit the application and paste the JD.' },
        { status: 400 }
      )
    }

    const skillsContext = [
      ...(application.must_have_skills ?? []),
      ...(application.tech_stack ?? []),
    ]

    const completion = await client.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      max_tokens:  1536,
      temperature: 0.1,
      messages: [
        {
          role:    'system',
          content: 'You are an expert technical recruiter scoring a resume against a job description. Return ONLY valid JSON with no markdown, no explanation.',
        },
        {
          role:    'user',
          content: `Score this resume against the job description for ${application.role_title} at ${application.company_name}.

RESUME:
${resume.resume_text.slice(0, 3000)}

JOB DESCRIPTION:
${application.jd_snapshot.slice(0, 2000)}

${skillsContext.length > 0 ? `KEY REQUIRED SKILLS: ${skillsContext.join(', ')}` : ''}

Return ONLY this JSON:
{
  "overall_score": <number 0-100>,
  "verdict": <"strong" | "moderate" | "weak">,
  "verdict_reason": <"one sentence explaining the verdict">,
  "dimensions": {
    "skills_match": {
      "score": <0-10>,
      "matched": ["skill1", "skill2"],
      "missing": ["skill3", "skill4"]
    },
    "experience": {
      "score": <0-10>,
      "note": <"one sentence">
    },
    "domain_fit": {
      "score": <0-10>,
      "note": <"one sentence">
    },
    "impact_clarity": {
      "score": <0-10>,
      "note": <"one sentence about quantified achievements">
    }
  },
  "quick_wins": [
    <"specific actionable edit 1">,
    <"specific actionable edit 2">,
    <"specific actionable edit 3">
  ],
  "strengths": [
    <"strength 1">,
    <"strength 2">
  ]
}

Rules:
- overall_score: weighted — skills_match 40%, experience 30%, domain_fit 15%, impact_clarity 15%
- verdict: strong=70+, moderate=45-69, weak=below 45
- matched/missing: only skills explicitly in the JD or required skills list
- quick_wins: SPECIFIC e.g. "Add 'distributed systems' to skills section" not "improve skills"
- strengths: what genuinely stands out in this resume for this role`,
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
      console.error('[score-resume] JSON parse error. Raw:', rawContent)
      return NextResponse.json(
        { error: 'AI returned invalid format. Please try again.' },
        { status: 500 }
      )
    }

    result.overall_score = Math.min(100, Math.max(0, Math.round(result.overall_score ?? 0)))

    return NextResponse.json({
      ...result,
      resume_label: resume.label,
      company_name: application.company_name,
      role_title:   application.role_title,
    })

  } catch (err: any) {
    console.error('[score-resume] error:', err)
    if (err?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait a moment and try again.' },
        { status: 429 }
      )
    }
    return NextResponse.json({ error: 'Failed to score resume' }, { status: 500 })
  }
}