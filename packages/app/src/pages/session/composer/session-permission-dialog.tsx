// Ported from AtomCode WebUI PermissionCard (modal overlay UX)
// Original: D:\DEV\tool\atomcode\atomcode\webui\src\components\PermissionCard.tsx
//
// Key differences from SessionPermissionDock (bottom dock):
//   - Centered modal overlay with backdrop (vs bottom dock)
//   - Permission name as a tag chip
//   - Tool arguments displayed as JSON code block
//   - Loading state during async decision
//   - Diamond brand icon instead of warning icon

import { For, Show, createSignal } from "solid-js"
import type { PermissionRequest } from "@mimo-ai/sdk/v2"
import { Button } from "@mimo-ai/ui/button"
import { useLanguage } from "@/context/language"

interface PermissionDialogProps {
  request: PermissionRequest
  responding: boolean
  onDecide: (response: "once" | "always" | "reject") => void
  onClose: () => void
}

function DiamondIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect
        x="6.4"
        y="6.4"
        width="11.2"
        height="11.2"
        rx="2.6"
        transform="rotate(45 12 12)"
        stroke="currentColor"
        stroke-width="1.8"
      />
    </svg>
  )
}

function formatMetadata(metadata: Record<string, unknown>): string {
  try {
    const obj = Object.fromEntries(
      Object.entries(metadata).filter(([_, v]) => v !== undefined && v !== null),
    )
    if (Object.keys(obj).length === 0) return ""
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(metadata)
  }
}

export function PermissionDialog(props: PermissionDialogProps) {
  const language = useLanguage()
  const [loading, setLoading] = createSignal(false)

  const toolDescription = () => {
    const key = `settings.permissions.tool.${props.request.permission}.description`
    const value = language.t(key as Parameters<typeof language.t>[0])
    if (value === key) return ""
    return value
  }

  const metaDisplay = () => formatMetadata(props.request.metadata as Record<string, unknown>)

  async function decide(response: "once" | "always" | "reject") {
    if (loading() || props.responding) return
    setLoading(true)
    props.onDecide(response)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={props.onClose}
      />

      {/* Modal card */}
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          class="pointer-events-auto w-full max-w-md rounded-xl bg-surface-raised-stronger-non-alpha border border-border-base shadow-lg"
          data-component="permission-dialog"
        >
          {/* ===== Header ===== */}
          <div class="flex items-center gap-2.5 px-5 pt-4 pb-1">
            <span class="inline-flex items-center justify-center shrink-0 text-text-interactive-base">
              <DiamondIcon />
            </span>
            <h3 class="font-semibold text-[17px] -tracking-[0.01em] text-text-strong">
              {language.t("notification.permission.title")}
            </h3>
            <span class="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-text-interactive-base bg-surface-interactive-base">
              {props.request.permission}
            </span>
          </div>

          {/* ===== Body ===== */}
          <div class="px-5 py-3 space-y-3">
            <Show when={toolDescription()}>
              <p class="text-sm text-text-weak m-0">{toolDescription()}</p>
            </Show>

            <Show when={props.request.patterns.length > 0}>
              <div class="space-y-1">
                <span class="text-xs font-medium text-text-weaker uppercase tracking-wide">
                  Patterns
                </span>
                <div class="flex flex-col gap-1">
                  <For each={props.request.patterns}>
                    {(pattern) => (
                      <code class="block text-xs font-mono text-text-base bg-surface-base rounded-md px-2.5 py-1.5 break-all">
                        {pattern}
                      </code>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <Show when={metaDisplay()}>
              <div class="space-y-1">
                <span class="text-xs font-medium text-text-weaker uppercase tracking-wide">
                  Arguments
                </span>
                <pre class="text-xs font-mono text-text-base bg-surface-base rounded-md px-2.5 py-2 overflow-x-auto whitespace-pre-wrap max-h-32 leading-lg">
{metaDisplay()}</pre>
              </div>
            </Show>
          </div>

          {/* ===== Footer ===== */}
          <div class="flex items-center justify-end gap-2 px-5 pb-4 pt-1">
            <Button
              variant="ghost"
              size="normal"
              onClick={() => decide("reject")}
              disabled={loading() || props.responding}
            >
              {language.t("ui.permission.deny")}
            </Button>
            <Button
              variant="secondary"
              size="normal"
              onClick={() => decide("always")}
              disabled={loading() || props.responding}
            >
              {language.t("ui.permission.allowAlways")}
            </Button>
            <Button
              variant="primary"
              size="normal"
              onClick={() => decide("once")}
              disabled={loading() || props.responding}
            >
              {language.t("ui.permission.allowOnce")}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
