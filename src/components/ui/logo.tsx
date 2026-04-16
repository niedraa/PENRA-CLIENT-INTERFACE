
import logoUrl from '../../assets/logo.png';

export function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <div className="flex items-center gap-2">
      <img src={logoUrl} alt="PENRA Logo" className={className} />
    </div>
  );
}
