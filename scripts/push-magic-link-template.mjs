#!/usr/bin/env node
/**
 * Push Counselly magic-link HTML to the linked Supabase project.
 * Get a token: https://supabase.com/dashboard/account/tokens
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/push-magic-link-template.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const projectRef = "xiwaeetiolcxqoufsejw";
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error("Set SUPABASE_ACCESS_TOKEN (dashboard → Account → Access tokens)");
  process.exit(1);
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const content = readFileSync(
  join(root, "supabase-email-templates/magic-link-counselly.html"),
  "utf8",
);

console.log(`Template size: ${content.length} chars (limit ~5000)`);
if (content.length > 5000) {
  console.error("Template too large for Supabase hosted email templates.");
  process.exit(1);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mailer_subjects_magic_link: "Your sign-in link",
      mailer_templates_magic_link_content: content,
    }),
  },
);

const body = await res.text();
if (!res.ok) {
  console.error(`Failed (${res.status}):`, body);
  process.exit(1);
}

console.log("Magic link template updated on project", projectRef);
console.log("Trigger a new sign-in email to verify (old emails unchanged).");
