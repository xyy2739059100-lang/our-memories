"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncKindFromCloud, type SyncKind } from "@/lib/cloud";

const KINDS: SyncKind[] = ["journal", "travel", "anniversary"];

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const value = passcode.trim();
    if (!value) {
      setError("先输入口令再进");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: value }),
      });
      const result = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setError(result?.error ?? "进不去，再试一次");
        return;
      }

      // 第一次登录：把本机已有的回忆搬到云端；换设备登录：把云端的拉下来
      for (const kind of KINDS) {
        await syncKindFromCloud(kind);
      }
      router.replace("/");
    } catch {
      setError("连不上服务器，检查一下网络");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100svh-7rem)] items-center justify-center px-5 py-14">
      <div className="w-full max-w-[392px]">
        <div className="mb-9 text-center">
          <div
            className="mx-auto mb-5 flex h-[74px] w-[74px] items-center justify-center rounded-full"
            style={{
              background:
                "radial-gradient(circle at 32% 28%, #fffdf7 0%, #fbf1dd 52%, #f2e2c6 100%)",
              boxShadow:
                "0 10px 28px rgba(120, 95, 60, 0.13), inset 0 0 0 1px rgba(216, 181, 110, 0.42)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c99a32"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="h-[26px] w-[26px]"
            >
              <rect x="4.5" y="10" width="15" height="10.5" rx="3" />
              <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
              <circle cx="12" cy="15.2" r="1.4" />
            </svg>
          </div>
          <p className="text-[12px] tracking-[0.34em] text-[#b98c37]">
            OUR MEMORIES
          </p>
          <h1 className="mt-3 font-serif text-[27px] leading-tight text-[#5c4a3a]">
            我们的回忆
          </h1>
          <p className="mt-2.5 text-[13px] text-[#8b7d6b]">
            这扇门只为我们两个人开着
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[24px] border px-6 py-6"
          style={{
            backgroundColor: "rgba(255, 253, 247, 0.82)",
            borderColor: "rgba(226, 205, 167, 0.68)",
            boxShadow:
              "0 14px 36px rgba(120, 95, 60, 0.12), 0 2px 6px rgba(120, 95, 60, 0.05)",
            backdropFilter: "blur(18px) saturate(1.35)",
          }}
        >
          <label
            htmlFor="passcode"
            className="block text-[11.5px] tracking-[0.2em] text-[#a3937c]"
          >
            访问口令
          </label>
          <input
            id="passcode"
            type="password"
            value={passcode}
            onChange={(event) => {
              setPasscode(event.target.value);
              if (error) setError(null);
            }}
            autoComplete="current-password"
            placeholder="输入我们的口令"
            className="mt-2.5 w-full rounded-[14px] border bg-[#fffdf7]/92 px-4 py-3 text-[15px] text-[#5c4a3a] outline-none transition placeholder:text-[#b3a896] focus:border-[#d8b56e] focus:ring-2 focus:ring-[#e8b84a]/25"
            style={{ borderColor: "rgba(226, 205, 167, 0.85)" }}
          />

          {error ? (
            <p className="mt-3 text-[12.5px] leading-relaxed text-[#c4553f]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center rounded-full py-3 text-[15px] tracking-[0.08em] text-[#fffdf7] transition active:scale-[0.99] disabled:opacity-70"
            style={{
              background:
                "linear-gradient(180deg, #e0bd6f 0%, #d3a64c 100%)",
              boxShadow:
                "0 8px 20px rgba(201, 154, 50, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.4)",
            }}
          >
            {busy ? "正在打开…" : "进入"}
          </button>
        </form>

        <p className="mt-7 text-center text-[11.5px] leading-[1.7] text-[#a3937c]">
          口令和回忆都只存在我们自己的服务器上，
          <br />
          没有口令的人打不开这些页面。
        </p>
      </div>
    </div>
  );
}
