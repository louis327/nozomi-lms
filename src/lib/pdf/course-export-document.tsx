import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { ExtractedAnswer } from '@/lib/answer-extract'

Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/opensans/v35/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVI.ttf', fontWeight: 400, fontStyle: 'normal' },
    { src: 'https://fonts.gstatic.com/s/opensans/v35/memQYaGs126MiZpBA-UvXbMYjeslDdKEfQm2beLyeb5T.ttf', fontWeight: 400, fontStyle: 'italic' },
    { src: 'https://fonts.gstatic.com/s/opensans/v35/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsg-1x4gaVI.ttf', fontWeight: 600, fontStyle: 'normal' },
    { src: 'https://fonts.gstatic.com/s/opensans/v35/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ5x4gaVI.ttf', fontWeight: 700, fontStyle: 'normal' },
    { src: 'https://fonts.gstatic.com/s/opensans/v35/memQYaGs126MiZpBA-UvXbMYjeslHdKEfQm2beLyeb5T.ttf', fontWeight: 700, fontStyle: 'italic' },
  ],
})

Font.register({
  family: 'JetBrains Mono',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.ttf', fontWeight: 500 },
  ],
})

const COLOR = {
  ink: '#141414',
  inkSoft: '#5a5956',
  inkMuted: '#9a9892',
  inkFaint: '#c2bfb8',
  accent: '#e91e63',
  accentDeep: '#c2185b',
  accentSoft: '#f9d6e2',
  line: '#e8e2d8',
  lineSoft: '#efeae0',
  surface: '#ffffff',
  surfaceMuted: '#f4efe8',
  canvas: '#faf6f1',
  success: '#16a34a',
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Open Sans',
    fontSize: 10.5,
    color: COLOR.ink,
    paddingTop: 54,
    paddingBottom: 68,
    paddingHorizontal: 64,
    lineHeight: 1.55,
    backgroundColor: COLOR.surface,
  },
  coverPage: {
    fontFamily: 'Open Sans',
    color: COLOR.ink,
    backgroundColor: COLOR.canvas,
    padding: 64,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  coverBrand: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9.5,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: COLOR.inkMuted,
  },
  coverEyebrow: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: COLOR.accent,
    marginBottom: 16,
  },
  coverTitle: {
    fontFamily: 'Open Sans',
    fontStyle: 'italic',
    fontWeight: 700,
    fontSize: 52,
    lineHeight: 1.02,
    letterSpacing: -1.2,
    color: COLOR.ink,
    marginBottom: 28,
  },
  coverSub: {
    fontSize: 12.5,
    lineHeight: 1.6,
    color: COLOR.inkSoft,
    maxWidth: 420,
  },
  coverMeta: {
    borderTop: `1pt solid ${COLOR.line}`,
    paddingTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverMetaLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLOR.inkMuted,
    marginBottom: 4,
  },
  coverMetaValue: {
    fontSize: 11.5,
    color: COLOR.ink,
    fontWeight: 600,
  },
  sectionBreak: {
    marginTop: 32,
  },
  moduleHeader: {
    marginTop: 32,
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: `1pt solid ${COLOR.line}`,
  },
  moduleEyebrow: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLOR.inkMuted,
    marginBottom: 5,
  },
  moduleTitle: {
    fontFamily: 'Open Sans',
    fontStyle: 'italic',
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: -0.5,
    color: COLOR.ink,
    lineHeight: 1.1,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
  },
  sectionEyebrow: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLOR.accent,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: 'Open Sans',
    fontStyle: 'italic',
    fontWeight: 700,
    fontSize: 15.5,
    letterSpacing: -0.3,
    color: COLOR.ink,
    lineHeight: 1.15,
  },
  promptBlock: {
    marginTop: 16,
    marginBottom: 6,
  },
  promptLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 7.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLOR.accent,
    marginBottom: 6,
  },
  answerText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: COLOR.ink,
    paddingLeft: 10,
    borderLeft: `1.5pt solid ${COLOR.lineSoft}`,
  },
  answerEmpty: {
    fontSize: 10,
    fontStyle: 'italic',
    color: COLOR.inkFaint,
  },
  fieldRow: {
    flexDirection: 'row',
    borderBottom: `0.5pt solid ${COLOR.lineSoft}`,
    paddingVertical: 5,
  },
  fieldLabel: {
    width: '40%',
    fontSize: 9.5,
    color: COLOR.inkSoft,
  },
  fieldValue: {
    flex: 1,
    fontSize: 10.5,
    color: COLOR.ink,
  },
  table: {
    borderRadius: 3,
    border: `0.75pt solid ${COLOR.line}`,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLOR.surfaceMuted,
    borderBottom: `0.5pt solid ${COLOR.line}`,
  },
  tableHeaderCell: {
    flex: 1,
    fontFamily: 'JetBrains Mono',
    fontSize: 7.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLOR.inkMuted,
    padding: 7,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `0.25pt solid ${COLOR.lineSoft}`,
  },
  tableCell: {
    flex: 1,
    fontSize: 9.5,
    padding: 7,
    color: COLOR.ink,
  },
  tableCellLabel: {
    fontWeight: 600,
    color: COLOR.inkSoft,
  },
  checklistItem: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: COLOR.line,
    marginRight: 8,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLOR.accent,
    borderColor: COLOR.accent,
  },
  checkboxTick: {
    color: COLOR.surface,
    fontSize: 8,
    fontWeight: 700,
  },
  checklistLabel: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 1.5,
    color: COLOR.ink,
  },
  checklistLabelUnchecked: {
    color: COLOR.inkMuted,
  },
  ccSubtitle: {
    fontSize: 10,
    lineHeight: 1.55,
    color: COLOR.inkSoft,
    marginBottom: 8,
  },
  ccMeta: {
    fontFamily: 'JetBrains Mono',
    fontSize: 7.5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: COLOR.inkMuted,
    marginBottom: 10,
  },
  ccGroupHeading: {
    fontFamily: 'JetBrains Mono',
    fontSize: 7.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLOR.inkMuted,
    marginTop: 10,
    marginBottom: 6,
  },
  ccItemHint: {
    marginTop: 2,
    fontSize: 9,
    color: COLOR.inkFaint,
    lineHeight: 1.4,
  },
  emptySection: {
    fontSize: 10,
    fontStyle: 'italic',
    color: COLOR.inkFaint,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 64,
    right: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    letterSpacing: 1.5,
    color: COLOR.inkFaint,
    textTransform: 'uppercase',
    paddingTop: 12,
    borderTop: `0.5pt solid ${COLOR.lineSoft}`,
  },
  contentsTitle: {
    fontFamily: 'Open Sans',
    fontStyle: 'italic',
    fontWeight: 700,
    fontSize: 26,
    letterSpacing: -0.5,
    color: COLOR.ink,
    marginBottom: 6,
  },
  contentsEyebrow: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: COLOR.accent,
    marginBottom: 6,
  },
  tocRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottom: `0.5pt solid ${COLOR.lineSoft}`,
  },
  tocIndex: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    letterSpacing: 1.5,
    color: COLOR.inkMuted,
    width: 40,
  },
  tocModuleTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: 600,
    color: COLOR.ink,
  },
  tocSectionCount: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: COLOR.inkMuted,
  },
})

