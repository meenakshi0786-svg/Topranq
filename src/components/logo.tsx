export function Logo({ size = 32, white = false }: { size?: number; white?: boolean }) {
  const accentColor = white ? "#ffffff" : "#4F6EF7";
  const textColor = white ? "#ffffff" : "#1A1A2E";

  return (
    <div className="flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Gradient background */}
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4F6EF7" />
            <stop offset="1" stopColor="#7C5CFC" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill={white ? "#ffffff" : "url(#logoGrad)"} />
        {/* Chart bars rising — represents SEO growth/rankings */}
        <rect x="9" y="24" width="4" height="8" rx="1" fill={white ? "#4F6EF7" : "#ffffff"} opacity="0.6" />
        <rect x="15" y="19" width="4" height="13" rx="1" fill={white ? "#4F6EF7" : "#ffffff"} opacity="0.75" />
        <rect x="21" y="14" width="4" height="18" rx="1" fill={white ? "#4F6EF7" : "#ffffff"} opacity="0.9" />
        <rect x="27" y="9" width="4" height="23" rx="1" fill={white ? "#4F6EF7" : "#ffffff"} />
        {/* Upward arrow — represents ranking improvement */}
        <path
          d="M29 8L31.5 5L34 8"
          stroke={white ? "#4F6EF7" : "#ffffff"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span
        style={{
          color: textColor,
          fontSize: size * 0.5,
          fontWeight: 800,
          letterSpacing: "-0.04em",
        }}
      >
        Ranqapex
      </span>
    </div>
  );
}

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoMarkGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F6EF7" />
          <stop offset="1" stopColor="#7C5CFC" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#logoMarkGrad)" />
      <rect x="9" y="24" width="4" height="8" rx="1" fill="#ffffff" opacity="0.6" />
      <rect x="15" y="19" width="4" height="13" rx="1" fill="#ffffff" opacity="0.75" />
      <rect x="21" y="14" width="4" height="18" rx="1" fill="#ffffff" opacity="0.9" />
      <rect x="27" y="9" width="4" height="23" rx="1" fill="#ffffff" />
      <path d="M29 8L31.5 5L34 8" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
