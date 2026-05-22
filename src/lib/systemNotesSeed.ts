// =============================================================================
// systemNotesSeed.ts
//
// Contenu des 4 notes système, importé depuis le hub Memory Notion
// (sous-pages : Règles anti-abandon · 1. Profil & règles · Stack — Référence).
// Le protocole de re-entrée est un placeholder à compléter — il vit
// historiquement dans Apple Notes épinglées.
//
// Source : https://www.notion.so/32b36e212b7f81bebf63fa57c1780672 (20 mai 2026)
// =============================================================================

export interface SystemNoteSeed {
  slug:      string
  title:     string
  contentMd: string
}

const ANTI_ABANDON = `> **Issu du Livrable 6 — 20 mai 2026.** À relire au début de chaque revue mensuelle.

## Plafonds stricts

| Type | Plafond |
| --- | --- |
| Habitudes simultanées | **2 maximum** |
| OKR annuels | 5 max · 4 KR max par O |
| Rocks / trimestre | 5 max |
| MITs / semaine | 3 max |
| Outils actifs | 11 max |

> **Tout ajout = retrait obligatoire d'un élément existant.** Pas de croissance nette.

## Calendrier des permissions d'optimisation

| Moment | Budget autorisé |
| --- | --- |
| Revue hebdo | 5 min max |
| Revue mensuelle | 15 min max |
| Revue trimestrielle | 30 min max |
| Hors de ces moments | Capture dans « Idées d'optimisation » — pas d'action |

## Évaluation binaire J+30 · J+60 · J+90

| Critère | Mesure |
| --- | --- |
| TickTick utilisé ≥ 1× / jour | oui / non |
| J-1 fait ≥ 80 % des soirs | oui / non |
| Revues hebdo tenues 100 % | oui / non |
| Habitudes ≥ 80 % | oui / non |
| Écriture 21h-23h ≥ 80 % | oui / non |

- **5 / 5** → système robuste, on continue
- **4 / 5** → signal faible, identifier la cause précise
- **3 / 5 ou moins** → effondrement en cours, arrêt, diagnostic, coupe, relance simplifiée

**Paliers Apple Calendar** : 20 juin (J+30) · 20 juillet (J+60) · 20 août (J+90)

## Les 9 règles

**Règle 1 — Plafond strict d'engagements actifs.** Voir tableaux ci-dessus. Tout ajout déclenche un retrait obligatoire. Pas de croissance nette.

**Règle 2 — Protocole de re-entrée obligatoire à la 1ʳᵉ rupture.** Protocole stocké dans Apple Notes épinglé. À utiliser dans les 24h après rupture, pas dans les 3 jours.

**Règle 3 — Pas de refonte avant 30 jours d'usage continu.** Toute envie de modifier un outil, un rituel, un template doit attendre 30 jours. Capture dans Apple Notes « Idées d'optimisation », action différée. *Exception* : un bug ou un échec mesurable. Pas un sentiment.

**Règle 4 — Mesure binaire d'usage, pas qualitative.** Un outil est jugé sur une question binaire :
- TickTick : *« ouvert et utilisé ≥ 1× par jour les 14 derniers jours ? »*
- Revue hebdo : *« faite chaque dimanche depuis 4 semaines ? »*
- Écriture : *« 21h-23h ≥ 80 % des soirs sur 4 semaines ? »*

Pas de « presque », pas de « un peu ». Oui / non.

**Règle 5 — Suppression automatique après 30 jours de non-usage.** Tout outil non utilisé ≥ 1× par semaine pendant 4 semaines consécutives est désinstallé sans discussion.

**Règle 6 — Calendrier des permissions d'optimisation.** Voir tableau ci-dessus.

**Règle 7 — Test du « problème concret ».** Toute nouvelle fonctionnalité / outil / page doit passer ce test :
> *« Quel problème concret, manifesté ≥ 3 fois dans les 14 derniers jours, est-ce que ça résout ? »*

Sans réponse précise (avec dates et exemples), on ne fait pas.

**Règle 8 — Sanctuarisation des rituels.** Les rituels sont sanctuarisés dans Apple Calendar. Une absence se compense, jamais ne se saute :
- Revue hebdo manquée dimanche → lundi soir max
- Revue mensuelle manquée le 1ᵉʳ → dans les 3 jours
- J-1 manqué → J-0 minimaliste le lendemain matin (5 min)

Sauter sans compenser = appliquer le protocole de re-entrée.

**Règle 9 — Évaluation honnête à J+30, J+60, J+90.** Voir tableau d'évaluation binaire ci-dessus.
`

