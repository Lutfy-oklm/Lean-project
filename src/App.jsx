import React, { useState, useEffect, useCallback } from 'react';
import _ from 'lodash';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ScatterChart, Scatter, Cell
} from 'recharts';
import { ChevronRight, ChevronLeft, Download, RotateCcw } from 'lucide-react';

const uid = () => 'r' + Math.random().toString(36).slice(2, 9);

const STEPS = [
  { id: 0, title: 'Préparer', objectif: "Choisir le périmètre, collecter les documents, identifier les parties prenantes.", livrable: 'Note de cadrage initiale, planning macro.' },
  { id: 1, title: 'Cadrer', objectif: 'Définir le problème, les objectifs, les KPI, le périmètre, les contraintes et les risques.', livrable: 'Charte projet, SIPOC, RACI.' },
  { id: 2, title: 'Observer', objectif: 'Mener entretiens, immersions, shadowing et collecte de données.', livrable: "Guide d'entretien, journal d'observation." },
  { id: 3, title: 'Cartographier', objectif: 'Modéliser le AS-IS en BPMN et/ou VSM, matérialiser acteurs et systèmes.', livrable: 'Cartographie AS-IS, points de douleur.' },
  { id: 4, title: 'Analyser', objectif: 'Qualifier les gaspillages, causes racines, risques, ruptures et goulots.', livrable: 'Pareto, Ishikawa, 5 Pourquoi, AMDEC.' },
  { id: 5, title: 'Prioriser', objectif: 'Classer les problèmes selon impact, effort, risque, urgence et valeur.', livrable: "Matrice impact/effort, backlog d'actions." },
  { id: 6, title: 'Concevoir', objectif: 'Construire la cible TO-BE, les standards, les automatisations, les KPI et les contrôles.', livrable: 'Cartographie cible, business case.' },
  { id: 7, title: 'Déployer', objectif: 'Piloter les actions, conduire le changement, tester, former, migrer.', livrable: "Plan d'action, supports, PV de recette." },
  { id: 8, title: 'Contrôler', objectif: 'Mesurer les gains, installer des rituels, ajuster et maintenir.', livrable: 'Dashboard, plan de contrôle, REX.' },
];

