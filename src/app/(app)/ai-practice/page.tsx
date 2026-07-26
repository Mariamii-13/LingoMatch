import { BookOpen, Bot, Gauge, MessageCircle, PenLine, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"

const practiceOptions = [
  {
    title: "Conversation Practice",
    description: "Build confidence through guided, goal-focused conversations with AI.",
    status: "Preview",
    icon: MessageCircle,
    primary: true,
  },
  {
    title: "Grammar Practice",
    description: "Work through grammar topics with explanations tailored to your level.",
    status: "Planned",
    icon: BookOpen,
  },
  {
    title: "Writing Practice",
    description: "Develop clearer writing with structured exercises and feedback.",
    status: "Planned",
    icon: PenLine,
  },
  {
    title: "AI Level Assessment",
    description: "Understand your current level and identify the skills to practise next.",
    status: "Planned",
    icon: Gauge,
  },
]

export default function AIPracticePage() {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Bot className="size-6" />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">AI Practice</h1>
        <p className="mt-2 text-muted-foreground">
          A focused space for practising at your own pace. AI-led sessions are being prepared;
          the options below show the practice experiences planned for this area.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {practiceOptions.map((option) => {
          const Icon = option.icon
          return (
            <article
              key={option.title}
              className={
                option.primary
                  ? "relative overflow-hidden rounded-2xl border border-primary/40 bg-primary/5 p-6 shadow-sm"
                  : "rounded-2xl border bg-card p-6 shadow-sm"
              }
            >
              {option.primary && (
                <Sparkles className="absolute -right-4 -top-4 size-24 text-primary/5" />
              )}
              <div className="relative flex items-start justify-between gap-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                  <Icon className="size-5" />
                </span>
                <Badge variant={option.primary ? "default" : "secondary"}>{option.status}</Badge>
              </div>
              <h2 className="relative mt-5 font-semibold">{option.title}</h2>
              <p className="relative mt-1 text-sm leading-6 text-muted-foreground">
                {option.description}
              </p>
            </article>
          )
        })}
      </div>

      <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        AI practice is not active yet. No live AI conversation or assessment is running on this page.
      </p>
    </div>
  )
}
