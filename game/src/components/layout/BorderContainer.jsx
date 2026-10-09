// game/src/components/layout/Container.jsx
//
// A bordered panel primitive. Wrap any section in it to give it
// consistent surface, radius, padding, and optionally a border.
//
//   <Container>                                 // no border
//   <Container border="all">                    // full border
//   <Container border="top,bottom">             // top + bottom edges
//   <Container border="horizontal">             // left + right
//   <Container border="vertical">               // top + bottom
//   <Container border="all" borderClass="border-accent-2">
//   <Container surface="flat">                  // no background or shadow
//   <Container padding="lg">                    // more padding
//
// Anything else (dashed borders, gradient edges, hover changes) can be
// layered with `borderClass` or by nesting a raw <div> inside.

const BORDER_MAP = {
  all:        'border border-border',
  top:        'border-t border-border',
  bottom:     'border-b border-border',
  left:       'border-l border-border',
  right:      'border-r border-border',
  horizontal: 'border-l border-r border-border',
  vertical:   'border-t border-b border-border',
  none:       '',
};

const SURFACE_MAP = {
  raised: 'bg-surface shadow-lg',
  flat:   'bg-surface',
  plain:  'bg-transparent',
};

const PADDING_MAP = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8 sm:p-10',
  xl:   'px-6 py-10 sm:px-10 sm:py-14',
};

const RADIUS_MAP = {
  none: '',
  sm:   'rounded-sm',
  md:   'rounded-md',
  lg:   'rounded-lg',
};

export function BorderContainer({
  children,
  border       = 'none',
  borderClass  = '',
  surface      = 'flat',
  padding      = 'md',
  radius       = 'lg',
  className    = '',
  as: Tag      = 'div',
  ...rest
}) {
  const borderClasses = resolveBorder(border);
  const surfaceClass  = SURFACE_MAP[surface]  ?? SURFACE_MAP.flat;
  const paddingClass  = PADDING_MAP[padding]  ?? PADDING_MAP.md;
  const radiusClass   = RADIUS_MAP[radius]    ?? RADIUS_MAP.lg;

  return (
    <Tag
      className={[
        'relative',
        radiusClass,
        surfaceClass,
        paddingClass,
        borderClasses,
        borderClass,
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function resolveBorder(border) {
  if (!border || border === 'none') return '';
  // Comma list: "top,bottom"
  if (border.includes(',')) {
    return border
      .split(',')
      .map((b) => BORDER_MAP[b.trim()] ?? '')
      .filter(Boolean)
      .join(' ');
  }
  return BORDER_MAP[border] ?? '';
}