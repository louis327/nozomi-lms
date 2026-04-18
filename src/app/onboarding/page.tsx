'use client'

import { Suspense, useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ─── Questions ───────────────────────────────────────────────────────────────

type StepType = 'single' | 'text' | 'multi' | 'group'

interface SubQuestion {
  id: string
  label: string
  options: string[]
}

interface Step {
  id: string
  title: string
  subtitle?: string
  type: StepType
  options?: string[]
  subQuestions?: SubQuestion[]
  maxLength?: number
  placeholder?: string
  examples?: string[]
  optional?: boolean
  // Dossier override — if set, use this label on the dossier pane
  dossierLabel?: string
  // Grid preference for options
  columns?: 2 | 3 | 4
}

const STEPS: Step[] = [
  {
    id: 'project_type',
    title: 'What type of project are you building?',
    subtitle: 'Tap one — or press its number.',
    type: 'single',
    dossierLabel: 'Sector',
    columns: 3,
    options: [
      'DeFi (DEX, lending, yield, stablecoins)',
      'Infrastructure (middleware, tooling, oracles, bridges)',
      'L1 or L2 (base chains, rollups, app-chains)',
      'Consumer (social, creator, identity, wallets)',
      'GameFi',
      'AI \u00d7 Crypto',
      'DePIN',
      'RWA (real-world assets)',
      'Other',
    ],
  },
  {
    id: 'project_description',
    title: 'In one sentence, what does your project do and who is it for?',
    subtitle: 'No jargon. Write it how you\u2019d explain it to a smart friend who doesn\u2019t live in crypto.',
    type: 'text',
    dossierLabel: 'Pitch',
    maxLength: 280,
    placeholder: 'We help...',
    examples: [
      'We give GameFi studios the infrastructure to let players rent in-game assets to each other on-chain.',
      'We help institutional traders move stablecoins between chains in under 10 seconds without exposing them to bridge risk.',
      'We\u2019re building a self-custody wallet for people who have never used crypto before \u2014 no seed phrases, no gas fees.',
    ],
  },
  {
    id: 'competitive_advantage',
    title: 'Compared to your competition, what makes you different?',
    subtitle: 'One sentence. Be specific. \u201cFaster and cheaper\u201d is what everyone says \u2014 it\u2019s not an answer.',
    type: 'text',
    dossierLabel: 'Edge',
    maxLength: 280,
    placeholder: 'Unlike...',
    examples: [
      'Unlike MetaMask, users never see a seed phrase \u2014 recovery is handled through social accounts they already trust.',
      'We\u2019re the first bridge where assets never leave the source chain \u2014 we match buyers and sellers instead of wrapping tokens.',
    ],
  },
  {
    id: 'stage',
    title: 'What stage are you at?',
    subtitle: 'Tap one.',
    type: 'single',
    dossierLabel: 'Stage',
    columns: 3,
    options: [
      'Idea only, no product built yet',
      'Building MVP (not live)',
      'MVP live on testnet',
      'MVP live on mainnet, early users',
      'Growing traction (revenue, TVL, or active users)',
      'Post-TGE',
    ],
  },
  {
    id: 'team',
    title: 'Team size',
    subtitle: 'Two quick ones.',
    type: 'group',
    subQuestions: [
      {
        id: 'cofounders',
        label: 'Co-founders, including you',
        options: [
          'Just me (solo founder)',
          '2 co-founders',
          '3 co-founders',
          '4 or more co-founders',
        ],
      },
      {
        id: 'employees',
        label: 'Full-time, including founders',
        options: ['1 (just me)', '2\u20133', '4\u20136', '7\u201312', '13\u201325', '25+'],
      },
    ],
  },
  {
    id: 'raised_before',
    title: 'Have you raised capital before?',
    subtitle: 'Tap one.',
    type: 'single',
    dossierLabel: 'Raise history',
    columns: 3,
    options: [
      'Never raised anything',
      'Grants or ecosystem funding only',
      'Angel round (under $500k)',
      'Pre-seed or seed (over $500k)',
      'Series A or later',
      'Previously raised, now raising again',
    ],
  },
  {
    id: 'total_raised',
    title: 'How much have you raised to date, across all rounds?',
    subtitle: 'Tap one.',
    type: 'single',
    dossierLabel: 'Total raised',
    columns: 3,
    options: ['$0', 'Under $250k', '$250k \u2013 $1M', '$1M \u2013 $3M', '$3M \u2013 $10M', '$10M+'],
  },
  {
    id: 'strongest_proof',
    title: 'What\u2019s your strongest proof point right now?',
    subtitle: 'Select all that apply \u2014 press Enter when you\u2019re done.',
    type: 'multi',
    dossierLabel: 'Proof',
    columns: 2,
    options: [
      'Revenue or protocol fees (actual dollars coming in)',
      'TVL or assets under management',
      'Active users or wallets (people coming back, not one-time connects)',
      'Signed partnerships, LOIs, or integrations',
      'Waitlist or community size (Discord, X followers, email list)',
      'Testnet metrics or beta traction',
      'Named advisors or angel investors already committed',
      'Team credentials and track record (pre-product)',
      'Nothing concrete yet, we\u2019re pre-everything',
    ],
  },
  {
    id: 'raise_status',
    title: 'Where are you in your current raise?',
    subtitle: 'Tap one.',
    type: 'single',
    dossierLabel: 'Status',
    columns: 2,
    options: [
      'Haven\u2019t started thinking about it seriously',
      'Building the plan, deck not ready yet',
      'Deck ready, haven\u2019t pitched anyone yet',
      'First few meetings booked',
      'Actively pitching (5\u201310 meetings done)',
      'Pitched 10+ investors, conversion is low',
      'Have soft commits, trying to close',
      'Recently closed, planning next round',
    ],
  },
  {
    id: 'raise_amount',
    title: 'How much are you raising this round?',
    subtitle: 'Ballpark is fine.',
    type: 'text',
    dossierLabel: 'Raise amount',
    maxLength: 50,
    placeholder: 'e.g. $2M',
    examples: ['$500k', '$2M', '$5M', '$15M'],
  },
  {
    id: 'target_valuation',
    title: 'What valuation are you targeting?',
    subtitle: 'Pick the closest range or \u201cNot sure yet\u201d \u2014 that\u2019s a valid answer.',
    type: 'single',
    dossierLabel: 'Valuation',
    columns: 4,
    options: [
      'Under $5M',
      '$5M \u2013 $15M',
      '$15M \u2013 $30M',
      '$30M \u2013 $50M',
      '$50M \u2013 $100M',
      '$100M+',
      'Not sure yet',
    ],
  },
  {
    id: 'target_close',
    title: 'When are you targeting close?',
    subtitle: 'A specific month or quarter beats \u201cASAP.\u201d',
    type: 'text',
    dossierLabel: 'Target close',
    maxLength: 50,
    placeholder: 'e.g. Q2 2026',
    examples: ['January 2026', 'Q2 2026', 'By TGE in June'],
  },
  {
    id: 'biggest_blocker',
    title: 'What\u2019s the single biggest thing blocking your raise right now?',
    subtitle: 'Pick the most honest answer \u2014 this is how we prioritise what to surface for you.',
    type: 'single',
    dossierLabel: 'Biggest blocker',
    columns: 2,
    options: [
      'I don\u2019t know how much to raise or at what valuation',
      'I don\u2019t have a deck yet',
      'My deck isn\u2019t converting meetings into interest',
      'I can\u2019t get meetings \u2014 nobody replies to outreach',
      'I\u2019m getting meetings but no commits',
      'I had soft commits and they went cold',
      'My tokenomics isn\u2019t clear',
      'My team has a gap (technical, commercial, or credibility)',
      'My community or GTM story is weak',
      'I\u2019m not sure if I should raise from VCs, community, or both',
      'Something else',
    ],
  },
  {
    id: 'course_feedback',
    title: 'What would make this course genuinely useful to you?',
    subtitle: 'The more specific, the better.',
    type: 'text',
    dossierLabel: 'What you asked for',
    maxLength: 280,
    optional: true,
    placeholder: 'e.g. I need to fix my tokenomics slide before a call with Multicoin next week',
  },
]

const TOTAL = STEPS.length

// ─── Acts ────────────────────────────────────────────────────────────────────

type Act = { roman: string; name: string; startIndex: number; fields: string[] }

const ACTS: Act[] = [
  { roman: 'I', name: 'The Project', startIndex: 0, fields: ['project_type', 'project_description', 'competitive_advantage'] },
  { roman: 'II', name: 'The Team', startIndex: 3, fields: ['stage', 'cofounders', 'employees'] },
  { roman: 'III', name: 'The Record', startIndex: 5, fields: ['raised_before', 'total_raised', 'strongest_proof'] },
  { roman: 'IV', name: 'The Raise', startIndex: 8, fields: ['raise_status', 'raise_amount', 'target_valuation', 'target_close'] },
  { roman: 'V', name: 'The Blocker', startIndex: 12, fields: ['biggest_blocker', 'course_feedback'] },
]

function actForStep(step: number): Act {
  for (let i = ACTS.length - 1; i >= 0; i--) {
    if (step >= ACTS[i].startIndex) return ACTS[i]
  }
  return ACTS[0]
}

function isActBoundary(step: number): boolean {
  return ACTS.some((a) => a.startIndex === step)
}

// ─── Dossier field labels ────────────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  project_type: 'Sector',
  project_description: 'Pitch',
  competitive_advantage: 'Edge',
  stage: 'Stage',
  cofounders: 'Co-founders',
  employees: 'Team size',
  raised_before: 'Raise history',
  total_raised: 'Total raised',
  strongest_proof: 'Proof',
  raise_status: 'Status',
  raise_amount: 'Raising',
  target_valuation: 'Valuation',
  target_close: 'Target close',
  biggest_blocker: 'Biggest blocker',
  course_feedback: 'What you asked for',
}

