#!/usr/bin/env node
/**
 * Push Counselly auth email templates to project xiwaeetiolcxqoufsejw.
 * Token: https://supabase.com/dashboard/account/tokens
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/push-email-templates.mjs
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
const templatesDir = join(root, "supabase-email-templates");

const files = {
  mailer_subjects_magic_link: "Your sign-in link",
  mailer_templates_magic_link_content: "magic-link-counselly.html",
  mailer_subjects_recovery: "Reset your password",
  mailer_templates_recovery_content: "reset-password-shared.html",
};

const body = {};
for (const [key, value] of Object.entries(files)) {
  if (key.endsWith("_content")) {
    const content = readFileSync(join(templatesDir, value), "utf8");
    console.log(`${value}: ${content.length} chars`);
    if (content.length > 5000) {
      console.error(`${value} exceeds Supabase ~5000 char limit`);
      process.exit(1);
    }
    body[key] = content;
  } else {
    body[key] = value;
  }
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  },
);

const text = await res.text();
if (!res.ok) {
  console.error(`Failed (${res.status}):`, text);
  process.exit(1);
}

console.log("Updated magic link + recovery templates on", projectRef);
console.log("Also add Counselly URLs under Authentication → URL Configuration → Redirect URLs.");
