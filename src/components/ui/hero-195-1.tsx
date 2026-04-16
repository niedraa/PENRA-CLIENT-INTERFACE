import { cn } from "@/lib/utils"

interface Hero195Props {
  title?: string
  subtitle?: string
  badge?: string
  className?: string
  children?: React.ReactNode
}

export function Hero195({
  title = "Bienvenue sur PENRA",
  subtitle = "Automatisez votre présence digitale et gérez vos agents IA depuis un seul espace.",
  badge,
  className,
  children,
}: Hero195Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#DEE2E6] bg-gradient-to-br from-white via-[#F8F9FA] to-[#E9ECEF] px-8 py-10",
        className,
      )}
    >
      {/* Decorative grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#212529 1px, transparent 1px), linear-gradient(90deg, #212529 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Accent orb */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-sky-100/40 blur-2xl" />

      <div className="relative z-10 space-y-3">
        {badge && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CED4DA] bg-white/80 px-3 py-1 text-xs font-semibold text-[#6C757D] backdrop-blur-sm">
            {badge}
          </span>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-[#212529] sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-xl text-base text-[#6C757D]">{subtitle}</p>
        {children && <div className="pt-2">{children}</div>}
      </div>
    </div>
  )
}