function defaultData() {
  return {
    projectName: 'Optimisation du processus de clôture de compte bancaire',
    validated: { 0: true, 1: true },
    step0: {
      note: "Le processus de clôture de compte bancaire fait l'objet de nombreuses réclamations clients, liées aux délais de traitement (souvent supérieurs à 15 jours ouvrés) et à un manque de visibilité pour le client sur l'avancement de sa demande. Le périmètre pressenti couvre la clôture des comptes courants particuliers, de la demande initiale jusqu'à la restitution du solde et la fermeture définitive dans le système d'information. Sont exclus de ce périmètre les comptes professionnels, les comptes en situation de succession et les clôtures à l'initiative de la banque.",
      planning: [
        { _id: uid(), phase: 'Cadrage', debut: '01/09/2026', fin: '12/09/2026', responsable: 'Chef de projet Lean' },
        { _id: uid(), phase: 'Observation terrain', debut: '15/09/2026', fin: '26/09/2026', responsable: 'Équipe Lean' },
        { _id: uid(), phase: 'Cartographie & diagnostic', debut: '29/09/2026', fin: '17/10/2026', responsable: 'Équipe Lean' },
        { _id: uid(), phase: 'Priorisation & conception cible', debut: '20/10/2026', fin: '31/10/2026', responsable: 'Équipe Lean + Métier' },
        { _id: uid(), phase: 'Déploiement', debut: '03/11/2026', fin: '12/12/2026', responsable: 'Chef de projet + IT' },
        { _id: uid(), phase: 'Pilotage', debut: '15/12/2026', fin: 'Continu', responsable: 'Responsable Back-Office' },
      ],
      parties: [
        { _id: uid(), nom: 'Directeur des Opérations', role: 'Sponsor', service: 'Direction des Opérations', interet: 'Favorable', influence: 'Fort' },
        { _id: uid(), nom: 'Responsable Back-Office', role: 'Pilote métier', service: 'Back-Office Comptes', interet: 'Favorable', influence: 'Fort' },
        { _id: uid(), nom: 'Responsable Conformité', role: 'Contributeur', service: 'Conformité / KYC', interet: 'Neutre', influence: 'Fort' },
        { _id: uid(), nom: 'Responsable IT Core Banking', role: 'Contributeur', service: 'IT', interet: 'Neutre', influence: 'Moyen' },
        { _id: uid(), nom: 'Conseillers clientèle', role: 'Utilisateurs finaux', service: 'Réseau agences', interet: 'Favorable', influence: 'Moyen' },
        { _id: uid(), nom: 'Service Réclamations', role: 'Contributeur', service: 'Relation Client', interet: 'Favorable', influence: 'Faible' },
      ],
    },
    step1: {
      charte: {
        titre: 'Optimisation du processus de clôture de compte bancaire',
        sponsor: 'Directeur des Opérations',
        probleme: "Délai moyen de clôture de compte de 15 jours ouvrés, avec un taux de réclamation de 18% sur le dernier trimestre, principalement lié aux relances manuelles et aux ruptures entre agences, back-office et conformité.",
        objectifs: "Réduire le délai moyen de clôture à 5 jours ouvrés, ramener le taux de réclamation sous 5%, automatiser au moins 60% des contrôles de clôture.",
        perimetreIn: "Comptes courants particuliers, clôture à l'initiative du client, canaux agence et digital.",
        perimetreOut: "Comptes professionnels, comptes en succession, clôtures pour fraude ou décision unilatérale de la banque.",
        contraintes: "Contraintes réglementaires KYC/LCB-FT, système core banking non modifiable avant le prochain trimestre, disponibilité limitée des équipes IT.",
        risques: "Résistance au changement en agence, dépendance à un prestataire IT externe, risque de non-conformité si les contrôles sont accélérés sans garde-fou.",
        budget: '45 000 €',
        dateDebut: '01/09/2026',
        dateFin: '15/12/2026',
        gains: "Réduction du coût de traitement unitaire (environ 12€/dossier), baisse du volume de réclamations, amélioration de la satisfaction client.",
      },
      sipoc: [
        { _id: uid(), supplier: 'Client', input: 'Demande de clôture (agence, digital, courrier)', process: 'Clôturer un compte bancaire', output: 'Compte clôturé, solde restitué', customer: 'Client' },
        { _id: uid(), supplier: 'Conformité', input: 'Contrôles KYC / LCB-FT', process: 'Clôturer un compte bancaire', output: 'Attestation de clôture', customer: 'Réseau agences' },
        { _id: uid(), supplier: 'IT Core Banking', input: 'Accès système de gestion des comptes', process: 'Clôturer un compte bancaire', output: 'Mise à jour du SI', customer: 'Back-office' },
      ],
      raci: {
        roles: ['Conseiller agence', 'Back-office', 'Conformité', 'IT'],
        activites: [
          { _id: uid(), nom: 'Réceptionner la demande de clôture', assign: { 'Conseiller agence': 'R', 'Back-office': 'I', 'Conformité': 'I' } },
          { _id: uid(), nom: 'Vérifier les moyens de paiement en cours', assign: { 'Conseiller agence': 'C', 'Back-office': 'R', 'Conformité': 'A' } },
          { _id: uid(), nom: 'Solder le compte et transférer les fonds', assign: { 'Conseiller agence': 'I', 'Back-office': 'R', 'Conformité': 'C' } },
          { _id: uid(), nom: 'Clôturer le compte dans le SI', assign: { 'Conseiller agence': 'I', 'Back-office': 'A', 'Conformité': 'I', IT: 'R' } },
          { _id: uid(), nom: 'Notifier le client', assign: { 'Conseiller agence': 'R', 'Back-office': 'I' } },
        ],
      },
    },
    step2: {
      questions: [
        { _id: uid(), question: "Quelles sont les étapes que vous suivez lorsqu'un client demande la clôture de son compte ?" },
        { _id: uid(), question: 'Quels sont les points de blocage les plus fréquents dans ce processus ?' },
        { _id: uid(), question: "Combien de temps prend en moyenne le traitement d'une demande, de votre point de vue ?" },
        { _id: uid(), question: 'Quels outils ou systèmes utilisez-vous pour traiter la demande ?' },
        { _id: uid(), question: 'Quels contrôles de conformité effectuez-vous et à quel moment ?' },
        { _id: uid(), question: 'Que se passe-t-il lorsque le client a des moyens de paiement encore actifs (carte, prélèvements) ?' },
        { _id: uid(), question: "Comment le client est-il informé de l'avancement de sa demande ?" },
      ],
      journal: [
        { _id: uid(), date: '16/09/2026', lieu: 'Agence Centre-Ville', observateur: 'Équipe Lean', type: 'Irritant', constat: "Le conseiller doit ressaisir manuellement les informations du client dans 3 systèmes différents faute d'interfaçage." },
        { _id: uid(), date: '17/09/2026', lieu: 'Back-office Comptes', observateur: 'Équipe Lean', type: 'Gaspillage', constat: 'Les dossiers de clôture attendent en moyenne 4 jours avant traitement par manque de priorisation dans la file.' },
        { _id: uid(), date: '18/09/2026', lieu: 'Back-office Comptes', observateur: 'Équipe Lean', type: 'Risque', constat: 'Certains dossiers sont clôturés sans vérification complète des prélèvements en cours, générant des rejets après clôture.' },
        { _id: uid(), date: '19/09/2026', lieu: 'Service Conformité', observateur: 'Équipe Lean', type: 'Bonne pratique', constat: 'Un contrôle KYC systématique est déjà bien standardisé et documenté, à réutiliser comme référence.' },
      ],
    },
    step3: {
      referentiel: [
        { _id: uid(), processus: 'Clôture de compte bancaire', macro: 'Gestion du cycle de vie du compte', niveau: 'N1', proprietaire: 'Responsable Back-Office', systeme: 'Core Banking System' },
        { _id: uid(), processus: 'Vérification des moyens de paiement actifs', macro: 'Gestion du cycle de vie du compte', niveau: 'N2', proprietaire: 'Back-office', systeme: 'Core Banking System' },
        { _id: uid(), processus: 'Contrôle KYC de clôture', macro: 'Conformité', niveau: 'N2', proprietaire: 'Conformité', systeme: 'Outil KYC' },
      ],
      flow: [
        { _id: uid(), label: 'Demande client en agence', type: 'Événement', acteur: 'Client', systeme: '', painpoint: false },
        { _id: uid(), label: 'Saisie de la demande', type: 'Tâche', acteur: 'Conseiller', systeme: 'CRM', painpoint: false },
        { _id: uid(), label: 'Vérification moyens de paiement', type: 'Tâche', acteur: 'Back-office', systeme: 'Core Banking', painpoint: true },
        { _id: uid(), label: 'Contrôle KYC / LCB-FT', type: 'Contrôle', acteur: 'Conformité', systeme: 'Outil KYC', painpoint: false },
        { _id: uid(), label: 'Compte à solder ?', type: 'Décision', acteur: 'Back-office', systeme: '', painpoint: false },
        { _id: uid(), label: 'Transfert du solde', type: 'Tâche', acteur: 'Back-office', systeme: 'Core Banking', painpoint: true },
        { _id: uid(), label: 'Clôture dans le SI', type: 'Tâche', acteur: 'IT / Back-office', systeme: 'Core Banking', painpoint: true },
        { _id: uid(), label: 'Notification client', type: 'Tâche', acteur: 'Conseiller', systeme: 'CRM', painpoint: false },
        { _id: uid(), label: 'Compte clôturé', type: 'Événement', acteur: '', systeme: '', painpoint: false },
      ],
      vsm: [
        { _id: uid(), etape: 'Saisie de la demande', tempsTraitement: 10, tempsAttente: 0 },
        { _id: uid(), etape: 'Vérification moyens de paiement', tempsTraitement: 15, tempsAttente: 2880 },
        { _id: uid(), etape: 'Contrôle KYC', tempsTraitement: 20, tempsAttente: 1440 },
        { _id: uid(), etape: 'Transfert du solde', tempsTraitement: 10, tempsAttente: 1440 },
        { _id: uid(), etape: 'Clôture dans le SI', tempsTraitement: 5, tempsAttente: 720 },
        { _id: uid(), etape: 'Notification client', tempsTraitement: 5, tempsAttente: 0 },
      ],
    },
    step4: {
      pareto: [
        { _id: uid(), cause: 'Attente back-office (file non priorisée)', occurrences: 42 },
        { _id: uid(), cause: 'Moyens de paiement actifs non soldés', occurrences: 27 },
        { _id: uid(), cause: 'Ressaisie manuelle multi-systèmes', occurrences: 18 },
        { _id: uid(), cause: 'Pièces justificatives manquantes', occurrences: 9 },
        { _id: uid(), cause: 'Erreur de saisie initiale', occurrences: 4 },
      ],
      ishikawa: {
        "Main d'œuvre": ['Manque de formation sur les cas complexes', 'Turnover élevé en back-office'],
        'Méthode': ['Absence de priorisation des dossiers', 'Procédure de vérification non standardisée'],
        'Matériel': ["Pas d'interfaçage entre le CRM et le Core Banking"],
        'Milieu': ['Pic de demandes en fin de mois non anticipé'],
        'Matière': ['Dossiers clients incomplets à la réception'],
      },
      fivewhy: {
        probleme: 'Le délai moyen de clôture dépasse 15 jours ouvrés.',
        why1: "Parce que les dossiers attendent plusieurs jours en file d'attente au back-office.",
        why2: "Parce qu'il n'existe pas de règle de priorisation des dossiers.",
        why3: "Parce que tous les dossiers sont traités par ordre d'arrivée, sans distinction de complexité.",
        why4: "Parce qu'aucun outil ne permet de qualifier automatiquement la complexité d'un dossier à la réception.",
        why5: "Parce que le processus n'a jamais été digitalisé ni doté de règles de gestion automatisées.",
        causeRacine: "Absence de règles de priorisation et d'outil de qualification automatique des dossiers à l'entrée du back-office.",
        action: 'Mettre en place une règle de priorisation automatique (dossier simple vs complexe) dès la réception de la demande.',
      },
      amdec: [
        { _id: uid(), mode: 'Clôture sans vérification complète des prélèvements', effet: 'Rejet de prélèvement après clôture, réclamation client', cause: 'Absence de check-list obligatoire', F: 6, G: 7, D: 5, actions: 'Ajouter un contrôle bloquant avant validation de clôture' },
        { _id: uid(), mode: 'Ressaisie manuelle erronée', effet: 'Erreur sur le solde transféré', cause: "Absence d'interfaçage CRM / Core Banking", F: 4, G: 8, D: 4, actions: "Prioriser l'interfaçage dans la roadmap IT" },
        { _id: uid(), mode: 'Non-conformité KYC', effet: 'Sanction réglementaire potentielle', cause: 'Contrôle KYC réalisé trop tardivement', F: 2, G: 9, D: 3, actions: 'Avancer le contrôle KYC en tout début de parcours' },
      ],
    },
    step5: {
      actions: [
        { _id: uid(), action: 'Mettre en place une règle de priorisation automatique des dossiers', impact: 9, effort: 4, responsable: 'Back-office / IT', echeance: '31/10/2026', statut: 'À faire' },
        { _id: uid(), action: 'Ajouter un contrôle bloquant sur les moyens de paiement actifs', impact: 8, effort: 3, responsable: 'Back-office', echeance: '15/10/2026', statut: 'À faire' },
        { _id: uid(), action: 'Avancer le contrôle KYC en début de parcours', impact: 7, effort: 2, responsable: 'Conformité', echeance: '10/10/2026', statut: 'En cours' },
        { _id: uid(), action: 'Interfacer le CRM et le Core Banking', impact: 9, effort: 9, responsable: 'IT', echeance: '28/02/2027', statut: 'À faire' },
        { _id: uid(), action: 'Créer un statut de suivi visible par le client', impact: 6, effort: 5, responsable: 'Digital / IT', echeance: '15/12/2026', statut: 'À faire' },
      ],
    },
    step6: {
      flow: [
        { _id: uid(), label: 'Demande client (agence ou digital)', type: 'Événement', acteur: 'Client', systeme: 'App / CRM', painpoint: false },
        { _id: uid(), label: 'Qualification auto de la complexité', type: 'Tâche', acteur: 'Système', systeme: 'CRM', painpoint: false },
        { _id: uid(), label: 'Contrôle KYC anticipé', type: 'Contrôle', acteur: 'Conformité', systeme: 'Outil KYC', painpoint: false },
        { _id: uid(), label: 'Vérification auto des moyens de paiement', type: 'Tâche', acteur: 'Système', systeme: 'Core Banking', painpoint: false },
        { _id: uid(), label: 'Traitement priorisé back-office', type: 'Tâche', acteur: 'Back-office', systeme: 'Core Banking', painpoint: false },
        { _id: uid(), label: 'Clôture automatisée dans le SI', type: 'Tâche', acteur: 'Système', systeme: 'Core Banking', painpoint: false },
        { _id: uid(), label: 'Notification client en temps réel', type: 'Tâche', acteur: 'Système', systeme: 'App / CRM', painpoint: false },
        { _id: uid(), label: 'Compte clôturé', type: 'Événement', acteur: '', systeme: '', painpoint: false },
      ],
      businessCase: {
        gains: 96000,
        couts: 45000,
        risques: "Dépendance à la disponibilité de l'équipe IT pour l'interfaçage CRM / Core Banking ; nécessité de valider le nouveau parcours avec la Conformité avant généralisation.",
      },
      roadmap: [
        { _id: uid(), phase: 'Spécification des règles de priorisation', debut: '03/11/2026', fin: '14/11/2026', responsable: 'Back-office / IT', livrable: 'Cahier des charges' },
        { _id: uid(), phase: 'Développement des contrôles bloquants', debut: '17/11/2026', fin: '28/11/2026', responsable: 'IT', livrable: 'Contrôles en environnement de test' },
        { _id: uid(), phase: 'Recette utilisateurs', debut: '01/12/2026', fin: '05/12/2026', responsable: 'Back-office / Conformité', livrable: 'PV de recette' },
        { _id: uid(), phase: 'Déploiement pilote (2 agences)', debut: '08/12/2026', fin: '12/12/2026', responsable: 'Chef de projet', livrable: 'Retour pilote' },
        { _id: uid(), phase: 'Généralisation', debut: '15/12/2026', fin: '31/12/2026', responsable: 'Chef de projet', livrable: 'Déploiement national' },
      ],
    },
    step7: {
      plan: [
        { _id: uid(), action: 'Former les conseillers agence au nouveau parcours', responsable: 'Formation Réseau', echeance: '05/12/2026', statut: 'À faire' },
        { _id: uid(), action: 'Communiquer le nouveau délai cible aux équipes', responsable: 'Responsable Back-Office', echeance: '01/12/2026', statut: 'À faire' },
        { _id: uid(), action: 'Déployer le contrôle bloquant en production', responsable: 'IT', echeance: '12/12/2026', statut: 'À faire' },
        { _id: uid(), action: 'Suivre le pilote sur 2 agences', responsable: 'Chef de projet', echeance: '12/12/2026', statut: 'À faire' },
      ],
      changement: [
        { _id: uid(), item: 'Communiquer sur les objectifs et les gains attendus auprès des agences', done: false },
        { _id: uid(), item: 'Former les conseillers et le back-office au nouveau parcours', done: false },
        { _id: uid(), item: 'Réaliser un pilote sur 2 agences avant généralisation', done: false },
        { _id: uid(), item: "Généraliser à l'ensemble du réseau", done: false },
      ],
      recette: "Recette réalisée sur 20 dossiers tests avec le back-office et la conformité. Constat : contrôle bloquant fonctionnel, délai moyen mesuré à 4,8 jours sur l'échantillon test. Validé par : Responsable Back-Office et Responsable Conformité. Réserve mineure : ajuster le message de notification client sur mobile.",
    },
    step8: {
      kpis: [
        { _id: uid(), nom: 'Délai moyen de clôture', unite: 'jours', cible: 5, actuel: 8, frequence: 'Hebdomadaire' },
        { _id: uid(), nom: 'Taux de réclamation clôture', unite: '%', cible: 5, actuel: 11, frequence: 'Mensuel' },
        { _id: uid(), nom: 'Taux de dossiers priorisés automatiquement', unite: '%', cible: 80, actuel: 55, frequence: 'Hebdomadaire' },
        { _id: uid(), nom: 'Taux de rejets post-clôture', unite: '%', cible: 1, actuel: 3, frequence: 'Mensuel' },
      ],
      rituels: [
        { _id: uid(), nom: 'Point hebdomadaire performance back-office', frequence: 'Hebdomadaire', participants: 'Back-office, Responsable Back-Office', objet: 'Suivi des KPI délai et volumes' },
        { _id: uid(), nom: 'Comité de pilotage transformation', frequence: 'Mensuel', participants: 'Sponsor, Chef de projet, Conformité, IT', objet: 'Suivi de la roadmap et des risques' },
        { _id: uid(), nom: 'Revue qualité conformité', frequence: 'Mensuel', participants: 'Conformité, Back-office', objet: 'Contrôle des dossiers clôturés' },
      ],
      controle: [
        { _id: uid(), point: 'Vérification moyens de paiement avant clôture', frequence: 'Systématique', responsable: 'Back-office', seuil: '0 exception tolérée' },
        { _id: uid(), point: 'Délai moyen de traitement', frequence: 'Hebdomadaire', responsable: 'Responsable Back-Office', seuil: 'Alerte si > 6 jours' },
        { _id: uid(), point: 'Taux de réclamation', frequence: 'Mensuel', responsable: 'Relation Client', seuil: 'Alerte si > 7%' },
      ],
      rex: "Les premiers résultats du pilote montrent une réduction du délai de 15 à 8 jours en moyenne, avec un potentiel de gain supplémentaire une fois l'interfaçage CRM / Core Banking finalisé. Principale difficulté : l'appropriation de la nouvelle règle de priorisation par les équipes back-office. Action d'amélioration : renforcer le coaching terrain les deux premières semaines post-déploiement.",
    },
  };
}

