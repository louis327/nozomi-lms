'use client'

import { Suspense, useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
  columns?: 2 | 3 | 4
}

const STEPS: Step[] = [
  {
    id: 'project_type',
    title: 'What type of project are you building?',
    subtitle: 'Tap one — or press its number.',
    type: 'single',
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
    columns: 3,
    options: ['$0', 'Under $250k', '$250k \u2013 $1M', '$1M \u2013 $3M', '$3M \u2013 $10M', '$10M+'],
  },
  {
    id: 'strongest_proof',
    title: 'What\u2019s your strongest proof point right now?',
    subtitle: 'Select all that apply \u2014 press Enter when you\u2019re done.',
    type: 'multi',
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
    maxLength: 50,
    placeholder: 'e.g. $2M',
    examples: ['$500k', '$2M', '$5M', '$15M'],
  },
  {
    id: 'target_valuation',
    title: 'What valuation are you targeting?',
    subtitle: 'Pick the closest range or \u201cNot sure yet\u201d \u2014 that\u2019s a valid answer.',
    type: 'single',
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
    maxLength: 50,
    placeholder: 'e.g. Q2 2026',
    examples: ['January 2026', 'Q2 2026', 'By TGE in June'],
  },
  {
    id: 'biggest_blocker',
    title: 'What\u2019s the single biggest thing blocking your raise right now?',
    subtitle: 'Pick the most honest answer \u2014 this is how we prioritise what to surface for you.',
    type: 'single',
    columns: 3,
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
    maxLength: 280,
    optional: true,
    placeholder: 'e.g. I need to fix my tokenomics slide before a call with Multicoin next week',
  },
]

const TOTAL = STEPS.length

// ─── Acts ────────────────────────────────────────────────────────────────────

type Act = { roman: string; name: string; startIndex: number }

