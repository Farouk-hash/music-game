
export function Card({ className = '', hover = false, children, ...rest }) {
  const base = 'bg-surface-muted rounded-lg shadow-card border border-surface-border';
  const hoverClass = hover ? 'transition-shadow hover:shadow-card-hover cursor-pointer' : '';
  const classes = [base, hoverClass, className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ className = '', children, ...rest }) {
  return (
    <div className={`px-5 py-4 border-b border-surface-border ${className}`} {...rest}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ className = '', children, ...rest }) {
  return (
    <div className={`px-5 py-4 ${className}`} {...rest}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ className = '', children, ...rest }) {
  return (
    <div className={`px-5 py-4 border-t border-surface-border ${className}`} {...rest}>
      {children}
    </div>
  );
};


// <Card hover>
//   <Card.Body>
//     <h3 className="font-semibold">Title</h3>
//     <p className="text-ink-muted text-sm">Description</p>
//   </Card.Body>
// </Card>