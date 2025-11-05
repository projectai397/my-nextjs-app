"use client";

import useSWR from "swr";
import { TokenGate } from "@/components/token-gate";
import { useChatSocket } from "@/lib/ws";
import { getChatroom } from "@/lib/api";
import { useEffect, useMemo } from "react";
import type { ConversationItem, ChatroomDetail } from "@/types/chatbot_type";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";
import { useSession } from "next-auth/react";

export default function AdminPage() {
  const { data: session, status } = useSession();

  // While NextAuth resolves the session
  if (status === "loading") {
    return (
      <main className="h-[100dvh] grid place-items-center">
        <div className="text-sm text-muted-foreground">Checking session…</div>
      </main>
    );
  }

  // Pull the token & role from the session (set in callbacks.session)
  const accessToken = (session as any)?.accessToken;

  // Optional: restrict to superadmin
  // if (role !== "superadmin") return <div>Not authorized</div>;

  // Show a placeholder if token hasn’t been attached yet
  if (!accessToken) {
    return (
      <main className="h-[100dvh] grid place-items-center">
        <div className="text-sm text-muted-foreground">
          Signed in — loading secure data…
        </div>
      </main>
    );
  }

  return <AdminView token={accessToken} />;
}

function AdminView({ token }: { token: string }) {
  const {
    status,
    chatId,
    needsSelection,
    chatrooms,
    selectRoom,
    messages,
    resetLiveMessages,
    sendText,

  } = useChatSocket({
    token,
    role: "superadmin" as any,
  });

  const { data, isLoading, mutate } = useSWR<ChatroomDetail>(
    chatId ? ["chatroom", chatId, token] : null,
    (key: [string, string, string]) => getChatroom(key[2], key[1]),
    { revalidateOnFocus: true }
  );

  useEffect(() => {
    resetLiveMessages();
  }, [chatId, resetLiveMessages]);

  const historyItems: ConversationItem[] = useMemo(() => {
    if (!data?.conversation) return [];

    return data.conversation.map((c: any) => {
      const from =
        c.from === "agent" || c.from === "superadmin" ? "admin" : c.from;
      if (c.type === "file") {
        return {
          kind: "file",
          from,
          file_url: c.file_url,
          file_name: c.file_name || "File",
          file_type: c.file_type || "",
          created_at: c.created_at,
        } as ConversationItem;
      }
      if (c.type === "audio") {
        return {
          kind: "audio",
          from,
          audio_url: c.audio_url,
          audio_name: "Audio",
          audio_type: "",
          created_at: c.created_at,
        } as ConversationItem;
      }
      return {
        kind: "text",
        from,
        text: c.text,
        created_at: c.created_at,
      } as ConversationItem;
    });
  }, [data]);

  // const normalizedLive = useMemo(() => {
  //   return messages.map((m) => ({
  //     ...m,
  //     from: m.from === "agent" || m.from === "superadmin" ? "admin" : m.from,
  //   }))
  // }, [messages])
  const normalizedLive = useMemo(() => {
    return messages.map((m) => ({
      ...m,
      from: m.from === "superadmin" ? "admin" : m.from,
    }));
  }, [messages]);

  const combined = useMemo(
    () => [...historyItems, ...normalizedLive],
    [historyItems, normalizedLive]
  );

  return (
    <main className="h-[100dvh]  pl-4 flex flex-col">
      <header className="border-b p-3">
        <div className="space-y-1">
          <div className="text-sm">
            Status: <span className="font-medium">{status}</span>{" "}
            {chatId ? `(room: ${chatId})` : ""}
          </div>
          {needsSelection && (
            <div className="text-xs text-muted-foreground">
              Select a room to begin
            </div>
          )}
          {data?.chatroom && (
            <div className="text-xs text-muted-foreground">
              {data.chatroom.is_superadmin_active
                ? "Agent active in this room."
                : "Agent inactive."}{" "}
              {data.chatroom.is_user_active ? "User online." : "User offline."}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-80 border-r p-3 overflow-y-auto">
          <div className="text-sm font-semibold mb-3 border-b pb-2">
            Chatrooms
          </div>

          <div className="flex flex-col gap-2">
            {chatrooms.map((r) => (
              <button
                key={r.chat_id}
                onClick={() => selectRoom(r.chat_id)}
                className={`w-full text-left rounded-lg px-4 py-3 border transition-colors shadow-sm
          ${
            chatId === r.chat_id
              ? "bg-accent text-white border-accent"
              : "bg-white hover:bg-muted/30"
          }
        `}
              >
                {/* Room ID */}
                {/* <div className="text-xs font-semibold mb-1 opacity-70">
                  Room ID: <span className="font-mono">{r.chat_id}</span>
                </div> */}

                {/* User Info */}
                <div className="space-y-1 text-xs leading-relaxed">
                  <div>
                    <span className="font-medium"> Name:</span>{" "}
                    {r.user?.name || "N/A"}
                  </div>
                  <div>
                    <span className="font-medium">Username:</span>{" "}
                    {r.user?.userName || "N/A"}
                  </div>
                  {/* <div>
                    <span className="font-medium">User ID:</span> {r.user_id}
                  </div> */}
                </div>

                {/* Role & Status */}
                <div className="mt-2 text-xs leading-relaxed border-t pt-2">
                  {/* <div>
                    <span className="font-medium">Role:{r.role}</span> 
                  </div> */}
                  <div>
                    <span className="font-medium">Superadmin:</span>{" "}
                    <span
                      className={`font-semibold ${
                        r.is_superadmin_active
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {r.is_superadmin_active ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">User:</span>{" "}
                    <span
                      className={`font-semibold ${
                        r.is_user_active ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {r.is_user_active ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className="font-medium">🕒 Updated:</span>{" "}
                    {new Date(r.updated_time).toLocaleString()}
                  </div>
                </div>
              </button>
            ))}

            {!chatrooms.length && (
              <div className="text-xs text-muted-foreground">
                No rooms available.
              </div>
            )}
          </div>
        </aside>

        <section className="flex-1 min-w-0 flex flex-col">
          {!chatId ? (
            <div className="p-6 text-sm text-muted-foreground">
              Select a room to view conversation.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <MessageList items={combined} viewerRole="superadmin" />
              </div>

              <div className=" mb-15">
                <Composer
                  token={token}
                  mode="admin"
                  chatId={chatId}
                  onSendText={async (t) => {
                    sendText(t);
                  }}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
