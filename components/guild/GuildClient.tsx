"use client";

import { useState, useEffect } from "react";
import { Shield, Users, Crown, Zap, Activity, Settings, MessageSquare, Plus, UserPlus, Check, X } from "lucide-react";
import { useGameStore } from "@/lib/store";
import { GlowPanel } from "@/components/ui/GlowPanel";
import { PixelButton } from "@/components/ui/PixelButton";
import { cn, formatNumber } from "@/lib/utils";
import { 
  getGuildsAction, 
  createGuildAction, 
  joinGuildAction, 
  getMyGuildAction,
  getGuildAdminDataAction,
  updateGuildSettingsAction,
  changeRoleAction,
  kickMemberAction,
  leaveGuildAction,
  resolveRequestAction,
  sendGuildInviteAction,
  searchUsersAction
} from "@/app/actions/guild";
import { getDailyGuildBuff, getGuildBuffValue } from "@/lib/guildBuffs";

type Tab = "overview" | "members" | "logs" | "admin";

export function GuildClient() {
  const guild = useGameStore((s) => s.guild);
  const profile = useGameStore((s) => s.profile);
  const joinGuildLocally = useGameStore((s) => s.joinGuildLocally);
  const spendGold = useGameStore((s) => s.spendGold);
  const gold = useGameStore((s) => s.currencies.gold);
  
  const [loading, setLoading] = useState(true);
  const [guildList, setGuildList] = useState<any[]>([]);
  const [activeGuildData, setActiveGuildData] = useState<any>(null);
  const [adminData, setAdminData] = useState<{ logs: any[], requests: any[] }>({ logs: [], requests: [] });
  
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteSuggestions, setInviteSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isRequireApproval, setIsRequireApproval] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (inviteUsername.trim().length >= 2) {
        try {
          const res = await searchUsersAction(inviteUsername);
          setInviteSuggestions(res);
        } catch (err) {
          // silently ignore
        }
      } else {
        setInviteSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inviteUsername]);

  useEffect(() => {
    async function load() {
      try {
        if (guild) {
          const myData = await getMyGuildAction();
          setActiveGuildData(myData);
          if (myData) {
            setIsRequireApproval(myData.guild.require_approval || false);
            const myRole = myData.members.find((m: any) => m.user_id === profile?.id)?.role;
            if (myRole === "Master" || myRole === "SubMaster") {
              const ad = await getGuildAdminDataAction(myData.guild.id);
              if (ad) setAdminData(ad);
            }
          }
        } else {
          const list = await getGuildsAction();
          setGuildList(list);
        }
      } catch (err) {
        console.error("Failed to load guild data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [guild, profile?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    
    if (gold < 500) {
      setCreateError("Not enough Gold Coin (500 required)");
      return;
    }
    if (!createName.trim()) {
      setCreateError("Name is required");
      return;
    }

    try {
      setIsCreating(true);
      spendGold(500); 
      const newGuildId = await createGuildAction(createName, createDesc, "shield");
      
      const newGuildLocal = {
        id: newGuildId,
        name: createName,
        level: 1,
        exp: 0,
        expToNextLevel: 1000,
        memberCap: 10,
        description: createDesc,
        avatarKey: "shield",
        role: "Master"
      };
      
      joinGuildLocally(newGuildLocal);
      
      const myData = await getMyGuildAction();
      setActiveGuildData(myData);
      setShowCreate(false);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create guild");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async (g: any) => {
    try {
      setLoading(true);
      await joinGuildAction(g.id);
      
      if (g.require_approval) {
        alert("Join request sent!");
        setLoading(false);
        return;
      }

      const myData = await getMyGuildAction();
      if (myData) {
        joinGuildLocally({
          ...myData.guild,
          role: "Member"
        });
        setActiveGuildData(myData);
      }
    } catch (err: any) {
      alert(err.message || "Failed to join guild");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async () => {
    if (!guild) return;
    const newVal = !isRequireApproval;
    setIsRequireApproval(newVal);
    await updateGuildSettingsAction(guild.id, newVal);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMsg("");
    setShowSuggestions(false);
    if (!guild || !inviteUsername.trim()) return;
    try {
      await sendGuildInviteAction(guild.id, inviteUsername);
      setInviteMsg("Invite sent!");
      setInviteUsername("");
      setInviteSuggestions([]);
    } catch (err: any) {
      setInviteMsg(err.message || "Failed to send invite");
    }
  };

  const handleResolveRequest = async (reqId: string, accept: boolean) => {
    await resolveRequestAction(reqId, accept);
    setAdminData(prev => ({
      ...prev,
      requests: prev.requests.filter(r => r.id !== reqId)
    }));
    if (accept && activeGuildData) {
      const myData = await getMyGuildAction();
      setActiveGuildData(myData);
    }
  };

  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    if (!guild) return;
    await changeRoleAction(guild.id, targetUserId, newRole);
    const myData = await getMyGuildAction();
    setActiveGuildData(myData);
  };

  const handleKick = async (targetUserId: string) => {
    if (!guild) return;
    if (!confirm("Are you sure you want to kick this member?")) return;
    await kickMemberAction(guild.id, targetUserId);
    const myData = await getMyGuildAction();
    setActiveGuildData(myData);
  };

  const handleLeave = async () => {
    if (!guild) return;
    if (!confirm("Are you sure you want to leave your guild?")) return;
    await leaveGuildAction(guild.id);
    useGameStore.setState({ guild: undefined });
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="text-zinc-500 font-arcade text-sm animate-pulse">Loading Guilds...</div>
      </div>
    );
  }

  if (activeGuildData && guild) {
    const { guild: gData, members } = activeGuildData;
    const myRole = members.find((m: any) => m.user_id === profile?.id)?.role;
    const isMaster = myRole === "Master";
    const isSubMaster = myRole === "SubMaster";
    const isAdmin = isMaster || isSubMaster;

    const buffType = getDailyGuildBuff();
    const buffVal = getGuildBuffValue(gData.level, buffType);

    return (
      <div className="space-y-6 max-w-5xl mx-auto w-full px-2 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-arcade text-3xl glow-text-gold">{gData.name}</h1>
            <p className="mt-2 text-sm text-zinc-600 max-w-2xl leading-relaxed">{gData.description}</p>
          </div>
          <div className="text-left sm:text-right mt-2 sm:mt-0">
            <p className="font-arcade text-lg text-gold-bright">Lv. {gData.level}</p>
            <p className="text-sm text-zinc-500 mt-1">
              {formatNumber(gData.exp)} / {formatNumber(gData.exp_to_next_level)} EXP
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-arcade-border pb-2 overflow-x-auto mt-4">
          {(["overview", "members", "logs"] as Tab[]).concat(isAdmin ? ["admin"] as Tab[] : []).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={cn(
                "px-5 py-2.5 font-arcade text-sm capitalize transition-colors rounded-t whitespace-nowrap",
                activeTab === t 
                  ? "bg-white text-gold-ink border-b-2 border-gold-bright shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-800 hover:bg-arcade-bg"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <GlowPanel className="p-6 flex flex-col items-center justify-center text-center gap-3">
              <Shield className="h-12 w-12 text-gold mb-2" />
              <h3 className="font-arcade text-base text-foreground">Guild Stats</h3>
              <p className="text-sm text-zinc-600">Members: {members.length} / {gData.member_cap}</p>
              <p className="text-sm text-zinc-600">Total Contrib: {formatNumber(members.reduce((sum: number, m: any) => sum + (m.total_contribution || 0), 0))}</p>
            </GlowPanel>

            <GlowPanel className="p-6 flex flex-col items-center justify-center text-center gap-3">
              <Zap className="h-12 w-12 text-neon mb-2" />
              <h3 className="font-arcade text-base text-foreground">Daily Buff</h3>
              <p className="text-sm text-zinc-600 uppercase tracking-widest text-neon">
                {buffType === "atk" ? "+ATK" : buffType === "def" ? "+DEF" : buffType === "hp" ? "+HP" : "+ALL STATS"}
              </p>
              <p className="text-xs font-semibold text-zinc-500">+{buffType === "atk" ? buffVal.atkPercent : buffType === "def" ? buffVal.defPercent : buffType === "hp" ? buffVal.hpPercent : buffVal.atkPercent}% Bonus</p>
            </GlowPanel>

            <div className="col-span-full mt-4 flex justify-end">
               <PixelButton variant="danger" size="sm" onClick={handleLeave}>Leave Guild</PixelButton>
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <GlowPanel className="p-4 sm:p-6">
            <h3 className="font-arcade text-base text-gold mb-5 flex items-center gap-2"><Users className="h-4 w-4"/> Member Contribution</h3>
            <div className="space-y-4">
              {members.map((m: any) => (
                <div key={m.user_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded bg-white shadow-sm border border-arcade-border gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-arcade-bg border border-arcade-border flex items-center justify-center">
                      <Crown className={cn("h-5 w-5", m.role === "Master" ? "text-gold" : m.role === "SubMaster" ? "text-neon" : "text-zinc-500")} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        {m.username} 
                        <span className="text-xs font-arcade text-zinc-500">{m.role}</span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">Lv.{m.level}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs text-zinc-500 uppercase">Contrib</p>
                      <p className="text-sm font-arcade text-gold-bright mt-1">{formatNumber(m.total_contribution)}</p>
                    </div>
                    
                    {/* Admin Actions */}
                    {isAdmin && m.user_id !== profile?.id && m.role !== "Master" && (
                      <div className="flex items-center gap-2 pl-4 border-l border-arcade-border">
                        {isMaster && m.role === "Member" && (
                          <button onClick={() => handleChangeRole(m.user_id, "SubMaster")} className="text-[10px] bg-neon/20 text-neon px-2 py-1 rounded hover:bg-neon/40">Promote</button>
                        )}
                        {isMaster && m.role === "SubMaster" && (
                          <button onClick={() => handleChangeRole(m.user_id, "Member")} className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-1 rounded hover:bg-orange-500/40">Demote</button>
                        )}
                        <button onClick={() => handleKick(m.user_id)} className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/40">Kick</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlowPanel>
        )}

        {activeTab === "logs" && (
          <GlowPanel className="p-4">
            <h3 className="font-arcade text-sm text-gold mb-4 flex items-center gap-2"><Activity className="h-4 w-4"/> Guild Activity</h3>
            {adminData.logs.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center py-4">No recent activity.</p>
            ) : (
              <div className="space-y-3">
                {adminData.logs.map((log: any) => (
                  <div key={log.id} className="text-xs p-2 border-b border-arcade-border flex gap-3">
                    <span className="text-zinc-500 w-24 shrink-0">{new Date(log.created_at).toLocaleDateString()}</span>
                    <span className="text-zinc-600">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </GlowPanel>
        )}

        {activeTab === "admin" && isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlowPanel className="p-4">
              <h3 className="font-arcade text-sm text-gold mb-4 flex items-center gap-2"><Settings className="h-4 w-4"/> Settings</h3>
              
              <div className="flex items-center justify-between p-3 bg-white shadow-sm rounded border border-arcade-border">
                <div>
                  <p className="text-xs font-semibold text-foreground">Require Approval to Join</p>
                  <p className="text-[10px] text-zinc-500">If on, players must send a join request.</p>
                </div>
                <button 
                  onClick={handleToggleApproval}
                  className={cn("w-10 h-6 rounded-full relative transition-colors", isRequireApproval ? "bg-neon" : "bg-slate-300")}
                >
                  <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-transform", isRequireApproval ? "translate-x-5" : "translate-x-1")} />
                </button>
              </div>

              <h3 className="font-arcade text-sm text-gold mt-6 mb-4 flex items-center gap-2"><UserPlus className="h-4 w-4"/> Invite Player</h3>
              <form onSubmit={handleSendInvite} className="flex gap-2 relative">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={inviteUsername} 
                    onChange={e => {
                      setInviteUsername(e.target.value);
                      setShowSuggestions(true);
                    }} 
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder="Username" 
                    className="w-full bg-white shadow-sm border border-arcade-border rounded p-2 text-xs focus:outline-none focus:border-gold"
                  />
                  {showSuggestions && inviteSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-arcade-border rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                      {inviteSuggestions.map((s, idx) => (
                        <div 
                          key={idx} 
                          className="px-3 py-2 text-xs hover:bg-arcade-panel-light cursor-pointer text-zinc-700 font-semibold"
                          onClick={() => {
                            setInviteUsername(s);
                            setShowSuggestions(false);
                          }}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <PixelButton variant="gold" size="sm" type="submit">Invite</PixelButton>
              </form>
              {inviteMsg && <p className="text-[10px] text-neon mt-2">{inviteMsg}</p>}
            </GlowPanel>

            <GlowPanel className="p-4">
              <h3 className="font-arcade text-sm text-gold mb-4 flex items-center gap-2"><MessageSquare className="h-4 w-4"/> Join Requests</h3>
              {adminData.requests.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No pending requests.</p>
              ) : (
                <div className="space-y-2">
                  {adminData.requests.map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between p-2 bg-white shadow-sm border border-arcade-border rounded">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{req.username}</p>
                        <p className="text-[10px] text-zinc-500">Lv. {req.level}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleResolveRequest(req.id, true)} className="bg-green-500/20 text-green-400 p-1.5 rounded hover:bg-green-500/40"><Check className="h-3 w-3"/></button>
                        <button onClick={() => handleResolveRequest(req.id, false)} className="bg-red-500/20 text-red-400 p-1.5 rounded hover:bg-red-500/40"><X className="h-3 w-3"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlowPanel>
          </div>
        )}
      </div>
    );
  }

  // Not in a guild: show list and create form
  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full px-2 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-arcade text-2xl glow-text-gold">Guilds</h1>
          <p className="mt-2 text-sm text-zinc-500">Join a guild for exclusive buffs and perks.</p>
        </div>
        <PixelButton variant="gold" className="py-2 px-6 text-sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Back to List" : "Create Guild"}
        </PixelButton>
      </div>

      {showCreate ? (
        <GlowPanel className="p-6 max-w-md mx-auto mt-8">
          <h2 className="font-arcade text-sm text-gold-bright text-center mb-6">Found a New Guild</h2>
          
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-arcade text-zinc-500 mb-1">Guild Name</label>
              <input 
                type="text" 
                maxLength={20}
                required
                className="w-full bg-white shadow-sm border border-arcade-border rounded p-2 text-sm text-foreground focus:outline-none focus:border-gold"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-arcade text-zinc-500 mb-1">Description</label>
              <textarea 
                maxLength={100}
                className="w-full bg-white shadow-sm border border-arcade-border rounded p-2 text-sm text-foreground focus:outline-none focus:border-gold h-20 resize-none"
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
              />
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-arcade-border">
              <div className="flex items-center gap-1.5 text-gold text-sm font-semibold">
                Cost: 500 Gold
              </div>
              <PixelButton type="submit" variant="gold" className="py-2" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create"}
              </PixelButton>
            </div>
            
            {createError && (
              <p className="text-red-400 text-xs text-center">{createError}</p>
            )}
          </form>
        </GlowPanel>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {guildList.length === 0 ? (
            <div className="col-span-full p-8 text-center text-zinc-500 text-sm italic">
              No guilds found. Be the first to create one!
            </div>
          ) : (
            guildList.map((g) => (
              <GlowPanel key={g.id} accent="none" className="flex items-center gap-5 p-5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-arcade-border bg-white/80 shadow-sm pixel-frame">
                  <Shield className="h-8 w-8 text-zinc-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-base font-semibold text-foreground">{g.name}</p>
                    <span className="font-arcade text-xs text-gold-bright shrink-0">Lv.{g.level}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{g.description}</p>
                  <p className="mt-2 text-xs font-semibold text-zinc-500 flex items-center gap-1.5">
                    <Users className="h-4 w-4" /> {g.member_cap} max members
                  </p>
                </div>
                <PixelButton variant="neon" className="px-4 py-2 text-xs shrink-0 ml-2" onClick={() => handleJoin(g)}>
                  {g.require_approval ? "Request Join" : "Join"}
                </PixelButton>
              </GlowPanel>
            ))
          )}
        </div>
      )}
    </div>
  );
}
