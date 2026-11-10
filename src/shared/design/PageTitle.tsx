import type { ReactNode } from 'react'

export function PageTitle({ title, sub, action }: { title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 md:mb-8">
      <div className="flex min-w-0 items-baseline gap-3">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        <span className="text-sm tabular-nums text-subtle">{sub}</span>
      </div>
      {action}
    </div>
  )
}
