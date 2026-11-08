// resources/js/pages/users/components/Avatar.tsx
import { avColor } from "../constants";

export default function Avatar({
    name,
    id,
    size = 38,
}: {
    name: string;
    id: number;
    size?: number;
}) {
    const initials = name
        .trim()
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");
    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: size * 0.28,
                flexShrink: 0,
                background: avColor(id),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: size * 0.36,
                fontWeight: 900,
                color: "#fff",
                letterSpacing: -1,
            }}
        >
            {initials}
        </div>
    );
}
