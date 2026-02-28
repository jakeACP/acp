import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.addEventListener("error", (event) => {
  const filename = event.filename || "";
  if (filename.includes("@vite/client") || filename.includes("vite/client")) {
    event.preventDefault();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  if (reason) {
    const stack = (reason instanceof Error ? reason.stack : String(reason)) || "";
    if (stack.includes("@vite/client") || stack.includes("vite/client")) {
      event.preventDefault();
    }
  }
});

createRoot(document.getElementById("root")!).render(<App />);
