import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Catch-all Better-Auth handler for all /api/auth/* routes.
export const { GET, POST } = toNextJsHandler(auth);
