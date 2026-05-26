import { zodResolver as baseZodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

/**
 * Safe Zod resolver for react-hook-form.
 *
 * `@hookform/resolvers@3` + Zod 4 throws unhandled `ZodError` exceptions
 * during onChange/setValue. This wrapper catches the throw and converts
 * it to the RHF resolver-error format.
 *
 * Usage: replace `zodResolver(schema)` with `safeZodResolver(schema)`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeZodResolver<T extends z.ZodType>(schema: T): any {
  const inner = baseZodResolver(schema);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (values: any, context: any, options: any) => {
    try {
      return await inner(values, context, options);
    } catch (err: unknown) {
      // Zod 4 throws ZodError on parse failure. Convert to RHF format.
      if (err && typeof err === "object" && "issues" in err) {
        const issues = (
          err as {
            issues: Array<{
              path: (string | number)[];
              message: string;
            }>;
          }
        ).issues;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errors: Record<string, any> = {};
        for (const issue of issues) {
          const path = issue.path.join(".");
          if (path && !(path in errors)) {
            errors[path] = {
              type: "validation",
              message: issue.message,
            };
          }
        }
        return { values: {}, errors };
      }
      throw err;
    }
  };
}
