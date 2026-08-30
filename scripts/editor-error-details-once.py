from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


# -----------------------------------------------------------------------------
# SERVER: return the complete API exception and print it to the server terminal.
# -----------------------------------------------------------------------------
server_path = Path("src/local-editor/server.ts")
server = server_path.read_text(encoding="utf8")

old_server_catch = '''  } catch (error) {
    sendJson(res, 400, {
      error: error instanceof Error ? error.message : String(error),
    });
    return true;
  }
}'''

new_server_catch = '''  } catch (error) {
    const details =
      error instanceof Error
        ? {
            error: error.message,
            name: error.name,
            stack: error.stack ?? "",
            cause: error.cause == null ? "" : String(error.cause),
          }
        : {
            error: String(error),
            name: typeof error,
            stack: "",
            cause: "",
          };

    console.error(`\\n[LOCAL EDITOR API ERROR] ${req.method ?? "UNKNOWN"} ${req.url ?? ""}`);
    console.error(error);

    sendJson(res, 400, details);
    return true;
  }
}'''

server = replace_once(
    server,
    old_server_catch,
    new_server_catch,
    "server API error response",
)
server_path.write_text(server, encoding="utf8")


# -----------------------------------------------------------------------------
# CLIENT: show a persistent copyable debug panel with request, HTTP response,
# server stack trace, raw response, and network/fetch errors.
# No HTML or CSS files are changed.
# -----------------------------------------------------------------------------
client_path = Path("src/local-editor/client.ts")
client = client_path.read_text(encoding="utf8")

old_client_block = '''function setMessage(message: string, isError = false): void {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed.");
  }

  return data as T;
}'''

new_client_block = '''let errorDetailsPanel: HTMLElement | null = null;
let errorDetailsOutput: HTMLPreElement | null = null;

function clearErrorDetails(): void {
  if (errorDetailsPanel) {
    errorDetailsPanel.hidden = true;
  }
}

function showErrorDetails(details: string): void {
  if (!errorDetailsPanel || !errorDetailsOutput) {
    const panel = document.createElement("section");
    panel.id = "editor-error-details";
    panel.setAttribute("role", "alert");
    panel.style.cssText = [
      "margin:0",
      "padding:12px 16px",
      "border-top:1px solid rgba(255,120,120,.45)",
      "border-bottom:1px solid rgba(255,120,120,.45)",
      "background:#160c12",
      "color:#ffd0d0",
      "font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace",
    ].join(";");

    const controls = document.createElement("div");
    controls.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px";

    const label = document.createElement("strong");
    label.textContent = "FULL ERROR OUTPUT";

    const buttons = document.createElement("div");
    buttons.style.cssText = "display:flex;gap:8px";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "Copy Error";
    copyButton.addEventListener("click", async () => {
      const text = errorDetailsOutput?.textContent ?? "";

      try {
        await navigator.clipboard.writeText(text);
        copyButton.textContent = "Copied";
        window.setTimeout(() => {
          copyButton.textContent = "Copy Error";
        }, 1200);
      } catch (error) {
        console.error("Could not copy error details.", error);
      }
    });

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";
    closeButton.addEventListener("click", clearErrorDetails);

    buttons.append(copyButton, closeButton);
    controls.append(label, buttons);

    const output = document.createElement("pre");
    output.style.cssText = [
      "margin:0",
      "padding:10px",
      "max-height:320px",
      "overflow:auto",
      "white-space:pre-wrap",
      "overflow-wrap:anywhere",
      "background:#080d14",
      "color:#ffbcbc",
      "font-size:12px",
      "line-height:1.45",
      "user-select:text",
    ].join(";");

    panel.append(controls, output);

    const topbar = statusMessage.closest(".topbar");
    if (topbar) {
      topbar.insertAdjacentElement("afterend", panel);
    } else {
      document.body.prepend(panel);
    }

    errorDetailsPanel = panel;
    errorDetailsOutput = output;
  }

  errorDetailsOutput.textContent = details;
  errorDetailsPanel.hidden = false;
}

function setMessage(message: string, isError = false): void {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);

  if (!isError) {
    clearErrorDetails();
  }
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const method = String(options?.method ?? "GET").toUpperCase();
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (error) {
    const errorText =
      error instanceof Error
        ? error.stack || `${error.name}: ${error.message}`
        : String(error);

    const details = [
      `REQUEST: ${method} ${url}`,
      "",
      "NETWORK / FETCH ERROR",
      errorText,
      "",
      "The request never reached the local editor API.",
    ].join("\\n");

    console.error(details);
    showErrorDetails(details);
    throw error;
  }

  const raw = await response.text();
  let data: any = {};

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { error: raw };
    }
  }

  if (!response.ok) {
    const serverMessage = String(data.error ?? response.statusText ?? "Request failed.");
    const errorName = String(data.name ?? "Error");
    const stack = String(data.stack ?? "");
    const cause = String(data.cause ?? "");

    const details = [
      `REQUEST: ${method} ${url}`,
      `HTTP: ${response.status} ${response.statusText}`,
      "",
      "SERVER ERROR",
      `${errorName}: ${serverMessage}`,
      cause ? `Cause: ${cause}` : "",
      stack ? `\\nSTACK TRACE\\n${stack}` : "",
      raw ? `\\nRAW RESPONSE\\n${raw}` : "",
    ]
      .filter(Boolean)
      .join("\\n");

    console.error(details);
    showErrorDetails(details);
    throw new Error(serverMessage);
  }

  return data as T;
}'''

client = replace_once(
    client,
    old_client_block,
    new_client_block,
    "client API error display",
)
client_path.write_text(client, encoding="utf8")
