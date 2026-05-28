const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#4F46E5" },
  { bg: "#F0FDF4", text: "#16A34A" },
  { bg: "#FFF7ED", text: "#EA580C" },
  { bg: "#FDF2F8", text: "#DB2777" },
  { bg: "#ECFEFF", text: "#0891B2" },
  { bg: "#F5F3FF", text: "#7C3AED" },
];

const SIZES = { sm: 28, md: 36, lg: 48 } as const;
const FONT_SIZES = { sm: 12, md: 14, lg: 18 } as const;
const RADII = { sm: 8, md: 10, lg: 12 } as const;

export function avatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface AvatarInitialProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AvatarInitial({ name, size = "md", className }: AvatarInitialProps) {
  const color = avatarColor(name);
  const px = SIZES[size];
  return (
    <div
      className={`sw-avatar${className ? ` ${className}` : ""}`}
      style={{
        background: color.bg,
        color: color.text,
        width: px,
        height: px,
        fontSize: FONT_SIZES[size],
        borderRadius: RADII[size],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {name.slice(0, 1)}
    </div>
  );
}
