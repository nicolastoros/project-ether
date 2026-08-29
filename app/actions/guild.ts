"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { 
  createGuild, 
  joinGuild, 
  getGuildById, 
  addGuildExp, 
  getGuilds, 
  getUserGuild,
  addGuildLog,
  getGuildLogs,
  updateGuildSettings,
  changeGuildMemberRole,
  removeGuildMember,
  createGuildRequest,
  getGuildRequests,
  resolveGuildRequest,
  createGuildInvite,
  getGuildInvites,
  resolveGuildInvite,
  getUserByUsername,
  searchUsernamesOnly
} from "@/lib/db/bigquery";

export async function createGuildAction(name: string, description: string, avatarKey: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not logged in");

  const guildId = await createGuild(session.user.id, name, description, avatarKey);
  await addGuildLog(guildId, 'system', `Guild ${name} was created by ${session.user.name || 'a user'}.`);
  revalidatePath("/");
  return guildId;
}

export async function joinGuildAction(guildId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not logged in");

  const data = await getGuildById(guildId);
  if (!data) throw new Error("Guild not found");
  if (data.members.length >= data.guild.member_cap) throw new Error("Guild is full");

  if (data.guild.require_approval) {
    await createGuildRequest(guildId, session.user.id);
  } else {
    await joinGuild(guildId, session.user.id);
    await addGuildLog(guildId, 'system', `${session.user.name || 'A user'} joined the guild.`);
  }
  revalidatePath("/");
}

export async function getGuildsAction(limit = 20) {
  return await getGuilds(limit);
}

export async function getMyGuildAction() {
  const session = await auth();
  if (!session?.user?.id) return null;
  
  const myGuild = await getUserGuild(session.user.id);
  if (!myGuild) return null;
  return await getGuildById(myGuild.id);
}

export async function getGuildByIdAction(guildId: string) {
  return await getGuildById(guildId);
}

export async function addGuildExpAction(guildId: string, expAmount: number) {
  const session = await auth();
  if (!session?.user?.id) return;
  await addGuildExp(guildId, session.user.id, expAmount);
}

export async function getGuildAdminDataAction(guildId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const logs = await getGuildLogs(guildId);
  const requests = await getGuildRequests(guildId);
  return { logs, requests };
}

export async function updateGuildSettingsAction(guildId: string, requireApproval: boolean) {
  const session = await auth();
  if (!session?.user?.id) return;

  const data = await getGuildById(guildId);
  const member = data?.members.find(m => m.user_id === session.user?.id);
  if (!member || (member.role !== 'Master' && member.role !== 'SubMaster')) return;

  await updateGuildSettings(guildId, requireApproval);
  revalidatePath("/");
}

export async function changeRoleAction(guildId: string, targetUserId: string, newRole: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const data = await getGuildById(guildId);
  const me = data?.members.find(m => m.user_id === session.user?.id);
  const target = data?.members.find(m => m.user_id === targetUserId);

  if (!me || !target) return;
  if (me.role !== 'Master') return; // Only Master can change roles

  await changeGuildMemberRole(guildId, targetUserId, newRole);
  await addGuildLog(guildId, 'system', `${target.username} was made ${newRole}.`);
  revalidatePath("/");
}

export async function kickMemberAction(guildId: string, targetUserId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const data = await getGuildById(guildId);
  const me = data?.members.find(m => m.user_id === session.user?.id);
  const target = data?.members.find(m => m.user_id === targetUserId);

  if (!me || !target) return;
  if (me.role !== 'Master' && me.role !== 'SubMaster') return;
  if (target.role === 'Master') return; // Cannot kick Master

  await removeGuildMember(guildId, targetUserId);
  await addGuildLog(guildId, 'system', `${target.username} was kicked from the guild.`);
  revalidatePath("/");
}

export async function leaveGuildAction(guildId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const data = await getGuildById(guildId);
  const me = data?.members.find(m => m.user_id === session.user?.id);
  if (!me) return;

  await removeGuildMember(guildId, session.user.id);
  await addGuildLog(guildId, 'system', `${session.user.name || 'A user'} left the guild.`);
  revalidatePath("/");
}

export async function resolveRequestAction(requestId: string, accept: boolean) {
  const session = await auth();
  if (!session?.user?.id) return;
  
  const result = await resolveGuildRequest(requestId, accept);
  if (result && accept) {
    const data = await getGuildById(result.guildId);
    if (data && data.members.length < data.guild.member_cap) {
      await joinGuild(result.guildId, result.userId);
      await addGuildLog(result.guildId, 'system', `A new member joined via request approval.`);
    }
  }
  revalidatePath("/");
}

export async function sendGuildInviteAction(guildId: string, targetUsername: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not logged in");

  const targetUser = await getUserByUsername(targetUsername);
  if (!targetUser) throw new Error("User not found");

  await createGuildInvite(guildId, session.user.id, targetUser.id);
}

export async function getMyInvitesAction() {
  const session = await auth();
  if (!session?.user?.id) return [];
  return await getGuildInvites(session.user.id);
}

export async function respondToInviteAction(inviteId: string, accept: boolean) {
  const session = await auth();
  if (!session?.user?.id) return;

  const result = await resolveGuildInvite(inviteId, accept);
  if (result && accept) {
    const data = await getGuildById(result.guildId);
    if (data && data.members.length < data.guild.member_cap) {
      await joinGuild(result.guildId, result.userId);
      await addGuildLog(result.guildId, 'system', `A new member joined via invite.`);
    }
  }
  revalidatePath("/");
}

export async function searchUsersAction(query: string) {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (!query || query.trim().length < 2) return [];
  
  return await searchUsernamesOnly(query.trim());
}