const ACTS: Act[] = [
  { roman: 'I', name: 'The Project', startIndex: 0 },
  { roman: 'II', name: 'The Team', startIndex: 3 },
  { roman: 'III', name: 'The Record', startIndex: 5 },
  { roman: 'IV', name: 'The Raise', startIndex: 8 },
  { roman: 'V', name: 'The Blocker', startIndex: 12 },
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
        group relative text-left rounded-xl border backdrop-blur-sm
        px-4 py-3 cursor-pointer
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
      <span className="text-[13.5px] leading-[1.35] pr-7 block">{label}</span>
    </button>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

function OnboardingExperience() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isRedo = searchParams.get('redo') === '1'
  // -1 = welcome, 0..13 = questions, 14 = final reveal
  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [transitioning, setTransitioning] = useState(false)
  const [showingAct, setShowingAct] = useState<Act | null>(null)
  const [actsSeen, setActsSeen] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [founderName, setFounderName] = useState('')

  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null)
  const textInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)

  // ── Load user ──
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

  const commitAnswer = (fieldId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }))
  }

  const handleSingleSelect = (q: Step, option: string) => {
    const wasEmpty = !answers[q.id]
    commitAnswer(q.id, option)

    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    if (wasEmpty && step < TOTAL - 1) {
      autoAdvanceTimer.current = setTimeout(() => {
        goTo(step + 1)
      }, 420)
    } else if (wasEmpty && step === TOTAL - 1) {
      autoAdvanceTimer.current = setTimeout(() => {
        handleSubmit()
      }, 420)
    }
  }

  const handleSubSelect = (subId: string, option: string, allComplete: boolean) => {
    const wasEmpty = !answers[subId]
    commitAnswer(subId, option)

    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current)
    if (wasEmpty && allComplete && step < TOTAL - 1) {
      autoAdvanceTimer.current = setTimeout(() => {
        goTo(step + 1)
      }, 520)
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
          handleSingleSelect(q, q.options[idx])
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
              onClick={() => handleSingleSelect(q, opt)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                maxLength={q.maxLength}
                placeholder={q.placeholder}
                autoFocus
                className="w-full bg-transparent text-white placeholder:text-white/25 border-0 border-b border-white/15 focus:border-accent focus:outline-none text-[24px] md:text-[32px] font-serif pb-3 transition-colors"
                style={{ fontWeight: 500 }}
              />
            ) : (
              <div className="relative">
                <textarea
                  ref={textInputRef as React.RefObject<HTMLTextAreaElement>}
                  value={value}
                  onChange={(e) => handleTextChange(q, e.target.value)}
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

      <div className="absolute top-8 right-8">
        <p className="text-[10.5px] font-semibold tracking-[0.28em] text-white/35 uppercase">
          14 questions &middot; 3 min
        </p>
      </div>

      <p className="text-[12px] font-semibold tracking-[0.36em] text-accent uppercase mb-8 animate-[fadeUp_600ms_ease-out_100ms_both]">
        {isRedo ? 'Updating your brief' : `Welcome${founderName ? `, ${founderName}` : ''}`}
      </p>

      <h1
        className="text-white tracking-tight mb-8 max-w-[14ch] animate-[fadeUp_700ms_ease-out_250ms_both]"
        style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          fontStyle: 'italic',
          fontSize: 'clamp(56px, 10vw, 124px)',
          lineHeight: 0.95,
          letterSpacing: '-0.04em',
        }}
      >
        Set the <span className="text-accent">stage.</span>
      </h1>

      <p className="text-[15px] md:text-[17px] text-white/55 leading-[1.55] max-w-[48ch] mb-12 animate-[fadeUp_700ms_ease-out_450ms_both]">
        Everything you tell us shapes the coach, the path, and the work we surface for you.
        Short answers. Real ones.
      </p>

      <div className="animate-[fadeUp_600ms_ease-out_650ms_both]">
        <button
          onClick={() => goTo(0)}
          className="group inline-flex items-center gap-2.5 px-9 py-4 bg-white text-black rounded-full hover:bg-accent hover:text-white transition-all cursor-pointer text-[14px] font-semibold tracking-wide shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_50px_rgba(233,30,99,0.35)]"
        >
          Begin
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
        </button>
        <p className="mt-6 text-[10.5px] text-white/30 tracking-[0.24em] uppercase">
          Press <kbd className="px-1.5 py-0.5 rounded border border-white/15 text-white/50 mx-0.5 font-mono text-[10px]">↵</kbd> to begin
        </p>
      </div>
    </div>
  )

  // ── Final reveal ──
  const renderFinale = () => {
    const raiseAmount = typeof answers.raise_amount === 'string' ? answers.raise_amount : null
    const targetClose = typeof answers.target_close === 'string' ? answers.target_close : null
    const valuation = typeof answers.target_valuation === 'string' ? answers.target_valuation : null
    const stage = typeof answers.stage === 'string' ? answers.stage : null
    const sector = typeof answers.project_type === 'string' ? answers.project_type : null
    const blocker = typeof answers.biggest_blocker === 'string' ? answers.biggest_blocker : null

    const headline = raiseAmount
      ? (targetClose ? `Let\u2019s close ${raiseAmount} by ${targetClose}.` : `Let\u2019s close ${raiseAmount}.`)
      : 'Let\u2019s get to work.'

    const summaryBits = [stage, sector, valuation && `${valuation} cap`].filter(Boolean) as string[]

    return (
      <div className="fixed inset-0 z-40 bg-[#0a0a0b] overflow-y-auto animate-[fadeInFast_300ms_ease-out]">
        <div className="min-h-screen flex flex-col px-8 lg:px-16 py-12 lg:py-16">
          <div className="flex items-center justify-between">
            <span className="font-serif text-[18px] text-white tracking-tight">Nozomi</span>
            <p className="text-[10.5px] font-semibold tracking-[0.32em] text-white/40 uppercase">
              Ready
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-[1100px] mx-auto w-full py-16">
            <p className="text-[12px] font-semibold tracking-[0.36em] text-accent uppercase mb-10 animate-[fadeUp_700ms_ease-out_150ms_both]">
              {founderName ? `${founderName.toUpperCase()}\u2019S RAISE` : 'YOUR RAISE'} &middot; COMPILED
            </p>

            <h1
              className="text-white tracking-tight mb-10 animate-[fadeUp_800ms_ease-out_300ms_both]"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: 'clamp(52px, 8.5vw, 124px)',
                lineHeight: 0.96,
                letterSpacing: '-0.035em',
              }}
            >
              {headline}
            </h1>

            {summaryBits.length > 0 && (
              <p className="text-[16px] md:text-[18px] text-white/60 leading-[1.5] max-w-[60ch] mb-14 animate-[fadeUp_700ms_ease-out_450ms_both]">
                {summaryBits.join(' \u00b7 ')}
              </p>
            )}

            {blocker && (
              <div className="relative pl-6 md:pl-8 mb-16 animate-[fadeUp_700ms_ease-out_600ms_both]">
                <span className="absolute left-0 top-0 bottom-0 w-px bg-accent" />
                <p className="text-[10.5px] font-semibold tracking-[0.3em] text-accent uppercase mb-3">
                  What&rsquo;s in the way
                </p>
                <p
                  className="text-white/90 max-w-[44ch]"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500,
                    fontStyle: 'italic',
                    fontSize: 'clamp(22px, 3vw, 32px)',
                    lineHeight: 1.25,
                    letterSpacing: '-0.015em',
                  }}
                >
                  &ldquo;{blocker}&rdquo;
                </p>
              </div>
            )}

            <div className="flex items-center gap-5 animate-[fadeUp_700ms_ease-out_800ms_both]">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2.5 px-9 py-4 bg-accent hover:bg-accent-deep text-white rounded-full transition-all cursor-pointer text-[14px] font-semibold tracking-wide shadow-[0_0_40px_rgba(233,30,99,0.35)] hover:shadow-[0_0_60px_rgba(233,30,99,0.55)]"
              >
                Enter your command center
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between pt-8 border-t border-white/[0.08]">
            <p className="text-[10.5px] font-semibold tracking-[0.28em] text-white/40 uppercase">
              Nozomi &middot; {new Date().getFullYear()}
            </p>
            <p className="text-[10.5px] tracking-[0.28em] text-white/40 uppercase">
              Compiled {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-[#0a0a0b] text-white overflow-hidden">
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
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Progress hairline at top */}
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

      {/* Questions — full-screen centered single-column */}
      {step >= 0 && step < TOTAL && currentQ && (
        <div className="relative h-full overflow-y-auto">
          {/* Top chrome */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 lg:px-12 pt-6 pb-4 z-10">
            <Link href="/" className="inline-block">
              <span className="font-serif text-[18px] text-white/90 tracking-tight">Nozomi</span>
            </Link>
            <div className="flex items-center gap-4 text-[10.5px] font-semibold tracking-[0.28em] text-white/45 uppercase">
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
            className="min-h-full flex flex-col justify-center max-w-[980px] mx-auto px-8 lg:px-12 pt-24 pb-8"
            style={{ animation: 'questionEnter 420ms ease-out' }}
          >
            {currentQ.optional && (
              <p className="text-[10.5px] font-semibold tracking-[0.28em] text-white/30 uppercase mb-4">
                Optional
              </p>
            )}

            <h2
              className="text-white max-w-[22ch] mb-4"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: 'clamp(32px, 4.2vw, 56px)',
                lineHeight: 1.04,
                letterSpacing: '-0.028em',
              }}
            >
              {currentQ.title}
            </h2>

            {currentQ.subtitle && (
              <p className="text-[13.5px] md:text-[14.5px] text-white/55 leading-[1.5] max-w-[60ch] mb-7">
                {currentQ.subtitle}
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
                {step === TOTAL - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={(!currentQ.optional && !canContinue()) || saving}
                    className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-white text-black text-[13px] font-semibold hover:bg-accent hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(255,255,255,0.12)]"
                  >
                    {saving ? 'Saving\u2026' : 'Finish'}
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                  </button>
                ) : (
                  <button
                    onClick={() => goTo(step + 1)}
                    disabled={!canContinue()}
                    className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-white text-black text-[13px] font-semibold hover:bg-accent hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(255,255,255,0.12)]"
                  >
                    Continue
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                )}
                <p className="hidden md:block text-[10px] tracking-[0.2em] text-white/25 uppercase ml-1">
                  <kbd className="px-1 py-0.5 rounded border border-white/10 text-white/40">Esc</kbd>{' '}back
                  {' \u00b7 '}
                  <kbd className="px-1 py-0.5 rounded border border-white/10 text-white/40">↵</kbd>{' '}next
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Final reveal */}
      {step >= TOTAL && renderFinale()}

      {/* Act transition overlay */}
      {showingAct && (
        <ActTransition act={showingAct} onDone={() => setShowingAct(null)} />
      )}
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0b]" />}>
      <OnboardingExperience />
    </Suspense>
  )
}
