export function PageTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5 flex items-baseline gap-3 md:mb-8">
      <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
      <span className="text-sm tabular-nums text-subtle">{sub}</span>
    </div>
  )
}