const PROFILE = `> Louis Saure — Alternant M2 Droit des contrats d'affaires · Cabinet Paris · Niveau attendu : **expert**. Ne pas réexpliquer les concepts fondamentaux.

## Règles d'interaction

**Radical honesty · incertitude · sourcing**
- Pas de flatterie, pas d'embellissement, ton neutre et direct.
- Jamais de spéculation sans signal explicite d'incertitude. Si incertain : le dire.
- Jamais d'invention de faits, citations, références. Toujours sourcer ou signaler l'absence de source.

**Format d'échange**
- Ne pas réexpliquer ce qui a déjà été dit dans la conversation.
- Une seule question de clarification si la demande est ambiguë — pas plusieurs.
- Pas d'intro type « Bien sûr ! », « Absolument ! », « Voici ! » — aller droit au but.

## Format de réponse

| Paramètre | Règle |
| --- | --- |
| Langue | Français par défaut, sauf instruction contraire |
| Listes à puces | Uniquement pour 3+ éléments. Sinon, prose. |
| Titres H2 / H3 | Pour les sujets complexes ou documents structurés |
| Code | Commentaires uniquement sur les parties non évidentes. Lisibilité > concision. |
| Incertitude | Toujours signalée explicitement avant de conclure |
`

const STACK_REFERENCE = `*Mise à jour : 20 mai 2026. Un outil = une responsabilité principale. Si une information peut aller à deux endroits, elle n'a pas de place définie — choisir et écrire ici.*

## Vue d'ensemble

| Outil | Responsabilité principale | Statut |
| --- | --- | --- |
| TickTick | Tâches exécutables · Habitudes · Pomodoro | 🟡 Test → 15 juin |
| Apple Notes | Capture brute · Brouillons · Interruptions | 🟢 Actif |
| Voice Memos | Idées en mouvement (audio) | 🟢 Actif |
| Apple Calendar | RDV externes · Deadlines tiers · Rituels récurrents | 🟢 Actif |
| Notion | Cascade · Templates · Projets · Profil | 🟢 Hub principal |
| Word + Finder Mac | Cours M2 · Alternance · Nouvelles | 🟢 Actif |
| Sources juridiques | Légifrance · Dalloz · Lexis · Lexbase | 🟢 Actif |
| Kindle | Lecture (transports, soir) | 🟢 Actif |
| Aetheris | Finances · Livres · Films · Recettes | 🔴 Gel → 30 sept 2026 |
| iCloud Keychain | Mots de passe | 🟢 Migration en cours |
| ColdTurkey · One Sec · Screen Time | Anti-distraction | 🟢 Actif |

> **Règle d'inflation zéro** : tout nouvel outil testé = désinstallation d'un outil existant *avant* la fin du test.

## Détail par outil

### TickTick — Tâches & habitudes 🟡 test jusqu'au 15 juin
- **Plateforme** : Mac + iPhone
- **J'y mets** : toutes les tâches exécutables (4 listes : Cabinet / M2 / Perso / Écriture) · habitudes quotidiennes (max 2 : écriture 21h-23h + pas de RS avant 9h) · Pomodoro pour les blocs de focus
- **J'y mets pas** : objectifs / OKR / rocks → Notion · engagements externes → Apple Calendar · captures d'idées brutes → Apple Notes d'abord
- **Fréquence** : quotidien (matin vue Aujourd'hui + soir mise à jour)

### Apple Notes — Capture & brouillons 🟢
- **Plateforme** : Mac + iPhone (iCloud)
- **J'y mets** : capture rapide de toute idée fugace · brouillons de nouvelles avant migration Word · idées juridiques à creuser · interruptions cabinet à trier · notes épinglées permanentes (*Protocole de re-entrée* + *Idées d'optimisation*)
- **J'y mets pas** : cours / fiches de droit → Word + dossier Mac · objectifs / tâches → TickTick ou Notion
- **Fréquence** : plusieurs fois par jour, vidage lors de la revue hebdo

### Voice Memos — Audio en mouvement 🟢
Idées en mouvement (transports, marche) quand taper est impossible. Ébauche orale d'une nouvelle ou d'un argument juridique. Pas d'enregistrements longs jamais réécoutés.

### Apple Calendar — RDV & deadlines externes 🟢
- **J'y mets** : RDV externes · cours M2 · deadlines imposées par un tiers · récurrents système (revue hebdo dimanche 20h · paliers J+30 / J+60 / J+90)
- **J'y mets pas** : time-blocks personnels → Notion J+1 ou TickTick · tâches → TickTick · objectifs → Notion

### Notion — Hub Memory 🟢 principal (MCP connecté à Claude)
- **J'y mets** : cascade d'objectifs (Vision LT → OKR → Rocks → Mois) · templates de revue + historique · projets longs (Rapport alternance · Candidatures M2 · Roadtrip) · profil & règles · archives
- **J'y mets pas** : tâches → TickTick · finances / livres / films / recettes → Aetheris · cours / fiches / documents → Word + Mac · nouvelles → \`~/Documents/Nouvelles/\` · capture brute → Apple Notes d'abord

### Word + Finder Mac — Cours, alternance, écriture 🟢
- \`~/Documents/Cours/\` → cours M2 par matière (cours + fiches + TD / séminaire)
- \`~/Documents/Alternance/\` → notes cabinet, dossiers, rapport d'alternance
- \`~/Documents/Nouvelles/\` → \`01-Idées/\` · \`02-En cours/\` · \`03-Finalisées/\`

### Sources juridiques — Consultation pure 🟢
- **Légifrance** : articles de loi, codes, textes officiels
- **Dalloz** : articles doctrinaux, jurisprudence commentée, manuels
- **LexisNexis** : recherche juridique, fascicules
- **Lexbase** : actualité juridique quotidienne

### Aetheris — 🔴 Gel développement jusqu'au 30 septembre 2026
- **Modules opérationnels maintenus** : Finances · Livres lus · Films · Recettes
- **Interdit jusqu'au 30 sept** : aucun nouveau module, aucune session Claude Code sur Aetheris
- **Réveil prévu** : revue trimestrielle Q3 — 30 septembre 2026

### Anti-distraction : ColdTurkey · One Sec · Screen Time 🟢
- **ColdTurkey** (gratuit, Mac) : blocage Instagram + Twitter 9h-18h, activation manuelle, rappel 8h55
- **One Sec** (iPhone) : friction 8-10 sec avant toute app RS
- **Screen Time iOS** : limite 5 min / jour Instagram + Twitter, tracking hebdo passif

## Outils abandonnés

| Outil | Raison | Date |
| --- | --- | --- |
| Toggl | Oubli systématique, tracking manuel incompatible | 20 mai 2026 |
| Obsidian | Jamais démarré malgré l'intention, coût > bénéfice | 20 mai 2026 |

## À introduire post-septembre 2026

| Outil | Fonction | Déclenchement |
| --- | --- | --- |
| Feedly (freemium) | Veille juridique fiscalité automatisée | Après admission M2 fiscal |
| iA Writer (~30 €) | Écriture littéraire design papier / encre | Si l'envie persiste après sept. |
| ColdTurkey Pro (~30 €) | Blocage automatique sans activation manuelle | Si la version gratuite crée trop de friction |

*Cadence de mise à jour : lors de la revue trimestrielle.*
`

