// hooks/useApi.ts
"use client"
import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import axios from "axios"

// keep one constant for your backend API root
const API_BASE = process.env.NEXT_PUBLIC_ALL_API_URL

export function useApi<T = any>(path: string, options?: { skip?: boolean }) {
  const { data: session, status } = useSession()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const accessToken = useMemo(
    () => (session as any)?.accessToken ?? null,
    [session]
  )

  useEffect(() => {
    if (options?.skip) return
    const ac = new AbortController()

    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        if (status === "loading") return

        if (status !== "authenticated" || !accessToken) {
          setError("No access token (user not authenticated).")
          setData(null)
          return
        }

        // 👇 Prepend base URL to your path
        const res = await axios.get(`${API_BASE}${path}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          signal: ac.signal,
          timeout: 10000,
          transitional: { clarifyTimeoutError: true },
        })

        setData(res.data)
      } catch (err: any) {
        if (axios.isCancel(err)) return
        if (err?.name === "CanceledError") return

        const msg =
          err?.response?.data?.message ||
          err?.response?.statusText ||
          err?.message ||
          "Something went wrong"
        setError(msg)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    run()
    return () => ac.abort()
  }, [path, status, accessToken])

  return { data, loading, error }
}
