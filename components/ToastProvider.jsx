"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({ children }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef();

  const showToast = useCallback((nextMessage) => {
    if (!nextMessage) return;

    window.clearTimeout(timerRef.current);
    setMessage(nextMessage);
    setVisible(true);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, 2200);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={`toast${visible ? " show" : ""}`} role="status" aria-live="polite">
        {message}
      </div>
    </ToastContext.Provider>
  );
}
