import { useStore } from '../store'
import type { Domain, Objective, Milestone, Task, ScheduleBlock } from '../types'

// ─── Configuration ────────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-5-20250929'  // Sonnet 4.5 (id complet pour version pinning)
const API_URL = 'https://api.anthropic.com/v1/messages'
const LEGACY_STORAGE_KEY = 'aetheris-anthropic-key'

/**
 * Lit la clé Anthropic depuis le store principal (sync Supabase).
 * Fallback : si une ancienne clé existe encore dans le localStorage isolé,
 * on la migre dans le store et on supprime l'ancienne — opération une fois.
 */
export function getApiKey(): string | null {
  const fromStore = useStore.getState().anthropicApiKey
  if (fromStore) return fromStore

  // Migration douce depuis l'ancienne clé localStorage isolée
  if (typeof window !== 'undefined') {
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      useStore.getState().setAnthropicApiKey(legacy)
      try { window.localStorage.removeItem(LEGACY_STORAGE_KEY) } catch { /* ignore */ }
      return legacy
    }
  }

  return null
}

export function setApiKey(key: string): void {
  useStore.getState().setAnthropicApiKey(key)
  // Si une ancienne clé existait encore, on la nettoie
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(LEGACY_STORAGE_KEY) } catch { /* ignore */ }
  }
}

export function hasApiKey(): boolean {
  return !!getApiKey()
}

// ─── Low-level fetch helper ──────────────────────────────────────────────────

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AnthropicTool {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

interface AnthropicRequest {
  model:       string
  max_tokens:  number
  system?:     string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>
  messages:    AnthropicMessage[]
  tools?:      AnthropicTool[]
  tool_choice?: { type: 'tool'; name: string }
}

interface AnthropicToolUseBlock {
  type:  'tool_use'
  id:    string
  name:  string
  input: unknown
}

interface AnthropicTextBlock {
  type: 'text'
  text: string
}

interface AnthropicResponse {
  content: Array<AnthropicToolUseBlock | AnthropicTextBlock>
}

async function callAnthropic(body: AnthropicRequest): Promise<AnthropicResponse> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('Aucune clé Anthropic configurée — règle ça dans Paramètres.')

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':       'application/json',
      'x-api-key':          apiKey,
      'anthropic-version':  '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const errBody = await res.json() as { error?: { message?: string } }
      if (errBody?.error?.message) detail = errBody.error.message
    } catch { /* ignore */ }
    throw new Error(`Kit : ${detail}`)
  }

  return res.json() as Promise<AnthropicResponse>
}

function extractToolInput<T>(response: AnthropicResponse, toolName: string): T {
  const block = response.content.find(b => b.type === 'tool_use' && b.name === toolName)
  if (!block || block.type !== 'tool_use') throw new Error('Réponse Kit invalide — pas de tool_use.')
  return block.input as T
}

// ─── Context builder ─────────────────────────────────────────────────────────

interface Ctx {
  domains:        Domain[]
  objectives:     Objective[]
  milestones:     Milestone[]
  recentTasks:    Task[]
  scheduleBlocks?: ScheduleBlock[]
}

