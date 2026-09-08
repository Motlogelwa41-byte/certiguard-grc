import React, { useEffect, useRef, useState } from "react";

let scriptPromise = null;

function loadCalendly() {
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      if (!document.querySelector('link[href*="calendly"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://assets.calendly.com/assets/external/widget.css";
        document.head.appendChild(link);
      }
      if (window.Calendly) { resolve(); return; }
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function openCalendlyPopup(url, prefill) {
  if (!url) return;
  loadCalendly().then(() => {
    window.Calendly.initPopupWidget({ url, ...(prefill && { prefill }) });
  });
}

export default function CalendlyEmbed({ url, height = 580 }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!url) return;
    loadCalendly().then(() => setReady(true));
  }, [url]);

  useEffect(() => {
    if (ready && ref.current && window.Calendly) {
      window.Calendly.initInlineWidget({ url, parentElement: ref.current });
    }
  }, [ready, url]);

  if (!url) return null;
  return <div ref={ref} style={{ minWidth: "320px", height: `${height}px` }} />;
}