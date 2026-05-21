# Cascade Aetheris — Spécification

> Document de référence pour la migration des modules de planification depuis
> Notion vers Aetheris. Self-contained : un Claude qui n'a pas lu cette
> conversation peut reprendre à partir d'ici.

**Statut** : spec finalisée le 2026-05-21. Code à démarrer **après le 12 juin 2026**
(post-exposé Contrats internationaux). Aucun commit planning avant cette date.

---

## 1. Motivation

Remplacer Notion par Aetheris pour la cascade d'objectifs et les rituels de
revue. Deux raisons :

1. **Privacy** — Notion lit en clair l'intégralité du contenu personnel
   (Vision, OKR, journal, revues). Aetheris est privé (Supabase + données
   isolées par `user_id`).
2. **Liberté de design** — Notion limite (pas de progress bars dynamiques,
   pas de dashboards, pas de widgets). Aetheris = contrôle total.

**TickTick et Apple Calendar restent en place.** Cette migration ne remplace
*que* Notion.

---

## 2. Frontière des outils

| Outil | Périmètre | Exemples |
|---|---|---|
| **Aetheris** | Cascade sémantique, MITs, planification J-1, revues, règles, identités | OKR, KR, Rocks, MITs hebdo, 1-3-5 quotidien, revues |
| **TickTick** | Tâches exécutables, sous-tâches, habitudes (≤2 actives), Pomodoro | « Rédiger partie II § 2 du rapport », habitude « écriture 21h-23h » |
| **Apple Calendar** | Engagements externes imposés par un tiers | Cours, journée cabinet, RDV, rituel hebdo dimanche 20h |
| **Word + dossier local** | Cours M2, alternance, nouvelles | `~/Documents/Cours/`, `~/Documents/Nouvelles/` |
| **Apple Notes** | Capture rapide, protocole de re-entrée épinglé, mots de passe legacy | Idées fugaces, inbox à vider en revue hebdo |
| **iCloud Keychain** | Mots de passe | — |

**Règle de frontière** : si l'élément est exécutable comme une to-do
(« faire X »), il va dans TickTick. Si c'est sémantique, déclaratif, ou
éditorial (« cette semaine je veux livrer Y », « bilan de la semaine »), il
va dans Aetheris.

---

## 3. Hiérarchie de la cascade

```
Identité (Vision LT, ~10 ans)        — 3 max
   └── OKR (annuel)                   — 5 max par année
        └── KR (key result)            — 4 max par OKR — = Objective existant + parent_okr_id
             └── Rock (trimestriel)    — 5 max par trimestre
                  └── Mois (jalons)    — 1-3 jalons par mois
                       └── Semaine     — 3 MITs max
                            └── Jour   — 1 priorité + 3 importantes + 5 secondaires
```

**Plafonds stricts appliqués dans l'UI** (anti-méta-fuite, cf. §10).

---

## 4. Choix d'architecture

### Pattern de persistance

Aetheris utilise un pattern KV via la table Supabase `stores` (clé/valeur
JSON, voir `src/lib/supabaseSync.ts`). **On suit ce pattern.**

→ Création d'**un seul nouveau store Zustand** : `planningStore`,
sérialisé en JSON dans `stores.value` avec la clé `${userId}:planningStore`.

**Conséquences** :
- Pas de migrations SQL nouvelles
- Pas de FK : les relations sont des `string[]` d'IDs gérées en TS
- Sync gratuite via `supabaseStorage` existant
- Cohérence relationnelle = responsabilité du code TS

### Articulation avec `Objective` existant

Les `Objective` existants (rattachés à un `domain`) gagnent **3 champs
optionnels** :

```ts
type Objective = {
  // ... champs existants (id, domainId, title, description, progress, kind, archived…)
  parentOkrId?: string   // si défini → cet Objective est un KR sous un OKR
  targetValue?: string   // ex: "≥80%", "31 nouvelles", "1er sept 2026"
  dueDate?: string       // ISO date — échéance KR
}
```

