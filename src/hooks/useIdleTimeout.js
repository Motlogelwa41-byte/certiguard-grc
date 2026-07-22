import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";

const DEFAULT_IDLE_MS = 30 * 60 * 1000; // 30 minutes

// Logs the user out after a period of inactivity to enforce session timeout policy.
export default function useIdleTimeout(timeoutMs = DEFAULT_IDLE_MS) {
  const { isAuthenticated, logout } = useAuth();
  const timer = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        logout(true);
      }, timeoutMs);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isAuthenticated, timeoutMs, logout]);
}