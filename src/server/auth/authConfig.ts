export type AdminAuthConfig = {
  enabled: boolean;
  password?: string;
  sessionSecret?: string;
  reason?: string;
};

let cachedConfig: AdminAuthConfig | null = null;

export function resolveAdminAuthConfig(): AdminAuthConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!password || !sessionSecret) {
    cachedConfig = {
      enabled: false,
      reason: "Missing ADMIN_PASSWORD or ADMIN_SESSION_SECRET",
    };
    return cachedConfig;
  }

  cachedConfig = {
    enabled: true,
    password,
    sessionSecret,
  };

  return cachedConfig;
}

export function refreshAdminAuthConfig(): AdminAuthConfig {
  cachedConfig = null;
  return resolveAdminAuthConfig();
}
