export function Field({
  id,
  label,
  required,
  children,
}: {
  id: string
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-strong">
        {label}
        {required && <span className="text-accent">*</span>}
      </label>
      {children}
    </div>
  )
}
