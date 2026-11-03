/**
 * 服务端的私密配置：访问口令 + 签名密钥。
 * 没配置时登录接口会明确报错，而不是静默放行（否则谁都能看）。
 */

export interface AuthConfig {
  passcode: string;
  secret: string;
}

export const CONFIG_MISSING_MESSAGE =
  "服务器还没设置访问口令：请在项目根目录 .env.local 里填写 OM_PASSCODE 与 OM_SESSION_SECRET，然后重启服务。";

export function readAuthConfig(): AuthConfig | null {
  const passcode = process.env.OM_PASSCODE?.trim();
  const secret = process.env.OM_SESSION_SECRET?.trim();
  if (!passcode || !secret) return null;
  return { passcode, secret };
}

/** 云端存档目录；默认项目根目录下的 data/ */
export function dataDirectory(): string {
  const configured = process.env.OM_DATA_DIR?.trim();
  return configured || "data";
}
