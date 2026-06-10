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
    subtitle: 'Tap one, or press its number.',
    type: 'single',
    columns: 3,
    options: [
      'DeFi (DEX, lending, yield, stablecoins)',
      'Infrastructure (middleware, tooling, oracles, bridges)',
      'L1 or L2 (base chains, rollups, app-chains)',
      'Consumer (social, creator, identity, wallets)',
      'GameFi',
      'AI × Crypto',
      'DePIN',
      'RWA (real-world assets)',
      'Other',
    ],
  },
  {
    id: 'project_description',
    title: 'In one sentence, what does your project do and who is it for?',
    subtitle: 'No jargon. Write it how you’d explain it to a smart friend who doesn’t live in crypto.',
    type: 'text',
    maxLength: 280,
    placeholder: 'We help...',
    examples: [
      'We give GameFi studios the infrastructure to let players rent in-game assets to each other on-chain.',
      'We help institutional traders move stablecoins between chains in under 10 seconds without exposing them to bridge risk.',
      'We’re building a self-custody wallet for people who have never used crypto before, no seed phrases, no gas fees.',
    ],
  },
  {
    id: 'competitive_advantage',
    title: 'Compared to your competition, what makes you different?',
    subtitle: 'One sentence. Be specific. “Faster and cheaper” is what everyone says, it’s not an answer.',
    type: 'text',
    maxLength: 280,
    placeholder: 'Unlike...',
    examples: [
      'Unlike MetaMask, users never see a seed phrase, recovery is handled through social accounts they already trust.',
      'We’re the first bridge where assets never leave the source chain, we match buyers and sellers instead of wrapping tokens.',
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
        options: ['1 (just me)', '2-3', '4-6', '7-12', '13-25', '25+'],
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
    options: ['$0', 'Under $250k', '$250k - $1M', '$1M - $3M', '$3M - $10M', '$10M+'],
  },
  {
    id: 'strongest_proof',
    title: 'What’s your strongest proof point right now?',
    subtitle: 'Select all that apply, press Enter when you’re done.',
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
      'Nothing concrete yet, we’re pre-everything',
    ],
  },
  {
    id: 'raise_status',
    title: 'Where are you in your current raise?',
    subtitle: 'Tap one.',
    type: 'single',
    columns: 2,
    options: [
      'Haven’t started thinking about it seriously',
      'Building the plan, deck not ready yet',
      'Deck ready, haven’t pitched anyone yet',
      'First few meetings booked',
      'Actively pitching (5-10 meetings done)',
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
    subtitle: 'Pick the closest range or “Not sure yet”, that’s a valid answer.',
    type: 'single',
    columns: 4,
    options: [
      'Under $5M',
      '$5M - $15M',
      '$15M - $30M',
      '$30M - $50M',
      '$50M - $100M',
      '$100M+',
      'Not sure yet',
    ],
  },
  {
    id: 'target_close',
    title: 'When are you targeting close?',
    subtitle: 'A specific month or quarter beats “ASAP.”',
    type: 'text',
    maxLength: 50,
    placeholder: 'e.g. Q2 2026',
    examples: ['January 2026', 'Q2 2026', 'By TGE in June'],
  },
  {
    id: 'biggest_blocker',
    title: 'What’s the single biggest thing blocking your raise right now?',
    subtitle: 'Pick the most honest answer, this is how we prioritise what to surface for you.',
    type: 'single',
    columns: 3,
    options: [
      'I don’t know how much to raise or at what valuation',
      'I don’t have a deck yet',
      'My deck isn’t converting meetings into interest',
      'I can’t get meetings, nobody replies to outreach',
      'I’m getting meetings but no commits',
      'I had soft commits and they went cold',
      'My tokenomics isn’t clear',
      'My team has a gap (technical, commercial, or credibility)',
      'My community or GTM story is weak',
      'I’m not sure if I should raise from VCs, community, or both',
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

// ─── Brand wordmark ──────────────────────────────────────────────────────────

function Wordmark({ size = 18 }: { size?: number }) {
  return (
    <span
      className="font-bold tracking-[-0.02em] text-ink"
      style={{ fontSize: size }}
    >
      Nozomi
    </span>
  )
}

// ─── Act transition overlay ──────────────────────────────────────────────────

function ActTransition({ act, onDone }: { act: Act; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed inset-0 z-[80] bg-white flex items-center justify-center animate-[fadeInFast_200ms_ease-out]">
      <div className="text-center">
        <p className="text-[13px] font-semibold tracking-[0.4em] text-accent uppercase mb-8 animate-[fadeUp_600ms_ease-out_150ms_both]">
          Act {act.roman}
        </p>
        <h2
          className="text-ink tracking-tight animate-[fadeUp_700ms_ease-out_350ms_both]"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: 'clamp(56px, 10vw, 120px)',
            lineHeight: 0.95,
            letterSpacing: '-0.04em',
          }}
        >
          {act.name}
        </h2>
        <div className="mt-10 mx-auto w-[120px] h-[3px] rounded-full bg-accent animate-[lineGrow_900ms_ease-out_500ms_both]" />
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
        group relative text-left rounded-xl border
        px-4 py-3.5 cursor-pointer
        transition-all duration-150 ease-out
        ${selected
          ? 'border-accent bg-accent-soft text-ink shadow-[0_0_0_1px_var(--nz-accent)]'
          : 'border-line bg-surface text-ink-soft shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-line-strong hover:-translate-y-0.5 hover:text-ink hover:shadow-[0_6px_18px_-8px_rgba(16,24,40,0.15)]'}
      `}
    >
      {showKey && keyHint && (
        <span
          className={`
            absolute top-3 right-3 text-[10px] font-semibold tabular-nums
            px-1.5 py-0.5 rounded-md border
            ${selected
              ? 'border-accent text-accent-deep bg-surface'
              : 'border-line text-ink-faint bg-surface-muted group-hover:text-ink-muted'}
          `}
        >
          {keyHint}
        </span>
      )}
      <span className={`block text-[13.5px] leading-[1.35] pr-7 ${selected ? 'font-semibold' : 'font-medium'}`}>
        {label}
      </span>
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
                <p className="text-[11.5px] font-semibold tracking-[0.18em] text-ink-muted uppercase mb-3">
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
                className="w-full bg-transparent text-ink placeholder:text-ink-faint border-0 border-b border-line-strong focus:border-accent focus:outline-none text-[24px] md:text-[32px] font-semibold tracking-[-0.02em] pb-3 transition-colors"
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
                  className="w-full rounded-2xl border border-line-strong bg-surface px-5 py-4 text-[17px] leading-[1.5] text-ink placeholder:text-ink-faint resize-none transition-[border-color,box-shadow] focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--nz-accent-soft)]"
                />
                {q.maxLength && (
                  <span className="absolute bottom-3 right-4 text-[10.5px] tabular-nums text-ink-muted">
                    {value.length}/{q.maxLength}
                  </span>
                )}
              </div>
            )}
          </div>

          {q.examples && (
            <div className="pt-2">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase mb-2.5">
                Examples
              </p>
              <div className="space-y-1.5">
                {q.examples.map((ex, i) => (
                  <p
                    key={i}
                    className="text-[12.5px] leading-[1.55] text-ink-muted italic pl-3 border-l border-line"
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
    <div className="relative h-full w-full flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      {/* Soft accent glow */}
      <div
        aria-hidden
        className="absolute -top-[18%] right-[-8%] w-[46%] aspect-square rounded-full"
        style={{
          background: 'radial-gradient(circle, var(--nz-accent-soft), transparent 70%)',
          filter: 'blur(40px)',
          opacity: 0.7,
        }}
      />

      <div className="absolute top-8 left-0 right-0 flex justify-center">
        <Link href="/" className="inline-block">
          <Wordmark size={20} />
        </Link>
      </div>

      <div className="absolute top-8 right-8">
        <p className="text-[10.5px] font-semibold tracking-[0.22em] text-ink-muted uppercase">
          14 questions &middot; 3 min
        </p>
      </div>

      <div className="relative">
        <p className="text-[12px] font-semibold tracking-[0.3em] text-accent uppercase mb-7 animate-[fadeUp_600ms_ease-out_100ms_both]">
          {isRedo ? 'Updating your brief' : `Welcome${founderName ? `, ${founderName}` : ''}`}
        </p>

        <h1
          className="text-ink tracking-tight mb-7 max-w-[14ch] mx-auto animate-[fadeUp_700ms_ease-out_250ms_both]"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 700,
            fontSize: 'clamp(52px, 10vw, 116px)',
            lineHeight: 0.95,
            letterSpacing: '-0.045em',
          }}
        >
          Set the <span className="text-accent">stage.</span>
        </h1>

        <p className="text-[15px] md:text-[17px] text-ink-soft leading-[1.55] max-w-[46ch] mx-auto mb-11 animate-[fadeUp_700ms_ease-out_450ms_both]">
          Everything you tell us shapes the coach, the path, and the work we surface for you.
          Short answers. Real ones.
        </p>

        <div className="animate-[fadeUp_600ms_ease-out_650ms_both]">
          <button
            onClick={() => goTo(0)}
            className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-ink text-white rounded-[12px] hover:brightness-110 transition-[filter] cursor-pointer text-[14.5px] font-semibold"
          >
            Begin
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
          </button>
          <p className="mt-5 text-[11px] text-ink-muted tracking-[0.16em] uppercase">
            Press <kbd className="px-1.5 py-0.5 rounded border border-line-strong bg-surface text-ink-muted mx-0.5 text-[10px]">↵</kbd> to begin
          </p>
        </div>
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
      ? (targetClose ? `Let’s close ${raiseAmount} by ${targetClose}.` : `Let’s close ${raiseAmount}.`)
      : 'Let’s get to work.'

    const summaryBits = [stage, sector, valuation && `${valuation} cap`].filter(Boolean) as string[]

    return (
      <div className="fixed inset-0 z-40 bg-white overflow-y-auto animate-[fadeInFast_300ms_ease-out]">
        <div className="min-h-screen flex flex-col px-8 lg:px-16 py-12 lg:py-16">
          <div className="flex items-center justify-between">
            <Wordmark size={18} />
            <p className="text-[10.5px] font-semibold tracking-[0.28em] text-ink-muted uppercase">
              Ready
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-[1100px] mx-auto w-full py-16">
            <p className="text-[12px] font-semibold tracking-[0.3em] text-accent uppercase mb-9 animate-[fadeUp_700ms_ease-out_150ms_both]">
              {founderName ? `${founderName.toUpperCase()}’S RAISE` : 'YOUR RAISE'} &middot; COMPILED
            </p>

            <h1
              className="text-ink tracking-tight mb-9 animate-[fadeUp_800ms_ease-out_300ms_both]"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontSize: 'clamp(46px, 7.5vw, 104px)',
                lineHeight: 1.0,
                letterSpacing: '-0.04em',
              }}
            >
              {headline.split(/(\$[^\s]+)/).map((part, i) =>
                part.startsWith('$') ? <span key={i} className="text-accent">{part}</span> : part
              )}
            </h1>

            {summaryBits.length > 0 && (
              <p className="text-[16px] md:text-[18px] text-ink-soft leading-[1.5] max-w-[60ch] mb-12 animate-[fadeUp_700ms_ease-out_450ms_both]">
                {summaryBits.join(' · ')}
              </p>
            )}

            {blocker && (
              <div className="relative pl-6 md:pl-8 mb-14 animate-[fadeUp_700ms_ease-out_600ms_both]">
                <span className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full bg-accent" />
                <p className="text-[10.5px] font-semibold tracking-[0.26em] text-accent uppercase mb-3">
                  What&rsquo;s in the way
                </p>
                <p
                  className="text-ink max-w-[44ch]"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600,
                    fontSize: 'clamp(22px, 3vw, 30px)',
                    lineHeight: 1.25,
                    letterSpacing: '-0.02em',
                  }}
                >
                  &ldquo;{blocker}&rdquo;
                </p>
              </div>
            )}

            <div className="flex items-center gap-5 animate-[fadeUp_700ms_ease-out_800ms_both]">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-accent hover:bg-accent-deep text-white rounded-[12px] transition-colors cursor-pointer text-[14.5px] font-semibold"
              >
                Enter your command center
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" strokeWidth={2} />
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between pt-7 border-t border-line">
            <p className="text-[10.5px] font-semibold tracking-[0.24em] text-ink-muted uppercase">
              Nozomi &middot; {new Date().getFullYear()}
            </p>
            <p className="text-[10.5px] tracking-[0.24em] text-ink-muted uppercase">
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
    <div className="fixed inset-0 bg-[#fbfbfa] text-ink overflow-hidden">
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
        <div className="absolute top-0 left-0 right-0 h-[3px] z-30 bg-line">
          <div
            className="h-full bg-accent transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Welcome */}
      {step === -1 && renderWelcome()}

      {/* Questions, full-screen centered single-column */}
      {step >= 0 && step < TOTAL && currentQ && (
        <div className="relative h-full overflow-y-auto">
          {/* Top chrome */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 lg:px-12 pt-6 pb-4 z-10">
            <Link href="/" className="inline-block">
              <Wordmark size={18} />
            </Link>
            <div className="flex items-center gap-4 text-[10.5px] font-semibold tracking-[0.18em] text-ink-muted uppercase">
              <span>
                Act {activeAct.roman} &middot; {activeAct.name}
              </span>
              <span className="w-px h-3 bg-line" />
              <span className="tabular-nums">
                {String(step + 1).padStart(2, '0')} / {String(TOTAL).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div
            key={step}
            className="min-h-full flex flex-col justify-center max-w-[920px] mx-auto px-8 lg:px-12 pt-24 pb-8"
            style={{ animation: 'questionEnter 420ms ease-out' }}
          >
            {currentQ.optional && (
              <p className="text-[10.5px] font-semibold tracking-[0.22em] text-ink-muted uppercase mb-4">
                Optional
              </p>
            )}

            <h2
              className="text-ink max-w-[24ch] mb-4"
              style={{
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontSize: 'clamp(30px, 3.8vw, 48px)',
                lineHeight: 1.08,
                letterSpacing: '-0.035em',
              }}
            >
              {currentQ.title}
            </h2>

            {currentQ.subtitle && (
              <p className="text-[13.5px] md:text-[14.5px] text-ink-soft leading-[1.5] max-w-[60ch] mb-7">
                {currentQ.subtitle}
              </p>
            )}

            <div className="mb-8">{renderQuestionBody(currentQ)}</div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-line">
              <button
                type="button"
                onClick={() => goTo(step === 0 ? -1 : step - 1)}
                className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-ink-muted hover:text-ink transition-colors cursor-pointer py-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>

              <div className="flex items-center gap-3">
                {currentQ.optional && (
                  <button
                    type="button"
                    onClick={() => step === TOTAL - 1 ? handleSubmit() : goTo(step + 1)}
                    className="text-[12.5px] font-semibold text-ink-muted hover:text-ink transition-colors cursor-pointer py-2 px-3"
                  >
                    Skip
                  </button>
                )}
                {step === TOTAL - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={(!currentQ.optional && !canContinue()) || saving}
                    className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-[10px] bg-ink text-white text-[13.5px] font-semibold hover:brightness-110 transition-[filter] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving…' : 'Finish'}
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                  </button>
                ) : (
                  <button
                    onClick={() => goTo(step + 1)}
                    disabled={!canContinue()}
                    className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-[10px] bg-ink text-white text-[13.5px] font-semibold hover:brightness-110 transition-[filter] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Continue
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
                  </button>
                )}
                <p className="hidden md:block text-[10px] tracking-[0.14em] text-ink-faint uppercase ml-1">
                  <kbd className="px-1 py-0.5 rounded border border-line text-ink-muted">Esc</kbd>{' '}back
                  {' · '}
                  <kbd className="px-1 py-0.5 rounded border border-line text-ink-muted">↵</kbd>{' '}next
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
    <Suspense fallback={<div className="min-h-screen bg-[#fbfbfa]" />}>
      <OnboardingExperience />
    </Suspense>
  )
}
