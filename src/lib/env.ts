type PublicEnvironment = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  siteUrl: string;
};

function requireValue(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requireHttpUrl(name: string, value: string | undefined) {
  const configuredValue = requireValue(name, value);

  try {
    const url = new URL(configuredValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }

    return url.origin;
  } catch {
    throw new Error(`Invalid URL in environment variable: ${name}`);
  }
}

export function getPublicEnvironment(): PublicEnvironment {
  return {
    supabaseUrl: requireHttpUrl(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    supabasePublishableKey: requireValue(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
    siteUrl: requireHttpUrl(
      "NEXT_PUBLIC_SITE_URL",
      process.env.NEXT_PUBLIC_SITE_URL,
    ),
  };
}
