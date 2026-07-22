import React, { useState, useEffect, useCallback, useRef } from 'react';
import _ from 'lodash';
import {
  getCurrentSession, isSupabaseConfigured, loadProjectsFromSupabase,
  saveProjectsToSupabase, signInWithEmail, signInWithOAuth, signOutFromSupabase, signUpWithEmail
} from './supabaseStorage';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ScatterChart, Scatter, Cell
} from 'recharts';
import {
  ArrowLeft, BarChart3, BriefcaseBusiness, ChevronRight, ChevronLeft, ClipboardList, Download,
  Eye, FolderKanban, Gauge, GitBranch, LayoutGrid, List, Map, PanelLeftClose, PanelLeftOpen,
  LogOut, PencilRuler, Plus, Rocket, RotateCcw, Rows3, Search, Target, Trash2
} from 'lucide-react';

const uid = () => 'r' + Math.random().toString(36).slice(2, 9);
const createProject = (seed) => ({ ...defaultData(), ...(seed || {}), _projectId: seed?._projectId || uid(), updatedAt: new Date().toISOString() });
const createBlankProject = (seed) => ({ ...blankData(), ...(seed || {}), _projectId: seed?._projectId || uid(), updatedAt: new Date().toISOString() });
const createBankExample = () => ({ ...bankComplaintData(), _projectId: uid(), _templateKey: 'bank-complaints-example', updatedAt: new Date().toISOString() });
const createIndustrialExample = () => ({ ...industrialAircraftData(), _projectId: uid(), _templateKey: 'industrial-aircraft-turnaround-example', updatedAt: new Date().toISOString() });
const createInsuranceExample = () => ({ ...insuranceClaimsData(), _projectId: uid(), _templateKey: 'insurance-home-claims-example', updatedAt: new Date().toISOString() });
const createDmaicComplaintExample = () => ({ ...dmaicComplaintData(), _projectId: uid(), updatedAt: new Date().toISOString() });
const projectProgress = (project) => Object.values(project.validated || {}).filter(Boolean).length;
const localProjectsKey = (session) => session?.user?.id ? `pilotprocess-projects-${session.user.id}` : 'lean-projects-data';
const EXAMPLE_TEMPLATE_KEYS = new Set([
  'bank-complaints-example',
  'industrial-aircraft-turnaround-example',
  'insurance-home-claims-example',
]);
const EXAMPLE_PROJECT_NAMES = new Set([
  'Optimisation du processus de clôture de compte bancaire',
  'Optimisation du traitement des réclamations clients',
  'Réduction du temps d’immobilisation avion en maintenance',
  'Optimisation du traitement des sinistres habitation',
]);
const isExampleProject = (project) => EXAMPLE_TEMPLATE_KEYS.has(project?._templateKey) || EXAMPLE_PROJECT_NAMES.has(project?.projectName);

const STEPS = [
  { id: 0, title: 'Préparer', icon: ClipboardList, objectif: "Choisir le périmètre, collecter les documents, identifier les parties prenantes.", livrable: 'Note de cadrage initiale, planning macro.' },
  { id: 1, title: 'Cadrer', icon: Target, objectif: 'Définir le problème, les objectifs, les KPI, le périmètre, les contraintes et les risques.', livrable: 'Charte projet, SIPOC, RACI.' },
  { id: 2, title: 'Observer', icon: Eye, objectif: 'Mener entretiens, immersions, shadowing et collecte de données.', livrable: "Guide d'entretien, journal d'observation." },
  { id: 3, title: 'Cartographier', icon: Map, objectif: 'Modéliser le AS-IS en BPMN et/ou VSM, matérialiser acteurs et systèmes.', livrable: 'Cartographie AS-IS, points de douleur.' },
  { id: 4, title: 'Analyser', icon: BarChart3, objectif: 'Qualifier les gaspillages, causes racines, risques, ruptures et goulots.', livrable: 'Pareto, Ishikawa, 5 Pourquoi, AMDEC.' },
  { id: 5, title: 'Prioriser', icon: Gauge, objectif: 'Classer les problèmes selon impact, effort, risque, urgence et valeur.', livrable: "Matrice impact/effort, backlog d'actions." },
  { id: 6, title: 'Concevoir', icon: PencilRuler, objectif: 'Construire la cible TO-BE, les standards, les automatisations, les KPI et les contrôles.', livrable: 'Cartographie cible, business case.' },
  { id: 7, title: 'Déployer', icon: Rocket, objectif: 'Piloter les actions, conduire le changement, tester, former, migrer.', livrable: "Plan d'action, supports, PV de recette." },
  { id: 8, title: 'Contrôler', icon: Gauge, objectif: 'Mesurer les gains, installer des rituels, ajuster et maintenir.', livrable: 'Dashboard, plan de contrôle, REX.' },
];

const ADVANCED_BPMN_TAB = {
  id: 'bpmn',
  num: '09',
  title: 'BPMN avancé',
  objectif: 'Modéliser un processus complet avec un éditeur BPMN professionnel, plus riche que la cartographie simplifiée des étapes.',
  livrable: 'Diagramme BPMN complet exportable au format .bpmn.',
};

const DMAIC_TAB = {
  id: 'dmaic',
  title: 'Six Sigma DMAIC',
  icon: Target,
  objectif: 'Structurer un projet Six Sigma avec les phases Define, Measure, Analyze, Improve et Control.',
  livrable: 'Charte DMAIC, mesures de référence, analyse des causes, solutions priorisées et plan de contrôle.',
};

const BPMN_ASSET_VERSION = '18.21.0';
const BPMN_MODEL_SCRIPT = `https://unpkg.com/bpmn-js@${BPMN_ASSET_VERSION}/dist/bpmn-modeler.production.min.js`;
const JSPDF_SCRIPT = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
const BPMN_STYLES = [
  `https://unpkg.com/bpmn-js@${BPMN_ASSET_VERSION}/dist/assets/diagram-js.css`,
  `https://unpkg.com/bpmn-js@${BPMN_ASSET_VERSION}/dist/assets/bpmn-js.css`,
  `https://unpkg.com/bpmn-js@${BPMN_ASSET_VERSION}/dist/assets/bpmn-font/css/bpmn.css`,
];

const BPMN_COLOR_PRESETS = [
  { name: 'Bleu', stroke: '#1D4ED8', fill: '#DBEAFE' },
  { name: 'Vert', stroke: '#047857', fill: '#D1FAE5' },
  { name: 'Orange', stroke: '#B45309', fill: '#FEF3C7' },
  { name: 'Rouge', stroke: '#B91C1C', fill: '#FEE2E2' },
  { name: 'Violet', stroke: '#6D28D9', fill: '#EDE9FE' },
  { name: 'Gris', stroke: '#475569', fill: '#F1F5F9' },
];

function defaultBpmnXml(projectName = 'Processus') {
  const name = String(projectName || 'Processus').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_PilotProcess" targetNamespace="http://pilotprocess.local/schema/bpmn">
  <bpmn:process id="Process_PilotProcess" name="${name}" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Début"><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:task id="Task_1" name="Activité à modéliser"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:task>
    <bpmn:exclusiveGateway id="Gateway_1" name="Décision"><bpmn:incoming>Flow_2</bpmn:incoming><bpmn:outgoing>Flow_3</bpmn:outgoing></bpmn:exclusiveGateway>
    <bpmn:endEvent id="EndEvent_1" name="Fin"><bpmn:incoming>Flow_3</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Gateway_1" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_PilotProcess">
    <bpmndi:BPMNPlane id="BPMNPlane_PilotProcess" bpmnElement="Process_PilotProcess">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"><dc:Bounds x="170" y="150" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="260" y="128" width="150" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_1_di" bpmnElement="Gateway_1" isMarkerVisible="true"><dc:Bounds x="470" y="143" width="50" height="50" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1"><dc:Bounds x="590" y="150" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="206" y="168" /><di:waypoint x="260" y="168" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="410" y="168" /><di:waypoint x="470" y="168" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_di" bpmnElement="Flow_3"><di:waypoint x="520" y="168" /><di:waypoint x="590" y="168" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

function loadBpmnModeler() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Navigateur indisponible'));
  if (window.BpmnJS) return Promise.resolve(window.BpmnJS);
  if (window.__processPilotBpmnLoader) return window.__processPilotBpmnLoader;

  BPMN_STYLES.forEach((href) => {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  });

  window.__processPilotBpmnLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = BPMN_MODEL_SCRIPT;
    script.async = true;
    script.onload = () => window.BpmnJS ? resolve(window.BpmnJS) : reject(new Error('BPMN modeler introuvable'));
    script.onerror = () => reject(new Error('Impossible de charger bpmn-js'));
    document.head.appendChild(script);
  });
  return window.__processPilotBpmnLoader;
}

function loadJsPdf() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Navigateur indisponible'));
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (window.__processPilotJsPdfLoader) return window.__processPilotJsPdfLoader;

  window.__processPilotJsPdfLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = JSPDF_SCRIPT;
    script.async = true;
    script.onload = () => window.jspdf?.jsPDF ? resolve(window.jspdf.jsPDF) : reject(new Error('jsPDF introuvable'));
    script.onerror = () => reject(new Error('Impossible de charger jsPDF'));
    document.head.appendChild(script);
  });
  return window.__processPilotJsPdfLoader;
}

function slugFileName(value, fallback = 'pilotprocess') {
  return (value || fallback).toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || fallback;
}

function svgToPngDataUrl(svg) {
  return new Promise((resolve, reject) => {
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    const viewBox = (parsed.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    const svgWidth = Number(parsed.getAttribute('width')) || viewBox[2] || 1200;
    const svgHeight = Number(parsed.getAttribute('height')) || viewBox[3] || 800;
    const scale = 2;
    const normalizedSvg = svg.includes('xmlns=') ? svg : svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const blob = new Blob([normalizedSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(svgWidth * scale));
      canvas.height = Math.max(1, Math.round(svgHeight * scale));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width: svgWidth, height: svgHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Conversion SVG impossible'));
    };
    image.src = url;
  });
}

function defaultData() {
  return {
    projectName: 'Optimisation du processus de clôture de compte bancaire',
    validated: { 0: true, 1: true },
    bpmnXml: '',
    bpmnViewbox: null,
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

function blankData() {
  return {
    projectName: '',
    validated: {},
    bpmnXml: '',
    bpmnViewbox: null,
    step0: {
      note: '',
      planning: [],
      parties: [],
    },
    step1: {
      charte: {
        titre: '',
        sponsor: '',
        probleme: '',
        objectifs: '',
        perimetreIn: '',
        perimetreOut: '',
        contraintes: '',
        risques: '',
        budget: '',
        dateDebut: '',
        dateFin: '',
        gains: '',
      },
      sipoc: [],
      raci: {
        roles: [],
        activites: [],
      },
    },
    step2: {
      questions: [],
      journal: [],
    },
    step3: {
      referentiel: [],
      flow: [],
      vsm: [],
    },
    step4: {
      pareto: [],
      ishikawa: {
        "Main d'œuvre": [],
        'Méthode': [],
        'Matériel': [],
        'Milieu': [],
        'Matière': [],
      },
      fivewhy: {
        probleme: '',
        why1: '',
        why2: '',
        why3: '',
        why4: '',
        why5: '',
        causeRacine: '',
        action: '',
      },
      amdec: [],
    },
    step5: {
      actions: [],
    },
    step6: {
      flow: [],
      businessCase: {
        gains: '',
        couts: '',
        risques: '',
      },
      roadmap: [],
    },
    step7: {
      plan: [],
      changement: [],
      recette: '',
    },
    step8: {
      kpis: [],
      rituels: [],
      controle: [],
      rex: '',
    },
    dmaic: {
      define: {
        problem: '',
        customer: '',
        ctq: '',
        goal: '',
        scope: '',
        team: '',
        businessCase: '',
        voc: [],
        swot: [],
        sipoc: [],
        raci: {
          roles: [],
          activites: [],
        },
      },
      measure: {
        baseline: '',
        labels: { y: '', segment: '', x1: '', x2: '' },
        factors: [],
        kpis: [],
        collectionPlan: [],
        data: [],
        spec: { lsl: '', usl: '', target: '' },
        msa: '',
        normality: '',
        capabilityConclusion: '',
        controlChartConclusion: '',
      },
      analyze: {
        observations: '',
        causes: [],
        pareto: [],
        ishikawa: {
          "Main d'oeuvre": [],
          'Methode': [],
          'Materiel': [],
          'Milieu': [],
          'Matiere': [],
        },
        fivewhy: {
          probleme: '',
          why1: '',
          why2: '',
          why3: '',
          why4: '',
          why5: '',
          causeRacine: '',
          action: '',
        },
        statTests: [],
        regression: { equation: '', r2: '', conclusion: '' },
      },
      improve: {
        target: '',
        solutions: [],
        impactEffort: [],
        actionPlan: [],
        pilot: '',
        riskMitigation: '',
      },
      control: {
        standard: '',
        plan: [],
        kpis: [],
        reactionPlan: '',
        businessImpact: '',
        conclusion: '',
      },
    },
  };
}

function bankComplaintData() {
  return {
    projectName: 'Optimisation du traitement des réclamations clients',
    validated: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
    step0: {
      note: "Le processus de traitement des réclamations clients présente des délais élevés, des relances fréquentes et une visibilité limitée pour les agences comme pour les clients. Le projet couvre les réclamations banque de détail reçues par agence, centre de relation client et canal digital, depuis l'enregistrement jusqu'à la réponse finale.",
      planning: [
        { _id: uid(), phase: 'Cadrage', debut: '05/01/2027', fin: '16/01/2027', responsable: 'Chef de projet amélioration' },
        { _id: uid(), phase: 'Observation terrain', debut: '19/01/2027', fin: '30/01/2027', responsable: 'Équipe processus' },
        { _id: uid(), phase: 'Diagnostic et cartographie', debut: '02/02/2027', fin: '20/02/2027', responsable: 'Process owner' },
        { _id: uid(), phase: 'Conception cible', debut: '23/02/2027', fin: '13/03/2027', responsable: 'Métier + IT' },
        { _id: uid(), phase: 'Pilote opérationnel', debut: '16/03/2027', fin: '10/04/2027', responsable: 'Responsable relation client' },
        { _id: uid(), phase: 'Déploiement et contrôle', debut: '13/04/2027', fin: 'Continu', responsable: 'Direction expérience client' },
      ],
      parties: [
        { _id: uid(), nom: 'Directeur Expérience Client', role: 'Sponsor', service: 'Relation Client', interet: 'Favorable', influence: 'Fort' },
        { _id: uid(), nom: 'Responsable Réclamations', role: 'Pilote métier', service: 'Service Réclamations', interet: 'Favorable', influence: 'Fort' },
        { _id: uid(), nom: 'Responsable Réseau Agences', role: 'Contributeur', service: 'Réseau', interet: 'Favorable', influence: 'Moyen' },
        { _id: uid(), nom: 'Conformité', role: 'Appui contrôle', service: 'Conformité', interet: 'Neutre', influence: 'Fort' },
        { _id: uid(), nom: 'IT CRM', role: 'Contributeur', service: 'Systèmes Client', interet: 'Neutre', influence: 'Moyen' },
      ],
    },
    step1: {
      charte: {
        titre: 'Optimisation du traitement des réclamations clients',
        sponsor: 'Directeur Expérience Client',
        probleme: 'Le délai moyen de réponse aux réclamations est de 18 jours ouvrés, avec 32% de dossiers relancés au moins une fois et une forte hétérogénéité de qualification entre les canaux.',
        objectifs: 'Réduire le délai moyen à 8 jours ouvrés, atteindre 90% de dossiers qualifiés complets dès l’entrée, réduire les relances de 50% et fiabiliser les réponses réglementaires.',
        perimetreIn: 'Réclamations banque de détail : frais, cartes, virements, accès digital, qualité de service.',
        perimetreOut: 'Contentieux juridiques, médiation externe, fraude avérée, réclamations entreprises.',
        contraintes: 'Respect des délais réglementaires, disponibilité des experts métiers, dépendance au paramétrage CRM.',
        risques: 'Sous-qualification des demandes, réponses non homogènes, surcharge temporaire du service réclamations pendant le pilote.',
        budget: '62 000 €',
        dateDebut: '05/01/2027',
        dateFin: '30/04/2027',
        gains: 'Baisse des relances, réduction du coût de traitement, amélioration du NPS post-réclamation et meilleure maîtrise du risque de non-réponse.',
      },
      sipoc: [
        { _id: uid(), supplier: 'Client', input: 'Réclamation agence, téléphone ou digital', process: 'Traiter une réclamation client', output: 'Réponse argumentée et tracée', customer: 'Client' },
        { _id: uid(), supplier: 'Agence / CRC', input: 'Qualification initiale et pièces', process: 'Traiter une réclamation client', output: 'Dossier complet', customer: 'Service Réclamations' },
        { _id: uid(), supplier: 'Experts métiers', input: 'Analyse opérationnelle', process: 'Traiter une réclamation client', output: 'Avis métier', customer: 'Responsable Réclamations' },
      ],
      raci: {
        roles: ['Agence / CRC', 'Réclamations', 'Expert métier', 'Conformité', 'IT CRM'],
        activites: [
          { _id: uid(), nom: 'Enregistrer la réclamation', assign: { 'Agence / CRC': 'R', Réclamations: 'I' } },
          { _id: uid(), nom: 'Qualifier le motif et la priorité', assign: { 'Agence / CRC': 'R', Réclamations: 'A', Conformité: 'C' } },
          { _id: uid(), nom: 'Analyser le dossier', assign: { Réclamations: 'R', 'Expert métier': 'C' } },
          { _id: uid(), nom: 'Valider la réponse sensible', assign: { Réclamations: 'R', Conformité: 'A' } },
          { _id: uid(), nom: 'Mettre à jour le CRM', assign: { Réclamations: 'R', 'IT CRM': 'C' } },
        ],
      },
    },
    step2: {
      questions: [
        { _id: uid(), question: 'Comment une réclamation est-elle enregistrée selon le canal d’entrée ?' },
        { _id: uid(), question: 'Quels motifs sont les plus difficiles à qualifier ?' },
        { _id: uid(), question: 'À quel moment les pièces manquantes sont-elles détectées ?' },
        { _id: uid(), question: 'Quels dossiers nécessitent un avis conformité ou expert métier ?' },
        { _id: uid(), question: 'Comment le client est-il informé de l’avancement ?' },
      ],
      journal: [
        { _id: uid(), date: '20/01/2027', lieu: 'Centre relation client', observateur: 'Équipe processus', type: 'Irritant', constat: 'Les motifs CRM sont trop nombreux et interprétés différemment selon les conseillers.' },
        { _id: uid(), date: '22/01/2027', lieu: 'Service Réclamations', observateur: 'Équipe processus', type: 'Gaspillage', constat: '28% des dossiers observés nécessitent une relance interne pour pièce ou information manquante.' },
        { _id: uid(), date: '24/01/2027', lieu: 'Agence pilote', observateur: 'Process owner', type: 'Risque', constat: 'Les réponses sensibles ne sont pas toujours relues par la conformité avant envoi.' },
      ],
    },
    step3: {
      referentiel: [
        { _id: uid(), processus: 'Traitement des réclamations clients', macro: 'Expérience client', niveau: 'N1', proprietaire: 'Responsable Réclamations', systeme: 'CRM' },
        { _id: uid(), processus: 'Qualification initiale', macro: 'Expérience client', niveau: 'N2', proprietaire: 'Réseau / CRC', systeme: 'CRM' },
        { _id: uid(), processus: 'Validation réponse sensible', macro: 'Conformité', niveau: 'N2', proprietaire: 'Conformité', systeme: 'GED / CRM' },
      ],
      flow: [
        { _id: uid(), label: 'Réclamation reçue', type: 'Événement', acteur: 'Client', systeme: '', painpoint: false },
        { _id: uid(), label: 'Saisie dans le CRM', type: 'Tâche', acteur: 'Agence / CRC', systeme: 'CRM', painpoint: false },
        { _id: uid(), label: 'Dossier complet ?', type: 'Décision', acteur: 'Réclamations', systeme: 'CRM', painpoint: true },
        { _id: uid(), label: 'Demande de compléments', type: 'Tâche', acteur: 'Réclamations', systeme: 'Email / CRM', painpoint: true },
        { _id: uid(), label: 'Analyse du motif', type: 'Tâche', acteur: 'Réclamations', systeme: 'CRM', painpoint: false },
        { _id: uid(), label: 'Avis expert requis ?', type: 'Décision', acteur: 'Réclamations', systeme: '', painpoint: true },
        { _id: uid(), label: 'Validation conformité', type: 'Contrôle', acteur: 'Conformité', systeme: 'GED', painpoint: false },
        { _id: uid(), label: 'Réponse envoyée', type: 'Tâche', acteur: 'Réclamations', systeme: 'CRM', painpoint: false },
      ],
      vsm: [
        { _id: uid(), etape: 'Saisie initiale', tempsTraitement: 12, tempsAttente: 0 },
        { _id: uid(), etape: 'Contrôle complétude', tempsTraitement: 18, tempsAttente: 1440 },
        { _id: uid(), etape: 'Analyse réclamation', tempsTraitement: 45, tempsAttente: 4320 },
        { _id: uid(), etape: 'Avis expert', tempsTraitement: 30, tempsAttente: 2880 },
        { _id: uid(), etape: 'Validation réponse', tempsTraitement: 20, tempsAttente: 1440 },
      ],
    },
    step4: {
      pareto: [
        { _id: uid(), cause: 'Dossier incomplet à l’entrée', occurrences: 48 },
        { _id: uid(), cause: 'Mauvaise qualification du motif', occurrences: 36 },
        { _id: uid(), cause: 'Attente avis expert métier', occurrences: 24 },
        { _id: uid(), cause: 'Validation conformité tardive', occurrences: 14 },
      ],
      ishikawa: {
        "Main d'œuvre": ['Niveaux de formation hétérogènes', 'Turnover au centre de relation client'],
        Méthode: ['Absence de check-list par motif', 'Priorisation non standardisée'],
        Matériel: ['CRM peu guidant', 'Pièces jointes dispersées'],
        Milieu: ['Pics de réclamations après incidents digitaux'],
        Matière: ['Demandes clients imprécises', 'Historique dossier incomplet'],
      },
      fivewhy: {
        probleme: 'Le délai moyen de traitement dépasse 18 jours ouvrés.',
        why1: 'Parce que de nombreux dossiers restent en attente de compléments ou d’avis métier.',
        why2: 'Parce que la qualification initiale ne détecte pas toujours les informations nécessaires.',
        why3: 'Parce que les conseillers ne disposent pas d’une check-list simple par motif.',
        why4: 'Parce que le CRM ne guide pas suffisamment la saisie selon le type de réclamation.',
        why5: 'Parce que les règles de complétude et de routage n’ont pas été standardisées.',
        causeRacine: 'Absence de qualification guidée et de routage automatique dès l’entrée de la réclamation.',
        action: 'Créer une qualification guidée par motif avec contrôle de complétude et orientation automatique.',
      },
      amdec: [
        { _id: uid(), mode: 'Réponse envoyée sans validation conformité', effet: 'Risque réglementaire et insatisfaction client', cause: 'Critères de sensibilité non visibles', F: 3, G: 9, D: 5, actions: 'Ajouter un tag de sensibilité et une validation bloquante' },
        { _id: uid(), mode: 'Mauvais motif CRM', effet: 'Mauvais routage et délai allongé', cause: 'Liste motifs trop large', F: 7, G: 5, D: 6, actions: 'Simplifier la nomenclature et guider la saisie' },
      ],
    },
    step5: {
      actions: [
        { _id: uid(), action: 'Créer une check-list de complétude par motif', impact: 9, effort: 3, responsable: 'Responsable Réclamations', echeance: '17/02/2027', statut: 'À faire' },
        { _id: uid(), action: 'Réduire et clarifier la nomenclature des motifs CRM', impact: 8, effort: 4, responsable: 'IT CRM', echeance: '03/03/2027', statut: 'À faire' },
        { _id: uid(), action: 'Mettre en place un routage automatique vers les experts', impact: 8, effort: 6, responsable: 'IT CRM / Métier', echeance: '20/03/2027', statut: 'À faire' },
        { _id: uid(), action: 'Créer un tableau de suivi des réclamations proches échéance', impact: 7, effort: 2, responsable: 'Service Réclamations', echeance: '24/02/2027', statut: 'En cours' },
      ],
    },
    step6: {
      flow: [
        { _id: uid(), label: 'Réclamation reçue', type: 'Événement', acteur: 'Client', systeme: '', painpoint: false },
        { _id: uid(), label: 'Saisie guidée par motif', type: 'Tâche', acteur: 'Agence / CRC', systeme: 'CRM', painpoint: false },
        { _id: uid(), label: 'Complétude OK ?', type: 'Décision', acteur: 'CRM', systeme: 'CRM', painpoint: false },
        { _id: uid(), label: 'Routage automatique', type: 'Tâche', acteur: 'CRM', systeme: 'CRM', painpoint: false },
        { _id: uid(), label: 'Analyse priorisée', type: 'Tâche', acteur: 'Réclamations', systeme: 'CRM', painpoint: false },
        { _id: uid(), label: 'Contrôle conformité si sensible', type: 'Contrôle', acteur: 'Conformité', systeme: 'GED', painpoint: false },
        { _id: uid(), label: 'Réponse tracée', type: 'Tâche', acteur: 'Réclamations', systeme: 'CRM', painpoint: false },
      ],
      businessCase: {
        gains: 124000,
        couts: 62000,
        risques: 'Charge de paramétrage CRM, adoption par les agences et nécessité de valider la nouvelle nomenclature avec conformité.',
      },
      roadmap: [
        { _id: uid(), phase: 'Nomenclature cible', debut: '23/02/2027', fin: '28/02/2027', responsable: 'Réclamations / Conformité', livrable: 'Catalogue motifs' },
        { _id: uid(), phase: 'Paramétrage CRM', debut: '01/03/2027', fin: '20/03/2027', responsable: 'IT CRM', livrable: 'Parcours guidé' },
        { _id: uid(), phase: 'Pilote sur 3 régions', debut: '23/03/2027', fin: '10/04/2027', responsable: 'Réseau / Réclamations', livrable: 'Bilan pilote' },
      ],
    },
    step7: {
      plan: [
        { _id: uid(), action: 'Former les conseillers à la qualification guidée', responsable: 'Formation Réseau', echeance: '20/03/2027', statut: 'À faire' },
        { _id: uid(), action: 'Déployer le tableau de suivi des échéances', responsable: 'Service Réclamations', echeance: '24/03/2027', statut: 'À faire' },
        { _id: uid(), action: 'Animer un point quotidien pendant le pilote', responsable: 'Process owner', echeance: '10/04/2027', statut: 'À faire' },
      ],
      changement: [
        { _id: uid(), item: 'Communiquer le nouveau standard de qualification', done: false },
        { _id: uid(), item: 'Former les référents agences et CRC', done: false },
        { _id: uid(), item: 'Mesurer les dossiers incomplets chaque semaine', done: false },
      ],
      recette: 'Pilote réalisé sur 420 réclamations : délai moyen ramené à 9,2 jours ouvrés, taux de dossiers complets à l’entrée porté à 86%, baisse visible des relances internes.',
    },
    step8: {
      kpis: [
        { _id: uid(), nom: 'Délai moyen de réponse', unite: 'jours ouvrés', cible: 8, actuel: 9.2, frequence: 'Hebdomadaire' },
        { _id: uid(), nom: 'Dossiers complets à l’entrée', unite: '%', cible: 90, actuel: 86, frequence: 'Hebdomadaire' },
        { _id: uid(), nom: 'Taux de relance interne', unite: '%', cible: 15, actuel: 21, frequence: 'Mensuel' },
        { _id: uid(), nom: 'Réponses dans le délai réglementaire', unite: '%', cible: 98, actuel: 96, frequence: 'Mensuel' },
      ],
      rituels: [
        { _id: uid(), nom: 'Revue hebdomadaire réclamations', frequence: 'Hebdomadaire', participants: 'Réclamations, Réseau, CRC', objet: 'Suivi délais, volumes et blocages' },
        { _id: uid(), nom: 'Comité expérience client', frequence: 'Mensuel', participants: 'Sponsor, Conformité, IT CRM', objet: 'Arbitrages et gains' },
      ],
      controle: [
        { _id: uid(), point: 'Contrôle complétude entrée', frequence: 'Hebdomadaire', responsable: 'Responsable Réclamations', seuil: 'Alerte si < 85%' },
        { _id: uid(), point: 'Dossiers proches échéance', frequence: 'Quotidien', responsable: 'Manager Réclamations', seuil: 'Aucun dossier sans action à J-2' },
      ],
      rex: 'Le gain principal vient de la qualification guidée et du routage automatique. La prochaine étape consiste à enrichir les modèles de réponse et à automatiser les notifications client sur l’avancement.',
    },
  };
}

function industrialAircraftData() {
  return {
    projectName: 'Réduction du temps d’immobilisation avion en maintenance',
    validated: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
    step0: {
      note: "Le processus de maintenance en ligne des avions moyen-courriers génère des temps d'immobilisation supérieurs à la cible opérationnelle, notamment lors des contrôles de fin de rotation et des interventions correctives courtes. Le projet couvre le flux entre l'arrivée avion au parking, le diagnostic technique, la disponibilité des pièces et la remise en service.",
      planning: [
        { _id: uid(), phase: 'Cadrage opérationnel', debut: '03/02/2027', fin: '14/02/2027', responsable: 'Responsable amélioration continue' },
        { _id: uid(), phase: 'Observation terrain piste et hangar', debut: '17/02/2027', fin: '28/02/2027', responsable: 'Équipe maintenance ligne' },
        { _id: uid(), phase: 'Cartographie et diagnostic', debut: '03/03/2027', fin: '21/03/2027', responsable: 'Process owner maintenance' },
        { _id: uid(), phase: 'Conception du standard cible', debut: '24/03/2027', fin: '11/04/2027', responsable: 'Maintenance + Logistique + Planning' },
        { _id: uid(), phase: 'Pilote sur escale principale', debut: '14/04/2027', fin: '09/05/2027', responsable: 'Chef d’escale technique' },
        { _id: uid(), phase: 'Déploiement multi-escales', debut: '12/05/2027', fin: 'Continu', responsable: 'Direction maintenance ligne' },
      ],
      parties: [
        { _id: uid(), nom: 'Directeur Maintenance Ligne', role: 'Sponsor', service: 'Maintenance aéronautique', interet: 'Favorable', influence: 'Fort' },
        { _id: uid(), nom: 'Chef d’escale technique', role: 'Pilote métier', service: 'Opérations piste', interet: 'Favorable', influence: 'Fort' },
        { _id: uid(), nom: 'Techniciens maintenance ligne', role: 'Utilisateurs clés', service: 'Maintenance', interet: 'Favorable', influence: 'Moyen' },
        { _id: uid(), nom: 'Responsable logistique pièces', role: 'Contributeur', service: 'Supply chain MRO', interet: 'Neutre', influence: 'Fort' },
        { _id: uid(), nom: 'Centre de contrôle opérations', role: 'Client interne', service: 'Operations Control Center', interet: 'Favorable', influence: 'Fort' },
        { _id: uid(), nom: 'Qualité / navigabilité', role: 'Contrôle', service: 'Qualité aéronautique', interet: 'Neutre', influence: 'Fort' },
      ],
    },
    step1: {
      charte: {
        titre: 'Réduction du temps d’immobilisation avion en maintenance',
        sponsor: 'Directeur Maintenance Ligne',
        probleme: 'Le temps moyen d’immobilisation technique après arrivée avion est de 96 minutes sur les rotations avec intervention, contre une cible opérationnelle de 65 minutes. Les principales causes sont l’attente diagnostic, la recherche de pièces et la coordination tardive avec les opérations.',
        objectifs: 'Ramener le temps moyen d’immobilisation à 70 minutes en 12 semaines, réduire de 35% les attentes pièces, fiabiliser le pré-brief maintenance avant arrivée avion et sécuriser la remise en service sans dégrader la conformité.',
        perimetreIn: 'Avions moyen-courriers, maintenance en ligne, interventions correctives courtes, escale principale et deux escales pilotes.',
        perimetreOut: 'Grandes visites hangar, modifications lourdes, opérations sous-traitées hors contrat local, incidents de sécurité majeurs.',
        contraintes: 'Exigences de navigabilité, disponibilité techniciens habilités, créneaux piste, dépendance aux stocks pièces et aux informations du carnet technique.',
        risques: 'Risque de raccourcir le délai au détriment du contrôle qualité, résistance au nouveau standard de pré-brief, disponibilité limitée des pièces critiques.',
        budget: '78 000 €',
        dateDebut: '03/02/2027',
        dateFin: '30/05/2027',
        gains: 'Réduction des retards imputables maintenance, meilleure utilisation flotte, baisse des coûts de repositionnement et amélioration de la ponctualité départ.',
      },
      sipoc: [
        { _id: uid(), supplier: 'Équipage / carnet technique', input: 'Signalement défaut et contexte vol', process: 'Remettre l’avion en service après intervention ligne', output: 'Avion libéré conforme', customer: 'Operations Control Center' },
        { _id: uid(), supplier: 'Maintenance ligne', input: 'Diagnostic, intervention, validation technique', process: 'Remettre l’avion en service après intervention ligne', output: 'Travaux réalisés et tracés', customer: 'Exploitation' },
        { _id: uid(), supplier: 'Logistique pièces MRO', input: 'Pièces, outillage, consommables', process: 'Remettre l’avion en service après intervention ligne', output: 'Matériel disponible au bon poste', customer: 'Techniciens maintenance' },
      ],
      raci: {
        roles: ['Maintenance ligne', 'Logistique MRO', 'Planning vols', 'Qualité', 'OCC'],
        activites: [
          { _id: uid(), nom: 'Préparer le dossier avant arrivée avion', assign: { 'Maintenance ligne': 'R', OCC: 'C', 'Planning vols': 'I' } },
          { _id: uid(), nom: 'Diagnostiquer le défaut', assign: { 'Maintenance ligne': 'R', Qualité: 'C' } },
          { _id: uid(), nom: 'Mettre à disposition pièces et outillage', assign: { 'Logistique MRO': 'R', 'Maintenance ligne': 'C' } },
          { _id: uid(), nom: 'Réaliser intervention et contrôles', assign: { 'Maintenance ligne': 'R', Qualité: 'A' } },
          { _id: uid(), nom: 'Arbitrer impact rotation suivante', assign: { OCC: 'A', 'Planning vols': 'R', 'Maintenance ligne': 'C' } },
        ],
      },
    },
    step2: {
      questions: [
        { _id: uid(), question: 'Quelles informations techniques sont disponibles avant l’arrivée avion ?' },
        { _id: uid(), question: 'À quel moment les pièces et outillages nécessaires sont-ils identifiés ?' },
        { _id: uid(), question: 'Quelles attentes sont les plus fréquentes pendant une intervention courte ?' },
        { _id: uid(), question: 'Comment les arbitrages entre maintenance et exploitation sont-ils décidés ?' },
        { _id: uid(), question: 'Quels contrôles qualité sont obligatoires avant remise en service ?' },
      ],
      journal: [
        { _id: uid(), date: '18/02/2027', lieu: 'Parking avion A32', observateur: 'Équipe amélioration', type: 'Gaspillage', constat: 'Les techniciens attendent en moyenne 14 minutes l’accès aux informations complètes du carnet technique.' },
        { _id: uid(), date: '20/02/2027', lieu: 'Magasin pièces piste', observateur: 'Process owner', type: 'Irritant', constat: 'Les pièces fréquentes ne sont pas toujours pré-positionnées malgré des défauts récurrents connus.' },
        { _id: uid(), date: '24/02/2027', lieu: 'Salle OCC', observateur: 'Équipe amélioration', type: 'Risque', constat: 'Les décisions de report ou substitution avion sont parfois prises sans visibilité temps réel sur l’avancement technique.' },
        { _id: uid(), date: '27/02/2027', lieu: 'Escale pilote', observateur: 'Chef d’escale technique', type: 'Bonne pratique', constat: 'Un briefing oral avant arrivée avion réduit fortement les recherches d’information pour les cas connus.' },
      ],
    },
    step3: {
      referentiel: [
        { _id: uid(), processus: 'Remise en service après intervention ligne', macro: 'Maintenance aéronautique', niveau: 'N1', proprietaire: 'Directeur Maintenance Ligne', systeme: 'MRO / Carnet technique' },
        { _id: uid(), processus: 'Préparation pièces et outillage', macro: 'Supply chain MRO', niveau: 'N2', proprietaire: 'Responsable logistique pièces', systeme: 'Stock MRO' },
        { _id: uid(), processus: 'Arbitrage opérationnel rotation', macro: 'Exploitation flotte', niveau: 'N2', proprietaire: 'OCC', systeme: 'Planning vols' },
      ],
      flow: [
        { _id: uid(), label: 'Avion annoncé en arrivée', type: 'Événement', acteur: 'OCC', systeme: 'Planning vols', painpoint: false },
        { _id: uid(), label: 'Pré-lecture défauts connus', type: 'Tâche', acteur: 'Maintenance ligne', systeme: 'MRO', painpoint: true },
        { _id: uid(), label: 'Pièces disponibles ?', type: 'Décision', acteur: 'Logistique MRO', systeme: 'Stock MRO', painpoint: true },
        { _id: uid(), label: 'Pré-positionner kit intervention', type: 'Tâche', acteur: 'Logistique MRO', systeme: 'Stock MRO', painpoint: false },
        { _id: uid(), label: 'Diagnostic au parking', type: 'Tâche', acteur: 'Technicien', systeme: 'MRO mobile', painpoint: false },
        { _id: uid(), label: 'Intervention réalisable avant départ ?', type: 'Décision', acteur: 'Chef équipe', systeme: '', painpoint: true },
        { _id: uid(), label: 'Contrôle qualité et libération', type: 'Contrôle', acteur: 'Qualité / Technicien habilité', systeme: 'MRO', painpoint: false },
        { _id: uid(), label: 'Avion remis en service', type: 'Événement', acteur: 'Maintenance', systeme: 'MRO', painpoint: false },
      ],
      vsm: [
        { _id: uid(), etape: 'Préparation informations', tempsTraitement: 8, tempsAttente: 18 },
        { _id: uid(), etape: 'Recherche pièces/outillage', tempsTraitement: 12, tempsAttente: 24 },
        { _id: uid(), etape: 'Diagnostic parking', tempsTraitement: 18, tempsAttente: 8 },
        { _id: uid(), etape: 'Intervention technique', tempsTraitement: 32, tempsAttente: 6 },
        { _id: uid(), etape: 'Contrôle et libération', tempsTraitement: 14, tempsAttente: 10 },
      ],
    },
    step4: {
      pareto: [
        { _id: uid(), cause: 'Pièces non pré-positionnées', occurrences: 39 },
        { _id: uid(), cause: 'Information défaut incomplète avant arrivée', occurrences: 31 },
        { _id: uid(), cause: 'Attente décision OCC', occurrences: 18 },
        { _id: uid(), cause: 'Outillage partagé indisponible', occurrences: 15 },
        { _id: uid(), cause: 'Double saisie MRO / rapport local', occurrences: 9 },
      ],
      ishikawa: {
        "Main d'œuvre": ['Habilitations techniciens non toujours alignées avec défauts prévus', 'Transmission orale variable selon équipes'],
        Méthode: ['Absence de pré-brief systématique', 'Pas de standard de kit pièces par défaut récurrent'],
        Matériel: ['Outillage critique partagé entre plusieurs parkings', 'Terminaux mobiles MRO disponibles en nombre limité'],
        Milieu: ['Pression départ à l’heure', 'Contraintes accès piste et météo'],
        Matière: ['Historique défaut incomplet', 'Stocks locaux non synchronisés en temps réel'],
      },
      fivewhy: {
        probleme: 'Le temps moyen d’immobilisation technique dépasse la cible de rotation.',
        why1: 'Parce que les techniciens attendent des informations, pièces ou décisions pendant l’intervention.',
        why2: 'Parce que la préparation avant arrivée avion n’est pas systématique.',
        why3: 'Parce que les défauts récurrents ne déclenchent pas automatiquement un kit et un briefing.',
        why4: 'Parce que les règles de pré-positionnement sont informelles et dépendantes de l’expérience locale.',
        why5: 'Parce que le processus n’a pas de standard commun entre maintenance, logistique et OCC.',
        causeRacine: 'Absence de standard de préparation anticipée intégrant défaut, pièces, habilitations et arbitrage opérationnel.',
        action: 'Créer un pré-brief maintenance standardisé avec kit pièces pré-positionné pour les défauts récurrents.',
      },
      amdec: [
        { _id: uid(), mode: 'Pièce critique indisponible au parking', effet: 'Retard départ ou substitution avion', cause: 'Absence de pré-positionnement', F: 7, G: 8, D: 5, actions: 'Créer kits défauts récurrents et alerte stock locale' },
        { _id: uid(), mode: 'Libération sans information complète', effet: 'Risque qualité ou reprise intervention', cause: 'Dossier incomplet dans MRO mobile', F: 3, G: 9, D: 4, actions: 'Contrôle bloquant de complétude avant clôture intervention' },
        { _id: uid(), mode: 'Décision opérationnelle tardive', effet: 'Retard en cascade sur rotation suivante', cause: 'Manque de visibilité temps réel OCC', F: 5, G: 7, D: 6, actions: 'Partager statut intervention et ETA technique à OCC' },
      ],
    },
    step5: {
      actions: [
        { _id: uid(), action: 'Mettre en place un pré-brief maintenance 30 minutes avant arrivée avion', impact: 9, effort: 3, responsable: 'Chef d’escale technique', echeance: '21/03/2027', statut: 'À faire' },
        { _id: uid(), action: 'Créer des kits pièces pour les 12 défauts récurrents', impact: 9, effort: 5, responsable: 'Logistique MRO', echeance: '04/04/2027', statut: 'À faire' },
        { _id: uid(), action: 'Afficher un statut temps réel intervention pour OCC', impact: 8, effort: 6, responsable: 'Maintenance + IT MRO', echeance: '18/04/2027', statut: 'À faire' },
        { _id: uid(), action: 'Standardiser la check-list de libération technique', impact: 7, effort: 2, responsable: 'Qualité', echeance: '28/03/2027', statut: 'En cours' },
        { _id: uid(), action: 'Réserver outillage critique par vague de rotations', impact: 6, effort: 4, responsable: 'Magasin piste', echeance: '11/04/2027', statut: 'À faire' },
      ],
    },
    step6: {
      flow: [
        { _id: uid(), label: 'Avion annoncé avec défaut', type: 'Événement', acteur: 'OCC', systeme: 'Planning vols', painpoint: false },
        { _id: uid(), label: 'Pré-brief standard 30 min avant arrivée', type: 'Tâche', acteur: 'Maintenance ligne', systeme: 'MRO', painpoint: false },
        { _id: uid(), label: 'Défaut récurrent ?', type: 'Décision', acteur: 'MRO', systeme: 'MRO', painpoint: false },
        { _id: uid(), label: 'Kit pièces pré-positionné', type: 'Tâche', acteur: 'Logistique MRO', systeme: 'Stock MRO', painpoint: false },
        { _id: uid(), label: 'Diagnostic guidé au parking', type: 'Tâche', acteur: 'Technicien', systeme: 'MRO mobile', painpoint: false },
        { _id: uid(), label: 'ETA technique partagé', type: 'Tâche', acteur: 'Chef équipe', systeme: 'Tableau OCC', painpoint: false },
        { _id: uid(), label: 'Contrôle qualité bloquant', type: 'Contrôle', acteur: 'Qualité', systeme: 'MRO', painpoint: false },
        { _id: uid(), label: 'Avion libéré', type: 'Événement', acteur: 'Maintenance', systeme: 'MRO', painpoint: false },
      ],
      businessCase: {
        gains: 310000,
        couts: 78000,
        risques: 'Le gain dépend de la discipline du pré-brief, de la fiabilité stock locale et de l’adoption du tableau de statut par OCC.',
      },
      roadmap: [
        { _id: uid(), phase: 'Définition des défauts récurrents', debut: '24/03/2027', fin: '28/03/2027', responsable: 'Maintenance ligne', livrable: 'Top 12 défauts et standards de traitement' },
        { _id: uid(), phase: 'Constitution kits pièces', debut: '31/03/2027', fin: '11/04/2027', responsable: 'Logistique MRO', livrable: 'Kits disponibles au magasin piste' },
        { _id: uid(), phase: 'Pilote escale principale', debut: '14/04/2027', fin: '09/05/2027', responsable: 'Chef d’escale technique', livrable: 'Bilan pilote et ajustements' },
        { _id: uid(), phase: 'Déploiement deux escales', debut: '12/05/2027', fin: '30/05/2027', responsable: 'Direction maintenance ligne', livrable: 'Standard multi-escales' },
      ],
    },
    step7: {
      plan: [
        { _id: uid(), action: 'Former chefs d’équipe au rituel de pré-brief', responsable: 'Responsable amélioration continue', echeance: '07/04/2027', statut: 'À faire' },
        { _id: uid(), action: 'Mettre en place le tableau de statut intervention', responsable: 'IT MRO', echeance: '14/04/2027', statut: 'À faire' },
        { _id: uid(), action: 'Lancer le pilote sur trois vagues de rotations', responsable: 'Chef d’escale technique', echeance: '18/04/2027', statut: 'À faire' },
        { _id: uid(), action: 'Réaliser audit qualité hebdomadaire', responsable: 'Qualité', echeance: '09/05/2027', statut: 'À faire' },
      ],
      changement: [
        { _id: uid(), item: 'Communiquer le standard de pré-brief aux équipes piste', done: false },
        { _id: uid(), item: 'Former magasin piste au fonctionnement des kits défauts', done: false },
        { _id: uid(), item: 'Mettre en place un retour quotidien maintenance / OCC', done: false },
        { _id: uid(), item: 'Documenter les exceptions et cas non couverts', done: false },
      ],
      recette: 'Pilote réalisé sur 64 rotations avec intervention : temps moyen d’immobilisation réduit de 96 à 73 minutes, 82% des kits disponibles avant arrivée avion, aucun écart qualité constaté sur les contrôles de libération.',
    },
    step8: {
      kpis: [
        { _id: uid(), nom: 'Temps moyen immobilisation technique', unite: 'minutes', cible: 70, actuel: 73, frequence: 'Hebdomadaire' },
        { _id: uid(), nom: 'Kits pièces disponibles avant arrivée', unite: '%', cible: 90, actuel: 82, frequence: 'Hebdomadaire' },
        { _id: uid(), nom: 'Retards imputables maintenance ligne', unite: 'nombre', cible: 8, actuel: 12, frequence: 'Mensuel' },
        { _id: uid(), nom: 'Pré-briefs réalisés à l’heure', unite: '%', cible: 95, actuel: 88, frequence: 'Hebdomadaire' },
      ],
      rituels: [
        { _id: uid(), nom: 'Point quotidien maintenance / OCC', frequence: 'Quotidien', participants: 'Maintenance ligne, OCC, Planning vols', objet: 'Rotations à risque et arbitrages' },
        { _id: uid(), nom: 'Revue hebdomadaire performance escale', frequence: 'Hebdomadaire', participants: 'Maintenance, Logistique MRO, Qualité', objet: 'KPI, incidents, actions correctives' },
      ],
      controle: [
        { _id: uid(), point: 'Check-list libération technique', frequence: 'Systématique', responsable: 'Technicien habilité', seuil: '100% interventions clôturées conformes' },
        { _id: uid(), point: 'Disponibilité kits défauts récurrents', frequence: 'Quotidien', responsable: 'Logistique MRO', seuil: 'Alerte si stock < seuil mini' },
        { _id: uid(), point: 'Écart temps cible par rotation', frequence: 'Hebdomadaire', responsable: 'Chef d’escale technique', seuil: 'Analyse si > 15 min de dépassement' },
      ],
      rex: 'Le standard de pré-brief et les kits défauts récurrents réduisent fortement les attentes non productives. Le prochain palier de performance dépendra de la synchronisation temps réel entre MRO mobile, stock local et tableau OCC.',
    },
  };
}

function insuranceClaimsData() {
  return {
    projectName: 'Optimisation du traitement des sinistres habitation',
    validated: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
    step0: {
      note: "Le processus de gestion des sinistres habitation présente des délais d'indemnisation élevés, des demandes de pièces répétées et une expérience client dégradée. Le projet couvre les sinistres simples et intermédiaires, de la déclaration à l'indemnisation, pour les dégâts des eaux, bris de glace et événements climatiques standards.",
      planning: [
        { _id: uid(), phase: 'Cadrage et périmètre', debut: '08/03/2027', fin: '19/03/2027', responsable: 'Chef de projet amélioration' },
        { _id: uid(), phase: 'Observation gestionnaires et experts', debut: '22/03/2027', fin: '02/04/2027', responsable: 'Équipe processus sinistres' },
        { _id: uid(), phase: 'Cartographie AS-IS', debut: '05/04/2027', fin: '23/04/2027', responsable: 'Process owner indemnisation' },
        { _id: uid(), phase: 'Conception parcours cible', debut: '26/04/2027', fin: '14/05/2027', responsable: 'Indemnisation + Digital + Réseau experts' },
        { _id: uid(), phase: 'Pilote portefeuille habitation', debut: '17/05/2027', fin: '11/06/2027', responsable: 'Responsable sinistres habitation' },
        { _id: uid(), phase: 'Déploiement et pilotage', debut: '14/06/2027', fin: 'Continu', responsable: 'Direction indemnisation' },
      ],
      parties: [
        { _id: uid(), nom: 'Directeur Indemnisation', role: 'Sponsor', service: 'Sinistres', interet: 'Favorable', influence: 'Fort' },
        { _id: uid(), nom: 'Responsable Sinistres Habitation', role: 'Pilote métier', service: 'Indemnisation habitation', interet: 'Favorable', influence: 'Fort' },
        { _id: uid(), nom: 'Gestionnaires sinistres', role: 'Utilisateurs clés', service: 'Back-office sinistres', interet: 'Favorable', influence: 'Moyen' },
        { _id: uid(), nom: 'Réseau experts partenaires', role: 'Contributeur externe', service: 'Expertise', interet: 'Neutre', influence: 'Fort' },
        { _id: uid(), nom: 'Équipe Digital Client', role: 'Contributeur', service: 'Digital', interet: 'Favorable', influence: 'Moyen' },
        { _id: uid(), nom: 'Contrôle interne', role: 'Contrôle', service: 'Risques / conformité', interet: 'Neutre', influence: 'Fort' },
      ],
    },
    step1: {
      charte: {
        titre: 'Optimisation du traitement des sinistres habitation',
        sponsor: 'Directeur Indemnisation',
        probleme: 'Le délai moyen entre déclaration et indemnisation est de 24 jours calendaires sur les sinistres habitation simples/intermédiaires, avec 41% de dossiers nécessitant au moins une relance de pièce et une forte variabilité selon les experts.',
        objectifs: 'Réduire le délai moyen à 12 jours calendaires, atteindre 85% de dossiers complets dès la première semaine, réduire de 40% les relances clients et standardiser les critères de passage en expertise.',
        perimetreIn: 'Dégâts des eaux, bris de glace habitation, événements climatiques standards, clients particuliers, canaux agence, téléphone et digital.',
        perimetreOut: 'Sinistres corporels, contentieux, fraude suspectée, catastrophes naturelles exceptionnelles, grands comptes professionnels.',
        contraintes: 'Obligations contractuelles, disponibilité experts, qualité des justificatifs, règles de délégation d’indemnisation.',
        risques: 'Risque de paiement non conforme, contestation client, surcharge des gestionnaires pendant le pilote, adoption insuffisante du parcours digital.',
        budget: '54 000 €',
        dateDebut: '08/03/2027',
        dateFin: '30/06/2027',
        gains: 'Baisse des coûts de gestion, réduction des appels entrants, amélioration de la satisfaction client et meilleure maîtrise des délais d’indemnisation.',
      },
      sipoc: [
        { _id: uid(), supplier: 'Assuré', input: 'Déclaration sinistre et justificatifs', process: 'Traiter un sinistre habitation', output: 'Décision et indemnisation', customer: 'Assuré' },
        { _id: uid(), supplier: 'Expert partenaire', input: 'Rapport d’expertise, photos, estimation', process: 'Traiter un sinistre habitation', output: 'Montant validé', customer: 'Gestionnaire sinistre' },
        { _id: uid(), supplier: 'Contrat / garanties', input: 'Conditions, franchises, plafonds', process: 'Traiter un sinistre habitation', output: 'Position de garantie', customer: 'Indemnisation' },
      ],
      raci: {
        roles: ['Gestionnaire', 'Expert', 'Digital', 'Contrôle interne', 'Comptabilité'],
        activites: [
          { _id: uid(), nom: 'Enregistrer la déclaration', assign: { Gestionnaire: 'R', Digital: 'C' } },
          { _id: uid(), nom: 'Vérifier garantie et complétude', assign: { Gestionnaire: 'R', 'Contrôle interne': 'C' } },
          { _id: uid(), nom: 'Déclencher expertise si nécessaire', assign: { Gestionnaire: 'R', Expert: 'A' } },
          { _id: uid(), nom: 'Valider montant d’indemnisation', assign: { Gestionnaire: 'R', 'Contrôle interne': 'A' } },
          { _id: uid(), nom: 'Effectuer le paiement', assign: { Comptabilité: 'R', Gestionnaire: 'I' } },
        ],
      },
    },
    step2: {
      questions: [
        { _id: uid(), question: 'Quelles informations manquent le plus souvent à la déclaration ?' },
        { _id: uid(), question: 'Quels critères déclenchent une expertise terrain ou à distance ?' },
        { _id: uid(), question: 'Combien de relances sont nécessaires avant dossier complet ?' },
        { _id: uid(), question: 'Quels blocages retardent la validation du montant indemnisable ?' },
        { _id: uid(), question: 'Comment le client suit-il l’avancement de son dossier ?' },
      ],
      journal: [
        { _id: uid(), date: '24/03/2027', lieu: 'Plateau gestion sinistres', observateur: 'Équipe processus', type: 'Gaspillage', constat: 'Les gestionnaires consultent en moyenne 4 écrans pour vérifier garantie, franchise et historique client.' },
        { _id: uid(), date: '28/03/2027', lieu: 'Cellule relation client', observateur: 'Process owner', type: 'Irritant', constat: 'Près d’un appel entrant sur trois concerne le suivi d’avancement d’un sinistre déjà déclaré.' },
        { _id: uid(), date: '31/03/2027', lieu: 'Réseau experts', observateur: 'Responsable sinistres', type: 'Risque', constat: 'Les délais de retour d’expertise varient de 3 à 12 jours selon région et type de dommage.' },
        { _id: uid(), date: '02/04/2027', lieu: 'Équipe digitale', observateur: 'Équipe processus', type: 'Bonne pratique', constat: 'Les dossiers avec photos et facture déposées dès la déclaration sont indemnisés deux fois plus vite.' },
      ],
    },
    step3: {
      referentiel: [
        { _id: uid(), processus: 'Gestion sinistre habitation', macro: 'Indemnisation', niveau: 'N1', proprietaire: 'Responsable Sinistres Habitation', systeme: 'SI Sinistres' },
        { _id: uid(), processus: 'Qualification garantie et complétude', macro: 'Indemnisation', niveau: 'N2', proprietaire: 'Gestionnaire sinistre', systeme: 'SI Contrats / Sinistres' },
        { _id: uid(), processus: 'Expertise dommage', macro: 'Réseau experts', niveau: 'N2', proprietaire: 'Responsable expertise', systeme: 'Portail expert' },
      ],
      flow: [
        { _id: uid(), label: 'Sinistre déclaré', type: 'Événement', acteur: 'Assuré', systeme: 'Digital / CRC', painpoint: false },
        { _id: uid(), label: 'Création dossier', type: 'Tâche', acteur: 'Gestionnaire', systeme: 'SI Sinistres', painpoint: false },
        { _id: uid(), label: 'Dossier complet ?', type: 'Décision', acteur: 'Gestionnaire', systeme: 'SI Sinistres', painpoint: true },
        { _id: uid(), label: 'Relance pièces client', type: 'Tâche', acteur: 'Gestionnaire', systeme: 'Email / SMS', painpoint: true },
        { _id: uid(), label: 'Expertise requise ?', type: 'Décision', acteur: 'Gestionnaire', systeme: '', painpoint: true },
        { _id: uid(), label: 'Rapport expert', type: 'Tâche', acteur: 'Expert', systeme: 'Portail expert', painpoint: true },
        { _id: uid(), label: 'Validation indemnité', type: 'Contrôle', acteur: 'Gestionnaire', systeme: 'SI Sinistres', painpoint: false },
        { _id: uid(), label: 'Paiement assuré', type: 'Tâche', acteur: 'Comptabilité', systeme: 'Paiement', painpoint: false },
      ],
      vsm: [
        { _id: uid(), etape: 'Déclaration et création dossier', tempsTraitement: 15, tempsAttente: 0 },
        { _id: uid(), etape: 'Contrôle complétude', tempsTraitement: 20, tempsAttente: 1440 },
        { _id: uid(), etape: 'Relance justificatifs', tempsTraitement: 8, tempsAttente: 4320 },
        { _id: uid(), etape: 'Expertise', tempsTraitement: 45, tempsAttente: 7200 },
        { _id: uid(), etape: 'Validation indemnité', tempsTraitement: 25, tempsAttente: 1440 },
        { _id: uid(), etape: 'Paiement', tempsTraitement: 10, tempsAttente: 720 },
      ],
    },
    step4: {
      pareto: [
        { _id: uid(), cause: 'Pièces justificatives manquantes', occurrences: 54 },
        { _id: uid(), cause: 'Attente rapport expert', occurrences: 37 },
        { _id: uid(), cause: 'Vérification garantie complexe', occurrences: 22 },
        { _id: uid(), cause: 'Client relancé plusieurs fois', occurrences: 18 },
        { _id: uid(), cause: 'Validation paiement tardive', occurrences: 11 },
      ],
      ishikawa: {
        "Main d'œuvre": ['Niveaux d’expérience gestionnaires hétérogènes', 'Charge élevée après épisodes climatiques'],
        Méthode: ['Check-list de pièces non adaptée au type de sinistre', 'Critères expertise peu explicites'],
        Matériel: ['SI sinistres non guidant', 'Portail expert non synchronisé en temps réel'],
        Milieu: ['Pics saisonniers de dégâts des eaux et événements météo'],
        Matière: ['Photos peu exploitables', 'Factures absentes ou incomplètes'],
      },
      fivewhy: {
        probleme: 'Le délai moyen d’indemnisation dépasse 24 jours calendaires.',
        why1: 'Parce que les dossiers restent souvent en attente de pièces ou de rapport expert.',
        why2: 'Parce que la complétude n’est pas vérifiée de façon guidée dès la déclaration.',
        why3: 'Parce que les pièces demandées ne sont pas personnalisées selon le type de sinistre.',
        why4: 'Parce que le parcours digital et le SI gestionnaire ne partagent pas une check-list commune.',
        why5: 'Parce que le processus cible de déclaration complète n’a pas été standardisé.',
        causeRacine: 'Absence de check-list dynamique par type de sinistre et manque de pilotage des délais experts.',
        action: 'Mettre en place une déclaration guidée avec pièces obligatoires et suivi automatique des rapports experts.',
      },
      amdec: [
        { _id: uid(), mode: 'Paiement sur dossier incomplet', effet: 'Risque financier et contestation', cause: 'Contrôle complétude non bloquant', F: 3, G: 8, D: 5, actions: 'Ajouter contrôle bloquant avant paiement' },
        { _id: uid(), mode: 'Expertise déclenchée trop tard', effet: 'Délai allongé et insatisfaction client', cause: 'Critères de déclenchement flous', F: 6, G: 6, D: 6, actions: 'Créer règles de routage expertise automatique' },
        { _id: uid(), mode: 'Relances client répétées', effet: 'Hausse appels entrants et NPS dégradé', cause: 'Demande initiale incomplète', F: 8, G: 4, D: 5, actions: 'Déclaration guidée et dépôt digital des pièces' },
      ],
    },
    step5: {
      actions: [
        { _id: uid(), action: 'Créer une check-list dynamique par type de sinistre', impact: 9, effort: 4, responsable: 'Indemnisation / Digital', echeance: '30/04/2027', statut: 'À faire' },
        { _id: uid(), action: 'Automatiser le suivi des rapports experts en retard', impact: 8, effort: 3, responsable: 'Responsable expertise', echeance: '07/05/2027', statut: 'À faire' },
        { _id: uid(), action: 'Définir les règles de passage expertise à distance', impact: 7, effort: 3, responsable: 'Sinistres habitation', echeance: '28/04/2027', statut: 'En cours' },
        { _id: uid(), action: 'Afficher le statut d’avancement côté client', impact: 8, effort: 6, responsable: 'Digital Client', echeance: '21/05/2027', statut: 'À faire' },
        { _id: uid(), action: 'Mettre en place un contrôle bloquant avant paiement', impact: 7, effort: 2, responsable: 'Contrôle interne', echeance: '12/05/2027', statut: 'À faire' },
      ],
    },
    step6: {
      flow: [
        { _id: uid(), label: 'Déclaration guidée', type: 'Événement', acteur: 'Assuré', systeme: 'Espace client', painpoint: false },
        { _id: uid(), label: 'Check-list dynamique', type: 'Tâche', acteur: 'SI Sinistres', systeme: 'Digital / SI', painpoint: false },
        { _id: uid(), label: 'Dossier complet ?', type: 'Décision', acteur: 'SI Sinistres', systeme: 'SI Sinistres', painpoint: false },
        { _id: uid(), label: 'Routage expertise automatique', type: 'Tâche', acteur: 'SI Sinistres', systeme: 'Portail expert', painpoint: false },
        { _id: uid(), label: 'Suivi SLA expert', type: 'Contrôle', acteur: 'Responsable expertise', systeme: 'Portail expert', painpoint: false },
        { _id: uid(), label: 'Validation indemnité guidée', type: 'Tâche', acteur: 'Gestionnaire', systeme: 'SI Sinistres', painpoint: false },
        { _id: uid(), label: 'Paiement et notification', type: 'Tâche', acteur: 'Comptabilité', systeme: 'Paiement / SMS', painpoint: false },
      ],
      businessCase: {
        gains: 185000,
        couts: 54000,
        risques: 'Dépendance aux évolutions du portail client, qualité des règles de routage expertise et capacité des experts partenaires à respecter les nouveaux SLA.',
      },
      roadmap: [
        { _id: uid(), phase: 'Définition check-list par sinistre', debut: '26/04/2027', fin: '07/05/2027', responsable: 'Indemnisation / Digital', livrable: 'Catalogue de pièces obligatoires' },
        { _id: uid(), phase: 'Paramétrage parcours digital', debut: '10/05/2027', fin: '28/05/2027', responsable: 'Digital Client', livrable: 'Déclaration guidée' },
        { _id: uid(), phase: 'Pilote dégâts des eaux', debut: '31/05/2027', fin: '11/06/2027', responsable: 'Responsable sinistres habitation', livrable: 'Bilan pilote' },
        { _id: uid(), phase: 'Extension bris de glace et météo', debut: '14/06/2027', fin: '30/06/2027', responsable: 'Direction indemnisation', livrable: 'Déploiement élargi' },
      ],
    },
    step7: {
      plan: [
        { _id: uid(), action: 'Former les gestionnaires au nouveau parcours guidé', responsable: 'Responsable sinistres habitation', echeance: '28/05/2027', statut: 'À faire' },
        { _id: uid(), action: 'Informer les experts des nouveaux SLA', responsable: 'Responsable expertise', echeance: '31/05/2027', statut: 'À faire' },
        { _id: uid(), action: 'Lancer pilote sur dégâts des eaux', responsable: 'Process owner indemnisation', echeance: '02/06/2027', statut: 'À faire' },
        { _id: uid(), action: 'Suivre les relances client chaque semaine', responsable: 'Manager indemnisation', echeance: '11/06/2027', statut: 'À faire' },
      ],
      changement: [
        { _id: uid(), item: 'Partager le standard de complétude aux équipes gestion', done: false },
        { _id: uid(), item: 'Mettre à jour les scripts relation client', done: false },
        { _id: uid(), item: 'Former les experts au portail et aux SLA', done: false },
        { _id: uid(), item: 'Mesurer l’adoption du dépôt digital des pièces', done: false },
      ],
      recette: 'Pilote réalisé sur 310 sinistres dégâts des eaux : délai moyen ramené de 24 à 13,5 jours, dossiers complets dès la première semaine à 81%, baisse de 32% des appels de suivi.',
    },
    step8: {
      kpis: [
        { _id: uid(), nom: 'Délai moyen déclaration-indemnisation', unite: 'jours', cible: 12, actuel: 13.5, frequence: 'Hebdomadaire' },
        { _id: uid(), nom: 'Dossiers complets première semaine', unite: '%', cible: 85, actuel: 81, frequence: 'Hebdomadaire' },
        { _id: uid(), nom: 'Rapports experts dans SLA', unite: '%', cible: 90, actuel: 84, frequence: 'Hebdomadaire' },
        { _id: uid(), nom: 'Appels de suivi par dossier', unite: 'nombre', cible: 0.7, actuel: 1.1, frequence: 'Mensuel' },
      ],
      rituels: [
        { _id: uid(), nom: 'Point sinistres à risque', frequence: 'Hebdomadaire', participants: 'Indemnisation, experts, digital', objet: 'Dossiers en retard et causes de blocage' },
        { _id: uid(), nom: 'Comité expérience assuré', frequence: 'Mensuel', participants: 'Sponsor, relation client, contrôle interne', objet: 'KPI, NPS et conformité indemnisation' },
      ],
      controle: [
        { _id: uid(), point: 'Complétude avant paiement', frequence: 'Systématique', responsable: 'Gestionnaire sinistre', seuil: '100% dossiers contrôlés' },
        { _id: uid(), point: 'Respect SLA expert', frequence: 'Hebdomadaire', responsable: 'Responsable expertise', seuil: 'Alerte si < 85%' },
        { _id: uid(), point: 'Dossiers sans action depuis 5 jours', frequence: 'Quotidien', responsable: 'Manager indemnisation', seuil: '0 dossier sans justification' },
      ],
      rex: 'La déclaration guidée réduit fortement les retours client et améliore la qualité des dossiers. Les gains restants dépendront de la maîtrise des délais experts et de l’adoption du suivi digital par les assurés.',
    },
  };
}

function dmaicComplaintData() {
  const completenessFactorId = uid();
  const complexityFactorId = uid();
  const measuredData = [
    { date: '1', valeur: 21, segment: 'Agence', facteurA: 4, facteurB: 3, commentaire: 'Dossier incomplet, avis metier tardif' },
    { date: '2', valeur: 18, segment: 'Digital', facteurA: 3, facteurB: 2, commentaire: 'Pieces client manquantes' },
    { date: '3', valeur: 12, segment: 'CRC', facteurA: 1, facteurB: 1, commentaire: 'Motif simple, dossier complet' },
    { date: '4', valeur: 24, segment: 'Agence', facteurA: 5, facteurB: 4, commentaire: 'Escalade conformite' },
    { date: '5', valeur: 16, segment: 'Digital', facteurA: 2, facteurB: 2, commentaire: 'Requalification du motif' },
    { date: '6', valeur: 20, segment: 'Agence', facteurA: 4, facteurB: 3, commentaire: 'Attente expertise cartes' },
    { date: '7', valeur: 11, segment: 'CRC', facteurA: 1, facteurB: 1, commentaire: 'Reponse standard disponible' },
    { date: '8', valeur: 15, segment: 'Digital', facteurA: 2, facteurB: 2, commentaire: 'Complement recu rapidement' },
    { date: '9', valeur: 27, segment: 'Agence', facteurA: 5, facteurB: 5, commentaire: 'Dossier multi-produits' },
    { date: '10', valeur: 13, segment: 'CRC', facteurA: 2, facteurB: 1, commentaire: 'Traitement direct' },
    { date: '11', valeur: 19, segment: 'Digital', facteurA: 3, facteurB: 3, commentaire: 'Avis metier requis' },
    { date: '12', valeur: 22, segment: 'Agence', facteurA: 4, facteurB: 4, commentaire: 'Relance agence' },
    { date: '13', valeur: 10, segment: 'CRC', facteurA: 1, facteurB: 1, commentaire: 'Dossier qualifie' },
    { date: '14', valeur: 17, segment: 'Digital', facteurA: 3, facteurB: 2, commentaire: 'Piece jointe illisible' },
    { date: '15', valeur: 23, segment: 'Agence', facteurA: 5, facteurB: 3, commentaire: 'Validation tardive' },
    { date: '16', valeur: 14, segment: 'CRC', facteurA: 2, facteurB: 2, commentaire: 'Controle simple' },
    { date: '17', valeur: 26, segment: 'Agence', facteurA: 5, facteurB: 5, commentaire: 'Litige complexe' },
    { date: '18', valeur: 12, segment: 'Digital', facteurA: 1, facteurB: 1, commentaire: 'Parcours complet' },
    { date: '19', valeur: 18, segment: 'CRC', facteurA: 3, facteurB: 2, commentaire: 'Attente historique compte' },
    { date: '20', valeur: 21, segment: 'Agence', facteurA: 4, facteurB: 3, commentaire: 'Motif mal code' },
  ].map(row => ({
    _id: uid(),
    ...row,
    factorValues: {
      [completenessFactorId]: row.facteurA,
      [complexityFactorId]: row.facteurB,
    },
  }));

  return {
    ...blankData(),
    projectName: 'Reduction des delais de traitement des reclamations clients',
    validated: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
    step0: {
      note: "Projet DMAIC visant a reduire le delai de traitement des reclamations clients sur les canaux agence, centre de relation client et digital. Le probleme principal est une forte variabilite du delai de reponse, liee a la qualite de qualification initiale, aux complements clients et aux avis metiers.",
      planning: [
        { _id: uid(), phase: 'Define', debut: '05/01/2027', fin: '16/01/2027', responsable: 'Green Belt / Process owner' },
        { _id: uid(), phase: 'Measure', debut: '19/01/2027', fin: '06/02/2027', responsable: 'Data analyst / Reclamations' },
        { _id: uid(), phase: 'Analyze', debut: '09/02/2027', fin: '27/02/2027', responsable: 'Equipe DMAIC' },
        { _id: uid(), phase: 'Improve', debut: '02/03/2027', fin: '27/03/2027', responsable: 'Metier + IT CRM' },
        { _id: uid(), phase: 'Control', debut: '30/03/2027', fin: '17/04/2027', responsable: 'Responsable Reclamations' },
      ],
      parties: [
        { _id: uid(), nom: 'Directeur Experience Client', role: 'Sponsor', service: 'Relation client', interet: 'Favorable', influence: 'Fort' },
        { _id: uid(), nom: 'Responsable Reclamations', role: 'Process owner', service: 'Reclamations', interet: 'Favorable', influence: 'Fort' },
        { _id: uid(), nom: 'Data analyst', role: 'Mesure statistique', service: 'Pilotage', interet: 'Favorable', influence: 'Moyen' },
        { _id: uid(), nom: 'IT CRM', role: 'Contributeur solution', service: 'Systemes client', interet: 'Neutre', influence: 'Moyen' },
        { _id: uid(), nom: 'Conformite', role: 'Controle', service: 'Conformite', interet: 'Neutre', influence: 'Fort' },
      ],
    },
    step1: {
      charte: {
        titre: 'Reduction des delais de traitement des reclamations clients',
        sponsor: 'Directeur Experience Client',
        probleme: 'Le delai moyen de reponse aux reclamations est de 18 jours ouvres, avec une cible operationnelle a 8 jours. 32% des dossiers necessitent au moins une relance ou un complement.',
        objectifs: 'Reduire le delai moyen a 8 jours ouvres, atteindre 85% de dossiers complets des la reception et reduire de 50% les relances clients avant le 17/04/2027.',
        perimetreIn: 'Reclamations clients particuliers : frais, cartes, virements, acces digital et qualite de service, recues via agence, CRC et digital.',
        perimetreOut: 'Contentieux, mediation externe, fraude averee, reclamations entreprises et dossiers reglementaires complexes hors delai standard.',
        contraintes: 'Respect des delais reglementaires, disponibilite des experts metiers, qualite des donnees CRM et capacite de parametrage IT.',
        risques: 'Sous-qualification initiale, adoption insuffisante par les agences, qualite variable des pieces jointes, surcharge temporaire pendant le pilote.',
        budget: '48 000 EUR',
        dateDebut: '05/01/2027',
        dateFin: '17/04/2027',
        gains: 'Baisse des relances, reduction du cout de traitement, diminution des appels entrants et amelioration du NPS post-reclamation.',
      },
      sipoc: [
        { _id: uid(), supplier: 'Client / Agence / Digital', input: 'Reclamation, motif, pieces justificatives', process: 'Traiter une reclamation client', output: 'Reponse argumentee et tracee', customer: 'Client' },
        { _id: uid(), supplier: 'Service Reclamations', input: 'Qualification, priorite, historique', process: 'Analyser et orienter le dossier', output: 'Decision de traitement', customer: 'Expert metier' },
        { _id: uid(), supplier: 'Expert metier / Conformite', input: 'Avis technique ou reglementaire', process: 'Valider la reponse finale', output: 'Reponse conforme', customer: 'Service Reclamations' },
      ],
      raci: {
        roles: ['Agence / CRC', 'Reclamations', 'Expert metier', 'Conformite', 'IT CRM'],
        activites: [
          { _id: uid(), nom: 'Enregistrer la reclamation', assign: { 'Agence / CRC': 'R', Reclamations: 'A' } },
          { _id: uid(), nom: 'Qualifier motif et priorite', assign: { 'Agence / CRC': 'R', Reclamations: 'A', Conformite: 'C' } },
          { _id: uid(), nom: 'Analyser le dossier', assign: { Reclamations: 'R', 'Expert metier': 'C' } },
          { _id: uid(), nom: 'Valider la reponse', assign: { Reclamations: 'R', Conformite: 'A' } },
          { _id: uid(), nom: 'Parametrer les motifs CRM', assign: { 'IT CRM': 'R', Reclamations: 'A' } },
        ],
      },
    },
    dmaic: {
      define: {
        problem: 'Le delai de traitement des reclamations clients depasse la cible interne. La moyenne observee est de 18 jours ouvres avec une forte dispersion selon le canal et le niveau de completude du dossier.',
        customer: 'Les clients attendent une reponse rapide, une information claire sur le statut et une seule demande de pieces. Les agences attendent un circuit simple pour qualifier correctement les dossiers.',
        ctq: 'CTQ principaux : delai de reponse en jours ouvres, taux de dossiers complets a reception, nombre de relances par dossier, taux de reponses conformes et satisfaction post-reclamation.',
        goal: 'Passer de 18 a 8 jours ouvres de delai moyen, reduire les relances de 50%, atteindre 85% de dossiers complets a reception et stabiliser le processus sous 10 jours pour les motifs standards.',
        scope: 'Inclus : reclamations particuliers sur frais, cartes, virements, acces digital et qualite de service. Exclus : mediation, contentieux, fraude, entreprises et dossiers exceptionnels.',
        team: 'Sponsor : Directeur Experience Client. Pilote DMAIC : Green Belt Process. Process owner : Responsable Reclamations. Contributeurs : agences, CRC, conformite, experts metiers, IT CRM, data analyst.',
        businessCase: 'Enjeu estime : 120 000 EUR/an via baisse des relances, reduction du temps de traitement, diminution des appels entrants et amelioration de la retention client.',
        voc: [
          { _id: uid(), client: 'Client final', verbatim: "Je dois relancer plusieurs fois pour savoir ou en est ma reclamation.", besoin: 'Visibilite et delai de reponse court', ctq: 'Delai moyen et taux de relance', priorite: 'Haute' },
          { _id: uid(), client: 'Agence', verbatim: "Nous ne savons pas toujours quel motif choisir dans le CRM.", besoin: 'Qualification guidee', ctq: 'Taux de dossiers bien qualifies', priorite: 'Haute' },
          { _id: uid(), client: 'Service Reclamations', verbatim: "Les pieces arrivent incompletes ou mal rattachees.", besoin: 'Dossier complet des la reception', ctq: 'Taux de completude initiale', priorite: 'Haute' },
          { _id: uid(), client: 'Conformite', verbatim: "Les reponses doivent rester homogenes et tracables.", besoin: 'Reponse standardisee et conforme', ctq: 'Taux de reponses conformes', priorite: 'Moyenne' },
        ],
        sipoc: [
          { _id: uid(), suppliers: 'Client, agence, CRC, canal digital', inputs: 'Motif, description, pieces, historique client', process: 'Enregistrer > qualifier > analyser > valider > repondre', outputs: 'Reponse finale, action corrective, trace CRM', customers: 'Client, agence, conformite' },
          { _id: uid(), suppliers: 'Experts metiers', inputs: 'Avis operationnel, justificatifs, decision', process: 'Analyser le fond du litige', outputs: 'Avis metier documente', customers: 'Service Reclamations' },
        ],
        swot: [
          { _id: uid(), type: 'Force', element: 'CRM deja utilise par tous les canaux', action: 'Capitaliser sur un outil unique' },
          { _id: uid(), type: 'Faiblesse', element: 'Motifs de reclamation trop nombreux et mal distingues', action: 'Simplifier et guider la qualification' },
          { _id: uid(), type: 'Opportunite', element: 'Automatisation possible des relances et SLA', action: 'Parametrer alertes et routage' },
          { _id: uid(), type: 'Menace', element: 'Risque reglementaire si reponse tardive', action: 'Mettre des seuils de controle et escalade' },
        ],
        raci: {
          roles: ['Agence/CRC', 'Reclamations', 'Expert metier', 'Conformite', 'IT CRM'],
          activites: [
            { _id: uid(), nom: 'Qualifier la reclamation', assign: { 'Agence/CRC': 'R', Reclamations: 'A', Conformite: 'C' } },
            { _id: uid(), nom: 'Collecter les pieces', assign: { 'Agence/CRC': 'R', Reclamations: 'A' } },
            { _id: uid(), nom: 'Analyser le dossier', assign: { Reclamations: 'R', 'Expert metier': 'C' } },
            { _id: uid(), nom: 'Valider la reponse sensible', assign: { Reclamations: 'R', Conformite: 'A' } },
            { _id: uid(), nom: 'Parametrer les alertes SLA', assign: { 'IT CRM': 'R', Reclamations: 'A' } },
          ],
        },
      },
      measure: {
        baseline: 'Periode observee : 20 dossiers representatifs sur 4 semaines. Moyenne = 17,95 jours ouvres, ecart type eleve, plusieurs dossiers au-dessus de 20 jours. La cible operationnelle est 8 jours, limite haute acceptable 10 jours.',
        labels: {
          y: 'Delai de traitement reclamation',
          unit: 'jours ouvres',
          direction: 'Reduire',
          objective: 'Passer de 18 jours ouvres a 8 jours ouvres en securisant la qualite de reponse.',
          segment: 'Canal d entree',
          x1: 'Score de completude initiale',
          x2: 'Score complexite / escalade',
        },
        factors: [
          { _id: completenessFactorId, name: 'Score de completude initiale', type: 'Numerique', description: 'Score 1 a 5 : plus le score est eleve, plus le dossier est incomplet.' },
          { _id: complexityFactorId, name: 'Score complexite / escalade', type: 'Numerique', description: 'Score 1 a 5 : avis metier, conformite ou multi-produit.' },
        ],
        kpis: [
          { _id: uid(), nom: 'Delai de traitement reclamation', definition: 'Nombre de jours ouvres entre reception et reponse finale', baseline: '18 jours', cible: '8 jours', source: 'CRM Reclamations' },
          { _id: uid(), nom: 'Dossiers complets a reception', definition: 'Dossiers avec motif, pieces et historique disponibles des l entree', baseline: '58%', cible: '85%', source: 'Controle qualite CRM' },
          { _id: uid(), nom: 'Nombre de relances par dossier', definition: 'Relances client ou agence avant reponse finale', baseline: '1,8', cible: '0,8', source: 'CRM / Emails' },
          { _id: uid(), nom: 'Reponses conformes', definition: 'Reponses respectant modele, delai et justification', baseline: '91%', cible: '98%', source: 'Controle conformite' },
        ],
        collectionPlan: [
          { _id: uid(), mesure: 'Delai Y', definition: 'Jours ouvres entre creation CRM et reponse finale envoyee', unite: 'jours', source: 'CRM', frequence: 'Hebdomadaire', responsable: 'Data analyst' },
          { _id: uid(), mesure: 'Completude X1', definition: 'Score 1 a 5 selon pieces, motif et historique disponibles', unite: 'score', source: 'Controle dossier', frequence: 'Hebdomadaire', responsable: 'Responsable qualite' },
          { _id: uid(), mesure: 'Complexite / escalade X2', definition: 'Score 1 a 5 selon avis metier, conformite ou multi-produit', unite: 'score', source: 'CRM', frequence: 'Hebdomadaire', responsable: 'Service Reclamations' },
          { _id: uid(), mesure: 'Segment', definition: 'Canal d entree : Agence, CRC ou Digital', unite: 'categorie', source: 'CRM', frequence: 'Hebdomadaire', responsable: 'Data analyst' },
        ],
        data: measuredData,
        spec: { lsl: '0', usl: '10', target: '8' },
        msa: 'Extraction CRM controlee sur 20 dossiers. Definition de la date de debut et date de fin alignee avec le process owner. Fiabilite suffisante pour diagnostic initial.',
        normality: 'La distribution est legerement asymetrique avec quelques dossiers longs. QQ plot a surveiller ; l analyse reste exploitable pour un diagnostic operationnel.',
        capabilityConclusion: 'Avec une limite haute de 10 jours, le processus est incapable dans son etat initial : moyenne trop elevee, dispersion importante et Cpk attendu inferieur a 1.',
        controlChartConclusion: 'Les cartes X/MR montrent une variabilite forte et des ruptures liees aux dossiers incomplets ou escalades. Le processus doit etre stabilise avant generalisation.',
      },
      analyze: {
        observations: 'Les dossiers Agence et les dossiers avec score X1/X2 eleve sont les plus longs. La completude initiale et le besoin d avis metier expliquent une part importante du delai.',
        causes: [
          { _id: uid(), cause: 'Qualification initiale incomplete', preuve: 'Correlation positive entre score X1 et delai Y', impact: 'Fort', validation: 'Validee' },
          { _id: uid(), cause: 'Avis metier ou conformite tardif', preuve: 'Dossiers avec X2 eleve depassent souvent 20 jours', impact: 'Fort', validation: 'Validee' },
          { _id: uid(), cause: 'Motifs CRM trop nombreux', preuve: 'Requalification frequente observee en agence', impact: 'Moyen', validation: 'Validee' },
          { _id: uid(), cause: 'Absence d alerte SLA', preuve: 'Dossiers sans action pendant plusieurs jours', impact: 'Moyen', validation: 'A confirmer' },
        ],
        pareto: [
          { _id: uid(), cause: 'Dossier incomplet a reception', occurrences: 46 },
          { _id: uid(), cause: 'Attente avis metier', occurrences: 31 },
          { _id: uid(), cause: 'Motif CRM mal qualifie', occurrences: 24 },
          { _id: uid(), cause: 'Validation conformite tardive', occurrences: 14 },
          { _id: uid(), cause: 'Relance client non automatisee', occurrences: 11 },
        ],
        ishikawa: {
          "Main d'oeuvre": ['Formation heterogene des agences', 'Appropriation variable des motifs CRM'],
          Methode: ['Absence de check-list par motif', 'Pas de seuil d escalade standardise'],
          Materiel: ['CRM peu guidant', 'Pieces jointes parfois mal rattachees'],
          Milieu: ['Pics apres incidents digitaux', 'Charge variable selon canal'],
          Matiere: ['Demandes clients imprecises', 'Historique dossier incomplet'],
        },
        fivewhy: {
          probleme: 'Le delai moyen de traitement depasse 18 jours ouvres.',
          why1: 'Parce que de nombreux dossiers restent en attente de complements ou d avis metier.',
          why2: 'Parce que la qualification initiale ne detecte pas toujours les informations necessaires.',
          why3: 'Parce que les conseillers ne disposent pas d une check-list simple par motif.',
          why4: 'Parce que le CRM ne guide pas suffisamment la saisie selon le type de reclamation.',
          why5: 'Parce que les regles de completude et de routage n ont pas ete standardisees.',
          causeRacine: 'Absence de qualification guidee et de routage automatique des l entree de la reclamation.',
          action: 'Creer une qualification guidee par motif avec controle de completude et orientation automatique.',
        },
        statTests: [
          { _id: uid(), hypothese: 'Les dossiers Agence sont plus longs que les dossiers Digital/CRC', test: 'ANOVA', pvalue: '0.018', decision: 'Effet significatif', commentaire: 'Le canal d entree influence le delai de traitement.' },
          { _id: uid(), hypothese: 'Le score de completude X1 influence le delai Y', test: 'Regression', pvalue: '0.004', decision: 'Effet significatif', commentaire: 'Plus le dossier est incomplet, plus le delai augmente.' },
          { _id: uid(), hypothese: 'Le score d escalade X2 influence le delai Y', test: 'Regression', pvalue: '0.011', decision: 'Effet significatif', commentaire: 'Les avis metiers/conformite sont un levier majeur.' },
        ],
        regression: {
          equation: 'Y = 7,2 + 2,7*X1 + 1,6*X2',
          r2: 'R2 estime = 0,78 ; R2 ajuste = 0,75',
          conclusion: 'Le modele confirme que la completude initiale et la complexite/escalade expliquent l essentiel du delai. Les leviers prioritaires sont la qualification guidee, les pieces obligatoires et les alertes SLA.',
        },
      },
      improve: {
        target: 'Processus cible : qualification guidee par motif, controle de completude obligatoire, routage automatique vers expert/conformite si necessaire, alertes SLA et modele de reponse standardise.',
        solutions: [
          { _id: uid(), solution: 'Check-list dynamique par motif CRM', impact: 'Reduction des dossiers incomplets', effort: 'Moyen', responsable: 'IT CRM / Reclamations', statut: 'A faire' },
          { _id: uid(), solution: 'Routage automatique vers expert metier', impact: 'Baisse des attentes non pilotees', effort: 'Moyen', responsable: 'IT CRM', statut: 'A faire' },
          { _id: uid(), solution: 'Alertes SLA a J+5 et J+8', impact: 'Prevention des dossiers longs', effort: 'Faible', responsable: 'Pilotage', statut: 'A faire' },
          { _id: uid(), solution: 'Bibliotheque de reponses conformes', impact: 'Homogeneite et gain de temps', effort: 'Faible', responsable: 'Conformite', statut: 'En cours' },
        ],
        impactEffort: [
          { _id: uid(), action: 'Check-list dynamique', impact: '9', effort: '5', gain: 'Fort', risque: 'Adoption agence' },
          { _id: uid(), action: 'Alertes SLA', impact: '8', effort: '2', gain: 'Rapide', risque: 'Trop d alertes' },
          { _id: uid(), action: 'Routage automatique', impact: '8', effort: '6', gain: 'Fort', risque: 'Parametrage complexe' },
          { _id: uid(), action: 'Modeles de reponse', impact: '6', effort: '2', gain: 'Moyen', risque: 'Mise a jour continue' },
        ],
        actionPlan: [
          { _id: uid(), action: 'Redefinir les 12 motifs prioritaires', responsable: 'Responsable Reclamations', debut: '02/03/2027', fin: '06/03/2027', statut: 'A faire', preuve: 'Catalogue motifs valide' },
          { _id: uid(), action: 'Construire les check-lists de pieces par motif', responsable: 'Reclamations + Conformite', debut: '09/03/2027', fin: '13/03/2027', statut: 'A faire', preuve: 'Check-lists validees' },
          { _id: uid(), action: 'Parametrer alertes SLA dans CRM', responsable: 'IT CRM', debut: '16/03/2027', fin: '24/03/2027', statut: 'A faire', preuve: 'Tests CRM OK' },
          { _id: uid(), action: 'Piloter sur 50 dossiers', responsable: 'Green Belt', debut: '25/03/2027', fin: '03/04/2027', statut: 'A faire', preuve: 'Bilan pilote' },
        ],
        pilot: 'Pilote prevu sur 50 reclamations standards. Cible pilote : delai moyen <= 10 jours, 80% de dossiers complets a reception, aucune reclamation sans action plus de 5 jours.',
        riskMitigation: 'Prevoir formation courte des agences, support CRM pendant 2 semaines, revue conformite des modeles de reponse et ajustement des alertes si le volume devient trop important.',
      },
      control: {
        standard: 'Le standard cible impose une qualification par motif, une check-list obligatoire, un routage automatique pour dossiers complexes et une revue hebdomadaire des dossiers au-dessus de J+8.',
        plan: [
          { _id: uid(), controle: 'Dossiers complets a reception', frequence: 'Hebdomadaire', responsable: 'Responsable qualite', seuil: '< 80%', reaction: 'Revue motifs et formation canal concerne' },
          { _id: uid(), controle: 'Dossiers sans action depuis 5 jours', frequence: 'Quotidien', responsable: 'Manager Reclamations', seuil: '> 0 dossier', reaction: 'Escalade au responsable de file' },
          { _id: uid(), controle: 'Respect delai cible 10 jours', frequence: 'Hebdomadaire', responsable: 'Process owner', seuil: '< 85%', reaction: 'Analyse causes et plan correctif' },
          { _id: uid(), controle: 'Conformite des reponses', frequence: 'Mensuel', responsable: 'Conformite', seuil: '< 98%', reaction: 'Revue modele et correction' },
        ],
        kpis: [
          { _id: uid(), nom: 'Delai moyen de traitement', unite: 'jours', cible: '8', actuel: '10.2', frequence: 'Hebdomadaire', owner: 'Process owner' },
          { _id: uid(), nom: 'Dossiers complets a reception', unite: '%', cible: '85', actuel: '79', frequence: 'Hebdomadaire', owner: 'Responsable qualite' },
          { _id: uid(), nom: 'Relances par dossier', unite: 'nombre', cible: '0.8', actuel: '1.0', frequence: 'Mensuel', owner: 'Manager Reclamations' },
          { _id: uid(), nom: 'Reponses conformes', unite: '%', cible: '98', actuel: '96', frequence: 'Mensuel', owner: 'Conformite' },
        ],
        reactionPlan: 'Si le delai moyen depasse 10 jours deux semaines consecutives : revue Pareto des dossiers longs, identification du canal concerne, action corrective sous 10 jours et suivi en comite operationnel.',
        businessImpact: 'Impact attendu : gain annuel estime 120 000 EUR, baisse de 50% des relances, reduction des appels entrants et amelioration de la satisfaction post-reclamation.',
        conclusion: 'Le DMAIC met en evidence un processus initialement incapable et trop variable. Les causes majeures sont la completude initiale et les escalades non pilotees. Les solutions prioritaires portent sur la qualification guidee, les alertes SLA et la standardisation des reponses.',
      },
    },
  };
}

function ensureExampleProjects(projects) {
  const list = Array.isArray(projects) ? projects.filter(project => project && typeof project === 'object') : [];
  return list.filter(project => !isExampleProject(project));
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

function DmaicHint({ children }) {
  return <p className="dmaic-hint">{children}</p>;
}

function EditableTable({ columns, rows, onAdd, onRemove, onChange, addLabel }) {
  const valueOf = (row, column) => column.getValue ? column.getValue(row) : row[column.key];
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
                    <select value={valueOf(row, c) || ''} onChange={e => onChange(ri, c.key, e.target.value)}>
                      <option value="">—</option>
                      {c.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : c.type === 'number' ? (
                    <input type="number" min={c.min} max={c.max} value={valueOf(row, c) ?? ''} onChange={e => onChange(ri, c.key, e.target.value)} />
                  ) : c.type === 'textarea' ? (
                    <textarea rows={2} value={valueOf(row, c) || ''} onChange={e => onChange(ri, c.key, e.target.value)} />
                  ) : (
                    <input type="text" value={valueOf(row, c) || ''} onChange={e => onChange(ri, c.key, e.target.value)} />
                  )}
                </td>
              ))}
              <td><button className="row-del" onClick={() => onRemove(ri)} title="Supprimer la ligne">×</button></td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td className="empty-row" colSpan={columns.length + 1}><span>Aucune donnée pour le moment</span><small>Ajoutez une première ligne pour structurer cette section.</small></td></tr>
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

function BpmnAdvancedEditor({ value, viewbox, onChange, onViewboxChange, projectName, layoutKey }) {
  const canvasRef = useRef(null);
  const modelerRef = useRef(null);
  const fileRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const onViewboxChangeRef = useRef(onViewboxChange);
  const lastViewboxRef = useRef(viewbox || null);
  const resizingRef = useRef(false);
  const [status, setStatus] = useState('Chargement de l’éditeur BPMN…');
  const [selectedElements, setSelectedElements] = useState([]);
  const diagramXml = value || defaultBpmnXml(projectName);
  const resizeEditor = useCallback((fit = false) => {
    const modeler = modelerRef.current;
    if (!modeler) return;
    const canvas = modeler.get('canvas');
    const previousViewbox = lastViewboxRef.current || canvas.viewbox();
    resizingRef.current = true;
    canvas.resized();
    if (fit) {
      canvas.zoom('fit-viewport', 'auto');
      lastViewboxRef.current = canvas.viewbox();
      onViewboxChangeRef.current?.(lastViewboxRef.current);
    } else {
      canvas.viewbox(previousViewbox);
    }
    requestAnimationFrame(() => {
      resizingRef.current = false;
    });
  }, []);

  useEffect(() => {
    onChangeRef.current = onChange;
    onViewboxChangeRef.current = onViewboxChange;
  }, [onChange, onViewboxChange]);

  useEffect(() => {
    if (viewbox) lastViewboxRef.current = viewbox;
  }, [viewbox]);

  useEffect(() => {
    let disposed = false;

    loadBpmnModeler()
      .then(async (BpmnJS) => {
        if (disposed || !canvasRef.current) return;
        const modeler = new BpmnJS({ container: canvasRef.current });
        modelerRef.current = modeler;

        await modeler.importXML(diagramXml);
        requestAnimationFrame(() => setTimeout(() => resizeEditor(!lastViewboxRef.current), 80));
        setStatus('Éditeur BPMN prêt');

        modeler.get('eventBus').on('selection.changed', (event) => {
          setSelectedElements(event.newSelection || []);
        });

        modeler.get('eventBus').on('canvas.viewbox.changed', (event) => {
          if (resizingRef.current) return;
          lastViewboxRef.current = event.viewbox;
          onViewboxChangeRef.current?.(event.viewbox);
        });

        modeler.on('commandStack.changed', async () => {
          try {
            const { xml } = await modeler.saveXML({ format: true });
            onChangeRef.current(xml);
            setStatus('Diagramme sauvegardé');
          } catch (e) {
            setStatus('Sauvegarde BPMN impossible');
          }
        });
      })
      .catch(() => setStatus('Impossible de charger l’éditeur BPMN. Vérifiez la connexion internet.'));

    return () => {
      disposed = true;
      if (modelerRef.current) {
        modelerRef.current.destroy();
        modelerRef.current = null;
      }
    };
  }, [resizeEditor]);

  useEffect(() => {
    if (!canvasRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => requestAnimationFrame(() => resizeEditor(false)));
    observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [resizeEditor]);

  useEffect(() => {
    const timers = [40, 180, 340].map(delay => setTimeout(() => resizeEditor(false), delay));
    return () => timers.forEach(clearTimeout);
  }, [layoutKey, resizeEditor]);

  const resetDiagram = async () => {
    const xml = defaultBpmnXml(projectName);
    lastViewboxRef.current = null;
    onViewboxChangeRef.current?.(null);
    onChange(xml);
    if (modelerRef.current) {
      await modelerRef.current.importXML(xml);
      requestAnimationFrame(() => setTimeout(() => resizeEditor(true), 40));
      setStatus('Nouveau diagramme BPMN créé');
    }
  };

  const exportDiagram = async () => {
    const current = modelerRef.current;
    const xml = current ? (await current.saveXML({ format: true })).xml : diagramXml;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(projectName || 'pilotprocess').toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-bpmn.bpmn`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus('Fichier BPMN exporté');
  };

  const exportDiagramPdf = async () => {
    const current = modelerRef.current;
    if (!current) return;
    try {
      setStatus('Préparation du PDF...');
      const [{ svg }, jsPDF] = await Promise.all([current.saveSVG(), loadJsPdf()]);
      const image = await svgToPngDataUrl(svg);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const headerHeight = 16;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2 - headerHeight;
      const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
      const drawWidth = image.width * ratio;
      const drawHeight = image.height * ratio;
      const x = margin + (maxWidth - drawWidth) / 2;
      const y = margin + headerHeight + (maxHeight - drawHeight) / 2;

      pdf.setTextColor(17, 35, 63);
      pdf.setFontSize(14);
      pdf.text(projectName || 'Diagramme BPMN', margin, margin + 4);
      pdf.setDrawColor(17, 35, 63);
      pdf.line(margin, margin + 8, pageWidth - margin, margin + 8);
      pdf.addImage(image.dataUrl, 'PNG', x, y, drawWidth, drawHeight);
      pdf.save(`${slugFileName(projectName, 'diagramme-bpmn')}-bpmn.pdf`);
      setStatus('PDF téléchargé');
    } catch (e) {
      console.error(e);
      setStatus('Export PDF impossible');
    }
  };

  const importDiagram = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const xml = String(reader.result || '');
      try {
        if (modelerRef.current) {
          await modelerRef.current.importXML(xml);
          lastViewboxRef.current = null;
          onViewboxChangeRef.current?.(null);
          requestAnimationFrame(() => setTimeout(() => resizeEditor(true), 40));
        }
        onChange(xml);
        setStatus('Fichier BPMN importé');
      } catch (e) {
        setStatus('Le fichier BPMN importé est invalide');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const applyColor = (color) => {
    const modeler = modelerRef.current;
    if (!modeler) return;
    if (selectedElements.length === 0) {
      setStatus('Sélectionnez un élément BPMN avant de choisir une couleur');
      return;
    }
    modeler.get('modeling').setColor(selectedElements, color);
    setStatus(color ? 'Couleur appliquée' : 'Couleur retirée');
  };

  return (
    <div className="bpmn-workbench">
      <div className="bpmn-toolbar">
        <div>
          <strong>Éditeur BPMN</strong>
        </div>
        <div className="bpmn-actions">
          <div className="bpmn-color-palette" aria-label="Couleurs BPMN">
            {BPMN_COLOR_PRESETS.map(color => (
              <button
                key={color.name}
                className="bpmn-color-swatch"
                style={{ background: color.fill, borderColor: color.stroke }}
                title={`Appliquer ${color.name}`}
                aria-label={`Appliquer ${color.name}`}
                onClick={() => applyColor({ stroke: color.stroke, fill: color.fill })}
              />
            ))}
            <button className="bpmn-color-reset" onClick={() => applyColor(null)}>Sans couleur</button>
          </div>
          <button className="nav-btn" onClick={() => fileRef.current?.click()}>Importer BPMN</button>
          <button className="nav-btn" onClick={exportDiagram}>Exporter BPMN</button>
          <button className="nav-btn" onClick={exportDiagramPdf}>Exporter PDF</button>
          <button className="nav-btn" onClick={resetDiagram}>Nouveau diagramme</button>
          <input ref={fileRef} type="file" accept=".bpmn,.xml" onChange={importDiagram} hidden />
        </div>
      </div>
      <div className="bpmn-editor-shell">
        <div ref={canvasRef} className="bpmn-canvas" />
      </div>
      <p className="hint-text">Utilisez la palette à gauche du diagramme pour ajouter des événements, tâches, passerelles, sous-processus et connexions BPMN.</p>
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
          {rows.length === 0 && <tr><td className="empty-row" colSpan={9}><span>Aucun mode de défaillance recensé</span><small>Ajoutez les risques principaux pour prioriser les actions.</small></td></tr>}
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

const asNumber = (value) => {
  if (value === null || value === undefined) return null;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const roundN = (value, digits = 2) => Number.isFinite(value) ? Math.round(value * (10 ** digits)) / (10 ** digits) : null;

function parseDelimitedText(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').filter(line => line.trim());
  if (lines.length < 2) return { headers: [], records: [] };
  const candidates = [';', ',', '\t'];
  const delimiter = candidates
    .map(d => ({ d, count: (lines[0].match(new RegExp(d === '\t' ? '\\t' : `\\${d}`, 'g')) || []).length }))
    .sort((a, b) => b.count - a.count)[0].d;
  const split = (line) => {
    const values = [];
    let current = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));
    return values;
  };
  const headers = split(lines[0]).map(h => h.trim());
  const records = lines.slice(1).map(line => {
    const values = split(line);
    return headers.reduce((acc, header, index) => ({ ...acc, [header]: values[index] ?? '' }), {});
  });
  return { headers, records };
}

function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(x) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function twoSidedNormalP(z) {
  return Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))));
}

function percentile(sortedValues, p) {
  if (!sortedValues.length) return null;
  const pos = (sortedValues.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedValues[base + 1] !== undefined) return sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]);
  return sortedValues[base];
}

function normalQuantile(p) {
  if (p <= 0 || p >= 1) return 0;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function dmaicStats(rows, spec = {}) {
  const values = (rows || []).map(r => asNumber(r.valeur)).filter(v => v !== null);
  const n = values.length;
  if (!n) return { values: [], sorted: [], n: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = n > 1 ? values.reduce((s, v) => s + ((v - mean) ** 2), 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const q1 = percentile(sorted, 0.25);
  const median = percentile(sorted, 0.5);
  const q3 = percentile(sorted, 0.75);
  const range = max - min;
  const iqr = (q3 ?? 0) - (q1 ?? 0);
  const cv = mean !== 0 ? sd / Math.abs(mean) : null;
  const lowerFence = q1 !== null && iqr !== null ? q1 - 1.5 * iqr : null;
  const upperFence = q3 !== null && iqr !== null ? q3 + 1.5 * iqr : null;
  const outliers = lowerFence !== null && upperFence !== null
    ? values.map((v, i) => ({ value: v, index: i + 1 })).filter(point => point.value < lowerFence || point.value > upperFence)
    : [];
  const mr = values.slice(1).map((v, i) => Math.abs(v - values[i]));
  const mrbar = mr.length ? mr.reduce((s, v) => s + v, 0) / mr.length : 0;
  const lsl = asNumber(spec.lsl);
  const usl = asNumber(spec.usl);
  const target = asNumber(spec.target);
  const cp = (lsl !== null && usl !== null && sd > 0) ? (usl - lsl) / (6 * sd) : null;
  const cpk = (lsl !== null && usl !== null && sd > 0) ? Math.min((usl - mean) / (3 * sd), (mean - lsl) / (3 * sd)) : null;
  return { values, sorted, n, mean, variance, sd, min, max, range, q1, median, q3, iqr, cv, outliers, mr, mrbar, lsl, usl, target, cp, cpk };
}

function correlation(xs, ys) {
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 3) return null;
  const xMean = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
  const yMean = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
  const num = pairs.reduce((s, p) => s + (p[0] - xMean) * (p[1] - yMean), 0);
  const denX = Math.sqrt(pairs.reduce((s, p) => s + ((p[0] - xMean) ** 2), 0));
  const denY = Math.sqrt(pairs.reduce((s, p) => s + ((p[1] - yMean) ** 2), 0));
  if (!denX || !denY) return null;
  const r = num / (denX * denY);
  const t = r * Math.sqrt((pairs.length - 2) / Math.max(0.000001, 1 - r * r));
  return { r, p: twoSidedNormalP(t), n: pairs.length };
}

function groupedValues(rows) {
  const groups = {};
  (rows || []).forEach(row => {
    const y = asNumber(row.valeur);
    const segment = String(row.segment || '').trim();
    if (y === null || !segment) return;
    if (!groups[segment]) groups[segment] = [];
    groups[segment].push(y);
  });
  return Object.entries(groups).filter(([, values]) => values.length >= 2);
}

function autoSegmentTest(rows) {
  const groups = groupedValues(rows);
  if (groups.length < 2) return null;
  const all = groups.flatMap(([, values]) => values);
  const grandMean = all.reduce((s, v) => s + v, 0) / all.length;
  const within = groups.reduce((s, [, values]) => {
    const mean = values.reduce((a, v) => a + v, 0) / values.length;
    return s + values.reduce((a, v) => a + ((v - mean) ** 2), 0);
  }, 0);
  const between = groups.reduce((s, [, values]) => {
    const mean = values.reduce((a, v) => a + v, 0) / values.length;
    return s + values.length * ((mean - grandMean) ** 2);
  }, 0);
  const dfBetween = groups.length - 1;
  const dfWithin = all.length - groups.length;
  const f = dfWithin > 0 ? (between / dfBetween) / (within / dfWithin || 0.000001) : null;
  const pApprox = f !== null ? Math.exp(-0.5 * Math.max(0, f)) : null;
  const label = groups.length === 2 ? 'T test automatique par segment' : 'ANOVA automatique par segment';
  const decision = pApprox !== null && pApprox < 0.05 ? 'Effet segment significatif probable' : 'Effet segment non demontre';
  return { label, groups: groups.length, n: all.length, statistic: f, p: pApprox, decision };
}

function invertMatrix(matrix) {
  const n = matrix.length;
  const aug = matrix.map((row, i) => [...row, ...Array.from({ length: n }, (_v, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i += 1) {
    let pivot = i;
    for (let r = i + 1; r < n; r += 1) if (Math.abs(aug[r][i]) > Math.abs(aug[pivot][i])) pivot = r;
    if (Math.abs(aug[pivot][i]) < 1e-10) return null;
    [aug[i], aug[pivot]] = [aug[pivot], aug[i]];
    const div = aug[i][i];
    for (let c = 0; c < 2 * n; c += 1) aug[i][c] /= div;
    for (let r = 0; r < n; r += 1) {
      if (r === i) continue;
      const factor = aug[r][i];
      for (let c = 0; c < 2 * n; c += 1) aug[r][c] -= factor * aug[i][c];
    }
  }
  return aug.map(row => row.slice(n));
}

function variableLabels(labels = {}) {
  return {
    y: labels.y || 'Y',
    unit: labels.unit || '',
    direction: labels.direction || 'Reduire',
    objective: labels.objective || '',
    segment: labels.segment || 'Groupe / categorie',
    x1: labels.x1 || 'X1',
    x2: labels.x2 || 'X2',
  };
}

function getDmaicFactors(labels = {}, factors = []) {
  const names = variableLabels(labels);
  const clean = (factors || [])
    .filter(f => f && (f.name || f._id))
    .map((f, i) => ({
      id: f._id || f.id || `factor${i + 1}`,
      key: `factor:${f._id || f.id || `factor${i + 1}`}`,
      name: f.name || `X${i + 1}`,
      type: f.type || 'Numerique',
      description: f.description || '',
      legacyKey: i === 0 ? 'facteurA' : i === 1 ? 'facteurB' : null,
    }));
  if (clean.length) return clean;
  return [
    { id: 'legacy-x1', key: 'factor:legacy-x1', name: names.x1, type: 'Numerique', legacyKey: 'facteurA' },
    { id: 'legacy-x2', key: 'factor:legacy-x2', name: names.x2, type: 'Numerique', legacyKey: 'facteurB' },
  ];
}

function getFactorValue(row, factor) {
  if (!row || !factor) return '';
  const direct = row.factorValues?.[factor.id];
  if (direct !== undefined && direct !== null && direct !== '') return direct;
  if (factor.legacyKey) return row[factor.legacyKey];
  return '';
}

function buildDmaicImport(text, currentLabels = {}, currentFactors = []) {
  const { headers, records } = parseDelimitedText(text);
  const normalized = (value) => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const findHeader = (patterns) => headers.find(header => patterns.some(pattern => normalized(header).includes(pattern)));
  const dateHeader = findHeader(['date', 'ordre', 'index']);
  const yHeader = findHeader(['valeur y', 'resultat', 'mesure', 'delai', 'temps', 'cout', 'defaut', 'satisfaction', 'y']);
  const segmentHeader = findHeader(['segment', 'groupe', 'categorie', 'canal', 'equipe', 'site', 'type']);
  const reserved = new Set([dateHeader, yHeader, segmentHeader].filter(Boolean));
  const sourceFactorHeaders = headers.filter(header => !reserved.has(header));
  const importedFactors = sourceFactorHeaders.map((header) => {
    const values = records.map(record => record[header]).filter(value => String(value || '').trim());
    const numericCount = values.filter(value => asNumber(value) !== null).length;
    const numericRatio = values.length ? numericCount / values.length : 0;
    const existing = (currentFactors || []).find(f => normalized(f.name) === normalized(header));
    return {
      _id: existing?._id || uid(),
      name: header,
      type: numericRatio >= 0.75 ? 'Numerique' : 'Categorie',
      description: existing?.description || 'Facteur importe depuis un fichier CSV.',
    };
  });
  const rows = records.map((record, index) => {
    const factorValues = {};
    importedFactors.forEach((factor, factorIndex) => {
      factorValues[factor._id] = record[sourceFactorHeaders[factorIndex]] ?? '';
    });
    return {
      _id: uid(),
      date: record[dateHeader] || String(index + 1),
      valeur: record[yHeader] || '',
      segment: record[segmentHeader] || '',
      facteurA: importedFactors[0] ? factorValues[importedFactors[0]._id] : '',
      facteurB: importedFactors[1] ? factorValues[importedFactors[1]._id] : '',
      factorValues,
      commentaire: '',
    };
  });
  return {
    labels: {
      ...currentLabels,
      y: currentLabels.y || yHeader || 'Y',
      segment: currentLabels.segment || segmentHeader || 'Groupe / categorie',
    },
    factors: importedFactors.length ? importedFactors : currentFactors,
    rows,
  };
}

function dmaicDataQuality(rows, labels = {}, factors = []) {
  const list = Array.isArray(rows) ? rows : [];
  const names = variableLabels(labels);
  const stats = dmaicStats(list, {});
  const activeFactors = getDmaicFactors(labels, factors).filter(factor => {
    if (factor.legacyKey && !factors?.length) return list.some(row => String(row[factor.legacyKey] || '').trim());
    return list.some(row => String(getFactorValue(row, factor) || '').trim());
  });
  const missingY = list.filter(row => asNumber(row.valeur) === null).length;
  const validY = list.length - missingY;
  const missingSegment = list.filter(row => !String(row.segment || '').trim()).length;
  const duplicateDates = list.length - new Set(list.map(row => String(row.date || '').trim()).filter(Boolean)).size;
  const factorIssues = activeFactors.map(factor => {
    const values = list.map(row => getFactorValue(row, factor));
    const missing = values.filter(value => !String(value || '').trim()).length;
    const numericInvalid = (factor.type || '').toLowerCase().startsWith('num')
      ? values.filter(value => String(value || '').trim() && asNumber(value) === null).length
      : 0;
    return { factor, missing, numericInvalid };
  });
  const warnings = [];
  if (!list.length) warnings.push('Aucune donnee mesuree : importez un CSV ou ajoutez des lignes.');
  if (validY < 8) warnings.push(`Echantillon faible : ${validY} valeur(s) numeriques pour ${names.y}. Visez au moins 20 a 30 mesures si possible.`);
  if (missingY) warnings.push(`${missingY} ligne(s) sans valeur Y numerique exploitable.`);
  if (stats.outliers?.length) warnings.push(`${stats.outliers.length} valeur(s) atypique(s) detectee(s) sur ${names.y} : controlez si elles sont reelles ou dues a une erreur de saisie.`);
  if (missingSegment && list.length) warnings.push(`${missingSegment} ligne(s) sans groupe/categorie : les comparaisons par groupe seront limitees.`);
  if (duplicateDates > 0) warnings.push('Certaines dates/ordres sont vides ou dupliques : verifiez la chronologie avant les cartes X/MR.');
  factorIssues.forEach(issue => {
    if (issue.missing) warnings.push(`${issue.factor.name} : ${issue.missing} valeur(s) manquante(s).`);
    if (issue.numericInvalid) warnings.push(`${issue.factor.name} : ${issue.numericInvalid} valeur(s) non numerique(s) alors que le facteur est numerique.`);
  });
  const score = Math.max(0, 100 - warnings.length * 12 - Math.max(0, 20 - validY));
  const status = !list.length ? 'A construire' : score >= 80 ? 'Exploitable' : score >= 55 ? 'A fiabiliser' : 'Insuffisant';
  const numericColumns = activeFactors.filter(f => (f.type || '').toLowerCase().startsWith('num')).length + 1;
  const categoricalColumns = activeFactors.filter(f => (f.type || '').toLowerCase().startsWith('cat')).length + (missingSegment < list.length ? 1 : 0);
  return { rows: list.length, validY, missingY, missingSegment, duplicateDates, factors: activeFactors, factorIssues, warnings, score, status, numericColumns, categoricalColumns, outliers: stats.outliers || [] };
}

function normalityAnalysis(stats) {
  if (!stats.n || stats.n < 8 || !stats.sd) {
    return { status: 'A confirmer', p: null, normal: null, text: 'Ajoutez au moins 8 valeurs variables pour obtenir une lecture de normalite plus fiable.' };
  }
  const n = stats.n;
  const centered = stats.values.map(v => v - stats.mean);
  const m2 = centered.reduce((s, v) => s + v ** 2, 0) / n;
  const m3 = centered.reduce((s, v) => s + v ** 3, 0) / n;
  const m4 = centered.reduce((s, v) => s + v ** 4, 0) / n;
  const skew = m3 / Math.pow(m2 || 1, 1.5);
  const kurtosis = m4 / Math.pow(m2 || 1, 2);
  const jb = (n / 6) * (skew ** 2 + ((kurtosis - 3) ** 2) / 4);
  const p = Math.exp(-jb / 2);
  const normal = p >= 0.05;
  return {
    status: normal ? 'Normalite acceptable' : 'Normalite non confirmee',
    normal,
    p,
    skew,
    kurtosis,
    text: normal
      ? 'La distribution est compatible avec une loi normale sur cet echantillon. Les tests parametriques restent pertinents si le contexte metier le confirme.'
      : 'La distribution semble non normale ou douteuse. Privilegier les tests non parametriques ou analyser les valeurs atypiques avant conclusion.',
  };
}

function testRecommendationForFactor(factor, groupsCount, normality) {
  if ((factor.type || '').toLowerCase().startsWith('cat')) {
    if (groupsCount < 2) return 'Ajoutez au moins 2 categories';
    if (groupsCount === 2) return normality.normal === false ? 'Mann-Whitney recommande' : 'Test t recommande';
    return normality.normal === false ? 'Kruskal-Wallis recommande' : 'ANOVA recommandee';
  }
  return normality.normal === false ? 'Spearman recommande' : 'Correlation Pearson / regression recommandees';
}

function automaticRegression(rows, labels = {}, factors = []) {
  const numericFactors = getDmaicFactors(labels, factors).filter(f => (f.type || '').toLowerCase().startsWith('num'));
  const validFactors = numericFactors.filter(f => (rows || []).some(row => asNumber(getFactorValue(row, f)) !== null));
  const points = (rows || []).map(row => {
    const y = asNumber(row.valeur);
    const xs = validFactors.map(f => asNumber(getFactorValue(row, f)));
    return { y, xs };
  }).filter(row => row.y !== null && row.xs.every(v => v !== null));
  const p = validFactors.length + 1;
  if (validFactors.length === 0 || points.length <= p) return null;
  const x = points.map(row => [1, ...row.xs]);
  const y = points.map(row => row.y);
  const xtx = Array.from({ length: p }, (_v, r) => Array.from({ length: p }, (_vv, c) => x.reduce((s, row) => s + row[r] * row[c], 0)));
  const inv = invertMatrix(xtx);
  if (!inv) return null;
  const xty = Array.from({ length: p }, (_v, r) => x.reduce((s, row, i) => s + row[r] * y[i], 0));
  const beta = inv.map(row => row.reduce((s, v, i) => s + v * xty[i], 0));
  const yMean = y.reduce((s, v) => s + v, 0) / y.length;
  const predicted = x.map(row => row.reduce((s, v, i) => s + v * beta[i], 0));
  const sse = y.reduce((s, v, i) => s + ((v - predicted[i]) ** 2), 0);
  const sst = y.reduce((s, v) => s + ((v - yMean) ** 2), 0);
  const r2 = sst > 0 ? 1 - (sse / sst) : null;
  const adjR2 = r2 !== null && y.length > p ? 1 - (1 - r2) * ((y.length - 1) / (y.length - p)) : null;
  const mse = y.length > p ? sse / (y.length - p) : 0;
  const coefficients = beta.map((coef, i) => {
    const se = Math.sqrt(Math.max(0, mse * inv[i][i]));
    const z = se > 0 ? coef / se : 0;
    const factor = validFactors[i - 1];
    return { name: i === 0 ? 'Intercept' : factor.name, key: factor?.id, coef, se, p: se > 0 ? twoSidedNormalP(z) : null };
  });
  const names = variableLabels(labels);
  const equation = `${names.y} = ${roundN(beta[0], 3)}${validFactors.map((factor, i) => ` ${beta[i + 1] >= 0 ? '+' : '-'} ${Math.abs(roundN(beta[i + 1], 3))}*${factor.name}`).join('')}`;
  return { n: y.length, factors: validFactors, beta, coefficients, r2, adjR2, equation };
}

function controlChartAnalysis(stats) {
  if (!stats.n) return null;
  if (stats.n < 3 || !stats.mrbar) return { stable: null, text: 'Ajoutez au moins 3 valeurs variables pour lire les cartes X/MR.' };
  const xUcl = stats.mean + 2.66 * stats.mrbar;
  const xLcl = stats.mean - 2.66 * stats.mrbar;
  const mrUcl = 3.267 * stats.mrbar;
  const outX = stats.values.map((v, i) => ({ v, i: i + 1 })).filter(p => p.v > xUcl || p.v < xLcl);
  const outMr = stats.mr.map((v, i) => ({ v, i: i + 2 })).filter(p => p.v > mrUcl);
  const stable = outX.length === 0 && outMr.length === 0;
  const text = stable
    ? 'Les cartes X/MR ne montrent pas de point hors limites : le processus semble statistiquement stable sur cet echantillon.'
    : `Les cartes X/MR signalent une instabilite probable : ${outX.length} point(s) hors limites sur la carte X et ${outMr.length} rupture(s) sur la carte MR.`;
  return { stable, text, outX, outMr, xUcl, xLcl, mrUcl };
}

function automaticMeasureNarrative(stats, rows, labels = {}) {
  const names = variableLabels(labels);
  if (!stats.n) return 'Ajoutez des mesures pour obtenir un constat automatique.';
  const groups = groupedValues(rows).map(([name, values]) => ({
    name,
    mean: values.reduce((s, v) => s + v, 0) / values.length,
    n: values.length,
  })).sort((a, b) => b.mean - a.mean);
  const highGroup = groups[0];
  const cap = stats.cpk === null || stats.cpk === undefined
    ? 'la capabilite ne peut pas encore etre conclue sans LSL/USL'
    : stats.cpk >= 1
      ? `le processus respecte globalement les limites avec Cpk = ${roundN(stats.cpk, 2)}`
      : `le processus ne respecte pas suffisamment les limites avec Cpk = ${roundN(stats.cpk, 2)}`;
  const spread = stats.sd && stats.mean ? (stats.sd / stats.mean) : 0;
  const variability = spread > 0.35 ? 'La variabilite est forte' : spread > 0.2 ? 'La variabilite est notable' : 'La variabilite est relativement contenue';
  return `${names.y} : moyenne ${roundN(stats.mean, 2)}, ecart type ${roundN(stats.sd, 2)}, min ${roundN(stats.min, 2)}, max ${roundN(stats.max, 2)}. ${variability}. ${cap}.${highGroup ? ` Le groupe le plus defavorable est "${highGroup.name}" avec une moyenne de ${roundN(highGroup.mean, 2)} sur ${highGroup.n} mesure(s).` : ''}`;
}

function factorAnalyses(rows, labels = {}, factors = [], normality) {
  const yValues = (rows || []).map(r => asNumber(r.valeur));
  return getDmaicFactors(labels, factors).map(factor => {
    if ((factor.type || '').toLowerCase().startsWith('cat')) {
      const groups = {};
      (rows || []).forEach(row => {
        const y = asNumber(row.valeur);
        const value = String(getFactorValue(row, factor) || '').trim();
        if (y === null || !value) return;
        if (!groups[value]) groups[value] = [];
        groups[value].push(y);
      });
      const entries = Object.entries(groups).filter(([, values]) => values.length >= 2);
      const test = entries.length >= 2 ? autoSegmentTest((rows || []).map(row => ({ ...row, segment: getFactorValue(row, factor) }))) : null;
      return {
        name: factor.name,
        type: factor.type,
        test: testRecommendationForFactor(factor, entries.length, normality),
        p: test?.p ?? null,
        decision: test?.decision || 'Donnees insuffisantes',
        detail: entries.length ? `${entries.length} categories exploitables` : 'Ajoutez des categories',
      };
    }
    const xs = (rows || []).map(row => asNumber(getFactorValue(row, factor)));
    const corr = correlation(xs, yValues);
    return {
      name: factor.name,
      type: factor.type,
      test: testRecommendationForFactor(factor, 0, normality),
      p: corr?.p ?? null,
      decision: corr ? (corr.p < 0.05 ? 'Effet significatif probable' : 'Effet non demontre') : 'Donnees insuffisantes',
      detail: corr ? `r=${roundN(corr.r, 2)} sur ${corr.n} points` : 'Ajoutez des valeurs numeriques',
    };
  });
}

function AutomaticDmaicInsights({ rows, spec, labels, factors }) {
  const stats = dmaicStats(rows, spec);
  const segmentTest = autoSegmentTest(rows);
  const normality = normalityAnalysis(stats);
  const regression = automaticRegression(rows, labels, factors);
  const analyses = factorAnalyses(rows, labels, factors, normality);
  const names = variableLabels(labels);
  const chartRead = controlChartAnalysis(stats);
  const stable = chartRead?.stable ?? null;
  const capability = stats.cpk === null || stats.cpk === undefined
    ? 'Limites LSL/USL manquantes'
    : stats.cpk >= 2 ? 'Tres capable' : stats.cpk >= 1 ? 'Capable sous surveillance' : 'Incapable';
  return (
    <div className="dmaic-auto-panel">
      <div className="dmaic-auto-head">
        <h3>Diagnostic automatique</h3>
        <span>calculs depuis vos mesures</span>
      </div>
      <div className="dmaic-auto-grid">
        <div><span>Respect des limites</span><strong>{capability}</strong><small>{stats.cpk !== null && stats.cpk !== undefined ? 'Conclusion basee sur Cp/Cpk ci-dessus' : 'Ajoutez LSL et USL'}</small></div>
        <div><span>Stabilite X/MR (variation dans le temps)</span><strong>{stable === null ? 'A confirmer' : stable ? 'Stable' : 'Instable'}</strong><small>{stable === false ? 'Point hors limites probable' : 'Lecture automatique des limites'}</small></div>
        <div><span>{names.segment} (comparaison)</span><strong>{segmentTest ? segmentTest.decision : 'Non disponible'}</strong><small>{segmentTest ? `p approx. ${roundN(segmentTest.p, 4)} - ${segmentTest.groups} groupes` : 'Ajoutez des groupes'}</small></div>
        <div><span>Regression (influence des causes X)</span><strong>{regression ? `R2 ${roundN(regression.r2, 2)}` : 'Non disponible'}</strong><small>{regression ? regression.equation : 'Ajoutez des facteurs X numeriques'}</small></div>
      </div>
      <div className="dmaic-auto-details">
        <div className="dmaic-conclusion">
          <strong>Constat automatique.</strong> {automaticMeasureNarrative(stats, rows, labels)}
        </div>
        <div className={`dmaic-conclusion${stable === false ? ' danger' : ''}`}>
          <strong>Lecture cartes X/MR.</strong> {chartRead?.text || 'Ajoutez des mesures ordonnees pour analyser la stabilite.'}
        </div>
        <div className="dmaic-pill-row">
          {analyses.map(a => <span className="dmaic-pill" key={a.name}>{a.name} : {a.test} ; {a.p !== null ? `p=${roundN(a.p, 4)}` : a.detail}</span>)}
          {regression?.coefficients?.filter(c => c.name !== 'Intercept').map(c => <span className="dmaic-pill" key={c.name}>{c.name} : coef {roundN(c.coef, 3)} ; p {c.p !== null ? roundN(c.p, 4) : '-'}</span>)}
        </div>
      </div>
    </div>
  );
}

function AutoRegressionPanel({ rows, labels, factors }) {
  const regression = automaticRegression(rows, labels, factors);
  const segmentTest = autoSegmentTest(rows);
  const normality = normalityAnalysis(dmaicStats(rows, {}));
  const analyses = factorAnalyses(rows, labels, factors, normality);
  const names = variableLabels(labels);
  if (!regression && !segmentTest) {
    return <div className="dmaic-empty-chart">Ajoutez des valeurs {names.y} et des facteurs X dans Measure pour calculer automatiquement les p-values, R2 et equations.</div>;
  }
  return (
    <div className="dmaic-auto-panel">
      <div className="dmaic-auto-head">
        <h3>Resultats statistiques automatiques</h3>
        <span>analyse calculee</span>
      </div>
      {regression && (
        <>
          <div className="dmaic-auto-grid">
            <div><span>Equation (formule estimee)</span><strong>{regression.equation}</strong><small>{regression.n} observations utilisees</small></div>
            <div><span>R carre (part expliquee)</span><strong>{roundN(regression.r2, 3)}</strong><small>Plus il est proche de 1, plus le modele explique Y</small></div>
            <div><span>R carre ajuste (modele corrige)</span><strong>{roundN(regression.adjR2, 3)}</strong><small>Corrige du nombre de facteurs</small></div>
            <div><span>Conclusion automatique</span><strong>{regression.r2 >= 0.7 ? 'Modele explicatif fort' : regression.r2 >= 0.4 ? 'Modele utile' : 'Modele faible'}</strong><small>A confirmer avec le contexte metier</small></div>
          </div>
          <div className="ledger-table-wrap">
            <table className="ledger-table">
              <thead><tr><th>Facteur (cause testee)</th><th>Coefficient (sens/force)</th><th>Erreur standard</th><th>p-value approx. (seuil 0,05)</th><th>Decision</th></tr></thead>
              <tbody>
                {regression.coefficients.map(c => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>{roundN(c.coef, 4)}</td>
                    <td>{roundN(c.se, 4)}</td>
                    <td>{c.p !== null ? roundN(c.p, 4) : '-'}</td>
                    <td>{c.name === 'Intercept' ? '-' : c.p !== null && c.p < 0.05 ? 'Effet significatif probable' : 'Effet non demontre'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {segmentTest && (
        <div className="dmaic-conclusion">
          <strong>{segmentTest.label}.</strong> {segmentTest.decision} ; p-value approx. {roundN(segmentTest.p, 4)} sur {segmentTest.groups} groupes et {segmentTest.n} mesures.
        </div>
      )}
      <div className="ledger-table-wrap">
        <table className="ledger-table">
          <thead><tr><th>Facteur</th><th>Type</th><th>Test recommande</th><th>p-value</th><th>Decision automatique</th></tr></thead>
          <tbody>
            {analyses.map(a => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td>{a.type}</td>
                <td>{a.test}</td>
                <td>{a.p !== null ? roundN(a.p, 4) : '-'}</td>
                <td>{a.decision}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistogramChart({ stats }) {
  if (!stats.n) return <div className="dmaic-empty-chart">Ajoutez des valeurs numeriques pour afficher l'histogramme.</div>;
  const binCount = Math.min(8, Math.max(4, Math.ceil(Math.sqrt(stats.n))));
  const span = stats.max - stats.min || 1;
  const width = span / binCount;
  const bins = Array.from({ length: binCount }, (_v, i) => {
    const start = stats.min + i * width;
    const end = i === binCount - 1 ? stats.max : start + width;
    return { label: `${roundN(start, 1)}-${roundN(end, 1)}`, count: 0 };
  });
  stats.values.forEach(v => {
    const idx = Math.min(binCount - 1, Math.floor((v - stats.min) / width));
    bins[idx].count += 1;
  });
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <ComposedChart data={bins} margin={{ top: 10, right: 15, left: -20, bottom: 45 }}>
          <CartesianGrid stroke="#DDE6F1" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" name="Frequence" fill="#2F756A" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function ControlCharts({ stats }) {
  if (!stats.n) return <div className="dmaic-empty-chart">Ajoutez des mesures ordonnees dans le temps pour tracer les cartes X et MR.</div>;
  const xData = stats.values.map((v, i) => ({ index: i + 1, value: v }));
  const mrData = stats.mr.map((v, i) => ({ index: i + 2, value: v }));
  const xUcl = stats.mean + 2.66 * stats.mrbar;
  const xLcl = stats.mean - 2.66 * stats.mrbar;
  const mrUcl = 3.267 * stats.mrbar;
  return (
    <div className="dmaic-chart-grid">
      <div className="dmaic-chart-card">
        <h4>Carte X - individus</h4>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <ComposedChart data={xData} margin={{ top: 10, right: 15, left: -20, bottom: 10 }}>
              <CartesianGrid stroke="#DDE6F1" />
              <XAxis dataKey="index" />
              <YAxis />
              <Tooltip />
              <ReferenceLine y={stats.mean} stroke="#10233F" label="Moyenne" />
              {stats.mrbar > 0 && <ReferenceLine y={xUcl} stroke="#A23B2E" strokeDasharray="4 4" label="UCL" />}
              {stats.mrbar > 0 && <ReferenceLine y={xLcl} stroke="#A23B2E" strokeDasharray="4 4" label="LCL" />}
              <Line type="monotone" dataKey="value" stroke="#2F756A" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="dmaic-chart-card">
        <h4>Carte MR - moving range</h4>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <ComposedChart data={mrData} margin={{ top: 10, right: 15, left: -20, bottom: 10 }}>
              <CartesianGrid stroke="#DDE6F1" />
              <XAxis dataKey="index" />
              <YAxis />
              <Tooltip />
              <ReferenceLine y={stats.mrbar} stroke="#10233F" label="MR moyen" />
              {stats.mrbar > 0 && <ReferenceLine y={mrUcl} stroke="#A23B2E" strokeDasharray="4 4" label="UCL" />}
              <Line type="monotone" dataKey="value" stroke="#C97D2E" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function QqPlot({ stats }) {
  if (stats.n < 3 || !stats.sd) return <div className="dmaic-empty-chart">Au moins 3 valeurs sont necessaires pour visualiser le QQ plot.</div>;
  const points = stats.sorted.map((v, i) => {
    const p = (i + 0.5) / stats.n;
    return { theoretical: stats.mean + stats.sd * normalQuantile(p), observed: v };
  });
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 15, right: 20, left: -10, bottom: 20 }}>
          <CartesianGrid stroke="#DDE6F1" />
          <XAxis type="number" dataKey="theoretical" name="Theorique" />
          <YAxis type="number" dataKey="observed" name="Observe" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={points} fill="#2F756A" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function BoxPlot({ stats }) {
  if (!stats.n) return <div className="dmaic-empty-chart">Ajoutez des valeurs pour afficher la boite a moustaches.</div>;
  const left = 80, right = 760, y = 120;
  const scale = (v) => left + ((v - stats.min) / ((stats.max - stats.min) || 1)) * (right - left);
  const minX = scale(stats.min), q1X = scale(stats.q1), medX = scale(stats.median), q3X = scale(stats.q3), maxX = scale(stats.max);
  return (
    <svg className="dmaic-boxplot" viewBox="0 0 840 250" role="img" aria-label="Boite a moustaches">
      <line x1={minX} y1={y} x2={maxX} y2={y} stroke="#2F756A" strokeWidth="4" />
      <line x1={minX} y1={y - 35} x2={minX} y2={y + 35} stroke="#2F756A" strokeWidth="4" />
      <line x1={maxX} y1={y - 35} x2={maxX} y2={y + 35} stroke="#2F756A" strokeWidth="4" />
      <rect x={q1X} y={y - 48} width={Math.max(8, q3X - q1X)} height="96" rx="6" fill="#F8FAFD" stroke="#C9D8EC" strokeWidth="3" />
      <line x1={medX} y1={y - 48} x2={medX} y2={y + 48} stroke="#10233F" strokeWidth="4" />
      {[['Min', minX, stats.min], ['Q1', q1X, stats.q1], ['Mediane', medX, stats.median], ['Q3', q3X, stats.q3], ['Max', maxX, stats.max]].map(([label, x, v]) => (
        <g key={label}>
          <text x={x} y="205" textAnchor="middle" fill="#536983" fontSize="16" fontWeight="700">{label}</text>
          <text x={x} y="228" textAnchor="middle" fill="#10233F" fontSize="16">{roundN(v, 2)}</text>
        </g>
      ))}
    </svg>
  );
}

function CapabilitySummary({ stats }) {
  if (!stats.n || stats.cp === null || stats.cpk === null) return <div className="dmaic-conclusion warning">Renseignez les limites de specification LSL et USL, puis ajoutez des mesures pour calculer Cp et Cpk.</div>;
  const status = stats.cpk >= 2 ? 'Processus tres capable' : stats.cpk >= 1 ? 'Processus capable sous surveillance' : 'Processus incapable';
  const cls = stats.cpk >= 1 ? '' : ' danger';
  const centered = stats.target !== null ? Math.abs(stats.mean - stats.target) : null;
  const reason = stats.cpk < 1
    ? 'La moyenne et/ou la dispersion font sortir une partie du processus des limites attendues.'
    : stats.cpk < 2
      ? 'Les limites sont globalement respectees, mais la marge reste limitee.'
      : 'Les limites sont respectees avec une marge robuste.';
  return (
    <div className={`dmaic-conclusion${cls}`}>
      <strong>{status}</strong> - Cp = {roundN(stats.cp, 2)} ; Cpk = {roundN(stats.cpk, 2)}. {reason}
      {stats.target !== null && <> Ecart de centrage vs cible : {roundN(centered, 2)}.</>}
      {' '}Repere : Cpk &gt;= 1 est acceptable, Cpk &gt;= 2 est robuste.
    </div>
  );
}

function NormalitySummary({ stats }) {
  const normality = normalityAnalysis(stats);
  const cls = normality.normal === false ? ' warning' : '';
  return (
    <div className={`dmaic-conclusion${cls}`}>
      <strong>{normality.status}</strong>
      {normality.p !== null && <> - p-value approx. {roundN(normality.p, 4)}.</>}
      {' '}{normality.text}
    </div>
  );
}

function DmaicQualityPanel({ rows, labels, factors }) {
  const quality = dmaicDataQuality(rows, labels, factors);
  const cls = quality.status === 'Exploitable' ? '' : quality.status === 'A fiabiliser' ? ' warning' : ' danger';
  return (
    <div className={`dmaic-quality-panel${cls}`}>
      <div className="dmaic-quality-score">
        <span>Qualite donnees</span>
        <strong>{quality.status}</strong>
        <small>{quality.validY}/{quality.rows || 0} mesures Y exploitables</small>
      </div>
      <div className="dmaic-quality-list">
        {quality.warnings.length ? quality.warnings.slice(0, 5).map((warning, index) => (
          <div key={index} className="dmaic-quality-item">{warning}</div>
        )) : (
          <div className="dmaic-quality-item success">Base prete pour les calculs automatiques : normalite, capabilite, cartes X/MR, tests et regression.</div>
        )}
      </div>
    </div>
  );
}

function DmaicAnalysisRoadmap({ rows, spec, labels, factors }) {
  const stats = dmaicStats(rows, spec);
  const quality = dmaicDataQuality(rows, labels, factors);
  const normality = normalityAnalysis(stats);
  const chart = controlChartAnalysis(stats);
  const regression = automaticRegression(rows, labels, factors);
  const analyses = factorAnalyses(rows, labels, factors, normality);
  const hasSpecs = stats.cp !== null && stats.cpk !== null;
  const steps = [
    {
      title: '1. Donnees',
      status: quality.status,
      text: quality.status === 'Exploitable' ? 'La base est suffisante pour analyser le processus.' : 'Completez ou nettoyez les mesures avant de conclure.',
    },
    {
      title: '2. Normalite',
      status: normality.normal === null ? 'A confirmer' : normality.normal ? 'Acceptable' : 'Non normale',
      text: normality.p !== null ? `p approx. ${roundN(normality.p, 4)}. ${normality.normal ? 'Tests parametriques possibles.' : 'Tests non parametriques privilegies.'}` : normality.text,
    },
    {
      title: '3. Capabilite',
      status: hasSpecs ? (stats.cpk >= 1 ? 'Capable' : 'Incapable') : 'Limites manquantes',
      text: hasSpecs ? `Cp ${roundN(stats.cp, 2)} ; Cpk ${roundN(stats.cpk, 2)}.` : 'Ajoutez LSL et USL pour savoir si le processus respecte les limites.',
    },
    {
      title: '4. Stabilite',
      status: chart?.stable === null || chart?.stable === undefined ? 'A confirmer' : chart.stable ? 'Stable' : 'Instable',
      text: chart?.text || 'Ajoutez une chronologie de mesures pour lire les cartes X/MR.',
    },
    {
      title: '5. Causes X',
      status: analyses.some(a => a.p !== null && a.p < 0.05) ? 'Cause probable' : analyses.length ? 'A confirmer' : 'Non disponible',
      text: analyses.length ? `${analyses.length} facteur(s) teste(s). ${analyses.filter(a => a.p !== null && a.p < 0.05).length} effet(s) significatif(s) probable(s).` : 'Ajoutez des facteurs X numeriques ou categoriels.',
    },
    {
      title: '6. Modele',
      status: regression ? (regression.r2 >= 0.7 ? 'Fort' : regression.r2 >= 0.4 ? 'Utile' : 'Faible') : 'Non disponible',
      text: regression ? `R2 ${roundN(regression.r2, 3)} ; equation calculee automatiquement.` : 'Ajoutez assez de mesures et de facteurs numeriques pour calculer la regression.',
    },
  ];
  return (
    <div className="dmaic-roadmap">
      {steps.map(step => (
        <div className="dmaic-roadmap-step" key={step.title}>
          <span>{step.title}</span>
          <strong>{step.status}</strong>
          <p>{step.text}</p>
        </div>
      ))}
    </div>
  );
}

function DmaicExecutiveDecision({ rows, spec, labels, factors }) {
  const stats = dmaicStats(rows, spec);
  const quality = dmaicDataQuality(rows, labels, factors);
  const normality = normalityAnalysis(stats);
  const chart = controlChartAnalysis(stats);
  const analyses = factorAnalyses(rows, labels, factors, normality);
  const regression = automaticRegression(rows, labels, factors);
  const significant = analyses.filter(a => a.p !== null && a.p < 0.05);
  const names = variableLabels(labels);
  const capability = stats.cpk === null || stats.cpk === undefined
    ? 'la capabilite reste a calculer car les limites LSL/USL sont absentes'
    : stats.cpk >= 1
      ? `le processus est globalement capable au regard des limites renseignees (Cpk ${roundN(stats.cpk, 2)})`
      : `le processus est incapable au regard des limites renseignees (Cpk ${roundN(stats.cpk, 2)})`;
  const stability = chart?.stable === false
    ? 'Il presente aussi des signaux d instabilite sur les cartes X/MR.'
    : chart?.stable === true
      ? 'Les cartes X/MR ne montrent pas de rupture majeure sur l echantillon.'
      : 'La stabilite reste a confirmer avec plus de donnees chronologiques.';
  const causes = significant.length
    ? `Les facteurs les plus probables sont : ${significant.map(a => a.name).join(', ')}.`
    : 'Aucun facteur X significatif n est encore demontre : completez les donnees ou testez d autres causes.';
  const regressionText = regression
    ? `La regression explique environ ${roundN((regression.r2 || 0) * 100, 0)}% de la variation de ${names.y}.`
    : 'La regression n est pas encore disponible.';
  const incapable = stats.cpk !== null && stats.cpk !== undefined && stats.cpk < 1;
  const cls = quality.status === 'Insuffisant' || incapable || chart?.stable === false ? ' danger' : quality.status === 'A fiabiliser' ? ' warning' : '';
  return (
    <div className={`dmaic-executive${cls}`}>
      <span>Conclusion automatique</span>
      <strong>{quality.status === 'Insuffisant' ? 'Donnees insuffisantes pour conclure proprement' : `${names.y} : diagnostic calcule`}</strong>
      <p>{automaticMeasureNarrative(stats, rows, labels)} {capability}. {stability} {causes} {regressionText}</p>
    </div>
  );
}

function DmaicFactorDecisionTable({ rows, labels, factors }) {
  const stats = dmaicStats(rows, {});
  const normality = normalityAnalysis(stats);
  const analyses = factorAnalyses(rows, labels, factors, normality);
  if (!analyses.length) {
    return <div className="dmaic-empty-chart">Ajoutez des facteurs X a tester pour obtenir automatiquement le bon test statistique et la conclusion associee.</div>;
  }
  return (
    <div className="ledger-table-wrap">
      <table className="ledger-table">
        <thead><tr><th>Facteur X</th><th>Type</th><th>Test choisi par l outil</th><th>Resultat</th><th>Decision</th></tr></thead>
        <tbody>
          {analyses.map(a => (
            <tr key={a.name}>
              <td>{a.name}</td>
              <td>{a.type}</td>
              <td>{a.test}</td>
              <td>{a.p !== null ? `p approx. ${roundN(a.p, 4)} - ${a.detail}` : a.detail}</td>
              <td>{a.decision}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DmaicYProfile({ labels = {}, spec = {} }) {
  const names = variableLabels(labels);
  const directionText = names.direction === 'Augmenter'
    ? 'plus la valeur est haute, meilleur est le resultat'
    : names.direction === 'Respecter une cible'
      ? 'la performance est jugee par l ecart a la cible'
      : 'plus la valeur est basse, meilleur est le resultat';
  return (
    <div className="dmaic-y-profile">
      <div>
        <span>Variable Y</span>
        <strong>{names.y}</strong>
        <p>{names.unit ? `Unite : ${names.unit}. ` : ''}{directionText}.</p>
      </div>
      <div>
        <span>Objectif</span>
        <strong>{names.objective || 'A definir'}</strong>
        <p>Cible {spec.target || '-'} ; LSL {spec.lsl || '-'} ; USL {spec.usl || '-'}.</p>
      </div>
      <div>
        <span>Lecture attendue</span>
        <strong>{names.direction}</strong>
        <p>L outil utilise cette orientation pour formuler les conclusions metier.</p>
      </div>
    </div>
  );
}

function DmaicDataProfile({ rows, labels, factors }) {
  const quality = dmaicDataQuality(rows, labels, factors);
  return (
    <div className="dmaic-profile-grid">
      <div><span>Lignes importees</span><strong>{quality.rows}</strong><small>Nombre total de mesures saisies ou importees</small></div>
      <div><span>Y exploitables</span><strong>{quality.validY}</strong><small>Valeurs numeriques utilisables pour les calculs</small></div>
      <div><span>Colonnes numeriques</span><strong>{quality.numericColumns}</strong><small>Y + facteurs X numeriques</small></div>
      <div><span>Colonnes categories</span><strong>{quality.categoricalColumns}</strong><small>Groupes, segments ou facteurs qualitatifs</small></div>
      <div><span>Valeurs atypiques</span><strong>{quality.outliers.length}</strong><small>Points en dehors des bornes IQR</small></div>
    </div>
  );
}

function DmaicTestLogic({ rows, labels, factors }) {
  const stats = dmaicStats(rows, {});
  const normality = normalityAnalysis(stats);
  const active = getDmaicFactors(labels, factors);
  const lines = active.map(factor => {
    const values = (rows || []).map(row => getFactorValue(row, factor)).filter(value => String(value || '').trim());
    const groups = (factor.type || '').toLowerCase().startsWith('cat') ? new Set(values.map(String)).size : 0;
    return {
      name: factor.name,
      type: factor.type,
      groups,
      recommendation: testRecommendationForFactor(factor, groups, normality),
    };
  });
  return (
    <div className="dmaic-test-logic">
      <div className="dmaic-test-rule">
        <span>Regle de choix</span>
        <strong>{normality.normal === false ? 'Normalite non confirmee' : normality.normal === true ? 'Normalite acceptable' : 'Normalite a confirmer'}</strong>
        <p>Si Y est normal, l outil privilegie les tests parametriques. Sinon, il bascule vers les tests non parametriques.</p>
      </div>
      <div className="ledger-table-wrap">
        <table className="ledger-table">
          <thead><tr><th>Facteur X</th><th>Type</th><th>Groupes detectes</th><th>Test choisi automatiquement</th></tr></thead>
          <tbody>
            {lines.length ? lines.map(line => (
              <tr key={line.name}>
                <td>{line.name}</td>
                <td>{line.type}</td>
                <td>{line.groups || '-'}</td>
                <td>{line.recommendation}</td>
              </tr>
            )) : (
              <tr><td colSpan="4">Ajoutez au moins un facteur X pour obtenir le choix automatique des tests.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrendChart({ rows, labels }) {
  const names = variableLabels(labels);
  const data = (rows || [])
    .map((row, index) => ({ index: index + 1, date: row.date || String(index + 1), value: asNumber(row.valeur) }))
    .filter(point => point.value !== null);
  if (!data.length) return <div className="dmaic-empty-chart">Ajoutez des mesures chronologiques pour visualiser l'evolution de Y.</div>;
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 12, right: 20, left: -10, bottom: 35 }}>
          <CartesianGrid stroke="#DDE6F1" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval="preserveStartEnd" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" name={names.y} stroke="#10233F" strokeWidth={2.5} dot={{ r: 3, fill: '#2F756A' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function DmaicCausePrioritization({ rows, labels, factors, pareto = [], ishikawa = {}, fivewhy = {} }) {
  const stats = dmaicStats(rows, {});
  const normality = normalityAnalysis(stats);
  const analyses = factorAnalyses(rows, labels, factors, normality);
  const significant = analyses.filter(a => a.p !== null && a.p < 0.05).map(a => ({
    cause: a.name,
    source: 'Test statistique',
    proof: `${a.test} ; p=${roundN(a.p, 4)}`,
    score: 4,
  }));
  const paretoTop = [...(pareto || [])]
    .filter(row => row.cause)
    .sort((a, b) => (Number(b.occurrences) || 0) - (Number(a.occurrences) || 0))
    .slice(0, 3)
    .map(row => ({ cause: row.cause, source: 'Pareto', proof: `${row.occurrences || 0} occurrence(s)`, score: 3 }));
  const ishikawaItems = Object.entries(ishikawa || {})
    .flatMap(([key, value]) => (Array.isArray(value) ? value : [value])
      .filter(cause => String(cause || '').trim())
      .map(cause => ({ cause, source: `Ishikawa ${key}`, proof: 'Cause structuree en 5M', score: 2 })))
    .slice(0, 3);
  const root = fivewhy?.rootCause || fivewhy?.action || '';
  const rootItems = root ? [{ cause: root, source: '5 pourquoi', proof: 'Cause racine formulee', score: 4 }] : [];
  const combined = [...significant, ...paretoTop, ...ishikawaItems, ...rootItems]
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  return (
    <div className="dmaic-priority-panel">
      <div className="dmaic-auto-head">
        <h3>Priorisation automatique des causes</h3>
        <span>statistique + pareto + terrain</span>
      </div>
      {combined.length ? (
        <div className="dmaic-priority-list">
          {combined.map((item, index) => (
            <div className="dmaic-priority-item" key={`${item.source}-${index}`}>
              <strong>{index + 1}. {item.cause}</strong>
              <span>{item.source}</span>
              <p>{item.proof}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="dmaic-empty-chart">Ajoutez des tests, un Pareto, un Ishikawa ou un 5 pourquoi pour obtenir une priorisation automatique des causes.</div>
      )}
    </div>
  );
}

function DmaicNextActionPanel({ rows, spec, labels, factors }) {
  const stats = dmaicStats(rows, spec);
  const quality = dmaicDataQuality(rows, labels, factors);
  const normality = normalityAnalysis(stats);
  const chart = controlChartAnalysis(stats);
  const analyses = factorAnalyses(rows, labels, factors, normality);
  const regression = automaticRegression(rows, labels, factors);
  let action = 'Completez la definition de Y, importez les mesures puis ajoutez les facteurs X a tester.';
  if (quality.validY >= 8 && quality.warnings.length) action = 'Nettoyez les donnees avant decision : valeurs manquantes, outliers ou chronologie a verifier.';
  if (stats.cpk !== null && stats.cpk < 1) action = 'Priorisez la reduction de dispersion et le recentrage : le processus est incapable au regard des limites renseignees.';
  if (chart?.stable === false) action = 'Cherchez la cause de rupture temporelle avant d agir sur la moyenne : les cartes X/MR signalent une instabilite.';
  const bestFactor = analyses.find(a => a.p !== null && a.p < 0.05);
  if (bestFactor) action = `Passez en Improve sur le facteur "${bestFactor.name}" : l effet est significatif probable (${bestFactor.test}).`;
  if (regression?.r2 >= 0.6) action = `Construisez le plan d action autour du modele de regression : ${regression.equation}.`;
  return (
    <div className="dmaic-next-action">
      <span>Prochaine action recommandee</span>
      <strong>{action}</strong>
      <p>Cette recommandation est recalculee a partir de la qualite des donnees, de la normalite, de la capabilite, des cartes X/MR, des tests X et de la regression.</p>
    </div>
  );
}

function DmaicReportReadiness({ define, measure, analyze, improve, control }) {
  const items = [
    ['Performance actuelle', (measure?.data || []).some(row => asNumber(row.valeur) !== null)],
    ['Stabilite et capabilite', Boolean(measure?.spec?.lsl && measure?.spec?.usl)],
    ['Causes principales', Boolean((analyze?.causes || []).length || (analyze?.pareto || []).length)],
    ['Facteurs significatifs', Boolean((measure?.factors || []).length)],
    ['Solutions et plan action', Boolean((improve?.actionPlan || []).length || (improve?.solutions || []).length)],
    ['Plan de controle', Boolean((control?.plan || []).length || (control?.kpis || []).length)],
    ['Impact business', Boolean(control?.businessImpact || define?.businessCase)],
  ];
  const ready = items.filter(([, ok]) => ok).length;
  return (
    <div className="dmaic-report-panel">
      <div>
        <span>Rapport DMAIC automatique</span>
        <strong>{ready}/{items.length} blocs prets</strong>
        <p>Le dossier final pourra reprendre ces blocs : performance, stabilite, capabilite, causes, recommandations, actions et gains.</p>
      </div>
      <div className="dmaic-report-list">
        {items.map(([label, ok]) => <span key={label} className={ok ? 'ready' : ''}>{ok ? 'OK' : 'A completer'} - {label}</span>)}
      </div>
    </div>
  );
}

function DmaicStatsPanel({ rows, spec, labels, factors }) {
  const stats = dmaicStats(rows, spec);
  const names = variableLabels(labels);
  return (
    <div className="dmaic-analysis-shell">
      <div className="dmaic-analysis-head">
        <div>
          <h3>Moteur d'analyse automatique</h3>
          <p>Le module part de vos mesures, controle la qualite des donnees, choisit les tests et produit une conclusion exploitable.</p>
        </div>
        <span>DMAIC stats</span>
      </div>
      <DmaicYProfile labels={labels} spec={spec} />
      <DmaicQualityPanel rows={rows} labels={labels} factors={factors} />
      <DmaicDataProfile rows={rows} labels={labels} factors={factors} />
      <DmaicAnalysisRoadmap rows={rows} spec={spec} labels={labels} factors={factors} />
      <DmaicExecutiveDecision rows={rows} spec={spec} labels={labels} factors={factors} />
      <div className="dmaic-stats-grid">
        <div className="dmaic-stat"><span>Nombre</span><strong>{stats.n || '-'}</strong></div>
        <div className="dmaic-stat"><span>Moyenne</span><strong>{stats.n ? roundN(stats.mean, 2) : '-'}</strong></div>
        <div className="dmaic-stat"><span>Mediane</span><strong>{stats.n ? roundN(stats.median, 2) : '-'}</strong></div>
        <div className="dmaic-stat"><span>Ecart type</span><strong>{stats.n ? roundN(stats.sd, 2) : '-'}</strong></div>
        <div className="dmaic-stat"><span>Variance</span><strong>{stats.n ? roundN(stats.variance, 2) : '-'}</strong></div>
        <div className="dmaic-stat"><span>Etendue</span><strong>{stats.n ? roundN(stats.range, 2) : '-'}</strong></div>
        <div className="dmaic-stat"><span>IQR</span><strong>{stats.n ? roundN(stats.iqr, 2) : '-'}</strong></div>
        <div className="dmaic-stat"><span>Coeff. variation</span><strong>{stats.cv !== null && stats.cv !== undefined ? `${roundN(stats.cv * 100, 1)}%` : '-'}</strong></div>
        <div className="dmaic-stat"><span>Minimum</span><strong>{stats.n ? roundN(stats.min, 2) : '-'}</strong></div>
        <div className="dmaic-stat"><span>Maximum</span><strong>{stats.n ? roundN(stats.max, 2) : '-'}</strong></div>
        <div className="dmaic-stat"><span>Cp / Cpk</span><strong>{stats.cp !== null && stats.cp !== undefined ? `${roundN(stats.cp, 2)} / ${roundN(stats.cpk, 2)}` : '-'}</strong></div>
        <div className="dmaic-stat"><span>Mesure analysee</span><strong>{names.y}</strong></div>
      </div>
      <NormalitySummary stats={stats} />
      <CapabilitySummary stats={stats} />
      <AutomaticDmaicInsights rows={rows} spec={spec} labels={labels} factors={factors} />
      <div className="dmaic-chart-grid">
        <div className="dmaic-chart-card"><h4>Histogramme</h4><HistogramChart stats={stats} /></div>
        <div className="dmaic-chart-card"><h4>Boite a moustaches</h4><BoxPlot stats={stats} /></div>
        <div className="dmaic-chart-card"><h4>Evolution dans le temps</h4><TrendChart rows={rows} labels={labels} /></div>
        <div className="dmaic-chart-card"><h4>QQ plot - normalite</h4><QqPlot stats={stats} /></div>
        <div className="dmaic-chart-card full"><h4>Cartes de controle X et MR</h4><ControlCharts stats={stats} /></div>
      </div>
      <DmaicNextActionPanel rows={rows} spec={spec} labels={labels} factors={factors} />
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
.shape-diamond{
  width:112px;
  height:112px;
  min-width:112px;
  max-width:112px;
  padding:0;
  border:0!important;
  background:transparent!important;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:visible;
}
.shape-diamond::before{
  content:"";
  position:absolute;
  width:78px;
  height:78px;
  top:17px;
  left:17px;
  background:var(--paper-2);
  border:1.5px solid var(--ink);
  transform:rotate(45deg);
  z-index:0;
}
.shape-diamond:hover::before{ border-color:var(--teal); }
.flow-node-label{ position:relative; z-index:1; }
.shape-diamond .flow-node-label{ max-width:66px; line-height:1.2; }
.shape-circle{ border-radius:50%; width:92px; height:92px; display:flex; align-items:center; justify-content:center; min-width:92px; }
.shape-ctrl{ border-style:dashed; border-color:var(--amber); }
.is-pain{ border-color:var(--amber)!important; box-shadow:0 0 0 3px rgba(201,125,46,0.16); }
.shape-diamond.is-pain{ box-shadow:none; }
.shape-diamond.is-pain::before{ border-color:var(--amber)!important; box-shadow:0 0 0 3px rgba(201,125,46,0.16); }
.flow-pain-badge{ position:absolute; top:-8px; right:-8px; background:var(--amber); color:#fff; border-radius:50%; width:18px; height:18px; font-size:11px; display:flex; align-items:center; justify-content:center; }
.shape-diamond .flow-pain-badge{ top:10px; right:8px; z-index:2; }
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

/* Premium dark SaaS workspace */
.lean-app{
  --ink:#F8FAFC; --ink-soft:#A1A1AA; --paper:#09090B; --paper-2:#18181B; --line:rgba(255,255,255,.10);
  --teal:#00C2FF; --blue:#4F7CFF; --violet:#7C4DFF; --amber:#F59E0B; --red:#EF4444;
  width:100vw; min-height:100vh; margin:0; max-height:none; border:0; border-radius:0;
  background:
    radial-gradient(circle at 14% -10%, rgba(79,124,255,.26), transparent 32rem),
    radial-gradient(circle at 86% 2%, rgba(124,77,255,.18), transparent 30rem),
    linear-gradient(135deg,#09090B 0%,#111827 52%,#09090B 100%);
  color:#F8FAFC; box-shadow:none;
}
.lean-app::before{ content:""; position:fixed; inset:0; pointer-events:none; background:linear-gradient(rgba(255,255,255,.024) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.024) 1px,transparent 1px); background-size:48px 48px; mask-image:linear-gradient(to bottom,rgba(0,0,0,.72),transparent 75%); }
.project-home{ position:relative; z-index:1; width:min(1280px,calc(100vw - 48px)); margin:0 auto; padding:44px 0 70px; }
.home-hero{ display:flex; align-items:flex-end; justify-content:space-between; gap:28px; padding:30px; border:1px solid rgba(255,255,255,.11); border-radius:28px; background:linear-gradient(135deg,rgba(24,24,27,.82),rgba(17,24,39,.68)); box-shadow:0 30px 80px rgba(0,0,0,.34); backdrop-filter:blur(22px); }
.home-kicker{ display:inline-flex; align-items:center; gap:8px; color:#00C2FF; font-size:13px; font-weight:850; text-transform:uppercase; }
.home-hero h1{ margin:16px 0 10px; color:#fff; font-size:clamp(38px,6vw,72px); line-height:.94; letter-spacing:0; }
.home-hero p{ max-width:760px; margin:0; color:#A1A1AA; font-size:16px; line-height:1.65; }
.home-primary,.open-project{ display:inline-flex; align-items:center; justify-content:center; gap:8px; border:0; color:#fff; background:linear-gradient(135deg,#4F7CFF,#7C4DFF); box-shadow:0 18px 40px rgba(79,124,255,.28); }
.home-primary{ min-height:48px; padding:0 18px; white-space:nowrap; }
.home-widgets{ display:grid; grid-template-columns:220px 220px minmax(260px,1fr); gap:14px; margin:18px 0; }
.home-widget,.home-search,.project-card,.empty-projects{ border:1px solid rgba(255,255,255,.1); border-radius:24px; background:rgba(24,24,27,.72); box-shadow:0 24px 60px rgba(0,0,0,.22); backdrop-filter:blur(18px); }
.home-widget{ min-height:126px; padding:18px; }
.home-widget span{ display:block; color:#A1A1AA; font-size:12px; font-weight:850; text-transform:uppercase; }
.home-widget strong{ display:block; margin:12px 0 4px; color:#fff; font-size:38px; line-height:1; }
.home-widget small{ color:#71717A; }
.home-widget.warning strong{ color:#F59E0B; }
.home-search{ min-height:64px; display:flex; align-items:center; align-self:end; gap:12px; padding:0 18px; color:#A1A1AA; }
.home-search input{ flex:1; min-width:0; border:0!important; background:transparent!important; box-shadow:none!important; color:#fff; padding:0; }
.project-grid{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; }
.project-card{ padding:20px; min-height:280px; display:flex; flex-direction:column; }
.project-card-top{ display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
.project-icon{ width:44px; height:44px; display:grid; place-items:center; border-radius:16px; color:#fff; background:linear-gradient(135deg,#4F7CFF,#00C2FF); box-shadow:0 16px 32px rgba(0,194,255,.16); }
.status-badge{ display:inline-flex; align-items:center; min-height:28px; padding:0 10px; border-radius:999px; color:#FDE68A; background:rgba(245,158,11,.12); border:1px solid rgba(245,158,11,.24); font-size:12px; font-weight:850; }
.status-badge.done{ color:#86EFAC; background:rgba(34,197,94,.12); border-color:rgba(34,197,94,.25); }
.project-card h2{ margin:0 0 10px; color:#fff; font-size:21px; line-height:1.18; }
.project-card p{ flex:1; margin:0; color:#A1A1AA; font-size:13.5px; line-height:1.55; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden; }
.project-progress{ margin:18px 0; }
.project-progress div{ height:8px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden; margin-bottom:8px; }
.project-progress span{ display:block; height:100%; border-radius:999px; background:linear-gradient(90deg,#4F7CFF,#7C4DFF,#00C2FF); }
.project-progress strong{ color:#D4D4D8; font-size:12px; }
.open-project{ min-height:42px; border-radius:14px; }
.empty-projects{ grid-column:1/-1; min-height:260px; display:grid; place-items:center; text-align:center; padding:34px; color:#A1A1AA; }
.empty-projects h2{ margin:10px 0 4px; color:#fff; }
.sidebar{ background:rgba(9,9,11,.78); border-right:1px solid rgba(255,255,255,.09); backdrop-filter:blur(20px); box-shadow:18px 0 48px rgba(0,0,0,.32); }
.back-home{ display:inline-flex; align-items:center; gap:7px; min-height:34px; margin-bottom:16px; padding:0 10px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); color:#F8FAFC; border-radius:12px; }
.back-home:hover{ border-color:rgba(79,124,255,.55); background:rgba(79,124,255,.14); }
.sidebar-head h1{ color:#fff; }
.project-name{ background:rgba(255,255,255,.06)!important; border-color:rgba(255,255,255,.12)!important; color:#fff!important; }
.progress-line{ background:rgba(255,255,255,.08); }
.progress-fill{ background:linear-gradient(90deg,#4F7CFF,#7C4DFF,#00C2FF); }
.step-item:hover{ background:rgba(255,255,255,.06); }
.step-item.is-active{ background:linear-gradient(135deg,rgba(79,124,255,.2),rgba(124,77,255,.12)); color:#fff; border:1px solid rgba(255,255,255,.12); box-shadow:0 18px 42px rgba(0,0,0,.28); }
.step-num,.step-item.is-active .step-num{ color:#00C2FF; }
.main{ background:transparent; }
.dossier-card{ max-width:1120px; background:rgba(24,24,27,.78); border-color:rgba(255,255,255,.1); color:#F8FAFC; box-shadow:0 24px 60px rgba(0,0,0,.26); backdrop-filter:blur(18px); border-radius:24px; }
.eyebrow,.field label,.progress-text,.pdf-hint,.save-indicator{ color:#A1A1AA; }
.dossier-card h2,.sub-title{ color:#fff; }
.objectif,.livrable{ color:#D4D4D8; }
.objectif em,.livrable em{ color:#00C2FF; }
.lean-app input,.lean-app select,.lean-app textarea{ background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.11); color:#FAFAFA; }
.lean-app select option{ background:#111827; color:#FAFAFA; }
.ledger-table-wrap,.flow-node,.pain-callout,.fivewhy,.vsm-summary div,.kpi-card{ background:rgba(255,255,255,.045); border-color:rgba(255,255,255,.1); box-shadow:none; }
.ledger-table th{ background:rgba(255,255,255,.06); color:#A1A1AA; border-bottom-color:rgba(255,255,255,.1); }
.ledger-table td{ color:#F4F4F5; border-bottom-color:rgba(255,255,255,.08); }
.ledger-table tr:hover td{ background:rgba(79,124,255,.08); }
.btn-add,.nav-btn,.ghost-btn{ background:rgba(255,255,255,.06); border-color:rgba(255,255,255,.13); color:#FAFAFA; }
.btn-add:hover,.nav-btn:not(:disabled):hover,.ghost-btn:hover{ background:rgba(79,124,255,.14); border-color:rgba(79,124,255,.45); color:#fff; }
.validate-btn{ background:linear-gradient(135deg,#4F7CFF,#7C4DFF); box-shadow:0 16px 34px rgba(79,124,255,.22); }
.validate-btn.is-validated{ background:#22C55E; color:#06130A; }
.theme-toggle{ display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:40px; padding:0 13px; border:1px solid rgba(255,255,255,.13); border-radius:999px; background:rgba(255,255,255,.08); color:#F8FAFC; font-weight:800; }
.home-theme-toggle{ position:absolute; top:24px; right:0; z-index:3; }

/* Light SaaS theme */
.theme-light{
  --ink:#111827; --ink-soft:#667085; --paper:#F8FAFC; --paper-2:#FFFFFF; --line:#E5E7EB;
  background:
    radial-gradient(circle at 10% -8%, rgba(79,124,255,.16), transparent 30rem),
    radial-gradient(circle at 88% 0%, rgba(0,194,255,.12), transparent 26rem),
    linear-gradient(135deg,#FFFFFF 0%,#F7F8FC 48%,#EEF4FF 100%);
  color:#111827;
}
.theme-light::before{ background:linear-gradient(rgba(17,24,39,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(17,24,39,.035) 1px,transparent 1px); background-size:48px 48px; mask-image:linear-gradient(to bottom,rgba(0,0,0,.4),transparent 70%); }
.theme-light .home-hero,.theme-light .home-widget,.theme-light .home-search,.theme-light .project-card,.theme-light .empty-projects,.theme-light .dossier-card{
  background:rgba(255,255,255,.82); border-color:rgba(17,24,39,.09); color:#111827; box-shadow:0 24px 70px rgba(31,41,55,.12); backdrop-filter:blur(18px);
}
.theme-light .home-hero h1,.theme-light .project-card h2,.theme-light .empty-projects h2,.theme-light .dossier-card h2,.theme-light .sub-title{ color:#0F172A; }
.theme-light .home-hero p,.theme-light .project-card p,.theme-light .home-widget small,.theme-light .project-progress strong,.theme-light .objectif,.theme-light .livrable{ color:#667085; }
.theme-light .home-kicker,.theme-light .objectif em,.theme-light .livrable em{ color:#4F7CFF; }
.theme-light .home-widget span{ color:#667085; }
.theme-light .home-widget strong{ color:#111827; }
.theme-light .home-search{ color:#667085; }
.theme-light .home-search input{ color:#111827!important; }
.theme-light .home-search input::placeholder{ color:#98A2B3; }
.theme-light .theme-toggle{ background:#fff; border-color:#E5E7EB; color:#344054; box-shadow:0 10px 30px rgba(31,41,55,.08); }
.theme-light .sidebar{ background:rgba(255,255,255,.86); border-right:1px solid rgba(17,24,39,.09); color:#111827; box-shadow:18px 0 48px rgba(31,41,55,.08); }
.theme-light .sidebar-head h1,.theme-light .step-item.is-active,.theme-light .step-title{ color:#111827; }
.theme-light .sidebar-eyebrow,.theme-light .progress-text,.theme-light .pdf-hint,.theme-light .save-indicator,.theme-light .eyebrow,.theme-light .field label{ color:#667085; }
.theme-light .project-name{ background:#fff!important; border-color:#D0D5DD!important; color:#111827!important; }
.theme-light .progress-line,.theme-light .project-progress div{ background:#E5E7EB; }
.theme-light .step-item{ color:#475467; }
.theme-light .step-item:hover{ background:#F3F6FF; }
.theme-light .step-item.is-active{ background:#EEF4FF; border-color:#C7D7FE; box-shadow:none; }
.theme-light .back-home,.theme-light .ghost-btn,.theme-light .btn-add,.theme-light .nav-btn{ background:#fff; border-color:#D0D5DD; color:#344054; }
.theme-light .back-home:hover,.theme-light .ghost-btn:hover,.theme-light .btn-add:hover,.theme-light .nav-btn:not(:disabled):hover{ background:#F3F6FF; border-color:#A8BFFF; color:#1D4ED8; }
.theme-light .lean-app input,.theme-light input,.theme-light select,.theme-light textarea{ background:#fff; border-color:#D0D5DD; color:#111827; }
.theme-light select option{ background:#fff; color:#111827; }
.theme-light .ledger-table-wrap,.theme-light .flow-node,.theme-light .pain-callout,.theme-light .fivewhy,.theme-light .vsm-summary div,.theme-light .kpi-card{ background:#fff; border-color:#E5E7EB; }
.theme-light .ledger-table th{ background:#F9FAFB; color:#667085; border-bottom-color:#E5E7EB; }
.theme-light .ledger-table td{ color:#1F2937; border-bottom-color:#EEF2F7; }
.theme-light .ledger-table tr:hover td{ background:#F8FAFF; }
.theme-light .status-badge{ color:#B45309; background:#FEF3C7; border-color:#FDE68A; }
.theme-light .status-badge.done{ color:#15803D; background:#DCFCE7; border-color:#BBF7D0; }
.theme-light .validate-btn{ background:linear-gradient(135deg,#4F7CFF,#7C4DFF); color:#fff; }
.theme-light .validate-btn.is-validated{ background:#22C55E; color:#052E16; }

/* Serious enterprise direction */
.lean-app{
  --blue:#1D4ED8; --violet:#334155; --teal:#0F766E; --amber:#B45309; --red:#B42318;
  background:#0B1220;
}
.lean-app::before{ display:none; }
.project-home{ width:min(1220px,calc(100vw - 56px)); padding-top:34px; }
.home-hero,.home-widget,.home-search,.project-card,.empty-projects,.dossier-card{
  border-radius:12px; backdrop-filter:none;
}
.home-hero{
  align-items:center; padding:28px 30px; background:#111827; border-color:#263244;
  box-shadow:0 18px 48px rgba(0,0,0,.24);
}
.home-kicker{ color:#93C5FD; font-size:12px; letter-spacing:0; }
.home-hero h1{ font-size:clamp(32px,4vw,52px); line-height:1.04; letter-spacing:0; margin:12px 0 8px; }
.home-hero p{ color:#CBD5E1; font-size:15px; line-height:1.6; }
.home-primary,.open-project,.validate-btn{ background:#1D4ED8; box-shadow:none; }
.home-primary:hover,.open-project:hover,.validate-btn:hover{ background:#1E40AF; }
.home-widget,.home-search,.project-card,.empty-projects{
  background:#111827; border-color:#263244; box-shadow:0 10px 28px rgba(0,0,0,.18);
}
.home-widget{ min-height:112px; }
.home-widget strong{ font-size:32px; }
.project-icon{ border-radius:10px; background:#1D4ED8; box-shadow:none; }
.status-badge{ border-radius:6px; }
.project-card{ min-height:260px; }
.project-card h2{ font-size:19px; }
.project-progress div{ height:7px; }
.project-progress span,.progress-fill{ background:#1D4ED8; }
.theme-toggle{ border-radius:8px; }
.sidebar{ background:#0B1220; border-right-color:#1F2937; box-shadow:none; }
.step-item{ border-radius:8px; }
.step-item.is-active{ background:#172033; border-color:#334155; box-shadow:none; }
.step-num,.step-item.is-active .step-num{ color:#93C5FD; }
.back-home,.ghost-btn,.btn-add,.nav-btn{ border-radius:8px; }
.dossier-card{ background:#111827; border-color:#263244; box-shadow:0 12px 34px rgba(0,0,0,.18); }
.objectif,.livrable{ border-left:3px solid #1D4ED8; padding-left:12px; }
.objectif em,.livrable em{ color:#93C5FD; }
.ledger-table-wrap,.flow-node,.pain-callout,.fivewhy,.vsm-summary div,.kpi-card{ border-radius:10px; }
.lean-app input,.lean-app select,.lean-app textarea{ border-radius:8px; }

.theme-light{
  --blue:#1D4ED8; --violet:#334155; --teal:#0F766E; --amber:#B45309; --red:#B42318;
  background:#F3F6FA;
}
.theme-light .project-home{ width:min(1220px,calc(100vw - 56px)); }
.theme-light .home-hero,.theme-light .home-widget,.theme-light .home-search,.theme-light .project-card,.theme-light .empty-projects,.theme-light .dossier-card{
  background:#FFFFFF; border-color:#D9E0EA; box-shadow:0 12px 30px rgba(15,23,42,.08); backdrop-filter:none;
}
.theme-light .home-hero{ background:#FFFFFF; }
.theme-light .home-kicker{ color:#1D4ED8; }
.theme-light .home-hero h1{ color:#111827; }
.theme-light .home-hero p,.theme-light .project-card p{ color:#475467; }
.theme-light .home-primary,.theme-light .open-project,.theme-light .validate-btn{ background:#1D4ED8; color:#fff; box-shadow:none; }
.theme-light .home-primary:hover,.theme-light .open-project:hover,.theme-light .validate-btn:hover{ background:#1E40AF; }
.theme-light .project-icon{ background:#1D4ED8; box-shadow:none; }
.theme-light .project-progress span,.theme-light .progress-fill{ background:#1D4ED8; }
.theme-light .theme-toggle{ box-shadow:none; }
.theme-light .sidebar{ background:#FFFFFF; border-right-color:#D9E0EA; box-shadow:none; }
.theme-light .step-item.is-active{ background:#EAF1FF; border-color:#BFD3FF; }
.theme-light .step-num,.theme-light .step-item.is-active .step-num{ color:#1D4ED8; }
.theme-light .objectif,.theme-light .livrable{ border-left:3px solid #1D4ED8; padding-left:12px; }
.theme-light .objectif em,.theme-light .livrable em{ color:#1D4ED8; }
.theme-light .status-badge{ background:#FFF7ED; border-color:#FED7AA; color:#9A3412; }
.theme-light .status-badge.done{ background:#ECFDF3; border-color:#BBF7D0; color:#166534; }

/* Readability and collapsible project sidebar */
.sidebar{ transition:width .22s ease, min-width .22s ease, background .2s ease; }
.main{ transition:padding .22s ease; }
.sidebar-top-actions{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:14px; }
.collapse-btn{ display:grid; place-items:center; width:34px; height:34px; flex:0 0 34px; border:1px solid #334155; background:#111827; color:#E5E7EB; border-radius:8px; }
.collapse-btn:hover{ background:#172033; border-color:#475569; }
.sidebar-collapsed .sidebar{ width:76px; min-width:76px; }
.sidebar-collapsed .sidebar-head{ padding:18px 12px 12px; }
.sidebar-collapsed .sidebar-top-actions{ flex-direction:column-reverse; margin-bottom:8px; }
.sidebar-collapsed .back-home{ width:42px; height:36px; padding:0; justify-content:center; }
.sidebar-collapsed .back-home span,.sidebar-collapsed .sidebar-expanded-only,.sidebar-collapsed .step-title,.sidebar-collapsed .step-stamp,.sidebar-collapsed .sidebar-foot,.sidebar-collapsed .pdf-hint{ display:none; }
.sidebar-collapsed .steps-nav{ padding:8px; }
.sidebar-collapsed .step-item{ width:44px; height:44px; padding:0; justify-content:center; margin:4px auto; }
.sidebar-collapsed .step-num{ min-width:0; font-size:12px; }
.sidebar-collapsed .main{ padding-left:clamp(24px,4vw,64px); }

.lean-app{ background:#0A1020; }
.home-hero,.home-widget,.home-search,.project-card,.empty-projects,.dossier-card{ border-color:#334155; }
.home-hero,.home-widget,.home-search,.project-card,.empty-projects,.dossier-card,.sidebar{ background:#111827; }
.home-hero p,.project-card p,.objectif,.livrable{ color:#CBD5E1; }
.home-widget span,.project-progress strong,.eyebrow,.field label,.progress-text,.pdf-hint,.save-indicator{ color:#94A3B8; }
.home-widget small{ color:#94A3B8; }
.ledger-table th{ color:#CBD5E1; }
.ledger-table td{ color:#F8FAFC; }
.lean-app input,.lean-app select,.lean-app textarea{ background:#0F172A; border-color:#334155; color:#F8FAFC; }
.lean-app input::placeholder,.lean-app textarea::placeholder{ color:#94A3B8; }
.btn-add,.nav-btn,.ghost-btn,.back-home{ background:#0F172A; border-color:#334155; color:#E5E7EB; }
.btn-add:hover,.nav-btn:not(:disabled):hover,.ghost-btn:hover,.back-home:hover{ background:#172554; border-color:#3B82F6; color:#FFFFFF; }

.theme-light{ background:#F5F7FB; }
.theme-light .home-hero,.theme-light .home-widget,.theme-light .home-search,.theme-light .project-card,.theme-light .empty-projects,.theme-light .dossier-card,.theme-light .sidebar{ background:#FFFFFF; border-color:#CBD5E1; }
.theme-light .home-hero p,.theme-light .project-card p,.theme-light .objectif,.theme-light .livrable{ color:#334155; }
.theme-light .home-widget span,.theme-light .project-progress strong,.theme-light .eyebrow,.theme-light .field label,.theme-light .progress-text,.theme-light .pdf-hint,.theme-light .save-indicator{ color:#475569; }
.theme-light .home-widget small{ color:#64748B; }
.theme-light .home-widget strong,.theme-light .project-card h2,.theme-light .dossier-card h2,.theme-light .sub-title{ color:#0F172A; }
.theme-light .lean-app input,.theme-light input,.theme-light select,.theme-light textarea{ background:#FFFFFF; border-color:#CBD5E1; color:#0F172A; }
.theme-light input::placeholder,.theme-light textarea::placeholder{ color:#64748B; }
.theme-light .ledger-table th{ background:#F1F5F9; color:#334155; }
.theme-light .ledger-table td{ color:#111827; border-bottom-color:#E2E8F0; }
.theme-light .ledger-table tr:hover td{ background:#EFF6FF; }
.theme-light .btn-add,.theme-light .nav-btn,.theme-light .ghost-btn,.theme-light .back-home,.theme-light .collapse-btn{ background:#FFFFFF; border-color:#CBD5E1; color:#1E293B; }
.theme-light .btn-add:hover,.theme-light .nav-btn:not(:disabled):hover,.theme-light .ghost-btn:hover,.theme-light .back-home:hover,.theme-light .collapse-btn:hover{ background:#EFF6FF; border-color:#60A5FA; color:#1D4ED8; }

/* Structured operations UI */
.lean-app{
  --blue:#2454D6; --teal:#0F766E; --amber:#B7791F; --red:#B42318;
  background:#0E1626;
}
.project-home{ width:min(1240px,calc(100vw - 48px)); }
.home-hero,.home-widget,.home-search,.project-card,.empty-projects,.dossier-card{
  border-radius:6px;
  box-shadow:none;
}
.home-hero{
  background:#111C2E;
  border:1px solid #2A3A52;
  border-top:4px solid #2454D6;
  padding:24px 28px;
}
.home-hero h1{ font-size:clamp(30px,3.5vw,46px); line-height:1.08; }
.home-kicker{ color:#8DB4FF; }
.home-widget,.home-search,.project-card,.empty-projects{
  background:#111C2E;
  border:1px solid #2A3A52;
}
.home-widget{ border-top:3px solid #334155; }
.home-widget.warning{ border-top-color:#B7791F; }
.home-search{ border-left:4px solid #2454D6; }
.project-grid{ gap:14px; }
.project-card{ padding:18px; border-top:3px solid #2454D6; }
.project-card:hover{ border-color:#4B6FE8; background:#142238; }
.project-icon{ width:38px; height:38px; border-radius:6px; background:#2454D6; }
.status-badge{ border-radius:4px; min-height:26px; }
.open-project,.home-primary,.validate-btn{ border-radius:6px; background:#2454D6; }
.open-project:hover,.home-primary:hover,.validate-btn:hover{ background:#1E40AF; }
.project-progress div,.progress-line{ border-radius:2px; }
.project-progress span,.progress-fill{ border-radius:2px; background:#2454D6; }
.sidebar{ background:#0A1220; border-right:1px solid #243247; }
.sidebar-head{ border-bottom-color:#243247; }
.steps-nav{ border-top:1px solid #182538; }
.step-item{ border-radius:4px; border:1px solid transparent; }
.step-item.is-active{ background:#16243A; border-color:#365175; }
.back-home,.collapse-btn,.ghost-btn,.btn-add,.nav-btn,.theme-toggle{ border-radius:6px; }
.dossier-card{
  max-width:1220px;
  background:#111C2E;
  border:1px solid #2A3A52;
  border-top:4px solid #2454D6;
  border-radius:6px;
  padding:26px 28px;
}
.eyebrow{ border-bottom:1px solid #2A3A52; padding-bottom:12px; }
.dossier-card h2{ font-size:clamp(28px,3vw,40px); margin-top:12px; }
.objectif,.livrable{
  max-width:none;
  background:#0F1A2B;
  border:1px solid #2A3A52;
  border-left:4px solid #2454D6;
  border-radius:4px;
  padding:12px 14px;
  margin-top:8px;
}
.step-body{ gap:14px; }
.sub-title{
  border-top:1px solid #2A3A52;
  border-bottom:1px solid #2A3A52;
  background:#0F1A2B;
  padding:12px 14px;
  margin:24px -14px 12px;
  border-radius:0;
}
.field{ margin-bottom:14px; }
.lean-app input,.lean-app select,.lean-app textarea{
  border-radius:4px;
  background:#0B1424;
  border:1px solid #334155;
}
.ledger-table-wrap{
  border:1px solid #334155;
  border-radius:4px;
  background:#0B1424;
}
.ledger-table{ border-collapse:separate; border-spacing:0; }
.ledger-table th{
  background:#17243A;
  color:#E2E8F0;
  border-bottom:1px solid #3A4A63;
  border-right:1px solid #2A3A52;
  padding:11px 12px;
}
.ledger-table td{
  border-bottom:1px solid #26364C;
  border-right:1px solid #1F2F45;
  padding:9px 12px;
}
.ledger-table tr:hover td{ background:#152238; }
.flow-node,.pain-callout,.fivewhy,.vsm-summary div,.kpi-card{
  border-radius:4px;
  background:#0F1A2B;
  border-color:#2A3A52;
}
.step-actions{
  border-top:1px solid #2A3A52;
  padding-top:16px;
}

.theme-light{ background:#EEF2F7; }
.theme-light .home-hero,.theme-light .home-widget,.theme-light .home-search,.theme-light .project-card,.theme-light .empty-projects,.theme-light .dossier-card{
  background:#FFFFFF;
  border-color:#B8C4D4;
  box-shadow:none;
}
.theme-light .home-hero{ border-top-color:#2454D6; }
.theme-light .home-widget{ border-top:3px solid #94A3B8; }
.theme-light .home-widget.warning{ border-top-color:#B7791F; }
.theme-light .project-card{ border-top:3px solid #2454D6; }
.theme-light .project-card:hover{ background:#F8FAFC; border-color:#7EA1F2; }
.theme-light .sidebar{ background:#FFFFFF; border-right-color:#B8C4D4; }
.theme-light .sidebar-head{ border-bottom-color:#D5DDE8; }
.theme-light .steps-nav{ border-top:1px solid #E2E8F0; }
.theme-light .step-item{ border-radius:4px; }
.theme-light .step-item.is-active{ background:#E8F0FF; border-color:#9DB7F5; }
.theme-light .dossier-card{
  border-top:4px solid #2454D6;
  border-radius:6px;
}
.theme-light .objectif,.theme-light .livrable{
  background:#F8FAFC;
  border:1px solid #CBD5E1;
  border-left:4px solid #2454D6;
  border-radius:4px;
}
.theme-light .sub-title{
  background:#F1F5F9;
  border-top:1px solid #CBD5E1;
  border-bottom:1px solid #CBD5E1;
}
.theme-light .ledger-table-wrap{
  border-color:#B8C4D4;
  border-radius:4px;
}
.theme-light .ledger-table th{
  background:#E2E8F0;
  color:#0F172A;
  border-bottom-color:#B8C4D4;
  border-right:1px solid #CBD5E1;
}
.theme-light .ledger-table td{
  border-bottom-color:#DDE5EF;
  border-right:1px solid #E2E8F0;
}
.theme-light .flow-node,.theme-light .pain-callout,.theme-light .fivewhy,.theme-light .vsm-summary div,.theme-light .kpi-card{
  background:#FFFFFF;
  border-color:#CBD5E1;
  border-radius:4px;
}
.theme-light .lean-app input,.theme-light input,.theme-light select,.theme-light textarea{
  background:#FFFFFF;
  border-color:#B8C4D4;
  border-radius:4px;
}
.theme-light .step-actions{ border-top-color:#CBD5E1; }

/* Final light-only color system */
.theme-light{
  --blue:#2454D6; --teal:#0F766E; --amber:#C47A16; --red:#B42318;
  --ink:#102033; --ink-soft:#4B5F78; --paper:#EAF1FA; --paper-2:#FFFFFF; --line:#B9C7D8;
  background:
    linear-gradient(180deg,#F7FAFF 0%,#EAF1FA 42%,#E4EDF8 100%);
  color:#102033;
}
.theme-light::before{ display:none; }
.theme-light .project-home{ width:min(1240px,calc(100vw - 48px)); }
.theme-light .home-hero{
  background:linear-gradient(135deg,#FFFFFF 0%,#F3F7FF 100%);
  border:1px solid #B9C7D8;
  border-top:4px solid #2454D6;
  box-shadow:0 10px 28px rgba(36,84,214,.10);
}
.theme-light .home-kicker{ color:#2454D6; }
.theme-light .home-hero h1{ color:#102033; }
.theme-light .home-hero p{ color:#40536B; }
.theme-light .home-widget,.theme-light .home-search,.theme-light .project-card,.theme-light .empty-projects{
  background:#FFFFFF;
  border-color:#B9C7D8;
  box-shadow:0 8px 20px rgba(16,32,51,.07);
}
.theme-light .home-widget{ border-top:3px solid #6B7F99; }
.theme-light .home-widget.warning{ border-top-color:#C47A16; }
.theme-light .home-widget span,.theme-light .home-widget small,.theme-light .project-progress strong{ color:#4B5F78; }
.theme-light .home-widget strong{ color:#102033; }
.theme-light .home-search{ border-left:4px solid #2454D6; color:#4B5F78; }
.theme-light .home-search input{ color:#102033!important; }
.theme-light .home-primary,.theme-light .open-project,.theme-light .validate-btn{
  background:#2454D6;
  color:#FFFFFF;
}
.theme-light .home-primary:hover,.theme-light .open-project:hover,.theme-light .validate-btn:hover{ background:#1E3FAE; }
.theme-light .project-card{ border-top:3px solid #2454D6; }
.theme-light .project-card:hover{ background:#F8FBFF; border-color:#8AA7E8; }
.theme-light .project-card h2{ color:#102033; }
.theme-light .project-card p{ color:#40536B; }
.theme-light .project-icon{ background:#2454D6; }
.theme-light .project-progress div,.theme-light .progress-line{ background:#D9E4F2; }
.theme-light .project-progress span,.theme-light .progress-fill{ background:#2454D6; }
.theme-light .status-badge{ background:#FFF2DB; border-color:#F3C47A; color:#8A4B00; }
.theme-light .status-badge.done{ background:#E2F7EA; border-color:#8BD3A4; color:#0F6B34; }
.theme-light .sidebar{
  background:#102033;
  border-right-color:#203B5A;
  color:#F8FAFC;
}
.theme-light .sidebar-head{ border-bottom-color:#203B5A; }
.theme-light .sidebar-head h1,.theme-light .step-title{ color:#F8FAFC; }
.theme-light .sidebar-eyebrow,.theme-light .progress-text,.theme-light .pdf-hint,.theme-light .save-indicator{ color:#B9C7D8; }
.theme-light .project-name{
  background:#172B45!important;
  border-color:#365574!important;
  color:#FFFFFF!important;
}
.theme-light .step-item{ color:#DDE7F3; }
.theme-light .step-item:hover{ background:#172B45; }
.theme-light .step-item.is-active{
  background:#EAF1FA;
  border-color:#8AA7E8;
  color:#102033;
}
.theme-light .step-item.is-active .step-title{ color:#102033; }
.theme-light .step-num,.theme-light .step-item.is-active .step-num{ color:#5FA8FF; }
.theme-light .back-home,.theme-light .collapse-btn,.theme-light .ghost-btn{
  background:#172B45;
  border-color:#365574;
  color:#F8FAFC;
}
.theme-light .back-home:hover,.theme-light .collapse-btn:hover,.theme-light .ghost-btn:hover{
  background:#203B5A;
  border-color:#5FA8FF;
  color:#FFFFFF;
}
.theme-light .btn-add,.theme-light .nav-btn{
  background:#FFFFFF;
  border-color:#AEBED1;
  color:#102033;
}
.theme-light .btn-add:hover,.theme-light .nav-btn:not(:disabled):hover{
  background:#EFF5FF;
  border-color:#2454D6;
  color:#1E3FAE;
}
.theme-light .main{ background:transparent; }
.theme-light .dossier-card{
  background:#FFFFFF;
  border-color:#B9C7D8;
  border-top:4px solid #2454D6;
  box-shadow:0 10px 26px rgba(16,32,51,.08);
}
.theme-light .dossier-card h2,.theme-light .sub-title{ color:#102033; }
.theme-light .eyebrow,.theme-light .field label{ color:#4B5F78; }
.theme-light .objectif,.theme-light .livrable{
  background:#F3F7FF;
  border-color:#C9D8EC;
  border-left-color:#2454D6;
  color:#40536B;
}
.theme-light .objectif em,.theme-light .livrable em{ color:#2454D6; }
.theme-light .sub-title{
  background:#EAF1FA;
  border-color:#B9C7D8;
}
.theme-light .lean-app input,.theme-light input,.theme-light select,.theme-light textarea{
  background:#FFFFFF;
  border-color:#AEBED1;
  color:#102033;
}
.theme-light input::placeholder,.theme-light textarea::placeholder{ color:#6B7F99; }
.theme-light .ledger-table-wrap{
  background:#FFFFFF;
  border-color:#AEBED1;
}
.theme-light .ledger-table th{
  background:#DDE8F5;
  color:#102033;
  border-bottom-color:#AEBED1;
  border-right-color:#C2D0E0;
}
.theme-light .ledger-table td{
  color:#102033;
  border-bottom-color:#D7E1ED;
  border-right-color:#E0E8F1;
}
.theme-light .ledger-table tr:hover td{ background:#F0F6FF; }
.theme-light .flow-node,.theme-light .pain-callout,.theme-light .fivewhy,.theme-light .vsm-summary div,.theme-light .kpi-card{
  background:#FFFFFF;
  border-color:#B9C7D8;
}
.theme-light .step-actions{ border-top-color:#B9C7D8; }

/* Line-based dossier style inspired by formal Lean worksheets */
.theme-light{
  --blue:#183B73; --teal:#2F756A; --amber:#C98224; --red:#B42318;
  --ink:#112747; --ink-soft:#52637A; --paper:#F5F1E9; --paper-2:#FBF8F0; --line:#D8D0C2;
  background:#ECE7DC;
  color:#112747;
}
.theme-light .main{
  background:#F5F1E9;
  padding:34px 38px;
}
.theme-light .dossier-card{
  max-width:1290px;
  background:#F7F3EB;
  border:1px solid #D8D0C2;
  border-top:5px solid #112747;
  border-radius:0;
  box-shadow:none;
  padding:26px 20px 44px;
}
.theme-light .eyebrow{
  color:#52637A;
  border-bottom:1px solid #D8D0C2;
  padding-bottom:14px;
}
.theme-light .dossier-card h2{
  font-family:Georgia, 'Times New Roman', serif;
  font-weight:500;
  font-size:clamp(28px,2.5vw,36px);
  color:#112747;
  margin:20px 0 18px;
}
.theme-light .objectif,
.theme-light .livrable{
  background:transparent;
  border:0;
  border-bottom:1px solid #D8D0C2;
  border-left:0;
  border-radius:0;
  color:#112747;
  padding:8px 2px 12px;
  margin:0;
  line-height:1.55;
}
.theme-light .objectif em,
.theme-light .livrable em{
  display:block;
  margin-bottom:5px;
  font-family:var(--font-mono);
  font-style:normal;
  font-size:12px;
  font-weight:800;
  letter-spacing:.08em;
  text-transform:uppercase;
  color:#52637A;
}
.theme-light .step-body{ gap:24px; }
.theme-light .sub-title{
  font-family:Georgia, 'Times New Roman', serif;
  font-weight:500;
  text-transform:none;
  font-size:clamp(25px,2.1vw,31px);
  color:#112747;
  background:transparent;
  border-top:1px solid #D8D0C2;
  border-bottom:0;
  margin:34px 0 18px;
  padding:28px 0 0;
}
.theme-light .charte-grid{
  gap:12px 36px;
}
.theme-light .field{
  margin-bottom:16px;
  min-width:0;
}
.theme-light .field label{
  font-family:var(--font-mono);
  font-size:12px;
  font-weight:800;
  letter-spacing:.09em;
  text-transform:uppercase;
  color:#52637A;
  margin-bottom:8px;
}
.theme-light .lean-app input,
.theme-light input,
.theme-light select,
.theme-light textarea{
  background:transparent;
  border:0;
  border-bottom:1px solid #D8D0C2;
  border-radius:0;
  box-shadow:none;
  color:#112747;
  font-size:19px;
  line-height:1.35;
  padding:8px 2px 9px;
}
.theme-light textarea{
  min-height:44px;
  resize:vertical;
}
.theme-light .lean-app input:focus,
.theme-light input:focus,
.theme-light select:focus,
.theme-light textarea:focus{
  outline:2px solid #2F756A;
  outline-offset:0;
  border-bottom-color:#2F756A;
  background:#FBF8F0;
}
.theme-light .ledger-table-wrap{
  background:transparent;
  border:0;
  border-radius:0;
  box-shadow:none;
  overflow-x:auto;
  padding:0;
}
.theme-light .ledger-table{
  border-collapse:collapse;
  border-spacing:0;
  width:100%;
  min-width:780px;
  font-size:19px;
  color:#112747;
}
.theme-light .ledger-table th{
  background:transparent;
  color:#52637A;
  border-bottom:2px solid #112747;
  border-right:0;
  font-family:var(--font-mono);
  font-size:12px;
  font-weight:850;
  letter-spacing:.09em;
  text-transform:uppercase;
  padding:10px 12px;
}
.theme-light .ledger-table td{
  color:#112747;
  border-bottom:1px solid #D8D0C2;
  border-right:0;
  padding:8px 12px;
  vertical-align:middle;
}
.theme-light .ledger-table tr:hover td{
  background:#F1ECE2;
}
.theme-light .ledger-table input,
.theme-light .ledger-table select,
.theme-light .ledger-table textarea{
  width:100%;
  min-width:150px;
  padding:7px 2px 8px;
  font-size:19px;
}
.theme-light .ledger-table textarea{
  min-height:38px;
}
.theme-light .row-del,
.theme-light .role-del{
  color:#52637A;
  background:transparent;
  border:0;
  font-size:20px;
}
.theme-light .row-del:hover,
.theme-light .role-del:hover{
  color:#B42318;
  background:transparent;
}
.theme-light .btn-add{
  background:transparent;
  border:1px dashed #2F756A;
  border-radius:0;
  color:#2F756A;
  font-size:16px;
  font-weight:500;
  padding:12px 18px;
  margin-top:18px;
}
.theme-light .btn-add:hover{
  background:#ECF5EF;
  border-color:#245E55;
  color:#245E55;
}
.theme-light .btn-add-mini{
  color:#2F756A;
}
.theme-light .raci-controls{
  border-top:0;
  margin-top:18px;
  gap:12px;
}
.theme-light .raci-cell{
  font-weight:850;
  text-align:center;
  cursor:pointer;
}
.theme-light .raci-R{ background:#2F756A!important; color:#FFFFFF!important; }
.theme-light .raci-A{ background:#112747!important; color:#FFFFFF!important; }
.theme-light .raci-C{ background:#C98224!important; color:#FFFFFF!important; }
.theme-light .raci-I{ background:#E6E0D0!important; color:#112747!important; }
.theme-light .raci-none{ background:transparent!important; color:#52637A!important; }
.theme-light .flow-node,
.theme-light .pain-callout,
.theme-light .fivewhy,
.theme-light .vsm-summary div,
.theme-light .kpi-card{
  background:#FBF8F0;
  border-color:#D8D0C2;
  border-radius:0;
  box-shadow:none;
}
.theme-light .step-actions{
  border-top:1px solid #D8D0C2;
  margin-top:30px;
  padding-top:20px;
}
.theme-light .nav-btn{
  background:#FBF8F0;
  border:1px solid #BEB5A7;
  border-radius:0;
  color:#112747;
}
.theme-light .nav-btn:not(:disabled):hover{
  background:#EEE8DC;
  border-color:#112747;
  color:#112747;
}
.theme-light .validate-btn{
  background:#112747;
  border-radius:0;
  color:#FFFFFF;
}
.theme-light .validate-btn:hover{
  background:#183B73;
}
.theme-light .validate-btn.is-validated{
  background:#2F756A;
  color:#FFFFFF;
}
.theme-light .empty-row,
.theme-light .hint-text{
  color:#52637A;
}

/* Final document-workbench redesign: compact, serious, no SaaS residue */
.theme-light{
  --ink:#11233F;
  --ink-soft:#4B5C73;
  --ink-muted:#748196;
  --paper:#FFFFFF;
  --paper-2:#FFFFFF;
  --paper-3:#F6F8FB;
  --line:#D8DEE8;
  --line-strong:#11233F;
  --teal:#2E6F64;
  --blue:#173A63;
  --amber:#B36B1E;
  --red:#A33A31;
  background:#FFFFFF;
  color:var(--ink);
}
.theme-light.lean-app{
  width:100vw;
  min-height:100vh;
  margin:0;
  border:0;
  border-radius:0;
  box-shadow:none;
  background:#FFFFFF;
}
.theme-light *{
  letter-spacing:0!important;
}
.theme-light button{
  border-radius:0!important;
  box-shadow:none!important;
  transform:none!important;
}
.theme-light .project-home{
  width:min(1220px,calc(100vw - 40px));
  padding:28px 0 48px;
}
.theme-light .home-hero,
.theme-light .home-widget,
.theme-light .home-search,
.theme-light .project-card,
.theme-light .empty-projects{
  background:#FFFFFF;
  border:1px solid var(--line);
  border-radius:0;
  box-shadow:none;
}
.theme-light .home-hero{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:24px;
  align-items:end;
  padding:24px 26px;
  border-top:4px solid var(--line-strong);
  border-bottom-color:#B9C3D2;
}
.theme-light .brand-lockup{
  display:flex;
  align-items:center;
  gap:16px;
  margin-bottom:8px;
}
.theme-light .brand-home-link{
  width:auto;
  padding:0;
  border:0;
  background:transparent;
  color:inherit;
  cursor:pointer;
  text-align:left;
}
.theme-light .brand-logo{
  width:58px;
  height:58px;
  flex:0 0 auto;
  border:1px solid var(--line-strong);
}
.theme-light .home-kicker{
  color:var(--ink-soft);
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:800;
  text-transform:uppercase;
}
.theme-light .home-hero h1{
  color:var(--ink);
  font-family:Georgia,'Times New Roman',serif;
  font-size:clamp(34px,4vw,54px);
  font-weight:500;
  line-height:1.08;
  margin:8px 0 6px;
}
.theme-light .home-hero p{
  color:var(--ink-soft);
  max-width:760px;
  font-size:14px;
  line-height:1.55;
}
.theme-light .home-hero-actions{
  min-width:210px;
  display:flex;
  flex-direction:column;
  align-items:flex-end;
  gap:12px;
}
.theme-light .home-hero-actions span{
  color:var(--ink-muted);
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:800;
  text-transform:uppercase;
}
.theme-light .home-dashboard{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:12px;
  margin:18px 0 20px;
}
.theme-light .home-widget{
  min-height:102px;
  padding:16px 18px;
  border-top:2px solid #8A96A8;
}
.theme-light .home-widget.warning{
  border-top-color:var(--amber);
}
.theme-light .home-widget.success{
  border-top-color:var(--teal);
}
.theme-light .home-widget.progress-widget{
  border-top-color:var(--blue);
}
.theme-light .home-widget span,
.theme-light .home-widget small,
.theme-light .project-progress strong{
  color:var(--ink-soft);
  font-size:11px;
}
.theme-light .home-widget strong{
  color:var(--ink);
  font-family:Georgia,'Times New Roman',serif;
  font-size:31px;
  font-weight:500;
  line-height:1.1;
  display:block;
  margin:8px 0 4px;
}
.theme-light .portfolio-toolbar{
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(280px,420px);
  gap:18px;
  align-items:end;
  padding:14px 0 12px;
  border-bottom:2px solid var(--line-strong);
  margin-bottom:14px;
}
.theme-light .section-eyebrow{
  color:var(--ink-muted);
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .portfolio-toolbar h2{
  margin:4px 0 0;
  color:var(--ink);
  font-family:Georgia,'Times New Roman',serif;
  font-size:24px;
  font-weight:500;
}
.theme-light .portfolio-actions{
  display:flex;
  align-items:center;
  gap:10px;
}
.theme-light .home-search{
  min-height:42px;
  flex:1;
  border-left:1px solid var(--line);
  padding:8px 12px;
  color:var(--ink-soft);
  background:#F8FAFC;
}
.theme-light .home-search input{
  font-size:14px!important;
  color:var(--ink)!important;
  background:transparent!important;
}
.theme-light .view-toggle{
  display:flex;
  align-items:center;
  border:1px solid var(--line);
  background:#FFFFFF;
}
.theme-light .view-toggle button{
  width:38px;
  height:38px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:0;
  border-left:1px solid var(--line);
  background:#FFFFFF;
  color:var(--ink-soft);
}
.theme-light .view-toggle button:first-child{
  border-left:0;
}
.theme-light .view-toggle button:hover,
.theme-light .view-toggle button.is-active{
  background:#11233F;
  color:#FFFFFF;
}
.theme-light .project-grid{
  gap:14px;
}
.theme-light .project-card{
  min-height:220px;
  padding:18px;
  border-top:2px solid var(--line-strong);
}
.theme-light .project-card:hover{
  background:#F6F8FB;
  border-color:#B9C3D2;
}
.theme-light .project-icon{
  width:32px;
  height:32px;
  border-radius:0;
  background:var(--ink);
  box-shadow:none;
}
.theme-light .project-card h2{
  color:var(--ink);
  font-family:Georgia,'Times New Roman',serif;
  font-size:21px;
  font-weight:500;
  line-height:1.18;
  margin-top:2px;
}
.theme-light .project-card p{
  color:var(--ink-soft);
  font-size:13px;
  line-height:1.5;
}
.theme-light .project-progress div,
.theme-light .progress-line{
  height:5px;
  background:#DCD4C7;
  border-radius:0;
}
.theme-light .project-progress span,
.theme-light .progress-fill{
  background:var(--teal);
  border-radius:0;
}
.theme-light .status-badge{
  min-height:22px;
  border-radius:0;
  font-size:10.5px;
  padding:2px 7px;
  background:#FBEDD7;
  border-color:#E7BD7A;
  color:#7B430B;
}
.theme-light .status-badge.done{
  background:#E5F1E8;
  border-color:#9DCBA9;
  color:#155D35;
}
.theme-light .project-card-top .status-badge{
  margin-left:auto;
}
.theme-light .delete-project{
  order:3;
  width:30px;
  height:30px;
  margin-left:8px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:1px solid #D7A6A0;
  background:#FFF5F3;
  color:var(--red);
  opacity:0;
  visibility:hidden;
  pointer-events:none;
  transition:opacity .16s ease, visibility .16s ease, background .16s ease, border-color .16s ease;
}
.theme-light .project-card:hover .delete-project,
.theme-light .project-card:focus-within .delete-project{
  opacity:1;
  visibility:visible;
  pointer-events:auto;
}
.theme-light .delete-project:hover{
  background:#FCE8E5;
  border-color:#C78078;
}
.theme-light .home-primary,
.theme-light .open-project{
  min-height:34px;
  background:var(--ink);
  color:#fff;
  font-size:12px;
  padding:8px 12px;
}
.theme-light .home-primary:hover,
.theme-light .open-project:hover{
  background:var(--blue);
}
.theme-light .project-grid.view-list,
.theme-light .project-grid.view-compact{
  grid-template-columns:1fr;
}
.theme-light .project-grid.view-list .project-card,
.theme-light .project-grid.view-compact .project-card{
  min-height:0;
  display:grid;
  grid-template-columns:minmax(0,1fr) 170px;
  column-gap:20px;
  row-gap:10px;
  align-items:center;
}
.theme-light .project-grid.view-list .project-card-top,
.theme-light .project-grid.view-compact .project-card-top{
  grid-column:1 / -1;
  margin-bottom:0;
}
.theme-light .project-grid.view-list .project-card h2,
.theme-light .project-grid.view-compact .project-card h2{
  margin:0;
}
.theme-light .project-grid.view-list .project-card p,
.theme-light .project-grid.view-compact .project-card p{
  grid-column:1;
  margin:0;
  -webkit-line-clamp:2;
}
.theme-light .project-grid.view-list .project-progress,
.theme-light .project-grid.view-compact .project-progress{
  grid-column:1;
}
.theme-light .project-grid.view-list .open-project,
.theme-light .project-grid.view-compact .open-project{
  grid-column:2;
  grid-row:2 / span 3;
  align-self:center;
}
.theme-light .project-grid.view-compact .project-card{
  grid-template-columns:32px minmax(0,1fr) 120px 150px;
  padding:12px 14px;
  column-gap:12px;
}
.theme-light .project-grid.view-compact .project-card-top{
  display:contents;
}
.theme-light .project-grid.view-compact .project-icon{
  grid-column:1;
  grid-row:1;
}
.theme-light .project-grid.view-compact .status-badge{
  grid-column:3;
  grid-row:1;
  justify-self:start;
}
.theme-light .project-grid.view-compact .delete-project{
  grid-column:4;
  grid-row:1;
  justify-self:end;
}
.theme-light .project-grid.view-compact .project-card h2{
  grid-column:2;
  grid-row:1;
  font-size:17px;
}
.theme-light .project-grid.view-compact .project-card p{
  display:none;
}
.theme-light .project-grid.view-compact .project-progress{
  grid-column:2 / 4;
  grid-row:2;
}
.theme-light .project-grid.view-compact .open-project{
  grid-column:4;
  grid-row:1 / span 2;
}
.theme-light .sidebar{
  width:262px;
  min-width:262px;
  background:#11233F;
  border-right:1px solid #263B5C;
  color:#EEF1F3;
}
.theme-light .sidebar-head{
  padding:18px 16px 14px;
  border-bottom:1px solid #263B5C;
}
.theme-light .sidebar-eyebrow,
.theme-light .progress-text,
.theme-light .pdf-hint,
.theme-light .save-indicator{
  color:#AEB9C8;
  font-size:10px;
}
.theme-light .sidebar-head h1{
  color:#FFFFFF;
  font-family:Georgia,'Times New Roman',serif;
  font-size:23px;
  font-weight:500;
  margin:4px 0 10px;
}
.theme-light .sidebar-brand{
  display:flex;
  align-items:center;
  gap:10px;
  margin:4px 0 10px;
}
.theme-light .sidebar-logo{
  width:34px;
  height:34px;
  border:1px solid #3B5274;
}
.theme-light .sidebar-brand h1{
  margin:0;
}

.theme-light.landing-mode{
  width:100vw;
  min-height:100vh;
  background:#FFFFFF;
  position:relative;
  overflow:hidden;
}
.theme-light .landing-page{
  position:relative;
  z-index:1;
  width:min(1180px,calc(100vw - 40px));
  margin:0 auto;
  padding:28px 0 46px;
}
.theme-light .landing-background{
  position:fixed;
  inset:0;
  pointer-events:none;
  overflow:hidden;
  background:
    linear-gradient(90deg,rgba(16,35,63,.035) 1px,transparent 1px),
    linear-gradient(rgba(16,35,63,.028) 1px,transparent 1px);
  background-size:64px 64px;
}
.theme-light .landing-flowline{
  position:absolute;
  height:1px;
  background:linear-gradient(90deg,transparent,rgba(47,111,99,.42),transparent);
  opacity:.55;
  animation:landingFlow 9s linear infinite;
}
.theme-light .landing-flowline.one{ width:42vw; top:18%; left:-12vw; }
.theme-light .landing-flowline.two{ width:34vw; top:64%; right:-10vw; animation-delay:-3s; }
.theme-light .landing-flowline.three{ width:28vw; top:38%; left:48vw; animation-delay:-6s; }
.theme-light .landing-node{
  position:absolute;
  width:10px;
  height:10px;
  border:1px solid rgba(47,111,99,.42);
  background:rgba(255,255,255,.9);
  box-shadow:0 0 0 5px rgba(47,111,99,.06);
  animation:landingPulse 4.5s ease-in-out infinite;
}
.theme-light .landing-node.n1{ top:17.5%; left:21%; }
.theme-light .landing-node.n2{ top:37.5%; left:66%; animation-delay:-1.2s; }
.theme-light .landing-node.n3{ top:63.5%; left:78%; animation-delay:-2.4s; }
.theme-light .landing-card-ghost{
  position:absolute;
  border:1px solid rgba(82,99,122,.18);
  background:rgba(248,250,252,.68);
  box-shadow:0 16px 38px rgba(16,35,63,.06);
  animation:landingFloat 8s ease-in-out infinite;
}
.theme-light .landing-card-ghost.g1{ width:132px; height:74px; top:16%; right:9%; }
.theme-light .landing-card-ghost.g2{ width:110px; height:62px; bottom:16%; left:7%; animation-delay:-3.8s; }
.theme-light .landing-loop{
  position:absolute;
  width:150px;
  height:150px;
  right:18%;
  bottom:10%;
  border:1px dashed rgba(47,111,99,.28);
  border-radius:50%;
  animation:landingRotate 18s linear infinite;
}
.theme-light .landing-loop::before,
.theme-light .landing-loop::after{
  content:"";
  position:absolute;
  width:8px;
  height:8px;
  border-radius:50%;
  background:#2F6F63;
}
.theme-light .landing-loop::before{ top:13px; left:25px; }
.theme-light .landing-loop::after{ right:22px; bottom:18px; background:#C97D2E; }
@keyframes landingFlow{
  from{ transform:translateX(-12%); }
  to{ transform:translateX(42%); }
}
@keyframes landingPulse{
  0%,100%{ transform:scale(1); opacity:.38; }
  50%{ transform:scale(1.28); opacity:.85; }
}
@keyframes landingFloat{
  0%,100%{ transform:translateY(0); }
  50%{ transform:translateY(-12px); }
}
@keyframes landingRotate{
  to{ transform:rotate(360deg); }
}
@media (prefers-reduced-motion: reduce){
  .theme-light .landing-flowline,
  .theme-light .landing-node,
  .theme-light .landing-card-ghost,
  .theme-light .landing-loop{
    animation:none;
  }
}
.theme-light .landing-nav{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding:0 0 22px;
  border-bottom:1px solid var(--line);
}
.theme-light .landing-brand{
  display:flex;
  align-items:center;
  gap:14px;
  color:var(--ink);
  font-family:Georgia,'Times New Roman',serif;
  font-size:32px;
  font-weight:500;
}
.theme-light .landing-brand img{
  width:58px;
  height:58px;
  border:1px solid var(--line-strong);
}
.theme-light .landing-auth-actions{
  display:flex;
  align-items:center;
  justify-content:flex-end;
  gap:10px;
  flex-wrap:wrap;
}
.theme-light .auth-nav-button{
  min-height:34px;
  border:1px solid #C9D4E3;
  background:#FFFFFF;
  color:#10233F;
  padding:0 13px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  font-size:11.5px;
  font-weight:850;
  letter-spacing:.01em;
  cursor:pointer;
}
.theme-light .auth-nav-button.primary{
  background:#10233F;
  border-color:#10233F;
  color:#FFFFFF;
}
.theme-light .auth-nav-button.ghost{
  background:#F8FAFD;
}
.theme-light .auth-nav-button:hover,
.theme-light .auth-nav-button:focus-visible{
  border-color:#2F6F63;
  outline:none;
}
.theme-light .logout-button{
  min-height:34px;
  border:1px solid #C9D4E3;
  background:#FFFFFF;
  color:#10233F;
  padding:0 12px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  font-size:11.5px;
  font-weight:850;
  cursor:pointer;
  white-space:nowrap;
}
.theme-light .logout-button:hover,
.theme-light .logout-button:focus-visible{
  border-color:#AEBBCC;
  background:#F8FAFD;
  outline:none;
}
.theme-light .logout-button.header{
  align-self:flex-end;
  min-width:0;
}
.theme-light .logout-button.sidebar{
  width:100%;
  min-height:42px;
  border-color:#2A456A;
  background:#132644;
  color:#FFFFFF;
}
.theme-light .logout-button.sidebar:hover,
.theme-light .logout-button.sidebar:focus-visible{
  background:#193154;
  border-color:#3A587F;
}
.theme-light .sidebar-foot .logout-button.sidebar{
  width:auto;
  max-width:100%;
  min-width:0;
  align-self:stretch;
  padding:0 10px;
  overflow:hidden;
}
.theme-light .landing-secondary{
  min-height:36px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  border:1px solid var(--line);
  background:#FFFFFF;
  color:var(--ink);
  padding:8px 13px;
  font-size:12px;
}
.theme-light .landing-secondary:hover{
  background:#F6F8FB;
  border-color:#AAB6C6;
}
.theme-light .landing-hero{
  display:grid;
  grid-template-columns:minmax(0,1.08fr) minmax(320px,.72fr);
  gap:28px;
  align-items:stretch;
  padding:38px 0 24px;
}
.theme-light .landing-copy{
  border-top:4px solid var(--line-strong);
  padding-top:22px;
}
.theme-light .landing-kicker{
  color:var(--ink-muted);
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .landing-copy h1{
  max-width:700px;
  margin:10px 0 14px;
  color:var(--ink);
  font-family:Georgia,'Times New Roman',serif;
  font-size:clamp(40px,4.7vw,64px);
  font-weight:500;
  line-height:1.04;
}
.theme-light .landing-copy p{
  max-width:680px;
  margin:0;
  color:var(--ink-soft);
  font-size:15px;
  line-height:1.58;
}
.theme-light .landing-method-strip{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:16px;
}
.theme-light .landing-method-strip span{
  border:1px solid #D5DFEA;
  background:#F8FAFD;
  color:#334A68;
  padding:7px 10px;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .landing-trust-note{
  display:flex;
  align-items:center;
  gap:8px;
  margin-top:12px;
  color:#536884;
  font-size:13px;
}
.theme-light .landing-trust-note:before{
  content:'';
  width:8px;
  height:8px;
  border:2px solid #2F776B;
  transform:rotate(45deg);
  flex:0 0 auto;
}
.theme-light .landing-actions{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin-top:20px;
}
.theme-light .landing-primary{
  min-height:40px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  border:1px solid var(--line-strong);
  background:var(--ink);
  color:#FFFFFF;
  padding:9px 15px;
  font-size:12px;
}
.theme-light .landing-primary:hover{
  background:var(--blue);
}
.theme-light .landing-panel{
  border:1px solid var(--line);
  border-top:4px solid var(--teal);
  background:#FFFFFF;
  padding:18px;
}
.theme-light .landing-panel-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
  padding-bottom:14px;
  border-bottom:1px solid var(--line);
}
.theme-light .landing-panel-head span,
.theme-light .landing-panel-metrics span{
  color:var(--ink-muted);
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .landing-panel-metrics{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:8px;
  margin:12px 0;
}
.theme-light .landing-panel-metrics div{
  border:1px solid var(--line);
  background:#F8FAFC;
  padding:10px;
}
.theme-light .landing-panel-metrics strong{
  display:block;
  margin-top:5px;
  color:var(--ink);
  font-family:Georgia,'Times New Roman',serif;
  font-size:22px;
  font-weight:500;
}
.theme-light .landing-panel-progress{
  margin:0 0 12px;
}
.theme-light .landing-panel-progress-bar{
  height:7px;
  background:#E4DED1;
  overflow:hidden;
}
.theme-light .landing-panel-progress-bar span{
  display:block;
  width:78%;
  height:100%;
  background:#2F776B;
}
.theme-light .landing-panel-progress small{
  display:block;
  margin-top:7px;
  color:#64748B;
  font-size:11px;
  line-height:1.45;
}
.theme-light .landing-mini-list{
  display:flex;
  flex-direction:column;
  gap:7px;
}
.theme-light .landing-mini-list div{
  min-height:44px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  border:1px solid var(--line);
  background:#FFFFFF;
  color:var(--ink);
  padding:9px 10px;
  text-align:left;
}
.theme-light .landing-mini-list span{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.theme-light .landing-mini-list em{
  font-style:normal;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
  white-space:nowrap;
  border:1px solid var(--line);
  padding:4px 7px;
}
.theme-light .landing-mini-list em.done{
  color:#155D35;
  background:#E5F1E8;
  border-color:#9DCBA9;
}
.theme-light .landing-mini-list em.in-progress{
  color:#7B430B;
  background:#FBEDD7;
  border-color:#E7BD7A;
}
.theme-light .landing-sectors{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:12px;
  margin-top:10px;
}
.theme-light .landing-sectors div{
  border:1px solid var(--line);
  border-top:2px solid var(--line-strong);
  padding:15px;
  background:#FFFFFF;
}
.theme-light .landing-sectors span{
  color:var(--ink);
  font-family:Georgia,'Times New Roman',serif;
  font-size:20px;
}
.theme-light .landing-sectors p{
  margin:8px 0 0;
  color:var(--ink-soft);
  font-size:12.5px;
  line-height:1.45;
}
.theme-light .auth-page{
  position:relative;
  z-index:1;
  min-height:100vh;
  width:min(1180px,100%);
  margin:0 auto;
  padding:28px 32px 52px;
  display:grid;
  grid-template-rows:auto 1fr;
}
.theme-light .auth-page-nav{
  display:flex;
  justify-content:flex-start;
}
.theme-light .auth-back-button{
  min-height:38px;
  border:1px solid #C9D4E3;
  background:#FFFFFF;
  color:#10233F;
  padding:0 14px;
  display:inline-flex;
  align-items:center;
  gap:8px;
  font-size:12px;
  font-weight:850;
  cursor:pointer;
}
.theme-light .auth-shell{
  width:min(470px,100%);
  margin:auto;
  padding:34px;
  border:1px solid #C9D4E3;
  border-top:3px solid #10233F;
  background:rgba(255,255,255,.94);
  box-shadow:0 28px 80px rgba(16,35,63,.13);
}
.theme-light .auth-brand-block{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:12px;
  color:#10233F;
  font-family:Georgia,'Times New Roman',serif;
  font-size:28px;
}
.theme-light .auth-brand-block img{
  width:42px;
  height:42px;
  border:1px solid #C9D4E3;
}
.theme-light .auth-heading{
  text-align:center;
  margin:24px 0 22px;
}
.theme-light .auth-heading span,
.theme-light .auth-connected-card span{
  color:#4F6582;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .auth-heading h1{
  margin:8px 0 10px;
  color:#10233F;
  font-family:Georgia,'Times New Roman',serif;
  font-size:34px;
  font-weight:500;
  line-height:1.08;
}
.theme-light .auth-heading p{
  margin:0 auto;
  max-width:360px;
  color:#51627A;
  font-size:13px;
  line-height:1.55;
}
.theme-light .auth-page-card{
  display:flex;
  flex-direction:column;
  gap:13px;
}
.theme-light .auth-page-card label{
  display:flex;
  flex-direction:column;
  gap:7px;
  color:#10233F;
  font-size:12px;
  font-weight:850;
}
.theme-light .auth-page-card input{
  width:100%;
  min-height:44px;
  border:1px solid #C7D4E5;
  background:#FFFFFF;
  color:#10233F;
  padding:0 12px;
  font:inherit;
  font-size:13px;
  outline:none;
}
.theme-light .auth-page-card input:focus{
  border-color:#2F6F63;
  box-shadow:0 0 0 3px rgba(47,111,99,.12);
}
.theme-light .auth-page-submit,
.theme-light .auth-connected-card button{
  min-height:44px;
  border:1px solid #10233F;
  background:#10233F;
  color:#FFFFFF;
  padding:0 16px;
  font-weight:900;
  cursor:pointer;
}
.theme-light .auth-page-submit:disabled{
  opacity:.62;
  cursor:wait;
}
.theme-light .auth-page-divider{
  position:relative;
  display:flex;
  justify-content:center;
  color:#7A8798;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .auth-page-divider:before{
  content:"";
  position:absolute;
  top:50%;
  left:0;
  right:0;
  height:1px;
  background:#D9E1EC;
}
.theme-light .auth-page-divider span{
  position:relative;
  background:#FFFFFF;
  padding:0 12px;
}
.theme-light .auth-social-actions{
  display:grid;
  gap:9px;
}
.theme-light .auth-social-button{
  min-height:42px;
  border:1px solid #C7D4E5;
  background:#FFFFFF;
  color:#10233F;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  padding:0 14px;
  font-size:13px;
  font-weight:850;
  cursor:pointer;
}
.theme-light .auth-social-button:hover,
.theme-light .auth-social-button:focus-visible{
  border-color:#AEBBCC;
  background:#F8FAFD;
  outline:none;
}
.theme-light .auth-social-button:disabled{
  opacity:.62;
  cursor:wait;
}
.theme-light .auth-provider-mark{
  width:22px;
  height:22px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:50%;
  font-size:12px;
  font-weight:900;
  line-height:1;
}
.theme-light .auth-provider-mark.google{
  background:#FFFFFF;
  border:1px solid #D5DDE8;
  padding:4px;
}
.theme-light .auth-provider-mark.google svg{
  width:14px;
  height:14px;
  display:block;
}
.theme-light .auth-page-switch{
  min-height:42px;
  border:1px dashed #2F6F63;
  background:#F4FAF8;
  color:#2F6F63;
  font-weight:850;
  cursor:pointer;
}
.theme-light .auth-page-message{
  margin:2px 0 0;
  border-left:3px solid #C47A1A;
  background:#FFF8ED;
  color:#7A4B12;
  padding:10px 12px;
  font-size:12px;
  line-height:1.45;
}
.theme-light .auth-connected-card{
  display:grid;
  gap:12px;
  border:1px solid #C9D4E3;
  background:#F7FAFD;
  padding:18px;
}
.theme-light .auth-connected-card strong{
  color:#10233F;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.auth-panel{ border:1px solid #CBD7E8; border-top:2px solid #2F6F63; background:linear-gradient(180deg,#FFFFFF 0%,#F7FAFD 100%); color:#10233F; padding:12px; display:flex; align-items:center; gap:12px; min-width:300px; box-shadow:0 14px 36px rgba(16,35,63,.08); }
.auth-panel.compact{ min-width:360px; max-width:520px; padding:12px 14px; }
.auth-panel form{ width:100%; display:grid; grid-template-columns:1.1fr 1.5fr auto auto; align-items:center; gap:10px; }
.auth-panel.is-connected{ justify-content:space-between; }
.auth-copy{ min-width:0; }
.auth-panel span{ display:block; font-family:var(--font-mono); font-size:10px; color:#4F6582; text-transform:uppercase; font-weight:800; line-height:1.2; }
.auth-panel strong{ display:block; color:#10233F; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:3px; }
.auth-fields{ display:grid; grid-template-columns:1fr 1fr; gap:8px; min-width:0; }
.auth-panel input{ width:100%; border:1px solid #C7D4E5; background:#FFFFFF; color:#10233F; min-height:36px; padding:0 10px; font:inherit; font-size:12px; outline:none; }
.auth-panel input:focus{ border-color:#2F6F63; box-shadow:0 0 0 2px rgba(47,111,99,.12); }
.auth-panel button{ border:1px solid #10233F; background:#10233F; color:#FFFFFF; min-height:36px; padding:0 12px; display:inline-flex; align-items:center; justify-content:center; gap:6px; font-weight:800; cursor:pointer; white-space:nowrap; }
.auth-panel button:disabled{ opacity:.6; cursor:wait; }
.auth-panel .auth-switch{ background:transparent; color:#2F6F63; border-color:transparent; padding:0 4px; min-height:30px; }
.auth-panel .auth-switch:hover{ text-decoration:underline; }
.auth-panel p{ grid-column:1/-1; margin:0; color:#7A4B12; font-size:11px; line-height:1.35; }
.sidebar .auth-panel{ min-width:0; max-width:none; width:100%; background:#132644; border-color:#2A456A; border-top-color:#2F6F63; color:#FFFFFF; box-shadow:none; }
.sidebar .auth-panel form{ grid-template-columns:1fr; }
.sidebar .auth-fields{ grid-template-columns:1fr; }
.sidebar .auth-panel span{ color:#B9C7D8; }
.sidebar .auth-panel strong{ color:#FFFFFF; }
.sidebar .auth-panel input{ background:#0D1E36; border-color:#2A456A; color:#FFFFFF; }
.sidebar .auth-panel button{ background:#FFFFFF; border-color:#FFFFFF; color:#10233F; }
.sidebar .auth-panel .auth-switch{ background:transparent; color:#FFFFFF; border-color:transparent; }
@media (max-width: 920px){
  .auth-panel,.auth-panel.compact{ min-width:0; width:100%; max-width:none; }
  .auth-panel form{ grid-template-columns:1fr; }
  .auth-fields{ grid-template-columns:1fr; }
}
.theme-light .project-name{
  min-height:34px;
  background:#172C4D!important;
  border:1px solid #3B5274!important;
  border-radius:0!important;
  color:#FFFFFF!important;
  font-size:12px!important;
  padding:7px 8px!important;
}
.theme-light .steps-nav{
  padding:6px 8px;
  border-top:0;
}
.theme-light .step-item{
  width:100%;
  margin:1px 0;
  padding:8px 9px;
  border:1px solid transparent;
  border-left:2px solid transparent;
  border-radius:0;
  color:#DCE4EE;
  gap:8px;
}
.theme-light .step-item:hover{
  background:#172C4D;
}
.theme-light .step-item.is-active{
  background:#FFFFFF;
  border-color:#FFFFFF;
  border-left-color:var(--teal);
  color:var(--ink);
}
.theme-light .step-title{
  color:inherit;
  font-size:12px;
  font-weight:650;
}
.theme-light .step-item.is-active .step-title{
  color:var(--ink);
}
.theme-light .step-num,
.theme-light .step-item.is-active .step-num{
  min-width:24px;
  color:var(--teal);
  font-size:11px;
  font-weight:800;
}
.theme-light .step-stamp{
  color:var(--teal);
  font-size:12px;
}
.theme-light .sidebar-foot{
  padding:12px 12px 14px;
  gap:7px;
  border-top:1px solid #263B5C;
  background:#0E1C33;
}
.theme-light .back-home,
.theme-light .collapse-btn,
.theme-light .ghost-btn{
  background:#172C4D;
  border:1px solid #3B5274;
  color:#F8FAFC;
  min-height:32px;
  font-size:11.5px;
  padding:7px 9px;
}
.theme-light .back-home:hover,
.theme-light .collapse-btn:hover,
.theme-light .ghost-btn:hover{
  background:#203A60;
  border-color:#6E87A8;
  color:#FFFFFF;
}
.theme-light.sidebar-collapsed .sidebar,
.theme-light.sidebar-collapsed .sidebar{
  width:68px;
  min-width:68px;
}
.theme-light .main{
  background:#FFFFFF;
  padding:24px 30px 42px;
}
.theme-light .dossier-card{
  max-width:1220px;
  background:#FFFFFF;
  border:1px solid var(--line);
  border-top:3px solid var(--line-strong);
  border-radius:0;
  box-shadow:none;
  padding:20px 18px 34px;
}
.theme-light .eyebrow{
  color:var(--ink-soft);
  border-bottom:1px solid var(--line);
  font-family:var(--font-mono);
  font-size:10.5px;
  font-weight:800;
  padding-bottom:10px;
  margin-bottom:12px;
}
.theme-light .dossier-card h2{
  color:var(--ink);
  font-family:Georgia,'Times New Roman',serif;
  font-size:clamp(24px,2.1vw,31px);
  font-weight:500;
  line-height:1.1;
  margin:12px 0 12px;
}
.theme-light .objectif,
.theme-light .livrable{
  display:block;
  width:100%;
  vertical-align:top;
  background:#F4F8FC;
  border:1px solid #CBD7E5;
  border-left:3px solid var(--blue);
  color:var(--ink);
  font-size:12.5px;
  line-height:1.38;
  padding:8px 11px;
  margin:0 0 8px;
}
.theme-light .livrable{
  background:#F3FAF7;
  border-color:#C6DDD4;
  border-left-color:var(--teal);
}
.theme-light .objectif em,
.theme-light .livrable em{
  color:var(--ink-soft);
  display:inline-block;
  font-family:var(--font-mono);
  font-size:10.5px;
  font-style:normal;
  font-weight:800;
  margin:0 8px 0 0;
  text-transform:uppercase;
}
.theme-light .step-body{
  margin-top:20px;
  gap:16px;
}
.theme-light .sub-title{
  color:var(--ink);
  background:transparent;
  border-top:1px solid var(--line);
  border-bottom:0;
  font-family:Georgia,'Times New Roman',serif;
  font-size:clamp(20px,1.7vw,25px);
  font-weight:500;
  margin:24px 0 12px;
  padding:20px 0 0;
  text-transform:none;
}
.theme-light .charte-grid{
  gap:8px 30px;
}
.theme-light .field{
  margin-bottom:11px;
}
.theme-light .field label{
  color:var(--ink-soft);
  font-family:var(--font-mono);
  font-size:10.5px;
  font-weight:800;
  margin-bottom:4px;
  text-transform:uppercase;
}
.theme-light .lean-app input,
.theme-light input,
.theme-light select,
.theme-light textarea{
  background:transparent;
  border:0;
  border-bottom:1px solid var(--line);
  border-radius:0;
  box-shadow:none;
  color:var(--ink);
  font-size:14px;
  line-height:1.3;
  min-height:32px;
  padding:5px 2px 6px;
}
.theme-light textarea{
  min-height:38px;
}
.theme-light .lean-app input:focus,
.theme-light input:focus,
.theme-light select:focus,
.theme-light textarea:focus{
  background:#FFFFFF;
  border-bottom-color:var(--teal);
  box-shadow:none;
  outline:1.5px solid var(--teal);
  outline-offset:0;
}
.theme-light .ledger-table-wrap{
  background:transparent;
  border:0;
  border-radius:0;
  box-shadow:none;
  padding:0;
}
.theme-light .ledger-table{
  border-collapse:collapse;
  border-spacing:0;
  min-width:760px;
  width:100%;
  font-size:14px;
}
.theme-light .ledger-table th{
  background:transparent;
  border-bottom:2px solid var(--line-strong);
  border-right:0;
  color:var(--ink-soft);
  font-family:var(--font-mono);
  font-size:10.5px;
  font-weight:850;
  padding:8px 10px;
  text-transform:uppercase;
}
.theme-light .ledger-table td{
  border-bottom:1px solid var(--line);
  border-right:0;
  color:var(--ink);
  padding:5px 10px;
  vertical-align:middle;
}
.theme-light .ledger-table tr:hover td{
  background:#F6F8FB;
}
.theme-light .ledger-table input,
.theme-light .ledger-table select,
.theme-light .ledger-table textarea{
  font-size:14px;
  min-height:30px;
  min-width:120px;
  padding:4px 2px 5px;
}
.theme-light .row-del,
.theme-light .role-del{
  background:transparent;
  border:0;
  color:var(--ink-soft);
  font-size:16px;
  padding:2px 5px;
}
.theme-light .row-del:hover,
.theme-light .role-del:hover{
  color:var(--red);
}
.theme-light .btn-add,
.theme-light .btn-add-mini{
  background:transparent;
  border:1px dashed var(--teal);
  color:var(--teal);
  font-size:12px;
  font-weight:600;
  margin-top:10px;
  min-height:32px;
  padding:7px 11px;
}
.theme-light .btn-add:hover,
.theme-light .btn-add-mini:hover{
  background:#E7F0EA;
  color:#245B52;
}
.theme-light .raci-controls{
  gap:8px;
  margin-top:10px;
}
.theme-light .raci-controls input{
  max-width:190px;
}
.theme-light .raci-cell{
  font-family:var(--font-mono);
  font-size:13px;
  font-weight:850;
  text-align:center;
}
.theme-light .raci-R{ background:#2E6F64!important; color:#fff!important; }
.theme-light .raci-A{ background:#11233F!important; color:#fff!important; }
.theme-light .raci-C{ background:#B36B1E!important; color:#fff!important; }
.theme-light .raci-I{ background:#E1DACB!important; color:#11233F!important; }
.theme-light .raci-none{ background:transparent!important; color:#748196!important; }
.theme-light .flow-viz{
  gap:4px;
  padding:12px 0;
}
.theme-light .flow-node,
.theme-light .pain-callout,
.theme-light .fivewhy,
.theme-light .vsm-summary div,
.theme-light .kpi-card{
  background:#FFFFFF;
  border:1px solid var(--line);
  border-radius:0;
  box-shadow:none;
}
.theme-light .flow-node{
  min-width:96px;
  max-width:132px;
  padding:8px 10px;
  font-size:11.5px;
}
.theme-light .shape-circle{
  width:76px;
  height:76px;
  min-width:76px;
}
.theme-light .shape-diamond{
  width:112px;
  height:112px;
  min-width:112px;
  max-width:112px;
  padding:0;
}
.theme-light .shape-diamond::before{
  width:78px;
  height:78px;
  top:17px;
  left:17px;
  background:#FFFFFF;
  border-color:var(--line-strong);
}
.theme-light .shape-diamond:hover::before{
  border-color:var(--teal);
}
.theme-light .pain-callout{
  border-left:3px solid var(--amber);
  font-size:12px;
}
.theme-light .fivewhy{
  padding:12px;
}
.theme-light .why-row{
  gap:8px;
  margin-bottom:6px;
}
.theme-light .why-num{
  min-width:78px;
  font-size:10.5px;
}
.theme-light .vsm-summary{
  gap:8px;
}
.theme-light .vsm-summary div{
  padding:8px 10px;
}
.theme-light .vsm-summary strong{
  font-size:17px;
}
.theme-light .kpi-grid{
  grid-template-columns:repeat(auto-fit,minmax(185px,1fr));
  gap:8px;
}
.theme-light .kpi-card{
  padding:10px;
}
.theme-light .kpi-name,
.theme-light .q-label,
.theme-light .branch-title,
.theme-light .spine-caption{
  color:var(--ink-soft);
  font-size:10px;
}
.theme-light .kpi-actual{
  font-family:Georgia,'Times New Roman',serif;
  font-size:21px;
  font-weight:500;
}
.theme-light .step-actions{
  border-top:1px solid var(--line);
  gap:8px;
  margin-top:22px;
  padding-top:14px;
}
.theme-light .nav-btn,
.theme-light .validate-btn{
  min-height:34px;
  font-size:12px;
  padding:8px 12px;
}
.theme-light .nav-btn{
  background:#FFFFFF;
  border:1px solid #B9C3D2;
  color:var(--ink);
}
.theme-light .nav-btn:not(:disabled):hover{
  background:#F6F8FB;
  border-color:var(--ink);
  color:var(--ink);
}
.theme-light .validate-btn{
  background:var(--ink);
  color:#FFFFFF;
}
.theme-light .validate-btn:hover{
  background:var(--blue);
}
.theme-light .validate-btn.is-validated{
  background:var(--teal);
  color:#FFFFFF;
}
.theme-light .empty-row,
.theme-light .empty-hint,
.theme-light .hint-text{
  color:var(--ink-soft);
  font-size:11.5px;
}

.theme-light .advanced-step{
  border-top:1px solid #4F6582;
  margin-top:8px;
  padding-top:14px;
}
.theme-light .advanced-step-icon{
  flex:0 0 auto;
  color:#8FA6C4;
}
.theme-light.sidebar-collapsed .advanced-step{
  border-top:0;
  padding-top:0;
}
.theme-light.sidebar-collapsed .advanced-step .advanced-step-icon{
  color:#8FA6C4;
}
.theme-light .optional-badge{
  display:inline-flex;
  align-items:center;
  min-height:22px;
  margin-left:12px;
  padding:0 8px;
  border:1px solid #B9C7D8;
  background:#F6F8FB;
  color:#52637A;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:800;
  text-transform:uppercase;
  vertical-align:middle;
  letter-spacing:.04em;
}
.theme-light .dmaic-layout{
  display:grid;
  gap:16px;
}
.theme-light .dmaic-phase{
  border:1px solid #B9C7D8;
  background:#FFFFFF;
  border-left:4px solid #2F756A;
}
.theme-light .dmaic-phase-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
  padding:14px 16px 10px;
  border-bottom:1px solid #DDE6F1;
  background:#F8FAFD;
}
.theme-light .dmaic-phase-head span{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:34px;
  height:28px;
  border:1px solid #C9D8EC;
  background:#EAF1FA;
  color:#102033;
  font-family:var(--font-mono);
  font-size:11px;
  font-weight:850;
}
.theme-light .dmaic-phase-head h3{
  margin:0;
  color:#102033;
  font-family:Georgia,'Times New Roman',serif;
  font-size:24px;
  font-weight:500;
}
.theme-light .dmaic-phase-head p{
  margin:4px 0 0;
  color:#4B5F78;
  font-size:13px;
  line-height:1.45;
}
.theme-light .dmaic-phase-body{
  padding:14px 16px 16px;
}
.theme-light .dmaic-hint{
  margin:0 0 12px;
  padding:9px 11px;
  border:1px solid #D5E0EE;
  border-left:3px solid #2F756A;
  background:#F8FAFD;
  color:#536983;
  font-size:13px;
  line-height:1.45;
}
.theme-light .dmaic-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:14px 18px;
}
.theme-light .dmaic-grid .field{
  margin-bottom:0;
}
.theme-light .dmaic-wide{
  grid-column:1/-1;
}
.theme-light .dmaic-summary{
  display:grid;
  grid-template-columns:repeat(5,minmax(0,1fr));
  gap:10px;
}
.theme-light .dmaic-summary-card{
  border:1px solid #C9D8EC;
  background:#F8FAFD;
  padding:12px;
}
.theme-light .dmaic-summary-card span{
  display:block;
  color:#536983;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .dmaic-summary-card strong{
  display:block;
  margin-top:8px;
  color:#102033;
  font-size:24px;
  line-height:1;
}
.theme-light .dmaic-tool-block{
  margin-top:16px;
  padding-top:14px;
  border-top:1px solid #DDE6F1;
}
.theme-light .dmaic-import-card{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  margin:12px 0 16px;
  padding:14px 16px;
  border:1px solid #C9D8EC;
  border-top:3px solid #10233F;
  background:#FFFFFF;
}
.theme-light .dmaic-import-card strong{
  display:block;
  color:#102033;
  font-size:16px;
}
.theme-light .dmaic-import-card p{
  margin:4px 0 0;
  color:#536983;
  font-size:13px;
  line-height:1.35;
}
.theme-light .dmaic-import-button{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:132px;
  height:42px;
  border:1px solid #10233F;
  background:#10233F;
  color:#FFFFFF;
  font-size:13px;
  font-weight:850;
  cursor:pointer;
}
.theme-light .dmaic-import-button input{
  display:none;
}
.theme-light .dmaic-tool-title{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin:0 0 10px;
  color:#102033;
  font-family:Georgia,'Times New Roman',serif;
  font-size:20px;
  font-weight:500;
}
.theme-light .dmaic-tool-title small{
  color:#667891;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:800;
  text-transform:uppercase;
}
.theme-light .dmaic-stats-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:10px;
  margin:10px 0 12px;
}
.theme-light .dmaic-stat{
  border:1px solid #D5E0EE;
  background:#FFFFFF;
  padding:10px 12px;
}
.theme-light .dmaic-stat span{
  display:block;
  color:#536983;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .dmaic-stat strong{
  display:block;
  margin-top:7px;
  color:#102033;
  font-size:22px;
}
.theme-light .dmaic-analysis-shell{
  margin-top:16px;
  border:1px solid #B9C7D8;
  background:#FFFFFF;
}
.theme-light .dmaic-analysis-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:16px;
  padding:16px 18px;
  border-bottom:1px solid #DDE6F1;
  background:linear-gradient(180deg,#F8FAFD 0%,#FFFFFF 100%);
}
.theme-light .dmaic-analysis-head h3{
  margin:0;
  color:#102033;
  font-family:Georgia,'Times New Roman',serif;
  font-size:24px;
  font-weight:500;
}
.theme-light .dmaic-analysis-head p{
  max-width:780px;
  margin:5px 0 0;
  color:#536983;
  font-size:13px;
  line-height:1.45;
}
.theme-light .dmaic-analysis-head span{
  color:#536983;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .dmaic-analysis-shell > .dmaic-stats-grid,
.theme-light .dmaic-analysis-shell > .dmaic-conclusion,
.theme-light .dmaic-analysis-shell > .dmaic-auto-panel,
.theme-light .dmaic-analysis-shell > .dmaic-chart-grid{
  margin-left:16px;
  margin-right:16px;
}
.theme-light .dmaic-analysis-shell > .dmaic-chart-grid{
  margin-bottom:16px;
}
.theme-light .dmaic-quality-panel{
  display:grid;
  grid-template-columns:240px 1fr;
  border-bottom:1px solid #DDE6F1;
}
.theme-light .dmaic-quality-score{
  padding:16px 18px;
  border-right:1px solid #DDE6F1;
  background:#F7FBFA;
}
.theme-light .dmaic-quality-panel.warning .dmaic-quality-score{
  background:#FFF9EF;
}
.theme-light .dmaic-quality-panel.danger .dmaic-quality-score{
  background:#FFF6F4;
}
.theme-light .dmaic-quality-score span,
.theme-light .dmaic-roadmap-step span,
.theme-light .dmaic-executive span{
  display:block;
  color:#536983;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .dmaic-quality-score strong{
  display:block;
  margin-top:8px;
  color:#102033;
  font-size:22px;
}
.theme-light .dmaic-quality-score small{
  display:block;
  margin-top:6px;
  color:#667891;
  font-size:12px;
}
.theme-light .dmaic-quality-list{
  display:grid;
  gap:8px;
  padding:14px 16px;
}
.theme-light .dmaic-quality-item{
  border-left:3px solid #C97D2E;
  background:#F8FAFD;
  padding:8px 10px;
  color:#102033;
  font-size:13px;
  line-height:1.35;
}
.theme-light .dmaic-quality-item.success{
  border-left-color:#2F756A;
  background:#F7FBFA;
}
.theme-light .dmaic-y-profile,
.theme-light .dmaic-profile-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:0;
  border-bottom:1px solid #DDE6F1;
}
.theme-light .dmaic-y-profile div,
.theme-light .dmaic-profile-grid div{
  padding:14px 16px;
  border-right:1px solid #DDE6F1;
  background:#FFFFFF;
}
.theme-light .dmaic-y-profile div:last-child,
.theme-light .dmaic-profile-grid div:last-child{
  border-right:0;
}
.theme-light .dmaic-profile-grid{
  grid-template-columns:repeat(5,minmax(0,1fr));
}
.theme-light .dmaic-y-profile span,
.theme-light .dmaic-profile-grid span,
.theme-light .dmaic-next-action span,
.theme-light .dmaic-report-panel span,
.theme-light .dmaic-test-rule span{
  display:block;
  color:#536983;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .dmaic-y-profile strong,
.theme-light .dmaic-profile-grid strong{
  display:block;
  margin-top:7px;
  color:#102033;
  font-size:18px;
  line-height:1.2;
}
.theme-light .dmaic-y-profile p,
.theme-light .dmaic-profile-grid small{
  display:block;
  margin:6px 0 0;
  color:#667891;
  font-size:12px;
  line-height:1.35;
}
.theme-light .dmaic-roadmap{
  display:grid;
  grid-template-columns:repeat(6,minmax(0,1fr));
  gap:0;
  border-bottom:1px solid #DDE6F1;
}
.theme-light .dmaic-roadmap-step{
  min-height:122px;
  padding:14px;
  border-right:1px solid #DDE6F1;
  background:#FFFFFF;
}
.theme-light .dmaic-roadmap-step:last-child{
  border-right:0;
}
.theme-light .dmaic-roadmap-step strong{
  display:block;
  margin-top:8px;
  color:#102033;
  font-size:18px;
  line-height:1.15;
}
.theme-light .dmaic-roadmap-step p{
  margin:7px 0 0;
  color:#536983;
  font-size:12px;
  line-height:1.35;
}
.theme-light .dmaic-executive{
  margin:16px;
  padding:14px 16px;
  border:1px solid #C9D8EC;
  border-left:5px solid #2F756A;
  background:#F7FBFA;
}
.theme-light .dmaic-executive.warning{
  border-left-color:#C97D2E;
  background:#FFF9EF;
}
.theme-light .dmaic-executive.danger{
  border-left-color:#A23B2E;
  background:#FFF6F4;
}
.theme-light .dmaic-executive strong{
  display:block;
  margin-top:7px;
  color:#102033;
  font-size:20px;
}
.theme-light .dmaic-executive p{
  margin:8px 0 0;
  color:#102033;
  font-size:14px;
  line-height:1.5;
}
.theme-light .dmaic-chart-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:12px;
}
.theme-light .dmaic-chart-card{
  min-height:320px;
  border:1px solid #D5E0EE;
  background:#FFFFFF;
  padding:12px;
}
.theme-light .dmaic-chart-card h4{
  margin:0 0 10px;
  color:#445B76;
  font-family:var(--font-mono);
  font-size:11px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .dmaic-chart-card.full{
  grid-column:1/-1;
}
.theme-light .dmaic-conclusion{
  border:1px solid #D5E0EE;
  border-left:4px solid #2F756A;
  background:#F7FBFA;
  padding:10px 12px;
  color:#102033;
  font-size:14px;
  line-height:1.45;
}
.theme-light .dmaic-conclusion.warning{
  border-left-color:#C97D2E;
  background:#FFF9EF;
}
.theme-light .dmaic-conclusion.danger{
  border-left-color:#A23B2E;
  background:#FFF6F4;
}
.theme-light .dmaic-tool-columns{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:14px;
}
.theme-light .dmaic-empty-chart{
  display:flex;
  min-height:220px;
  align-items:center;
  justify-content:center;
  border:1px dashed #C9D8EC;
  background:#F8FAFD;
  color:#667891;
  text-align:center;
  padding:20px;
}
.theme-light .dmaic-boxplot{
  width:100%;
  height:250px;
}
.theme-light .dmaic-pill-row{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin-top:10px;
}
.theme-light .dmaic-pill{
  border:1px solid #D5E0EE;
  background:#F8FAFD;
  padding:8px 10px;
  color:#102033;
  font-size:13px;
  font-weight:700;
}
.theme-light .dmaic-next-action{
  margin:14px 16px 16px;
  padding:14px 16px;
  border:1px solid #C9D8EC;
  border-top:3px solid #2F756A;
  background:#F7FBFA;
}
.theme-light .dmaic-next-action strong{
  display:block;
  margin-top:8px;
  color:#102033;
  font-size:19px;
  line-height:1.35;
}
.theme-light .dmaic-next-action p{
  margin:8px 0 0;
  color:#536983;
  font-size:13px;
  line-height:1.45;
}
.theme-light .dmaic-test-logic,
.theme-light .dmaic-priority-panel,
.theme-light .dmaic-report-panel{
  margin-top:16px;
  border:1px solid #C9D8EC;
  background:#FFFFFF;
}
.theme-light .dmaic-test-rule{
  padding:12px 14px;
  border-bottom:1px solid #DDE6F1;
  background:#F8FAFD;
}
.theme-light .dmaic-test-rule strong{
  display:block;
  margin-top:6px;
  color:#102033;
  font-size:18px;
}
.theme-light .dmaic-test-rule p{
  margin:6px 0 0;
  color:#536983;
  font-size:13px;
  line-height:1.4;
}
.theme-light .dmaic-priority-list{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:10px;
  padding:12px 14px 14px;
}
.theme-light .dmaic-priority-item{
  border:1px solid #D5E0EE;
  border-left:4px solid #2F756A;
  background:#F8FAFD;
  padding:11px 12px;
}
.theme-light .dmaic-priority-item strong{
  display:block;
  color:#102033;
  font-size:15px;
  line-height:1.25;
}
.theme-light .dmaic-priority-item span{
  display:block;
  margin-top:7px;
  color:#536983;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .dmaic-priority-item p{
  margin:7px 0 0;
  color:#536983;
  font-size:12px;
  line-height:1.35;
}
.theme-light .dmaic-report-panel{
  display:grid;
  grid-template-columns:320px 1fr;
  gap:0;
  border-top:3px solid #10233F;
}
.theme-light .dmaic-report-panel > div:first-child{
  padding:14px 16px;
  border-right:1px solid #DDE6F1;
  background:#F8FAFD;
}
.theme-light .dmaic-report-panel strong{
  display:block;
  margin-top:8px;
  color:#102033;
  font-size:22px;
}
.theme-light .dmaic-report-panel p{
  margin:8px 0 0;
  color:#536983;
  font-size:13px;
  line-height:1.4;
}
.theme-light .dmaic-report-list{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:8px;
  padding:14px 16px;
}
.theme-light .dmaic-report-list span{
  padding:8px 10px;
  border:1px solid #D5E0EE;
  background:#FFF9EF;
  color:#8A5A1C;
}
.theme-light .dmaic-report-list span.ready{
  background:#F7FBFA;
  color:#2F756A;
}
.theme-light .dmaic-auto-panel{
  margin:14px 0;
  border:1px solid #C9D8EC;
  background:#FFFFFF;
}
.theme-light .dmaic-auto-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:12px 14px;
  border-bottom:1px solid #DDE6F1;
  background:#F2F7FC;
}
.theme-light .dmaic-auto-head h3{
  margin:0;
  color:#102033;
  font-family:Georgia,'Times New Roman',serif;
  font-size:20px;
  font-weight:500;
}
.theme-light .dmaic-auto-head span{
  color:#536983;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .dmaic-auto-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  border-bottom:1px solid #DDE6F1;
}
.theme-light .dmaic-auto-grid div{
  padding:12px 14px;
  border-right:1px solid #DDE6F1;
}
.theme-light .dmaic-auto-grid div:last-child{
  border-right:0;
}
.theme-light .dmaic-auto-grid span{
  display:block;
  color:#536983;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .dmaic-auto-grid strong{
  display:block;
  margin-top:7px;
  color:#102033;
  font-size:18px;
  line-height:1.2;
}
.theme-light .dmaic-auto-grid small{
  display:block;
  margin-top:6px;
  color:#667891;
  font-size:12px;
  line-height:1.35;
}
.theme-light .dmaic-auto-details{
  padding:12px 14px 14px;
}
@media (max-width: 760px){
  .theme-light .dmaic-grid{
    grid-template-columns:1fr;
  }
  .theme-light .dmaic-summary,
  .theme-light .dmaic-stats-grid,
  .theme-light .dmaic-chart-grid,
  .theme-light .dmaic-tool-columns,
  .theme-light .dmaic-auto-grid,
  .theme-light .dmaic-y-profile,
  .theme-light .dmaic-profile-grid,
  .theme-light .dmaic-priority-list,
  .theme-light .dmaic-report-panel,
  .theme-light .dmaic-report-list,
  .theme-light .dmaic-quality-panel,
  .theme-light .dmaic-roadmap{
    grid-template-columns:1fr;
  }
  .theme-light .dmaic-import-card,
  .theme-light .dmaic-analysis-head{
    align-items:stretch;
    flex-direction:column;
  }
  .theme-light .dmaic-quality-score,
  .theme-light .dmaic-y-profile div,
  .theme-light .dmaic-profile-grid div,
  .theme-light .dmaic-report-panel > div:first-child,
  .theme-light .dmaic-roadmap-step{
    border-right:0;
    border-bottom:1px solid #DDE6F1;
  }
  .theme-light .dmaic-auto-grid div{
    border-right:0;
    border-bottom:1px solid #DDE6F1;
  }
}
.theme-light .bpmn-workbench{
  border:1px solid #B9C3D2;
  background:#FFFFFF;
  display:flex;
  flex:1;
  flex-direction:column;
  min-height:0;
  width:100%;
}
.theme-light .bpmn-main{
  padding:12px 14px 18px;
}
.theme-light .bpmn-card{
  max-width:none;
  width:100%;
  min-height:calc(100vh - 30px);
  display:flex;
  flex-direction:column;
  padding:14px;
}
.theme-light .bpmn-card h2{
  margin-bottom:8px;
}
.theme-light .bpmn-card .objectif,
.theme-light .bpmn-card .livrable{
  padding:9px 12px;
  margin:6px 0;
}
.theme-light .bpmn-card .step-body{
  flex:1;
  display:flex;
  min-height:0;
}
.theme-light .bpmn-toolbar{
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:center;
  padding:12px 14px;
  border-bottom:1px solid #D8DEE8;
  background:#F6F8FB;
}
.theme-light .bpmn-toolbar strong{
  display:block;
  color:#11233F;
  font-family:Georgia,'Times New Roman',serif;
  font-size:20px;
  font-weight:500;
}
.theme-light .bpmn-toolbar span{
  display:block;
  margin-top:4px;
  color:#4B5C73;
  font-size:12px;
}
.theme-light .bpmn-actions{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  justify-content:flex-end;
  align-items:center;
}
.theme-light .bpmn-color-palette{
  display:flex;
  align-items:center;
  gap:6px;
  padding:4px 8px;
  border:1px solid #D8DEE8;
  background:#FFFFFF;
}
.theme-light .bpmn-color-swatch{
  width:24px;
  height:24px;
  border:2px solid;
  border-radius:50%;
  cursor:pointer;
}
.theme-light .bpmn-color-swatch:hover{
  transform:translateY(-1px);
  box-shadow:0 2px 6px rgba(17,35,63,.18);
}
.theme-light .bpmn-color-reset{
  height:28px;
  border:0;
  border-left:1px solid #D8DEE8;
  background:transparent;
  color:#4B5C73;
  cursor:pointer;
  font-size:11px;
  font-weight:750;
  padding:0 0 0 8px;
  text-transform:uppercase;
  letter-spacing:.03em;
}
.theme-light .bpmn-color-reset:hover{
  color:#B91C1C;
}
.theme-light .bpmn-editor-shell{
  flex:1;
  height:calc(100vh - 245px);
  min-height:680px;
  position:relative;
  border-bottom:1px solid #D8DEE8;
  background:#FFFFFF;
  overflow:hidden;
}
.theme-light .bpmn-canvas{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
}
.theme-light .bpmn-canvas .djs-container,
.theme-light .bpmn-canvas .bjs-container{
  width:100%!important;
  height:100%!important;
}
.theme-light .bpmn-canvas svg{
  width:100%;
  height:100%;
}
.theme-light .bpmn-workbench .djs-palette{
  background:#FFFFFF;
  border-color:#B9C3D2;
  box-shadow:none;
}
.theme-light .bpmn-workbench > .hint-text{
  margin:10px 14px 14px;
}

/* Step hierarchy refinement */
.theme-light .dossier-card{
  counter-reset: step-section;
}
.theme-light .step-body{
  margin-top:22px;
}
.theme-light .sub-title{
  counter-increment:step-section;
  display:flex;
  align-items:center;
  gap:12px;
  background:#FFFFFF;
  border:1px solid #D8D0C2;
  border-left:4px solid #112747;
  margin:34px 0 16px;
  padding:12px 14px;
}
.theme-light .sub-title::before{
  content:"Bloc " counter(step-section);
  flex:0 0 auto;
  display:inline-flex;
  align-items:center;
  min-height:22px;
  padding:0 8px;
  background:#EEF3F7;
  border:1px solid #CAD4E0;
  color:#52637A;
  font-family:var(--font-mono);
  font-size:10px;
  font-weight:850;
  text-transform:uppercase;
}
.theme-light .step-body > .field,
.theme-light .charte-grid .field{
  background:#FFFCF6;
  border:1px solid #DDD5C8;
  border-left:3px solid #B9C3D2;
  padding:12px 12px 10px;
  margin-bottom:12px;
}
.theme-light .field label{
  display:flex;
  align-items:center;
  gap:8px;
}
.theme-light .field label::before{
  content:"";
  width:6px;
  height:6px;
  background:#2F756A;
}
.theme-light .step-body .ledger-table-wrap{
  background:#FFFFFF;
  border:1px solid #D8D0C2;
  border-top:3px solid #2F756A;
  padding:12px;
  margin:10px 0 20px;
}
.theme-light .step-body .ledger-table th{
  background:#F6F8FB;
}
.theme-light .fivewhy,
.theme-light .ishikawa-grid,
.theme-light .vsm-summary,
.theme-light .kpi-grid,
.theme-light .pain-callout{
  margin-top:12px;
}
.theme-light .fivewhy{
  border-left:3px solid #112747;
  background:#FFFFFF;
  padding:14px;
}
.theme-light .ishikawa-grid .branch{
  background:#FFFFFF;
  border:1px solid #D8D0C2;
  border-top:3px solid #B36B1E;
}
.theme-light .vsm-summary div,
.theme-light .kpi-card{
  border-top:3px solid #2F756A;
}
.theme-light .pain-callout{
  background:#FFF8EC;
  border:1px solid #E7BD7A;
  border-left:4px solid #B36B1E;
}
.theme-light .empty-hint,
.theme-light .empty-row{
  background:#F8FAFC;
  border:1px dashed #B9C3D2;
  color:#52637A;
}

/* Product polish: icons, buttons, empty states and alerts */
.theme-light .step-icon{
  flex:0 0 auto;
  color:#8FA6C4;
}
.theme-light .step-item.is-active .step-icon{
  color:#2F756A;
}
.theme-light .step-item.is-active .advanced-step-icon{
  color:#2F756A;
}
.theme-light .step-page-title{
  display:flex;
  align-items:center;
  gap:10px;
}
.theme-light .step-page-icon{
  flex:0 0 auto;
  color:#2F756A;
}
.theme-light .home-primary,
.theme-light .open-project,
.theme-light .validate-btn,
.theme-light .nav-btn,
.theme-light .btn-add,
.theme-light .btn-add-mini,
.theme-light .ghost-btn,
.theme-light .back-home,
.theme-light .collapse-btn,
.theme-light .bpmn-actions > button{
  border-radius:0;
  transition:background .15s ease, border-color .15s ease, color .15s ease;
}
.theme-light .home-primary,
.theme-light .open-project,
.theme-light .validate-btn{
  background:#112747;
  border:1px solid #112747;
  color:#FFFFFF;
  box-shadow:none;
}
.theme-light .home-primary:hover,
.theme-light .open-project:hover,
.theme-light .validate-btn:hover{
  background:#1F4F80;
  border-color:#1F4F80;
}
.theme-light .validate-btn.is-validated{
  background:#2F756A;
  border-color:#2F756A;
  color:#FFFFFF;
}
.theme-light .nav-btn,
.theme-light .btn-add,
.theme-light .ghost-btn,
.theme-light .back-home,
.theme-light .collapse-btn,
.theme-light .bpmn-actions > button{
  background:#FFFFFF;
  border:1px solid #B9C3D2;
  color:#112747;
  box-shadow:none;
}
.theme-light .nav-btn:not(:disabled):hover,
.theme-light .btn-add:hover,
.theme-light .ghost-btn:hover,
.theme-light .back-home:hover,
.theme-light .collapse-btn:hover,
.theme-light .bpmn-actions > button:hover{
  background:#EEF3F7;
  border-color:#52637A;
  color:#112747;
}
.theme-light .btn-add{
  border-style:dashed;
  border-color:#2F756A;
  color:#2F756A;
}
.theme-light .btn-add-mini{
  color:#2F756A;
  font-weight:800;
}
.theme-light .empty-row{
  padding:22px!important;
  text-align:center;
}
.theme-light .empty-row span,
.theme-light .empty-hint::before{
  display:block;
  color:#112747;
  font-weight:750;
  font-style:normal;
}
.theme-light .empty-row small{
  display:block;
  margin-top:4px;
  color:#52637A;
  font-style:normal;
}
.theme-light .empty-hint{
  padding:18px;
  text-align:center;
  font-style:normal;
}
.theme-light .empty-hint::before{
  content:"Zone vide";
  margin-bottom:4px;
}
.theme-light .is-pain{
  border-color:#B36B1E!important;
  background:#FFF8EC!important;
  box-shadow:inset 0 0 0 1px rgba(179,107,30,.16);
}
.theme-light .shape-diamond.is-pain{
  background:transparent!important;
  box-shadow:none;
}
.theme-light .shape-diamond.is-pain::before{
  background:#FFF8EC!important;
  border-color:#B36B1E!important;
  box-shadow:0 0 0 3px rgba(179,107,30,.13);
}
.theme-light .flow-pain-badge{
  background:#B36B1E;
  border:2px solid #FFFFFF;
  color:#FFFFFF;
}
.theme-light .pain-callout strong{
  display:flex;
  align-items:center;
  gap:8px;
  color:#7B430B;
}
.theme-light .pain-callout strong::before{
  content:"!";
  display:inline-flex;
  align-items:center;
  justify-content:center;
  width:18px;
  height:18px;
  background:#B36B1E;
  color:#FFFFFF;
  font-family:var(--font-mono);
  font-size:12px;
  font-weight:900;
}

@media print {
  @page{ margin:12mm; }
  body *{ visibility:hidden; }
  .lean-app, .lean-app *{ visibility:visible; }
  body{ background:#fff!important; }
  .lean-app{ display:block; height:auto; max-height:none; border:none; position:absolute; left:0; top:0; width:100%; background:#fff!important; color:#10233F; }
  .sidebar, .main{ display:none; }
  .print-only{ display:block; font-family:var(--font-body); color:var(--ink); }
  .print-only::before{ content:"PilotProcess"; display:block; font-family:var(--font-mono); font-size:10px; color:#2F6F63; text-transform:uppercase; letter-spacing:.08em; border-bottom:2px solid #10233F; padding-bottom:8px; margin-bottom:16px; }
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
  .landing-page{ width:calc(100vw - 28px); padding:18px 0 40px; }
  .landing-hero{ grid-template-columns:1fr; padding:30px 0 20px; }
  .landing-copy h1{ font-size:42px; }
  .landing-panel{ padding:14px; }
  .landing-sectors{ grid-template-columns:1fr; }
  .project-home{ width:calc(100vw - 28px); padding:18px 0 40px; }
  .home-hero{ grid-template-columns:1fr; align-items:flex-start; padding:20px; }
  .home-hero h1{ font-size:38px; }
  .home-hero-actions{ width:100%; align-items:stretch; }
  .home-primary{ width:100%; }
  .home-dashboard{ grid-template-columns:1fr 1fr; }
  .portfolio-toolbar{ grid-template-columns:1fr; }
  .portfolio-actions{ align-items:stretch; }
  .project-grid{ grid-template-columns:1fr; }
  .project-grid.view-list .project-card,
  .project-grid.view-compact .project-card{ grid-template-columns:1fr; }
  .project-grid.view-list .open-project,
  .project-grid.view-compact .open-project,
  .project-grid.view-compact .project-card h2,
  .project-grid.view-compact .project-progress,
  .project-grid.view-compact .status-badge,
  .project-grid.view-compact .delete-project,
  .project-grid.view-compact .project-icon{
    grid-column:auto;
    grid-row:auto;
  }
  .project-grid.view-compact .project-card-top{ display:flex; }
  .sidebar{ width:100%; min-width:0; }
  .steps-nav{ display:flex; overflow-x:auto; }
  .step-item{ flex-direction:column; width:auto; min-width:96px; margin:4px; border-left:none; border-bottom:3px solid transparent; }
  .step-item.is-active{ border-bottom-color:var(--teal); }
  .app-topbar{ flex-direction:column; align-items:flex-start; }
  .topbar-status{ width:100%; justify-content:space-between; }
  .objectif,.livrable{ width:100%!important; margin-right:0!important; }
  .charte-grid{ grid-template-columns:1fr; }
  .ishikawa-grid{ grid-template-columns:repeat(2,1fr); }
  .kpi-grid{ grid-template-columns:1fr; }
  .main{ padding:20px; }
}

@media (max-width: 560px){
  .landing-nav{ align-items:flex-start; flex-direction:column; }
  .landing-auth-actions{ width:100%; display:grid; grid-template-columns:1fr; }
  .auth-nav-button{ width:100%; }
  .landing-actions,.landing-primary,.landing-secondary{ width:100%; }
  .landing-panel-metrics{ grid-template-columns:1fr; }
  .home-dashboard{ grid-template-columns:1fr; }
  .portfolio-toolbar h2{ font-size:22px; }
  .portfolio-actions{ flex-direction:column; }
  .view-toggle{ width:100%; }
  .view-toggle button{ flex:1; }
}

.theme-light .home-primary.home-secondary{
  background:#FFFFFF;
  color:#0F2744;
  border:1px solid #CBD5E1;
}
.theme-light .home-primary.home-secondary:hover{
  background:#F6F8FB;
  color:#0F2744;
}

@media (max-width: 640px){
  html,body,#root{ width:100%; min-width:0; overflow-x:hidden; }
  .lean-app{
    width:100%;
    min-width:0;
    min-height:100svh;
    margin:0;
    border:0;
    border-radius:0;
    box-shadow:none;
    overflow:visible;
  }
  .theme-light .landing-page,
  .theme-light .auth-page,
  .theme-light .project-home{
    width:100%;
    padding:14px 14px 34px;
  }
  .theme-light .auth-shell{
    padding:24px 18px;
    margin:26px auto 0;
    box-shadow:0 18px 48px rgba(16,35,63,.12);
  }
  .theme-light .auth-heading h1{
    font-size:29px;
  }
  .theme-light .landing-nav{
    gap:12px;
    padding-bottom:14px;
  }
  .theme-light .landing-brand{
    font-size:26px;
    gap:10px;
  }
  .theme-light .landing-brand img{
    width:44px;
    height:44px;
  }
  .theme-light .landing-hero{
    display:block;
    padding:24px 0 16px;
  }
  .theme-light .landing-copy{
    padding-top:16px;
  }
  .theme-light .landing-copy h1{
    font-size:36px;
    line-height:1.04;
    overflow-wrap:anywhere;
  }
  .theme-light .landing-copy p{
    font-size:14px;
    line-height:1.55;
  }
  .theme-light .landing-actions{
    flex-direction:column;
  }
  .theme-light .landing-primary,
  .theme-light .landing-secondary{
    width:100%;
    min-height:44px;
  }
  .theme-light .landing-panel{
    margin-top:22px;
    padding:14px;
  }
  .theme-light .landing-panel-head,
  .theme-light .landing-mini-list div{
    flex-direction:column;
    align-items:flex-start;
  }
  .theme-light .landing-mini-list span{
    white-space:normal;
  }
  .theme-light .landing-sectors{
    grid-template-columns:1fr;
  }

  .theme-light .home-hero{
    padding:16px;
    display:block;
  }
  .theme-light .brand-lockup{
    gap:10px;
  }
  .theme-light .brand-logo{
    width:52px;
    height:52px;
  }
  .theme-light .home-hero h1{
    font-size:34px;
    overflow-wrap:anywhere;
  }
  .theme-light .home-hero p{
    font-size:14px;
  }
  .theme-light .home-hero-actions{
    margin-top:16px;
  }
  .theme-light .home-dashboard{
    grid-template-columns:1fr;
    gap:10px;
  }
  .theme-light .home-widget{
    min-height:auto;
    padding:14px;
  }
  .theme-light .portfolio-toolbar{
    display:block;
    padding-top:8px;
  }
  .theme-light .portfolio-toolbar h2{
    font-size:25px;
  }
  .theme-light .portfolio-actions{
    margin-top:12px;
    flex-direction:column;
  }
  .theme-light .home-search{
    width:100%;
    min-height:46px;
  }
  .theme-light .view-toggle{
    width:100%;
  }
  .theme-light .view-toggle button{
    flex:1;
    height:42px;
  }
  .theme-light .project-grid,
  .theme-light .project-grid.view-list,
  .theme-light .project-grid.view-compact{
    grid-template-columns:1fr;
    gap:12px;
  }
  .theme-light .project-card,
  .theme-light .project-grid.view-list .project-card,
  .theme-light .project-grid.view-compact .project-card{
    display:flex;
    flex-direction:column;
    min-height:0;
    padding:15px;
  }
  .theme-light .project-card-top,
  .theme-light .project-grid.view-compact .project-card-top{
    display:flex;
    width:100%;
    margin-bottom:12px;
  }
  .theme-light .project-card h2,
  .theme-light .project-grid.view-compact .project-card h2{
    font-size:20px;
    line-height:1.15;
  }
  .theme-light .project-card p,
  .theme-light .project-grid.view-compact .project-card p{
    display:-webkit-box;
    -webkit-line-clamp:3;
    -webkit-box-orient:vertical;
  }
  .theme-light .project-grid.view-compact .status-badge,
  .theme-light .project-grid.view-compact .delete-project,
  .theme-light .project-grid.view-compact .project-icon,
  .theme-light .project-grid.view-compact .project-progress,
  .theme-light .project-grid.view-compact .open-project{
    grid-column:auto;
    grid-row:auto;
  }
  .theme-light .open-project{
    width:100%;
    min-height:44px;
  }

  .theme-light .sidebar{
    width:100%;
    min-width:0;
    max-height:none;
  }
  .theme-light .sidebar-head{
    padding:12px;
  }
  .theme-light .sidebar-top-actions{
    margin-bottom:10px;
  }
  .theme-light .collapse-btn{
    display:none;
  }
  .theme-light .sidebar-brand h1{
    font-size:24px;
  }
  .theme-light .project-name{
    min-height:40px;
  }
  .theme-light .steps-nav{
    display:flex;
    gap:8px;
    overflow-x:auto;
    padding:8px 12px 10px;
    scrollbar-width:none;
  }
  .theme-light .steps-nav::-webkit-scrollbar{
    display:none;
  }
  .theme-light .step-item,
  .theme-light.sidebar-collapsed .step-item{
    flex:0 0 auto;
    width:auto;
    min-width:92px;
    height:auto;
    margin:0;
    padding:9px 10px;
    justify-content:flex-start;
    border-left:0;
    border-bottom:3px solid transparent;
  }
  .theme-light .step-title,
  .theme-light.sidebar-collapsed .step-title{
    display:block;
    max-width:82px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .theme-light.sidebar-collapsed .sidebar{
    width:100%;
    min-width:0;
  }
  .theme-light.sidebar-collapsed .sidebar-expanded-only,
  .theme-light.sidebar-collapsed .step-title,
  .theme-light.sidebar-collapsed .sidebar-foot{
    display:block;
  }
  .theme-light .sidebar-foot{
    display:none;
  }
  .theme-light.sidebar-collapsed .main,
  .theme-light .main{
    width:100%;
    padding:14px;
    overflow:visible;
  }
  .theme-light .dossier-card{
    max-width:none;
    width:100%;
    padding:14px;
    border-left:0;
    border-right:0;
  }
  .theme-light .dossier-card h2{
    font-size:28px;
    line-height:1.08;
  }
  .theme-light .eyebrow{
    white-space:normal;
  }
  .theme-light .objectif,
  .theme-light .livrable{
    padding:9px 10px!important;
    font-size:12.5px;
  }
  .theme-light .step-body{
    margin-top:12px;
  }
  .theme-light .field{
    margin-bottom:12px;
  }
  .theme-light .field label{
    font-size:10.5px;
  }
  .theme-light .lean-app input,
  .theme-light .lean-app select,
  .theme-light .lean-app textarea{
    font-size:16px!important;
  }
  .theme-light .charte-grid,
  .theme-light .ishikawa-grid,
  .theme-light .kpi-grid{
    grid-template-columns:1fr;
  }
  .theme-light .ledger-table-wrap{
    width:100%;
    overflow-x:auto;
    -webkit-overflow-scrolling:touch;
  }
  .theme-light .ledger-table{
    min-width:680px;
  }
  .theme-light .flow-viz{
    flex-wrap:nowrap;
    overflow-x:auto;
    align-items:center;
    padding:16px 4px 20px;
    -webkit-overflow-scrolling:touch;
  }
  .theme-light .flow-node{
    flex:0 0 auto;
  }
  .theme-light .shape-diamond{
    width:104px;
    height:104px;
    min-width:104px;
    max-width:104px;
  }
  .theme-light .shape-diamond::before{
    width:72px;
    height:72px;
    top:16px;
    left:16px;
  }
  .theme-light .shape-diamond .flow-node-label{
    max-width:62px;
    font-size:11px;
  }
  .theme-light .step-actions{
    flex-direction:column;
    align-items:stretch;
    gap:9px;
  }
  .theme-light .step-actions button{
    width:100%;
    min-height:44px;
  }
  .theme-light .bpmn-main{
    padding:10px;
  }
  .theme-light .bpmn-card{
    padding:10px;
  }
  .theme-light .bpmn-toolbar{
    flex-direction:column;
    align-items:stretch;
    gap:10px;
    padding:10px;
  }
  .theme-light .bpmn-actions{
    justify-content:flex-start;
  }
  .theme-light .bpmn-color-palette{
    width:100%;
    overflow-x:auto;
  }
  .theme-light .bpmn-actions > button{
    flex:1 1 100%;
    min-height:40px;
  }
  .theme-light .bpmn-editor-shell{
    min-height:calc(100svh - 260px);
  }
  .theme-light .bpmn-canvas{
    min-height:calc(100svh - 270px);
  }
  .theme-light .bpmn-workbench .djs-palette{
    transform:scale(.86);
    transform-origin:top left;
  }
}

@media (max-width: 900px){
  .lean-app.theme-light,
  .theme-light.lean-app{
    display:flex!important;
    flex-direction:column!important;
    width:100vw!important;
    max-width:100vw!important;
    min-width:0!important;
    min-height:100svh!important;
    margin:0!important;
    overflow-x:hidden!important;
    border-radius:0!important;
  }
  .theme-light .sidebar,
  .theme-light.sidebar-collapsed .sidebar{
    position:sticky!important;
    top:0!important;
    z-index:50!important;
    width:100%!important;
    min-width:0!important;
    max-width:none!important;
    flex:0 0 auto!important;
    border-right:0!important;
    border-bottom:1px solid #243247!important;
  }
  .theme-light .steps-nav{
    display:flex!important;
    flex-direction:row!important;
    flex-wrap:nowrap!important;
    overflow-x:auto!important;
    overflow-y:hidden!important;
    width:100%!important;
    max-width:100vw!important;
    -webkit-overflow-scrolling:touch;
  }
  .theme-light .step-item,
  .theme-light.sidebar-collapsed .step-item{
    flex:0 0 auto!important;
    width:auto!important;
    min-width:86px!important;
    max-width:106px!important;
    border-left:0!important;
    border-bottom:3px solid transparent!important;
  }
  .theme-light .main,
  .theme-light.sidebar-collapsed .main{
    width:100%!important;
    min-width:0!important;
    flex:0 0 auto!important;
    overflow:visible!important;
  }
}

@media (max-width: 390px){
  .theme-light .landing-copy h1,
  .theme-light .home-hero h1{
    font-size:31px;
  }
  .theme-light .dossier-card h2{
    font-size:25px;
  }
  .theme-light .step-item,
  .theme-light.sidebar-collapsed .step-item{
    min-width:82px;
  }
  .theme-light .step-title,
  .theme-light.sidebar-collapsed .step-title{
    max-width:72px;
  }
}

.steps-nav .step-item{
  gap:12px;
}
.steps-nav .step-icon,
.steps-nav .advanced-step-icon{
  flex:0 0 20px;
}
.sidebar-collapsed .steps-nav .step-item{
  gap:0;
}

.theme-light .sidebar .back-home,
.theme-light .sidebar .collapse-btn{
  border-radius:2px;
  background:#132743;
  border:1px solid #385174;
  color:#F8FAFC;
  box-shadow:none;
}
.theme-light .sidebar .back-home{
  min-height:34px;
  padding:0 12px;
  gap:8px;
  font-size:13px;
  font-weight:800;
}
.theme-light .sidebar .collapse-btn{
  width:38px;
  height:38px;
  flex:0 0 38px;
}
.theme-light .sidebar .back-home:hover,
.theme-light .sidebar .collapse-btn:hover{
  background:#1B3458;
  border-color:#6F87A8;
  color:#FFFFFF;
}
.theme-light.sidebar-collapsed .sidebar-head{
  padding:14px 10px 12px;
}
.theme-light.sidebar-collapsed .sidebar-top-actions{
  flex-direction:column;
  align-items:center;
  gap:10px;
  margin-bottom:14px;
}
.theme-light.sidebar-collapsed .sidebar .back-home,
.theme-light.sidebar-collapsed .sidebar .collapse-btn{
  width:42px;
  height:42px;
  min-height:42px;
  padding:0;
  justify-content:center;
}
.theme-light.sidebar-collapsed .steps-nav{
  padding:8px 10px;
}
.theme-light.sidebar-collapsed .steps-nav .step-item{
  width:42px;
  height:42px;
  min-width:42px;
  margin:5px auto;
  border-radius:2px;
  border:1px solid transparent;
  border-left:3px solid transparent;
  background:transparent;
  color:#8FA6C4;
}
.theme-light.sidebar-collapsed .steps-nav .step-item:hover{
  background:#16243A;
  border-color:#2E4666;
}
.theme-light.sidebar-collapsed .steps-nav .step-item.is-active{
  background:#EAF4F1;
  border-color:#EAF4F1;
  border-left-color:#2F756A;
  color:#2F756A;
}
.theme-light.sidebar-collapsed .steps-nav .step-icon,
.theme-light.sidebar-collapsed .steps-nav .advanced-step-icon{
  flex:0 0 auto;
  color:currentColor;
}

@media (max-width: 640px){
  .theme-light.lean-app{
    display:block;
    background:#F8FAFC;
  }
  .theme-light .landing-page,
  .theme-light .project-home{
    padding-left:12px;
    padding-right:12px;
  }
  .theme-light .landing-background{
    background-size:48px 48px;
  }
  .theme-light .landing-card-ghost,
  .theme-light .landing-loop{
    opacity:.45;
    transform:scale(.78);
  }
  .theme-light .landing-flowline.three{
    display:none;
  }
  .theme-light .landing-nav{
    position:sticky;
    top:0;
    z-index:30;
    background:#F8FAFC;
    padding-top:10px;
  }
  .theme-light .landing-brand{
    font-size:24px;
  }
  .theme-light .landing-copy h1,
  .theme-light .home-hero h1{
    font-size:32px;
    line-height:1.04;
  }
  .theme-light .home-hero{
    padding:14px;
    border-top-width:4px;
  }
  .theme-light .home-dashboard{
    gap:8px;
  }
  .theme-light .home-widget{
    padding:12px;
  }
  .theme-light .project-card{
    padding:14px;
  }
  .theme-light .project-card h2{
    font-size:19px;
  }
  .theme-light .sidebar{
    position:sticky;
    top:0;
    z-index:40;
    border-right:0;
    border-bottom:1px solid #243247;
    box-shadow:0 10px 24px rgba(16,24,40,.14);
  }
  .theme-light .sidebar-head{
    padding:10px 10px 8px;
  }
  .theme-light .sidebar-top-actions{
    margin-bottom:8px;
  }
  .theme-light .back-home{
    min-height:36px;
    padding:0 10px;
  }
  .theme-light .sidebar-brand{
    gap:8px;
    margin-bottom:8px;
  }
  .theme-light .sidebar-logo{
    width:34px;
    height:34px;
  }
  .theme-light .sidebar-brand h1{
    font-size:21px;
  }
  .theme-light .project-name{
    min-height:36px;
    font-size:13px;
    padding:8px 10px;
  }
  .theme-light .progress-line{
    height:5px;
    margin-top:9px;
  }
  .theme-light .progress-text{
    margin-top:7px;
    font-size:11px;
  }
  .theme-light .steps-nav{
    position:relative;
    display:flex;
    gap:7px;
    padding:8px 10px 9px;
    overflow-x:auto;
    scroll-snap-type:x proximity;
    background:#0A1220;
  }
  .theme-light .step-item,
  .theme-light.sidebar-collapsed .step-item{
    flex:0 0 auto;
    min-width:86px;
    max-width:104px;
    min-height:42px;
    padding:8px 9px;
    gap:7px;
    scroll-snap-align:start;
  }
  .theme-light .step-icon,
  .theme-light .advanced-step-icon{
    flex:0 0 16px;
  }
  .theme-light .step-title,
  .theme-light.sidebar-collapsed .step-title{
    max-width:66px;
    font-size:12px;
  }
  .theme-light .step-stamp{
    display:none;
  }
  .theme-light .main{
    padding:12px 10px 28px;
  }
  .theme-light .dossier-card{
    padding:12px;
    border-radius:0;
  }
  .theme-light .step-page-title{
    gap:8px;
  }
  .theme-light .step-page-title svg{
    width:18px;
    height:18px;
  }
  .theme-light .dossier-card h2{
    font-size:24px;
    line-height:1.08;
  }
  .theme-light .objectif,
  .theme-light .livrable{
    margin-top:8px;
    padding:8px 9px!important;
    line-height:1.35;
  }
  .theme-light .sub-title{
    margin-top:22px;
    font-size:22px;
  }
  .theme-light .field input,
  .theme-light .field textarea,
  .theme-light .field select{
    min-height:38px;
  }
  .theme-light .ledger-table-wrap{
    margin-left:-2px;
    margin-right:-2px;
    border-radius:0;
  }
  .theme-light .ledger-table{
    min-width:620px;
    font-size:12px;
  }
  .theme-light .ledger-table th,
  .theme-light .ledger-table td{
    padding:8px 9px;
  }
  .theme-light .add-row,
  .theme-light .ghost-btn,
  .theme-light .primary-btn,
  .theme-light .open-project{
    min-height:44px;
  }
  .theme-light .flow-viz{
    gap:8px;
    padding-bottom:16px;
  }
  .theme-light .flow-arrow{
    min-width:18px;
  }
  .theme-light .bpmn-workbench{
    min-height:calc(100svh - 168px);
  }
  .theme-light .bpmn-editor-shell,
  .theme-light .bpmn-canvas{
    min-height:calc(100svh - 260px);
  }
}

@media (max-width: 390px){
  .theme-light .step-item,
  .theme-light.sidebar-collapsed .step-item{
    min-width:78px;
    max-width:92px;
  }
  .theme-light .step-title,
  .theme-light.sidebar-collapsed .step-title{
    max-width:58px;
  }
  .theme-light .project-name{
    font-size:12px;
  }
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

function scrollAppToTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  requestAnimationFrame(() => {
    document.querySelectorAll('.main, .project-home, .landing-page').forEach(element => {
      element.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  });
}

function cleanPdfText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  return String(value).replace(/\s+/g, ' ').trim();
}

function generateProjectPdf(jsPDF, data, validatedCount) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const ink = [16, 35, 63];
  const muted = [80, 96, 119];
  const line = [205, 214, 226];
  const soft = [246, 248, 251];
  const accent = [47, 111, 99];
  let y = margin;
  let page = 1;

  const setText = (size = 10, style = 'normal', color = ink) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const drawPilotProcessLogo = (x, y, size) => {
    const s = size;
    doc.setFillColor(...ink);
    doc.rect(x, y, s, s, 'F');

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(s * 0.08);
    doc.setLineCap('square');
    doc.setLineJoin('round');
    doc.line(x + s * 0.29, y + s * 0.25, x + s * 0.29, y + s * 0.75);
    doc.line(x + s * 0.29, y + s * 0.25, x + s * 0.54, y + s * 0.25);
    doc.line(x + s * 0.54, y + s * 0.25, x + s * 0.73, y + s * 0.42);
    doc.line(x + s * 0.73, y + s * 0.42, x + s * 0.54, y + s * 0.60);
    doc.line(x + s * 0.54, y + s * 0.60, x + s * 0.40, y + s * 0.60);

    doc.setFillColor(...accent);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(s * 0.025);
    const diamond = [
      [x + s * 0.50, y + s * 0.36],
      [x + s * 0.62, y + s * 0.48],
      [x + s * 0.50, y + s * 0.60],
      [x + s * 0.38, y + s * 0.48],
    ];
    doc.lines(diamond.slice(1).map((point, index) => [point[0] - diamond[index][0], point[1] - diamond[index][1]]), diamond[0][0], diamond[0][1], [1, 1], 'FD', true);

    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(s * 0.035);
    doc.line(x + s * 0.39, y + s * 0.48, x + s * 0.67, y + s * 0.48);

    doc.setFillColor(179, 107, 30);
    doc.circle(x + s * 0.29, y + s * 0.25, s * 0.045, 'F');
    doc.circle(x + s * 0.29, y + s * 0.75, s * 0.045, 'F');
  };

  const footer = () => {
    doc.setDrawColor(...line);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    drawPilotProcessLogo(margin, pageHeight - 11.5, 5);
    setText(8, 'normal', muted);
    const projectTitle = cleanPdfText(data.projectName);
    const footerLabel = projectTitle ? `PilotProcess - ${projectTitle}` : 'PilotProcess';
    const maxFooterWidth = pageWidth - margin * 2 - 18;
    let footerText = footerLabel;
    while (doc.getTextWidth(footerText) > maxFooterWidth && footerText.length > 24) {
      footerText = `${footerText.slice(0, -4).trim()}...`;
    }
    doc.text(footerText, margin + 7, pageHeight - 8);
    doc.text(String(page), pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  const newPage = () => {
    footer();
    doc.addPage();
    page += 1;
    y = margin;
  };

  const ensureSpace = (height) => {
    if (y + height > pageHeight - 18) newPage();
  };

  const sectionTitle = (title) => {
    ensureSpace(18);
    y += y === margin ? 0 : 5;
    doc.setFillColor(...ink);
    doc.rect(margin, y, 2, 9, 'F');
    setText(15, 'bold', ink);
    doc.text(title, margin + 5, y + 7);
    y += 14;
  };

  const stepPage = (title) => {
    newPage();
    sectionTitle(title);
  };

  const subTitle = (title) => {
    ensureSpace(22);
    y += y === margin ? 0 : 8;
    setText(10, 'bold', muted);
    doc.text(title.toUpperCase(), margin, y);
    doc.setDrawColor(...line);
    doc.line(margin, y + 3, pageWidth - margin, y + 3);
    y += 13;
  };

  const drawField = (x, startY, width, label, value, compact = false) => {
    const text = cleanPdfText(value);
    if (!text) return 0;
    const paddingX = 3.5;
    const bodySize = compact ? 8.4 : 8.8;
    setText(bodySize, 'normal', ink);
    const lines = doc.splitTextToSize(text, width - paddingX * 2);
    const height = Math.max(compact ? 17 : 20, 10 + lines.length * 4.5);
    doc.setFillColor(...soft);
    doc.setDrawColor(...line);
    doc.roundedRect(x, startY, width, height, 1.5, 1.5, 'FD');
    setText(7.5, 'bold', muted);
    doc.text(cleanPdfText(label).toUpperCase(), x + paddingX, startY + 5);
    setText(bodySize, 'normal', ink);
    doc.text(lines, x + paddingX, startY + 11, { maxWidth: width - paddingX * 2 });
    return height;
  };

  const field = (label, value) => {
    const text = cleanPdfText(value);
    if (!text) return;
    setText(8.8, 'normal', ink);
    const lines = doc.splitTextToSize(text, contentWidth - 7);
    const height = Math.max(20, 10 + lines.length * 4.5);
    ensureSpace(height + 4);
    drawField(margin, y, contentWidth, label, text);
    y += height + 4;
  };

  const fieldGrid = (items) => {
    const fields = items.map(([label, value]) => [label, cleanPdfText(value)]).filter(([, value]) => value);
    const colGap = 4;
    const colWidth = (contentWidth - colGap) / 2;
    let pending = null;

    const flushPending = () => {
      if (!pending) return;
      setText(8.4, 'normal', ink);
      const lines = doc.splitTextToSize(pending[1], colWidth - 7);
      const height = Math.max(17, 10 + lines.length * 4.5);
      ensureSpace(height + 4);
      drawField(margin, y, colWidth, pending[0], pending[1], true);
      y += height + 4;
      pending = null;
    };

    fields.forEach(([label, value]) => {
      const isLong = value.length > 105;
      if (isLong) {
        flushPending();
        field(label, value);
        return;
      }
      if (!pending) {
        pending = [label, value];
        return;
      }
      setText(8.4, 'normal', ink);
      const leftLines = doc.splitTextToSize(pending[1], colWidth - 7);
      const rightLines = doc.splitTextToSize(value, colWidth - 7);
      const rowHeight = Math.max(17, 10 + Math.max(leftLines.length, rightLines.length) * 4.5);
      ensureSpace(rowHeight + 4);
      drawField(margin, y, colWidth, pending[0], pending[1], true);
      drawField(margin + colWidth + colGap, y, colWidth, label, value, true);
      y += rowHeight + 4;
      pending = null;
    });
    flushPending();
  };

  const summaryCards = (items) => {
    const cards = items.filter(item => cleanPdfText(item.value));
    if (!cards.length) return;
    const gap = 4;
    const cardWidth = (contentWidth - gap * 3) / 4;
    const cardHeight = 23;
    ensureSpace(cardHeight + 8);
    cards.slice(0, 4).forEach((item, index) => {
      const x = margin + index * (cardWidth + gap);
      doc.setFillColor(index === 0 ? 238 : 255, index === 0 ? 243 : 255, index === 0 ? 247 : 255);
      doc.setDrawColor(...line);
      doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');
      setText(6.8, 'bold', muted);
      doc.text(cleanPdfText(item.label).toUpperCase(), x + 3, y + 6);
      setText(item.large ? 13 : 10.5, 'bold', item.accent ? accent : ink);
      doc.text(doc.splitTextToSize(cleanPdfText(item.value), cardWidth - 6), x + 3, y + 15, { maxWidth: cardWidth - 6 });
    });
    y += cardHeight + 8;
  };

  const executiveField = (label, value, options = {}) => {
    const text = cleanPdfText(value);
    if (!text) return;
    const width = options.width || contentWidth;
    const x = options.x || margin;
    const bodySize = options.small ? 8 : 8.6;
    setText(bodySize, 'normal', ink);
    const lines = doc.splitTextToSize(text, width - 8);
    const height = Math.max(22, 13 + lines.length * 4.2);
    ensureSpace(height + 5);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...line);
    doc.roundedRect(x, y, width, height, 1.5, 1.5, 'FD');
    doc.setFillColor(...(options.warning ? [250, 238, 218] : [231, 237, 244]));
    doc.roundedRect(x + 0.8, y + 0.8, 2.4, height - 1.6, 0.8, 0.8, 'F');
    setText(7.2, 'bold', muted);
    doc.text(cleanPdfText(label).toUpperCase(), x + 6, y + 6);
    setText(bodySize, 'normal', ink);
    doc.text(lines, x + 6, y + 13, { maxWidth: width - 9 });
    y += height + 5;
  };

  const drawIshikawa = (branches, problem) => {
    const entries = Object.entries(branches || {})
      .map(([label, causes]) => [label, (causes || []).filter(Boolean)])
      .filter(([, causes]) => causes.length > 0);
    if (!entries.length) return;

    const maxBranches = entries.slice(0, 5);
    const gap = 3;
    const colWidth = (contentWidth - gap * (maxBranches.length - 1)) / maxBranches.length;
    const columnHeights = maxBranches.map(([, causes]) => {
      const lines = causes.slice(0, 4).flatMap(cause => doc.splitTextToSize(`- ${cleanPdfText(cause)}`, colWidth - 4));
      return Math.max(34, 18 + lines.length * 3.8);
    });
    const chartHeight = Math.max(60, Math.max(...columnHeights) + 24);
    ensureSpace(chartHeight + 12);
    subTitle('Ishikawa - causes racines');

    const headerY = y + 5;
    const effectW = 35;
    const effectH = 10;
    const effectX = pageWidth - margin - effectW;
    const lineY = headerY + 7;

    setText(6.8, 'bold', muted);
    doc.text('CAUSES', margin, lineY + 1);
    doc.setDrawColor(...ink);
    doc.setLineWidth(0.45);
    doc.line(margin + 14, lineY, effectX - 4, lineY);

    doc.setFillColor(...ink);
    doc.roundedRect(effectX, headerY + 2, effectW, effectH, 1.5, 1.5, 'F');
    setText(6.5, 'bold', [255, 255, 255]);
    doc.text('EFFET / PROBLEME', effectX + 4, headerY + 8);

    const columnsY = headerY + 18;
    maxBranches.forEach(([label, causes], index) => {
      const x = margin + index * (colWidth + gap);
      const causeLines = causes.slice(0, 4).flatMap(cause => doc.splitTextToSize(`- ${cleanPdfText(cause)}`, colWidth - 4));

      doc.setDrawColor(...accent);
      doc.setLineWidth(0.65);
      doc.line(x, columnsY, x + colWidth, columnsY);
      doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 252 : 250, index % 2 === 0 ? 246 : 252);
      doc.setDrawColor(...line);
      doc.rect(x, columnsY + 2, colWidth, columnHeights[index], 'FD');
      setText(6.7, 'bold', muted);
      doc.text(cleanPdfText(label).toUpperCase(), x + 2, columnsY + 8);
      setText(6.7, 'normal', ink);
      doc.text(causeLines.slice(0, 8), x + 2, columnsY + 15, { maxWidth: colWidth - 4 });
    });

    const problemText = cleanPdfText(problem || 'Probleme analyse');
    if (problemText) {
      const problemY = columnsY + Math.max(...columnHeights) + 8;
      setText(7, 'bold', muted);
      doc.text('Effet / probleme :', margin, problemY);
      setText(7.4, 'bold', ink);
      doc.text(doc.splitTextToSize(problemText, contentWidth - 35), margin + 25, problemY, { maxWidth: contentWidth - 35 });
    }

    y += chartHeight + 10;
  };

  const drawFiveWhy = (analysis) => {
    const problem = cleanPdfText(analysis?.probleme);
    const whys = [1, 2, 3, 4, 5].map(index => cleanPdfText(analysis?.[`why${index}`])).filter(Boolean);
    const rootCause = cleanPdfText(analysis?.causeRacine);
    const action = cleanPdfText(analysis?.action);
    if (!problem && !whys.length && !rootCause && !action) return;

    subTitle('5 pourquoi - analyse causale');

    if (problem) {
      setText(8.2, 'normal', ink);
      const lines = doc.splitTextToSize(problem, contentWidth - 42);
      const height = Math.max(16, 8 + lines.length * 4);
      ensureSpace(height + 4);
      doc.setFillColor(238, 243, 247);
      doc.setDrawColor(...line);
      doc.roundedRect(margin, y, contentWidth, height, 1.5, 1.5, 'FD');
      doc.setFillColor(...accent);
      doc.rect(margin, y, 2.5, height, 'F');
      setText(7.2, 'bold', muted);
      doc.text('EFFET / PROBLEME', margin + 5, y + 6);
      setText(8.2, 'bold', ink);
      doc.text(lines, margin + 37, y + 6, { maxWidth: contentWidth - 42 });
      y += height + 4;
    }

    whys.forEach((why, index) => {
      setText(8, 'normal', ink);
      const lines = doc.splitTextToSize(why, contentWidth - 24);
      const height = Math.max(11, 5 + lines.length * 4);
      ensureSpace(height + 2.5);
      doc.setFillColor(index % 2 === 0 ? 255 : 245, index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 251);
      doc.setDrawColor(...line);
      doc.rect(margin, y, contentWidth, height, 'FD');
      doc.setFillColor(...ink);
      doc.rect(margin, y, 10, height, 'F');
      setText(7.4, 'bold', [255, 255, 255]);
      doc.text(`P${index + 1}`, margin + 3, y + 6.2);
      setText(8, 'normal', ink);
      doc.text(lines, margin + 14, y + 6.2, { maxWidth: contentWidth - 24 });
      y += height;
    });
    y += 5;

    fieldGrid([
      ['Cause racine', rootCause],
      ['Action corrective', action],
    ]);
  };

  const table = (title, columns, rows = []) => {
    const visibleRows = (rows || []).filter(Boolean);
    if (!visibleRows.length) return;
    subTitle(title);
    const gap = 1;
    const colWidth = (contentWidth - gap * (columns.length - 1)) / columns.length;
    const widths = columns.map(col => col.width ? contentWidth * col.width : colWidth);
    const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    const ratio = totalWidth > contentWidth ? contentWidth / totalWidth : 1;
    const finalWidths = widths.map(width => width * ratio);

    const drawTableHeader = () => {
      ensureSpace(18);
      doc.setFillColor(...ink);
      doc.rect(margin, y, contentWidth, 8, 'F');
      let headerX = margin;
      setText(7.2, 'bold', [255, 255, 255]);
      columns.forEach((col, index) => {
        doc.text(cleanPdfText(col.label).toUpperCase(), headerX + 2, y + 5.2, { maxWidth: finalWidths[index] - 4 });
        headerX += finalWidths[index];
      });
      y += 8;
    };

    drawTableHeader();

    visibleRows.forEach((row, rowIndex) => {
      setText(8, 'normal', ink);
      const cells = columns.map((col, index) => {
        const raw = col.render ? col.render(row) : row[col.key];
        return doc.splitTextToSize(cleanPdfText(raw) || '-', finalWidths[index] - 4);
      });
      const rowHeight = Math.max(9, ...cells.map(lines => lines.length * 3.9 + 5));
      if (y + rowHeight > pageHeight - 18) {
        newPage();
        drawTableHeader();
      }
      doc.setFillColor(rowIndex % 2 === 0 ? 255 : 245, rowIndex % 2 === 0 ? 255 : 248, rowIndex % 2 === 0 ? 255 : 251);
      doc.setDrawColor(...line);
      doc.rect(margin, y, contentWidth, rowHeight, 'FD');
      let x = margin;
      setText(8, 'normal', ink);
      cells.forEach((lines, index) => {
        doc.text(lines, x + 2, y + 5.2, { maxWidth: finalWidths[index] - 4 });
        x += finalWidths[index];
      });
      y += rowHeight;
    });
    y += 4;
  };

  const charte = data.step1?.charte || {};
  const raciRoles = data.step1?.raci?.roles || [];
  const raciRows = (data.step1?.raci?.activites || []).map(activity => ({
    ...activity,
    ...raciRoles.reduce((acc, role) => ({ ...acc, [role]: activity.assign?.[role] || '-' }), {}),
  }));
  const totalTrait = (data.step3?.vsm || []).reduce((sum, row) => sum + (Number(row.tempsTraitement) || 0), 0);
  const totalAttente = (data.step3?.vsm || []).reduce((sum, row) => sum + (Number(row.tempsAttente) || 0), 0);
  const leadTime = totalTrait + totalAttente;
  const vaPct = leadTime > 0 ? Math.round((totalTrait / leadTime) * 1000) / 10 : 0;
  const bc = data.step6?.businessCase || {};
  const ishikawa = data.step4?.ishikawa || {};
  const fiveWhy = data.step4?.fivewhy || {};
  const progressPct = Math.round((validatedCount / 9) * 100);
  const activeActions = (data.step5?.actions || []).filter(action => cleanPdfText(action.action));
  const openActions = activeActions.filter(action => !/termin/i.test(cleanPdfText(action.statut))).length;
  const painPoints = (data.step3?.flow || []).filter(step => step.painpoint).length;
  const projectStart = charte.dateDebut || data.step0?.planning?.[0]?.debut || '-';
  const projectEnd = charte.dateFin || data.step0?.planning?.slice(-1)?.[0]?.fin || '-';

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  doc.setFillColor(...ink);
  doc.rect(0, 0, pageWidth, 44, 'F');
  doc.setFillColor(...accent);
  doc.rect(0, 44, pageWidth, 2, 'F');
  const coverLogoSize = 16;
  drawPilotProcessLogo(pageWidth - margin - coverLogoSize, 12, coverLogoSize);
  setText(9, 'bold', [222, 231, 243]);
  doc.text('PILOTPROCESS', margin, 18);
  setText(24, 'bold', [255, 255, 255]);
  const coverTitleWidth = contentWidth - coverLogoSize - 18;
  const coverTitle = doc.splitTextToSize(cleanPdfText(data.projectName || 'Projet d amelioration'), coverTitleWidth);
  doc.text(coverTitle, margin, 28, { maxWidth: coverTitleWidth });
  y = Math.max(58, 28 + coverTitle.length * 8 + 10);

  setText(9, 'bold', muted);
  doc.text('SYNTHESE EXECUTIVE', margin, y);
  doc.setDrawColor(...line);
  doc.line(margin, y + 4, pageWidth - margin, y + 4);
  y += 12;

  summaryCards([
    { label: 'Avancement', value: `${progressPct}%`, large: true, accent: true },
    { label: 'Etapes validees', value: `${validatedCount}/9` },
    { label: 'Actions ouvertes', value: String(openActions) },
    { label: 'Points de douleur', value: String(painPoints) },
  ]);

  fieldGrid([
    ['Solution', 'PilotProcess'],
    ['Date du dossier', new Date().toLocaleDateString('fr-FR')],
    ['Debut projet', projectStart],
    ['Fin cible', projectEnd],
  ]);

  executiveField('Contexte et probleme traite', charte.probleme || data.step0?.note);
  executiveField('Objectifs attendus', charte.objectifs);
  executiveField('Gains attendus', charte.gains || (bc.gains ? `${bc.gains} EUR` : ''));
  executiveField('Risques de pilotage', charte.risques || bc.risques, { warning: true });

  stepPage('00 - Preparer');
  field('Note de cadrage initiale', data.step0?.note);
  table('Planning macro', [
    { key: 'phase', label: 'Phase' },
    { key: 'debut', label: 'Debut' },
    { key: 'fin', label: 'Fin' },
    { key: 'responsable', label: 'Responsable' },
  ], data.step0?.planning);
  table('Parties prenantes', [
    { key: 'nom', label: 'Nom' },
    { key: 'role', label: 'Role' },
    { key: 'service', label: 'Service' },
    { key: 'interet', label: 'Position' },
    { key: 'influence', label: 'Influence' },
  ], data.step0?.parties);

  stepPage('01 - Cadrer');
  fieldGrid([
    ['Titre du projet', charte.titre],
    ['Sponsor', charte.sponsor],
    ['Perimetre inclus', charte.perimetreIn],
    ['Perimetre exclu', charte.perimetreOut],
    ['Contraintes', charte.contraintes],
    ['Budget estime', charte.budget],
    ['Date de debut', charte.dateDebut],
    ['Date de fin cible', charte.dateFin],
  ]);
  table('SIPOC', [
    { key: 'supplier', label: 'Fournisseurs' },
    { key: 'input', label: 'Entrees' },
    { key: 'process', label: 'Processus' },
    { key: 'output', label: 'Sorties' },
    { key: 'customer', label: 'Clients' },
  ], data.step1?.sipoc);
  table('RACI', [{ key: 'nom', label: 'Activite', width: 0.32 }, ...raciRoles.map(role => ({ key: role, label: role }))], raciRows);

  stepPage('02 - Observer');
  table('Guide d entretien', [{ key: 'question', label: 'Question' }], data.step2?.questions);
  table('Journal d observation', [
    { key: 'date', label: 'Date' },
    { key: 'lieu', label: 'Lieu' },
    { key: 'observateur', label: 'Observateur' },
    { key: 'type', label: 'Type' },
    { key: 'constat', label: 'Constat', width: 0.34 },
  ], data.step2?.journal);

  stepPage('03 - Cartographier');
  table('Referentiel de processus', [
    { key: 'processus', label: 'Processus' },
    { key: 'macro', label: 'Macro' },
    { key: 'niveau', label: 'Niveau' },
    { key: 'proprietaire', label: 'Proprietaire' },
    { key: 'systeme', label: 'Systeme' },
  ], data.step3?.referentiel);
  table('Cartographie AS-IS', [
    { key: 'label', label: 'Etape' },
    { key: 'type', label: 'Type' },
    { key: 'acteur', label: 'Acteur' },
    { key: 'systeme', label: 'Systeme' },
    { key: 'painpoint', label: 'Douleur', render: row => row.painpoint ? 'Oui' : '-' },
  ], data.step3?.flow);
  table('VSM', [
    { key: 'etape', label: 'Etape' },
    { key: 'tempsTraitement', label: 'Traitement min' },
    { key: 'tempsAttente', label: 'Attente min' },
  ], data.step3?.vsm);
  field('Lead time total', `${leadTime} min`);
  field('Pourcentage valeur ajoutee', `${vaPct}%`);

  stepPage('04 - Analyser');
  table('Pareto des causes', [
    { key: 'cause', label: 'Cause' },
    { key: 'occurrences', label: 'Occurrences' },
  ], data.step4?.pareto);
  drawIshikawa(ishikawa, fiveWhy.probleme || charte.probleme || data.projectName);
  drawFiveWhy(fiveWhy);
  table('AMDEC', [
    { key: 'mode', label: 'Mode de defaillance' },
    { key: 'effet', label: 'Effet' },
    { key: 'cause', label: 'Cause' },
    { key: 'crit', label: 'Criticite', render: row => (Number(row.F) || 0) * (Number(row.G) || 0) * (Number(row.D) || 0) },
    { key: 'actions', label: 'Actions' },
  ], data.step4?.amdec);

  stepPage('05 - Prioriser');
  table('Backlog d actions', [
    { key: 'action', label: 'Action', width: 0.32 },
    { key: 'impact', label: 'Impact' },
    { key: 'effort', label: 'Effort' },
    { key: 'responsable', label: 'Responsable' },
    { key: 'echeance', label: 'Echeance' },
    { key: 'statut', label: 'Statut' },
  ], data.step5?.actions);

  stepPage('06 - Concevoir');
  table('Cartographie cible TO-BE', [
    { key: 'label', label: 'Etape' },
    { key: 'type', label: 'Type' },
    { key: 'acteur', label: 'Acteur' },
    { key: 'systeme', label: 'Systeme' },
  ], data.step6?.flow);
  fieldGrid([
    ['Gains annuels estimes', bc.gains ? `${bc.gains} EUR` : ''],
    ['Cout d investissement', bc.couts ? `${bc.couts} EUR` : ''],
    ['Retour sur investissement', roiText(bc)],
    ['Risques', bc.risques],
  ]);
  table('Feuille de route', [
    { key: 'phase', label: 'Phase' },
    { key: 'debut', label: 'Debut' },
    { key: 'fin', label: 'Fin' },
    { key: 'responsable', label: 'Responsable' },
    { key: 'livrable', label: 'Livrable' },
  ], data.step6?.roadmap);

  stepPage('07 - Deployer');
  table('Plan d action', [
    { key: 'action', label: 'Action', width: 0.34 },
    { key: 'responsable', label: 'Responsable' },
    { key: 'echeance', label: 'Echeance' },
    { key: 'statut', label: 'Statut' },
  ], data.step7?.plan);
  table('Conduite du changement', [
    { key: 'item', label: 'Element' },
    { key: 'done', label: 'Fait', render: row => row.done ? 'Oui' : 'Non' },
  ], data.step7?.changement);
  field('PV de recette', data.step7?.recette);

  stepPage('08 - Controler');
  table('KPI', [
    { key: 'nom', label: 'KPI' },
    { key: 'unite', label: 'Unite' },
    { key: 'cible', label: 'Cible' },
    { key: 'actuel', label: 'Actuel' },
    { key: 'frequence', label: 'Frequence' },
  ], data.step8?.kpis);
  table('Rituels de pilotage', [
    { key: 'nom', label: 'Rituel' },
    { key: 'frequence', label: 'Frequence' },
    { key: 'participants', label: 'Participants' },
    { key: 'objet', label: 'Objet' },
  ], data.step8?.rituels);
  table('Plan de controle', [
    { key: 'point', label: 'Point de controle' },
    { key: 'frequence', label: 'Frequence' },
    { key: 'responsable', label: 'Responsable' },
    { key: 'seuil', label: 'Seuil d alerte' },
  ], data.step8?.controle);
  field('REX', data.step8?.rex);

  footer();
  doc.save(`${slugFileName(data.projectName, 'dossier-pilotprocess')}-dossier.pdf`);
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
      <p className="print-subtitle">PilotProcess — dossier de synthèse — {new Date().toLocaleDateString('fr-FR')}</p>

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
  const initialHistoryState = typeof window !== 'undefined' ? window.history.state : null;
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(initialHistoryState?.view === 'project' ? initialHistoryState.projectId : null);
  const [view, setView] = useState(initialHistoryState?.view || 'landing');
  const [projectQuery, setProjectQuery] = useState('');
  const [projectView, setProjectView] = useState('cards');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [storageMode, setStorageMode] = useState(isSupabaseConfigured() ? 'cloud' : 'local');
  const [syncError, setSyncError] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [authSession, setAuthSession] = useState(null);
  const [authMode, setAuthMode] = useState('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const knownProjectIdsRef = useRef(new Set());
  const deletedProjectIdsRef = useRef(new Set());
  const data = projects.find(p => p._projectId === activeProjectId) || projects[0] || createBlankProject();

  useEffect(() => {
    const validViews = new Set(['landing', 'auth', 'dashboard', 'project']);
    if (!window.history.state?.view) {
      window.history.replaceState({ view: 'landing', projectId: null }, '', window.location.href);
    }

    const onPopState = (event) => {
      const state = event.state || { view: 'landing', projectId: null };
      const nextView = validViews.has(state.view) ? state.view : 'landing';
      setView(nextView);
      setActiveProjectId(nextView === 'project' ? state.projectId : null);
      if (nextView !== 'project') setActive(0);
      scrollAppToTop();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextView, projectId = null, replace = false) => {
    const publicViews = new Set(['landing', 'auth']);
    if (!publicViews.has(nextView) && !authSession) {
      setAuthMessage('Connectez-vous pour acceder a votre espace.');
      setAuthMode('signin');
      nextView = 'auth';
      projectId = null;
      replace = true;
    }
    const state = { view: nextView, projectId: nextView === 'project' ? projectId : null };
    if (replace) {
      window.history.replaceState(state, '', window.location.href);
    } else {
      window.history.pushState(state, '', window.location.href);
    }
    setView(nextView);
    setActiveProjectId(state.projectId);
    if (nextView !== 'project') setActive(0);
    scrollAppToTop();
  }, [authSession]);

  const openAuth = useCallback((mode = 'signin') => {
    setAuthMode(mode);
    setAuthMessage('');
    navigate('auth', null);
  }, [navigate]);

  useEffect(() => {
    (async () => {
      const session = await getCurrentSession();
      setAuthSession(session);
      setAuthReady(true);
    })();
  }, []);

  useEffect(() => {
    if (authReady && !authSession && view !== 'landing' && view !== 'auth') {
      navigate('auth', null, true);
    }
  }, [authReady, authSession, view, navigate]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthMessage('');
    try {
      const action = authMode === 'signup' ? signUpWithEmail : signInWithEmail;
      const session = await action(authEmail.trim(), authPassword);
      if (session?.access_token) {
        setAuthSession(session);
        setAuthPassword('');
        setAuthMessage('Compte connecte.');
        window.history.replaceState({ view: 'dashboard', projectId: null }, '', window.location.href);
        setView('dashboard');
        setActiveProjectId(null);
        setActive(0);
        scrollAppToTop();
      } else {
        setAuthMessage('Compte cree. Verifiez votre email si une confirmation est demandee.');
      }
    } catch (error) {
      setAuthMessage(error.message || 'Connexion impossible.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleOAuthSignIn = (provider) => {
    setAuthBusy(true);
    setAuthMessage('');
    try {
      signInWithOAuth(provider);
    } catch (error) {
      setAuthBusy(false);
      setAuthMessage(error.message || 'Connexion impossible.');
    }
  };

  const handleSignOut = async () => {
    await signOutFromSupabase(authSession);
    setAuthSession(null);
    setProjects([]);
    setActiveProjectId(null);
    setActive(0);
    setStorageMode('local');
    setSyncError('');
    navigate('landing', null, true);
  };

  useEffect(() => {
    if (!authReady) return;
    (async () => {
      setLoaded(false);
      let localProjects = [];
      deletedProjectIdsRef.current = new Set();
      const storageKey = localProjectsKey(authSession);
      try {
        const savedProjects = window.localStorage.getItem(storageKey);
        if (savedProjects) {
          const parsed = JSON.parse(savedProjects);
          const parsedProjects = Array.isArray(parsed) ? parsed : [createProject()];
          localProjects = ensureExampleProjects(parsedProjects);
        } else if (!authSession) {
          const legacy = window.localStorage.getItem('lean-projet-data');
          localProjects = ensureExampleProjects([createBlankProject(legacy ? JSON.parse(legacy) : undefined)]);
        }
      } catch (e) { /* pas de projet sauvegarde */ }

      try {
        const cloudProjects = await loadProjectsFromSupabase(authSession);
        if (authSession && cloudProjects?.length) {
          cloudProjects.filter(isExampleProject).forEach(project => deletedProjectIdsRef.current.add(project._projectId));
        }
        const nextProjects = cloudProjects?.length
          ? ensureExampleProjects(cloudProjects)
          : (authSession ? [] : localProjects);
        knownProjectIdsRef.current = new Set(nextProjects.map(project => project._projectId));
        setProjects(nextProjects);
        setStorageMode(isSupabaseConfigured() && authSession ? 'cloud' : 'local');
        setSyncError('');
      } catch (error) {
        console.warn('Supabase indisponible, stockage local utilise', error);
        const nextProjects = localProjects.length ? localProjects : [];
        knownProjectIdsRef.current = new Set(nextProjects.map(project => project._projectId));
        setProjects(nextProjects);
        setStorageMode('local');
        setSyncError('Supabase indisponible');
      }
      setLoaded(true);
    })();
  }, [authReady, authSession]);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(async () => {
      try {
        window.localStorage.setItem(localProjectsKey(authSession), JSON.stringify(projects));
        if (isSupabaseConfigured() && authSession) {
          const currentIds = new Set(projects.map(project => project._projectId));
          const deletedIds = [
            ...new Set([
              ...deletedProjectIdsRef.current,
              ...[...knownProjectIdsRef.current].filter(id => !currentIds.has(id)),
            ]),
          ];
          await saveProjectsToSupabase(projects, deletedIds, authSession);
          knownProjectIdsRef.current = currentIds;
          deletedProjectIdsRef.current = new Set();
          setStorageMode('cloud');
          setSyncError('');
        } else {
          setStorageMode('local');
        }
        setSavedAt(new Date());
      } catch (e) {
        console.error('Erreur de sauvegarde', e);
        setStorageMode('local');
        setSyncError('Sauvegarde cloud impossible');
      }
    }, 600);
    return () => clearTimeout(t);
  }, [projects, loaded, authSession]);

  const updateField = useCallback((path, value) => {
    setProjects(prev => prev.map(project => {
      if (project._projectId !== activeProjectId) return project;
      const next = _.cloneDeep(project);
      _.set(next, path, value);
      next.updatedAt = new Date().toISOString();
      return next;
    }));
  }, [activeProjectId]);
  const addRow = useCallback((path, template) => {
    setProjects(prev => prev.map(project => {
      if (project._projectId !== activeProjectId) return project;
      const next = _.cloneDeep(project);
      const arr = _.get(next, path) || [];
      arr.push({ ...template, _id: uid() });
      _.set(next, path, arr);
      next.updatedAt = new Date().toISOString();
      return next;
    }));
  }, [activeProjectId]);
  const removeRow = useCallback((path, index) => {
    setProjects(prev => prev.map(project => {
      if (project._projectId !== activeProjectId) return project;
      const next = _.cloneDeep(project);
      const arr = _.get(next, path) || [];
      arr.splice(index, 1);
      _.set(next, path, arr);
      next.updatedAt = new Date().toISOString();
      return next;
    }));
  }, [activeProjectId]);
  const toggleValidated = (id) => updateField(`validated.${id}`, !data.validated[id]);
  const validatedCount = Object.values(data.validated || {}).filter(Boolean).length;
  const progressPct = Math.round((validatedCount / STEPS.length) * 100);

  const resetAll = () => {
    if (window.confirm('Réinitialiser toutes les données du projet ? Cette action est irréversible.')) {
      setProjects(prev => prev.map(project => project._projectId === activeProjectId ? createBlankProject({ _projectId: activeProjectId }) : project));
    }
  };
  const exportPdf = async () => {
    try {
      const jsPDF = await loadJsPdf();
      generateProjectPdf(jsPDF, data, validatedCount);
    } catch (error) {
      console.error('Erreur export PDF', error);
      window.alert("Le PDF n'a pas pu etre genere. Verifiez votre connexion puis reessayez.");
    }
  };
  const openProject = (id) => {
    if (!authSession) {
      navigate('landing', null, true);
      return;
    }
    setActive(0);
    navigate('project', id);
  };
  const goToStep = useCallback((stepId) => {
    setActive(stepId);
    scrollAppToTop();
  }, []);
  const createNewProject = () => {
    if (!authSession) {
      setAuthMessage('Connectez-vous pour creer un projet.');
      setAuthMode('signin');
      navigate('auth', null, true);
      return;
    }
    const project = createBlankProject({
      projectName: `Nouveau projet d'amélioration ${projects.length + 1}`,
      validated: {},
    });
    setProjects(prev => [project, ...prev]);
    openProject(project._projectId);
  };
  const createDmaicExampleProject = () => {
    if (!authSession) {
      setAuthMessage('Connectez-vous pour creer un projet exemple.');
      setAuthMode('signin');
      navigate('auth', null, true);
      return;
    }
    const project = createDmaicComplaintExample();
    setProjects(prev => [project, ...prev]);
    setActive(DMAIC_TAB.id);
    navigate('project', project._projectId);
  };
  const deleteProject = (project) => {
    const name = project.projectName || 'ce projet';
    if (!window.confirm(`Supprimer définitivement "${name}" ?`)) return;
    deletedProjectIdsRef.current.add(project._projectId);
    setProjects(prev => prev.filter(item => item._projectId !== project._projectId));
    if (activeProjectId === project._projectId) {
      navigate('dashboard');
    }
  };
  const filteredProjects = projects.filter(project => (project.projectName || '').toLowerCase().includes(projectQuery.toLowerCase()));
  const incompleteProjects = projects.filter(project => projectProgress(project) < STEPS.length).length;
  const completedProjects = projects.filter(project => projectProgress(project) === STEPS.length).length;
  const averageProgress = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + projectProgress(project), 0) / (projects.length * STEPS.length) * 100)
    : 0;
  const appClass = 'lean-app theme-light';
  const activeToolMeta = active === ADVANCED_BPMN_TAB.id ? ADVANCED_BPMN_TAB : (active === DMAIC_TAB.id ? DMAIC_TAB : null);
  const activeMeta = activeToolMeta || STEPS[active] || STEPS[0];
  const ActiveIcon = activeMeta.icon || GitBranch;
  const userEmail = authSession?.user?.email;

  const authPanel = (compact = false) => (
    <div className={`auth-panel ${compact ? 'compact' : ''} ${userEmail ? 'is-connected' : ''}`}>
      {userEmail ? (
        <>
          <div className="auth-copy">
            <span>Session active</span>
            <strong>{userEmail}</strong>
          </div>
          <button type="button" onClick={handleSignOut}><LogOut size={15} /> Deconnexion</button>
        </>
      ) : (
        <form onSubmit={handleAuthSubmit}>
          <div className="auth-copy">
            <span>Acces securise</span>
            <strong>{authMode === 'signup' ? 'Creer votre espace' : 'Se connecter a PilotProcess'}</strong>
          </div>
          <div className="auth-fields">
            <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email professionnel" required />
            <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Mot de passe" minLength={6} required />
          </div>
          <button className="auth-submit" type="submit" disabled={authBusy}>{authBusy ? 'Patientez...' : (authMode === 'signup' ? 'Creer mon espace' : 'Entrer')}</button>
          <button className="auth-switch" type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setAuthMessage(''); }}>
            {authMode === 'signup' ? 'J?ai deja un compte' : 'Creer un compte'}
          </button>
          {authMessage && <p>{authMessage}</p>}
        </form>
      )}
    </div>
  );

  const landingAuthActions = (
    <div className="landing-auth-actions">
      {userEmail ? (
        <>
          <button className="auth-nav-button" type="button" onClick={() => navigate('dashboard')}>Tableau de bord</button>
          <button className="auth-nav-button ghost" type="button" onClick={handleSignOut}><LogOut size={15} /> Deconnexion</button>
        </>
      ) : (
        <>
          <button className="auth-nav-button ghost" type="button" onClick={() => openAuth('signin')}>Se connecter</button>
          <button className="auth-nav-button primary" type="button" onClick={() => openAuth('signup')}>Creer un compte</button>
        </>
      )}
    </div>
  );

  const logoutButton = (placement = 'header') => (
    <button className={`logout-button ${placement}`} type="button" onClick={handleSignOut}>
      <LogOut size={16} /> Deconnexion
    </button>
  );

  const charteFields = [
    ['titre', 'Titre du projet'], ['sponsor', 'Sponsor'], ['probleme', 'Problème initial'],
    ['objectifs', 'Objectifs (SMART)'], ['perimetreIn', 'Périmètre inclus'], ['perimetreOut', 'Périmètre exclu'],
    ['contraintes', 'Contraintes'], ['risques', 'Risques principaux'], ['budget', 'Budget estimé'],
    ['dateDebut', 'Date de début'], ['dateFin', 'Date de fin cible'], ['gains', 'Gains attendus'],
  ];

  const renderDmaicPhase = (code, title, description, children) => (
    <section className="dmaic-phase">
      <div className="dmaic-phase-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span>{code}</span>
      </div>
      <div className="dmaic-phase-body">{children}</div>
    </section>
  );

  function renderStep() {
    const dmaic = data.dmaic || {};
    const dmaicDefine = dmaic.define || {};
    const dmaicMeasure = dmaic.measure || {};
    const dmaicAnalyze = dmaic.analyze || {};
    const dmaicImprove = dmaic.improve || {};
    const dmaicControl = dmaic.control || {};
    const dmaicFactors = getDmaicFactors(dmaicMeasure.labels || {}, dmaicMeasure.factors || []);
    const measureDataColumns = [
      { key: 'date', label: 'Date / ordre (chronologie)' },
      { key: 'valeur', label: `${dmaicMeasure.labels?.y || 'Resultat mesure Y'} (a ameliorer)`, type: 'number' },
      { key: 'segment', label: `${dmaicMeasure.labels?.segment || 'Groupe / categorie'} (pour comparer)` },
      ...dmaicFactors.map(factor => ({ key: factor.key, label: `${factor.name} (${factor.type || 'Numerique'})`, type: (factor.type || '').toLowerCase().startsWith('num') ? 'number' : 'text', getValue: row => getFactorValue(row, factor) })),
      { key: 'commentaire', label: 'Commentaire (contexte)' },
    ];
    const updateMeasureDataCell = (rowIndex, key, value) => {
      if (String(key).startsWith('factor:')) {
        const factorId = String(key).slice('factor:'.length);
        updateField(`dmaic.measure.data[${rowIndex}].factorValues.${factorId}`, value);
        const legacy = dmaicFactors.find(f => f.id === factorId)?.legacyKey;
        if (legacy) updateField(`dmaic.measure.data[${rowIndex}].${legacy}`, value);
        return;
      }
      updateField(`dmaic.measure.data[${rowIndex}].${key}`, value);
    };
    const importDmaicCsv = async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const imported = buildDmaicImport(text, dmaicMeasure.labels || {}, dmaicMeasure.factors || []);
        if (!imported.rows.length) {
          window.alert("Le fichier ne contient pas assez de lignes exploitables.");
          return;
        }
        setProjects(prev => prev.map(project => {
          if (project._projectId !== activeProjectId) return project;
          const next = _.cloneDeep(project);
          _.set(next, 'dmaic.measure.labels', imported.labels);
          _.set(next, 'dmaic.measure.factors', imported.factors);
          _.set(next, 'dmaic.measure.data', imported.rows);
          next.updatedAt = new Date().toISOString();
          return next;
        }));
      } catch (error) {
        console.error('Import DMAIC CSV impossible', error);
        window.alert("Import impossible. Verifiez que le fichier est un CSV simple avec une ligne d'en-tete.");
      }
    };

    if (active === 'dmaic') {
      return (
        <div className="dmaic-layout">
          <section className="dmaic-summary">
            {['Define', 'Measure', 'Analyze', 'Improve', 'Control'].map((phase, index) => (
              <div className="dmaic-summary-card" key={phase}>
                <span>{phase}</span>
                <strong>{index + 1}</strong>
              </div>
            ))}
          </section>

          {renderDmaicPhase('D', 'Define', 'Clarifier le probleme, la voix du client, le perimetre et la gouvernance du projet.', (
            <>
              <DmaicHint>Objectif : formuler clairement le probleme, traduire la voix du client en exigences mesurables et definir qui fait quoi dans le projet.</DmaicHint>
              <div className="dmaic-grid">
                <Field label="Probleme a resoudre (ecart observe)">
                  <textarea rows={4} value={dmaicDefine.problem || ''} onChange={e => updateField('dmaic.define.problem', e.target.value)} placeholder="Ex : variabilite elevee, delai trop long, taux de defaut important..." />
                </Field>
                <Field label="Voix du client / VOC (attentes et irritants)">
                  <textarea rows={4} value={dmaicDefine.customer || ''} onChange={e => updateField('dmaic.define.customer', e.target.value)} placeholder="Attentes, irritants, verbatims, besoins clients internes ou externes..." />
                </Field>
                <Field label="CTQ - exigences critiques qualite (ce qui doit etre mesure)">
                  <textarea rows={4} value={dmaicDefine.ctq || ''} onChange={e => updateField('dmaic.define.ctq', e.target.value)} placeholder="Delai, conformite, cout, disponibilite, exactitude, experience..." />
                </Field>
                <Field label="Objectif SMART / Y du projet (resultat chiffre vise)">
                  <textarea rows={4} value={dmaicDefine.goal || ''} onChange={e => updateField('dmaic.define.goal', e.target.value)} placeholder="Reduire le delai moyen de X a Y, atteindre Cpk cible, diminuer les defauts..." />
                </Field>
                <Field label="Perimetre inclus / exclu (ce que le projet couvre ou non)">
                  <textarea rows={4} value={dmaicDefine.scope || ''} onChange={e => updateField('dmaic.define.scope', e.target.value)} />
                </Field>
                <Field label="Equipe projet et roles (sponsor, pilote, contributeurs)">
                  <textarea rows={4} value={dmaicDefine.team || ''} onChange={e => updateField('dmaic.define.team', e.target.value)} placeholder="Sponsor, Black Belt, Green Belt, process owner, metiers, data owner..." />
                </Field>
                <Field label="Business case initial (gain attendu ou cout de non-qualite)">
                  <textarea rows={4} value={dmaicDefine.businessCase || ''} onChange={e => updateField('dmaic.define.businessCase', e.target.value)} placeholder="Enjeu financier, impact client, risque operationnel, cout de non-qualite..." />
                </Field>
              </div>
              <div className="dmaic-tool-block">
                <h3 className="dmaic-tool-title">VOC structuree <small>besoin client</small></h3>
                <DmaicHint>Transformez les phrases clients en besoins concrets, puis en CTQ mesurables. Exemple : "trop long" devient "delai de traitement inferieur a 5 jours".</DmaicHint>
                <EditableTable
                  columns={[{ key: 'client', label: 'Client / partie prenante (qui exprime le besoin)' }, { key: 'verbatim', label: 'Voix du client (phrase entendue)', type: 'textarea' }, { key: 'besoin', label: 'Besoin traduit (attente reformulee)' }, { key: 'ctq', label: 'CTQ associe (mesure critique)' }, { key: 'priorite', label: 'Priorite (importance)', type: 'select', options: ['Basse', 'Moyenne', 'Haute', 'Critique'] }]}
                  rows={dmaicDefine.voc || []}
                  onAdd={() => addRow('dmaic.define.voc', { client: '', verbatim: '', besoin: '', ctq: '', priorite: 'Moyenne' })}
                  onRemove={i => removeRow('dmaic.define.voc', i)}
                  onChange={(i, k, v) => updateField(`dmaic.define.voc[${i}].${k}`, v)}
                  addLabel="Ajouter une voix client" />
              </div>
              <div className="dmaic-tool-block">
                <h3 className="dmaic-tool-title">SIPOC DMAIC <small>macro-processus</small></h3>
                <DmaicHint>Le SIPOC sert a cadrer le processus a haut niveau : fournisseurs, entrees, grandes etapes, sorties et clients.</DmaicHint>
                <EditableTable
                  columns={[{ key: 'suppliers', label: 'Suppliers (fournisseurs)' }, { key: 'inputs', label: 'Inputs (entrees)' }, { key: 'process', label: 'Process (etapes macro)' }, { key: 'outputs', label: 'Outputs (sorties)' }, { key: 'customers', label: 'Customers (clients)' }]}
                  rows={dmaicDefine.sipoc || []}
                  onAdd={() => addRow('dmaic.define.sipoc', { suppliers: '', inputs: '', process: '', outputs: '', customers: '' })}
                  onRemove={i => removeRow('dmaic.define.sipoc', i)}
                  onChange={(i, k, v) => updateField(`dmaic.define.sipoc[${i}].${k}`, v)}
                  addLabel="Ajouter une ligne SIPOC" />
              </div>
              <div className="dmaic-tool-columns">
                <div className="dmaic-tool-block">
                  <h3 className="dmaic-tool-title">SWOT projet <small>cadrage</small></h3>
                  <DmaicHint>Identifiez ce qui aide ou menace le projet avant de lancer l'analyse detaillee.</DmaicHint>
                  <EditableTable
                    columns={[{ key: 'type', label: 'Type (force/faiblesse/opportunite/menace)', type: 'select', options: ['Force', 'Faiblesse', 'Opportunite', 'Menace'] }, { key: 'element', label: 'Element observe', type: 'textarea' }, { key: 'action', label: 'Action associee (comment en tenir compte)' }]}
                    rows={dmaicDefine.swot || []}
                    onAdd={() => addRow('dmaic.define.swot', { type: 'Force', element: '', action: '' })}
                    onRemove={i => removeRow('dmaic.define.swot', i)}
                    onChange={(i, k, v) => updateField(`dmaic.define.swot[${i}].${k}`, v)}
                    addLabel="Ajouter un element SWOT" />
                </div>
                <div className="dmaic-tool-block">
                  <h3 className="dmaic-tool-title">RACI DMAIC <small>gouvernance</small></h3>
                  <DmaicHint>R = realise, A = valide, C = consulte, I = informe. Utilisez-le pour eviter les roles flous.</DmaicHint>
                  <RaciMatrix path="dmaic.define.raci" data={dmaicDefine.raci} updateField={updateField} />
                </div>
              </div>
            </>
          ))}

          {renderDmaicPhase('M', 'Measure', 'Collecter les donnees, verifier la mesure et evaluer la performance actuelle.', (
            <>
              <DmaicHint>Objectif : construire une base de donnees simple pour mesurer le resultat Y, comparer des groupes et tester les causes possibles X.</DmaicHint>
              <Field label="Baseline / performance actuelle (situation de depart)">
                <textarea rows={4} value={dmaicMeasure.baseline || ''} onChange={e => updateField('dmaic.measure.baseline', e.target.value)} placeholder="Periode mesuree, volume analyse, moyenne actuelle, variabilite, niveau sigma si connu..." />
              </Field>
              <EditableTable
                columns={[{ key: 'nom', label: 'Mesure / KPI (ce qu on suit)' }, { key: 'definition', label: 'Definition (mode de calcul)' }, { key: 'baseline', label: 'Actuel (valeur de depart)' }, { key: 'cible', label: 'Cible (valeur visee)' }, { key: 'source', label: 'Source (outil ou fichier)' }]}
                rows={dmaicMeasure.kpis || []}
                onAdd={() => addRow('dmaic.measure.kpis', { nom: '', definition: '', baseline: '', cible: '', source: '' })}
                onRemove={i => removeRow('dmaic.measure.kpis', i)}
                onChange={(i, k, v) => updateField(`dmaic.measure.kpis[${i}].${k}`, v)}
                addLabel="Ajouter une mesure" />
              <div className="dmaic-tool-block">
                <h3 className="dmaic-tool-title">Plan de collecte <small>quoi mesurer</small></h3>
                <DmaicHint>Decrivez avant la collecte quelles donnees seront mesurees, ou les trouver, a quelle frequence et par qui. Cela evite de comparer des donnees non fiables.</DmaicHint>
                <EditableTable
                  columns={[{ key: 'mesure', label: 'Mesure (nom de la donnee)' }, { key: 'definition', label: 'Definition operationnelle (regle exacte)', type: 'textarea' }, { key: 'unite', label: 'Unite (jours, euros, %...)' }, { key: 'source', label: 'Source (SI, Excel, enquete...)' }, { key: 'frequence', label: 'Frequence (jour/semaine/mois)' }, { key: 'responsable', label: 'Responsable (collecte)' }]}
                  rows={dmaicMeasure.collectionPlan || []}
                  onAdd={() => addRow('dmaic.measure.collectionPlan', { mesure: '', definition: '', unite: '', source: '', frequence: '', responsable: '' })}
                  onRemove={i => removeRow('dmaic.measure.collectionPlan', i)}
                  onChange={(i, k, v) => updateField(`dmaic.measure.collectionPlan[${i}].${k}`, v)}
                  addLabel="Ajouter une collecte" />
              </div>
              <div className="dmaic-tool-block">
                <h3 className="dmaic-tool-title">Donnees mesurees <small>base statistique</small></h3>
                <DmaicHint>Y est le resultat a ameliorer. Les facteurs X sont les causes possibles a tester. Vous pouvez saisir les lignes a la main ou importer un CSV avec une ligne d'en-tete.</DmaicHint>
                <div className="dmaic-import-card">
                  <div>
                    <strong>Importer une base de mesures</strong>
                    <p>Colonnes conseillees : date, Y ou delai, groupe, puis autant de facteurs X que necessaire.</p>
                  </div>
                  <label className="dmaic-import-button">
                    Importer CSV
                    <input type="file" accept=".csv,text/csv" onChange={importDmaicCsv} />
                  </label>
                </div>
                <div className="dmaic-grid">
                  <Field label="Nom de Y (resultat a ameliorer)"><input value={dmaicMeasure.labels?.y || ''} onChange={e => updateField('dmaic.measure.labels.y', e.target.value)} placeholder="Ex : Delai de traitement" /></Field>
                  <Field label="Unite de Y (comment la mesure s'exprime)"><input value={dmaicMeasure.labels?.unit || ''} onChange={e => updateField('dmaic.measure.labels.unit', e.target.value)} placeholder="Ex : jours, minutes, euros, %, defauts..." /></Field>
                  <Field label="Sens souhaite (comment juger l'amelioration)">
                    <select value={dmaicMeasure.labels?.direction || 'Reduire'} onChange={e => updateField('dmaic.measure.labels.direction', e.target.value)}>
                      <option>Reduire</option>
                      <option>Augmenter</option>
                      <option>Respecter une cible</option>
                    </select>
                  </Field>
                  <Field label="Objectif cible (phrase claire pour le projet)"><input value={dmaicMeasure.labels?.objective || ''} onChange={e => updateField('dmaic.measure.labels.objective', e.target.value)} placeholder="Ex : passer de 18 jours a moins de 8 jours en 3 mois" /></Field>
                  <Field label="Nom du groupe / categorie"><input value={dmaicMeasure.labels?.segment || ''} onChange={e => updateField('dmaic.measure.labels.segment', e.target.value)} placeholder="Ex : Canal d'entree, equipe, site..." /></Field>
                  <Field label="LSL - limite basse (minimum acceptable)"><input type="number" value={dmaicMeasure.spec?.lsl || ''} onChange={e => updateField('dmaic.measure.spec.lsl', e.target.value)} /></Field>
                  <Field label="USL - limite haute (maximum acceptable)"><input type="number" value={dmaicMeasure.spec?.usl || ''} onChange={e => updateField('dmaic.measure.spec.usl', e.target.value)} /></Field>
                  <Field label="Cible / target (valeur ideale visee)"><input type="number" value={dmaicMeasure.spec?.target || ''} onChange={e => updateField('dmaic.measure.spec.target', e.target.value)} /></Field>
                  <Field label="MSA / fiabilite mesure (qualite de la donnee)"><input value={dmaicMeasure.msa || ''} onChange={e => updateField('dmaic.measure.msa', e.target.value)} placeholder="Gage R&R, extraction controlee, source fiable..." /></Field>
                </div>
                <div className="dmaic-tool-block">
                  <h3 className="dmaic-tool-title">Facteurs X a tester <small>causes potentielles</small></h3>
                  <DmaicHint>Ajoutez ici toutes les causes possibles a analyser. Choisissez Numerique pour une mesure chiffre, Categorie pour un groupe comme canal, site, equipe ou type de reclamation.</DmaicHint>
                  <EditableTable
                    columns={[
                      { key: 'name', label: 'Nom du facteur X' },
                      { key: 'type', label: 'Type de donnee', type: 'select', options: ['Numerique', 'Categorie'] },
                      { key: 'description', label: 'Definition / hypothese', type: 'textarea' },
                    ]}
                    rows={dmaicMeasure.factors || []}
                    onAdd={() => addRow('dmaic.measure.factors', { name: '', type: 'Numerique', description: '' })}
                    onRemove={i => removeRow('dmaic.measure.factors', i)}
                    onChange={(i, k, v) => updateField(`dmaic.measure.factors[${i}].${k}`, v)}
                    addLabel="Ajouter un facteur X" />
                </div>
                <EditableTable
                  columns={measureDataColumns}
                  rows={dmaicMeasure.data || []}
                  onAdd={() => addRow('dmaic.measure.data', { date: '', valeur: '', segment: '', facteurA: '', facteurB: '', factorValues: {}, commentaire: '' })}
                  onRemove={i => removeRow('dmaic.measure.data', i)}
                  onChange={updateMeasureDataCell}
                  addLabel="Ajouter une mesure observee" />
                <DmaicStatsPanel rows={dmaicMeasure.data || []} spec={dmaicMeasure.spec || {}} labels={dmaicMeasure.labels || {}} factors={dmaicMeasure.factors || []} />
                <DmaicTestLogic rows={dmaicMeasure.data || []} labels={dmaicMeasure.labels || {}} factors={dmaicMeasure.factors || []} />
              </div>
              <div className="dmaic-tool-columns">
                <Field label="Test de normalite / QQ plot (forme de distribution)"><textarea rows={4} value={dmaicMeasure.normality || ''} onChange={e => updateField('dmaic.measure.normality', e.target.value)} placeholder="Normalite plausible ? outliers ? transformation necessaire ?" /></Field>
                <Field label="Conclusion capabilite et cartes X/MR (decision mesure)"><textarea rows={4} value={dmaicMeasure.capabilityConclusion || ''} onChange={e => updateField('dmaic.measure.capabilityConclusion', e.target.value)} placeholder="Process capable/incapable, centre/decentre, stable/instable..." /></Field>
              </div>
            </>
          ))}

          {renderDmaicPhase('A', 'Analyze', 'Identifier, prioriser et valider statistiquement les causes racines.', (
            <>
              <DmaicHint>Objectif : passer des hypotheses aux causes validees. Les graphiques aident a prioriser, les tests statistiques a confirmer si une cause a un effet probable.</DmaicHint>
              <Field label="Constats d'analyse (ce que les donnees montrent)">
                <textarea rows={4} value={dmaicAnalyze.observations || ''} onChange={e => updateField('dmaic.analyze.observations', e.target.value)} placeholder="Ce que montrent les donnees, segments touches, ruptures, facteurs suspects..." />
              </Field>
              <EditableTable
                columns={[{ key: 'cause', label: 'Cause potentielle (hypothese)' }, { key: 'preuve', label: 'Preuve / donnee (fait observe)' }, { key: 'impact', label: 'Impact (effet estime)' }, { key: 'validation', label: 'Validee ? (decision)', type: 'select', options: ['A confirmer', 'Oui', 'Non'] }]}
                rows={dmaicAnalyze.causes || []}
                onAdd={() => addRow('dmaic.analyze.causes', { cause: '', preuve: '', impact: '', validation: 'A confirmer' })}
                onRemove={i => removeRow('dmaic.analyze.causes', i)}
                onChange={(i, k, v) => updateField(`dmaic.analyze.causes[${i}].${k}`, v)}
                addLabel="Ajouter une cause" />
              <div className="dmaic-tool-columns">
                <div className="dmaic-tool-block">
                  <h3 className="dmaic-tool-title">Pareto des causes <small>priorisation</small></h3>
                  <DmaicHint>Classez les causes par nombre d'occurrences pour identifier les quelques causes qui expliquent la majorite du probleme.</DmaicHint>
                  <EditableTable
                    columns={[{ key: 'cause', label: 'Cause / motif' }, { key: 'occurrences', label: 'Occurrences (nombre de cas)' , type: 'number' }]}
                    rows={dmaicAnalyze.pareto || []}
                    onAdd={() => addRow('dmaic.analyze.pareto', { cause: '', occurrences: '' })}
                    onRemove={i => removeRow('dmaic.analyze.pareto', i)}
                    onChange={(i, k, v) => updateField(`dmaic.analyze.pareto[${i}].${k}`, v)}
                    addLabel="Ajouter une cause Pareto" />
                  <ParetoChart rows={dmaicAnalyze.pareto || []} />
                </div>
                <div className="dmaic-tool-block">
                  <h3 className="dmaic-tool-title">Ishikawa 5M <small>causes possibles</small></h3>
                  <DmaicHint>Structurez les causes possibles par familles : main d'oeuvre, methode, materiel, milieu, matiere.</DmaicHint>
                  <Ishikawa path="dmaic.analyze.ishikawa" data={dmaicAnalyze.ishikawa} updateField={updateField} />
                </div>
              </div>
              <div className="dmaic-tool-block">
                <h3 className="dmaic-tool-title">5 pourquoi <small>cause racine</small></h3>
                <DmaicHint>Partez du probleme observe et demandez "pourquoi ?" plusieurs fois pour remonter vers une cause actionnable.</DmaicHint>
                <FiveWhys path="dmaic.analyze.fivewhy" data={dmaicAnalyze.fivewhy} updateField={updateField} />
              </div>
              <div className="dmaic-tool-block">
                <h3 className="dmaic-tool-title">Tests statistiques <small>ANOVA / T test / Chi2</small></h3>
                <DmaicHint>L'outil choisit deja automatiquement le test selon le type de facteur X, le nombre de groupes et la normalite. Cette zone sert surtout a conserver une decision metier ou un test externe.</DmaicHint>
                <DmaicFactorDecisionTable rows={dmaicMeasure.data || []} labels={dmaicMeasure.labels || {}} factors={dmaicMeasure.factors || []} />
                <EditableTable
                  columns={[{ key: 'hypothese', label: 'Hypothese / cause testee (X influence Y ?)', type: 'textarea' }, { key: 'test', label: 'Test utilise', type: 'select', options: ['T test', 'ANOVA', 'Chi2', 'Correlation', 'Mann-Whitney', 'Kruskal-Wallis', 'Autre'] }, { key: 'pvalue', label: 'p-value (seuil 0,05)' }, { key: 'decision', label: 'Decision (effet ou non)', type: 'select', options: ['Effet significatif', 'Non significatif', 'A confirmer'] }, { key: 'commentaire', label: 'Commentaire / interpretation', type: 'textarea' }]}
                  rows={dmaicAnalyze.statTests || []}
                  onAdd={() => addRow('dmaic.analyze.statTests', { hypothese: '', test: 'T test', pvalue: '', decision: 'A confirmer', commentaire: '' })}
                  onRemove={i => removeRow('dmaic.analyze.statTests', i)}
                  onChange={(i, k, v) => updateField(`dmaic.analyze.statTests[${i}].${k}`, v)}
                  addLabel="Ajouter un test statistique" />
              </div>
              <DmaicCausePrioritization
                rows={dmaicMeasure.data || []}
                labels={dmaicMeasure.labels || {}}
                factors={dmaicMeasure.factors || []}
                pareto={dmaicAnalyze.pareto || []}
                ishikawa={dmaicAnalyze.ishikawa || {}}
                fivewhy={dmaicAnalyze.fivewhy || {}}
              />
              <div className="dmaic-tool-block">
                <h3 className="dmaic-tool-title">Regression lineaire multiple <small>facteurs X vers Y</small></h3>
                <DmaicHint>La regression cherche quels facteurs X expliquent le resultat Y. R2 indique la part expliquee ; les p-values aident a reperer les facteurs probablement significatifs.</DmaicHint>
                <AutoRegressionPanel rows={dmaicMeasure.data || []} labels={dmaicMeasure.labels || {}} factors={dmaicMeasure.factors || []} />
                <div className="dmaic-grid">
                  <Field label="Equation de regression (modele retenu)"><textarea rows={3} value={dmaicAnalyze.regression?.equation || ''} onChange={e => updateField('dmaic.analyze.regression.equation', e.target.value)} placeholder="Y = b0 + b1X1 + b2X2 + ..." /></Field>
                  <Field label="R carre / R carre ajuste (qualite du modele)"><input value={dmaicAnalyze.regression?.r2 || ''} onChange={e => updateField('dmaic.analyze.regression.r2', e.target.value)} placeholder="Ex : R2 = 0,72 ; R2 ajuste = 0,68" /></Field>
                  <Field label="Conclusion regression (facteurs a piloter)"><textarea rows={4} value={dmaicAnalyze.regression?.conclusion || ''} onChange={e => updateField('dmaic.analyze.regression.conclusion', e.target.value)} placeholder="Facteurs les plus influents, sens de l'effet, limites du modele..." /></Field>
                </div>
              </div>
            </>
          ))}

          {renderDmaicPhase('I', 'Improve', 'Concevoir, prioriser, tester et securiser les solutions.', (
            <>
              <DmaicHint>Objectif : transformer les causes validees en solutions, prioriser les actions puis tester avant de generaliser.</DmaicHint>
              <Field label="Processus cible / amelioration visee (solution globale)">
                <textarea rows={4} value={dmaicImprove.target || ''} onChange={e => updateField('dmaic.improve.target', e.target.value)} placeholder="Decrire le fonctionnement cible, le pilote, le standard et le resultat attendu..." />
              </Field>
              <EditableTable
                columns={[{ key: 'solution', label: 'Solution proposee' }, { key: 'impact', label: 'Impact attendu (gain)' }, { key: 'effort', label: 'Effort (complexite)', type: 'select', options: ['Faible', 'Moyen', 'Eleve'] }, { key: 'responsable', label: 'Responsable' }, { key: 'statut', label: 'Statut (avancement)', type: 'select', options: ['A faire', 'En cours', 'Testee', 'Deployee'] }]}
                rows={dmaicImprove.solutions || []}
                onAdd={() => addRow('dmaic.improve.solutions', { solution: '', impact: '', effort: 'Moyen', responsable: '', statut: 'A faire' })}
                onRemove={i => removeRow('dmaic.improve.solutions', i)}
                onChange={(i, k, v) => updateField(`dmaic.improve.solutions[${i}].${k}`, v)}
                addLabel="Ajouter une solution" />
              <div className="dmaic-tool-block">
                <h3 className="dmaic-tool-title">Matrice impact / effort <small>priorisation</small></h3>
                <DmaicHint>Notez impact et effort de 0 a 10. Les actions a fort impact et faible effort sont les quick wins.</DmaicHint>
                <EditableTable
                  columns={[{ key: 'action', label: 'Action a evaluer' }, { key: 'impact', label: 'Impact 0-10 (benefice)' , type: 'number', min: 0, max: 10 }, { key: 'effort', label: 'Effort 0-10 (difficulte)' , type: 'number', min: 0, max: 10 }, { key: 'gain', label: 'Gain attendu' }, { key: 'risque', label: 'Risque / contrainte' }]}
                  rows={dmaicImprove.impactEffort || []}
                  onAdd={() => addRow('dmaic.improve.impactEffort', { action: '', impact: '', effort: '', gain: '', risque: '' })}
                  onRemove={i => removeRow('dmaic.improve.impactEffort', i)}
                  onChange={(i, k, v) => updateField(`dmaic.improve.impactEffort[${i}].${k}`, v)}
                  addLabel="Ajouter une action a prioriser" />
                <ImpactEffortChart rows={dmaicImprove.impactEffort || []} />
              </div>
              <div className="dmaic-tool-block">
                <h3 className="dmaic-tool-title">Plan d'action DMAIC <small>execution</small></h3>
                <DmaicHint>Listez les actions retenues, leur responsable, leur date cible et la preuve attendue de realisation.</DmaicHint>
                <EditableTable
                  columns={[{ key: 'action', label: 'Action retenue' }, { key: 'responsable', label: 'Responsable' }, { key: 'debut', label: 'Debut prevu' }, { key: 'fin', label: 'Fin cible' }, { key: 'statut', label: 'Statut', type: 'select', options: ['A faire', 'En cours', 'Bloque', 'Termine'] }, { key: 'preuve', label: 'Preuve / livrable attendu' }]}
                  rows={dmaicImprove.actionPlan || []}
                  onAdd={() => addRow('dmaic.improve.actionPlan', { action: '', responsable: '', debut: '', fin: '', statut: 'A faire', preuve: '' })}
                  onRemove={i => removeRow('dmaic.improve.actionPlan', i)}
                  onChange={(i, k, v) => updateField(`dmaic.improve.actionPlan[${i}].${k}`, v)}
                  addLabel="Ajouter une action" />
              </div>
              <div className="dmaic-tool-columns">
                <Field label="Resultats du pilote / test solution (preuve avant deploiement)"><textarea rows={4} value={dmaicImprove.pilot || ''} onChange={e => updateField('dmaic.improve.pilot', e.target.value)} placeholder="Population pilote, gains observes, feedback terrain, ecarts residuels..." /></Field>
                <Field label="Risques de deploiement et parades (securisation)"><textarea rows={4} value={dmaicImprove.riskMitigation || ''} onChange={e => updateField('dmaic.improve.riskMitigation', e.target.value)} placeholder="Risques, contraintes, conduite du changement, rollback, communication..." /></Field>
              </div>
            </>
          ))}

          {renderDmaicPhase('C', 'Control', 'Perenniser les gains, surveiller les KPI et installer le plan de reaction.', (
            <>
              <DmaicHint>Objectif : eviter le retour a l'ancien fonctionnement avec des standards, des KPI, des seuils d'alerte et des reactions prevues.</DmaicHint>
              <Field label="Standard cible / regles de maintien (nouvelle facon de travailler)">
                <textarea rows={4} value={dmaicControl.standard || ''} onChange={e => updateField('dmaic.control.standard', e.target.value)} placeholder="Standard operationnel, gouvernance, formation, documentation, regles d'escalade..." />
              </Field>
              <EditableTable
                columns={[{ key: 'controle', label: 'Point de controle (ce qu on surveille)' }, { key: 'frequence', label: 'Frequence (quand)' }, { key: 'responsable', label: 'Responsable (qui surveille)' }, { key: 'seuil', label: "Seuil d'alerte (limite a ne pas depasser)" }, { key: 'reaction', label: 'Reaction attendue (quoi faire)' }]}
                rows={dmaicControl.plan || []}
                onAdd={() => addRow('dmaic.control.plan', { controle: '', frequence: '', responsable: '', seuil: '', reaction: '' })}
                onRemove={i => removeRow('dmaic.control.plan', i)}
                onChange={(i, k, v) => updateField(`dmaic.control.plan[${i}].${k}`, v)}
                addLabel="Ajouter un controle" />
              <div className="dmaic-tool-block">
                <h3 className="dmaic-tool-title">KPI de controle <small>surveillance</small></h3>
                <DmaicHint>Suivez peu de KPI, mais utiles : resultat Y, stabilite du processus, respect du standard et gains obtenus.</DmaicHint>
                <EditableTable
                  columns={[{ key: 'nom', label: 'KPI (indicateur)' }, { key: 'unite', label: 'Unite' }, { key: 'cible', label: 'Cible' }, { key: 'actuel', label: 'Actuel' }, { key: 'frequence', label: 'Frequence de suivi' }, { key: 'owner', label: 'Owner (responsable)' }]}
                  rows={dmaicControl.kpis || []}
                  onAdd={() => addRow('dmaic.control.kpis', { nom: '', unite: '', cible: '', actuel: '', frequence: '', owner: '' })}
                  onRemove={i => removeRow('dmaic.control.kpis', i)}
                  onChange={(i, k, v) => updateField(`dmaic.control.kpis[${i}].${k}`, v)}
                  addLabel="Ajouter un KPI" />
                <div className="kpi-grid">{(dmaicControl.kpis || []).map(k => <KpiCard key={k._id} k={k} />)}</div>
              </div>
              <div className="dmaic-tool-columns">
                <Field label="Plan de reaction (si derive ou alerte)"><textarea rows={4} value={dmaicControl.reactionPlan || ''} onChange={e => updateField('dmaic.control.reactionPlan', e.target.value)} placeholder="Que fait-on si le KPI sort du seuil ? Qui decide ? Sous quel delai ?" /></Field>
                <Field label="Business impact (gains constates)"><textarea rows={4} value={dmaicControl.businessImpact || ''} onChange={e => updateField('dmaic.control.businessImpact', e.target.value)} placeholder="Gains financiers, reduction defauts, satisfaction client, temps gagne, risque reduit..." /></Field>
              </div>
              <Field label="Conclusion DMAIC (bilan final et suite)">
                <textarea rows={5} value={dmaicControl.conclusion || ''} onChange={e => updateField('dmaic.control.conclusion', e.target.value)} placeholder="Conclusion finale, gains obtenus, limites, prochaines opportunites d'amelioration..." />
              </Field>
              <DmaicReportReadiness define={dmaicDefine} measure={dmaicMeasure} analyze={dmaicAnalyze} improve={dmaicImprove} control={dmaicControl} />
            </>
          ))}
        </div>
      );
    }

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
      case 'bpmn':
        return (
          <BpmnAdvancedEditor
            key={data._projectId}
            value={data.bpmnXml}
            viewbox={data.bpmnViewbox}
            projectName={data.projectName}
            layoutKey={sidebarCollapsed ? 'collapsed' : 'expanded'}
            onChange={(xml) => updateField('bpmnXml', xml)}
            onViewboxChange={(viewbox) => updateField('bpmnViewbox', viewbox)}
          />
        );
      case 'dmaic':
        return (
          <div className="dmaic-layout">
            {renderDmaicPhase('D', 'Define', 'Clarifier le problème, le client, le périmètre et l’objectif Six Sigma.', (
              <div className="dmaic-grid">
                <Field label="Problème à résoudre">
                  <textarea rows={4} value={dmaicDefine.problem || ''} onChange={e => updateField('dmaic.define.problem', e.target.value)} placeholder="Ex : taux d’erreur élevé, délai trop long, variabilité importante..." />
                </Field>
                <Field label="Client / bénéficiaire du processus">
                  <textarea rows={4} value={dmaicDefine.customer || ''} onChange={e => updateField('dmaic.define.customer', e.target.value)} placeholder="Client final, équipe interne, fournisseur, service concerné..." />
                </Field>
                <Field label="CTQ - exigences critiques qualité">
                  <textarea rows={4} value={dmaicDefine.ctq || ''} onChange={e => updateField('dmaic.define.ctq', e.target.value)} placeholder="Ce qui est critique pour le client : délai, conformité, exactitude, simplicité..." />
                </Field>
                <Field label="Objectif chiffré DMAIC">
                  <textarea rows={4} value={dmaicDefine.goal || ''} onChange={e => updateField('dmaic.define.goal', e.target.value)} placeholder="Réduire X de A à B avant telle date..." />
                </Field>
                <Field label="Périmètre inclus / exclu">
                  <textarea rows={4} value={dmaicDefine.scope || ''} onChange={e => updateField('dmaic.define.scope', e.target.value)} />
                </Field>
                <Field label="Équipe projet et rôles">
                  <textarea rows={4} value={dmaicDefine.team || ''} onChange={e => updateField('dmaic.define.team', e.target.value)} placeholder="Sponsor, Black Belt, Green Belt, process owner, contributeurs..." />
                </Field>
              </div>
            ))}

            {renderDmaicPhase('M', 'Measure', 'Mesurer la performance actuelle et sécuriser les données de référence.', (
              <>
                <Field label="Baseline / performance actuelle">
                  <textarea rows={4} value={dmaicMeasure.baseline || ''} onChange={e => updateField('dmaic.measure.baseline', e.target.value)} placeholder="Données actuelles, période mesurée, volume analysé, niveau de sigma si connu..." />
                </Field>
                <EditableTable
                  columns={[{ key: 'nom', label: 'Mesure / KPI' }, { key: 'definition', label: 'Définition' }, { key: 'baseline', label: 'Actuel' }, { key: 'cible', label: 'Cible' }, { key: 'source', label: 'Source' }]}
                  rows={dmaicMeasure.kpis || []}
                  onAdd={() => addRow('dmaic.measure.kpis', { nom: '', definition: '', baseline: '', cible: '', source: '' })}
                  onRemove={i => removeRow('dmaic.measure.kpis', i)}
                  onChange={(i, k, v) => updateField(`dmaic.measure.kpis[${i}].${k}`, v)}
                  addLabel="Ajouter une mesure" />
              </>
            ))}

            {renderDmaicPhase('A', 'Analyze', 'Identifier les causes racines de la variabilité et des défauts.', (
              <>
                <Field label="Constats d’analyse">
                  <textarea rows={4} value={dmaicAnalyze.observations || ''} onChange={e => updateField('dmaic.analyze.observations', e.target.value)} placeholder="Ce que montrent les données, écarts majeurs, segments les plus touchés..." />
                </Field>
                <EditableTable
                  columns={[{ key: 'cause', label: 'Cause potentielle' }, { key: 'preuve', label: 'Preuve / donnée' }, { key: 'impact', label: 'Impact' }, { key: 'validation', label: 'Validée ?', type: 'select', options: ['À confirmer', 'Oui', 'Non'] }]}
                  rows={dmaicAnalyze.causes || []}
                  onAdd={() => addRow('dmaic.analyze.causes', { cause: '', preuve: '', impact: '', validation: 'À confirmer' })}
                  onRemove={i => removeRow('dmaic.analyze.causes', i)}
                  onChange={(i, k, v) => updateField(`dmaic.analyze.causes[${i}].${k}`, v)}
                  addLabel="Ajouter une cause" />
              </>
            ))}

            {renderDmaicPhase('I', 'Improve', 'Concevoir, tester et prioriser les solutions d’amélioration.', (
              <>
                <Field label="Processus cible / amélioration visée">
                  <textarea rows={4} value={dmaicImprove.target || ''} onChange={e => updateField('dmaic.improve.target', e.target.value)} placeholder="Décrire le fonctionnement cible, le pilote et le résultat attendu..." />
                </Field>
                <EditableTable
                  columns={[{ key: 'solution', label: 'Solution' }, { key: 'impact', label: 'Impact attendu' }, { key: 'effort', label: 'Effort', type: 'select', options: ['Faible', 'Moyen', 'Élevé'] }, { key: 'responsable', label: 'Responsable' }, { key: 'statut', label: 'Statut', type: 'select', options: ['À faire', 'En cours', 'Testée', 'Déployée'] }]}
                  rows={dmaicImprove.solutions || []}
                  onAdd={() => addRow('dmaic.improve.solutions', { solution: '', impact: '', effort: 'Moyen', responsable: '', statut: 'À faire' })}
                  onRemove={i => removeRow('dmaic.improve.solutions', i)}
                  onChange={(i, k, v) => updateField(`dmaic.improve.solutions[${i}].${k}`, v)}
                  addLabel="Ajouter une solution" />
              </>
            ))}

            {renderDmaicPhase('C', 'Control', 'Pérenniser les gains et éviter le retour à l’ancien fonctionnement.', (
              <>
                <Field label="Standard cible / règles de maintien">
                  <textarea rows={4} value={dmaicControl.standard || ''} onChange={e => updateField('dmaic.control.standard', e.target.value)} placeholder="Standard opérationnel, gouvernance, formation, documentation, règles d’escalade..." />
                </Field>
                <EditableTable
                  columns={[{ key: 'controle', label: 'Point de contrôle' }, { key: 'frequence', label: 'Fréquence' }, { key: 'responsable', label: 'Responsable' }, { key: 'seuil', label: "Seuil d'alerte" }, { key: 'reaction', label: 'Réaction attendue' }]}
                  rows={dmaicControl.plan || []}
                  onAdd={() => addRow('dmaic.control.plan', { controle: '', frequence: '', responsable: '', seuil: '', reaction: '' })}
                  onRemove={i => removeRow('dmaic.control.plan', i)}
                  onChange={(i, k, v) => updateField(`dmaic.control.plan[${i}].${k}`, v)}
                  addLabel="Ajouter un contrôle" />
              </>
            ))}
          </div>
        );
      default: return null;
    }
  }

  if (view === 'auth') {
    return (
      <div className={`${appClass} auth-mode`}>
        <style>{CSS}</style>
        <div className="landing-background" aria-hidden="true">
          <span className="landing-flowline one" />
          <span className="landing-flowline two" />
          <span className="landing-flowline three" />
          <span className="landing-node n1" />
          <span className="landing-node n2" />
          <span className="landing-node n3" />
          <span className="landing-card-ghost g1" />
          <span className="landing-card-ghost g2" />
          <span className="landing-loop" />
        </div>
        <main className="auth-page">
          <nav className="auth-page-nav">
            <button className="auth-back-button" type="button" onClick={() => navigate('landing')}>
              <ArrowLeft size={17} /> Retour
            </button>
          </nav>
          <section className="auth-shell" aria-label={authMode === 'signup' ? 'Creation de compte' : 'Connexion'}>
            <div className="auth-brand-block">
              <img src="/pilotprocess-logo.svg" alt="" />
              <span>PilotProcess</span>
            </div>
            <div className="auth-heading">
              <span>Acces securise</span>
              <h1>{authMode === 'signup' ? 'Creer votre compte' : 'Se connecter'}</h1>
              <p>{authMode === 'signup'
                ? 'Creez votre espace pour sauvegarder vos projets et les retrouver sur tous vos appareils.'
                : 'Connectez-vous pour acceder a votre tableau de bord et a vos projets sauvegardes.'}</p>
            </div>
            {userEmail ? (
              <div className="auth-connected-card">
                <span>Session active</span>
                <strong>{userEmail}</strong>
                <button type="button" onClick={() => navigate('dashboard')}>Ouvrir le tableau de bord</button>
              </div>
            ) : (
              <form className="auth-page-card" onSubmit={handleAuthSubmit}>
                <label>
                  E-mail
                  <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="votre@email.com" required />
                </label>
                <label>
                  Mot de passe
                  <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Minimum 6 caracteres" minLength={6} required />
                </label>
                <button className="auth-page-submit" type="submit" disabled={authBusy}>
                  {authBusy ? 'Verification...' : (authMode === 'signup' ? 'Creer mon compte' : 'Se connecter')}
                </button>
                <div className="auth-page-divider"><span>ou</span></div>
                <div className="auth-social-actions">
                  <button className="auth-social-button" type="button" onClick={() => handleOAuthSignIn('google')} disabled={authBusy}>
                    <span className="auth-provider-mark google" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h6.5c-.3 1.4-1.1 2.7-2.3 3.5v2.9h3.7c2.2-2 3.6-5 3.6-8.4Z" />
                        <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.1-4.2 1.1-3.1 0-5.7-2.1-6.7-4.9H1.5v3C3.5 21.3 7.5 24 12 24Z" />
                        <path fill="#FBBC05" d="M5.3 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4v-3H1.5C.5 8.2 0 10.1 0 12s.5 3.8 1.5 5.4l3.8-3Z" />
                        <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.3-3.3C17.9 1.2 15.2 0 12 0 7.5 0 3.5 2.7 1.5 6.6l3.8 3C6.3 6.9 8.9 4.8 12 4.8Z" />
                      </svg>
                    </span>
                    Continuer avec Google
                  </button>
                </div>
                <button className="auth-page-switch" type="button" onClick={() => { setAuthMode(authMode === 'signup' ? 'signin' : 'signup'); setAuthMessage(''); }}>
                  {authMode === 'signup' ? 'J ai deja un compte' : 'Creer un compte'}
                </button>
                {authMessage && <p className="auth-page-message">{authMessage}</p>}
              </form>
            )}
          </section>
        </main>
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <div className={`${appClass} landing-mode`}>
        <style>{CSS}</style>
        <div className="landing-background" aria-hidden="true">
          <span className="landing-flowline one" />
          <span className="landing-flowline two" />
          <span className="landing-flowline three" />
          <span className="landing-node n1" />
          <span className="landing-node n2" />
          <span className="landing-node n3" />
          <span className="landing-card-ghost g1" />
          <span className="landing-card-ghost g2" />
          <span className="landing-loop" />
        </div>
        <main className="landing-page">
          <nav className="landing-nav">
            <div className="landing-brand">
              <img src="/pilotprocess-logo.svg" alt="" />
              <span>PilotProcess</span>
            </div>
            {landingAuthActions}
          </nav>

          <section className="landing-hero">
            <div className="landing-copy">
              <div className="landing-kicker">Pilotage des démarches d'amélioration</div>
              <h1>Structurez vos projets processus de bout en bout.</h1>
              <p>Pilotez vos projets d'amélioration de processus avec une méthode structurée, des livrables prêts à remplir et un suivi clair de bout en bout.</p>
              <div className="landing-method-strip" aria-label="Méthode PilotProcess">
                <span>9 étapes structurées</span>
                <span>Livrables guidés</span>
                <span>Suivi par projet</span>
              </div>
              <div className="landing-trust-note">Vos projets sont sauvegardés dans votre espace sécurisé.</div>
              <div className="landing-actions">
                <button className="landing-primary" onClick={() => authSession ? navigate('dashboard') : openAuth('signin')}>Accéder au tableau de bord <ChevronRight size={17} /></button>
                <button className="landing-secondary" onClick={createNewProject}><Plus size={16} /> Créer un projet</button>
              </div>
            </div>

            <div className="landing-panel" aria-label="Aperçu du tableau de bord">
              <div className="landing-panel-head">
                <span>Exemple de portefeuille projet</span>
              </div>
              <div className="landing-panel-metrics">
                <div><span>Total projets</span><strong>12</strong></div>
                <div><span>À finaliser</span><strong>5</strong></div>
                <div><span>Avancement</span><strong>78%</strong></div>
              </div>
              <div className="landing-panel-progress" aria-label="Avancement global exemple 78%">
                <div className="landing-panel-progress-bar"><span /></div>
                <small>Vision consolidée des projets en cours, terminés et à prioriser.</small>
              </div>
              <div className="landing-mini-list">
                <div>
                  <span>Réduction des délais de traitement</span>
                  <em className="in-progress">En cours</em>
                </div>
                <div>
                  <span>Standardisation d’un flux opérationnel</span>
                  <em className="done">Terminé</em>
                </div>
                <div>
                  <span>Amélioration de la qualité de service</span>
                  <em className="in-progress">En cours</em>
                </div>
                <div>
                  <span>Digitalisation du suivi terrain</span>
                  <em className="done">Terminé</em>
                </div>
              </div>
            </div>
          </section>

          <section className="landing-sectors" aria-label="Secteurs couverts">
            <div>
              <span>Services</span>
              <p>Parcours client, réclamations, délais de traitement, qualité de service.</p>
            </div>
            <div>
              <span>Industrie & opérations</span>
              <p>Maintenance, flux terrain, production, logistique, qualité et performance.</p>
            </div>
            <div>
              <span>Fonctions transverses</span>
              <p>Back-office, support, conformité, IT, pilotage interne et amélioration continue.</p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (view === 'dashboard') {
    return (
      <div className={`${appClass} home-mode`}>
        <style>{CSS}</style>
        <main className="project-home">
          <header className="home-hero">
            <div>
              <button className="brand-lockup brand-home-link" onClick={() => navigate('landing')} title="Retour à l'accueil">
                <img src="/pilotprocess-logo.svg" alt="" className="brand-logo" />
                <div>
                  <div className="home-kicker">Tableau de bord</div>
                  <h1>PilotProcess</h1>
                </div>
              </button>
              <p>Un espace de pilotage clair pour cadrer, analyser, prioriser et suivre vos démarches d'amélioration de processus, quel que soit le secteur.</p>
            </div>
            <div className="home-hero-actions">
              <span>{STEPS.length} étapes structurées</span>
              {logoutButton('header')}
              <button className="home-primary home-secondary" onClick={createDmaicExampleProject}><Target size={18} /> Exemple DMAIC</button>
              <button className="home-primary" onClick={createNewProject}><Plus size={18} /> Nouveau projet</button>
            </div>
          </header>

          <section className="home-dashboard" aria-label="Synthèse du portefeuille">
            <div className="home-widget">
              <span>Total projets</span>
              <strong>{projects.length}</strong>
              <small>Portefeuille total</small>
            </div>
            <div className="home-widget warning">
              <span>À finaliser</span>
              <strong>{incompleteProjects}</strong>
              <small>Projets non validés</small>
            </div>
            <div className="home-widget success">
              <span>Terminés</span>
              <strong>{completedProjects}</strong>
              <small>Dossiers complets</small>
            </div>
            <div className="home-widget progress-widget">
              <span>Avancement moyen</span>
              <strong>{averageProgress}%</strong>
              <small>Sur les 9 étapes</small>
            </div>
          </section>

          <section className="portfolio-toolbar">
            <div>
              <span className="section-eyebrow">Portefeuille</span>
              <h2>Projets sauvegardés</h2>
            </div>
            <div className="portfolio-actions">
              <label className="home-search">
                <Search size={18} />
                <input value={projectQuery} onChange={e => setProjectQuery(e.target.value)} placeholder="Rechercher un projet par nom..." />
              </label>
              <div className="view-toggle" aria-label="Choix de vue des projets">
                <button className={projectView === 'cards' ? 'is-active' : ''} onClick={() => setProjectView('cards')} title="Vue cartes" aria-label="Vue cartes"><LayoutGrid size={15} /></button>
                <button className={projectView === 'list' ? 'is-active' : ''} onClick={() => setProjectView('list')} title="Vue liste" aria-label="Vue liste"><List size={16} /></button>
                <button className={projectView === 'compact' ? 'is-active' : ''} onClick={() => setProjectView('compact')} title="Vue compacte" aria-label="Vue compacte"><Rows3 size={16} /></button>
              </div>
            </div>
          </section>

          <section className={`project-grid view-${projectView}`}>
            {filteredProjects.map(project => {
              const done = projectProgress(project);
              const pct = Math.round((done / STEPS.length) * 100);
              return (
                <article className="project-card" key={project._projectId}>
                  <div className="project-card-top">
                    <div className="project-icon"><FolderKanban size={20} /></div>
                    <button className="delete-project" onClick={() => deleteProject(project)} title="Supprimer le projet" aria-label={`Supprimer ${project.projectName || 'ce projet'}`}>
                      <Trash2 size={15} />
                    </button>
                    <span className={pct === 100 ? 'status-badge done' : 'status-badge'}>{pct === 100 ? 'Terminé' : 'En cours'}</span>
                  </div>
                  <h2>{project.projectName || "Projet d'amélioration"}</h2>
                  <p>{project.step1?.charte?.probleme || project.step0?.note || "Projet d'amélioration à compléter."}</p>
                  <div className="project-progress">
                    <div><span style={{ width: `${pct}%` }} /></div>
                    <strong>{done}/{STEPS.length} étapes validées</strong>
                  </div>
                  <button className="open-project" onClick={() => openProject(project._projectId)}>Ouvrir le projet <ChevronRight size={16} /></button>
                </article>
              );
            })}
            {filteredProjects.length === 0 && (
              <div className="empty-projects">
                <BriefcaseBusiness size={28} />
                <h2>Aucun projet trouvé</h2>
                <p>Modifiez votre recherche ou créez un nouveau projet d'amélioration.</p>
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={`${appClass} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <style>{CSS}</style>
      <aside className="sidebar">
        <div className="sidebar-head">
          <div className="sidebar-top-actions">
            <button className="back-home" onClick={() => navigate('dashboard')} title="Retour au tableau de bord"><ArrowLeft size={15} /> <span>Dashboard</span></button>
            <button className="collapse-btn" onClick={() => setSidebarCollapsed(v => !v)} title={sidebarCollapsed ? 'Afficher la sidebar' : 'Réduire la sidebar'}>
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          <div className="sidebar-expanded-only">
            <div className="sidebar-brand">
              <img src="/pilotprocess-logo.svg" alt="" className="sidebar-logo" />
              <h1>PilotProcess</h1>
            </div>
            <input className="project-name" placeholder="Nom du projet…" value={data.projectName} onChange={e => updateField('projectName', e.target.value)} />
            <div className="progress-line"><div className="progress-fill" style={{ width: `${(validatedCount / 9) * 100}%` }} /></div>
            <div className="progress-text">{validatedCount}/9 étapes validées</div>
          </div>
        </div>
        <nav className="steps-nav">
          {STEPS.map(s => {
            const StepIcon = s.icon;
            return (
              <button key={s.id} className={`step-item ${active === s.id ? 'is-active' : ''}`} onClick={() => goToStep(s.id)}>
                <StepIcon className="step-icon" size={15} aria-hidden="true" />
                <span className="step-title">{s.title}</span>
                {data.validated[s.id] && <span className="step-stamp">✔</span>}
              </button>
            );
          })}
          <button className={`step-item advanced-step ${active === ADVANCED_BPMN_TAB.id ? 'is-active' : ''}`} onClick={() => goToStep(ADVANCED_BPMN_TAB.id)}>
            <GitBranch className="advanced-step-icon" size={16} aria-hidden="true" />
            <span className="step-title">{ADVANCED_BPMN_TAB.title}</span>
          </button>
          <button className={`step-item advanced-step ${active === DMAIC_TAB.id ? 'is-active' : ''}`} onClick={() => goToStep(DMAIC_TAB.id)}>
            <Target className="advanced-step-icon" size={16} aria-hidden="true" />
            <span className="step-title">{DMAIC_TAB.title}</span>
          </button>
        </nav>
        <div className="sidebar-foot">
          <button className="ghost-btn" onClick={exportPdf}><Download size={14} /> Télécharger le dossier PDF</button>
          <div className="pdf-hint">Génère un dossier projet structuré, prêt à partager.</div>
          {logoutButton('sidebar')}
          <button className="ghost-btn danger" onClick={resetAll}><RotateCcw size={14} /> Réinitialiser</button>
          <div className="save-indicator">
            {savedAt
              ? `${storageMode === 'cloud' ? 'Cloud' : 'Local'} sauvegarde ${savedAt.toLocaleTimeString('fr-FR')}`
              : (loaded ? 'Non enregistre' : 'Chargement...')}
            {syncError ? ` - ${syncError}` : ''}
          </div>
        </div>
      </aside>
      <main className={`main ${active === ADVANCED_BPMN_TAB.id ? 'bpmn-main' : ''}`}>
        <div className={`dossier-card ${active === ADVANCED_BPMN_TAB.id ? 'bpmn-card' : ''}`}>
          <div className="eyebrow">{activeToolMeta ? 'Outil' : `Étape ${String(active).padStart(2, '0')}`} — {activeMeta.title}</div>
          <h2 className="step-page-title"><ActiveIcon className="step-page-icon" size={24} aria-hidden="true" /> <span>{activeMeta.title}</span>{active === ADVANCED_BPMN_TAB.id && <span className="optional-badge">Optionnel</span>}{active === DMAIC_TAB.id && <span className="optional-badge">Six Sigma</span>}</h2>
          <p className="objectif"><em>Objectif</em>{activeMeta.objectif}</p>
          <p className="livrable"><em>Livrables</em>{activeMeta.livrable}</p>
          <div className="step-body">{renderStep()}</div>
          {!activeToolMeta && (
            <div className="step-actions">
              <button className="nav-btn" disabled={active === 0} onClick={() => goToStep(Math.max(0, active - 1))}><ChevronLeft size={16} /> Précédent</button>
              <button className={`validate-btn ${data.validated[active] ? 'is-validated' : ''}`} onClick={() => toggleValidated(active)}>
                {data.validated[active] ? '✔ Étape validée' : 'Marquer cette étape comme validée'}
              </button>
              <button className="nav-btn" onClick={() => goToStep(active === 8 ? ADVANCED_BPMN_TAB.id : Math.min(8, active + 1))}>Suivant <ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </main>
      <PrintSummary data={data} />
    </div>
  );
}
