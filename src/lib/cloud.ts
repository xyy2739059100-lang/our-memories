/**
 * 云端同步（可选）。
 * 登录后三个页面（手账 / 旅行 / 纪念日）的存档会同步到服务器；
 * 没登录、服务器没配置或网络失败时静默退回本机 localStorage，页面照常能用。
 */

export type SyncKind = "journal" | "travel" | "anniversary";

const STORAGE_KEYS: Record<SyncKind, string> = {
  journal: "our-memories:journal:v1",
  travel: "our-memories:travel:v2",
  anniversary: "our-memories:anniversary:v2",
};

interface CloudEnvelope {
  savedAt: number;
  payload: unknown;
}

/** unknown = 还没探测；off = 没登录，别再请求 */
let authState: "unknown" | "on" | "off" = "unknown";

const pending = new Map<SyncKind, unknown>();
const timers = new Map<SyncKind, ReturnType<typeof setTimeout>>();

function readLocal(kind: SyncKind): CloudEnvelope | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS[kind]);
    if (!raw) return null;
    const payload = JSON.parse(raw) as { savedAt?: unknown } | null;
    if (!payload) return null;
    const savedAt = typeof payload.savedAt === "number" ? payload.savedAt : 0;
    return { savedAt, payload };
  } catch {
    return null;
  }
}

function writeLocal(kind: SyncKind, payload: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

function notifyFailure() {
  if (typeof document === "undefined") return;
  const id = "om-sync-error";
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement("div");
    node.id = id;
    node.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:92px",
      "transform:translateX(-50%)",
      "z-index:9999",
      "max-width:86vw",
      "padding:10px 16px",
      "border-radius:14px",
      "background:rgba(60,40,30,.92)",
      "color:#fff8ef",
      "font-size:13px",
      "line-height:1.5",
      "box-shadow:0 8px 24px rgba(0,0,0,.18)",
      "transition:opacity .3s",
    ].join(";");
    document.body.appendChild(node);
  }
  node.textContent = "云端保存失败，改动只存在这台设备上";
  node.style.opacity = "1";
  window.setTimeout(() => {
    const target = document.getElementById(id);
    if (target) target.style.opacity = "0";
  }, 6000);
}

async function send(kind: SyncKind, payload: unknown): Promise<boolean> {
  try {
    const response = await fetch(`/api/data/${kind}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
      credentials: "same-origin",
      cache: "no-store",
    });
    if (response.status === 401) {
      authState = "off";
      notifyFailure();
      return false;
    }
    if (!response.ok) {
      notifyFailure();
      return false;
    }
    authState = "on";
    return true;
  } catch {
    notifyFailure();
    return false;
  }
}

/** 改动后排队上传：短时间内的连续改动只推最后一份 */
export function queuePush(kind: SyncKind, payload: unknown) {
  if (typeof window === "undefined" || authState === "off") return;

  pending.set(kind, payload);
  const timer = timers.get(kind);
  if (timer) clearTimeout(timer);
  timers.set(
    kind,
    setTimeout(() => {
      timers.delete(kind);
      const latest = pending.get(kind);
      pending.delete(kind);
      if (latest === undefined) return;
      void send(kind, latest);
    }, 800),
  );
}

export async function pullCloud(kind: SyncKind): Promise<CloudEnvelope | null> {
  try {
    const response = await fetch(`/api/data/${kind}`, {
      cache: "no-store",
      credentials: "same-origin",
    });
    if (response.status === 401) {
      authState = "off";
      return null;
    }
    if (!response.ok) return null;
    authState = "on";

    const data = (await response.json()) as Partial<CloudEnvelope> | null;
    if (!data || typeof data.savedAt !== "number" || data.payload == null) {
      return null;
    }
    return { savedAt: data.savedAt, payload: data.payload };
  } catch {
    return null;
  }
}

/**
 * 进页面时调用一次：
 * 云端更新 → 写回本地并返回 true（页面据此重新载入）；
 * 本地更新 → 把本机这份推上去；两边一样 → 什么都不做。
 */
export async function syncKindFromCloud(kind: SyncKind): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const remote = await pullCloud(kind);
  const local = readLocal(kind);

  if (!remote) {
    // 云端还是空的：把本机已有的内容搬上去（第一次登录时用）
    if (local) void send(kind, local.payload);
    return false;
  }

  if (remote.savedAt > (local?.savedAt ?? 0)) {
    return writeLocal(kind, remote.payload);
  }
  if (local && local.savedAt > remote.savedAt) {
    void send(kind, local.payload);
  }
  return false;
}
