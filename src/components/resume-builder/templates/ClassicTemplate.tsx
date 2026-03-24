'use client'

import {
  Document, Page, Text, View, StyleSheet, Link, Font,
} from '@react-pdf/renderer'
import { ResumeData } from '@/types/resume'

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily:  'Helvetica',
    fontSize:    10,
    color:       '#1a1a1a',
    paddingTop:  36,
    paddingBottom: 36,
    paddingLeft: 48,
    paddingRight: 48,
    lineHeight:  1.4,
  },

  // Header
  header:        { marginBottom: 12 },
  name:          { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 4 },
  contactRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  contactText:   { fontSize: 9, color: '#555', marginRight: 12 },
  contactLink:   { fontSize: 9, color: '#2563EB', textDecoration: 'none' },

  // Section
  section:       { marginBottom: 10 },
  sectionTitle:  {
    fontSize:      10,
    fontFamily:    'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color:         '#374151',
    borderBottom:  '1 solid #D1D5DB',
    paddingBottom: 2,
    marginBottom:  6,
  },

  // Summary
  summary:       { fontSize: 9.5, color: '#374151', lineHeight: 1.5 },

  // Experience
  expHeader:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  expCompany:    { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111' },
  expDate:       { fontSize: 9, color: '#6B7280' },
  expRole:       { fontSize: 9.5, color: '#374151', marginBottom: 3 },
  bullet:        { flexDirection: 'row', marginBottom: 1.5, paddingLeft: 4 },
  bulletDot:     { fontSize: 9, marginRight: 5, color: '#6B7280' },
  bulletText:    { fontSize: 9, color: '#374151', flex: 1, lineHeight: 1.45 },

  // Education
  eduHeader:     { flexDirection: 'row', justifyContent: 'space-between' },
  eduInst:       { fontSize: 10, fontFamily: 'Helvetica-Bold' },
  eduDate:       { fontSize: 9, color: '#6B7280' },
  eduDegree:     { fontSize: 9.5, color: '#374151' },
  eduGpa:        { fontSize: 9, color: '#6B7280' },

  // Skills
  skillRow:      { flexDirection: 'row', marginBottom: 3 },
  skillLabel:    { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#374151', width: 80 },
  skillValue:    { fontSize: 9, color: '#4B5563', flex: 1 },

  // Projects
  projName:      { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111' },
  projDesc:      { fontSize: 9, color: '#6B7280', marginBottom: 2 },

  // Certifications
  certRow:       { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  certName:      { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  certMeta:      { fontSize: 9, color: '#6B7280' },

  // ATS keywords
  keywordsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  keyword:       {
    fontSize:    8,
    color:       '#374151',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },

  spacer: { marginBottom: 5 },
})

// ── Helper ────────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={S.section}>
      <Text style={S.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

// ── Template ──────────────────────────────────────────────────────────────────
export default function ClassicTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, projects, certifications, ats_keywords } = data

  const allSkills = [
    ...(skills.languages  ?? []),
    ...(skills.frameworks ?? []),
    ...(skills.databases  ?? []),
    ...(skills.tools      ?? []),
    ...(skills.other      ?? []),
  ]

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={S.header}>
          <Text style={S.name}>{personal.name}</Text>
          <View style={S.contactRow}>
            {personal.email    && <Text style={S.contactText}>{personal.email}</Text>}
            {personal.phone    && <Text style={S.contactText}>{personal.phone}</Text>}
            {personal.location && <Text style={S.contactText}>{personal.location}</Text>}
            {personal.linkedin && <Link src={`https://${personal.linkedin}`} style={S.contactLink}>{personal.linkedin}</Link>}
            {personal.github   && <Link src={`https://${personal.github}`}   style={S.contactLink}>{personal.github}</Link>}
            {personal.portfolio && <Link src={`https://${personal.portfolio}`} style={S.contactLink}>{personal.portfolio}</Link>}
          </View>
        </View>

        {/* ── Summary ────────────────────────────────────────────────────── */}
        {summary && (
          <Section title="Professional Summary">
            <Text style={S.summary}>{summary}</Text>
          </Section>
        )}

        {/* ── Experience ─────────────────────────────────────────────────── */}
        {experience.length > 0 && (
          <Section title="Experience">
            {experience.map((exp, i) => (
              <View key={i} style={{ marginBottom: i < experience.length - 1 ? 7 : 0 }}>
                <View style={S.expHeader}>
                  <Text style={S.expCompany}>{exp.company}</Text>
                  <Text style={S.expDate}>{exp.start} – {exp.end}</Text>
                </View>
                <Text style={S.expRole}>{exp.role}{exp.location ? ` · ${exp.location}` : ''}</Text>
                {exp.bullets.map((bullet, j) => (
                  <View key={j} style={S.bullet}>
                    <Text style={S.bulletDot}>•</Text>
                    <Text style={S.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </Section>
        )}

        {/* ── Education ──────────────────────────────────────────────────── */}
        {education.length > 0 && (
          <Section title="Education">
            {education.map((edu, i) => (
              <View key={i} style={{ marginBottom: i < education.length - 1 ? 5 : 0 }}>
                <View style={S.eduHeader}>
                  <Text style={S.eduInst}>{edu.institution}</Text>
                  <Text style={S.eduDate}>{edu.start} – {edu.end}</Text>
                </View>
                <Text style={S.eduDegree}>{edu.degree}</Text>
                {edu.gpa && <Text style={S.eduGpa}>GPA: {edu.gpa}</Text>}
              </View>
            ))}
          </Section>
        )}

        {/* ── Skills ─────────────────────────────────────────────────────── */}
        {allSkills.length > 0 && (
          <Section title="Skills">
            {skills.languages?.length  > 0 && <View style={S.skillRow}><Text style={S.skillLabel}>Languages</Text><Text style={S.skillValue}>{skills.languages.join(', ')}</Text></View>}
            {skills.frameworks?.length > 0 && <View style={S.skillRow}><Text style={S.skillLabel}>Frameworks</Text><Text style={S.skillValue}>{skills.frameworks.join(', ')}</Text></View>}
            {skills.databases?.length  > 0 && <View style={S.skillRow}><Text style={S.skillLabel}>Databases</Text><Text style={S.skillValue}>{skills.databases.join(', ')}</Text></View>}
            {skills.tools?.length      > 0 && <View style={S.skillRow}><Text style={S.skillLabel}>Tools</Text><Text style={S.skillValue}>{skills.tools.join(', ')}</Text></View>}
            {skills.other?.length      > 0 && <View style={S.skillRow}><Text style={S.skillLabel}>Other</Text><Text style={S.skillValue}>{skills.other.join(', ')}</Text></View>}
          </Section>
        )}

        {/* ── Projects ───────────────────────────────────────────────────── */}
        {projects.length > 0 && (
          <Section title="Projects">
            {projects.map((proj, i) => (
              <View key={i} style={{ marginBottom: i < projects.length - 1 ? 6 : 0 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={S.projName}>{proj.name}</Text>
                  {proj.link && <Link src={`https://${proj.link}`} style={S.contactLink}>{proj.link}</Link>}
                </View>
                <Text style={S.projDesc}>{proj.description}</Text>
                {proj.bullets.map((b, j) => (
                  <View key={j} style={S.bullet}>
                    <Text style={S.bulletDot}>•</Text>
                    <Text style={S.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </Section>
        )}

        {/* ── Certifications ─────────────────────────────────────────────── */}
        {certifications.length > 0 && (
          <Section title="Certifications">
            {certifications.map((cert, i) => (
              <View key={i} style={S.certRow}>
                <Text style={S.certName}>{cert.name}</Text>
                <Text style={S.certMeta}>{cert.issuer} · {cert.date}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* ── ATS Keywords ───────────────────────────────────────────────── */}
        {ats_keywords.length > 0 && (
          <Section title="Keywords">
            <View style={S.keywordsWrap}>
              {ats_keywords.map((kw, i) => (
                <Text key={i} style={S.keyword}>{kw}</Text>
              ))}
            </View>
          </Section>
        )}

      </Page>
    </Document>
  )
}