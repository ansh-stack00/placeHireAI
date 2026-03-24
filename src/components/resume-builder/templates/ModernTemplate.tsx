'use client'

import {
  Document, Page, Text, View, StyleSheet, Link,
} from '@react-pdf/renderer'
import { ResumeData } from '@/types/resume'

const ACCENT = '#534AB7'
const LIGHT  = '#EEEDFE'

const S = StyleSheet.create({
  page: {
    fontFamily:   'Helvetica',
    fontSize:     9.5,
    color:        '#1a1a1a',
    flexDirection: 'row',
  },

  // Left sidebar
  sidebar: {
    width:           200,
    backgroundColor: '#1e1b4b',
    paddingTop:      32,
    paddingBottom:   32,
    paddingLeft:     20,
    paddingRight:    20,
    color:           '#e2e8f0',
  },
  sidebarName:    { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#fff', marginBottom: 4, lineHeight: 1.2 },
  sidebarRole:    { fontSize: 10, color: '#a5b4fc', marginBottom: 16 },
  sidebarSection: { marginBottom: 14 },
  sidebarTitle:   {
    fontSize:      8,
    fontFamily:    'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color:         '#818cf8',
    marginBottom:  6,
    borderBottom:  '0.5 solid #4c1d95',
    paddingBottom: 3,
  },
  sidebarText:    { fontSize: 8.5, color: '#cbd5e1', marginBottom: 2.5, lineHeight: 1.4 },
  sidebarLink:    { fontSize: 8, color: '#a5b4fc', textDecoration: 'none', marginBottom: 2 },
  skillPill:      {
    fontSize:        8,
    color:           '#e2e8f0',
    backgroundColor: '#312e81',
    paddingHorizontal: 6,
    paddingVertical:  2,
    borderRadius:     3,
    marginBottom:     3,
    marginRight:      3,
  },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap' },

  // Main content
  main: {
    flex:          1,
    paddingTop:    32,
    paddingBottom: 32,
    paddingLeft:   24,
    paddingRight:  24,
  },
  section:      { marginBottom: 12 },
  sectionTitle: {
    fontSize:      9,
    fontFamily:    'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color:         ACCENT,
    borderBottom:  `1 solid ${ACCENT}`,
    paddingBottom: 2,
    marginBottom:  6,
  },

  // Summary
  summary: { fontSize: 9, color: '#374151', lineHeight: 1.55 },

  // Experience
  expHeader:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  expCompany: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#111' },
  expDate:    { fontSize: 8.5, color: '#9CA3AF' },
  expRole:    { fontSize: 9, color: ACCENT, marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  bullet:     { flexDirection: 'row', marginBottom: 1.5 },
  bulletDot:  { fontSize: 8.5, marginRight: 4, color: ACCENT },
  bulletText: { fontSize: 8.5, color: '#374151', flex: 1, lineHeight: 1.45 },

  // Education
  eduInst:   { fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  eduDegree: { fontSize: 9, color: '#374151' },
  eduMeta:   { fontSize: 8.5, color: '#9CA3AF', marginTop: 1 },

  // Projects
  projName:  { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#111' },
  projDesc:  { fontSize: 8.5, color: '#6B7280', marginBottom: 2 },
  projLink:  { fontSize: 8, color: ACCENT, textDecoration: 'none' },

  // Keywords
  kwWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  kw:     {
    fontSize:    7.5,
    color:       ACCENT,
    borderWidth: 0.5,
    borderColor: ACCENT,
    paddingHorizontal: 5,
    paddingVertical:   1.5,
    borderRadius: 10,
  },
})

function MainSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={S.section}>
      <Text style={S.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

export default function ModernTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, projects, certifications, ats_keywords } = data

  const allSkills = [
    ...(skills.languages  ?? []),
    ...(skills.frameworks ?? []),
    ...(skills.databases  ?? []),
    ...(skills.tools      ?? []),
    ...(skills.other      ?? []),
  ]

  const currentRole = experience[0]?.role ?? ''

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <View style={S.sidebar}>
          <Text style={S.sidebarName}>{personal.name}</Text>
          {currentRole && <Text style={S.sidebarRole}>{currentRole}</Text>}

          {/* Contact */}
          <View style={S.sidebarSection}>
            <Text style={S.sidebarTitle}>Contact</Text>
            {personal.email    && <Text style={S.sidebarText}>{personal.email}</Text>}
            {personal.phone    && <Text style={S.sidebarText}>{personal.phone}</Text>}
            {personal.location && <Text style={S.sidebarText}>{personal.location}</Text>}
            {personal.linkedin && <Link src={`https://${personal.linkedin}`} style={S.sidebarLink}>{personal.linkedin}</Link>}
            {personal.github   && <Link src={`https://${personal.github}`}   style={S.sidebarLink}>{personal.github}</Link>}
            {personal.portfolio && <Link src={`https://${personal.portfolio}`} style={S.sidebarLink}>{personal.portfolio}</Link>}
          </View>

          {/* Skills */}
          {allSkills.length > 0 && (
            <View style={S.sidebarSection}>
              <Text style={S.sidebarTitle}>Skills</Text>
              <View style={S.skillsWrap}>
                {allSkills.map((skill, i) => (
                  <Text key={i} style={S.skillPill}>{skill}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Education on sidebar */}
          {education.length > 0 && (
            <View style={S.sidebarSection}>
              <Text style={S.sidebarTitle}>Education</Text>
              {education.map((edu, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Text style={{ ...S.sidebarText, fontFamily: 'Helvetica-Bold', color: '#fff' }}>
                    {edu.institution}
                  </Text>
                  <Text style={S.sidebarText}>{edu.degree}</Text>
                  <Text style={{ ...S.sidebarText, color: '#818cf8' }}>
                    {edu.start} – {edu.end}
                  </Text>
                  {edu.gpa && <Text style={S.sidebarText}>GPA: {edu.gpa}</Text>}
                </View>
              ))}
            </View>
          )}

          {/* Certifications on sidebar */}
          {certifications.length > 0 && (
            <View style={S.sidebarSection}>
              <Text style={S.sidebarTitle}>Certifications</Text>
              {certifications.map((cert, i) => (
                <View key={i} style={{ marginBottom: 5 }}>
                  <Text style={{ ...S.sidebarText, fontFamily: 'Helvetica-Bold', color: '#fff' }}>
                    {cert.name}
                  </Text>
                  <Text style={{ ...S.sidebarText, color: '#818cf8' }}>
                    {cert.issuer} · {cert.date}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Main ────────────────────────────────────────────────────── */}
        <View style={S.main}>

          {/* Summary */}
          {summary && (
            <MainSection title="Professional Summary">
              <Text style={S.summary}>{summary}</Text>
            </MainSection>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <MainSection title="Experience">
              {experience.map((exp, i) => (
                <View key={i} style={{ marginBottom: i < experience.length - 1 ? 8 : 0 }}>
                  <View style={S.expHeader}>
                    <Text style={S.expCompany}>{exp.company}</Text>
                    <Text style={S.expDate}>{exp.start} – {exp.end}</Text>
                  </View>
                  <Text style={S.expRole}>{exp.role}</Text>
                  {exp.bullets.map((b, j) => (
                    <View key={j} style={S.bullet}>
                      <Text style={S.bulletDot}>▸</Text>
                      <Text style={S.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </MainSection>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <MainSection title="Projects">
              {projects.map((proj, i) => (
                <View key={i} style={{ marginBottom: i < projects.length - 1 ? 6 : 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={S.projName}>{proj.name}</Text>
                    {proj.link && <Link src={`https://${proj.link}`} style={S.projLink}>{proj.link}</Link>}
                  </View>
                  <Text style={S.projDesc}>{proj.description}</Text>
                  {proj.bullets.map((b, j) => (
                    <View key={j} style={S.bullet}>
                      <Text style={S.bulletDot}>▸</Text>
                      <Text style={S.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </MainSection>
          )}

          {/* ATS Keywords */}
          {ats_keywords.length > 0 && (
            <MainSection title="ATS Keywords">
              <View style={S.kwWrap}>
                {ats_keywords.map((kw, i) => (
                  <Text key={i} style={S.kw}>{kw}</Text>
                ))}
              </View>
            </MainSection>
          )}

        </View>
      </Page>
    </Document>
  )
}