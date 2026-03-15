import { useState } from 'react'
import { useCareerStore } from '../store/careerStore'
import type {
  Mission, MissionStade, StatusSemaine,
  CompetenceLevel, OutilPraticien, Contact,
} from '../store/careerStore'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const daysUntil = (iso: string | null): number | null => {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STADE_CONFIG: Record<MissionStade, { label: string; color: string }> = {
  briefing:   { label: 'Briefing',           color: 'bg-purple-500/15 text-purple-300 border border-purple-500/25' },
  recherches: { label: 'Recherches',          color: 'bg-blue-500/15 text-blue-300 border border-blue-500/25' },
  redaction:  { label: 'Rédaction',           color: 'bg-amber-500/15 text-amber-300 border border-amber-500/25' },
  relecture:  { label: 'Relecture avocat',    color: 'bg-orange-500/15 text-orange-300 border border-orange-500/25' },
  rendu:      { label: 'Rendu',               color: 'bg-green-500/15 text-green-300 border border-green-500/25' },
}

const STATUS_CONFIG: Record<StatusSemaine, { label: string; color: string }> = {
  mission_en_cours:    { label: 'Mission en cours',    color: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
  en_attente_retour:   { label: 'En attente retour',   color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  semaine_academique:  { label: 'Semaine académique',  color: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
}

const LEVEL_CONFIG: Record<CompetenceLevel, { label: string; color: string; bar: string; order: number }> = {
  expose:   { label: 'Exposé',    color: 'text-zinc-400', bar: 'bg-zinc-600',   order: 1 },
  pratique: { label: 'Pratiqué',  color: 'text-blue-300', bar: 'bg-blue-500',   order: 2 },
  a_laise:  { label: 'À l\'aise', color: 'text-yellow-300', bar: 'bg-yellow-500', order: 3 },
}

const QUALITE_CONFIG = {
  ponctuel:       { label: 'Ponctuel',       icon: '🤝', color: 'text-zinc-400' },
  bonne_relation: { label: 'Bonne relation', icon: '⭐', color: 'text-blue-300' },
  mentor:         { label: 'Mentor',         icon: '🎓', color: 'text-yellow-300' },
}

// ─── Section nav ──────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'cabinet',     label: 'Le Cabinet' },
  { id: 'missions',    label: 'Missions' },
  { id: 'archives',    label: 'Archives' },
  { id: 'outils',      label: 'Boîte à outils' },
  { id: 'competences', label: 'Compétences' },
  { id: 'contacts',    label: 'Contacts' },
]

// ─── MissionCard ──────────────────────────────────────────────────────────────

function MissionCard({ mission }: { mission: Mission }) {
  const [expanded, setExpanded] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveForm, setArchiveForm] = useState({ themeJuridique: '', competenceDeveloppee: '', reutil: false })
  const { updateMission, updateMissionStade, deleteMission, archiveMission } = useCareerStore()
  const days = daysUntil(mission.deadline)
  const urgentDeadline = days !== null && days <= 2 && days >= 0
  const overdueDeadline = days !== null && days < 0

  const handleArchive = () => {
    if (!archiveForm.themeJuridique.trim() || !archiveForm.competenceDeveloppee.trim()) return
    archiveMission(mission.id, archiveForm.themeJuridique, archiveForm.competenceDeveloppee, archiveForm.reutil)
    setArchiveOpen(false)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STADE_CONFIG[mission.stade].color}`}>
              {STADE_CONFIG[mission.stade].label}
            </span>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{mission.type}</span>
            {mission.deadline && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                overdueDeadline ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                urgentDeadline  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                  'bg-zinc-800 text-zinc-400'
              }`}>
                {overdueDeadline ? `En retard ${Math.abs(days!)}j` :
                 days === 0 ? "Aujourd'hui" :
                 `J-${days}`}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-zinc-100 truncate">{mission.sujet}</p>
          <p className="text-xs text-zinc-500 mt-0.5">Commanditaire : {mission.commanditaire}</p>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 mt-1">
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Stade selector */}
      <div className="px-4 pb-3 flex gap-1 flex-wrap">
        {(Object.keys(STADE_CONFIG) as MissionStade[]).map(s => (
          <button
            key={s}
            onClick={() => updateMissionStade(mission.id, s)}
            className={`text-xs px-2 py-0.5 rounded-full transition-all ${
              mission.stade === s
                ? STADE_CONFIG[s].color + ' font-medium'
                : 'text-zinc-600 hover:text-zinc-400 bg-zinc-800/50'
            }`}
          >
            {STADE_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800/60 pt-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Angle retenu</label>
            <textarea
              className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600"
              rows={2}
              value={mission.angleRetenu}
              placeholder="Angle d'analyse retenu..."
              onChange={e => updateMission(mission.id, { angleRetenu: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Sources</label>
            <textarea
              className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600"
              rows={2}
              value={mission.sources}
              placeholder="Sources utilisées..."
              onChange={e => updateMission(mission.id, { sources: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setArchiveOpen(true)}
              className="flex-1 text-xs py-1.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-colors"
            >
              Archiver la mission
            </button>
            <button
              onClick={() => deleteMission(mission.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Archive modal */}
      {archiveOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-zinc-100">Archiver la mission</h3>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Thème juridique</label>
              <input
                className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                value={archiveForm.themeJuridique}
                onChange={e => setArchiveForm(f => ({ ...f, themeJuridique: e.target.value }))}
                placeholder="ex. Droit des contrats, Droit social..."
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Compétence développée</label>
              <input
                className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                value={archiveForm.competenceDeveloppee}
                onChange={e => setArchiveForm(f => ({ ...f, competenceDeveloppee: e.target.value }))}
                placeholder="ex. Rédaction d'un contrat de travail..."
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={archiveForm.reutil}
                onChange={e => setArchiveForm(f => ({ ...f, reutil: e.target.checked }))}
                className="w-4 h-4 rounded accent-blue-500"
              />
              <span className="text-sm text-zinc-300">Réutilisable comme modèle</span>
            </label>
            <div className="flex gap-2 pt-1">
              <button onClick={handleArchive} className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors">
                Archiver
              </button>
              <button onClick={() => setArchiveOpen(false)} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AddMissionModal ──────────────────────────────────────────────────────────

function AddMissionModal({ onClose }: { onClose: () => void }) {
  const { addMission } = useCareerStore()
  const [form, setForm] = useState({
    type: '', sujet: '', commanditaire: '', deadline: '',
    stade: 'briefing' as MissionStade, angleRetenu: '', sources: '',
  })

  const handleSubmit = () => {
    if (!form.sujet.trim()) return
    addMission({ ...form, deadline: form.deadline || null })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="text-base font-semibold text-zinc-100">Nouvelle mission</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Type</label>
            <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              placeholder="Note, Consultation, Contrat…"
              value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Deadline</label>
            <input type="date" className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Sujet *</label>
          <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            placeholder="Sujet de la mission…"
            value={form.sujet} onChange={e => setForm(f => ({ ...f, sujet: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Commanditaire</label>
          <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            placeholder="Associé, collaborateur…"
            value={form.commanditaire} onChange={e => setForm(f => ({ ...f, commanditaire: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Stade initial</label>
          <select className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            value={form.stade} onChange={e => setForm(f => ({ ...f, stade: e.target.value as MissionStade }))}>
            {(Object.keys(STADE_CONFIG) as MissionStade[]).map(s => (
              <option key={s} value={s}>{STADE_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={handleSubmit} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
            Ajouter
          </button>
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── OutilCard ────────────────────────────────────────────────────────────────

function OutilCard({ outil }: { outil: OutilPraticien }) {
  const { updateOutil, deleteOutil } = useCareerStore()
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ titre: outil.titre, lien: outil.lien ?? '', contenu: outil.contenu ?? '', domaine: outil.domaine ?? '' })

  const handleSave = () => {
    updateOutil(outil.id, editForm)
    setEditing(false)
  }

  if (outil.type === 'database') {
    return (
      <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-zinc-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7c0-1.657 3.582-3 8-3s8 1.343 8 3-3.582 3-8 3-8-1.343-8-3zM4 7v5c0 1.657 3.582 3 8 3s8-1.343 8-3V7M4 12v5c0 1.657 3.582 3 8 3s8-1.343 8-3v-5" />
            </svg>
          </span>
          <span className="text-sm font-medium text-zinc-200">{outil.titre}</span>
        </div>
        <div className="flex items-center gap-2">
          {outil.lien && (
            <a href={outil.lien} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              Ouvrir →
            </a>
          )}
          <button onClick={() => deleteOutil(outil.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // Modèle
  const STATUT_CONFIG = {
    brouillon:    { label: 'Brouillon',    color: 'text-zinc-400 bg-zinc-800' },
    valide:       { label: 'Validé',       color: 'text-green-400 bg-green-500/15' },
    a_ameliorer:  { label: 'À améliorer',  color: 'text-amber-400 bg-amber-500/15' },
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {!editing ? (
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-sm font-medium text-zinc-200">{outil.titre}</p>
              {outil.domaine && <p className="text-xs text-zinc-500 mt-0.5">{outil.domaine}</p>}
            </div>
            <div className="flex items-center gap-2">
              {outil.statut && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUT_CONFIG[outil.statut].color}`}>
                  {STATUT_CONFIG[outil.statut].label}
                </span>
              )}
            </div>
          </div>
          {outil.contenu && (
            <p className="text-xs text-zinc-500 line-clamp-2">{outil.contenu}</p>
          )}
          <div className="flex gap-2 mt-3">
            {outil.contenu && (
              <button
                onClick={() => { navigator.clipboard.writeText(outil.contenu!) }}
                className="text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
              >
                Copier
              </button>
            )}
            <button onClick={() => setEditing(true)} className="text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors">
              Modifier
            </button>
            <button onClick={() => deleteOutil(outil.id)} className="text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto">
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            value={editForm.titre} onChange={e => setEditForm(f => ({ ...f, titre: e.target.value }))} placeholder="Titre" />
          <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            value={editForm.domaine} onChange={e => setEditForm(f => ({ ...f, domaine: e.target.value }))} placeholder="Domaine" />
          <textarea className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600"
            rows={4} value={editForm.contenu} onChange={e => setEditForm(f => ({ ...f, contenu: e.target.value }))} placeholder="Contenu du modèle…" />
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors">Sauvegarder</button>
            <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ContactCard ──────────────────────────────────────────────────────────────

function ContactCard({ contact }: { contact: Contact }) {
  const { updateContact, deleteContact } = useCareerStore()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ nom: contact.nom, specialite: contact.specialite, qualite: contact.qualite, note: contact.note })

  const handleSave = () => {
    updateContact(contact.id, form)
    setEditing(false)
  }

  const q = QUALITE_CONFIG[contact.qualite]

  if (editing) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom" />
        <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          value={form.specialite} onChange={e => setForm(f => ({ ...f, specialite: e.target.value }))} placeholder="Spécialité" />
        <select className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          value={form.qualite} onChange={e => setForm(f => ({ ...f, qualite: e.target.value as Contact['qualite'] }))}>
          <option value="ponctuel">Ponctuel</option>
          <option value="bonne_relation">Bonne relation</option>
          <option value="mentor">Mentor</option>
        </select>
        <textarea className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600"
          rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Note libre…" />
        <div className="flex gap-2">
          <button onClick={handleSave} className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors">Sauvegarder</button>
          <button onClick={() => setEditing(false)} className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">Annuler</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{contact.nom}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{contact.specialite}</p>
        </div>
        <span className={`text-xs ${q.color} flex items-center gap-1`}>
          <span>{q.icon}</span>
          <span>{q.label}</span>
        </span>
      </div>
      {contact.note && <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{contact.note}</p>}
      <div className="flex gap-2">
        <button onClick={() => setEditing(true)} className="text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors">
          Modifier
        </button>
        <button onClick={() => deleteContact(contact.id)} className="text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto">
          Supprimer
        </button>
      </div>
    </div>
  )
}

// ─── Main CareerView ──────────────────────────────────────────────────────────

export function CareerView() {
  const store = useCareerStore()
  const [activeSection, setActiveSection] = useState('cabinet')
  const [addMissionOpen, setAddMissionOpen] = useState(false)
  const [archiveFilter, setArchiveFilter] = useState('')
  const [addOutilOpen, setAddOutilOpen] = useState(false)
  const [newOutil, setNewOutil] = useState({ type: 'database' as OutilPraticien['type'], titre: '', lien: '', contenu: '', domaine: '' })
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [newContact, setNewContact] = useState({ nom: '', specialite: '', qualite: 'ponctuel' as Contact['qualite'], note: '' })
  const [addCompetenceOpen, setAddCompetenceOpen] = useState(false)
  const [newCompetenceName, setNewCompetenceName] = useState('')

  const {
    cabinetInfo, statusSemaine, missions, missionsArchives,
    outils, competences, contacts,
    setCabinetInfo, setStatusSemaine, addOutil, addContact, addCompetence, updateCompetenceLevel, deleteCompetence,
  } = store

  const sortedMissions = [...missions].sort((a, b) => {
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })

  const filteredArchives = missionsArchives.filter(a =>
    !archiveFilter || a.themeJuridique.toLowerCase().includes(archiveFilter.toLowerCase())
  )

  const databases = outils.filter(o => o.type === 'database')
  const modeles   = outils.filter(o => o.type === 'modele')

  const prochaineDays = daysUntil(cabinetInfo.prochainePrese)

  const handleAddOutil = () => {
    if (!newOutil.titre.trim()) return
    addOutil({
      type: newOutil.type,
      titre: newOutil.titre,
      lien: newOutil.lien || undefined,
      contenu: newOutil.contenu || undefined,
      domaine: newOutil.domaine || undefined,
    })
    setNewOutil({ type: 'database', titre: '', lien: '', contenu: '', domaine: '' })
    setAddOutilOpen(false)
  }

  const handleAddContact = () => {
    if (!newContact.nom.trim()) return
    addContact(newContact)
    setNewContact({ nom: '', specialite: '', qualite: 'ponctuel', note: '' })
    setAddContactOpen(false)
  }

  const handleAddCompetence = () => {
    if (!newCompetenceName.trim()) return
    addCompetence(newCompetenceName)
    setNewCompetenceName('')
    setAddCompetenceOpen(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sticky nav */}
      <nav className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/50">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto py-2 scrollbar-none">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeSection === s.id
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">

        {/* ── Section 1: Le Cabinet ──────────────────────────────────────────── */}
        {activeSection === 'cabinet' && (
          <section id="cabinet">
            <h2 className="text-xl font-bold text-zinc-100 mb-6">Le Cabinet</h2>

            {/* Status semaine pill */}
            <div className="mb-6 flex gap-2 flex-wrap">
              {(Object.keys(STATUS_CONFIG) as StatusSemaine[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusSemaine(s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    statusSemaine === s
                      ? STATUS_CONFIG[s].color + ' font-semibold'
                      : 'text-zinc-500 border-zinc-700 hover:text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Nom du cabinet</label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  value={cabinetInfo.nom}
                  onChange={e => setCabinetInfo({ nom: e.target.value })}
                  placeholder="Cabinet Dupont & Associés…"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Maître de stage</label>
                <input
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  value={cabinetInfo.maitreStage}
                  onChange={e => setCabinetInfo({ maitreStage: e.target.value })}
                  placeholder="Me. Martin…"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Date de début</label>
                <input
                  type="date"
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  value={cabinetInfo.dateDebut ?? ''}
                  onChange={e => setCabinetInfo({ dateDebut: e.target.value || null })}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Date de fin</label>
                <input
                  type="date"
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                  value={cabinetInfo.dateFin ?? ''}
                  onChange={e => setCabinetInfo({ dateFin: e.target.value || null })}
                />
              </div>
            </div>

            {/* Prochaine présence */}
            <div className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Prochaine présence en cabinet</p>
                <p className="text-sm font-medium text-zinc-200">{fmtDate(cabinetInfo.prochainePrese)}</p>
                {prochaineDays !== null && (
                  <p className={`text-xs mt-0.5 ${prochaineDays <= 1 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {prochaineDays === 0 ? "Aujourd'hui" : prochaineDays > 0 ? `Dans ${prochaineDays} jour${prochaineDays > 1 ? 's' : ''}` : 'Date passée'}
                  </p>
                )}
              </div>
              <input
                type="date"
                className="bg-zinc-800 text-zinc-400 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                value={cabinetInfo.prochainePrese ?? ''}
                onChange={e => setCabinetInfo({ prochainePrese: e.target.value || null })}
              />
            </div>

            {/* Summary stats */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold text-zinc-100">{missions.length}</p>
                <p className="text-xs text-zinc-500 mt-1">Missions actives</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold text-zinc-100">{missionsArchives.length}</p>
                <p className="text-xs text-zinc-500 mt-1">Missions archivées</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-bold text-zinc-100">{competences.filter(c => c.level === 'a_laise').length}</p>
                <p className="text-xs text-zinc-500 mt-1">Compétences maîtrisées</p>
              </div>
            </div>
          </section>
        )}

        {/* ── Section 2: Missions ────────────────────────────────────────────── */}
        {activeSection === 'missions' && (
          <section id="missions">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-100">Missions en cours</h2>
              <button
                onClick={() => setAddMissionOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                <span className="text-base leading-none">+</span>
                Nouvelle mission
              </button>
            </div>

            {sortedMissions.length === 0 ? (
              <div className="text-center py-16 text-zinc-600">
                <p className="text-lg">Aucune mission en cours</p>
                <p className="text-sm mt-1">Ajoutez votre première mission pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedMissions.map(m => <MissionCard key={m.id} mission={m} />)}
              </div>
            )}

            {addMissionOpen && <AddMissionModal onClose={() => setAddMissionOpen(false)} />}
          </section>
        )}

        {/* ── Section 3: Archives ───────────────────────────────────────────── */}
        {activeSection === 'archives' && (
          <section id="archives">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-100">Archives des missions</h2>
              <input
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-600 w-48"
                placeholder="Filtrer par thème…"
                value={archiveFilter}
                onChange={e => setArchiveFilter(e.target.value)}
              />
            </div>

            {filteredArchives.length === 0 ? (
              <div className="text-center py-16 text-zinc-600">
                <p>Aucune archive{archiveFilter ? ' correspondante' : ''}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                      <th className="text-left py-2 pr-4 font-medium">Type</th>
                      <th className="text-left py-2 pr-4 font-medium">Sujet</th>
                      <th className="text-left py-2 pr-4 font-medium">Commanditaire</th>
                      <th className="text-left py-2 pr-4 font-medium">Thème</th>
                      <th className="text-left py-2 pr-4 font-medium">Compétence</th>
                      <th className="text-center py-2 pr-4 font-medium">Réutil.</th>
                      <th className="text-right py-2 font-medium">Archivé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArchives.map(a => (
                      <tr key={a.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                        <td className="py-2.5 pr-4 text-zinc-500 whitespace-nowrap">{a.type}</td>
                        <td className="py-2.5 pr-4 text-zinc-300 max-w-[180px] truncate">{a.sujet}</td>
                        <td className="py-2.5 pr-4 text-zinc-500 whitespace-nowrap">{a.commanditaire}</td>
                        <td className="py-2.5 pr-4">
                          <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{a.themeJuridique}</span>
                        </td>
                        <td className="py-2.5 pr-4 text-zinc-500 max-w-[150px] truncate text-xs">{a.competenceDeveloppee}</td>
                        <td className="py-2.5 pr-4 text-center">
                          {a.reutil ? <span className="text-green-400">✓</span> : <span className="text-zinc-700">—</span>}
                        </td>
                        <td className="py-2.5 text-right text-xs text-zinc-600 whitespace-nowrap">
                          {fmtDate(a.archivedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── Section 4: Boîte à outils ─────────────────────────────────────── */}
        {activeSection === 'outils' && (
          <section id="outils">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-100">Boîte à outils</h2>
              <button
                onClick={() => setAddOutilOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                <span className="text-base leading-none">+</span>
                Ajouter
              </button>
            </div>

            {/* Bases de données */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Bases de données</h3>
              <div className="space-y-2">
                {databases.map(o => <OutilCard key={o.id} outil={o} />)}
                {databases.length === 0 && <p className="text-sm text-zinc-600 py-2">Aucune base de données</p>}
              </div>
            </div>

            {/* Modèles */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">Modèles</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modeles.map(o => <OutilCard key={o.id} outil={o} />)}
                {modeles.length === 0 && <p className="text-sm text-zinc-600 py-2">Aucun modèle</p>}
              </div>
            </div>

            {/* Add outil modal */}
            {addOutilOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4">
                  <h3 className="text-base font-semibold text-zinc-100">Ajouter un outil</h3>
                  <div className="flex gap-2">
                    {(['database', 'modele'] as const).map(t => (
                      <button key={t}
                        onClick={() => setNewOutil(f => ({ ...f, type: t }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                          newOutil.type === t
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        {t === 'database' ? 'Base de données' : 'Modèle'}
                      </button>
                    ))}
                  </div>
                  <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    placeholder="Titre *" value={newOutil.titre} onChange={e => setNewOutil(f => ({ ...f, titre: e.target.value }))} />
                  {newOutil.type === 'database' ? (
                    <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                      placeholder="URL" value={newOutil.lien} onChange={e => setNewOutil(f => ({ ...f, lien: e.target.value }))} />
                  ) : (
                    <>
                      <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                        placeholder="Domaine" value={newOutil.domaine} onChange={e => setNewOutil(f => ({ ...f, domaine: e.target.value }))} />
                      <textarea className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600"
                        rows={4} placeholder="Contenu du modèle…" value={newOutil.contenu} onChange={e => setNewOutil(f => ({ ...f, contenu: e.target.value }))} />
                    </>
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleAddOutil} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">Ajouter</button>
                    <button onClick={() => setAddOutilOpen(false)} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">Annuler</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Section 5: Compétences ───────────────────────────────────────── */}
        {activeSection === 'competences' && (
          <section id="competences">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-100">Radar de compétences</h2>
              <button
                onClick={() => setAddCompetenceOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                <span className="text-base leading-none">+</span>
                Ajouter
              </button>
            </div>

            <div className="space-y-3">
              {competences.map(c => {
                const lvl = LEVEL_CONFIG[c.level]
                const pct = lvl.order === 1 ? 33 : lvl.order === 2 ? 66 : 100
                return (
                  <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-zinc-200">{c.nom}</p>
                      <div className="flex items-center gap-1">
                        {(Object.keys(LEVEL_CONFIG) as CompetenceLevel[]).map(l => (
                          <button key={l} onClick={() => updateCompetenceLevel(c.id, l)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                              c.level === l
                                ? l === 'a_laise'
                                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 font-semibold'
                                  : l === 'pratique'
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 font-semibold'
                                  : 'bg-zinc-700 text-zinc-300 border-zinc-600 font-semibold'
                                : 'text-zinc-600 border-zinc-800 hover:text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            {LEVEL_CONFIG[l].label}
                          </button>
                        ))}
                        <button onClick={() => deleteCompetence(c.id)}
                          className="ml-1 text-zinc-700 hover:text-red-400 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${lvl.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {addCompetenceOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm space-y-4">
                  <h3 className="text-base font-semibold text-zinc-100">Nouvelle compétence</h3>
                  <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                    placeholder="Nom de la compétence…"
                    value={newCompetenceName}
                    onChange={e => setNewCompetenceName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddCompetence()}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAddCompetence} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">Ajouter</button>
                    <button onClick={() => setAddCompetenceOpen(false)} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">Annuler</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Section 6: Contacts ───────────────────────────────────────────── */}
        {activeSection === 'contacts' && (
          <section id="contacts">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-100">Contacts cabinet</h2>
              <button
                onClick={() => setAddContactOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                <span className="text-base leading-none">+</span>
                Ajouter
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="text-center py-16 text-zinc-600">
                <p>Aucun contact enregistré</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {contacts.map(c => <ContactCard key={c.id} contact={c} />)}
              </div>
            )}

            {/* Add contact modal */}
            {addContactOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-4">
                  <h3 className="text-base font-semibold text-zinc-100">Nouveau contact</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Nom *</label>
                      <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                        value={newContact.nom} onChange={e => setNewContact(f => ({ ...f, nom: e.target.value }))} placeholder="Me. Dupont" />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Spécialité</label>
                      <input className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                        value={newContact.specialite} onChange={e => setNewContact(f => ({ ...f, specialite: e.target.value }))} placeholder="Droit social…" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Qualité de la relation</label>
                    <select className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                      value={newContact.qualite} onChange={e => setNewContact(f => ({ ...f, qualite: e.target.value as Contact['qualite'] }))}>
                      <option value="ponctuel">Ponctuel</option>
                      <option value="bonne_relation">Bonne relation</option>
                      <option value="mentor">Mentor</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Note libre</label>
                    <textarea className="w-full bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600"
                      rows={2} value={newContact.note} onChange={e => setNewContact(f => ({ ...f, note: e.target.value }))} placeholder="Conseils, observations…" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAddContact} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">Ajouter</button>
                    <button onClick={() => setAddContactOpen(false)} className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">Annuler</button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  )
}
