import { EventEmitter } from "events";
import { supabase, isSupabaseConfigured } from "./supabase";

export interface LiveComment {
  id: string;
  user_name: string;
  avatar_seed?: string | null;
  message: string;
  is_highlighted: boolean;
  is_hidden: boolean;
  is_broadcaster: boolean;
  created_at: string;
}

const initialSeedComments: LiveComment[] = [];

// Global in-memory cache and event emitter across hot-reloads in Next.js Node runtime
declare global {
  var __gaulfm_comments_bus: EventEmitter | undefined;
  var __gaulfm_comments_store: LiveComment[] | undefined;
}

const bus = global.__gaulfm_comments_bus ?? new EventEmitter();
bus.setMaxListeners(1000);
if (!global.__gaulfm_comments_bus) {
  global.__gaulfm_comments_bus = bus;
}

const memoryStore: LiveComment[] = [];
global.__gaulfm_comments_store = memoryStore;

export const MAX_HISTORY_COMMENTS = 50;

export async function getRecentComments(limit = MAX_HISTORY_COMMENTS): Promise<LiveComment[]> {
  const safeLimit = Math.min(Math.max(1, limit), MAX_HISTORY_COMMENTS);
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("live_comments")
        .select("*")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(safeLimit);

      if (!error && data) {
        return (data as LiveComment[]).reverse();
      }
    } catch {
      // Fallback to memoryStore on network error
    }
  }
  return memoryStore.filter((c) => !c.is_hidden).slice(-safeLimit);
}

export async function getAllCommentsForAdmin(limit = MAX_HISTORY_COMMENTS): Promise<LiveComment[]> {
  const safeLimit = Math.min(Math.max(1, limit), MAX_HISTORY_COMMENTS);
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("live_comments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(safeLimit);

      if (!error && data) {
        return (data as LiveComment[]).reverse();
      }
    } catch {
      // Fallback
    }
  }
  return memoryStore.slice(-safeLimit);
}

export async function addComment(payload: {
  user_name: string;
  message: string;
  avatar_seed?: string | null;
  is_broadcaster?: boolean;
}): Promise<LiveComment> {
  const newComment: LiveComment = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_name: payload.user_name.trim().slice(0, 50),
    avatar_seed: payload.avatar_seed ?? payload.user_name.slice(0, 4),
    message: payload.message.trim().slice(0, 300),
    is_highlighted: false,
    is_hidden: false,
    is_broadcaster: Boolean(payload.is_broadcaster),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("live_comments")
        .insert({
          user_name: newComment.user_name,
          avatar_seed: newComment.avatar_seed,
          message: newComment.message,
          is_broadcaster: newComment.is_broadcaster,
          is_highlighted: false,
          is_hidden: false,
        })
        .select()
        .single();

      if (!error && data) {
        newComment.id = data.id;
      }
    } catch {
      // Keep memory version
    }
  }

  memoryStore.push(newComment);
  if (memoryStore.length > MAX_HISTORY_COMMENTS) {
    memoryStore.shift();
  }

  bus.emit("comment", { type: "new", comment: newComment });
  return newComment;
}

export async function toggleHighlight(id: string): Promise<LiveComment | null> {
  let target = memoryStore.find((c) => c.id === id);
  if (target) {
    target.is_highlighted = !target.is_highlighted;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from("live_comments")
        .select("is_highlighted")
        .eq("id", id)
        .single();
      if (data) {
        const nextVal = !data.is_highlighted;
        const { data: updated } = await supabase
          .from("live_comments")
          .update({ is_highlighted: nextVal })
          .eq("id", id)
          .select()
          .single();
        if (updated) target = updated as LiveComment;
      }
    } catch {
      // Fallback to memory
    }
  }

  if (target) {
    bus.emit("comment", { type: "update", comment: target });
  }
  return target ?? null;
}

export async function toggleHidden(id: string): Promise<LiveComment | null> {
  let target = memoryStore.find((c) => c.id === id);
  if (target) {
    target.is_hidden = !target.is_hidden;
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from("live_comments")
        .select("is_hidden")
        .eq("id", id)
        .single();
      if (data) {
        const nextVal = !data.is_hidden;
        const { data: updated } = await supabase
          .from("live_comments")
          .update({ is_hidden: nextVal })
          .eq("id", id)
          .select()
          .single();
        if (updated) target = updated as LiveComment;
      }
    } catch {
      // Fallback
    }
  }

  if (target) {
    bus.emit("comment", {
      type: target.is_hidden ? "delete" : "update",
      comment: target,
    });
  }
  return target ?? null;
}

export function subscribeComments(
  listener: (event: { type: string; comment: LiveComment }) => void
): () => void {
  bus.on("comment", listener);
  return () => {
    bus.off("comment", listener);
  };
}
