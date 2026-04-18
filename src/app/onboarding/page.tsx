'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

// ─── Types ───────────────────────────────────────────────────────────────────

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
}

// ─── Question definitions ────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: 'project_type',
    title: 'What type of project are you building?',
    subtitle: 'Tap one.',
    type: 'single',
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
    type: 'group',
    subQuestions: [
      {
        id: 'cofounders',
        label: 'How many co-founders, including you?',
        options: [
          'Just me (solo founder)',
          '2 co-founders',
          '3 co-founders',
          '4 or more co-founders',
        ],
      },
      {
        id: 'employees',
        label: 'How many full-time employees, including founders?',
        options: ['1 (just me)', '2\u20133', '4\u20136', '7\u201312', '13\u201325', '25+'],
      },
    ],
  },
  {
    id: 'raised_before',
    title: 'Have you raised capital before?',
    subtitle: 'Tap one.',
    type: 'single',
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
    options: ['$0', 'Under $250k', '$250k \u2013 $1M', '$1M \u2013 $3M', '$3M \u2013 $10M', '$10M+'],
  },
  {
    id: 'strongest_proof',
    title: 'What\u2019s your single strongest proof point right now?',
    subtitle: 'Select all that apply.',
    type: 'multi',
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
    subtitle: 'A specific month or quarter is better than \u201cASAP.\u201d',
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

const TOTAL_QUESTIONS = STEPS.length

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = ((current + 1) / total) * 100
  return (
    <div className="w-full h-[2px] bg-line rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-accent transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function OptionCard({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 rounded-xl border transition-colors duration-150 cursor-pointer
        text-[14px] leading-[22px]
        ${selected
          ? 'border-ink bg-surface text-ink'
          : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink'
        }
      `}
    >
      <span className="flex items-center gap-3">
        <span
          className={`
            flex-shrink-0 w-[18px] h-[18px] rounded-full border transition-colors duration-150
            flex items-center justify-center
            ${selected ? 'border-accent bg-accent' : 'border-line-strong'}
          `}
        >
          {selected && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4.2 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span>{label}</span>
      </span>
    </button>
  )
}

function CheckCard({
  label,
  checked,
  onClick,
}: {
  label: string
  checked: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left px-4 py-3 rounded-xl border transition-colors duration-150 cursor-pointer
        text-[14px] leading-[22px]
        ${checked
          ? 'border-ink bg-surface text-ink'
          : 'border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink'
        }
      `}
    >
      <span className="flex items-center gap-3">
        <span
          className={`
            flex-shrink-0 w-[18px] h-[18px] rounded-md border transition-colors duration-150
            flex items-center justify-center
            ${checked ? 'border-accent bg-accent' : 'border-line-strong'}
          `}
        >
          {checked && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4.2 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span>{label}</span>
      </span>
    </button>
  )
}