function buildContext(ctx: Ctx): string {
  const today = new Date().toISOString().split('T')[0]
  const activeDomains = ctx.domains.map(d => `- ${d.name}${d.description ? ` (${d.description})` : ''}`).join('\n')

  const activeObjectives = ctx.objectives
    .filter(o => !o.archived)
    .map(o => {
      const domain = ctx.domains.find(d => d.id === o.domainId)
      const ms = ctx.milestones.filter(m => m.objectiveId === o.id)
      const open = ms.filter(m => !m.done)
      const due = o.targetDate ? `, échéance ${o.targetDate}` : ''
      const overdue = o.targetDate && o.targetDate < today ? ' [EN RETARD]' : ''
      const msText = open.length > 0
        ? `\n    Jalons ouverts : ${open.slice(0, 5).map(m => m.title + (m.targetDate ? ` (${m.targetDate})` : '')).join(' / ')}`
        : ''
      return `- [${domain?.name ?? '?'}] "${o.title}" — progression ${o.progress}%${due}${overdue}${msText}`
    })
    .join('\n')

  const recentDone = ctx.recentTasks
    .filter(t => t.status === 'done')
    .slice(0, 10)
    .map(t => {
      const domain = ctx.domains.find(d => d.id === t.domainId)
      return `- [${domain?.name ?? '?'}] ${t.title}`
    })
    .join('\n')

  // Emploi du temps récurrent — groupé par jour
  const dayNames = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
  const blocksByDay: Record<number, string[]> = {}
  for (const b of ctx.scheduleBlocks ?? []) {
    for (const d of b.daysOfWeek) {
      if (!blocksByDay[d]) blocksByDay[d] = []
      blocksByDay[d].push(`${b.startTime}-${b.endTime} ${b.title}`)
    }
  }
  const scheduleText = Object.keys(blocksByDay).length > 0
    ? Object.entries(blocksByDay)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([d, items]) => `${dayNames[Number(d)]} : ${items.join(' / ')}`)
        .join('\n')
    : '(aucune plage récurrente — l\'utilisateur n\'a pas saisi son emploi du temps)'

  return `Date du jour : ${today}

DOMAINES ACTIFS de l'utilisateur :
${activeDomains || '(aucun)'}

OBJECTIFS EN COURS :
${activeObjectives || '(aucun)'}

EMPLOI DU TEMPS RÉCURRENT (plages déjà occupées chaque semaine — NE PAS planifier de tâches dessus) :
${scheduleText}

TÂCHES RÉCEMMENT TERMINÉES (pour comprendre le rythme) :
${recentDone || '(aucune)'}`
}

const SYSTEM_PROMPT = `Tu es Kit, l'intelligence d'Aetheris — un système personnel d'organisation de vie qui couvre tous les domaines (droit, sport, écriture, carrière, finances, etc.).

Ton style :
- Concis, jamais grandiloquent
- Tu parles français, registre courant
- Tu proposes peu mais juste — la qualité prime sur la quantité
- Tu respectes le rythme de l'utilisateur, jamais d'urgence inventée
- Tu donnes des actions concrètes et réalisables, pas des injonctions vagues

Tu raisonnes à partir des objectifs et domaines actifs de l'utilisateur. Tu ne suggères jamais des choses hors de leurs domaines.`

// ─── Feature 1 : suggestions de tâches pour aujourd'hui ──────────────────────

export interface TodaySuggestion {
  domainId:     string
  title:        string
  reason:       string
  timeEstimate: number
  objectiveId?: string
  milestoneId?: string
}

export async function suggestTodayTasks(ctx: Ctx, maxItems = 5): Promise<TodaySuggestion[]> {
  const userContext = buildContext(ctx)

  const tool: AnthropicTool = {
    name: 'propose_today_tasks',
    description: 'Propose les tâches que Kit recommande pour aujourd\'hui.',
    input_schema: {
      type: 'object',
      properties: {
        tasks: {
          type: 'array',
          maxItems,
          items: {
            type: 'object',
            properties: {
              domain_name:     { type: 'string', description: 'Nom exact du domaine concerné' },
              title:           { type: 'string', description: 'Titre clair et actionnable de la tâche' },
              reason:          { type: 'string', description: 'En une phrase, pourquoi cette tâche aujourd\'hui' },
              time_estimate:   { type: 'integer', description: 'Temps estimé en minutes', minimum: 10, maximum: 240 },
              objective_title: { type: 'string', description: 'Titre exact de l\'objectif lié, si applicable' },
              milestone_title: { type: 'string', description: 'Titre exact du jalon lié, si applicable' },
            },
            required: ['domain_name', 'title', 'reason', 'time_estimate'],
          },
        },
      },
      required: ['tasks'],
    },
  }

  const response = await callAnthropic({
    model: MODEL,
    max_tokens: 1500,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [tool],
    tool_choice: { type: 'tool', name: 'propose_today_tasks' },
    messages: [
      {
        role: 'user',
        content: `${userContext}

Propose 3 à ${maxItems} tâches concrètes pour aujourd'hui, ancrées dans les objectifs actifs et les domaines. Priorise ce qui débloque les objectifs en retard. Diversifie les domaines si possible. Chaque tâche doit pouvoir être faite en une session de focus (10–120 min).

CONTRAINTES :
- Tiens compte de l'emploi du temps récurrent : si l'utilisateur est en cours / au travail / engagé une bonne partie de la journée, propose moins de tâches et plus courtes.
- Ne propose pas de tâches qui empièteraient sur les plages bloquées.`,
      },
    ],
  })

  const result = extractToolInput<{
    tasks: Array<{
      domain_name: string
      title: string
      reason: string
      time_estimate: number
      objective_title?: string
      milestone_title?: string
    }>
  }>(response, 'propose_today_tasks')

  return result.tasks.map(t => {
    const domain = ctx.domains.find(d => d.name.toLowerCase() === t.domain_name.toLowerCase())
    const objective = t.objective_title
      ? ctx.objectives.find(o => o.title.toLowerCase() === t.objective_title!.toLowerCase())
      : undefined
    const milestone = t.milestone_title && objective
      ? ctx.milestones.find(m => m.objectiveId === objective.id && m.title.toLowerCase() === t.milestone_title!.toLowerCase())
      : undefined
    return {
      domainId:     domain?.id ?? ctx.domains[0]?.id ?? '',
      title:        t.title,
      reason:       t.reason,
      timeEstimate: t.time_estimate,
      objectiveId:  objective?.id,
      milestoneId:  milestone?.id,
    }
  }).filter(t => t.domainId)
}

