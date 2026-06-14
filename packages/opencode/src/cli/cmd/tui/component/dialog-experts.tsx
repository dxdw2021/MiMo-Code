import { createMemo, createResource, Show } from "solid-js"
import { useDialog } from "../ui/dialog"
import { useLanguage } from "../context/language"
import { DialogSelect } from "../ui/dialog-select"
import { DialogPrompt } from "../ui/dialog-prompt"
import { usePromptRef } from "../context/prompt"
import { Global } from "@/global"
import path from "path"

interface ExpertManifest {
  categories: {
    id: string
    name: { en: string; zh: string }
    description: { en: string; zh: string }
  }[]
  experts: {
    id: string
    categoryId: string
    displayName: { en: string; zh: string }
    profession: { en: string; zh: string }
    description: { en: string; zh: string }
    promptFile: string
    avatar: string
    expertType: string
    tags?: { en: string; zh: string }[]
    quickPrompts?: { en: string; zh: string }[]
    defaultInitPrompt?: { en: string; zh: string }
  }[]
}

// 从项目根目录加载 manifest.json（相对 TUI 源码路径）
const MANIFEST_PATH = path.resolve(import.meta.dir, "../../../../../../experts/manifest.json")

async function loadExperts(): Promise<ExpertManifest | null> {
  try {
    const file = Bun.file(MANIFEST_PATH)
    if (!(await file.exists())) return null
    return await file.json() as ExpertManifest
  } catch {
    return null
  }
}

// ── 第一步：选择分类 ──────────────────────────────

function DialogCategorySelect(props: { data: ExpertManifest; onSelect: (categoryId: string) => void }) {
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

function DialogExpertSelect(props: { data: ExpertManifest; categoryId: string }) {
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
        const input = `我需要你以${role}的身份协助我。${desc}\n\n我的需求：${text}`
        ref.set({ input, parts: [] })
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

// ── 入口：先加载数据，再分步导航 ─────────────────

export function DialogExperts() {
  const dialog = useDialog()
  const [data] = createResource(loadExperts)

  function onCategoryChosen(categoryId: string) {
    dialog.replace(() => {
      const d = data()
      if (!d) return <></>
      return <DialogExpertSelect data={d} categoryId={categoryId} />
    })
  }

  return (
    <Show when={data()}>
      {(d) => <DialogCategorySelect data={d()} onSelect={onCategoryChosen} />}
    </Show>
  )
}