function ExampleBlock({ examples }: { examples: string[] }) {
  return (
    <div className="mt-5 space-y-2.5">
      <p className="eyebrow">Examples</p>
      {examples.map((ex, i) => (
        <p
          key={i}
          className="text-[13px] leading-[20px] text-ink-muted italic pl-4 border-l-2 border-line font-serif"
        >
          {ex}
        </p>
      ))}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  // -1 = welcome, 0..13 = questions, 14 = complete
  const [step, setStep] = useState(-1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [animating, setAnimating] = useState(false)
  const [saving, setSaving] = useState(false)

  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})

  const goTo = useCallback(
    (next: number, dir: 'forward' | 'back') => {
      if (animating) return
      setDirection(dir)
      setAnimating(true)
      setTimeout(() => {
        setStep(next)
        setAnimating(false)
      }, 250)
    },
    [animating]
  )

  const canContinue = useCallback(() => {
    if (step < 0 || step >= TOTAL_QUESTIONS) return true
    const q = STEPS[step]
    if (q.optional) return true
    if (q.type === 'group') {
      return q.subQuestions!.every((sq) => {
        const val = answers[sq.id]
        return val && (typeof val === 'string' ? val.trim() !== '' : val.length > 0)
      })
    }
    const val = answers[q.id]
    if (!val) return false
    if (typeof val === 'string') return val.trim() !== ''
    return val.length > 0
  }, [step, answers])

  const handleSingleSelect = (questionId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  const handleMultiSelect = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || []
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option]
      return { ...prev, [questionId]: next }
    })
  }

  const handleTextChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_data: answers,
        })
        .eq('id', user.id)

      if (error) {
        console.error('Failed to save onboarding data:', error)
      }

      goTo(TOTAL_QUESTIONS, 'forward')
    } catch (err) {
      console.error('Onboarding save error:', err)
    } finally {
      setSaving(false)
    }
  }

  // Check if already onboarded
  useEffect(() => {
    const checkOnboarding = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()
      if (profile?.onboarding_completed) {
        router.push('/dashboard')
      }
    }
    checkOnboarding()
  }, [router])

  // ── Render helpers ──

  const renderWelcome = () => (
    <div className="text-center max-w-lg mx-auto">
      <p className="eyebrow-accent mb-6">Raise Web3</p>
      <h1 className="display text-[40px] sm:text-[44px] mb-5">
        Before we build <em>your path.</em>
      </h1>
      <p className="text-[15px] leading-[24px] text-ink-soft mb-6">
        A few quick questions so we can personalise your route through the
        course and surface the modules that matter most for your specific raise.
      </p>
      <div className="mx-auto max-w-sm px-5 py-4 rounded-xl bg-surface-muted/60 border border-line-soft">
        <p className="text-[13px] leading-[20px] text-ink-muted">
          Be honest, not polished. The founders who get the most out of this
          course are the ones who tell us exactly where they&apos;re stuck.
        </p>
      </div>
      <div className="mt-10">
        <Button size="lg" onClick={() => goTo(0, 'forward')} className="px-10">
          Get started
        </Button>
      </div>
    </div>
  )

  const renderCompletion = () => (
    <div className="text-center max-w-lg mx-auto">
      <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center">
        <svg className="w-7 h-7 text-accent-deep" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="display text-[40px] sm:text-[44px] mb-4">
        You&apos;re <em>in.</em>
      </h1>
      <p className="text-[15px] leading-[24px] text-ink-soft mb-10">
        Based on what you told us, here&apos;s where to start.
      </p>
      <Link href="/dashboard">
        <Button size="lg" className="px-10">
          Start Module 0
          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Button>
      </Link>
    </div>
  )

  const renderSingleSelect = (q: Step) => (
    <div className="space-y-2">
      {q.options!.map((option) => (
        <OptionCard
          key={option}
          label={option}
          selected={answers[q.id] === option}
          onClick={() => handleSingleSelect(q.id, option)}
        />
      ))}
    </div>
  )

  const renderMultiSelect = (q: Step) => (
    <div className="space-y-2">
      {q.options!.map((option) => (
        <CheckCard
          key={option}
          label={option}
          checked={((answers[q.id] as string[]) || []).includes(option)}
          onClick={() => handleMultiSelect(q.id, option)}
        />
      ))}
    </div>
  )

  const renderTextInput = (q: Step) => {
    const value = (answers[q.id] as string) || ''
    const isShort = (q.maxLength || 280) <= 50
    return (
      <div>
        {isShort ? (
          <input
            type="text"
            value={value}
            onChange={(e) => handleTextChange(q.id, e.target.value)}
            maxLength={q.maxLength}
            placeholder={q.placeholder}
            className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors duration-150 text-[15px]"
          />
        ) : (
          <div className="relative">
            <textarea
              value={value}
              onChange={(e) => handleTextChange(q.id, e.target.value)}
              maxLength={q.maxLength}
              placeholder={q.placeholder}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-ink placeholder:text-ink-faint focus:outline-none focus:border-ink transition-colors duration-150 text-[15px] leading-[24px] resize-none"
            />
            {q.maxLength && (
              <span className="absolute bottom-3 right-4 text-[11px] font-mono text-ink-faint">
                {value.length}/{q.maxLength}
              </span>
            )}
          </div>
        )}
        {q.examples && <ExampleBlock examples={q.examples} />}
      </div>
    )
  }

  const renderGroup = (q: Step) => (
    <div className="space-y-8">
      {q.subQuestions!.map((sq) => (
        <div key={sq.id}>
          <p className="text-[14px] font-medium text-ink-soft mb-3">
            {sq.label}
          </p>
          <div className="space-y-2">
            {sq.options.map((option) => (
              <OptionCard
                key={option}
                label={option}
                selected={answers[sq.id] === option}
                onClick={() => handleSingleSelect(sq.id, option)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  const renderQuestion = (q: Step) => {
    switch (q.type) {
      case 'single':
        return renderSingleSelect(q)
      case 'multi':
        return renderMultiSelect(q)
      case 'text':
        return renderTextInput(q)
      case 'group':
        return renderGroup(q)
    }
  }

  const renderStep = () => {
    if (step === -1) return renderWelcome()
    if (step >= TOTAL_QUESTIONS) return renderCompletion()

    const q = STEPS[step]
    const isLast = step === TOTAL_QUESTIONS - 1

    return (
      <div>
        {/* Progress */}
        <div className="mb-8">
          <ProgressBar current={step} total={TOTAL_QUESTIONS} />
          <p className="mt-3 breadcrumb">
            Question {String(step + 1).padStart(2, '0')} / {String(TOTAL_QUESTIONS).padStart(2, '0')}
          </p>
        </div>

        {/* Question */}
        <h2 className="display text-[28px] sm:text-[32px] leading-[1.2] mb-3">
          {q.title}
        </h2>
        {q.subtitle && (
          <p className="text-[14px] text-ink-soft mb-6">{q.subtitle}</p>
        )}
        {q.optional && (
          <p className="text-[13px] text-ink-muted mb-6 italic font-serif">
            Optional — skip if nothing specific comes to mind.
          </p>
        )}

        {/* Answer area */}
        <div className="mb-8">{renderQuestion(q)}</div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-line-soft">
          <button
            type="button"
            onClick={() => goTo(step === 0 ? -1 : step - 1, 'back')}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer py-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-3">
            {q.optional && (
              <button
                type="button"
                onClick={isLast ? handleSubmit : () => goTo(step + 1, 'forward')}
                className="text-[13px] font-medium text-ink-muted hover:text-ink-soft transition-colors cursor-pointer py-2 px-3"
              >
                Skip
              </button>
            )}
            {isLast ? (
              <Button
                onClick={handleSubmit}
                loading={saving}
                disabled={!q.optional && !canContinue()}
                size="md"
              >
                Complete
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Button>
            ) : (
              <Button
                onClick={() => goTo(step + 1, 'forward')}
                disabled={!canContinue()}
                size="md"
              >
                Continue
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Animation classes ──

  const getAnimClass = () => {
    if (!animating) return 'opacity-100 translate-x-0'
    return direction === 'forward'
      ? 'opacity-0 -translate-x-6'
      : 'opacity-0 translate-x-6'
  }

  // ── Page shell ──

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Link href="/" className="mb-8 inline-flex items-center gap-1.5">
        <span className="font-serif text-[22px] text-ink tracking-tight">Nozomi</span>
        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
      </Link>

      {/* Card */}
      <div
        className={`
          w-full max-w-xl rounded-2xl bg-surface border border-line
          p-8 sm:p-10 transition-all duration-250 ease-out ${getAnimClass()}
        `}
        style={{ boxShadow: '0 1px 2px rgba(20,20,20,0.04), 0 8px 24px -12px rgba(20,20,20,0.08)' }}
      >
        {renderStep()}
      </div>

      {/* Footer */}
      <p className="mt-8 text-[11px] text-ink-faint uppercase tracking-[0.14em]">
        &copy; {new Date().getFullYear()} Nozomi
      </p>
    </div>
  )
}