// ─── Feature 2 : reprise d'un objectif en retard ─────────────────────────────

export interface MilestoneRecovery {
  nextAction:   string
  reason:       string
  timeEstimate: number
}

export async function suggestMilestoneRecovery(
  objective: Objective,
  milestones: Milestone[],
  domain: Domain | undefined,
): Promise<MilestoneRecovery> {
  const openMs = milestones.filter(m => !m.done).sort((a, b) => a.position - b.position)
  const openMsList = openMs.length > 0
    ? openMs.map(m => `- ${m.title}${m.targetDate ? ` (cible ${m.targetDate})` : ''}`).join('\n')
    : '(aucun jalon défini)'

  const tool: AnthropicTool = {
    name: 'suggest_recovery_action',
    description: 'Suggère une action concrète pour reprendre cet objectif en retard.',
    input_schema: {
      type: 'object',
      properties: {
        next_action:   { type: 'string', description: 'Tâche concrète et courte à faire pour redémarrer' },
        reason:        { type: 'string', description: 'En une phrase, pourquoi cette action plutôt qu\'une autre' },
        time_estimate: { type: 'integer', description: 'Temps en minutes', minimum: 10, maximum: 120 },
      },
      required: ['next_action', 'reason', 'time_estimate'],
    },
  }

  const response = await callAnthropic({
    model: MODEL,
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'suggest_recovery_action' },
    messages: [
      {
        role: 'user',
        content: `OBJECTIF EN RETARD :
- Domaine : ${domain?.name ?? '?'}
- Titre : "${objective.title}"
- Description : ${objective.description || '(vide)'}
- Échéance : ${objective.targetDate ?? 'non datée'}
- Progression : ${objective.progress}%

JALONS OUVERTS :
${openMsList}

Propose UNE seule action concrète, courte, pour relancer cet objectif aujourd'hui. Pas de pep-talk. Juste une tâche faisable.`,
      },
    ],
  })

  const result = extractToolInput<{ next_action: string; reason: string; time_estimate: number }>(
    response, 'suggest_recovery_action',
  )

  return {
    nextAction:   result.next_action,
    reason:       result.reason,
    timeEstimate: result.time_estimate,
  }
}

// ─── Feature 3 : plan de semaine ─────────────────────────────────────────────

export interface WeekPlanItem {
  domainId:     string
  title:        string
  reason:       string
  dayOffset:    number  // 0 = lundi, 6 = dimanche
  timeEstimate: number
  objectiveId?: string
  milestoneId?: string
}

