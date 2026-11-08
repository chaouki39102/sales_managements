// resources/js/pages/profile/components/UserAvatar.tsx
import type { UserProfile } from "../types";
import { avColor } from "../constants";

export default function UserAvatar({ user, size = 72 }: { user: UserProfile; size?: number }) {
  const initials = user.name
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        style={{
          width: size, height: size,
          borderRadius: size * 0.28,
          objectFit: "cover",
          flexShrink: 0,
          border: "3px solid var(--b1)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: size * 0.28,
        flexShrink: 0,
        background: avColor(user.id),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.35,
        fontWeight: 900,
        color: "#fff",
        letterSpacing: -1,
        boxShadow: "0 4px 20px rgba(0,0,0,.15)",
      }}
    >
      {initials}
    </div>
  );
}
