import { createMemo, createResource, Show } from "solid-js"
import { useDialog } from "../ui/dialog"
import { useLanguage } from "../context/language"
import { DialogSelect } from "../ui/dialog-select"
import { DialogPrompt } from "../ui/dialog-prompt"
import { usePromptRef } from "../context/prompt"
import path from "path"

// ── 数据结构 ──────────────────────────────────

interface ExpertItem {
  id: string
  categoryId: string
  displayName: { en: string; zh: string }
  profession: { en: string; zh: string }
  description: { en: string; zh: string }
  quickPrompts?: { en: string; zh: string }[]
  defaultInitPrompt?: { en: string; zh: string }
}

interface ManifestData {
  categories: { id: string; name: { en: string; zh: string }; description: { en: string; zh: string } }[]
  experts: ExpertItem[]
}

// 从源码路径推断项目根目录（TUI 以 --cwd packages/opencode 运行，process.cwd() 不可靠）
const SRC_DIR = typeof import.meta !== "undefined" && import.meta.dir ? import.meta.dir : ""
// dialog-experts.tsx → component → tui → cmd → cli → src → opencode → packages → root
const ROOT_DIR = SRC_DIR ? path.resolve(SRC_DIR, "../../../../../../") : ""
const MANIFEST_PATH = ROOT_DIR ? path.join(ROOT_DIR, "experts", "manifest.json") : ""

async function loadExperts(): Promise<ManifestData | null> {
  try {
    if (!MANIFEST_PATH) return null
    const file = Bun.file(MANIFEST_PATH)
    if (file.size === 0) return null
    return await file.json() as ManifestData
  } catch {
    return null
  }
}

// ── 第一步：选择分类 ──────────────────────────────

function DialogCategorySelect(props: { data: ManifestData; onSelect: (categoryId: string) => void }) {
  const { t, effective } = useLanguage()
  const locale = createMemo(() => (effective() === "zh" || effective() === "zht" ? "zh" : "en"))
  const options = createMemo(() => {
    const l = locale()
    return props.data.categories.map((cat) => ({
      title: cat.name[l as keyof typeof cat.name] as string,
      value: cat.id,
      description: cat.description[l as keyof typeof cat.description] as string,
    }))
  })
  return (
    <DialogSelect
      title={t("tui.dialog.experts.select_category")}
      options={options()}
      onSelect={(opt) => props.onSelect(opt.value)}
    />
  )
}

// ── 第二步：选择专家 ──────────────────────────────

function DialogExpertSelect(props: { data: ManifestData; categoryId: string }) {
  const dialog = useDialog()
  const { t, effective } = useLanguage()
  const promptRef = usePromptRef()
  const locale = createMemo(() => (effective() === "zh" || effective() === "zht" ? "zh" : "en"))

  const options = createMemo(() => {
    const l = locale()
    return props.data.experts
      .filter((ex) => ex.categoryId === props.categoryId)
      .map((ex) => ({
        title: `${(ex.displayName[l as keyof typeof ex.displayName] as string) || ex.id} — ${(ex.profession[l as keyof typeof ex.profession] as string) || ""}`,
        value: ex.id,
        description: (ex.description[l as keyof typeof ex.description] as string)?.slice(0, 80),
      }))
  })

  function onSelect(opt: { value: string }) {
    const expert = props.data.experts.find((ex) => ex.id === opt.value)
    if (!expert) return
    const l = locale()
    const defaultPrompt = expert.defaultInitPrompt?.[l as keyof typeof expert.defaultInitPrompt] as string | undefined
    const placeholder = (expert.quickPrompts?.[0]?.[l as keyof typeof expert.quickPrompts[0]] as string) || defaultPrompt || ""

    void DialogPrompt.show(dialog, (expert.displayName[l as keyof typeof expert.displayName] as string) || expert.id, {
      placeholder,
      value: defaultPrompt || "",
    }).then((text) => {
      if (!text) return
      const ref = promptRef.current
      if (ref) {
        const role = (expert.profession[l as keyof typeof expert.profession] as string) || ""
        const desc = (expert.description[l as keyof typeof expert.description] as string) || ""
        ref.set({ input: `我需要你以${role}的身份协助我。${desc}\n\n我的需求：${text}`, parts: [] })
        setTimeout(() => ref.submit(), 100)
      }
      dialog.clear()
    })
  }

  return (
    <DialogSelect
      title={t("tui.dialog.experts.select_expert")}
      options={options()}
      onSelect={onSelect}
    />
  )
}

// ── 入口 ────────────────────────────────────

export function DialogExperts() {
  const dialog = useDialog()
  const { t } = useLanguage()
  const [data] = createResource(loadExperts)

  function onCategoryChosen(categoryId: string) {
    const d = data()
    if (!d) return
    dialog.replace(() => <DialogExpertSelect data={d} categoryId={categoryId} />)
  }

  return (
    <Show when={data() !== undefined} fallback={
      <DialogSelect
        title={t("tui.dialog.experts.select_category")}
        options={[{ title: "正在加载专家数据...", value: "", disabled: true }]}
      />
    }>
      <Show when={data() !== null} fallback={
        <DialogSelect
          title={t("tui.dialog.experts.select_category")}
          options={[{ title: "⚠️ 未找到专家数据", value: "", disabled: true }]}
        />
      }>
        <DialogCategorySelect data={data()!} onSelect={onCategoryChosen} />
      </Show>
    </Show>
  )
}