**Règle** : un Objective **peut** être :
- Sans `parentOkrId` → objectif local au domaine, comme aujourd'hui
- Avec `parentOkrId` → joue aussi le rôle de KR dans la cascade

Pas de double saisie. Un même « lire 52 livres en 2026 » est à la fois
Objective du domaine Livres et KR de l'OKR « densité culturelle ».

---

## 5. Modèle de données — `planningStore`

```ts
// =============================================================================
// IDENTITÉ — Vision LT (~10 ans). Max 3 actives.
// =============================================================================
type Identity = {
  id: string
  name: string                         // ex: "Avocat fiscaliste respecté"
  description: string                  // 1 paragraphe
  horizon: string                      // ex: "10 ans", "5-10 ans"
  status: 'en_construction' | 'projection'
  imageUrl?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// =============================================================================
// OKR — Objectif annuel. Max 5 par année.
// =============================================================================
type Okr = {
  id: string
  name: string                         // ex: "Sécuriser ma trajectoire fiscaliste"
  description?: string
  year: number                         // ex: 2026
  status: 'en_cours' | 'terminé' | 'abandonné'
  identityIds: string[]                // N-N → Identity
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// =============================================================================
// KR — Key Result. Vit dans la table Objective existante.
// Voir §4 : 3 champs ajoutés (parentOkrId, targetValue, dueDate).
// Max 4 par OKR. PAS dans planningStore — reste dans store principal.
// =============================================================================

// =============================================================================
// ROCK — Livrable trimestriel. Max 5 par trimestre.
// =============================================================================
type Rock = {
  id: string
  name: string                         // ex: "Rapport d'alternance déposé"
  expectedResult?: string              // résultat attendu détaillé
  quarter: string                      // ex: "Q3 2026"
  deadline?: string                    // ISO date
  status: 'a_faire' | 'en_cours' | 'terminé' | 'abandonné'
  krIds: string[]                      // N-N → Objective (KR)
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// =============================================================================
// MOIS — Jalons mensuels (1-3) + focus hebdo prévisionnel + risque.
// Optionnel : on n'est pas obligé d'avoir un Month chaque mois.
// =============================================================================
type Month = {
  id: string
  year: number
  month: number                        // 1-12
  milestones: string[]                 // 1-3 jalons texte
  weeklyFocus: { isoWeek: number, focus: string }[]  // découpage hebdo prévisionnel
  identifiedRisk?: string              // "Le risque qui pourrait casser ce mois"
  mitigationPlan?: string
  createdAt: string
  updatedAt: string
}

// =============================================================================
// SEMAINE — 3 MITs + risque. Une entrée unique par (year, isoWeek).
// =============================================================================
type Week = {
  id: string
  isoYear: number
  isoWeek: number                      // 1-53
  mit1?: string
  mit2?: string
  mit3?: string
  risk?: string                        // "Quel risque pourrait casser cette semaine ?"
  mitigationPlan?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// =============================================================================
// JOUR — Plan 1-3-5. Une entrée unique par date.
// =============================================================================
type DayPlan = {
  id: string
  date: string                         // ISO date "YYYY-MM-DD"
  dayType?: 'cabinet' | 'ecole' | 'libre'
  priority?: string                    // LA chose absolue (1)
  importants: string[]                 // max 3
  secondaries: string[]                // max 5
  energyExpected?: 'faible' | 'moyenne' | 'haute'
  pivotQuestion?: string               // "Si je ne fais qu'UNE chose demain..."
  prepChecklist?: { label: string, done: boolean }[]
  createdAt: string
  updatedAt: string
}

// =============================================================================
// REVUE — Hebdo structurée + autres revues libres (Markdown).
// =============================================================================
type ReviewKind = 'weekly' | 'monthly' | 'quarterly' | 'annual'

type Review = {
  id: string
  kind: ReviewKind
  periodStart: string                  // ISO date
  periodEnd: string                    // ISO date

  // ── Champs structurés (utilisés pour kind='weekly') ─────────────────────────
  mit1Status?: 'done' | 'partial' | 'missed'
  mit2Status?: 'done' | 'partial' | 'missed'
  mit3Status?: 'done' | 'partial' | 'missed'
  habitsScore?: Record<string, { hit: number, total: number }>  // ex: {ecriture: {hit: 5, total: 7}}
  energyAvg?: number                   // 1-10
  rsHours?: number                     // heures écran semaine
  victory?: string
  difficulty?: string
  difficultyRootCause?: string
  learning?: string
  nextWeekPivot?: string

  // ── Champ libre Markdown (utilisé pour kind='monthly'|'quarterly'|'annual') ──
  bodyMd?: string

  createdAt: string
  updatedAt: string
}

// =============================================================================
// SYSTEM NOTE — Notes statiques (règles anti-abandon, profil, protocole).
// =============================================================================
type SystemNote = {
  id: string
  slug: 'anti_abandon_rules' | 'profile' | 'protocole_re_entree' | 'stack_reference' | string
  title: string
  contentMd: string
  updatedAt: string
}

// =============================================================================
// État global du store
// =============================================================================
type PlanningState = {
  identities: Identity[]
  okrs: Okr[]
  rocks: Rock[]
  months: Month[]
  weeks: Week[]
  dayPlans: DayPlan[]
  reviews: Review[]
  systemNotes: SystemNote[]

  // actions : CRUD pour chaque entité
  // sélecteurs : getOkrsByIdentity, getKrsByOkr, getRocksByKr, getCurrentWeek, getCurrentDayPlan…
}
```

