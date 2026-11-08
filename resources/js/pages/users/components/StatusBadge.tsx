// resources/js/pages/users/components/StatusBadge.tsx
import Badge from "./Badge";

export default function StatusBadge({ active }: { active: boolean }) {
    return active ? (
        <Badge color="var(--em)" bg="var(--emb)">
            <span
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--em)",
                    display: "inline-block",
                }}
            />
            نشط
        </Badge>
    ) : (
        <Badge color="var(--red)" bg="var(--redb)">
            <span
                style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--red)",
                    display: "inline-block",
                }}
            />
            موقوف
        </Badge>
    );
}