// ─── Typewriter ──────────────────────────────────────────────────────────────

function Typewriter({
  text,
  speed = 18,
  onDone,
}: {
  text: string
  speed?: number
  onDone?: () => void
}) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    setShown('')
    let i = 0
    const id = setInterval(() => {
      i++
      setShown(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(id)
        onDone?.()
      }
    }, speed)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  return <span>{shown}</span>
}

// ─── Dossier pane ────────────────────────────────────────────────────────────

function DossierPane({
  answers,
  activeActIndex,
  recentlyCommitted,
  onTypingDone,
  founderName,
}: {
  answers: Record<string, string | string[]>
  activeActIndex: number
  recentlyCommitted: string | null
  onTypingDone: () => void
  founderName: string
}) {
  const renderValue = (v: string | string[] | undefined) => {
    if (!v) return ''
    if (Array.isArray(v)) return v.length > 0 ? v.join(' · ') : ''
    return v
  }

  return (
    <aside className="relative h-full overflow-hidden">
      {/* Cream paper */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(at 30% 20%, #fbf7ee 0%, #f4efe3 60%, #ede6d6 100%)',
        }}
      />
      {/* Subtle grain */}
      <div
        className="absolute inset-0 opacity-[0.25] mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.32 0 0 0 0 0.28 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.45'/></svg>\")",
        }}
      />

      <div className="relative h-full overflow-y-auto px-10 py-10 xl:px-14 xl:py-14">
        {/* Masthead */}
        <div className="border-b border-[#3b342a]/25 pb-5 mb-8">
          <p className="text-[10px] font-semibold tracking-[0.32em] text-[#6b6455] uppercase">
            Nozomi &middot; Founder Dossier
          </p>
          <h1
            className="mt-3 text-[30px] leading-[1.05] text-[#1a1510] tracking-tight"
            style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontStyle: 'italic' }}
          >
            {founderName || 'Your'} Dossier
          </h1>
          <p className="mt-2 text-[11px] tracking-[0.22em] text-[#6b6455] uppercase">
            Confidential &middot; In preparation
          </p>
        </div>

        {/* Acts */}
        <div className="space-y-8">
          {ACTS.map((act, idx) => {
            const active = activeActIndex === idx
            const reached = activeActIndex >= idx
            const hasAny = act.fields.some((f) => {
              const v = answers[f]
              if (!v) return false
              if (Array.isArray(v)) return v.length > 0
              return v.trim() !== ''
            })

            if (!reached && !hasAny) return null

            return (
              <section key={act.roman} className="relative">
                <div className="flex items-baseline gap-3 mb-4">
                  <span
                    className="text-[11px] font-semibold tracking-[0.32em] text-[#6b6455] uppercase tabular-nums"
                  >
                    {act.roman}
                  </span>
                  <span className="flex-1 h-px bg-[#3b342a]/20" />
                  <span className="text-[11px] font-semibold tracking-[0.32em] text-[#6b6455] uppercase">
                    {act.name}
                  </span>
                </div>

                <dl className="space-y-3.5">
                  {act.fields.map((fieldId) => {
                    const v = answers[fieldId]
                    const valueStr = renderValue(v)
                    if (!valueStr) {
                      if (!active) return null
                      return (
                        <div key={fieldId} className="flex items-baseline gap-4">
                          <dt className="min-w-[120px] text-[11px] tracking-[0.18em] text-[#6b6455] uppercase pt-1">
                            {FIELD_LABELS[fieldId]}
                          </dt>
                          <dd className="flex-1 text-[13.5px] text-[#3b342a]/40 italic">
                            <span className="inline-block w-1.5 h-[14px] bg-[#3b342a]/50 animate-pulse align-middle" />
                          </dd>
                        </div>
                      )
                    }

                    const typing = recentlyCommitted === fieldId
                    return (
                      <div key={fieldId} className="flex items-baseline gap-4">
                        <dt className="min-w-[120px] text-[11px] tracking-[0.18em] text-[#6b6455] uppercase pt-1">
                          {FIELD_LABELS[fieldId]}
                        </dt>
                        <dd
                          className="flex-1 text-[14.5px] leading-[1.5] text-[#1a1510]"
                          style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}
                        >
                          {typing ? (
                            <Typewriter text={valueStr} onDone={onTypingDone} />
                          ) : (
                            valueStr
                          )}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </section>
            )
          })}
        </div>

        <div className="mt-10 pt-6 border-t border-[#3b342a]/20">
          <p className="text-[10px] tracking-[0.28em] text-[#6b6455] uppercase">
            Compiled live &middot; {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
    </aside>
  )
}

// ─── Act transition overlay ──────────────────────────────────────────────────

function ActTransition({ act, onDone }: { act: Act; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-[80] bg-[#0a0a0b] flex items-center justify-center animate-[fadeInFast_200ms_ease-out]">
      <div className="text-center">
        <p className="text-[13px] font-semibold tracking-[0.4em] text-white/45 uppercase mb-8 animate-[fadeUp_600ms_ease-out_150ms_both]">
          Act {act.roman}
        </p>
        <h2
          className="text-white tracking-tight animate-[fadeUp_700ms_ease-out_350ms_both]"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontStyle: 'italic',
            fontSize: 'clamp(56px, 10vw, 120px)',
            lineHeight: 0.95,
            letterSpacing: '-0.03em',
          }}
        >
          {act.name}
        </h2>
        <div className="mt-10 mx-auto w-[120px] h-px bg-accent animate-[lineGrow_900ms_ease-out_500ms_both]" />
      </div>
    </div>
  )
}

// ─── Option tile ─────────────────────────────────────────────────────────────

function OptionTile({
  label,
  selected,
  index,
  onClick,
  showKey,
}: {
  label: string
  selected: boolean
  index: number
  onClick: () => void
  showKey: boolean
}) {
  const keyHint = index < 9 ? String(index + 1) : ''
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative text-left rounded-2xl border backdrop-blur-sm
        px-5 py-4 cursor-pointer
        transition-all duration-200 ease-out
        ${selected
          ? 'border-accent bg-accent/[0.12] text-white scale-[0.98]'
          : 'border-white/[0.09] bg-white/[0.03] text-white/80 hover:bg-white/[0.06] hover:border-white/20 hover:-translate-y-0.5 hover:text-white'}
      `}
    >
      {showKey && keyHint && (
        <span
          className={`
            absolute top-3 right-3 text-[9.5px] font-mono tabular-nums tracking-wider
            px-1.5 py-0.5 rounded-md border
            ${selected
              ? 'border-accent/60 text-accent bg-accent/10'
              : 'border-white/10 text-white/30 group-hover:text-white/50'}
          `}
        >
          {keyHint}
        </span>
      )}
      <span className="text-[14.5px] leading-[1.4] pr-8 block">{label}</span>
    </button>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

function OnboardingExperience() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRedo = searchParams.get('redo') === '1'
  // -1 = welcome, 0..13 = questions, 14 = final dossier reveal
  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [recentlyCommitted, setRecentlyCommitted] = useState<string | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [showingAct, setShowingAct] = useState<Act | null>(null)
  const [actsSeen, setActsSeen] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [founderName, setFounderName] = useState('')

  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null)
  const textInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)

  // ── Load user + redirect if already onboarded ──
  useEffect(() => {
    const check = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_data, full_name, email')
        .eq('id', user.id)
        .single()
      if (profile?.onboarding_completed && !isRedo) {
        router.push('/dashboard')
        return
      }
      if (isRedo && profile?.onboarding_data) {
        setAnswers(profile.onboarding_data as Record<string, string | string[]>)
      }
      const first =
        (profile?.full_name as string | null)?.split(' ')[0] ||
        (profile?.email as string | null)?.split('@')[0] ||
        ''
      setFounderName(first.charAt(0).toUpperCase() + first.slice(1))
    }
    check()
  }, [router, isRedo])

  // ── Navigation ──
  const goTo = useCallback(
    (next: number) => {
      if (transitioning) return
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)

      // Check if we need an act transition
      if (next >= 0 && next < TOTAL && isActBoundary(next)) {
        const act = actForStep(next)
        if (!actsSeen.has(act.roman)) {
          setTransitioning(true)
          setShowingAct(act)
          setActsSeen((prev) => new Set(prev).add(act.roman))
          setTimeout(() => {
            setStep(next)
            setTransitioning(false)
          }, 100)
          return
        }
      }

      setTransitioning(true)
      setTimeout(() => {
        setStep(next)
        setTransitioning(false)
      }, 220)
    },
    [transitioning, actsSeen]
  )

  // ── Commit answer with dossier typewriter trigger ──
  const commitAnswer = (fieldId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }))
    setRecentlyCommitted(fieldId)
  }

  const handleSingleSelect = (q: Step, option: string, index: number) => {
    const wasEmpty = !answers[q.id]
    commitAnswer(q.id, option)

    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    if (wasEmpty && step < TOTAL - 1) {
      autoAdvanceTimer.current = setTimeout(() => {
        goTo(step + 1)
      }, 520)
    } else if (wasEmpty && step === TOTAL - 1) {
      autoAdvanceTimer.current = setTimeout(() => {
        handleSubmit()
      }, 520)
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = index
  }

  const handleSubSelect = (subId: string, option: string, allComplete: boolean) => {
    const wasEmpty = !answers[subId]
    commitAnswer(subId, option)

    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    if (wasEmpty && allComplete && step < TOTAL - 1) {
      autoAdvanceTimer.current = setTimeout(() => {
        goTo(step + 1)
      }, 620)
    }
  }

  const handleMultiSelect = (q: Step, option: string) => {
    setAnswers((prev) => {
      const current = (prev[q.id] as string[]) || []
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      return { ...prev, [q.id]: next }
    })
    setRecentlyCommitted(q.id)
  }

  const handleTextChange = (q: Step, value: string) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }))
  }

  // ── Submit ──
  const handleSubmit = async () => {
    if (saving) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true, onboarding_data: answers })
        .eq('id', user.id)

      setStep(TOTAL)
    } catch (err) {
      console.error('Onboarding save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const canContinue = (): boolean => {
    if (step < 0 || step >= TOTAL) return true
    const q = STEPS[step]
    if (q.optional) return true
    if (q.type === 'group') {
      return q.subQuestions!.every((sq) => {
        const v = answers[sq.id]
        return v && (typeof v === 'string' ? v.trim() !== '' : v.length > 0)
      })
    }
    const v = answers[q.id]
    if (!v) return false
    if (typeof v === 'string') return v.trim() !== ''
    return v.length > 0
  }

  // ── Keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (transitioning || showingAct) return
      const tag = (e.target as HTMLElement)?.tagName
      const inField = tag === 'INPUT' || tag === 'TEXTAREA'

      if (e.key === 'Enter' && !inField) {
        if (step === -1) {
          e.preventDefault()
          goTo(0)
          return
        }
        if (step >= 0 && step < TOTAL && canContinue()) {
          e.preventDefault()
          if (step === TOTAL - 1) handleSubmit()
          else goTo(step + 1)
        }
      } else if ((e.key === 'Enter' && inField && !e.shiftKey)) {
        const q = STEPS[step]
        if (q?.type === 'text' && canContinue()) {
          e.preventDefault()
          if (step === TOTAL - 1) handleSubmit()
          else goTo(step + 1)
        }
      } else if (e.key === 'Escape' && !inField) {
        if (step > 0) goTo(step - 1)
        else if (step === 0) goTo(-1)
      } else if (!inField && /^[1-9]$/.test(e.key) && step >= 0 && step < TOTAL) {
        const q = STEPS[step]
        const idx = parseInt(e.key, 10) - 1
        if (q.type === 'single' && q.options && idx < q.options.length) {
          handleSingleSelect(q, q.options[idx], idx)
        } else if (q.type === 'multi' && q.options && idx < q.options.length) {
          handleMultiSelect(q, q.options[idx])
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, transitioning, showingAct, answers])

  // ── Derived ──
  const currentQ = step >= 0 && step < TOTAL ? STEPS[step] : null
  const activeAct = step >= 0 && step < TOTAL ? actForStep(step) : ACTS[0]
  const activeActIndex = ACTS.findIndex((a) => a.roman === activeAct.roman)
  const progressPct = ((step + 1) / (TOTAL + 1)) * 100

  // ─────────────────────────────────────────────────────────────────────────────
  // Renders
  // ─────────────────────────────────────────────────────────────────────────────

  const renderQuestionBody = (q: Step) => {
    const cols = q.columns ?? 3
    const gridClass =
      cols === 2 ? 'grid-cols-1 md:grid-cols-2'
        : cols === 4 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'

    if (q.type === 'single') {
      return (
        <div className={`grid ${gridClass} gap-2.5`}>
          {q.options!.map((opt, i) => (
            <OptionTile
              key={opt}
              label={opt}
              index={i}
              selected={answers[q.id] === opt}
              onClick={() => handleSingleSelect(q, opt, i)}
              showKey
            />
          ))}
        </div>
      )
    }

    if (q.type === 'multi') {
      const selected = (answers[q.id] as string[]) || []
      return (
        <div className={`grid ${gridClass} gap-2.5`}>
          {q.options!.map((opt, i) => (
            <OptionTile
              key={opt}
              label={opt}
              index={i}
              selected={selected.includes(opt)}
              onClick={() => handleMultiSelect(q, opt)}
              showKey
            />
          ))}
        </div>
      )
    }

    if (q.type === 'group') {
      return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {q.subQuestions!.map((sq) => {
            const selected = answers[sq.id] as string | undefined
            return (
              <div key={sq.id}>
                <p className="text-[11.5px] font-semibold tracking-[0.22em] text-white/45 uppercase mb-3">
                  {sq.label}
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {sq.options.map((opt, i) => {
                    const otherSub = q.subQuestions!.find((x) => x.id !== sq.id)
                    const otherAnswered = otherSub ? !!answers[otherSub.id] : true
                    const willComplete = otherAnswered
                    return (
                      <OptionTile
                        key={opt}
                        label={opt}
                        index={i}
                        selected={selected === opt}
                        onClick={() => handleSubSelect(sq.id, opt, willComplete)}
                        showKey={false}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    if (q.type === 'text') {
      const value = (answers[q.id] as string) || ''
      const isShort = (q.maxLength || 280) <= 50
      return (
        <div className="space-y-5">
          <div className="relative">
            {isShort ? (
              <input
                ref={textInputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={value}
                onChange={(e) => handleTextChange(q, e.target.value)}
                onBlur={() => value && setRecentlyCommitted(q.id)}
                maxLength={q.maxLength}
                placeholder={q.placeholder}
                autoFocus
                className="w-full bg-transparent text-white placeholder:text-white/25 border-0 border-b border-white/15 focus:border-accent focus:outline-none text-[22px] md:text-[28px] font-serif pb-3 transition-colors"
                style={{ fontWeight: 500 }}
              />
            ) : (
              <div className="relative">
                <textarea
                  ref={textInputRef as React.RefObject<HTMLTextAreaElement>}
                  value={value}
                  onChange={(e) => handleTextChange(q, e.target.value)}
                  onBlur={() => value && setRecentlyCommitted(q.id)}
                  maxLength={q.maxLength}
                  placeholder={q.placeholder}
                  rows={3}
                  autoFocus
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-4 text-white placeholder:text-white/25 focus:outline-none focus:border-accent/60 text-[17px] leading-[1.5] resize-none transition-colors"
                />
                {q.maxLength && (
                  <span className="absolute bottom-3 right-4 text-[10.5px] font-mono text-white/30">
                    {value.length}/{q.maxLength}
                  </span>
                )}
              </div>
            )}
          </div>

          {q.examples && (
            <div className="pt-2">
              <p className="text-[10px] font-semibold tracking-[0.24em] text-white/35 uppercase mb-2.5">
                Examples
              </p>
              <div className="space-y-1.5">
                {q.examples.map((ex, i) => (
                  <p
                    key={i}
                    className="text-[12.5px] leading-[1.55] text-white/50 italic pl-3 border-l border-white/15"
                  >
                    {ex}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    return null
  }

  // ── Welcome ──
  const renderWelcome = () => (
    <div className="relative h-full w-full flex flex-col items-center justify-center px-6 text-center">
      <div className="absolute top-8 left-0 right-0 flex justify-center">
        <Link href="/" className="inline-block">
          <span className="font-serif text-[20px] text-white tracking-tight">Nozomi</span>
        </Link>
      </div>

      <p className="text-[12px] font-semibold tracking-[0.32em] text-accent uppercase mb-6 animate-[fadeUp_600ms_ease-out_100ms_both]">
        The Founder Dossier
      </p>
      <h1
        className="text-white tracking-tight mb-6 max-w-3xl animate-[fadeUp_700ms_ease-out_250ms_both]"
        style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          fontStyle: 'italic',
          fontSize: 'clamp(48px, 8vw, 96px)',
          lineHeight: 0.98,
          letterSpacing: '-0.035em',
        }}
      >
        Before we build{' '}
        <span className="text-accent">your path.</span>
      </h1>
      <p className="text-[15px] md:text-[17px] text-white/60 leading-[1.55] max-w-xl mb-10 animate-[fadeUp_700ms_ease-out_450ms_both]">
        Fourteen questions. Five acts. One document we compile as you answer &mdash;
        the brief we&rsquo;ll use to coach you through your raise.
      </p>
      <div className="animate-[fadeUp_600ms_ease-out_650ms_both]">
        <button
          onClick={() => goTo(0)}
          className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full hover:bg-accent hover:text-white transition-all cursor-pointer text-[14px] font-semibold tracking-wide"
        >
          Begin
          <span className="w-6 h-px bg-current transition-all group-hover:w-8" />
        </button>
        <p className="mt-6 text-[11px] text-white/30 tracking-[0.18em] uppercase">
          Press <kbd className="px-1.5 py-0.5 rounded border border-white/15 text-white/50 mx-0.5">Enter</kbd> to begin
        </p>
      </div>
    </div>
  )

  // ── Final dossier reveal ──
  const renderFinalDossier = () => (
    <div className="fixed inset-0 z-40 bg-[#0a0a0b] overflow-y-auto animate-[fadeInFast_300ms_ease-out]">
      <div className="min-h-screen flex items-start justify-center px-6 py-14">
        <div className="w-full max-w-[860px]">
          <p className="text-center text-[12px] font-semibold tracking-[0.32em] text-accent uppercase mb-6 animate-[fadeUp_700ms_ease-out_150ms_both]">
            Compiled
          </p>
          <h1
            className="text-center text-white tracking-tight mb-14 animate-[fadeUp_800ms_ease-out_300ms_both]"
            style={{
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              fontStyle: 'italic',
              fontSize: 'clamp(40px, 6vw, 72px)',
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}
          >
            The {founderName || 'Founder'} Dossier
          </h1>

          <div
            className="relative rounded-2xl overflow-hidden animate-[fadeUp_800ms_ease-out_500ms_both]"
            style={{
              background:
                'radial-gradient(at 30% 20%, #fbf7ee 0%, #f4efe3 60%, #ede6d6 100%)',
            }}
          >
            <div
              className="absolute inset-0 opacity-[0.25] mix-blend-multiply pointer-events-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.32 0 0 0 0 0.28 0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.45'/></svg>\")",
              }}
            />
            <div className="relative p-10 md:p-14">
              <div className="border-b border-[#3b342a]/25 pb-5 mb-10">
                <p className="text-[10px] font-semibold tracking-[0.32em] text-[#6b6455] uppercase">
                  Nozomi &middot; Founder Dossier
                </p>
                <p className="mt-2 text-[11px] tracking-[0.22em] text-[#6b6455] uppercase">
                  Confidential &middot; Compiled {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>

              {ACTS.map((act) => {
                const hasAny = act.fields.some((f) => {
                  const v = answers[f]
                  if (!v) return false
                  if (Array.isArray(v)) return v.length > 0
                  return v.trim() !== ''
                })
                if (!hasAny) return null
                return (
                  <section key={act.roman} className="mb-9">
                    <div className="flex items-baseline gap-3 mb-5">
                      <span className="text-[11px] font-semibold tracking-[0.32em] text-[#6b6455] uppercase tabular-nums">
                        {act.roman}
                      </span>
                      <span className="flex-1 h-px bg-[#3b342a]/20" />
                      <span className="text-[11px] font-semibold tracking-[0.32em] text-[#6b6455] uppercase">
                        {act.name}
                      </span>
                    </div>
                    <dl className="space-y-3.5">
                      {act.fields.map((fieldId) => {
                        const v = answers[fieldId]
                        const valueStr = Array.isArray(v) ? v.join(' · ') : v
                        if (!valueStr || (typeof valueStr === 'string' && valueStr.trim() === '')) return null
                        return (
                          <div key={fieldId} className="flex items-baseline gap-5">
                            <dt className="min-w-[140px] text-[11px] tracking-[0.18em] text-[#6b6455] uppercase pt-1">
                              {FIELD_LABELS[fieldId]}
                            </dt>
                            <dd className="flex-1 text-[15px] leading-[1.55] text-[#1a1510]" style={{ fontWeight: 500 }}>
                              {valueStr}
                            </dd>
                          </div>
                        )
                      })}
                    </dl>
                  </section>
                )
              })}

              <div className="mt-10 pt-6 border-t border-[#3b342a]/20 flex items-center justify-between">
                <p className="text-[10px] tracking-[0.28em] text-[#6b6455] uppercase">
                  Nozomi &middot; {new Date().getFullYear()}
                </p>
                <p
                  className="text-[13px] italic text-[#6b6455]"
                  style={{ fontWeight: 500 }}
                >
                  &mdash; End of brief &mdash;
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex items-center justify-center gap-5 animate-[fadeUp_600ms_ease-out_800ms_both]">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-accent hover:bg-accent-deep text-white rounded-full transition-all cursor-pointer text-[14px] font-semibold tracking-wide"
            >
              Enter the course
              <span className="w-6 h-px bg-current transition-all group-hover:w-8" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-[#0a0a0b] text-white overflow-hidden">
      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInFast {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lineGrow {
          from { width: 0; }
          to { width: 120px; }
        }
        @keyframes questionEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Progress hairline at very top */}
      {step >= 0 && step < TOTAL && (
        <div className="absolute top-0 left-0 right-0 h-[2px] z-30 bg-white/[0.06]">
          <div
            className="h-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Welcome */}
      {step === -1 && renderWelcome()}

      {/* Questions: split pane */}
      {step >= 0 && step < TOTAL && currentQ && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_520px] h-full">
          {/* Left: question pane */}
          <div className="relative h-full overflow-y-auto">
            {/* Top chrome */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 lg:px-12 pt-6 pb-4 z-10">
              <Link href="/" className="inline-block">
                <span className="font-serif text-[18px] text-white/90 tracking-tight">Nozomi</span>
              </Link>
              <div className="flex items-center gap-4 text-[10.5px] font-semibold tracking-[0.26em] text-white/45 uppercase">
                <span>
                  Act {activeAct.roman} &middot; {activeAct.name}
                </span>
                <span className="w-px h-3 bg-white/15" />
                <span className="tabular-nums">
                  {String(step + 1).padStart(2, '0')} / {String(TOTAL).padStart(2, '0')}
                </span>
              </div>
            </div>

            <div
              key={step}
              className="min-h-full flex flex-col justify-center px-8 lg:px-12 pt-24 pb-10"
              style={{ animation: 'questionEnter 400ms ease-out' }}
            >
              {/* Question */}
              <h2
                className="text-white max-w-[18ch] mb-5"
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontStyle: 'italic',
                  fontSize: 'clamp(36px, 5vw, 64px)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.028em',
                }}
              >
                {currentQ.title}
              </h2>
              {currentQ.subtitle && (
                <p className="text-[14px] md:text-[15px] text-white/55 leading-[1.55] max-w-[56ch] mb-8">
                  {currentQ.subtitle}
                </p>
              )}
              {currentQ.optional && (
                <p className="text-[11.5px] tracking-[0.18em] uppercase text-white/35 mb-6">
                  Optional
                </p>
              )}

              <div className="mb-8">{renderQuestionBody(currentQ)}</div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => goTo(step === 0 ? -1 : step - 1)}
                  className="inline-flex items-center gap-2 text-[12.5px] font-medium text-white/45 hover:text-white transition-colors cursor-pointer py-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Back
                </button>

                <div className="flex items-center gap-3">
                  {currentQ.optional && (
                    <button
                      type="button"
                      onClick={() => step === TOTAL - 1 ? handleSubmit() : goTo(step + 1)}
                      className="text-[12.5px] font-medium text-white/45 hover:text-white/70 transition-colors cursor-pointer py-2 px-3"
                    >
                      Skip
                    </button>
                  )}
                  {(currentQ.type === 'text' || currentQ.type === 'multi' || currentQ.type === 'group') && (
                    step === TOTAL - 1 ? (
                      <button
                        onClick={handleSubmit}
                        disabled={(!currentQ.optional && !canContinue()) || saving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-[13px] font-semibold hover:bg-accent hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving…' : 'Compile dossier'}
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => goTo(step + 1)}
                        disabled={!canContinue()}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-[13px] font-semibold hover:bg-accent hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Continue
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                    )
                  )}
                  <p className="hidden md:block text-[10px] tracking-[0.2em] text-white/25 uppercase ml-1">
                    <kbd className="px-1 py-0.5 rounded border border-white/10 text-white/40">Esc</kbd>{' '}back
                    {' · '}
                    <kbd className="px-1 py-0.5 rounded border border-white/10 text-white/40">↵</kbd>{' '}next
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: dossier pane — hidden on mobile */}
          <div className="hidden lg:block h-full border-l border-white/[0.05]">
            <DossierPane
              answers={answers}
              activeActIndex={activeActIndex}
              recentlyCommitted={recentlyCommitted}
              onTypingDone={() => setRecentlyCommitted(null)}
              founderName={founderName}
            />
          </div>
        </div>
      )}

      {/* Final reveal */}
      {step >= TOTAL && renderFinalDossier()}

      {/* Act transition overlay */}
      {showingAct && (
        <ActTransition act={showingAct} onDone={() => setShowingAct(null)} />
      )}
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface-dark" />}>
      <OnboardingExperience />
    </Suspense>
  )
}
