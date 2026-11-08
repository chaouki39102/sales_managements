// resources/js/pages/profile/components/AvatarUpload.tsx
import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiUpload } from "@/lib/api/core/client";
import type { UserProfile } from "../types";
import { err2str } from "../utils";
import UserAvatar from "./UserAvatar";

// ─────────────────────────────────────────────────────────────
// Avatar Upload
// ─────────────────────────────────────────────────────────────
export default function AvatarUpload({ profile }: { profile: UserProfile }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("الملف يجب أن يكون صورة"); return; }
    if (file.size > 2 * 1024 * 1024)    { setError("حجم الصورة يجب ألا يتجاوز 2 ميجابايت"); return; }
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      await apiUpload("/me/avatar", fd);
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      setError(err2str(e, "فشل رفع الصورة"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <UserAvatar user={profile} size={80} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="تغيير الصورة الشخصية"
        style={{
          position: "absolute",
          bottom: -4, left: -4,
          width: 26, height: 26,
          borderRadius: "50%",
          background: "var(--em)",
          border: "2px solid var(--bg1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: uploading ? "not-allowed" : "pointer",
          color: "#fff",
          fontSize: 12,
        }}
      >
        <i className={`ti ${uploading ? "ti-loader" : "ti-camera"}`} />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {error && (
        <div style={{
          position: "absolute", top: "110%", right: 0,
          background: "var(--red)", color: "#fff",
          fontSize: 11, padding: "4px 10px", borderRadius: 8,
          whiteSpace: "nowrap", zIndex: 10,
        }}>{error}</div>
      )}
    </div>
  );
}
