import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const client = new OpenAI({
  apiKey:  process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
})

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const jd_text = body?.jd_text

    if (!jd_text?.trim()) {
      return NextResponse.json({ error: 'jd_text is required' }, { status: 400 })
    }

    if (jd_text.trim().length < 50) {
      return NextResponse.json(
        { error: 'Job description is too short. Please paste the full JD.' },
        { status: 400 }
      )
    }

    const completion = await client.chat.completions.create({
      model:      'llama-3.3-70b-versatile',
      max_tokens: 1024,
      temperature: 0.1, // Low temp for structured extraction
      messages: [
        {
          role:    'system',
          content: 'You are a job description parser. Extract structured data and return ONLY valid JSON. No markdown, no explanation, no text before or after the JSON object.',
        },
        {
          role:    'user',
          content: `Extract structured data from this job description and return ONLY a JSON object.

Return exactly this structure:
{
  "role_title": "exact job title from the JD" or null,
  "company_name": "company name if clearly stated" or null,
  "location": "city or remote/hybrid" or null,
  "salary_range": "salary if stated, e.g. ₹20-26 LPA" or null,
  "employment_type": "full-time" or "intern" or "contract" or null,
  "experience_required": "e.g. 2-4 years" or null,
  "tech_stack": ["technology1", "technology2"],
  "must_have_skills": ["skill1", "skill2"],
  "good_to_have_skills": ["skill1", "skill2"]
}

Rules:
- role_title: extract the exact job title (e.g. "Software Development Engineer - 1", "Backend Engineer")
- company_name: ONLY if the company name is explicitly written in the JD, otherwise null
- salary_range: ONLY if salary/CTC/stipend is clearly stated, otherwise null — never guess
- tech_stack: specific technologies, languages, frameworks (React, Node.js, PostgreSQL, AWS etc)
- must_have_skills: requirements explicitly marked as required/mandatory/must have
- good_to_have_skills: requirements marked as good to have/preferred/nice to have/plus
- Always return arrays for tech_stack, must_have_skills, good_to_have_skills — empty array [] if nothing found
- Return ONLY the JSON object, nothing else

Job Description:
${jd_text.slice(0, 4000)}`,
        },
      ],
    })

    // Extract the response content
    const rawContent = completion.choices[0]?.message?.content

    console.log('[parse-jd] raw response:', rawContent?.slice(0, 300))

    if (!rawContent) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      )
    }

    // Strip any markdown fences the model might have added
    const cleaned = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i,     '')
      .replace(/\s*```$/i,     '')
      .trim()

    // Parse JSON
    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('[parse-jd] JSON parse error:', parseErr)
      console.error('[parse-jd] raw content:', rawContent)
      return NextResponse.json(
        { error: 'AI returned invalid format. Please try again.' },
        { status: 500 }
      )
    }

    // Validate and sanitize the response
    const result = {
      role_title:          parsed.role_title          ?? null,
      company_name:        parsed.company_name        ?? null,
      location:            parsed.location            ?? null,
      salary_range:        parsed.salary_range        ?? null,
      employment_type:     parsed.employment_type     ?? null,
      experience_required: parsed.experience_required ?? null,
      tech_stack:          Array.isArray(parsed.tech_stack)          ? parsed.tech_stack          : [],
      must_have_skills:    Array.isArray(parsed.must_have_skills)    ? parsed.must_have_skills    : [],
      good_to_have_skills: Array.isArray(parsed.good_to_have_skills) ? parsed.good_to_have_skills : [],
    }

    return NextResponse.json(result)

  } catch (err: any) {
    console.error('[parse-jd] error:', err)

    // Handle Groq-specific errors
    if (err?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait a moment and try again.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to parse JD. Please try again.' },
      { status: 500 }
    )
  }
}