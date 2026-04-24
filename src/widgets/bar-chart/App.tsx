// Widget entry point. Listens for host tool result via MCP Apps `app.ontoolresult`.
// See SPEC.md §3.2.
import { createRoot } from "react-dom/client";

function App() {
  return <div>widget placeholder</div>;
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