export async function generateWeekPlan(ctx: Ctx, weekStart: string): Promise<WeekPlanItem[]> {
  const userContext = buildContext(ctx)

  const tool: AnthropicTool = {
    name: 'generate_week_plan',
    description: 'Construit un plan de semaine équilibré.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          maxItems: 12,
          items: {
            type: 'object',
            properties: {
              domain_name:     { type: 'string' },
              title:           { type: 'string' },
              reason:          { type: 'string' },
              day_offset:      { type: 'integer', minimum: 0, maximum: 6, description: '0=lundi, 6=dimanche' },
              time_estimate:   { type: 'integer', minimum: 10, maximum: 240 },
              objective_title: { type: 'string' },
              milestone_title: { type: 'string' },
            },
            required: ['domain_name', 'title', 'reason', 'day_offset', 'time_estimate'],
          },
        },
      },
      required: ['items'],
    },
  }

  const response = await callAnthropic({
    model: MODEL,
    max_tokens: 2500,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [tool],
    tool_choice: { type: 'tool', name: 'generate_week_plan' },
    messages: [
      {
        role: 'user',
        content: `${userContext}

SEMAINE CIBLE : du ${weekStart} (lundi) au dimanche suivant.

Génère un plan équilibré de 6 à 12 tâches réparties sur la semaine. Règles :
- Mix les domaines, ne surcharge pas un seul jour
- Une tâche par objectif actif au minimum si l'objectif a une échéance proche
- Évite le dimanche pour le travail intense
- Total < 2h par jour idéalement
- Les tâches doivent débloquer concrètement les objectifs (pas de "réfléchir à X")

CONTRAINTES D'EMPLOI DU TEMPS :
- Respecte les plages récurrentes : pour un jour majoritairement occupé par des cours / du travail, propose moins de tâches (1 max) et courtes (30 min).
- Pour les jours libres, tu peux en mettre 2 ou 3.
- Le créneau utile = la portion du jour qui n'est PAS dans une plage bloquée.`,
      },
    ],
  })

  const result = extractToolInput<{
    items: Array<{
      domain_name: string
      title: string
      reason: string
      day_offset: number
      time_estimate: number
      objective_title?: string
      milestone_title?: string
    }>
  }>(response, 'generate_week_plan')

  return result.items.map(item => {
    const domain = ctx.domains.find(d => d.name.toLowerCase() === item.domain_name.toLowerCase())
    const objective = item.objective_title
      ? ctx.objectives.find(o => o.title.toLowerCase() === item.objective_title!.toLowerCase())
      : undefined
    const milestone = item.milestone_title && objective
      ? ctx.milestones.find(m => m.objectiveId === objective.id && m.title.toLowerCase() === item.milestone_title!.toLowerCase())
      : undefined
    return {
      domainId:     domain?.id ?? ctx.domains[0]?.id ?? '',
      title:        item.title,
      reason:       item.reason,
      dayOffset:    Math.max(0, Math.min(6, item.day_offset)),
      timeEstimate: item.time_estimate,
      objectiveId:  objective?.id,
      milestoneId:  milestone?.id,
    }
  }).filter(item => item.domainId)
}

// ─── Feature 4 : génération de flashcards (Droit) ────────────────────────────

export interface GeneratedFlashcard {
  question: string
  answer:   string
}

export async function generateFlashcards(
  text:    string,
  matiere: string,
  maxCards = 10,
): Promise<GeneratedFlashcard[]> {
  const tool: AnthropicTool = {
    name: 'generate_flashcards',
    description: 'Génère des flashcards de révision depuis un texte de cours.',
    input_schema: {
      type: 'object',
      properties: {
        cards: {
          type: 'array',
          maxItems: maxCards,
          items: {
            type: 'object',
            properties: {
              question: { type: 'string', description: 'Question courte et précise, en français' },
              answer:   { type: 'string', description: 'Réponse claire, 1-3 phrases maximum' },
            },
            required: ['question', 'answer'],
          },
        },
      },
      required: ['cards'],
    },
  }

  const response = await callAnthropic({
    model: MODEL,
    max_tokens: 3000,
    system: `Tu es Kit. Tu génères des flashcards de révision en droit à partir de textes de cours.

Règles strictes :
- Questions courtes, précises, en français
- Réponses 1-3 phrases maximum, sans verbiage
- Couvre les notions clés du texte, pas les détails anecdotiques
- Pas de questions oui/non — préfère "Qu'est-ce que…", "Quelle est la différence entre…", "Définis…"
- Si le texte contient des arrêts ou articles, fais des cartes dessus`,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'generate_flashcards' },
    messages: [
      {
        role: 'user',
        content: `MATIÈRE : ${matiere}

TEXTE :
${text}

Génère 5 à ${maxCards} flashcards de révision sur ce texte.`,
      },
    ],
  })

  const result = extractToolInput<{ cards: GeneratedFlashcard[] }>(response, 'generate_flashcards')
  return result.cards
}
