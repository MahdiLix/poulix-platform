export function WalletIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <ellipse cx="60" cy="88" rx="40" ry="6" fill="white" opacity="0.15" />
      <rect
        x="20"
        y="30"
        width="70"
        height="50"
        rx="12"
        fill="url(#walletGrad)"
      />
      <rect
        x="20"
        y="30"
        width="70"
        height="50"
        rx="12"
        stroke="white"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <rect x="70" y="42" width="28" height="26" rx="8" fill="#1a3fd4" />
      <circle cx="84" cy="55" r="5" fill="white" opacity="0.8" />
      <circle cx="45" cy="20" r="10" fill="#fbbf24" opacity="0.9" />
      <circle cx="65" cy="14" r="7" fill="#fbbf24" opacity="0.7" />
      <circle cx="80" cy="22" r="8" fill="#fbbf24" opacity="0.8" />
      <path
        d="M55 10 L58 4 L61 10"
        stroke="#34d399"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M60 10 L60 2"
        stroke="#34d399"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="walletGrad" x1="20" y1="30" x2="90" y2="80">
          <stop stopColor="#4d76ff" />
          <stop offset="1" stopColor="#1a3fd4" />
        </linearGradient>
      </defs>
    </svg>
  );
}
