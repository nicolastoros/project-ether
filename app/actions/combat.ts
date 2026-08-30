"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { createUserFormation, deleteUserFormation } from "@/lib/db/bigquery";

export async function saveFormationAction(name: string, creatureIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const id = await createUserFormation(session.user.id, name, creatureIds);
  revalidatePath("/");
  return id;
}

export async function deleteFormationAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  await deleteUserFormation(id, session.user.id);
  revalidatePath("/");
}
