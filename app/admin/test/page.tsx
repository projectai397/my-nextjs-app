


"use client";
import  { useUsersList } from "@/hooks/useData";



export default function UsersDemo() {
  const { data, loading, error } = useUsersList(
    // baseUrl (optional)
    undefined,
    // filters (optional; safe defaults used if omitted)
    { role: "SUPER_ADMIN", page: 1, limit: 20, status: 1 }
  );
  return (
    <div className="p-4">
      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">Error: {error}</p>}
      {!loading && data && (
        <pre className="text-xs bg-black text-green-400 p-3 rounded overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}





