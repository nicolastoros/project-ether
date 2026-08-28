"use server";

import bcrypt from "bcryptjs";
import { BigQuery } from "@google-cloud/bigquery";

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

export async function getSecretQuestionAction(username: string) {
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
      return { error: "User not found." };
    }

    const question = rows[0].secret_question;
    if (!question) {
      return { error: "This user does not have a secret question set." };
    }

    return { question };
  } catch (err) {
    console.error("Error fetching secret question:", err);
    return { error: "An internal error occurred." };
  }
}

export async function resetPasswordWithAnswerAction(username: string, answer: string, newPassword: string) {
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
      return { error: "User not found." };
    }

    const user = rows[0];
    if (!user.secret_answer) {
      return { error: "This user does not have a secret answer set." };
    }

    if (user.secret_answer.toLowerCase() !== answer.toLowerCase().trim()) {
      return { error: "Incorrect secret answer." };
    }

    if (newPassword.length < 6) {
      return { error: "Password must be at least 6 characters." };
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
    return { error: "An internal error occurred." };
  }
}
