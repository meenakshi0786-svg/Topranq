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
        <rect width="40" height="40" rx="10" fill={accentColor} />
        <path
          d="M20 10L28 22H22V30H18V22H12L20 10Z"
          fill={white ? "#4F6EF7" : "#ffffff"}
        />
      </svg>
      <span
        style={{
          color: textColor,
          fontSize: size * 0.58,
          fontWeight: 700,
          letterSpacing: "-0.03em",
        }}
      >
        TopRanq
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
      <rect width="40" height="40" rx="10" fill="#4F6EF7" />
      <path d="M20 10L28 22H22V30H18V22H12L20 10Z" fill="#ffffff" />
    </svg>
  );
}
