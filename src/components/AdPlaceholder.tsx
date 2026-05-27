type AdFormat = 'in-article' | 'horizontal' | 'square';

interface AdPlaceholderProps {
  format: AdFormat;
  className?: string;
}

const FORMAT_HEIGHT: Record<AdFormat, string> = {
  'in-article': 'min-h-[160px]',
  horizontal: 'min-h-[90px]',
  square: 'min-h-[250px]',
};

export function AdPlaceholder({ format, className }: AdPlaceholderProps) {
  const heightClass = FORMAT_HEIGHT[format] ?? FORMAT_HEIGHT['in-article'];
  return (
    <aside
      role="complementary"
      aria-label="Advertisement"
      className={[
        'border border-dashed border-border rounded-lg flex items-center justify-center text-text-muted text-xs uppercase tracking-wide bg-bg-secondary/40',
        heightClass,
        className ?? '',
      ].join(' ').trim()}
    >
      <span aria-hidden="true">advertisement</span>
    </aside>
  );
}

export default AdPlaceholder;