function roiText(bc) {
  const gains = Number(bc.gains) || 0;
  const couts = Number(bc.couts) || 0;
  if (gains <= 0) return '—';
  const months = Math.round((couts / gains) * 12 * 10) / 10;
  return `${months} mois`;
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function SubTitle({ children }) {
  return <h3 className="sub-title">{children}</h3>;
}

function EditableTable({ columns, rows, onAdd, onRemove, onChange, addLabel }) {
  return (
    <div className="ledger-table-wrap">
      <table className="ledger-table">
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
            <th style={{ width: 32 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row._id}>
              {columns.map(c => (
                <td key={c.key}>
                  {c.type === 'select' ? (
                    <select value={row[c.key] || ''} onChange={e => onChange(ri, c.key, e.target.value)}>
                      <option value="">—</option>
                      {c.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : c.type === 'number' ? (
                    <input type="number" min={c.min} max={c.max} value={row[c.key] ?? ''} onChange={e => onChange(ri, c.key, e.target.value)} />
                  ) : c.type === 'textarea' ? (
                    <textarea rows={2} value={row[c.key] || ''} onChange={e => onChange(ri, c.key, e.target.value)} />
                  ) : (
                    <input type="text" value={row[c.key] || ''} onChange={e => onChange(ri, c.key, e.target.value)} />
                  )}
                </td>
              ))}
              <td><button className="row-del" onClick={() => onRemove(ri)} title="Supprimer la ligne">×</button></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td className="empty-row" colSpan={columns.length + 1}>Aucune ligne — utilisez le bouton ci-dessous pour commencer.</td></tr>
          )}
        </tbody>
      </table>
      <button className="btn-add" onClick={onAdd}>+ {addLabel || 'Ajouter une ligne'}</button>
    </div>
  );
}

function RaciMatrix({ path, data, updateField }) {
  const d = data || { roles: [], activites: [] };
  const roles = d.roles || [];
  const activites = d.activites || [];
  const [newRole, setNewRole] = useState('');
  const cycle = ['', 'R', 'A', 'C', 'I'];

  const addRole = () => {
    if (!newRole.trim()) return;
    updateField(`${path}.roles`, [...roles, newRole.trim()]);
    setNewRole('');
  };
  const addActivite = () => updateField(`${path}.activites`, [...activites, { _id: uid(), nom: '', assign: {} }]);
  const removeRole = (ri) => {
    const roleName = roles[ri];
    updateField(`${path}.roles`, roles.filter((_r, i) => i !== ri));
    updateField(`${path}.activites`, activites.map(a => {
      const na = { ...a };
      if (na.assign) { na.assign = { ...na.assign }; delete na.assign[roleName]; }
      return na;
    }));
  };
  const removeActivite = (ai) => updateField(`${path}.activites`, activites.filter((_a, i) => i !== ai));
  const cycleCell = (ai, role) => {
    const act = activites[ai];
    const cur = (act.assign && act.assign[role]) || '';
    const idx = cycle.indexOf(cur);
    const next = cycle[(idx + 1) % cycle.length];
    updateField(`${path}.activites[${ai}].assign`, { ...(act.assign || {}), [role]: next });
  };

  return (
    <div className="raci-wrap">
      <table className="ledger-table raci-table">
        <thead>
          <tr>
            <th>Activité</th>
            {roles.map((r, ri) => <th key={r}>{r} <button className="role-del" onClick={() => removeRole(ri)}>×</button></th>)}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {activites.map((a, ai) => (
            <tr key={a._id}>
              <td><input value={a.nom} onChange={e => updateField(`${path}.activites[${ai}].nom`, e.target.value)} /></td>
              {roles.map(role => {
                const v = (a.assign && a.assign[role]) || '';
                return <td key={role} className={`raci-cell raci-${v || 'none'}`} onClick={() => cycleCell(ai, role)}>{v}</td>;
              })}
              <td><button className="row-del" onClick={() => removeActivite(ai)}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="raci-controls">
        <button className="btn-add" onClick={addActivite}>+ activité</button>
        <input placeholder="Nom du rôle (ex : Chef de projet)" value={newRole} onChange={e => setNewRole(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRole()} />
        <button className="btn-add" onClick={addRole}>+ rôle</button>
      </div>
      <p className="hint-text">Cliquez sur une cellule pour faire défiler R (Responsable) → A (Approbateur) → C (Consulté) → I (Informé).</p>
    </div>
  );
}

function FlowBuilder({ path, data, updateField, addRow, removeRow }) {
  const steps = data || [];
  const shapeOf = { 'Tâche': 'rect', 'Décision': 'diamond', 'Événement': 'circle', 'Contrôle': 'ctrl' };
  return (
    <div>
      <EditableTable
        columns={[
          { key: 'label', label: 'Étape / activité' },
          { key: 'type', label: 'Type', type: 'select', options: ['Tâche', 'Décision', 'Événement', 'Contrôle'] },
          { key: 'acteur', label: 'Acteur' },
          { key: 'systeme', label: 'Système' },
        ]}
        rows={steps}
        onAdd={() => addRow(path, { label: '', type: 'Tâche', acteur: '', systeme: '', painpoint: false })}
        onRemove={(i) => removeRow(path, i)}
        onChange={(i, k, v) => updateField(`${path}[${i}].${k}`, v)}
        addLabel="Ajouter une étape au processus"
      />
      <div className="flow-viz">
        {steps.map((s, i) => (
          <React.Fragment key={s._id}>
            <div
              className={`flow-node shape-${shapeOf[s.type] || 'rect'} ${s.painpoint ? 'is-pain' : ''}`}
              onClick={() => updateField(`${path}[${i}].painpoint`, !s.painpoint)}
              title="Cliquer pour marquer / démarquer comme point de douleur"
            >
              <span className="flow-node-label">{s.label || `Étape ${i + 1}`}</span>
              {s.painpoint && <span className="flow-pain-badge">⚠</span>}
            </div>
            {i < steps.length - 1 && <span className="flow-arrow">→</span>}
          </React.Fragment>
        ))}
        {steps.length === 0 && <div className="empty-hint">Ajoutez des étapes ci-dessus pour visualiser le flux du processus.</div>}
      </div>
      {steps.some(s => s.painpoint) && (
        <div className="pain-callout">
          <strong>Points de douleur identifiés</strong>
          <ul>{steps.filter(s => s.painpoint).map(s => <li key={s._id}>{s.label || 'Étape sans nom'}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

function Ishikawa({ path, data, updateField }) {
  const branches = ["Main d'œuvre", 'Méthode', 'Matériel', 'Milieu', 'Matière'];
  const d = data || {};
  return (
    <div className="ishikawa-wrap">
      <div className="ishikawa-spine">
        <span className="spine-caption">CAUSES</span>
        <div className="spine-line" />
        <div className="ishikawa-problem">EFFET / PROBLÈME</div>
      </div>
      <div className="ishikawa-grid">
        {branches.map((b) => {
          const causes = d[b] || [];
          return (
            <div key={b} className="ishikawa-branch">
              <div className="branch-title">{b}</div>
              <ul className="branch-causes">
                {causes.map((c, ci) => (
                  <li key={ci}>
                    <input value={c} onChange={e => {
                      const arr = [...causes]; arr[ci] = e.target.value;
                      updateField(`${path}.${b}`, arr);
                    }} />
                    <button onClick={() => updateField(`${path}.${b}`, causes.filter((_c, x) => x !== ci))}>×</button>
                  </li>
                ))}
              </ul>
              <button className="btn-add-mini" onClick={() => updateField(`${path}.${b}`, [...causes, ''])}>+ cause</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FiveWhys({ path, data, updateField }) {
  const d = data || {};
  return (
    <div className="fivewhy">
      <Field label="Problème observé">
        <textarea rows={2} value={d.probleme || ''} onChange={e => updateField(`${path}.probleme`, e.target.value)} />
      </Field>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} className="why-row">
          <span className="why-num">Pourquoi n°{n} ?</span>
          <input value={d[`why${n}`] || ''} onChange={e => updateField(`${path}.why${n}`, e.target.value)} />
        </div>
      ))}
      <Field label="Cause racine actionnable">
        <textarea rows={2} className="root-cause" value={d.causeRacine || ''} onChange={e => updateField(`${path}.causeRacine`, e.target.value)} />
      </Field>
      <Field label="Action corrective proposée">
        <input value={d.action || ''} onChange={e => updateField(`${path}.action`, e.target.value)} />
      </Field>
    </div>
  );
}

function AmdecTable({ rows, addRow, removeRow, updateField }) {
  return (
    <div className="ledger-table-wrap">
      <table className="ledger-table">
        <thead>
          <tr><th>Mode de défaillance</th><th>Effet</th><th>Cause</th><th>F</th><th>G</th><th>D</th><th>Criticité</th><th>Actions</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => {
            const F = Number(r.F) || 0, G = Number(r.G) || 0, D = Number(r.D) || 0;
            const crit = F * G * D;
            const color = crit > 250 ? '#A23B2E' : crit >= 100 ? '#C97D2E' : '#2F6F63';
            return (
              <tr key={r._id}>
                <td><input value={r.mode || ''} onChange={e => updateField(`step4.amdec[${ri}].mode`, e.target.value)} /></td>
                <td><input value={r.effet || ''} onChange={e => updateField(`step4.amdec[${ri}].effet`, e.target.value)} /></td>
                <td><input value={r.cause || ''} onChange={e => updateField(`step4.amdec[${ri}].cause`, e.target.value)} /></td>
                <td><input type="number" min={1} max={10} value={r.F || ''} onChange={e => updateField(`step4.amdec[${ri}].F`, e.target.value)} /></td>
                <td><input type="number" min={1} max={10} value={r.G || ''} onChange={e => updateField(`step4.amdec[${ri}].G`, e.target.value)} /></td>
                <td><input type="number" min={1} max={10} value={r.D || ''} onChange={e => updateField(`step4.amdec[${ri}].D`, e.target.value)} /></td>
                <td><span className="crit-badge" style={{ background: color }}>{crit}</span></td>
                <td><input value={r.actions || ''} onChange={e => updateField(`step4.amdec[${ri}].actions`, e.target.value)} /></td>
                <td><button className="row-del" onClick={() => removeRow('step4.amdec', ri)}>×</button></td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td className="empty-row" colSpan={9}>Aucun mode de défaillance recensé.</td></tr>}
        </tbody>
      </table>
      <button className="btn-add" onClick={() => addRow('step4.amdec', { mode: '', effet: '', cause: '', F: '', G: '', D: '', actions: '' })}>+ Ajouter un mode de défaillance</button>
    </div>
  );
}

function ParetoChart({ rows }) {
  const sorted = [...rows].filter(r => r.cause).sort((a, b) => (Number(b.occurrences) || 0) - (Number(a.occurrences) || 0));
  const total = sorted.reduce((s, r) => s + (Number(r.occurrences) || 0), 0) || 1;
  let cum = 0;
  const chartData = sorted.map(r => {
    cum += Number(r.occurrences) || 0;
    return { cause: r.cause, occurrences: Number(r.occurrences) || 0, cumule: Math.round((cum / total) * 1000) / 10 };
  });
  if (chartData.length === 0) return <div className="empty-hint">Ajoutez des causes et leurs occurrences pour générer le diagramme de Pareto.</div>;
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 70 }}>
          <CartesianGrid stroke="#D8D2C4" strokeDasharray="3 3" />
          <XAxis dataKey="cause" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} />
          <Tooltip />
          <ReferenceLine yAxisId="right" y={80} stroke="#C97D2E" strokeDasharray="4 4" label={{ value: '80%', fontSize: 11, fill: '#C97D2E' }} />
          <Bar yAxisId="left" dataKey="occurrences" name="Occurrences" fill="#2F6F63" radius={[3, 3, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="cumule" name="Cumul %" stroke="#10233F" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ImpactEffortChart({ rows }) {
  const data = rows.filter(r => r.action).map(r => ({ ...r, impact: Number(r.impact) || 0, effort: Number(r.effort) || 0 }));
  if (data.length === 0) return <div className="empty-hint">Ajoutez des actions avec un impact et un effort pour visualiser la matrice.</div>;
  const quadColor = (d) => (d.impact >= 5 && d.effort < 5) ? '#2F6F63' : (d.impact >= 5 && d.effort >= 5) ? '#10233F' : (d.impact < 5 && d.effort < 5) ? '#9C9576' : '#C97D2E';
  return (
    <div style={{ width: '100%', height: 340, position: 'relative' }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid stroke="#D8D2C4" />
          <XAxis type="number" dataKey="effort" name="Effort" domain={[0, 10]} tickCount={6} label={{ value: 'Effort →', position: 'insideBottom', offset: -10 }} />
          <YAxis type="number" dataKey="impact" name="Impact" domain={[0, 10]} tickCount={6} label={{ value: 'Impact →', angle: -90, position: 'insideLeft' }} />
          <ReferenceLine x={5} stroke="#10233F" strokeDasharray="3 3" />
          <ReferenceLine y={5} stroke="#10233F" strokeDasharray="3 3" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => (active && payload && payload[0]) ? <div className="scatter-tooltip">{payload[0].payload.action}</div> : null} />
          <Scatter data={data}>
            {data.map((d, i) => <Cell key={i} fill={quadColor(d)} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="quadrant-labels">
        <span className="q-label q-tl">Quick wins</span>
        <span className="q-label q-tr">Projets majeurs</span>
        <span className="q-label q-bl">Secondaire</span>
        <span className="q-label q-br">À éviter</span>
      </div>
    </div>
  );
}

function KpiCard({ k }) {
  const cible = Number(k.cible) || 0;
  const actuel = Number(k.actuel) || 0;
  const ratio = cible > 0 ? Math.round((actuel / cible) * 100) : 0;
  const color = ratio >= 95 ? '#2F6F63' : ratio >= 70 ? '#C97D2E' : '#A23B2E';
  return (
    <div className="kpi-card">
      <div className="kpi-name">{k.nom || 'KPI sans nom'}</div>
      <div className="kpi-values">
        <span className="kpi-actual" style={{ color }}>{k.actuel || 0}</span>
        <span className="kpi-unit">{k.unite}</span>
        <span className="kpi-target">/ cible {k.cible || 0} {k.unite}</span>
      </div>
      <div className="kpi-gauge"><div className="kpi-gauge-fill" style={{ width: `${Math.min(100, Math.max(0, ratio))}%`, background: color }} /></div>
      <div className="kpi-freq">{k.frequence}</div>
    </div>
  );
}

function ToolGuide() {
  const [open, setOpen] = useState(false);
  const rows = [
    ['Clarifier un problème flou', 'QQOQCCP', 'Problème formulé clairement'],
    ['Trouver la cause racine', '5 Pourquoi', 'Cause actionnable'],
    ['Structurer des causes multiples', 'Ishikawa 5M', 'Carte structurée des causes'],
    ['Prioriser des causes / défauts', 'Pareto', 'Top causes à traiter (règle des 80/20)'],
    ['Évaluer un risque opérationnel', 'AMDEC', 'Criticité et actions préventives'],
    ['Choisir entre plusieurs solutions', 'Impact / Effort', 'Roadmap réaliste'],
    ['Résoudre un problème complexe', '8D', 'Plan de résolution complet'],
    ['Ancrer une amélioration continue', 'PDCA', 'Cycle test-apprentissage'],
  ];
  return (
    <div className="tool-guide">
      <button className="toolguide-toggle" onClick={() => setOpen(o => !o)}>{open ? '▾' : '▸'} Quel outil choisir ?</button>
      {open && (
        <table className="ledger-table">
          <thead><tr><th>Besoin</th><th>Outil recommandé</th><th>Résultat attendu</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, ci) => <td key={ci}>{c}</td>)}</tr>)}</tbody>
        </table>
      )}
    </div>
  );
}

const CSS = `
.lean-app{ --ink:#10233F; --ink-soft:#4A5A72; --paper:#F6F4EE; --paper-2:#FBFAF6; --line:#D8D2C4; --teal:#2F6F63; --amber:#C97D2E; --red:#A23B2E; --font-display:'Iowan Old Style','Palatino Linotype','Book Antiqua',Georgia,serif; --font-body:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif; --font-mono:'IBM Plex Mono','SF Mono',Consolas,monospace;
  display:flex; min-height:640px; max-height:900px; background:var(--paper); color:var(--ink); font-family:var(--font-body); border:1px solid var(--line); border-radius:4px; overflow:hidden; }
.lean-app *{ box-sizing:border-box; }
.lean-app button{ font-family:var(--font-body); cursor:pointer; }
.lean-app input,.lean-app select,.lean-app textarea{ font-family:var(--font-body); font-size:13px; color:var(--ink); background:transparent; border:none; border-bottom:1px solid var(--line); padding:5px 2px; width:100%; outline-offset:2px; }
.lean-app input:focus-visible,.lean-app select:focus-visible,.lean-app textarea:focus-visible,.lean-app button:focus-visible{ outline:2px solid var(--teal); }
.lean-app textarea{ border:1px solid var(--line); border-radius:2px; padding:8px; resize:vertical; }

.sidebar{ width:250px; min-width:250px; background:var(--ink); color:#EDEAE0; display:flex; flex-direction:column; }
.sidebar-head{ padding:22px 18px 16px; border-bottom:1px solid rgba(255,255,255,0.12); }
.sidebar-eyebrow{ font-family:var(--font-mono); font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#8FA6C4; }
.sidebar-head h1{ font-family:var(--font-display); font-size:22px; margin:4px 0 12px; font-weight:600; letter-spacing:.01em; }
.project-name{ width:100%; background:rgba(255,255,255,0.06)!important; border:1px solid rgba(255,255,255,0.18)!important; border-radius:2px; padding:7px 8px!important; color:#fff!important; font-size:12.5px!important; margin-bottom:12px; }
.project-name::placeholder{ color:#8FA6C4; }
.progress-line{ height:4px; background:rgba(255,255,255,0.12); border-radius:2px; overflow:hidden; }
.progress-fill{ height:100%; background:var(--teal); transition:width .3s ease; }
.progress-text{ font-family:var(--font-mono); font-size:10.5px; color:#8FA6C4; margin-top:6px; }

.steps-nav{ flex:1; overflow-y:auto; padding:6px 0; }
.step-item{ width:100%; display:flex; align-items:center; gap:10px; background:none; border:none; border-left:3px solid transparent; padding:10px 16px; color:#C7CEDB; text-align:left; position:relative; }
.step-item:hover{ background:rgba(255,255,255,0.05); }
.step-item.is-active{ background:rgba(255,255,255,0.08); border-left-color:var(--teal); color:#fff; }
.step-num{ font-family:var(--font-mono); font-size:13px; color:#6E85A6; min-width:22px; }
.step-item.is-active .step-num{ color:var(--teal); }
.step-title{ font-size:12.5px; letter-spacing:.01em; }
.step-stamp{ margin-left:auto; color:var(--teal); font-size:13px; transform:rotate(-10deg); font-weight:700; }

.sidebar-foot{ padding:14px 16px 18px; border-top:1px solid rgba(255,255,255,0.12); display:flex; flex-direction:column; gap:8px; }
.ghost-btn{ display:flex; align-items:center; gap:6px; background:none; border:1px solid rgba(255,255,255,0.25); color:#DCE2EC; font-size:11.5px; padding:7px 10px; border-radius:2px; }
.ghost-btn:hover{ border-color:var(--teal); color:#fff; }
.ghost-btn.danger:hover{ border-color:var(--red); }
.save-indicator{ font-family:var(--font-mono); font-size:10px; color:#6E85A6; margin-top:2px; }
.pdf-hint{ font-size:10.5px; color:#8FA6C4; line-height:1.4; margin-top:2px; }

.main{ flex:1; overflow-y:auto; padding:32px 40px 60px; }
.dossier-card{ max-width:900px; margin:0 auto; }
.eyebrow{ font-family:var(--font-mono); font-size:10.5px; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-soft); border-bottom:1px solid var(--line); padding-bottom:10px; margin-bottom:14px; }
.dossier-card h2{ font-family:var(--font-display); font-size:30px; margin:0 0 10px; }
.objectif,.livrable{ font-size:13.5px; color:var(--ink-soft); margin:2px 0; line-height:1.55; }
.objectif em,.livrable em{ font-style:normal; font-family:var(--font-mono); font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:var(--ink); margin-right:6px; }
.step-body{ margin-top:26px; display:flex; flex-direction:column; gap:8px; }

.sub-title{ font-family:var(--font-display); font-size:17px; margin:22px 0 8px; padding-top:16px; border-top:1px solid var(--line); }
.field{ margin-bottom:12px; }
.field label{ display:block; font-family:var(--font-mono); font-size:10.5px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-soft); margin-bottom:4px; }
.charte-grid{ display:grid; grid-template-columns:1fr 1fr; gap:4px 24px; }

.ledger-table-wrap{ overflow-x:auto; }
.ledger-table{ width:100%; border-collapse:collapse; font-size:12.5px; margin-bottom:8px; }
.ledger-table th{ text-align:left; font-family:var(--font-mono); font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-soft); border-bottom:1.5px solid var(--ink); padding:6px 8px; white-space:nowrap; }
.ledger-table td{ border-bottom:1px solid var(--line); padding:4px 8px; vertical-align:top; }
.ledger-table tr:hover td{ background:rgba(47,111,99,0.04); }
.empty-row{ text-align:center; color:var(--ink-soft); font-style:italic; padding:16px!important; }
.row-del{ background:none; border:none; color:var(--ink-soft); font-size:16px; line-height:1; padding:2px 6px; }
.row-del:hover{ color:var(--red); }
.btn-add{ background:none; border:1px dashed var(--teal); color:var(--teal); font-size:12px; padding:7px 12px; border-radius:2px; margin-top:4px; }
.btn-add:hover{ background:rgba(47,111,99,0.08); }
.btn-add-mini{ background:none; border:none; color:var(--teal); font-size:11px; padding:2px 0; }

.raci-controls{ display:flex; align-items:center; gap:10px; margin:6px 0; }
.raci-controls input{ max-width:220px; }
.role-del{ background:none; border:none; color:#9aa9bd; font-size:11px; }
.raci-cell{ text-align:center; cursor:pointer; font-family:var(--font-mono); font-weight:700; width:34px; }
.raci-none{ color:var(--line); }
.raci-R{ color:#fff; background:var(--teal); }
.raci-A{ color:#fff; background:var(--ink); }
.raci-C{ color:#fff; background:var(--amber); }
.raci-I{ color:var(--ink); background:#E7E2D2; }
.hint-text{ font-size:11.5px; color:var(--ink-soft); font-style:italic; }

.flow-viz{ display:flex; align-items:center; flex-wrap:wrap; gap:2px; padding:20px 4px; }
.flow-node{ min-width:110px; max-width:150px; padding:10px 14px; border:1.5px solid var(--ink); background:var(--paper-2); font-size:12px; cursor:pointer; text-align:center; position:relative; }
.flow-node:hover{ border-color:var(--teal); }
.shape-diamond{ clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%); padding:26px 20px; }
.shape-circle{ border-radius:50%; width:92px; height:92px; display:flex; align-items:center; justify-content:center; min-width:92px; }
.shape-ctrl{ border-style:dashed; border-color:var(--amber); }
.is-pain{ border-color:var(--amber)!important; box-shadow:0 0 0 3px rgba(201,125,46,0.16); }
.flow-pain-badge{ position:absolute; top:-8px; right:-8px; background:var(--amber); color:#fff; border-radius:50%; width:18px; height:18px; font-size:11px; display:flex; align-items:center; justify-content:center; }
.flow-arrow{ color:var(--ink-soft); font-size:16px; padding:0 2px; }
.pain-callout{ background:rgba(201,125,46,0.08); border-left:3px solid var(--amber); padding:10px 14px; font-size:12.5px; margin-top:6px; }
.pain-callout ul{ margin:6px 0 0 18px; }

.ishikawa-wrap{ padding:10px 0 4px; }
.ishikawa-spine{ position:relative; display:flex; align-items:center; height:34px; }
.spine-caption{ font-family:var(--font-mono); font-size:10px; color:var(--ink-soft); letter-spacing:.08em; }
.spine-line{ flex:1; height:2px; background:var(--ink); margin:0 10px; }
.ishikawa-problem{ font-family:var(--font-mono); font-size:11px; background:var(--ink); color:#fff; padding:8px 12px; white-space:nowrap; }
.ishikawa-grid{ display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-top:4px; }
.ishikawa-branch{ border-top:3px solid var(--teal); padding-top:8px; }
.branch-title{ font-family:var(--font-mono); font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--ink); margin-bottom:6px; }
.branch-causes{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:3px; }
.branch-causes li{ display:flex; align-items:center; gap:2px; }
.branch-causes input{ font-size:11.5px; padding:3px 2px; }
.branch-causes button{ background:none; border:none; color:var(--ink-soft); font-size:13px; }

.fivewhy{ background:var(--paper-2); border:1px solid var(--line); padding:16px; border-radius:2px; }
.why-row{ display:flex; align-items:center; gap:12px; margin-bottom:8px; }
.why-num{ font-family:var(--font-mono); font-size:11px; min-width:90px; color:var(--ink-soft); }
.root-cause{ background:rgba(47,111,99,0.06)!important; border-color:var(--teal)!important; }

.crit-badge{ display:inline-block; min-width:34px; text-align:center; color:#fff; font-family:var(--font-mono); font-size:12px; padding:2px 6px; border-radius:2px; }

.vsm-summary{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:10px; }
.vsm-summary div{ background:var(--paper-2); border:1px solid var(--line); padding:10px 12px; }
.vsm-summary span{ display:block; font-family:var(--font-mono); font-size:9.5px; text-transform:uppercase; letter-spacing:.05em; color:var(--ink-soft); }
.vsm-summary strong{ font-family:var(--font-display); font-size:19px; }

.quadrant-labels{ position:absolute; inset:0; pointer-events:none; }
.q-label{ position:absolute; font-family:var(--font-mono); font-size:10px; letter-spacing:.05em; color:var(--ink-soft); text-transform:uppercase; }
.q-tl{ top:14px; left:56px; } .q-tr{ top:14px; right:24px; } .q-bl{ bottom:34px; left:56px; } .q-br{ bottom:34px; right:24px; }
.scatter-tooltip{ background:var(--ink); color:#fff; font-size:11.5px; padding:5px 9px; border-radius:2px; }

.kpi-grid{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:14px 0; }
.kpi-card{ border:1px solid var(--line); background:var(--paper-2); padding:12px 14px; }
.kpi-name{ font-family:var(--font-mono); font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--ink-soft); margin-bottom:6px; }
.kpi-values{ display:flex; align-items:baseline; gap:5px; margin-bottom:8px; }
.kpi-actual{ font-family:var(--font-display); font-size:24px; font-weight:600; }
.kpi-unit{ font-size:12px; color:var(--ink-soft); }
.kpi-target{ font-size:11px; color:var(--ink-soft); margin-left:auto; }
.kpi-gauge{ height:5px; background:var(--line); border-radius:3px; overflow:hidden; }
.kpi-gauge-fill{ height:100%; transition:width .3s ease; }
.kpi-freq{ font-size:10.5px; color:var(--ink-soft); margin-top:6px; }

.checklist{ display:flex; flex-direction:column; gap:6px; }
.check-row{ display:flex; align-items:center; gap:10px; }
.check-row input[type=checkbox]{ width:auto; accent-color:var(--teal); }
.check-label-input{ flex:1; }

.tool-guide{ margin-top:20px; }
.toolguide-toggle{ background:none; border:1px solid var(--line); color:var(--ink); font-size:12px; padding:7px 12px; }

.step-actions{ display:flex; align-items:center; justify-content:space-between; margin-top:34px; padding-top:18px; border-top:1px solid var(--line); }
.nav-btn{ display:flex; align-items:center; gap:4px; background:none; border:1px solid var(--line); color:var(--ink); font-size:12.5px; padding:8px 14px; }
.nav-btn:disabled{ opacity:.35; cursor:default; }
.nav-btn:not(:disabled):hover{ border-color:var(--ink); }
.validate-btn{ background:var(--teal); color:#fff; border:none; font-size:12.5px; padding:10px 18px; letter-spacing:.02em; }
.validate-btn.is-validated{ background:var(--ink); }
.empty-hint{ font-size:12px; color:var(--ink-soft); font-style:italic; padding:14px 0; }

.print-only{ display:none; }

/* Site shell overrides */
.lean-app{ width:min(1520px, calc(100vw - 32px)); min-height:calc(100vh - 32px); max-height:none; margin:16px auto; border:1px solid rgba(16,35,63,0.12); border-radius:8px; box-shadow:0 24px 70px rgba(16,35,63,0.16); background:#F8F7F1; }
.lean-app button{ transition:background .18s ease, border-color .18s ease, color .18s ease, transform .18s ease, box-shadow .18s ease; }
.lean-app input,.lean-app select,.lean-app textarea{ border-bottom-color:#C9D1CC; letter-spacing:0; }
.lean-app textarea{ border-radius:8px; background:#fffdf8; box-shadow:inset 0 1px 0 rgba(16,35,63,0.03); }
.lean-app input:focus,.lean-app select:focus,.lean-app textarea:focus{ background:#fff; }
.sidebar{ width:300px; min-width:300px; background:linear-gradient(180deg,#10233F 0%,#173553 64%,#23423F 100%); }
.sidebar-head{ padding:28px 22px 20px; }
.sidebar-eyebrow,.eyebrow,.field label,.progress-text,.save-indicator,.sub-title,.ledger-table th,.spine-caption,.branch-title,.why-num,.q-label,.kpi-name,.print-subtitle{ letter-spacing:0; }
.sidebar-head h1{ font-size:29px; line-height:1; margin:8px 0 16px; }
.project-name{ border-radius:8px; min-height:42px; }
.progress-line{ height:7px; border-radius:999px; }
.progress-fill{ background:linear-gradient(90deg,#46B08F,#F0B35B); }
.step-item{ margin:2px 10px; width:calc(100% - 20px); border-radius:8px; border-left:0; padding:12px 13px; }
.step-item.is-active{ border-left:0; background:rgba(255,255,255,0.14); box-shadow:inset 0 0 0 1px rgba(255,255,255,0.14); }
.step-num{ min-width:30px; color:#9FB2C9; }
.step-title{ font-weight:650; letter-spacing:0; }
.step-stamp{ color:#F0B35B; transform:none; }
.sidebar-foot{ padding:18px 18px 22px; gap:10px; }
.ghost-btn{ border-radius:8px; min-height:38px; justify-content:center; background:rgba(255,255,255,0.05); }
.ghost-btn:hover{ transform:translateY(-1px); background:rgba(255,255,255,0.1); }
.main{ padding:38px clamp(22px,4vw,58px) 70px; }
.dossier-card{ max-width:1060px; }
.dossier-card h2{ font-size:clamp(30px,4vw,48px); line-height:1.02; margin-bottom:14px; letter-spacing:0; }
.objectif,.livrable{ max-width:920px; font-size:14.5px; }
.objectif em,.livrable em{ display:inline-flex; min-width:76px; letter-spacing:0; color:#2F6F63; font-weight:800; }
.step-body{ margin-top:30px; gap:12px; }
.sub-title{ font-family:var(--font-body); font-size:15px; text-transform:uppercase; font-weight:850; color:#10233F; padding-top:20px; }
.field{ margin-bottom:16px; }
.field label{ font-weight:760; }
.charte-grid{ gap:10px 26px; }
.ledger-table-wrap{ border:1px solid #DADFD7; border-radius:8px; background:#fffdf8; box-shadow:0 10px 24px rgba(16,35,63,0.05); }
.ledger-table{ margin-bottom:0; }
.ledger-table th{ background:#EEF2EB; color:#263B50; padding:10px 12px; }
.ledger-table td{ padding:8px 12px; }
.row-del,.branch-causes button{ border-radius:8px; }
.btn-add,.toolguide-toggle,.nav-btn,.validate-btn{ border-radius:8px; }
.btn-add{ background:#fffdf8; font-weight:750; }
.flow-viz{ gap:8px; padding:24px 0; }
.flow-node{ border-radius:8px; background:#fffdf8; box-shadow:0 8px 20px rgba(16,35,63,0.06); }
.shape-diamond{ border-radius:0; }
.shape-circle{ border-radius:999px; }
.pain-callout,.fivewhy,.vsm-summary div,.kpi-card{ border-radius:8px; background:#fffdf8; box-shadow:0 10px 24px rgba(16,35,63,0.05); }
.ishikawa-grid{ grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); }
.ishikawa-problem{ border-radius:8px; }
.vsm-summary{ grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); }
.kpi-grid{ grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); }
.step-actions{ gap:12px; flex-wrap:wrap; }
.nav-btn,.validate-btn{ min-height:42px; font-weight:760; }
.validate-btn{ box-shadow:0 10px 22px rgba(47,111,99,0.22); }
.validate-btn:hover,.nav-btn:not(:disabled):hover{ transform:translateY(-1px); }
.save-indicator{ text-align:center; }

/* SaaS product UI */
.lean-app{
  --ink:#172033; --ink-soft:#667085; --paper:#F5F7FA; --paper-2:#FFFFFF; --line:#E4E7EC;
  --teal:#167A66; --amber:#D68A20; --red:#C24132; --blue:#2563EB;
  width:100vw; min-height:100vh; margin:0; max-height:none; border:0; border-radius:0;
  background:var(--paper); box-shadow:none;
}
.lean-app button{ border-radius:8px; font-weight:700; }
.lean-app input,.lean-app select,.lean-app textarea{
  background:#fff; border:1px solid #D0D5DD; border-radius:8px; padding:9px 10px;
  box-shadow:0 1px 2px rgba(16,24,40,.04);
}
.lean-app textarea{ border-radius:8px; }
.lean-app input:focus,.lean-app select:focus,.lean-app textarea:focus{ border-color:#167A66; box-shadow:0 0 0 3px rgba(22,122,102,.12); }
.sidebar{ width:292px; min-width:292px; background:#101828; color:#EAECF0; border-right:1px solid #1D2939; }
.sidebar-head{ padding:24px 20px 18px; border-bottom:1px solid rgba(255,255,255,.08); }
.sidebar-eyebrow{ color:#98A2B3; font-weight:800; letter-spacing:0; }
.sidebar-head h1{ font-family:var(--font-body); font-size:24px; font-weight:850; letter-spacing:0; margin:8px 0 14px; }
.project-name{ min-height:42px; background:#182230!important; border-color:#344054!important; color:#fff!important; border-radius:8px; }
.progress-line{ height:8px; border-radius:999px; background:#344054; }
.progress-fill{ background:#20B486; border-radius:999px; }
.progress-text{ color:#98A2B3; font-weight:700; letter-spacing:0; }
.steps-nav{ padding:10px; }
.step-item{ width:100%; margin:2px 0; padding:11px 12px; border-left:0; border-radius:8px; color:#D0D5DD; gap:10px; }
.step-item:hover{ background:#182230; }
.step-item.is-active{ background:#FFFFFF; color:#172033; box-shadow:0 8px 20px rgba(0,0,0,.18); }
.step-num{ color:#98A2B3; font-weight:800; min-width:28px; }
.step-item.is-active .step-num{ color:#167A66; }
.step-title{ font-size:13px; font-weight:750; letter-spacing:0; }
.step-stamp{ margin-left:auto; color:#20B486; transform:none; }
.sidebar-foot{ padding:16px; gap:10px; border-top:1px solid rgba(255,255,255,.08); background:#0C111D; }
.ghost-btn{ min-height:40px; justify-content:center; background:#182230; border:1px solid #344054; color:#F2F4F7; }
.ghost-btn:hover{ background:#1D2939; border-color:#20B486; transform:none; }
.ghost-btn.danger:hover{ border-color:#F97066; color:#fff; }
.pdf-hint{ color:#98A2B3; }
.save-indicator{ color:#98A2B3; letter-spacing:0; }
.main{ flex:1; padding:24px clamp(18px,3vw,40px) 48px; background:#F5F7FA; }
.app-topbar{
  max-width:1180px; margin:0 auto 18px; min-height:72px; display:flex; align-items:center; justify-content:space-between; gap:16px;
  background:#fff; border:1px solid #E4E7EC; border-radius:8px; padding:14px 18px; box-shadow:0 1px 3px rgba(16,24,40,.08);
}
.topbar-kicker{ color:#667085; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0; }
.topbar-title{ color:#172033; font-size:18px; font-weight:850; margin-top:3px; }
.topbar-status{ display:flex; align-items:center; gap:10px; color:#667085; font-size:12px; white-space:nowrap; }
.topbar-status strong{ display:inline-flex; align-items:center; min-height:30px; padding:0 10px; background:#ECFDF3; color:#067647; border:1px solid #ABEFC6; border-radius:999px; }
.dossier-card{ max-width:1180px; background:#fff; border:1px solid #E4E7EC; border-radius:8px; padding:24px; box-shadow:0 1px 3px rgba(16,24,40,.08); }
.eyebrow{ color:#667085; border-bottom:1px solid #E4E7EC; font-weight:800; letter-spacing:0; }
.dossier-card h2{ font-family:var(--font-body); font-size:clamp(26px,3vw,38px); font-weight:850; letter-spacing:0; color:#172033; }
.objectif,.livrable{ color:#475467; font-size:14px; }
.objectif em,.livrable em{ color:#167A66; font-weight:850; letter-spacing:0; }
.sub-title{ font-family:var(--font-body); font-size:14px; font-weight:850; color:#172033; text-transform:none; border-top:1px solid #E4E7EC; padding-top:18px; margin-top:22px; }
.field label{ color:#667085; font-weight:800; letter-spacing:0; }
.ledger-table-wrap{ border:1px solid #E4E7EC; border-radius:8px; background:#fff; box-shadow:none; }
.ledger-table{ font-size:12.5px; }
.ledger-table th{ background:#F9FAFB; color:#475467; padding:10px 12px; border-bottom:1px solid #E4E7EC; letter-spacing:0; }
.ledger-table td{ border-bottom:1px solid #EAECF0; padding:8px 12px; }
.ledger-table tr:hover td{ background:#F9FAFB; }
.btn-add{ border:1px solid #167A66; color:#167A66; background:#fff; font-weight:800; }
.btn-add:hover{ background:#ECFDF3; }
.btn-add-mini{ color:#167A66; font-weight:800; }
.flow-node,.pain-callout,.fivewhy,.vsm-summary div,.kpi-card{ background:#fff; border:1px solid #E4E7EC; box-shadow:none; border-radius:8px; }
.flow-node{ border-color:#D0D5DD; }
.is-pain{ border-color:#D68A20!important; box-shadow:0 0 0 3px rgba(214,138,32,.12); }
.crit-badge{ border-radius:999px; }
.kpi-gauge{ background:#EAECF0; }
.step-actions{ border-top:1px solid #E4E7EC; gap:12px; }
.nav-btn{ border:1px solid #D0D5DD; background:#fff; color:#344054; min-height:40px; }
.nav-btn:not(:disabled):hover{ border-color:#98A2B3; background:#F9FAFB; transform:none; }
.validate-btn{ min-height:40px; background:#167A66; box-shadow:none; }
.validate-btn.is-validated{ background:#172033; }

@media print {
  @page{ margin:12mm; }
  body *{ visibility:hidden; }
  .lean-app, .lean-app *{ visibility:visible; }
  body{ background:#fff!important; }
  .lean-app{ display:block; height:auto; max-height:none; border:none; position:absolute; left:0; top:0; width:100%; background:#fff!important; color:#10233F; }
  .sidebar, .main{ display:none; }
  .print-only{ display:block; font-family:var(--font-body); color:var(--ink); }
  .print-only::before{ content:"Tour de contrôle Lean Finance"; display:block; font-family:var(--font-mono); font-size:10px; color:#2F6F63; text-transform:uppercase; letter-spacing:.08em; border-bottom:2px solid #10233F; padding-bottom:8px; margin-bottom:16px; }
  .print-only h1{ font-family:var(--font-display); font-size:28px; line-height:1.12; margin:0 0 5px; color:#10233F; }
  .print-subtitle{ font-family:var(--font-mono); font-size:10px; color:var(--ink-soft); text-transform:uppercase; letter-spacing:.04em; margin:0 0 20px; padding-bottom:12px; border-bottom:1px solid var(--line); }
  .print-step{ page-break-inside:avoid; break-inside:avoid; margin-bottom:18px; border:1px solid var(--line); border-radius:2px; padding:12px 14px; background:#fff; }
  .print-step h2{ font-family:var(--font-display); font-size:18px; margin:0 0 8px; color:#10233F; }
  .print-table-block{ margin-top:8px; page-break-inside:avoid; break-inside:avoid; }
  .print-table-block h4{ font-family:var(--font-mono); font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:#2F6F63; margin:10px 0 4px; }
  .print-table{ width:100%; border-collapse:collapse; font-size:9.5px; margin-bottom:6px; table-layout:fixed; }
  .print-table th{ text-align:left; background:#EDEFE8; font-size:8.5px; text-transform:uppercase; letter-spacing:.02em; padding:5px 6px; border:1px solid #C9CFC2; color:#10233F; }
  .print-table td{ border:1px solid #D8D2C4; padding:5px 6px; vertical-align:top; overflow-wrap:anywhere; }
  .print-table tr:nth-child(even) td{ background:#FBFAF6; }
  .print-field{ font-size:10.5px; line-height:1.42; margin:4px 0; }
  .print-field strong{ text-transform:capitalize; color:var(--ink-soft); font-weight:700; }
}

@media (max-width: 820px){
  .lean-app{ flex-direction:column; width:100vw; min-height:100vh; margin:0; max-height:none; border-radius:0; border:0; }
  .sidebar{ width:100%; min-width:0; }
  .steps-nav{ display:flex; overflow-x:auto; }
  .step-item{ flex-direction:column; width:auto; min-width:96px; margin:4px; border-left:none; border-bottom:3px solid transparent; }
  .step-item.is-active{ border-bottom-color:var(--teal); }
  .app-topbar{ flex-direction:column; align-items:flex-start; }
  .topbar-status{ width:100%; justify-content:space-between; }
  .charte-grid{ grid-template-columns:1fr; }
  .ishikawa-grid{ grid-template-columns:repeat(2,1fr); }
  .kpi-grid{ grid-template-columns:1fr; }
  .main{ padding:20px; }
}
`;

function PrintField({ label, value }) {
  if (!value && value !== 0) return null;
  return <p className="print-field"><strong>{label} : </strong>{String(value)}</p>;
}

function PrintTable({ title, columns, rows }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="print-table-block">
      {title && <h4>{title}</h4>}
      <table className="print-table">
        <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r._id || i}>{columns.map(c => <td key={c.key}>{c.render ? c.render(r) : String(r[c.key] ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrintSummary({ data }) {
  const raciRoles = (data.step1.raci && data.step1.raci.roles) || [];
  const raciRows = (data.step1.raci && data.step1.raci.activites || []).map(a => ({
    ...a, ...raciRoles.reduce((acc, r) => ({ ...acc, [r]: (a.assign && a.assign[r]) || '—' }), {}),
  }));
  const totalTrait = data.step3.vsm.reduce((s, r) => s + (Number(r.tempsTraitement) || 0), 0);
  const totalAttente = data.step3.vsm.reduce((s, r) => s + (Number(r.tempsAttente) || 0), 0);
  const leadTime = totalTrait + totalAttente;
  const vaPct = leadTime > 0 ? Math.round((totalTrait / leadTime) * 1000) / 10 : 0;
  const ishikawa = data.step4.ishikawa || {};
  const fw = data.step4.fivewhy || {};
  const bc = data.step6.businessCase || {};

  return (
    <div className="print-only">
      <h1>{data.projectName || 'Projet Lean'}</h1>
      <p className="print-subtitle">Tour de contrôle Lean — dossier de synthèse — {new Date().toLocaleDateString('fr-FR')}</p>

      <section className="print-step">
        <h2>Étape 00 — Préparer</h2>
        <PrintField label="Note de cadrage" value={data.step0.note} />
        <PrintTable title="Planning macro" columns={[{ key: 'phase', label: 'Phase' }, { key: 'debut', label: 'Début' }, { key: 'fin', label: 'Fin' }, { key: 'responsable', label: 'Responsable' }]} rows={data.step0.planning} />
        <PrintTable title="Parties prenantes" columns={[{ key: 'nom', label: 'Nom' }, { key: 'role', label: 'Rôle' }, { key: 'service', label: 'Service' }, { key: 'interet', label: 'Position' }, { key: 'influence', label: 'Influence' }]} rows={data.step0.parties} />
      </section>

      <section className="print-step">
        <h2>Étape 01 — Cadrer</h2>
        {Object.entries(data.step1.charte || {}).map(([k, v]) => <PrintField key={k} label={k} value={v} />)}
        <PrintTable title="SIPOC" columns={[{ key: 'supplier', label: 'Fournisseurs' }, { key: 'input', label: 'Entrées' }, { key: 'process', label: 'Processus' }, { key: 'output', label: 'Sorties' }, { key: 'customer', label: 'Clients' }]} rows={data.step1.sipoc} />
        <PrintTable title="RACI" columns={[{ key: 'nom', label: 'Activité' }, ...raciRoles.map(r => ({ key: r, label: r }))]} rows={raciRows} />
      </section>

      <section className="print-step">
        <h2>Étape 02 — Observer</h2>
        <PrintTable title="Guide d'entretien" columns={[{ key: 'question', label: 'Question' }]} rows={data.step2.questions} />
        <PrintTable title="Journal d'observation" columns={[{ key: 'date', label: 'Date' }, { key: 'lieu', label: 'Lieu' }, { key: 'type', label: 'Type' }, { key: 'constat', label: 'Constat' }]} rows={data.step2.journal} />
      </section>

      <section className="print-step">
        <h2>Étape 03 — Cartographier</h2>
        <PrintTable title="Référentiel de processus" columns={[{ key: 'processus', label: 'Processus' }, { key: 'macro', label: 'Macro-processus' }, { key: 'niveau', label: 'Niveau' }, { key: 'proprietaire', label: 'Propriétaire' }, { key: 'systeme', label: 'Système' }]} rows={data.step3.referentiel} />
        <PrintTable title="Cartographie AS-IS" columns={[{ key: 'label', label: 'Étape' }, { key: 'type', label: 'Type' }, { key: 'acteur', label: 'Acteur' }, { key: 'systeme', label: 'Système' }, { key: 'pain', label: 'Point de douleur', render: r => r.painpoint ? '⚠ Oui' : '—' }]} rows={data.step3.flow} />
        <PrintTable title="VSM" columns={[{ key: 'etape', label: 'Étape' }, { key: 'tempsTraitement', label: 'Traitement (min)' }, { key: 'tempsAttente', label: 'Attente (min)' }]} rows={data.step3.vsm} />
        <PrintField label="Lead time total" value={`${leadTime} min`} />
        <PrintField label="% valeur ajoutée" value={`${vaPct}%`} />
      </section>

      <section className="print-step">
        <h2>Étape 04 — Analyser</h2>
        <PrintTable title="Pareto des causes" columns={[{ key: 'cause', label: 'Cause' }, { key: 'occurrences', label: 'Occurrences' }]} rows={data.step4.pareto} />
        {Object.keys(ishikawa).length > 0 && (
          <div className="print-table-block">
            <h4>Ishikawa 5M</h4>
            {Object.entries(ishikawa).map(([b, causes]) => (causes || []).length > 0 && <p key={b}><strong>{b} : </strong>{causes.join(' · ')}</p>)}
          </div>
        )}
        {fw.probleme && (
          <div className="print-table-block">
            <h4>5 Pourquoi</h4>
            <PrintField label="Problème" value={fw.probleme} />
            {[1, 2, 3, 4, 5].map(n => <PrintField key={n} label={`Pourquoi ${n}`} value={fw[`why${n}`]} />)}
            <PrintField label="Cause racine" value={fw.causeRacine} />
            <PrintField label="Action corrective" value={fw.action} />
          </div>
        )}
        <PrintTable title="AMDEC" columns={[{ key: 'mode', label: 'Mode de défaillance' }, { key: 'effet', label: 'Effet' }, { key: 'cause', label: 'Cause' }, { key: 'crit', label: 'Criticité', render: r => (Number(r.F) || 0) * (Number(r.G) || 0) * (Number(r.D) || 0) }, { key: 'actions', label: 'Actions' }]} rows={data.step4.amdec} />
      </section>

      <section className="print-step">
        <h2>Étape 05 — Prioriser</h2>
        <PrintTable title="Backlog d'actions" columns={[{ key: 'action', label: 'Action' }, { key: 'impact', label: 'Impact' }, { key: 'effort', label: 'Effort' }, { key: 'responsable', label: 'Responsable' }, { key: 'echeance', label: 'Échéance' }, { key: 'statut', label: 'Statut' }]} rows={data.step5.actions} />
      </section>

      <section className="print-step">
        <h2>Étape 06 — Concevoir</h2>
        <PrintTable title="Cartographie cible (TO-BE)" columns={[{ key: 'label', label: 'Étape' }, { key: 'type', label: 'Type' }, { key: 'acteur', label: 'Acteur' }, { key: 'systeme', label: 'Système' }]} rows={data.step6.flow} />
        <PrintField label="Gains annuels estimés" value={bc.gains ? `${bc.gains} €` : ''} />
        <PrintField label="Coût d'investissement" value={bc.couts ? `${bc.couts} €` : ''} />
        <PrintField label="Retour sur investissement" value={roiText(bc)} />
        <PrintField label="Risques" value={bc.risques} />
        <PrintTable title="Feuille de route" columns={[{ key: 'phase', label: 'Phase' }, { key: 'debut', label: 'Début' }, { key: 'fin', label: 'Fin' }, { key: 'responsable', label: 'Responsable' }, { key: 'livrable', label: 'Livrable' }]} rows={data.step6.roadmap} />
      </section>

      <section className="print-step">
        <h2>Étape 07 — Déployer</h2>
        <PrintTable title="Plan d'action" columns={[{ key: 'action', label: 'Action' }, { key: 'responsable', label: 'Responsable' }, { key: 'echeance', label: 'Échéance' }, { key: 'statut', label: 'Statut' }]} rows={data.step7.plan} />
        <PrintTable title="Conduite du changement" columns={[{ key: 'item', label: 'Élément' }, { key: 'done', label: 'Fait', render: r => r.done ? '✔' : '—' }]} rows={data.step7.changement} />
        <PrintField label="PV de recette" value={data.step7.recette} />
      </section>

      <section className="print-step">
        <h2>Étape 08 — Contrôler</h2>
        <PrintTable title="KPI" columns={[{ key: 'nom', label: 'KPI' }, { key: 'unite', label: 'Unité' }, { key: 'cible', label: 'Cible' }, { key: 'actuel', label: 'Actuel' }, { key: 'frequence', label: 'Fréquence' }]} rows={data.step8.kpis} />
        <PrintTable title="Rituels de pilotage" columns={[{ key: 'nom', label: 'Rituel' }, { key: 'frequence', label: 'Fréquence' }, { key: 'participants', label: 'Participants' }, { key: 'objet', label: 'Objet' }]} rows={data.step8.rituels} />
        <PrintTable title="Plan de contrôle" columns={[{ key: 'point', label: 'Point de contrôle' }, { key: 'frequence', label: 'Fréquence' }, { key: 'responsable', label: 'Responsable' }, { key: 'seuil', label: "Seuil d'alerte" }]} rows={data.step8.controle} />
        <PrintField label="REX" value={data.step8.rex} />
      </section>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(defaultData());
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = window.localStorage.getItem('lean-projet-data');
        if (saved) setData(JSON.parse(saved));
      } catch (e) { /* pas de projet sauvegardé */ }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(async () => {
      try {
        window.localStorage.setItem('lean-projet-data', JSON.stringify(data));
        setSavedAt(new Date());
      } catch (e) { console.error('Erreur de sauvegarde', e); }
    }, 600);
    return () => clearTimeout(t);
  }, [data, loaded]);

  const updateField = useCallback((path, value) => {
    setData(prev => { const next = _.cloneDeep(prev); _.set(next, path, value); return next; });
  }, []);
  const addRow = useCallback((path, template) => {
    setData(prev => { const next = _.cloneDeep(prev); const arr = _.get(next, path) || []; arr.push({ ...template, _id: uid() }); _.set(next, path, arr); return next; });
  }, []);
  const removeRow = useCallback((path, index) => {
    setData(prev => { const next = _.cloneDeep(prev); const arr = _.get(next, path) || []; arr.splice(index, 1); _.set(next, path, arr); return next; });
  }, []);
  const toggleValidated = (id) => updateField(`validated.${id}`, !data.validated[id]);
  const validatedCount = Object.values(data.validated || {}).filter(Boolean).length;
  const progressPct = Math.round((validatedCount / STEPS.length) * 100);

  const resetAll = () => {
    if (window.confirm('Réinitialiser toutes les données du projet ? Cette action est irréversible.')) setData(defaultData());
  };
  const exportPdf = () => {
    const previousTitle = document.title;
    document.title = `${(data.projectName || 'projet-lean').replace(/\s+/g, '_')}_dossier_lean`;
    window.print();
    setTimeout(() => { document.title = previousTitle; }, 1000);
  };

  const charteFields = [
    ['titre', 'Titre du projet'], ['sponsor', 'Sponsor'], ['probleme', 'Problème initial'],
    ['objectifs', 'Objectifs (SMART)'], ['perimetreIn', 'Périmètre inclus'], ['perimetreOut', 'Périmètre exclu'],
    ['contraintes', 'Contraintes'], ['risques', 'Risques principaux'], ['budget', 'Budget estimé'],
    ['dateDebut', 'Date de début'], ['dateFin', 'Date de fin cible'], ['gains', 'Gains attendus'],
  ];

  function renderStep() {
    switch (active) {
      case 0:
        return (<>
          <Field label="Note de cadrage initiale (contexte, enjeux, périmètre pressenti)">
            <textarea rows={5} value={data.step0.note} onChange={e => updateField('step0.note', e.target.value)} />
          </Field>
          <SubTitle>Planning macro</SubTitle>
          <EditableTable
            columns={[{ key: 'phase', label: 'Phase' }, { key: 'debut', label: 'Début' }, { key: 'fin', label: 'Fin' }, { key: 'responsable', label: 'Responsable' }]}
            rows={data.step0.planning}
            onAdd={() => addRow('step0.planning', { phase: '', debut: '', fin: '', responsable: '' })}
            onRemove={i => removeRow('step0.planning', i)}
            onChange={(i, k, v) => updateField(`step0.planning[${i}].${k}`, v)}
            addLabel="Ajouter une phase" />
          <SubTitle>Parties prenantes</SubTitle>
          <EditableTable
            columns={[{ key: 'nom', label: 'Nom' }, { key: 'role', label: 'Rôle' }, { key: 'service', label: 'Service' }, { key: 'interet', label: 'Position', type: 'select', options: ['Favorable', 'Neutre', 'Opposé'] }, { key: 'influence', label: 'Influence', type: 'select', options: ['Fort', 'Moyen', 'Faible'] }]}
            rows={data.step0.parties}
            onAdd={() => addRow('step0.parties', { nom: '', role: '', service: '', interet: '', influence: '' })}
            onRemove={i => removeRow('step0.parties', i)}
            onChange={(i, k, v) => updateField(`step0.parties[${i}].${k}`, v)}
            addLabel="Ajouter une partie prenante" />
        </>);
      case 1:
        return (<>
          <SubTitle>Charte projet</SubTitle>
          <div className="charte-grid">
            {charteFields.map(([k, label]) => (
              <Field key={k} label={label}>
                <input value={data.step1.charte[k] || ''} onChange={e => updateField(`step1.charte.${k}`, e.target.value)} />
              </Field>
            ))}
          </div>
          <SubTitle>SIPOC</SubTitle>
          <EditableTable
            columns={[{ key: 'supplier', label: 'Fournisseurs (S)' }, { key: 'input', label: 'Entrées (I)' }, { key: 'process', label: 'Processus (P)' }, { key: 'output', label: 'Sorties (O)' }, { key: 'customer', label: 'Clients (C)' }]}
            rows={data.step1.sipoc}
            onAdd={() => addRow('step1.sipoc', { supplier: '', input: '', process: '', output: '', customer: '' })}
            onRemove={i => removeRow('step1.sipoc', i)}
            onChange={(i, k, v) => updateField(`step1.sipoc[${i}].${k}`, v)}
            addLabel="Ajouter une ligne SIPOC" />
          <SubTitle>RACI</SubTitle>
          <RaciMatrix path="step1.raci" data={data.step1.raci} updateField={updateField} />
        </>);
      case 2:
        return (<>
          <SubTitle>Guide d'entretien</SubTitle>
          <EditableTable
            columns={[{ key: 'question', label: 'Question' }]}
            rows={data.step2.questions}
            onAdd={() => addRow('step2.questions', { question: '' })}
            onRemove={i => removeRow('step2.questions', i)}
            onChange={(i, k, v) => updateField(`step2.questions[${i}].${k}`, v)}
            addLabel="Ajouter une question" />
          <SubTitle>Journal d'observation</SubTitle>
          <EditableTable
            columns={[{ key: 'date', label: 'Date' }, { key: 'lieu', label: 'Lieu' }, { key: 'observateur', label: 'Observateur' }, { key: 'type', label: 'Type', type: 'select', options: ['Gaspillage', 'Risque', 'Bonne pratique', 'Irritant'] }, { key: 'constat', label: 'Constat', type: 'textarea' }]}
            rows={data.step2.journal}
            onAdd={() => addRow('step2.journal', { date: '', lieu: '', observateur: '', type: '', constat: '' })}
            onRemove={i => removeRow('step2.journal', i)}
            onChange={(i, k, v) => updateField(`step2.journal[${i}].${k}`, v)}
            addLabel="Ajouter une observation" />
        </>);
      case 3: {
        const totalTrait = data.step3.vsm.reduce((s, r) => s + (Number(r.tempsTraitement) || 0), 0);
        const totalAttente = data.step3.vsm.reduce((s, r) => s + (Number(r.tempsAttente) || 0), 0);
        const leadTime = totalTrait + totalAttente;
        const vaPct = leadTime > 0 ? Math.round((totalTrait / leadTime) * 1000) / 10 : 0;
        return (<>
          <SubTitle>Référentiel de processus</SubTitle>
          <EditableTable
            columns={[{ key: 'processus', label: 'Processus' }, { key: 'macro', label: 'Macro-processus' }, { key: 'niveau', label: 'Niveau', type: 'select', options: ['N1', 'N2', 'N3'] }, { key: 'proprietaire', label: 'Propriétaire' }, { key: 'systeme', label: 'Système' }]}
            rows={data.step3.referentiel}
            onAdd={() => addRow('step3.referentiel', { processus: '', macro: '', niveau: '', proprietaire: '', systeme: '' })}
            onRemove={i => removeRow('step3.referentiel', i)}
            onChange={(i, k, v) => updateField(`step3.referentiel[${i}].${k}`, v)}
            addLabel="Ajouter un processus" />
          <SubTitle>Cartographie AS-IS (BPMN simplifié)</SubTitle>
          <FlowBuilder path="step3.flow" data={data.step3.flow} updateField={updateField} addRow={addRow} removeRow={removeRow} />
          <SubTitle>VSM — Value Stream Mapping</SubTitle>
          <EditableTable
            columns={[{ key: 'etape', label: 'Étape' }, { key: 'tempsTraitement', label: 'Temps de traitement (min)', type: 'number' }, { key: 'tempsAttente', label: "Temps d'attente (min)", type: 'number' }]}
            rows={data.step3.vsm}
            onAdd={() => addRow('step3.vsm', { etape: '', tempsTraitement: '', tempsAttente: '' })}
            onRemove={i => removeRow('step3.vsm', i)}
            onChange={(i, k, v) => updateField(`step3.vsm[${i}].${k}`, v)}
            addLabel="Ajouter une étape VSM" />
          <div className="vsm-summary">
            <div><span>Temps de traitement total</span><strong>{totalTrait} min</strong></div>
            <div><span>Temps d'attente total</span><strong>{totalAttente} min</strong></div>
            <div><span>Lead time total</span><strong>{leadTime} min</strong></div>
            <div><span>% valeur ajoutée</span><strong>{vaPct}%</strong></div>
          </div>
        </>);
      }
      case 4:
        return (<>
          <SubTitle>Pareto des causes</SubTitle>
          <EditableTable
            columns={[{ key: 'cause', label: 'Cause / motif' }, { key: 'occurrences', label: 'Occurrences', type: 'number' }]}
            rows={data.step4.pareto}
            onAdd={() => addRow('step4.pareto', { cause: '', occurrences: '' })}
            onRemove={i => removeRow('step4.pareto', i)}
            onChange={(i, k, v) => updateField(`step4.pareto[${i}].${k}`, v)}
            addLabel="Ajouter une cause" />
          <ParetoChart rows={data.step4.pareto} />
          <SubTitle>Diagramme d'Ishikawa (5M)</SubTitle>
          <Ishikawa path="step4.ishikawa" data={data.step4.ishikawa} updateField={updateField} />
          <SubTitle>Méthode des 5 Pourquoi</SubTitle>
          <FiveWhys path="step4.fivewhy" data={data.step4.fivewhy} updateField={updateField} />
          <SubTitle>AMDEC</SubTitle>
          <AmdecTable rows={data.step4.amdec} addRow={addRow} removeRow={removeRow} updateField={updateField} />
          <ToolGuide />
        </>);
      case 5:
        return (<>
          <SubTitle>Matrice Impact / Effort &amp; backlog d'actions</SubTitle>
          <EditableTable
            columns={[{ key: 'action', label: 'Action' }, { key: 'impact', label: 'Impact (0-10)', type: 'number', min: 0, max: 10 }, { key: 'effort', label: 'Effort (0-10)', type: 'number', min: 0, max: 10 }, { key: 'responsable', label: 'Responsable' }, { key: 'echeance', label: 'Échéance' }, { key: 'statut', label: 'Statut', type: 'select', options: ['À faire', 'En cours', 'Fait'] }]}
            rows={data.step5.actions}
            onAdd={() => addRow('step5.actions', { action: '', impact: '', effort: '', responsable: '', echeance: '', statut: 'À faire' })}
            onRemove={i => removeRow('step5.actions', i)}
            onChange={(i, k, v) => updateField(`step5.actions[${i}].${k}`, v)}
            addLabel="Ajouter une action" />
          <ImpactEffortChart rows={data.step5.actions} />
        </>);
      case 6:
        return (<>
          <SubTitle>Cartographie cible (TO-BE)</SubTitle>
          <FlowBuilder path="step6.flow" data={data.step6.flow} updateField={updateField} addRow={addRow} removeRow={removeRow} />
          <SubTitle>Business case</SubTitle>
          <div className="charte-grid">
            <Field label="Gains annuels estimés (€)"><input type="number" value={data.step6.businessCase.gains || ''} onChange={e => updateField('step6.businessCase.gains', e.target.value)} /></Field>
            <Field label="Coût d'investissement (€)"><input type="number" value={data.step6.businessCase.couts || ''} onChange={e => updateField('step6.businessCase.couts', e.target.value)} /></Field>
            <Field label="Retour sur investissement estimé"><input readOnly value={roiText(data.step6.businessCase)} /></Field>
            <Field label="Risques de mise en œuvre"><input value={data.step6.businessCase.risques || ''} onChange={e => updateField('step6.businessCase.risques', e.target.value)} /></Field>
          </div>
          <SubTitle>Feuille de route</SubTitle>
          <EditableTable
            columns={[{ key: 'phase', label: 'Phase' }, { key: 'debut', label: 'Début' }, { key: 'fin', label: 'Fin' }, { key: 'responsable', label: 'Responsable' }, { key: 'livrable', label: 'Livrable' }]}
            rows={data.step6.roadmap}
            onAdd={() => addRow('step6.roadmap', { phase: '', debut: '', fin: '', responsable: '', livrable: '' })}
            onRemove={i => removeRow('step6.roadmap', i)}
            onChange={(i, k, v) => updateField(`step6.roadmap[${i}].${k}`, v)}
            addLabel="Ajouter une phase" />
        </>);
      case 7:
        return (<>
          <SubTitle>Plan d'action</SubTitle>
          <EditableTable
            columns={[{ key: 'action', label: 'Action' }, { key: 'responsable', label: 'Responsable' }, { key: 'echeance', label: 'Échéance' }, { key: 'statut', label: 'Statut', type: 'select', options: ['À faire', 'En cours', 'Fait'] }]}
            rows={data.step7.plan}
            onAdd={() => addRow('step7.plan', { action: '', responsable: '', echeance: '', statut: 'À faire' })}
            onRemove={i => removeRow('step7.plan', i)}
            onChange={(i, k, v) => updateField(`step7.plan[${i}].${k}`, v)}
            addLabel="Ajouter une action" />
          <SubTitle>Conduite du changement</SubTitle>
          <div className="checklist">
            {data.step7.changement.map((c, ci) => (
              <label key={c._id} className="check-row">
                <input type="checkbox" checked={c.done} onChange={e => updateField(`step7.changement[${ci}].done`, e.target.checked)} />
                <input className="check-label-input" value={c.item} onChange={e => updateField(`step7.changement[${ci}].item`, e.target.value)} />
                <button className="row-del" onClick={() => removeRow('step7.changement', ci)}>×</button>
              </label>
            ))}
            <button className="btn-add" onClick={() => addRow('step7.changement', { item: '', done: false })}>+ élément</button>
          </div>
          <SubTitle>PV de recette</SubTitle>
          <textarea rows={5} value={data.step7.recette} onChange={e => updateField('step7.recette', e.target.value)} placeholder="Constat, validé par, date, réserves..." />
        </>);
      case 8:
        return (<>
          <SubTitle>Indicateurs clés (KPI)</SubTitle>
          <EditableTable
            columns={[{ key: 'nom', label: 'KPI' }, { key: 'unite', label: 'Unité' }, { key: 'cible', label: 'Cible', type: 'number' }, { key: 'actuel', label: 'Actuel', type: 'number' }, { key: 'frequence', label: 'Fréquence', type: 'select', options: ['Quotidien', 'Hebdomadaire', 'Mensuel'] }]}
            rows={data.step8.kpis}
            onAdd={() => addRow('step8.kpis', { nom: '', unite: '', cible: '', actuel: '', frequence: '' })}
            onRemove={i => removeRow('step8.kpis', i)}
            onChange={(i, k, v) => updateField(`step8.kpis[${i}].${k}`, v)}
            addLabel="Ajouter un KPI" />
          <div className="kpi-grid">{data.step8.kpis.filter(k => k.nom).map(k => <KpiCard key={k._id} k={k} />)}</div>
          <SubTitle>Rituels de pilotage</SubTitle>
          <EditableTable
            columns={[{ key: 'nom', label: 'Rituel' }, { key: 'frequence', label: 'Fréquence' }, { key: 'participants', label: 'Participants' }, { key: 'objet', label: 'Objet' }]}
            rows={data.step8.rituels}
            onAdd={() => addRow('step8.rituels', { nom: '', frequence: '', participants: '', objet: '' })}
            onRemove={i => removeRow('step8.rituels', i)}
            onChange={(i, k, v) => updateField(`step8.rituels[${i}].${k}`, v)}
            addLabel="Ajouter un rituel" />
          <SubTitle>Plan de contrôle</SubTitle>
          <EditableTable
            columns={[{ key: 'point', label: 'Point de contrôle' }, { key: 'frequence', label: 'Fréquence' }, { key: 'responsable', label: 'Responsable' }, { key: 'seuil', label: "Seuil d'alerte" }]}
            rows={data.step8.controle}
            onAdd={() => addRow('step8.controle', { point: '', frequence: '', responsable: '', seuil: '' })}
            onRemove={i => removeRow('step8.controle', i)}
            onChange={(i, k, v) => updateField(`step8.controle[${i}].${k}`, v)}
            addLabel="Ajouter un point de contrôle" />
          <SubTitle>Retour d'expérience (REX)</SubTitle>
          <textarea rows={5} value={data.step8.rex} onChange={e => updateField('step8.rex', e.target.value)} placeholder="Réussites, difficultés, actions d'amélioration..." />
        </>);
      default: return null;
    }
  }

  return (
    <div className="lean-app">
      <style>{CSS}</style>
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="sidebar-eyebrow">Tour de contrôle</div>
          <h1>Lean Finance</h1>
          <input className="project-name" placeholder="Nom du projet…" value={data.projectName} onChange={e => updateField('projectName', e.target.value)} />
          <div className="progress-line"><div className="progress-fill" style={{ width: `${(validatedCount / 9) * 100}%` }} /></div>
          <div className="progress-text">{validatedCount}/9 étapes validées</div>
        </div>
        <nav className="steps-nav">
          {STEPS.map(s => (
            <button key={s.id} className={`step-item ${active === s.id ? 'is-active' : ''}`} onClick={() => setActive(s.id)}>
              <span className="step-num">{String(s.id).padStart(2, '0')}</span>
              <span className="step-title">{s.title}</span>
              {data.validated[s.id] && <span className="step-stamp">✔</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <button className="ghost-btn" onClick={exportPdf}><Download size={14} /> Télécharger le dossier PDF</button>
          <div className="pdf-hint">Un dossier structuré s’ouvre en aperçu. Choisissez “Enregistrer au format PDF”.</div>
          <button className="ghost-btn danger" onClick={resetAll}><RotateCcw size={14} /> Réinitialiser</button>
          <div className="save-indicator">{savedAt ? `Enregistré ${savedAt.toLocaleTimeString('fr-FR')}` : (loaded ? 'Non enregistré' : 'Chargement…')}</div>
        </div>
      </aside>
      <main className="main">
        <div className="app-topbar">
          <div>
            <div className="topbar-kicker">Workspace Lean Finance</div>
            <div className="topbar-title">{data.projectName || 'Projet Lean'}</div>
          </div>
          <div className="topbar-status">
            <span>{progressPct}% complété</span>
            <strong>{STEPS[active].title}</strong>
          </div>
        </div>
        <div className="dossier-card">
          <div className="eyebrow">Étape {String(active).padStart(2, '0')} — {STEPS[active].title}</div>
          <h2>{STEPS[active].title}</h2>
          <p className="objectif"><em>Objectif</em>{STEPS[active].objectif}</p>
          <p className="livrable"><em>Livrables</em>{STEPS[active].livrable}</p>
          <div className="step-body">{renderStep()}</div>
          <div className="step-actions">
            <button className="nav-btn" disabled={active === 0} onClick={() => setActive(a => Math.max(0, a - 1))}><ChevronLeft size={16} /> Précédent</button>
            <button className={`validate-btn ${data.validated[active] ? 'is-validated' : ''}`} onClick={() => toggleValidated(active)}>
              {data.validated[active] ? '✔ Étape validée' : 'Marquer cette étape comme validée'}
            </button>
            <button className="nav-btn" disabled={active === 8} onClick={() => setActive(a => Math.min(8, a + 1))}>Suivant <ChevronRight size={16} /></button>
          </div>
        </div>
      </main>
      <PrintSummary data={data} />
    </div>
  );
}
