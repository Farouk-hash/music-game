import { base } from '../_base.js';

export function IconWifiOff({ className = "w-5 h-5", ...props }) {
  return (
    <svg {...base} className={className} {...props}>
      {/* The diagonal slash indicating "off" */}
      <line x1="1" y1="1" x2="23" y2="23" />
      
      {/* Wifi signal arcs (drawn from outer to inner) */}
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      
      {/* The dot at the base of the wifi symbol */}
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}