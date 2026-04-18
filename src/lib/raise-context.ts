export type OnboardingData = Record<string, string | string[]>

export type RaiseSnapshot = {
  stage: string | null
  projectType: string | null
  projectDescription: string | null
  competitiveAdvantage: string | null
  raiseAmount: string | null
  targetValuation: string | null
  targetCloseText: string | null
  targetCloseDate: Date | null
  daysToClose: number | null
  weeksToClose: number | null
  biggestBlocker: string | null
  raiseStatus: string | null
  raisedBefore: string | null
  totalRaised: string | null
  strongestProof: string[]
  teamSize: string | null
  cofounders: string | null
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

// End of quarter: Q1 → Mar 31, Q2 → Jun 30, Q3 → Sep 30, Q4 → Dec 31
const QUARTER_END_MONTH = [2, 5, 8, 11]

export function parseTargetClose(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const s = raw.toLowerCase().trim()

  const qMatch = s.match(/q([1-4])\s*(\d{4})/)
  if (qMatch) {
    const q = parseInt(qMatch[1], 10)
    const year = parseInt(qMatch[2], 10)
    const month = QUARTER_END_MONTH[q - 1]
    return new Date(year, month + 1, 0)
  }

  const monthMatch = s.match(
    /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*(\d{4})?/
  )
  if (monthMatch) {
    const monthIdx = MONTHS[monthMatch[1]]
    const now = new Date()
    let year = monthMatch[2] ? parseInt(monthMatch[2], 10) : now.getFullYear()
    if (!monthMatch[2] && monthIdx < now.getMonth()) year++
    return new Date(year, monthIdx + 1, 0)
  }

  const yearMatch = s.match(/(\d{4})/)
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10)
    if (year > 2000 && year < 2100) return new Date(year, 11, 31)
  }

  return null
}

export function buildRaiseSnapshot(data: OnboardingData | null | undefined): RaiseSnapshot {
  const get = (k: string) => {
    const v = data?.[k]
    return typeof v === 'string' ? v : null
  }
  const getArr = (k: string): string[] => {
    const v = data?.[k]
    return Array.isArray(v) ? v : []
  }

  const targetCloseText = get('target_close')
  const targetCloseDate = parseTargetClose(targetCloseText)
  let daysToClose: number | null = null
  let weeksToClose: number | null = null
  if (targetCloseDate) {
    const diff = targetCloseDate.getTime() - Date.now()
    daysToClose = Math.ceil(diff / (1000 * 60 * 60 * 24))
    weeksToClose = Math.ceil(daysToClose / 7)
  }

  return {
    stage: get('stage'),
    projectType: get('project_type'),
    projectDescription: get('project_description'),
    competitiveAdvantage: get('competitive_advantage'),
    raiseAmount: get('raise_amount'),
    targetValuation: get('target_valuation'),
    targetCloseText,
    targetCloseDate,
    daysToClose,
    weeksToClose,
    biggestBlocker: get('biggest_blocker'),
    raiseStatus: get('raise_status'),
    raisedBefore: get('raised_before'),
    totalRaised: get('total_raised'),
    strongestProof: getArr('strongest_proof'),
    teamSize: get('employees'),
    cofounders: get('cofounders'),
  }
}

export function formatCountdown(snap: RaiseSnapshot): string {
  if (!snap.targetCloseDate || snap.daysToClose === null) {
    return snap.targetCloseText ? `Targeting ${snap.targetCloseText}` : 'No close date set'
  }
  if (snap.daysToClose < 0) return `Past target — ${snap.targetCloseText ?? 'close date'}`
  if (snap.daysToClose === 0) return 'Close date is today'
  if (snap.daysToClose <= 14) return `${snap.daysToClose} days to close`
  if (snap.weeksToClose && snap.weeksToClose <= 12) return `${snap.weeksToClose} weeks to close`
  const months = Math.round((snap.daysToClose ?? 0) / 30)
  return `~${months} month${months === 1 ? '' : 's'} to close`
}

export function buildCoachSystemPrompt(
  snap: RaiseSnapshot,
  displayName: string,
  courseProgress: { courseTitle: string; pct: number; completed: number; total: number } | null
): string {
  const lines: string[] = [
    `You are Nozomi Coach — a direct, no-fluff fundraising advisor for Web3 founders. You speak the language of operators who have raised and deployed capital across DeFi, infrastructure, consumer, L1/L2, and RWA.`,
    ``,
    `TONE:`,
    `- Be blunt, specific, and operator-pragmatic. Don't hedge.`,
    `- Short paragraphs. Use bullets only when genuinely comparing options.`,
    `- Don't restate the question back to the user. Answer the first sentence.`,
    `- Never invent facts about investors, market data, or the founder's project. If you don't know, say so and ask.`,
    ``,
    `FOUNDER CONTEXT (from onboarding — treat as authoritative):`,
    `- Name: ${displayName}`,
  ]

  if (snap.projectType) lines.push(`- Sector: ${snap.projectType}`)
  if (snap.projectDescription) lines.push(`- What they're building: ${snap.projectDescription}`)
  if (snap.competitiveAdvantage) lines.push(`- Their edge: ${snap.competitiveAdvantage}`)
  if (snap.stage) lines.push(`- Product stage: ${snap.stage}`)
  if (snap.cofounders) lines.push(`- Co-founders: ${snap.cofounders}`)
  if (snap.teamSize) lines.push(`- Team size: ${snap.teamSize}`)
  if (snap.raisedBefore) lines.push(`- Raise history: ${snap.raisedBefore}`)
  if (snap.totalRaised) lines.push(`- Raised to date: ${snap.totalRaised}`)
  if (snap.strongestProof.length > 0) lines.push(`- Strongest proof: ${snap.strongestProof.join('; ')}`)
  if (snap.raiseStatus) lines.push(`- Current raise status: ${snap.raiseStatus}`)
  if (snap.raiseAmount) lines.push(`- Raising this round: ${snap.raiseAmount}`)
  if (snap.targetValuation) lines.push(`- Target valuation: ${snap.targetValuation}`)
  if (snap.targetCloseText) lines.push(`- Target close: ${snap.targetCloseText}${snap.daysToClose !== null ? ` (${snap.daysToClose} days out)` : ''}`)
  if (snap.biggestBlocker) lines.push(`- Self-reported biggest blocker: ${snap.biggestBlocker}`)

  if (courseProgress) {
    lines.push('')
    lines.push(`COURSE PROGRESS:`)
    lines.push(`- ${courseProgress.courseTitle}: ${courseProgress.pct}% complete (${courseProgress.completed}/${courseProgress.total} sections)`)
  }

  lines.push('')
  lines.push(`GUIDELINES:`)
  lines.push(`- When the founder asks about their raise (valuation, blockers, timing, outreach), use the context above — you already know their situation, don't ask them to repeat it.`)
  lines.push(`- If they ask something outside your knowledge (specific investor intel, live market data), say so plainly.`)
  lines.push(`- Recommend concrete next actions with timeboxes ("spend 2 hours rewriting slide 7 this week") over abstract advice.`)
  lines.push(`- If they ask something generic, tie the answer back to their specific stage and blocker.`)

  return lines.join('\n')
}
