/** Open contract / capture gate. Original COMRDY vector mark. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`brand-mark ${className}`}
      width="32"
      height="32"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M28 7H15L7 15V25L15 33H28"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinejoin="miter"
      />
      <path d="M30 15V25" stroke="currentColor" strokeWidth="5" />
      <path className="brand-signal" d="M18 20H25" strokeWidth="4" />
      <path className="brand-signal" d="M35 20H39" strokeWidth="4" />
    </svg>
  );
}
