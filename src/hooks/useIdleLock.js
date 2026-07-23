import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";

const DEFAULT_IDLE_MS = 15 * 60 * 1000; // 15 minutes — locks the screen on inactivity

// Locks the screen after a period of inactivity. The user must re-authenticate
// to resume (the lock overlay calls logout). Activity on any tracked event
// resets the countdown.
export default function useIdleLock(timeoutMs = DEFAULT_IDLE_MS) {
  const { isAuthenticated } = useAuth();
  const [locked, setLocked] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setLocked(false);
      return;
    }

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setLocked(true), timeoutMs);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isAuthenticated, timeoutMs]);

  return locked;
}