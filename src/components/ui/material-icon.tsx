import { cn } from '@/lib/utils';

type MaterialIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
  weight?: number;
};

/**
 * Google Material Symbols (Outlined) icon, used across the vendor dashboard's
 * "Cockpit Precision" restyle in place of lucide-react. Sized via Tailwind
 * text-* utilities on className (it's a font glyph), tinted via variation
 * axes for the filled/weight states the mockups use.
 */
export function MaterialIcon({ name, className, filled = false, weight = 400 }: MaterialIconProps) {
  return (
    <span
      className={cn('material-symbols-outlined select-none leading-none', className)}
      style={{ fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24` }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