---

## 6. Écrans

Route racine : `/planning`. Toutes sous-routes protégées par auth.

| Route | Rôle | Phase |
|---|---|---|
| `/planning` | **Hub cascade** — vue d'ensemble 3 colonnes (Identités \| OKR de l'année \| Rocks du trimestre) avec barres de progression et liens descendants | 2 |
| `/planning/identities/:id` | Édition d'une identité (Vision LT) | 2 |
| `/planning/okrs/:id` | OKR + ses KR (Objectives) avec progression rollup | 2 |
| `/planning/rocks/:id` | Rock + ses KR liés + deadline + statut | 2 |
| `/planning/months/:year/:month` | Vue d'un mois : jalons + découpage hebdo + risque | 3 |
| `/planning/week` | Semaine en cours : 3 MITs + risque (édition inline) | 3 |
| `/planning/week/:isoYear/:isoWeek` | Lecture/édition d'une semaine passée ou future | 3 |
| `/planning/day` | Plan du jour (aujourd'hui par défaut). Bouton « Planifier demain » | 3 |
| `/planning/day/:date` | Plan d'un jour passé ou futur | 3 |
| `/planning/review/new?kind=weekly` | Nouvelle revue hebdo (formulaire structuré, ~10 champs) | 3 |
| `/planning/review/new?kind=monthly\|quarterly\|annual` | Nouvelle revue libre (éditeur Markdown) | 3 |
| `/planning/review/:id` | Lecture/édition d'une revue | 3 |
| `/planning/reviews` | Historique de toutes les revues, filtre par `kind` | 3 |
| `/planning/notes/:slug` | Note système (anti-abandon, profil, protocole re-entrée) — éditeur Markdown | 3 |

### Intégration dans l'app

- **Nav latérale** : ajouter une entrée « Planning » entre « Focus » et « Finances ».
- **Dashboard** : 2 widgets nouveaux :
  - « Aujourd'hui » → résumé `DayPlan.priority` + 3 importantes
  - « Cette semaine » → 3 MITs + risque
- **Pages domaine existantes** : sur chaque `Objective` qui a un `parentOkrId`,
  afficher une mention discrète « KR de [OKR.name] » avec lien vers `/planning/okrs/:id`.
- **FocusDashboard** : inchangé, reste indépendant (Pomodoro pour les tâches d'exécution).

---

## 7. Articulation TickTick / Apple Calendar / Aetheris

### Au quotidien (J-1 le soir, ~10 min)

1. Ouvre `/planning/day?date=demain`
2. Définit la **priorité 1** (= l'action qui DOIT être faite — texte libre)
3. Liste 3 **importantes** + 5 **secondaires** (texte libre)
4. Coche la **prep checklist** (tenue, sac, Kindle, documents)
5. En parallèle : créer/mettre à jour les vraies tâches exécutables dans **TickTick** si elles n'y sont pas déjà

### Le dimanche soir 20h (revue hebdo, 20-30 min)

1. Apple Calendar déclenche le rappel
2. Ouvre `/planning/review/new?kind=weekly`
3. Le formulaire reprend les 3 MITs de la `Week` en cours et demande leur statut
4. Remplit les champs (victoire, difficulté, apprentissage, pivot semaine suivante)
5. Vide l'**inbox Apple Notes** (idées capturées dans la semaine → tri vers TickTick / `~/Documents/Nouvelles/01-Idées/` / poubelle)
6. Crée la **prochaine `Week`** : 3 MITs + risque (édition inline `/planning/week`)

### Pas dans le MVP

- Pas d'API TickTick. Le 1-3-5 et les MITs sont du texte libre. Si tu veux la sous-tâche détaillée, c'est dans TickTick (séparément).
- Pas de sync Apple Calendar. Les engagements externes restent dans Calendar, Aetheris ne les affiche pas.
- Pas de notifications push depuis Aetheris. Les rituels vivent dans Apple Calendar (rappels récurrents existants).

---

## 8. Articulation avec l'existant Aetheris

| Composant existant | Impact | Action |
|---|---|---|
| `objectiveStore` (ou équivalent) | Ajout 3 champs optionnels à `Objective` | Migration douce (champs optionnels, rien ne casse) |
| `domain` | Aucun | Inchangé |
| Page domaine (DroitPage, BooksPage…) | Affichage discret « KR de [OKR] » si `parentOkrId` défini | Ajout d'une `<span>` conditionnelle |
| `Dashboard` | 2 widgets ajoutés (Aujourd'hui, Cette semaine) | Composants `<TodayWidget />` + `<WeekWidget />` |
| `FocusDashboard` | Aucun | Inchangé, indépendant de la cascade |
| Routes (`App.tsx`) | Ajout du bloc `/planning/*` (lazy-loaded `<PlanningModule />`) | Nouvelle entrée |

**Aucune page existante n'est supprimée ou refactorée.**

---

## 9. Phases de développement

| Phase | Période | Contenu | Done quand |
|---|---|---|---|
| 1 — Spec | 13-15 juin (4-6h, papier ou Figma) | Wireframes des 11 écrans, validation modèle de données, articulation TickTick | Spec signée, ce doc à jour |
| 2 — Cascade haute | 16-30 juin | `planningStore` + écrans Hub, Identité, OKR, Rock + modif `Objective` | Saisir Vision LT → OKR → Rocks de bout en bout |
| 3 — Cascade basse | 1-31 juillet | Écrans Mois, Semaine, Jour, Revue hebdo (form), historique revues, Notes système | Premier rituel hebdo complet dans Aetheris |
| 4 — Migration | août 2026 | Copie manuelle (ou script ponctuel) du contenu depuis Notion → Aetheris | Notion en lecture seule |
| 5 — Décision Notion | 30 septembre 2026 | Audit usage : Notion supprimé ou archivé en lecture seule définitive | Décision actée en revue trimestrielle Q3 |

### Critère de bascule Phase 3 → 4

À la fin de juillet, **2 revues hebdo consécutives** doivent avoir été faites
dans Aetheris (pas Notion). Si pas le cas → ne pas migrer, diagnostiquer
pourquoi.

---

## 10. Règles anti-méta-fuite spécifiques au projet

Le commit `55a6505` (supprime Kit, Aujourd'hui, Semaine, Écriture, Emploi du
temps) montre une tentative précédente qui a échoué parce qu'elle empiétait
sur TickTick. Cette spec applique des règles strictes pour ne pas refaire
l'erreur.

### Plafonds appliqués dans l'UI (validations bloquantes)

| Entité | Plafond | Sanction |
|---|---|---|
| `Identity` actives | 3 | Bouton « + » désactivé au 3ème |
| `Okr` par année | 5 | Idem |
| `Objective` (KR) par OKR | 4 | Idem |
| `Rock` par trimestre | 5 | Idem |
| `Month.milestones` | 3 | Form limité |
| `Week.mit{1,2,3}` | 3 champs | Schéma figé |
| `DayPlan.importants` | 3 | Form limité |
| `DayPlan.secondaries` | 5 | Form limité |

### Fonctionnalités explicitement HORS scope

- **Pas d'IA / Kit / auto-plan** — cause directe de l'échec précédent
- **Pas de Pomodoro intégré dans `/planning`** — `FocusDashboard` existe déjà, on n'y touche pas
- **Pas de sync API TickTick** — texte libre, c'est tout
- **Pas de notifications push Aetheris** — Apple Calendar fait le job
- **Pas de partage / collaboration** — Aetheris est solo
- **Pas d'éditeur d'archives** (consultation seule en Phase 5+)
- **Pas de stats / dashboards analytics complexes** dans le MVP — `AnalyticsPage` existe déjà
- **Pas de système de templates personnalisés** — 5 templates revues figés (1 structuré hebdo, 1 libre Markdown pour les 3 autres)

### Permission d'optimisation

Toute modification de cette spec ou ajout de fonctionnalité au `planningStore`
est interdite hors de ces 3 fenêtres :

- **Revue hebdo** (dimanche 20h) → 5 min max
- **Revue mensuelle** (1er du mois) → 15 min max
- **Revue trimestrielle** → 30 min max

Hors de ces fenêtres : capture dans la note Apple Notes « Idées d'optimisation »,
pas d'action.

---

## 11. Glossaire

| Terme | Définition |
|---|---|
| **Identité** | Rôle/projection à 10 ans (« avocat fiscaliste », « écrivain ») |
| **OKR** | Objective + Key Results sur 12 mois |
| **KR** | Key Result mesurable — c'est un `Objective` avec `parentOkrId` défini |
| **Rock** | Livrable concret datable sur 90 jours (méthode EOS / Gino Wickman) |
| **MIT** | Most Important Task — livrable hebdo (≠ tâche TickTick) |
| **1-3-5** | Méthode de priorisation : 1 priorité absolue + 3 importantes + 5 secondaires |
| **J-1** | Routine du soir : planifier le lendemain avant de se coucher |
| **Méta-fuite** | Optimiser le système au lieu d'exécuter — point de défaillance identifié |
| **Protocole de re-entrée** | Procédure de retour après rupture d'une habitude (cf. note Apple Notes épinglée) |

---

## 12. Décisions actées (à ne pas rouvrir avant 30 sept 2026)

1. **TickTick reste** pour les tâches et habitudes. Aetheris ne le remplace pas.
2. **Apple Calendar reste** pour les engagements externes.
3. **Pattern KV** (`stores` table + JSON) — pas de tables SQL relationnelles dédiées.
4. **KR = `Objective` étendu** (option b validée) — pas de table KR séparée.
5. **MITs en texte libre** dans `Week` — pas de lien avec TickTick.
6. **1-3-5 en texte libre** dans `DayPlan` — pas de lien avec TickTick.
7. **Revue hebdo = formulaire structuré**. Mensuelle/trimestrielle/annuelle = Markdown libre.
8. **Mois inclus** dans la cascade (entre Rock et Semaine) car ne rentre pas dans TickTick.
9. **Pas de code Aetheris-planif** avant le 13 juin 2026 (post-exposé).

---

## 13. Pour reprendre une session Claude future sans contexte

Bootstrap minimum à coller en début de chat :

```
Je travaille sur la cascade de planification dans Aetheris.
Spec : docs/planning/SPEC.md (à lire avant tout).
Pattern : planningStore Zustand (KV via supabaseStorage).
Décisions actées : §12 de la spec, ne pas rouvrir.
État actuel : [phase X — préciser]
```

C'est tout. La spec est self-contained.