export type ExportSection = {
  id: string
  title: string
  answers: ExtractedAnswer[]
  completedAt: string | null
}

export type ExportModule = {
  id: string
  title: string
  sections: ExportSection[]
}

export type ExportData = {
  courseTitle: string
  founderName: string
  completedOn: string
  modules: ExportModule[]
}

function Footer({ courseTitle }: { courseTitle: string }) {
  return (
    <View fixed style={styles.footer}>
      <Text>Nozomi</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      <Text>{courseTitle}</Text>
    </View>
  )
}

function AnswerView({ answer }: { answer: ExtractedAnswer }) {
  return (
    <View style={styles.promptBlock} wrap={false}>
      <Text style={styles.promptLabel}>{answer.prompt}</Text>
      {renderAnswerBody(answer)}
    </View>
  )
}

function renderAnswerBody(answer: ExtractedAnswer) {
  switch (answer.kind) {
    case 'text': {
      if (!answer.answer.trim()) {
        return <Text style={styles.answerEmpty}>No response recorded.</Text>
      }
      return <Text style={styles.answerText}>{answer.answer}</Text>
    }

    case 'fields':
      return (
        <View>
          {answer.fields.map((f, i) => (
            <View key={i} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <Text style={styles.fieldValue}>
                {f.value || '—'}
              </Text>
            </View>
          ))}
        </View>
      )

    case 'table':
      return (
        <View style={styles.table}>
          {answer.columns.length > 0 && (
            <View style={styles.tableHeaderRow}>
              {answer.columns.map((c, i) => (
                <Text key={i} style={styles.tableHeaderCell}>
                  {c}
                </Text>
              ))}
            </View>
          )}
          {answer.rows.map((row, ri) => (
            <View key={ri} style={styles.tableRow}>
              {row.map((cell, ci) => (
                <Text
                  key={ci}
                  style={[
                    styles.tableCell,
                    !cell.editable ? styles.tableCellLabel : {},
                  ]}
                >
                  {cell.value || (cell.editable ? '—' : '')}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )

    case 'checklist':
      return (
        <View>
          {answer.items.map((item, i) => (
            <View key={i} style={styles.checklistItem}>
              <View
                style={[
                  styles.checkbox,
                  item.checked ? styles.checkboxChecked : {},
                ]}
              >
                {item.checked && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text
                style={[
                  styles.checklistLabel,
                  item.checked ? {} : styles.checklistLabelUnchecked,
                ]}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      )

    case 'completion_checklist': {
      const allItems = answer.groups.flatMap((g) => g.items)
      const totalCount = allItems.length
      const checkedCount = allItems.filter((i) => i.checked).length
      return (
        <View>
          {answer.subtitle ? (
            <Text style={styles.ccSubtitle}>{answer.subtitle}</Text>
          ) : null}
          <Text style={styles.ccMeta}>
            {checkedCount} / {totalCount} checked
          </Text>
          {answer.groups.map((g, gi) => (
            <View key={gi}>
              {g.heading ? (
                <Text style={styles.ccGroupHeading}>{g.heading}</Text>
              ) : null}
              {g.items.map((item, ii) => (
                <View key={ii} style={styles.checklistItem} wrap={false}>
                  <View
                    style={[
                      styles.checkbox,
                      item.checked ? styles.checkboxChecked : {},
                    ]}
                  >
                    {item.checked && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.checklistLabel,
                        item.checked ? {} : styles.checklistLabelUnchecked,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.hint ? (
                      <Text style={styles.ccItemHint}>{item.hint}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      )
    }
  }
}

export function CourseExportDocument({ data }: { data: ExportData }) {
  const { courseTitle, founderName, completedOn, modules } = data

  return (
    <Document
      title={`${courseTitle} — Nozomi workbook`}
      author={founderName}
      creator="Nozomi"
      producer="Nozomi"
    >
      {/* Cover */}
      <Page size="A4" style={styles.coverPage}>
        <View>
          <Text style={styles.coverBrand}>Nozomi · Workbook export</Text>
        </View>

        <View>
          <Text style={styles.coverEyebrow}>Completed workbook</Text>
          <Text style={styles.coverTitle}>{courseTitle}</Text>
          <Text style={styles.coverSub}>
            A complete record of the prompts, frameworks and responses you
            worked through across this course.
          </Text>
        </View>

        <View style={styles.coverMeta}>
          <View>
            <Text style={styles.coverMetaLabel}>Founder</Text>
            <Text style={styles.coverMetaValue}>{founderName}</Text>
          </View>
          <View>
            <Text style={styles.coverMetaLabel}>Completed</Text>
            <Text style={styles.coverMetaValue}>{completedOn}</Text>
          </View>
          <View>
            <Text style={styles.coverMetaLabel}>Modules</Text>
            <Text style={styles.coverMetaValue}>{modules.length}</Text>
          </View>
        </View>
      </Page>

      {/* Contents */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.contentsEyebrow}>Contents</Text>
        <Text style={styles.contentsTitle}>What you worked on</Text>
        <View style={{ marginTop: 24 }}>
          {modules.map((m, i) => (
            <View key={m.id} style={styles.tocRow}>
              <Text style={styles.tocIndex}>
                M{String(i + 1).padStart(2, '0')}
              </Text>
              <Text style={styles.tocModuleTitle}>{m.title}</Text>
              <Text style={styles.tocSectionCount}>
                {m.sections.length}{' '}
                {m.sections.length === 1 ? 'section' : 'sections'}
              </Text>
            </View>
          ))}
        </View>
        <Footer courseTitle={courseTitle} />
      </Page>

      {/* Modules */}
      <Page size="A4" style={styles.page}>
        {modules.map((mod, mi) => (
          <View key={mod.id} break={mi > 0}>
            <View style={styles.moduleHeader}>
              <Text style={styles.moduleEyebrow}>
                Module {String(mi + 1).padStart(2, '0')}
              </Text>
              <Text style={styles.moduleTitle}>{mod.title}</Text>
            </View>

            {mod.sections.length === 0 ? (
              <Text style={styles.emptySection}>No sections recorded.</Text>
            ) : (
              mod.sections.map((sec, si) => (
                <View key={sec.id} wrap>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionEyebrow}>
                      S{String(si + 1).padStart(2, '0')}
                      {sec.completedAt &&
                        ` · Completed ${new Date(
                          sec.completedAt,
                        ).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}`}
                    </Text>
                    <Text style={styles.sectionTitle}>{sec.title}</Text>
                  </View>

                  {sec.answers.length === 0 ? (
                    <Text style={styles.emptySection}>
                      This section had no prompts to respond to.
                    </Text>
                  ) : (
                    sec.answers.map((a, ai) => (
                      <AnswerView key={ai} answer={a} />
                    ))
                  )}
                </View>
              ))
            )}
          </View>
        ))}
        <Footer courseTitle={courseTitle} />
      </Page>
    </Document>
  )
}
