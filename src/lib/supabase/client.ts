import { createBrowserClient } from "@supabase/ssr";

import { getPublicEnvironment } from "@/lib/env";
import type { Database } from "@/types/database.types";

export function createClient() {
  const environment = getPublicEnvironment();

  return createBrowserClient<Database>(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
  );
}