const PROTOCOLE_RE_ENTREE = `> Procédure de retour après rupture d'une habitude. **À activer dans les 24h, jamais après 3 jours.** Source : Apple Notes épinglée.

## Quand activer

Dès qu'une habitude saute (écriture, J-1, revue hebdo…). Pas le lendemain « si ça se reproduit » — immédiatement, dans les 24h.

## Protocole

1. **Constater sans dramatiser.** Une rupture ≠ un effondrement. C'est un signal, pas un verdict.
2. **Identifier la cause précise.** Une cause unique, pas une liste. Si insaisissable : « à creuser », on note et on continue.
3. **Re-démarrer à plus petite intensité.** Pas de retour à 100 % le lendemain — un retour minimaliste suffit.
   - Écriture sautée → 10 minutes le lendemain, même brouillon
   - J-1 sauté → 3 lignes le matin suivant
   - Revue hebdo manquée dimanche → lundi soir, version courte
4. **Noter ce qu'on retient.** En une phrase, dans Apple Notes ou la prochaine revue hebdo.
5. **Reprendre le rythme normal le jour suivant.** Pas de séance de rattrapage gigantesque.

## Règle d'or

> Sauter sans compenser = appliquer ce protocole. Sauter en compensant le lendemain = pas de protocole, juste continuer.

## À éviter

- Décider qu'on « reprendra lundi prochain » → 6 jours d'inertie supplémentaires
- Refaire une grosse session pour « rattraper » → fatigue et rechute
- Modifier l'habitude pour la rendre « plus réaliste » dans les 30 premiers jours (cf. Règle anti-abandon n°3)
`

// =============================================================================
// Export
// =============================================================================

export const SYSTEM_NOTES_SEED: SystemNoteSeed[] = [
  { slug: 'anti_abandon_rules',  title: 'Règles anti-abandon',          contentMd: ANTI_ABANDON.trim() },
  { slug: 'profile',             title: 'Profil & règles d\'interaction', contentMd: PROFILE.trim() },
  { slug: 'stack_reference',     title: 'Stack — Référence',             contentMd: STACK_REFERENCE.trim() },
  { slug: 'protocole_re_entree', title: 'Protocole de re-entrée',        contentMd: PROTOCOLE_RE_ENTREE.trim() },
]

export function getSeedBySlug(slug: string): SystemNoteSeed | undefined {
  return SYSTEM_NOTES_SEED.find((n) => n.slug === slug)
}
