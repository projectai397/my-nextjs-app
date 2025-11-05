
"use client";

import { motion } from "framer-motion";

type Props = {
  username?: string;
  role?: string;
  /** circle size in px (defaults to 36) */
  size?: number;
  /** bounce duration in seconds (defaults to 1.6) */
  bounceDuration?: number;
  /** shine duration in seconds (defaults to 2.2) */
  shineDuration?: number;
    collapsed?: boolean;
};

export default function UserBadge({
  username = "",
  role = "",
  size = 36,
  bounceDuration = 1.6,
  shineDuration = 5,
  collapsed
}: Props) {
  const initial = (username?.trim?.()[0] || "?").toUpperCase();

  return (
    <div className={`flex items-center gap-3 px-5 py-1 mt-2 `}>
      {/* Circle avatar with bounce + shine */}
      <motion.div
        aria-hidden
        className="relative rounded-full border-2 border-yellow-400 text-yellow-400 font-bold grid place-items-center overflow-hidden"
        style={{ width: size, height: size }}
        // soft bounce
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: bounceDuration, ease: "easeInOut", repeat: Infinity }}
      >
        <span
          className="leading-none"
          style={{
            fontSize: Math.max(12, Math.round(size * 0.45)),
          }}
        >
          {initial}
        </span>

        {/* sharp light sweep (diagonal stripe) */}
        <motion.div
          className="pointer-events-none absolute top-0 h-full"
          
          style={{
            width: size * 0.35,
            // a diagonal-looking streak
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0) 100%)",
            rotate: 18,
            borderRadius: 9999,
            left: "-40%",
          }}
          animate={{ x: ["0%", "360%"] }}
          transition={{ duration: shineDuration, ease: "easeInOut", repeat: Infinity }}
        />
      </motion.div>

      {/* Text block */}
      <div className={`flex flex-col leading-tight ${collapsed ? 'hidden' : ''}`}>
        <span className="text-white text-sm font-semibold truncate max-w-[140px]">
          {username}
        </span>
        <span className="text-gray-400 text-[11px] uppercase tracking-wide truncate max-w-[140px]">
          {role}
        </span>
      </div>
    </div>
  );
}
