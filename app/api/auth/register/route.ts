import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAccount, getUserByEmail, getUserByUsername } from "@/lib/db/bigquery";
import { STARTER_CHOICE_IDS } from "@/lib/gameData";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const { username, email, password, gender, starterCreatureId } = body as Record<string, unknown>;

  if (typeof username !== "string" || username.trim().length < 3 || username.trim().length > 20) {
    return NextResponse.json({ error: "El usuario debe tener entre 3 y 20 caracteres." }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return NextResponse.json(
      { error: "El usuario solo puede tener letras, números y guión bajo." },
      { status: 400 }
    );
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Ingresá un correo válido." }, { status: 400 });
  }
  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
  }
  if (gender !== "male" && gender !== "female") {
    return NextResponse.json({ error: "Elegí un personaje." }, { status: 400 });
  }
  if (
    typeof starterCreatureId !== "string" ||
    !STARTER_CHOICE_IDS.includes(starterCreatureId as (typeof STARTER_CHOICE_IDS)[number])
  ) {
    return NextResponse.json({ error: "Elegí una criatura inicial válida." }, { status: 400 });
  }

  const [existingUsername, existingEmail] = await Promise.all([
    getUserByUsername(username),
    getUserByEmail(email),
  ]);
  if (existingUsername) {
    return NextResponse.json({ error: "Ese usuario ya existe." }, { status: 409 });
  }
  if (existingEmail) {
    return NextResponse.json({ error: "Ese correo ya está registrado." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await createAccount({ username, email: email.trim(), passwordHash, gender, starterCreatureId });
  } catch (err) {
    console.error("Registration failed", err);
    return NextResponse.json({ error: "No se pudo crear la cuenta. Intentá de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
