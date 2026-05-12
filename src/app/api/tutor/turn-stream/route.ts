import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET /api/tutor/turn-stream?turnCorrelationId=<uuid>
// Server-Sent Events stream of progress rows from tutor_turn_progress.
// Closes when a 'done' stage is received OR after 60s safety timeout.
export async function GET(request: NextRequest) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return new Response('Unauthenticated', { status: 401 })

  const turnCorrelationId = request.nextUrl.searchParams.get('turnCorrelationId')
  if (!turnCorrelationId) return new Response('turnCorrelationId required', { status: 400 })

  const admin = createAdminClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const started = Date.now()
      let lastSeen = new Date(0).toISOString()
      let closed = false

      function safeEnqueue(s: string) {
        if (closed) return
        try { controller.enqueue(encoder.encode(s)) } catch { closed = true }
      }

      function close() {
        if (closed) return
        closed = true
        try { controller.close() } catch {}
      }

      // Send a comment immediately so the connection is established and
      // the client knows the stream is alive.
      safeEnqueue(': connected\n\n')

      const interval = setInterval(async () => {
        if (closed) { clearInterval(interval); return }
        if (Date.now() - started > 60_000) {
          safeEnqueue('event: timeout\ndata: {"error":"timeout"}\n\n')
          clearInterval(interval)
          close()
          return
        }

        const { data, error } = await admin
          .from('tutor_turn_progress')
          .select('stage, message, payload, created_at')
          .eq('turn_correlation_id', turnCorrelationId)
          .gt('created_at', lastSeen)
          .order('created_at', { ascending: true })

        if (error) {
          safeEnqueue(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`)
          return
        }

        for (const row of data ?? []) {
          safeEnqueue(`data: ${JSON.stringify(row)}\n\n`)
          lastSeen = row.created_at
          if (row.stage === 'done') {
            clearInterval(interval)
            close()
            return
          }
        }
      }, 400)

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}
