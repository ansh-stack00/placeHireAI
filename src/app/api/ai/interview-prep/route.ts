import OpenAI from "openai";
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const client = new OpenAI({
  apiKey:   process.env.GROQ_API_KEY,
  baseURL:  "https://api.groq.com/openai/v1",
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { application_id, company_name, role_title, jd_snapshot } = await req.json()

    if (!company_name || !role_title) {
      return NextResponse.json(
        { error: 'company_name and role_title required' },
        { status: 400 }
      )
    }

    // Check cache — but skip if it was cached as empty/broken {}
    if (application_id) {
      const { data: cached } = await supabase
        .from('ai_prep_cache')
        .select('*')
        .eq('application_id', application_id)
        .maybeSingle()

      if (cached) {
        try {
          const parsedQ = JSON.parse(cached.questions_json)
          const parsedC = JSON.parse(cached.company_context)

          // Only use cache if it has actual questions
          const hasQuestions =
            parsedQ.dsa?.length > 0 ||
            parsedQ.system_design?.length > 0 ||
            parsedQ.role_specific?.length > 0 ||
            parsedQ.hr_behavioral?.length > 0

          if (hasQuestions) {
            return NextResponse.json({
              ...parsedQ,
              company_context: parsedC,
              from_cache: true,
            })
          }

          // Cache was empty/broken — delete it and regenerate
          await supabase
            .from('ai_prep_cache')
            .delete()
            .eq('application_id', application_id)

          console.log('[interview-prep] deleted empty cache, regenerating...')
        } catch {
          // Cache was malformed JSON — delete and regenerate
          await supabase
            .from('ai_prep_cache')
            .delete()
            .eq('application_id', application_id)
        }
      }
    }

    // Call Groq
    const completion = await client.chat.completions.create({
      model:      'llama-3.3-70b-versatile',
      max_tokens: 2048,
      messages: [{
        role:    'user',
        content: `You are an expert interview coach preparing a candidate for ${role_title} at ${company_name}.
${jd_snapshot ? `\nJob Description:\n${jd_snapshot.slice(0, 2000)}\n` : ''}

Return ONLY valid JSON, no markdown fences, no explanation, nothing else before or after the JSON.

{
  "dsa": [
    { "q": "question text", "hint": "approach in 1 sentence" }
  ],
  "system_design": [
    { "q": "question text", "hint": "key things to cover" }
  ],
  "role_specific": [
    { "q": "question text", "hint": "what they want to hear" }
  ],
  "hr_behavioral": [
    { "q": "question text", "hint": "STAR format tip" }
  ],
  "company_context": {
    "overview": "2-3 sentences about ${company_name} engineering",
    "interview_style": "what their interview process typically looks like",
    "things_to_research": ["specific thing 1", "specific thing 2", "specific thing 3"]
  }
}

Rules:
- 4-5 questions per category, no more
- DSA questions should match seniority of ${role_title}
- System design questions should reflect ${company_name} actual scale and domain
- Be specific to ${company_name}, not generic
- Return ONLY the JSON object, nothing else`,
      }],
    })
    const rawContent = completion.choices[0].message.content

    console.log('[interview-prep] raw response:', rawContent?.slice(0, 200))

    if (!rawContent) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 })
    }

    // Strip markdown fences if model added them despite instructions
    const cleaned = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    let result
    try {
      result = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('[interview-prep] JSON parse error:', parseErr)
      console.error('[interview-prep] raw content was:', rawContent)
      return NextResponse.json(
        { error: 'AI returned invalid JSON — please try again' },
        { status: 500 }
      )
    }

    // Validate the result has at least some questions
    if (!result.dsa && !result.system_design && !result.role_specific && !result.hr_behavioral) {
      console.error('[interview-prep] result has no questions:', result)
      return NextResponse.json(
        { error: 'AI returned unexpected format — please try again' },
        { status: 500 }
      )
    }

    // Cache the result
    if (application_id) {
      await supabase
        .from('ai_prep_cache')
        .upsert({
          application_id,
          questions_json:  JSON.stringify(result),
          company_context: JSON.stringify(result.company_context ?? {}),
        })
    }

    return NextResponse.json(result)

  } catch (err: any) {
    console.error('[interview-prep] error:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Failed to generate prep' },
      { status: 500 }
    )
  }
}