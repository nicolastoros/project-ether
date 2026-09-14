"use server";

import bcrypt from "bcryptjs";
import { BigQuery } from "@google-cloud/bigquery";
import { TRANSLATIONS, type Language, type TranslationKey } from "@/lib/i18n/translations";

// TRANSLATIONS is plain data (no "use client" needed to read it) — safe to use directly in a
// server action, which has no store/hook access of its own. The caller (ForgotPasswordPage) passes
// its own current language along with every call, same idea as any other server action that needs
// caller-side context it can't otherwise see.
function tr(language: Language, key: TranslationKey): string {
  return TRANSLATIONS[language][key];
}

// Helper to reuse the same BigQuery logic. 
// Note: We could export `bq()` from `lib/db/bigquery.ts` but for now we'll just instantiate it or use the same pattern.
const PROJECT_ID = process.env.BIGQUERY_PROJECT_ID ?? "project-scrappy-intelic";
const DATASET = process.env.BIGQUERY_DATASET ?? "project_ether";

function getCredentials() {
  const encoded = process.env.GCP_SERVICE_ACCOUNT_KEY_BASE64;
  if (!encoded) return undefined;
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"));
}

let client: BigQuery | null = null;
function bq() {
  if (!client) {
    const credentials = getCredentials();
    client = new BigQuery({ projectId: PROJECT_ID, ...(credentials && { credentials }) });
  }
  return client;
}

function table(name: string) {
  return `\`${PROJECT_ID}.${DATASET}.${name}\``;
}

export async function getSecretQuestionAction(username: string, language: Language = "en") {
  try {
    const [rows] = await bq().query({
      query: `
        SELECT secret_question
        FROM ${table("users")}
        WHERE LOWER(username) = LOWER(@username)
        LIMIT 1
      `,
      params: { username },
    });

    if (rows.length === 0) {
      return { error: tr(language, "auth.error_user_not_found") };
    }

    const question = rows[0].secret_question;
    if (!question) {
      return { error: tr(language, "auth.error_no_secret_question") };
    }

    return { question };
  } catch (err) {
    console.error("Error fetching secret question:", err);
    return { error: tr(language, "auth.error_internal") };
  }
}

export async function resetPasswordWithAnswerAction(
  username: string,
  answer: string,
  newPassword: string,
  language: Language = "en"
) {
  try {
    const [rows] = await bq().query({
      query: `
        SELECT id, secret_answer
        FROM ${table("users")}
        WHERE LOWER(username) = LOWER(@username)
        LIMIT 1
      `,
      params: { username },
    });

    if (rows.length === 0) {
      return { error: tr(language, "auth.error_user_not_found") };
    }

    const user = rows[0];
    if (!user.secret_answer) {
      return { error: tr(language, "auth.error_no_secret_answer") };
    }

    if (user.secret_answer.toLowerCase() !== answer.toLowerCase().trim()) {
      return { error: tr(language, "auth.error_incorrect_secret_answer") };
    }

    if (newPassword.length < 6) {
      return { error: tr(language, "auth.error_password_length") };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await bq().query({
      query: `
        UPDATE ${table("users")}
        SET password_hash = @passwordHash
        WHERE id = @id
      `,
      params: { id: user.id, passwordHash },
    });

    return { success: true };
  } catch (err) {
    console.error("Error resetting password:", err);
    return { error: tr(language, "auth.error_internal") };
  }
}
