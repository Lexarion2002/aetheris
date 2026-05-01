# Aetheris

Application personnelle de gestion de vie — journal de bord intellectuel, suivi de carrière, finances, culture et créativité. Interface chaude et typographique, pensée pour un usage quotidien solo.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| UI | React 19 + TypeScript |
| Build | Vite 7 |
| Styles | Tailwind CSS v4 + tokens CSS custom (design system inline) |
| Routing | React Router v7 |
| État | Zustand v5 |
| Backend | Supabase (auth + stockage blob clé/valeur) |
| Icônes | Lucide React |
| Export | xlsx (Excel) |
| Tests | Vitest + Testing Library |

---

## Design system

Palette chaude, typographie littéraire — jamais de noir pur ni de blanc froid.

```
--paper    #F4ECDC   fond dominant, ivoire chaud
--ink      #3A2E22   sépia foncé, texte principal
--terra    #B5532A   terre brûlée — action primaire
--sage     #7E9A7A   vert doux — positif / succès
```

Typographies : **Newsreader** (serif, titres), **Geist** (sans-serif, corps), **JetBrains Mono** (mono, chiffres et labels).

Tokens complets dans [`src/index.css`](src/index.css).

---

## Architecture

```
src/
  pages/          Pages — une par domaine (lazy-loaded)
  components/     Composants partagés (Layout, Sidebar, Header, modales…)
  store/          Stores Zustand — un par domaine
  lib/            Supabase client + adaptateurs de sync
  utils/          Fonctions pures (finance, dates, couleurs domaines…)
  types/          Types TypeScript globaux
```

### Persistance

Toutes les données sont stockées dans une seule table Supabase :

```sql
stores (
  key         text PRIMARY KEY,  -- "{userId}:{store-name}"
  value       text,              -- état Zustand sérialisé en JSON
  updated_at  timestamptz
)
```

Chaque store Zustand utilise un adaptateur custom (`supabaseStorage`) qui écrit en localStorage (source principale, synchrone) et réplique vers Supabase en arrière-plan. Le store Shopping utilise `supabaseOnlyStorage` (Supabase only) pour éviter les débordements localStorage liés aux images base64.

---

## Fonctionnalités

### Dashboard
- En-tête avec date, numéro de semaine ISO, barre d'avancement des tâches du jour
- Widget **En cours** : 3 cartes (Écriture, Finance, domaine prioritaire)
- Section **Aujourd'hui** : actions urgentes agrégées depuis 4 sources — tâches Zustand, missions carrière, dates clés droit, tâches cabinet
- Grille domaines avec stats contextuelles par domaine
- Solde du mois avec report cumulé des mois précédents

### Finance
- Transactions revenus/dépenses avec catégories personnalisables
- Graphiques donut SVG (dépenses + revenus) avec tooltips au hover
- Solde net = report + revenus − dépenses du mois
- Objectifs d'épargne avec barre de progression
- Navigation par mois
- Export Excel (feuilles Transactions + Résumé)

### Cabinet — suivi d'alternance
- **Dossiers** : tableau avec référence auto-générée, avocat référent, type, statut coloré (en cours / en attente / clôturé), deadline urgente
- **Tâches & recherches** : liste avec checkbox toggle, priorité (Urgent / Normal / Quand possible), rattachement optionnel à un dossier, filtre par dossier
- **Notes de séances** : timeline chronologique avec type coloré (Réunion / Audience / Séance de travail), participants, extrait
- **Contacts cabinet** : grille avec avatars initiales teinté par rôle, email cliquable

### Livres
- Bibliothèque avec couvertures génératives SVG (10 palettes × 6 templates, déterministes par titre/auteur)
- Panthéon (notes ≥ 9), En cours avec progression et impressions, File d'attente
- Stats annuelles avec bandeau 12 mois et objectif de lecture

### Films & Séries
- Posters génératifs SVG (12 palettes × 8 motifs)
- En cours, Panthéon, Bibliothèque avec filtres type (Film / Série) et tri, File d'attente
- Stats KPI année en cours
- Modales ajout / critique / édition avec upload affiche

### Musique
- Bibliothèque critiques avec couvertures génératives (8 palettes × 4 motifs)
- Panthéon, album en écoute, file d'attente

### Achats
- Wishlist et articles achetés avec images
- Catégories colorées personnalisables
- Verdict post-achat (Satisfait / Mitigé / Déçu)
- Stockage Supabase-only pour les images volumineuses

### Écriture
- Arcs narratifs, suivi chapitres, sessions quotidiennes, personnages, fragments, citations

### Droit
- Dates clés (Grand Oral, Rapport de stage), statut d'avancement, lien Notion

### Carrière
- Missions avec stades (briefing → rendu), info cabinet, compétences, contacts, outils

### Sport
- Historique séances (course / streetworkout), objectifs, statut général

### Cuisine
- Recettes et ingrédients

### Autres
- **WeekView** — vue semaine avec tâches par jour
- **FocusDashboard** — timer Pomodoro avec sessions enregistrées
- **AnalyticsPage** — graphiques d'activité
- **SettingsPage** — thème, langue, domaines, paramètres Pomodoro

---

## Démarrage

```bash
npm install
npm run dev
```

Créer un fichier `.env.local` à la racine :

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Sans ces variables, l'application fonctionne en mode local (pas de sync cloud, pas d'auth).

---

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualiser le build |
| `npm run test` | Tests unitaires (Vitest) |
| `npm run lint` | Lint ESLint |
