import { createMemo, createResource, createSignal, Show } from "solid-js"
import { useDialog } from "../ui/dialog"
import { useLanguage } from "../context/language"
import { DialogSelect } from "../ui/dialog-select"
import { DialogPrompt } from "../ui/dialog-prompt"
import { usePromptRef } from "../context/prompt"
import process from "process"

const MANIFEST_PATH = process.cwd() + "/experts/manifest.json"

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

async function loadExperts(): Promise<ExpertManifest> {
  return await Bun.file(MANIFEST_PATH).json() as ExpertManifest
}

export function DialogExperts() {
  const dialog = useDialog()
  const { t, effective } = useLanguage()
  const promptRef = usePromptRef()
  const [data] = createResource(loadExperts)
  const [selectedCategory, setSelectedCategory] = createSignal<string | null>(null)

  const locale = createMemo(() => (effective() === "zh" || effective() === "zht" ? "zh" : "en"))

  const categories = createMemo(() => {
    const d = data()
    if (!d) return []
    const l = locale()
    return d.categories.map((cat) => ({
      title: cat.name[l as keyof typeof cat.name] as string,
      value: cat.id,
      description: cat.description[l as keyof typeof cat.description] as string,
    }))
  })

  const experts = createMemo(() => {
    const d = data()
    const cat = selectedCategory()
    if (!d || !cat) return []
    const l = locale()
    return d.experts
      .filter((ex) => ex.categoryId === cat)
      .map((ex) => ({
        title: `${(ex.displayName[l as keyof typeof ex.displayName] as string) || ex.id} — ${(ex.profession[l as keyof typeof ex.profession] as string) || ""}`,
        value: ex.id,
        description: (ex.description[l as keyof typeof ex.description] as string)?.slice(0, 80),
        expert: ex,
      }))
  })

  function onSelectCategory(option: { value: string }) {
    setSelectedCategory(option.value)
  }

  function onSelectExpert(option: { value: string }) {
    const d = data()
    if (!d) return
    const expert = d.experts.find((ex) => ex.id === option.value)
    if (!expert) return

    const l = locale()
    const defaultPrompt = expert.defaultInitPrompt?.[l as keyof typeof expert.defaultInitPrompt] as string | undefined
    const placeholder = (expert.quickPrompts?.[0]?.[l as keyof typeof expert.quickPrompts[0]] as string) || defaultPrompt || `请教你关于${(expert.profession[l as keyof typeof expert.profession] as string) || expert.id}的问题`

    void DialogPrompt.show(dialog, (expert.displayName[l as keyof typeof expert.displayName] as string) || expert.id, {
      placeholder,
      value: defaultPrompt || "",
    }).then((text) => {
      if (!text) return
      const ref = promptRef.current
      if (ref) {
        ref.set({ input: text, parts: ref.current.parts })
      }
      dialog.clear()
    })
  }

  return (
    <Show when={data()}>
      <Show when={!selectedCategory()}>
        <DialogSelect
          title={t("tui.dialog.experts.select_category")}
          options={categories()}
          onSelect={onSelectCategory}
          onMove={() => {}}
        />
      </Show>
      <Show when={selectedCategory()}>
        <DialogSelect
          title={t("tui.dialog.experts.select_expert")}
          options={experts()}
          onSelect={onSelectExpert}
          onMove={() => {}}
        />
      </Show>
    </Show>
  )
}
