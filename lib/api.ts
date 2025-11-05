const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000"

function authHeaders(token: string) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function getHistory(token: string, chatId: string) {
  const res = await fetch(`${API_BASE}/api/history`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId }),
  })
  if (!res.ok) throw new Error("Failed to fetch history")
  return res.json()
}

export async function getChatroom(token: string, chatId: string) {
  const res = await fetch(`${API_BASE}/api/chatroom/${chatId}`, {
    headers: { ...authHeaders(token) },
    cache: "no-store",
  });

  if (res.status === 204) {
    return { chatroom: null, conversation: [] };
  }
  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    // if server didn't send JSON (e.g., HTML error), keep payload as null
  }


  if (!res.ok) {
    const msg =
      (payload && (payload.error || payload.message)) ||
      `Failed to fetch chatroom (HTTP ${res.status})`;
    throw new Error(msg);
  }

  return payload ?? { chatroom: null, conversation: [] };
}


export async function uploadFile(token: string, file: File, chatId?: string) {
  const form = new FormData()
  form.append("file", file)
  if (chatId) form.append("chat_id", chatId)
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    headers: { ...authHeaders(token) },
    body: form,
  })
  if (!res.ok) throw new Error("Failed to upload file")
  return await res.json()
}

export async function uploadAudio(token: string, blob: Blob, chatId?: string) {
  const form = new FormData()
  form.append("audio", blob, "recording.webm")
  if (chatId) form.append("chat_id", chatId)
  const res = await fetch(`${API_BASE}/api/upload_audio`, {
    method: "POST",
    headers: { ...authHeaders(token) },
    body: form,
  })
  if (!res.ok) throw new Error("Failed to upload audio")
  return res.json()
}
