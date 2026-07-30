// components/ui/Avatar.tsx

type AvatarColor = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface AvatarProps {
  initials: string;
  color?: AvatarColor;
  size?: number;
  fontSize?: number;
}

export default function Avatar({ initials, color = 1, size = 36, fontSize }: AvatarProps) {
  const fs = fontSize ?? Math.round(size * 0.36);
  return (
    <div
      className={`avatar av av${color}`}
      style={{ width: size, height: size, fontSize: fs, minWidth: size }}
    >
      {initials}
    </div>
  );
}

