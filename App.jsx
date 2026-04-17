import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Phone, MessageSquare, Mail, Plus, ChevronRight, ChevronLeft, ChevronDown,
  Search, TrendingUp, Users, Target, Sparkles, X, Clock, MapPin, Building2,
  Send, Filter, ArrowUpRight, CircleDot, UploadCloud, RefreshCw, CheckCircle2,
  AlertTriangle, FileText, Loader2, Shield, Ban, Lock, MoreVertical, History,
  Check, Calendar, User, Heart, ExternalLink, Edit3, UserPlus, ArrowRightLeft,
  Trophy, StickyNote, DollarSign, Menu, List, LayoutGrid, HelpCircle, Zap,
  BellRing, CheckSquare, Square, ArrowLeftRight, PhoneCall, Smartphone
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   ALLIANCE DASH · RECRUITING
   Full rebuild incorporating weeks 1-7 of the build plan.
   Weeks covered:
   1. Bug fixes + permissions hardening (duplicate declarations removed,
      detail data for all prospects, email signatures from primaryTitle,
      effectiveRole everywhere, mode_tag on hybrid writes)
   2. The three ops gaps (global search cmd+K, real outreach deep-links,
      mobile responsive breakpoint)
   3. Structural consolidation (tabbed Intelligence panel, proactive AI,
      simpler Field Intel, simpler detail hero)
   4. Pipeline + permission polish (table-default pipeline, exclusion reason
      hiding, onboarding first-run state)
   5. AI quality layer (real API wiring pattern, caching)
   6. Retention tab (full new tab)
   7. Nice-to-haves (websocket pattern, bulk select, time-in-stage,
      OpenPhone/Gmail integration scaffold)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────────────────────────
   USERS & CAPABILITIES — module-level constant, stable identity
   ───────────────────────────────────────────────────────────────────────── */
const USER_CAPABILITIES = {
  John:      { capabilities: ['principal'],                      primaryTitle: 'Owner · Principal',              initials: 'J',  email: 'john@c21alliance.com' },
  Chuck:     { capabilities: ['principal'],                      primaryTitle: 'Owner · Principal',              initials: 'C',  email: 'chuck@c21alliance.com' },
  'Rec. 1':  { capabilities: ['recruiter'],                      primaryTitle: 'Company Recruiter',              initials: 'R1', email: 'recruiter1@c21alliance.com' },
  'Rec. 2':  { capabilities: ['recruiter'],                      primaryTitle: 'Company Recruiter',              initials: 'R2', email: 'recruiter2@c21alliance.com' },
  Karina:    { capabilities: ['office_manager:NCM'],             primaryTitle: 'NCM Office Manager',             initials: 'K',  email: 'karina@c21alliance.com' },
  Jeff:      { capabilities: ['office_manager:OC'],              primaryTitle: 'OC Office Manager',              initials: 'J2', email: 'jeff@c21alliance.com' },
  Steve:     { capabilities: ['office_manager:WC', 'recruiter'], primaryTitle: 'WC Manager + Company Recruiter', initials: 'S',  email: 'steve@c21alliance.com' },
};

function getDisplayRole(userName) {
  const c = USER_CAPABILITIES[userName];
  if (!c) return 'OfficeManager';
  if (c.capabilities.includes('principal')) return 'Principal';
  if (c.capabilities.length > 1) return 'Hybrid';
  if (c.capabilities.includes('recruiter')) return 'Recruiter';
  return 'OfficeManager';
}

export default function AllianceRecruiting() {

  /* ─────────────────────────────────────────────────────────────────────────
     USERS & CAPABILITIES (alias for backwards compatibility)
     ───────────────────────────────────────────────────────────────────────── */
  const userCapabilities = USER_CAPABILITIES;

  /* ─────────────────────────────────────────────────────────────────────────
     STATE (consolidated, no duplicates)
     ───────────────────────────────────────────────────────────────────────── */
  const [activeUser, setActiveUser] = useState('Karina');
  const [activeMode, setActiveMode] = useState('manager'); // 'manager' | 'recruiter' — hybrid only
  const [activeView, setActiveView] = useState('actions'); // actions | pipeline | scorecard | exclusions | detail | retention
  const [activeTab, setActiveTab] = useState('recruiting'); // recruiting | retention
  const [pipelineLayout, setPipelineLayout] = useState('table'); // table | kanban (table default)
  const [rightPanelTab, setRightPanelTab] = useState('briefing'); // briefing | ai | activity | afi (consolidated Intelligence panel)
  const [detailProspectId, setDetailProspectId] = useState(null);
  const [exclusionsSubTab, setExclusionsSubTab] = useState('offices');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [tutorialTipShown, setTutorialTipShown] = useState({ claim: false, bulk: false, search: false });

  // Modal state
  const [scriptModal, setScriptModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [uploadModal, setUploadModal] = useState(false);
  const [claimModal, setClaimModal] = useState(null);
  const [passModal, setPassModal] = useState(null);
  const [logActivityModal, setLogActivityModal] = useState(null);
  const [confirmOutreachModal, setConfirmOutreachModal] = useState(null);

  // Bulk action state (Week 7)
  const [selectedProspects, setSelectedProspects] = useState(new Set());
  const [bulkActionMenu, setBulkActionMenu] = useState(false);

  // Toast / undo (Week 4 polish)
  const [toast, setToast] = useState(null);

  // Activity feed (would be websocket-driven in prod)
  const [claimNotifications, setClaimNotifications] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [automationStatus, setAutomationStatus] = useState('success');

  // Outreach integration status
  const [integrations, setIntegrations] = useState({
    gmail:     { connected: true,  account: 'karina@c21alliance.com' },
    openphone: { connected: true,  number:  '+1 (609) 555-0100' },
    calendar:  { connected: false, account: null },
  });

  /* ─────────────────────────────────────────────────────────────────────────
     DERIVED: Role resolution (no duplicates, uses capabilities cleanly)
     ───────────────────────────────────────────────────────────────────────── */
  const userCaps = userCapabilities[activeUser] || { capabilities: [], initials: '?', primaryTitle: 'User', email: '' };
  const isHybrid = userCaps.capabilities.length > 1;
  const hasRecruiterCap = userCaps.capabilities.includes('recruiter');
  const managerCap = userCaps.capabilities.find(c => c.startsWith('office_manager:'));
  const hasManagerCap = !!managerCap;
  const managerOffice = managerCap ? managerCap.split(':')[1] : null;
  const isPrincipalUser = userCaps.capabilities.includes('principal');

  const effectiveRole =
    isPrincipalUser ? 'Principal' :
    isHybrid ? (activeMode === 'recruiter' ? 'Recruiter' : 'OfficeManager') :
    hasRecruiterCap ? 'Recruiter' :
    hasManagerCap ? 'OfficeManager' :
    'OfficeManager';

  const roleBadge =
    effectiveRole === 'Principal' ? 'PRINCIPAL · OWNER' :
    effectiveRole === 'Recruiter' ? 'RECRUITER · ALL OFFICES' :
    `${managerOffice || ''} OFFICE MANAGER`;

  // Permission flags (single source of truth)
  const canSeeAllianceFinancials   = isPrincipalUser || effectiveRole === 'OfficeManager';
  const canSeeOthersCloseNumbers   = isPrincipalUser;
  const canSeePeerRankOnly         = effectiveRole === 'Recruiter';
  const canManageAllianceExclusions = isPrincipalUser;
  const canSeeExclusionReasons     = isPrincipalUser;

  // getDisplayRole is defined at module scope above — stable reference, no re-render churn

  // Mode-tagged actor string for writes (hybrid bug fix)
  const currentActorTag = isHybrid
    ? `${activeUser} (${activeMode === 'recruiter' ? 'Recruiter' : 'Manager'})`
    : activeUser;

  /* ─────────────────────────────────────────────────────────────────────────
     PROSPECTS DATA
     ───────────────────────────────────────────────────────────────────────── */
  const allProspects = [
    { id: 1,  name: 'Maria Santos',    type: 'Experienced', source: 'MarketView',         currentBrokerage: 'Keller Williams',     office: 'NCM', lastTouch: 5,  daysInStage: 12, score: 94, reason: '12 deals YTD at KW, license 9 yrs, lives in Cape May — high-match profile',       stage: 'Lead',        production: '$4.2M VOL YTD', addedBy: 'Karina',         assignedTo: 'Karina' },
    { id: 2,  name: 'Brandon Thiel',   type: 'New License', source: 'Referral (Nichole)', currentBrokerage: null,                   office: 'NCM', lastTouch: 2,  daysInStage: 4,  score: 88, reason: 'Just passed exam, Nichole knows him from Ugly Mug — warm intro ready',             stage: 'Contacted',   production: null,            addedBy: 'Karina',         assignedTo: 'Karina' },
    { id: 3,  name: 'Danielle Rivera', type: 'Experienced', source: 'Referral',           currentBrokerage: 'Coldwell Banker',      office: 'NCM', lastTouch: 8,  daysInStage: 21, score: 82, reason: 'Mentioned at Dec mastermind she is unhappy with CB splits — STALE, re-engage',      stage: 'Contacted',   production: '$2.8M VOL YTD', addedBy: 'Rec. 1',         assignedTo: 'Karina' },
    { id: 4,  name: 'Kevin Park',      type: 'Experienced', source: 'MarketView',         currentBrokerage: 'RE/MAX',               office: 'NCM', lastTouch: 1,  daysInStage: 2,  score: 79, reason: 'Listed 3 new properties this week — active producer, recently licensed in NJ',     stage: 'Lead',        production: '$1.9M VOL YTD', addedBy: 'Rec. 1',         assignedTo: 'Rec. 1' },
    { id: 5,  name: 'Ashley Brown',    type: 'New License', source: 'LinkedIn',           currentBrokerage: null,                   office: 'NCM', lastTouch: 12, daysInStage: 45, score: 71, reason: 'Career changer from hospitality — STALE, last outreach was voicemail only',         stage: 'Lead',        production: null,            addedBy: 'Karina',         assignedTo: 'Karina' },
    { id: 6,  name: 'Rachel Kim',      type: 'Experienced', source: 'MarketView',         currentBrokerage: 'Berkshire Hathaway',   office: 'OC',  lastTouch: 3,  daysInStage: 8,  score: 91, reason: 'Top producer at BH Ocean City, heard office culture shifting',                      stage: 'Meeting Set', production: '$6.1M VOL YTD', addedBy: 'Rec. 2',         assignedTo: 'Rec. 2' },
    { id: 7,  name: 'Tom Marshall',    type: 'New License', source: 'Local License Data', currentBrokerage: null,                   office: 'OC',  lastTouch: 6,  daysInStage: 9,  score: 77, reason: 'Newly licensed, Ocean City resident — no brokerage affiliation yet',               stage: 'Lead',        production: null,            addedBy: 'Jeff',           assignedTo: 'Jeff' },
    { id: 8,  name: 'Jessica Orlov',   type: 'Experienced', source: 'Referral',           currentBrokerage: 'Long & Foster',        office: 'OC',  lastTouch: 4,  daysInStage: 14, score: 85, reason: 'Chuck met her at NJAR event — expressed curiosity about C21 tech stack',            stage: 'Contacted',   production: '$3.5M VOL YTD', addedBy: 'Chuck',          assignedTo: 'Jeff' },
    { id: 9,  name: 'Patricia Shore',  type: 'Experienced', source: 'MarketView',         currentBrokerage: 'Weichert',             office: 'WC',  lastTouch: 4,  daysInStage: 5,  score: 87, reason: 'Listed 5 new properties in 7 days — production surge, ready for bigger platform',  stage: 'Lead',        production: '$3.1M VOL YTD', addedBy: 'Rec. 1',         assignedTo: 'Rec. 1' },
    { id: 10, name: 'David Chen',      type: 'Experienced', source: 'Field Intel',        currentBrokerage: 'Weichert',             office: 'SH',  lastTouch: 2,  daysInStage: 6,  score: 83, reason: 'Just moved from KW to Weichert — unsettled, prime for another move within 6 months',stage: 'Contacted',   production: '$2.2M VOL YTD', addedBy: 'Rec. 2',         assignedTo: 'Rec. 2' },
    { id: 11, name: 'Linda Fernandez', type: 'Experienced', source: 'MarketView',         currentBrokerage: 'RE/MAX',               office: 'AV',  lastTouch: 1,  daysInStage: 3,  score: 89, reason: '+52% YoY production — rising star before she gets expensive',                      stage: 'Lead',        production: '$4.8M VOL YTD', addedBy: 'Rec. 1',         assignedTo: 'Rec. 1' },
    { id: 12, name: 'Michael Tan',     type: 'New License', source: 'Field Intel',        currentBrokerage: null,                   office: 'WC',  lastTouch: 0,  daysInStage: 1,  score: 74, reason: 'License activated 4 days ago, Wildwood resident',                                    stage: 'Lead',        production: null,            addedBy: 'Steve (Recruiter)', assignedTo: 'Steve (Recruiter)' },
  ];

  /* ─────────────────────────────────────────────────────────────────────────
     PROSPECT DETAIL DATA — rich records for all prospects (Week 1 bug fix)
     ───────────────────────────────────────────────────────────────────────── */
  const prospectDetails = useMemo(() => {
    // Build a default detail record for every prospect so clicking never crashes
    const defaults = allProspects.reduce((acc, p) => {
      acc[p.id] = {
        contact: {
          phone: `(609) 555-${String(1000 + p.id).slice(-4)}`,
          email: `${p.name.toLowerCase().replace(/\s+/g, '.')}@${(p.currentBrokerage || 'newlicense').toLowerCase().replace(/[^a-z]/g, '')}.com`,
          address: `${p.office} area, NJ`,
          linkedin: `linkedin.com/in/${p.name.toLowerCase().replace(/\s+/g, '-')}`,
          licensed: 'NJ',
          licenseNumber: `RE-${1000000 + p.id * 1000}`,
        },
        production: p.production ? {
          ytd: { volume: p.production.split(' ')[0], units: Math.round(parseFloat(p.production.replace(/[^0-9.]/g, '')) * 2.5), gci: `$${Math.round(parseFloat(p.production.replace(/[^0-9.]/g, '')) * 25)}K` },
          lastYear: { volume: '—', units: '—', gci: '—' },
          trend: [1.2, 1.5, 1.8, 2.0, 2.4, 2.8, 3.2, 3.6, 4.2],
          yoyChange: '+12%',
        } : null,
        relationships: [],
        activities: [
          { id: 1, type: 'add', actor: p.addedBy, date: 'Apr 1', time: '9:00 AM', content: `Added to pipeline. Score: ${p.score}.` },
        ],
        aiBriefing: `${p.name} is at ${p.stage} stage. ${p.reason}. Last touched ${p.lastTouch} days ago.`,
        notes: [],
      };
      return acc;
    }, {});

    // Override with rich data for Maria Santos (demo prospect)
    defaults[1] = {
      contact: {
        phone: '(609) 555-0142',
        email: 'maria.santos@kw.com',
        address: '214 Washington St, Cape May, NJ 08204',
        linkedin: 'linkedin.com/in/mariasantos-kw',
        licensed: 'NJ · Since Mar 2017',
        licenseNumber: 'RE-1924785',
      },
      production: {
        ytd: { volume: '$4.2M', units: 12, gci: '$104K' },
        lastYear: { volume: '$3.1M', units: 9, gci: '$78K' },
        trend: [2.1, 2.4, 2.8, 2.6, 3.1, 3.4, 3.8, 4.0, 4.2],
        yoyChange: '+35%',
      },
      relationships: [
        { name: 'Nichole Koch', role: 'Spouse of John', context: 'Knows Maria from Ugly Mug — regular, friendly but not close. "She\'s lovely."', warmth: 'warm' },
        { name: 'Karina', role: 'NCM Office Manager', context: 'Met briefly at NJAR Cape May mixer, Feb 2025', warmth: 'cool' },
        { name: 'Chuck', role: 'Principal', context: 'Represented buyer on one of Maria\'s listings in 2024. Clean transaction.', warmth: 'neutral' },
      ],
      activities: [
        { id: 1, type: 'note',   actor: 'Karina',  date: 'Today',  time: '10:42 AM', content: 'Saw her at Cape May Coffee Roasters — said quick hi. She looked tired but was friendly.' },
        { id: 2, type: 'claim',  actor: 'Karina',  date: 'Apr 10', time: '8:15 AM',  content: 'Claimed from Rec. 1. Reason: "I have a warm intro via Nichole."' },
        { id: 3, type: 'text',   actor: 'Rec. 1',  date: 'Apr 8',  time: '2:30 PM',  content: 'Sent initial outreach text re: coffee chat. No response yet.', outcome: 'sent · no reply' },
        { id: 4, type: 'call',   actor: 'Rec. 1',  date: 'Apr 3',  time: '11:15 AM', content: 'Called mobile, went to voicemail. Left brief message about Alliance and callback number.', outcome: 'voicemail' },
        { id: 5, type: 'intel',  actor: 'Karina',  date: 'Mar 28', time: '4:50 PM',  content: 'At Dec NJAR mastermind she mentioned KW cut her marketing budget again. Frustrated but committed to finishing out listings first.', tag: 'Pain point' },
        { id: 6, type: 'add',    actor: 'Rec. 1',  date: 'Mar 25', time: '9:00 AM',  content: 'Added to pipeline from MarketView weekly pull. Score: 94. High match.' },
      ],
      aiBriefing: 'Maria went quiet after your Apr 8 outreach text — no response in 5 days. Prior intel (Mar 28): she is frustrated with KW marketing cuts but wants to finish current listings first. Lead with curiosity, not a pitch. Reference the Coffee Roasters hello from today to keep it natural. Avoid asking about splits or timeline — she\'ll raise it herself. Goal: get a 20-min coffee scheduled.',
      notes: [
        { id: 1, author: 'Karina', date: 'Apr 10', tag: 'Personal', content: 'Has a daughter at Lower Cape May Regional. Mentions her often — always ask how she\'s doing.' },
        { id: 2, author: 'Rec. 1', date: 'Mar 25', tag: 'Preferences', content: 'Prefers text over call. Works Tues/Thurs/Sat — avoid Mondays per her IG.' },
      ],
    };

    return defaults;
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
     PROSPECT FILTERING (respects role)
     ───────────────────────────────────────────────────────────────────────── */
  const visibleProspects = useMemo(() => {
    if (effectiveRole === 'OfficeManager') {
      return allProspects.filter(p => p.office === managerOffice);
    }
    return allProspects;
  }, [effectiveRole, managerOffice]);

  const staleProspects = useMemo(
    () => visibleProspects.filter(p => p.lastTouch >= 7),
    [visibleProspects]
  );
  const stuckInStage = useMemo(
    () => visibleProspects.filter(p => p.daysInStage >= 30),
    [visibleProspects]
  );

  const actionList = useMemo(() => {
    return [...visibleProspects].sort((a, b) => {
      // Week 4: better prioritization — staleness + score + stuck-in-stage
      const aScore = a.score + (a.lastTouch >= 7 ? 15 : 0) + (a.daysInStage >= 30 ? 10 : 0);
      const bScore = b.score + (b.lastTouch >= 7 ? 15 : 0) + (b.daysInStage >= 30 ? 10 : 0);
      return bScore - aScore;
    }).slice(0, 5);
  }, [visibleProspects]);

  const detailProspect = detailProspectId ? allProspects.find(p => p.id === detailProspectId) : null;
  const detail = detailProspectId ? prospectDetails[detailProspectId] : null;

  /* ─────────────────────────────────────────────────────────────────────────
     GLOBAL SEARCH (Week 2 — cmd+K)
     ───────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return visibleProspects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.currentBrokerage || '').toLowerCase().includes(q) ||
      p.office.toLowerCase().includes(q) ||
      p.reason.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery, visibleProspects]);

  /* ─────────────────────────────────────────────────────────────────────────
     TOAST / UNDO (Week 4 polish)
     ───────────────────────────────────────────────────────────────────────── */
  const showToast = useCallback((message, action = null) => {
    const id = Date.now();
    setToast({ message, action, id });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(t => (t && t.id === toast.id) ? null : t);
    }, 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ─────────────────────────────────────────────────────────────────────────
     PROACTIVE MORNING BRIEFING (Week 3 + Week 5 — AI hook pattern)
     Generated on load, cached until new activity.
     ───────────────────────────────────────────────────────────────────────── */
  const [morningBriefing, setMorningBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  const generateMorningBriefing = useCallback(async () => {
    setBriefingLoading(true);
    // In production this calls the Anthropic API:
    //   const res = await fetch('https://api.anthropic.com/v1/messages', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       model: 'claude-sonnet-4-20250514',
    //       max_tokens: 400,
    //       messages: [{ role: 'user', content: buildBriefingPrompt(activeUser, visibleProspects, staleProspects, stuckInStage) }]
    //     })
    //   });
    //   const data = await res.json();
    //   setMorningBriefing(data.content[0].text);

    // Simulated response for prototype:
    await new Promise(r => setTimeout(r, 600));
    const firstStale = staleProspects[0];
    const topAction = actionList[0];
    const brief = effectiveRole === 'Recruiter'
      ? `${activeUser} — you've got ${visibleProspects.length} active prospects across all offices. ${staleProspects.length} are stale (7+ days no touch)${firstStale ? ` — ${firstStale.name} needs re-engagement most` : ''}. Start with ${topAction?.name} today (score ${topAction?.score}).`
      : `${activeUser} — ${visibleProspects.length} prospects in your ${managerOffice || 'office'} pipeline. ${staleProspects.length} stale${firstStale ? ` (${firstStale.name} the most urgent)` : ''}. Top priority: ${topAction?.name} — ${topAction?.reason}.`;
    setMorningBriefing(brief);
    setBriefingLoading(false);
  }, [activeUser, effectiveRole, managerOffice, visibleProspects, staleProspects, actionList]);

  useEffect(() => {
    if (activeView !== 'detail' && onboardingDismissed) {
      generateMorningBriefing();
    }
  }, [activeUser, activeMode, onboardingDismissed, activeView, generateMorningBriefing]);

  /* ─────────────────────────────────────────────────────────────────────────
     OUTREACH INTEGRATIONS (Week 2 — real Gmail / OpenPhone)
     ───────────────────────────────────────────────────────────────────────── */
  const handleOutreachSend = useCallback((prospect, channel, content) => {
    const detail = prospectDetails[prospect.id];
    if (!detail) return;

    if (channel === 'email') {
      if (integrations.gmail.connected) {
        // In production: Gmail API draft + send
        // POST to /api/gmail/send with { to, subject, body, thread_id }
        const subject = content.split('\n')[0].replace('Subject: ', '');
        const body = content.split('\n').slice(2).join('\n');
        const mailto = `mailto:${detail.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto, '_blank');
      } else {
        window.open(`mailto:${detail.contact.email}`, '_blank');
      }
      setConfirmOutreachModal({ prospect, channel, content });
    } else if (channel === 'text') {
      if (integrations.openphone.connected) {
        // In production: POST to /api/openphone/send-sms with { to, body, from }
        const sms = `sms:${detail.contact.phone}?body=${encodeURIComponent(content)}`;
        window.open(sms, '_blank');
      }
      setConfirmOutreachModal({ prospect, channel, content });
    } else if (channel === 'call') {
      if (integrations.openphone.connected) {
        // In production: POST to /api/openphone/dial with { to, from }
        window.open(`tel:${detail.contact.phone}`, '_blank');
      }
      setConfirmOutreachModal({ prospect, channel, content });
    }
  }, [integrations, prospectDetails]);

  /* ─────────────────────────────────────────────────────────────────────────
     BULK ACTIONS (Week 7)
     ───────────────────────────────────────────────────────────────────────── */
  const toggleProspectSelection = useCallback((id) => {
    setSelectedProspects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedProspects(new Set()), []);

  /* ─────────────────────────────────────────────────────────────────────────
     HELPER: Script generation (uses primaryTitle for signature — Week 1 fix)
     ───────────────────────────────────────────────────────────────────────── */
  const generateScript = (prospect, channel) => {
    const isExperienced = prospect.type === 'Experienced';
    const myTitle = userCaps.primaryTitle;
    const firstName = prospect.name.split(' ')[0];

    if (channel === 'call') {
      return isExperienced
        ? `Hey ${firstName}, it's ${activeUser} over at Century 21 Alliance. Got a minute?\n\nReason I'm calling — I've been watching your production at ${prospect.currentBrokerage}, and your numbers are impressive. ${prospect.production} is no joke in this market.\n\nI'm not trying to pitch you in 30 seconds. But if you've ever wondered what a different split structure or marketing engine could do for your business, I'd love to grab 20 minutes over coffee. No pressure, no pitch deck — just a real conversation about what's working and what isn't.\n\nWhat's your schedule look like this week?`
        : `Hi ${firstName}, it's ${activeUser} at Century 21 Alliance. Hope I caught you at a good time.\n\nHeard you just got licensed — congrats, seriously. The first 90 days are the most important, and most new agents pick their brokerage wrong because nobody tells them what to ask.\n\nI'm not calling to sell you. I'm calling to invite you to an open house tour this Saturday where we walk new agents through what a real ramp-up looks like. Lunch is on us.\n\nCan I text you the details?`;
    }
    if (channel === 'text') {
      return isExperienced
        ? `Hi ${firstName} — ${activeUser} from C21 Alliance. Saw your recent activity and wanted to reach out. No pitch, just curious if you'd be open to a 20-min coffee to compare notes on the market. Your choice of spot.`
        : `Hey ${firstName}! ${activeUser} here from Century 21 Alliance. Congrats on getting licensed 🎉 We run a new-agent intro session Saturday mornings — super informal, lunch included. Want me to save you a seat this week?`;
    }
    if (channel === 'email') {
      return isExperienced
        ? `Subject: Quick question about your business at ${prospect.currentBrokerage}\n\n${firstName},\n\nI won't waste your time — I work with Century 21 Alliance (275+ agents across 8 offices on the shore). I've been watching your production, and it caught my eye.\n\nHere's what I'm not going to do: send you a generic recruiting deck or promise you the moon on splits. What I will do, if you're open to it, is show you exactly what three of our top producers had going on before they joined vs. 12 months later. Numbers, marketing spend, deal sources — the real picture.\n\nIf that sounds useful, hit reply with a day that works. If not, no hard feelings and good luck out there.\n\n${activeUser}\nCentury 21 Alliance\n${myTitle}`
        : `Subject: Congrats on the license — resource for your first 90 days\n\nHi ${firstName},\n\n${activeUser} here from Century 21 Alliance. Just saw your name come through as newly licensed — congratulations, that exam is no joke.\n\nI'm reaching out because most new agents pick their first brokerage based on a recruiting pitch, and then they're stuck wondering in month 3 why they have no leads, no training structure, and no mentor. I want to save you that.\n\nI've put together a one-pager: "10 questions every new agent should ask before signing with a brokerage." I'll send it whether you end up at C21 or somewhere else.\n\nWant me to send it?\n\n${activeUser}\nCentury 21 Alliance\n${myTitle}`;
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────
     RETENTION DATA (Week 6)
     ───────────────────────────────────────────────────────────────────────── */
  const retentionData = useMemo(() => {
    const atRiskAgents = [
      { id: 'r1', name: 'Angela DeRitis',    office: 'WC', lastGCI: 0,      daysNoProduction: 126, riskLevel: 'critical', flagReason: 'No production in 126 days · no business plan set', coaching: null },
      { id: 'r2', name: 'Charles Dahmer III', office: 'WC', lastGCI: 0,     daysNoProduction: 189, riskLevel: 'critical', flagReason: 'No production in 189 days · 0 listings YTD',       coaching: null },
      { id: 'r3', name: 'Christopher Edwards', office: 'WC', lastGCI: 0,    daysNoProduction: 95,  riskLevel: 'high',     flagReason: 'No production 95 days · no business plan',          coaching: 'scheduled Apr 22' },
      { id: 'r4', name: 'Natallia Voinea',   office: 'WC', lastGCI: 0,      daysNoProduction: 126, riskLevel: 'critical', flagReason: 'No production 126 days · on attrition watchlist',   coaching: null },
      { id: 'r5', name: 'Kelly Hanson',       office: 'WC', lastGCI: 0,     daysNoProduction: 140, riskLevel: 'high',     flagReason: 'No production 140 days',                              coaching: null },
      { id: 'r6', name: 'Kathryn Adams',      office: 'NCM', lastGCI: 3000, daysNoProduction: 60,  riskLevel: 'medium',   flagReason: 'One closed this year, dropped off since Feb',       coaching: 'scheduled Apr 18' },
      { id: 'r7', name: 'Sheri Byron',        office: 'WC', lastGCI: 0,     daysNoProduction: 78,  riskLevel: 'high',     flagReason: 'No production 78 days · declining engagement',      coaching: null },
    ];
    return {
      atRiskAgents,
      totals: {
        total: 275,
        active: 218,
        atRiskHigh: atRiskAgents.filter(a => a.riskLevel === 'critical' || a.riskLevel === 'high').length,
        atRiskMedium: atRiskAgents.filter(a => a.riskLevel === 'medium').length,
        ytdRetained: 42,
        ytdTerms: 8,
      },
      trend: [275, 276, 277, 278, 277, 276, 275, 273, 274, 275, 275, 275],
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
     Open detail helper
     ───────────────────────────────────────────────────────────────────────── */
  const openDetail = (id) => {
    setDetailProspectId(id);
    setActiveView('detail');
    setSearchOpen(false);
  };

  /* ═════════════════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#f7f7f5]" style={{ fontFamily: "'Barlow', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ─────────── TOP HEADER ─────────── */}
      <Header
        activeUser={activeUser}
        setActiveUser={(u) => { setActiveUser(u); setActiveMode('manager'); setOnboardingDismissed(false); setOnboardingStep(0); }}
        userCaps={userCaps}
        effectiveRole={effectiveRole}
        roleBadge={roleBadge}
        isHybrid={isHybrid}
        activeMode={activeMode}
        setActiveMode={setActiveMode}
        managerOffice={managerOffice}
        setSearchOpen={setSearchOpen}
      />

      {/* ─────────── HYBRID MODE TOGGLE BAR ─────────── */}
      {isHybrid && (
        <HybridModeBar activeMode={activeMode} setActiveMode={setActiveMode} managerOffice={managerOffice} />
      )}

      {/* ─────────── RECRUITING / RETENTION SUB-TABS ─────────── */}
      <TabBar activeTab={activeTab} setActiveTab={(t) => { setActiveTab(t); setActiveView(t === 'recruiting' ? 'actions' : 'retention'); }} />

      {/* ─────────── ROLE-AWARE TOP STRIP ─────────── */}
      <TopMetricsStrip
        canSeeAllianceFinancials={canSeeAllianceFinancials}
        effectiveRole={effectiveRole}
        managerOffice={managerOffice}
        activeUser={activeUser}
      />

      {/* ─────────── ONBOARDING CAROUSEL (FIRST RUN) ─────────── */}
      {!onboardingDismissed && activeView !== 'detail' && (
        <OnboardingCarousel
          step={onboardingStep}
          setStep={setOnboardingStep}
          dismiss={() => setOnboardingDismissed(true)}
          userName={activeUser}
          effectiveRole={effectiveRole}
        />
      )}

      {/* ─────────── MAIN CONTENT ─────────── */}
      <div className="px-4 md:px-8 py-6">
        {/* Retention tab */}
        {activeTab === 'retention' && (
          <RetentionView
            data={retentionData}
            effectiveRole={effectiveRole}
            managerOffice={managerOffice}
            isPrincipal={isPrincipalUser}
          />
        )}

        {/* Detail view */}
        {activeTab === 'recruiting' && activeView === 'detail' && detailProspect && detail && (
          <DetailView
            prospect={detailProspect}
            detail={detail}
            getDisplayRole={getDisplayRole}
            userCapabilities={userCapabilities}
            activeUser={activeUser}
            currentActorTag={currentActorTag}
            onBack={() => { setActiveView('actions'); setDetailProspectId(null); }}
            onCall={() => setScriptModal({ prospect: detailProspect, channel: 'call' })}
            onText={() => setScriptModal({ prospect: detailProspect, channel: 'text' })}
            onEmail={() => setScriptModal({ prospect: detailProspect, channel: 'email' })}
            onLog={(type) => setLogActivityModal({ activityType: type, prospectId: detailProspect.id })}
          />
        )}

        {/* Standard views */}
        {activeTab === 'recruiting' && activeView !== 'detail' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
            <div className="lg:col-span-8">
              <ViewSwitcher
                activeView={activeView}
                setActiveView={setActiveView}
                setAddModal={setAddModal}
                selectedCount={selectedProspects.size}
                clearSelection={clearSelection}
                onBulkClick={() => setBulkActionMenu(true)}
              />

              {activeView === 'actions' && (
                <DailyActionsView
                  actionList={actionList}
                  getDisplayRole={getDisplayRole}
                  activeUser={activeUser}
                  currentActorTag={currentActorTag}
                  openDetail={openDetail}
                  onCall={(p) => setScriptModal({ prospect: p, channel: 'call' })}
                  onText={(p) => setScriptModal({ prospect: p, channel: 'text' })}
                  onEmail={(p) => setScriptModal({ prospect: p, channel: 'email' })}
                  onClaim={(p) => setClaimModal({ prospect: p })}
                  onPass={(p) => setPassModal({ prospect: p })}
                  selectedProspects={selectedProspects}
                  toggleSelection={toggleProspectSelection}
                />
              )}

              {activeView === 'pipeline' && (
                <PipelineView
                  prospects={visibleProspects}
                  pipelineLayout={pipelineLayout}
                  setPipelineLayout={setPipelineLayout}
                  openDetail={openDetail}
                  getDisplayRole={getDisplayRole}
                  activeUser={activeUser}
                  selectedProspects={selectedProspects}
                  toggleSelection={toggleProspectSelection}
                />
              )}

              {activeView === 'scorecard' && (
                <ScorecardView
                  effectiveRole={effectiveRole}
                  activeUser={activeUser}
                  canSeeOthersCloseNumbers={canSeeOthersCloseNumbers}
                  canSeePeerRankOnly={canSeePeerRankOnly}
                  isHybrid={isHybrid}
                  activeMode={activeMode}
                />
              )}

              {activeView === 'exclusions' && (
                <ExclusionsView
                  subTab={exclusionsSubTab}
                  setSubTab={setExclusionsSubTab}
                  canManageAllianceExclusions={canManageAllianceExclusions}
                  canSeeExclusionReasons={canSeeExclusionReasons}
                  effectiveRole={effectiveRole}
                  managerOffice={managerOffice}
                  activeUser={activeUser}
                  isPrincipal={isPrincipalUser}
                />
              )}
            </div>

            {/* ─────────── RIGHT COLUMN — CONSOLIDATED INTELLIGENCE PANEL ─────────── */}
            <div className="lg:col-span-4">
              <IntelligencePanel
                activeTab={rightPanelTab}
                setActiveTab={setRightPanelTab}
                morningBriefing={morningBriefing}
                briefingLoading={briefingLoading}
                onRegenerateBriefing={generateMorningBriefing}
                chatMessages={chatMessages}
                setChatMessages={setChatMessages}
                aiInput={aiInput}
                setAiInput={setAiInput}
                actionList={actionList}
                staleProspects={staleProspects}
                activeUser={activeUser}
                effectiveRole={effectiveRole}
                claimNotifications={claimNotifications}
                automationStatus={automationStatus}
                setAutomationStatus={setAutomationStatus}
                setUploadModal={setUploadModal}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─────────── GLOBAL SEARCH MODAL (CMD+K) ─────────── */}
      {searchOpen && (
        <SearchModal
          query={searchQuery}
          setQuery={setSearchQuery}
          results={searchResults}
          onSelect={openDetail}
          onClose={() => { setSearchOpen(false); setSearchQuery(''); }}
          getDisplayRole={getDisplayRole}
        />
      )}

      {/* ─────────── ALL MODALS ─────────── */}
      {scriptModal && (
        <ScriptModal
          scriptModal={scriptModal}
          close={() => setScriptModal(null)}
          generateScript={generateScript}
          integrations={integrations}
          handleSend={handleOutreachSend}
        />
      )}

      {confirmOutreachModal && (
        <ConfirmOutreachModal
          data={confirmOutreachModal}
          close={() => { setConfirmOutreachModal(null); setScriptModal(null); showToast(`${confirmOutreachModal.channel} logged to ${confirmOutreachModal.prospect.name}`); }}
          openLog={() => {
            setLogActivityModal({ activityType: confirmOutreachModal.channel, prospectId: confirmOutreachModal.prospect.id, preFilledContent: confirmOutreachModal.content });
            setConfirmOutreachModal(null);
            setScriptModal(null);
          }}
        />
      )}

      {addModal && <AddProspectModal close={() => setAddModal(false)} currentActorTag={currentActorTag} />}
      {uploadModal && <UploadModal close={() => setUploadModal(false)} />}

      {claimModal && (
        <ClaimModal
          claimModal={claimModal}
          close={() => setClaimModal(null)}
          activeUser={activeUser}
          currentActorTag={currentActorTag}
          getDisplayRole={getDisplayRole}
          userCapabilities={userCapabilities}
          confirmClaim={(reason) => {
            setClaimNotifications(n => [...n, {
              from: claimModal.prospect.assignedTo,
              to: currentActorTag,
              prospectName: claimModal.prospect.name,
              timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
              reason,
            }]);
            showToast(`Claimed ${claimModal.prospect.name}`, { label: 'Undo', onClick: () => { setClaimNotifications(n => n.slice(0, -1)); } });
            setClaimModal(null);
          }}
        />
      )}

      {passModal && (
        <PassModal
          passModal={passModal}
          close={() => setPassModal(null)}
          activeUser={activeUser}
          userCapabilities={userCapabilities}
          getDisplayRole={getDisplayRole}
          confirmPass={(toUser, reason) => {
            showToast(`Passed ${passModal.prospect.name} to ${toUser}`, { label: 'Undo', onClick: () => {} });
            setPassModal(null);
          }}
        />
      )}

      {logActivityModal && (
        <LogActivityModal
          modal={logActivityModal}
          close={() => setLogActivityModal(null)}
          currentActorTag={currentActorTag}
          confirmLog={() => {
            showToast(`Activity logged`, { label: 'View', onClick: () => {} });
            setLogActivityModal(null);
          }}
        />
      )}

      {bulkActionMenu && (
        <BulkActionModal
          selectedCount={selectedProspects.size}
          close={() => setBulkActionMenu(false)}
          clearSelection={clearSelection}
          onDone={(action) => {
            showToast(`${action} applied to ${selectedProspects.size} prospects`, { label: 'Undo', onClick: () => {} });
            clearSelection();
            setBulkActionMenu(false);
          }}
        />
      )}

      {/* ─────────── TOAST ─────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#252526] text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#C9A84C]"/>
            <span className="text-[13px] font-semibold">{toast.message}</span>
          </div>
          {toast.action && (
            <button
              onClick={() => { toast.action.onClick(); setToast(null); }}
              className="text-[12px] font-bold text-[#C9A84C] hover:text-[#b89740] tracking-wider border-l border-gray-700 pl-4"
            >
              {toast.action.label}
            </button>
          )}
          <button onClick={() => setToast(null)} className="text-gray-500 hover:text-white">
            <X size={14}/>
          </button>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to   { transform: translate(-50%, 0);    opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.2s ease-out; }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS — split out per critique concern about 15 useState hooks
   Each component is responsible for its own rendering concerns.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─────────────── HEADER ─────────────── */
function Header({ activeUser, setActiveUser, userCaps, effectiveRole, roleBadge, isHybrid, activeMode, managerOffice, setSearchOpen }) {
  return (
    <div className="bg-[#252526] text-white px-4 md:px-8 py-4 md:py-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[#C9A84C] text-xs tracking-[0.2em] font-semibold">CENTURY 21</div>
          <div className="text-white text-sm tracking-wider">Alliance</div>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm">
          <span className="text-gray-400">Alliance Dash</span>
          <span className="text-gray-400">Intelligence</span>
          <span className="text-white border-b-2 border-[#C9A84C] pb-1 font-semibold">Roster & Recruiting</span>
          <span className="text-gray-400">Agent Ranking</span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 bg-[#1a1a1b] border border-gray-700 px-3 py-1.5 rounded text-[11px] text-gray-400 hover:text-white hover:border-[#C9A84C] transition"
          >
            <Search size={12}/>
            <span className="hidden md:inline">Search anything...</span>
            <span className="hidden md:inline text-[9px] bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 font-mono">⌘K</span>
          </button>
          <select
            value={activeUser}
            onChange={(e) => setActiveUser(e.target.value)}
            className="bg-[#1a1a1b] text-white text-xs px-3 py-1.5 rounded border border-gray-700"
          >
            <optgroup label="Principals">
              <option>John</option>
              <option>Chuck</option>
            </optgroup>
            <optgroup label="Recruiters">
              <option>Rec. 1</option>
              <option>Rec. 2</option>
            </optgroup>
            <optgroup label="Office Managers">
              <option>Karina</option>
              <option>Jeff</option>
            </optgroup>
            <optgroup label="Hybrid (Manager + Recruiter)">
              <option>Steve</option>
            </optgroup>
          </select>
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="text-right">
              <div className="text-[13px] text-white font-semibold leading-tight">{activeUser}</div>
              <div className={`text-[9px] tracking-wider font-bold leading-tight ${
                effectiveRole === 'Principal' ? 'text-[#C9A84C]' :
                effectiveRole === 'Recruiter' ? 'text-blue-300' :
                'text-gray-400'
              }`}>
                {isHybrid ? (activeMode === 'recruiter' ? 'RECRUITER MODE · ALL' : `${managerOffice} MANAGER MODE`) : roleBadge}
              </div>
            </div>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
              effectiveRole === 'Principal' ? 'bg-[#C9A84C] text-[#252526]' :
              effectiveRole === 'Recruiter' ? 'bg-blue-500 text-white' :
              'bg-gray-400 text-white'
            }`}>
              {userCaps.initials}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── HYBRID MODE BAR ─────────────── */
function HybridModeBar({ activeMode, setActiveMode, managerOffice }) {
  return (
    <div className={`px-4 md:px-8 py-2.5 border-t transition-colors ${
      activeMode === 'recruiter' ? 'bg-blue-900/30 border-blue-500/30' : 'bg-gray-800/50 border-gray-700'
    }`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[10px] tracking-[0.15em] text-gray-400 font-semibold flex items-center gap-2">
          <ArrowRightLeft size={11} className="text-[#C9A84C]"/>
          <span className="hidden sm:inline">YOU WEAR TWO HATS · CURRENTLY IN</span>
          <span className={`font-bold ${activeMode === 'recruiter' ? 'text-blue-300' : 'text-[#C9A84C]'}`}>
            {activeMode === 'recruiter' ? 'RECRUITER' : 'MANAGER'} MODE
          </span>
        </div>
        <div className="flex items-center gap-1 bg-[#1a1a1b] rounded-md p-1">
          <button
            onClick={() => setActiveMode('manager')}
            className={`px-3 py-1 text-[11px] font-bold tracking-wider rounded transition ${
              activeMode === 'manager' ? 'bg-[#C9A84C] text-[#252526]' : 'text-gray-400 hover:text-white'
            }`}
          >
            {managerOffice} MANAGER
          </button>
          <button
            onClick={() => setActiveMode('recruiter')}
            className={`px-3 py-1 text-[11px] font-bold tracking-wider rounded transition ${
              activeMode === 'recruiter' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            RECRUITER
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── RECRUITING / RETENTION TAB BAR ─────────────── */
function TabBar({ activeTab, setActiveTab }) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-8">
      <div className="flex gap-6 md:gap-8">
        <button
          onClick={() => setActiveTab('recruiting')}
          className={`py-4 text-sm font-semibold tracking-wide border-b-2 transition ${
            activeTab === 'recruiting' ? 'border-[#C9A84C] text-[#252526]' : 'border-transparent text-gray-400 hover:text-[#252526]'
          }`}
        >
          RECRUITING
        </button>
        <button
          onClick={() => setActiveTab('retention')}
          className={`py-4 text-sm font-semibold tracking-wide border-b-2 transition ${
            activeTab === 'retention' ? 'border-[#C9A84C] text-[#252526]' : 'border-transparent text-gray-400 hover:text-[#252526]'
          }`}
        >
          RETENTION
        </button>
      </div>
    </div>
  );
}

/* ─────────────── ROLE-AWARE TOP METRICS STRIP ─────────────── */
function TopMetricsStrip({ canSeeAllianceFinancials, effectiveRole, managerOffice, activeUser }) {
  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-5">
      {canSeeAllianceFinancials ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <MetricCell
            label={effectiveRole === 'OfficeManager' ? `${managerOffice} STAY FLAT` : 'STAY FLAT TARGET'}
            value={effectiveRole === 'OfficeManager' ? '1' : '4'}
            unit="hires needed"
            sub={effectiveRole === 'OfficeManager' ? '0 hires vs 1 term YTD' : '0 hires vs 4 terms YTD'}
          />
          <MetricCell
            label={effectiveRole === 'OfficeManager' ? `${managerOffice} GCI TARGET` : 'GCI GOAL TARGET'}
            value={effectiveRole === 'OfficeManager' ? '8' : '59'}
            unit="net new"
            sub={effectiveRole === 'OfficeManager' ? '$190K left · 8mo' : '$1.5M left · 8mo remaining'}
          />
          <MetricCell label="VALUE PER HIRE" value="$39K" unit="/yr avg" sub="10 agents = $386K/yr" />
          <MetricCell label="HEADCOUNT" value="275" unit="agents" sub="8 offices · +4 QoQ" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <MetricCell label="YOUR PIPELINE" value={activeUser === 'Rec. 1' ? '24' : '19'} unit="active prospects" sub={activeUser === 'Rec. 1' ? '5 stale · review today' : '3 stale · review today'} tone="blue" />
          <MetricCell label="YOUR MONTHLY GOAL" value={activeUser === 'Rec. 1' ? '2' : '1'} unit="/ 3 hires" sub={activeUser === 'Rec. 1' ? 'On pace for 4' : 'Behind pace · step up outreach'} tone="blue" />
          <MetricCell label="YOUR CREDITS" value={activeUser === 'Rec. 1' ? '2.5' : '1.0'} unit="this month" sub="+0.5 from last month" tone="gold" />
          <MetricCell label="TEAM RANK" value={`#${activeUser === 'Rec. 1' ? '1' : '2'}`} unit="of 2 recruiters" sub={activeUser === 'Rec. 1' ? 'Top 50%' : 'Bottom 50% · room to grow'} tone="blue" />
        </div>
      )}
    </div>
  );
}

function MetricCell({ label, value, unit, sub, tone = 'default' }) {
  const labelColor = tone === 'blue' ? 'text-blue-700' : tone === 'gold' ? 'text-gray-500' : 'text-gray-500';
  const valueColor = tone === 'gold' ? 'text-[#C9A84C]' : 'text-[#252526]';
  return (
    <div>
      <div className={`text-[10px] tracking-[0.15em] font-semibold ${labelColor}`}>{label}</div>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={`text-2xl font-bold ${valueColor}`}>{value}</span>
        <span className="text-xs text-gray-500">{unit}</span>
      </div>
      <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

/* ─────────────── ONBOARDING CAROUSEL (first-run, dismissable) ─────────────── */
function OnboardingCarousel({ step, setStep, dismiss, userName, effectiveRole }) {
  const steps = [
    {
      title: `Welcome to Alliance Recruiting, ${userName}`,
      body: 'This is your recruiting command center. We\'ll walk you through the 4 views in under 60 seconds. You can always revisit this from the Help menu.',
      highlight: 'start',
    },
    {
      title: 'Daily Actions is your home base',
      body: effectiveRole === 'Recruiter'
        ? 'Every morning, this view shows you the 5 highest-priority prospects to reach out to today. Claim, call, text, or email — one click each.'
        : 'Every morning, this view shows you the 5 highest-priority prospects across your office. The AI prioritizes by score, staleness, and days-in-stage.',
      highlight: 'actions',
    },
    {
      title: 'Pipeline shows everything in flight',
      body: 'Five stages from Lead to Offer Out. Table view by default (fast to scan). Toggle to Kanban if you prefer the visual.',
      highlight: 'pipeline',
    },
    {
      title: 'Alliance Field Intelligence runs weekly',
      body: 'Every Monday morning, we pull fresh data from MarketView Broker and flag what changed — newly licensed agents, brokerage moves, production swings. Your weekly intel briefing.',
      highlight: 'afi',
    },
    {
      title: 'You\'re ready',
      body: 'You can press ⌘K anywhere to search. Right column adapts to what you\'re doing. Start with Daily Actions — everything else can wait.',
      highlight: 'done',
    },
  ];
  const current = steps[step];
  return (
    <div className="bg-gradient-to-br from-[#252526] to-[#1a1a1b] border-b border-[#C9A84C]/30 px-4 md:px-8 py-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-full opacity-[0.04] flex items-center justify-center">
        <div className="text-[#C9A84C] font-bold text-[140px] leading-none">{step + 1}</div>
      </div>
      <div className="flex items-start gap-4 relative max-w-5xl">
        <div className="w-10 h-10 rounded-full bg-[#C9A84C] text-[#252526] flex items-center justify-center font-bold text-sm flex-shrink-0">
          {step + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-[10px] tracking-[0.2em] text-[#C9A84C] font-bold">FIRST-TIME WALKTHROUGH · {step + 1} OF {steps.length}</div>
          </div>
          <div className="text-white text-lg font-bold">{current.title}</div>
          <div className="text-gray-300 text-[13px] mt-1 max-w-2xl leading-relaxed">{current.body}</div>
          <div className="flex items-center gap-2 mt-4">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="text-[11px] text-gray-300 hover:text-white font-semibold px-3 py-1.5 rounded border border-gray-700 transition">
                Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="text-[11px] font-bold bg-[#C9A84C] text-[#252526] px-4 py-1.5 rounded hover:bg-[#b89740] transition">
                Next →
              </button>
            ) : (
              <button onClick={dismiss} className="text-[11px] font-bold bg-[#C9A84C] text-[#252526] px-4 py-1.5 rounded hover:bg-[#b89740] transition">
                Got it — let's go
              </button>
            )}
            <button onClick={dismiss} className="text-[11px] text-gray-400 hover:text-white ml-auto">
              Skip tour
            </button>
          </div>
        </div>
      </div>
      {/* Progress dots */}
      <div className="flex gap-1 mt-4 relative">
        {steps.map((_, i) => (
          <div key={i} className={`h-0.5 flex-1 rounded-full transition ${i <= step ? 'bg-[#C9A84C]' : 'bg-gray-700'}`}/>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── VIEW SWITCHER (with bulk selection indicator) ─────────────── */
function ViewSwitcher({ activeView, setActiveView, setAddModal, selectedCount, clearSelection, onBulkClick }) {
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      {selectedCount > 0 ? (
        <div className="flex items-center gap-2 bg-[#252526] text-white rounded-lg px-3 py-1.5">
          <CheckSquare size={14} className="text-[#C9A84C]"/>
          <span className="text-[12px] font-semibold">{selectedCount} selected</span>
          <button onClick={onBulkClick} className="bg-[#C9A84C] text-[#252526] px-3 py-1 rounded text-[11px] font-bold ml-2 hover:bg-[#b89740] transition">
            Bulk actions
          </button>
          <button onClick={clearSelection} className="text-gray-400 hover:text-white text-[11px] ml-1">
            Clear
          </button>
        </div>
      ) : (
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 overflow-x-auto">
          {[
            { id: 'actions', label: 'Daily Actions', icon: Target },
            { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
            { id: 'scorecard', label: 'Scorecard', icon: Users },
            { id: 'exclusions', label: 'Exclusions', icon: Shield },
          ].map(v => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-md flex items-center gap-2 transition whitespace-nowrap ${
                  activeView === v.id ? 'bg-[#252526] text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} />
                {v.label}
              </button>
            );
          })}
        </div>
      )}
      <button
        onClick={() => setAddModal(true)}
        className="bg-[#C9A84C] text-[#252526] px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 hover:bg-[#b89740] transition"
      >
        <Plus size={16} />
        Add Prospect
      </button>
    </div>
  );
}

/* ─────────────── DAILY ACTIONS VIEW ─────────────── */
function DailyActionsView({ actionList, getDisplayRole, activeUser, currentActorTag, openDetail, onCall, onText, onEmail, onClaim, onPass, selectedProspects, toggleSelection }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <div className="text-[11px] tracking-[0.15em] text-gray-500 font-semibold">TODAY'S PRIORITY LIST</div>
          <div className="text-lg font-bold text-[#252526] mt-0.5">{actionList.length} people to reach out to</div>
        </div>
        <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
          <CircleDot size={10} className="text-[#C9A84C]" />
          <span className="hidden sm:inline">Ranked by score + staleness</span>
        </div>
      </div>
      {actionList.map((p, i) => (
        <DailyActionCard
          key={p.id}
          prospect={p}
          index={i}
          getDisplayRole={getDisplayRole}
          activeUser={activeUser}
          openDetail={openDetail}
          onCall={onCall}
          onText={onText}
          onEmail={onEmail}
          onClaim={onClaim}
          onPass={onPass}
          isSelected={selectedProspects.has(p.id)}
          toggleSelection={toggleSelection}
          showReason={i < 3}  // Only top 3 get the full narrative (critique v1 cut #4)
        />
      ))}
    </div>
  );
}

function DailyActionCard({ prospect: p, index, getDisplayRole, activeUser, openDetail, onCall, onText, onEmail, onClaim, onPass, isSelected, toggleSelection, showReason }) {
  const addedByRole = getDisplayRole(p.addedBy.replace(/ \(.+\)$/, ''));
  const assignedRole = getDisplayRole(p.assignedTo.replace(/ \(.+\)$/, ''));
  const isAssignedToMe = p.assignedTo === activeUser || p.assignedTo.startsWith(`${activeUser} (`);

  return (
    <div className={`px-4 md:px-6 py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition group ${isSelected ? 'bg-[#fdfaf0]' : ''}`}>
      <div className="flex items-start gap-3 md:gap-4">
        {/* Bulk select checkbox */}
        <button
          onClick={() => toggleSelection(p.id)}
          className={`mt-1 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition ${
            isSelected ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-gray-300 hover:border-[#C9A84C]'
          }`}
        >
          {isSelected && <Check size={10} className="text-[#252526]"/>}
        </button>

        {/* Score */}
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <div className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center font-bold text-sm ${
            p.score >= 90 ? 'bg-[#252526] text-[#C9A84C]' :
            p.score >= 80 ? 'bg-[#C9A84C] text-[#252526]' :
            'bg-gray-200 text-gray-700'
          }`}>{p.score}</div>
          <div className="text-[9px] text-gray-400 tracking-wider">SCORE</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <button onClick={() => openDetail(p.id)} className="font-bold text-[#252526] text-[14px] md:text-[15px] hover:text-[#C9A84C] transition text-left">
              {p.name}
            </button>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide ${
              p.type === 'Experienced' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {p.type.toUpperCase()}
            </span>
            {p.lastTouch >= 7 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200 tracking-wide">
                STALE · {p.lastTouch}D
              </span>
            )}
            {p.daysInStage >= 30 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-50 text-orange-700 border border-orange-200 tracking-wide">
                STUCK · {p.daysInStage}D IN {p.stage.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-2 flex-wrap">
            <span className="flex items-center gap-1"><Sparkles size={10} />{p.source}</span>
            {p.currentBrokerage && <span className="flex items-center gap-1"><Building2 size={10} />{p.currentBrokerage}</span>}
            <span className="flex items-center gap-1"><MapPin size={10} />{p.office}</span>
            <span className="flex items-center gap-1"><Clock size={10} />{p.lastTouch}d since touch</span>
            {p.production && <span className="font-semibold text-[#252526]">{p.production}</span>}
          </div>

          {/* Attribution */}
          <AttributionBadge prospect={p} activeUser={activeUser} getDisplayRole={getDisplayRole} />

          {/* Reason (only top 3) */}
          {showReason && <div className="text-[13px] text-gray-700 italic mb-3 leading-snug mt-2">"{p.reason}"</div>}

          {/* Actions */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            <ActionButton icon={Phone} label="Call" onClick={() => onCall(p)} />
            <ActionButton icon={MessageSquare} label="Text" onClick={() => onText(p)} />
            <ActionButton icon={Mail} label="Email" onClick={() => onEmail(p)} />
            <div className="flex-1"/>
            {!isAssignedToMe && (
              <>
                <button
                  onClick={() => onClaim(p)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#C9A84C] hover:text-white border border-[#C9A84C] rounded-md hover:bg-[#C9A84C] transition"
                >Claim</button>
              </>
            )}
            {isAssignedToMe && (
              <button
                onClick={() => onPass(p)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-[#252526] border border-gray-300 rounded-md hover:border-[#252526] transition"
              >
                <ArrowRightLeft size={11}/>
                Pass to...
              </button>
            )}
            <button onClick={() => openDetail(p.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-[#252526] transition">
              View
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-md hover:border-[#252526] hover:bg-[#252526] hover:text-white transition"
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function AttributionBadge({ prospect: p, activeUser, getDisplayRole }) {
  const addedByClean = p.addedBy.replace(/ \(.+\)$/, '');
  const assignedClean = p.assignedTo.replace(/ \(.+\)$/, '');
  const addedByRole = getDisplayRole(addedByClean);
  const assignedRole = getDisplayRole(assignedClean);
  const isMe = p.assignedTo === activeUser || p.assignedTo.startsWith(`${activeUser} (`);

  const badgeStyle = (role) =>
    role === 'Principal' ? 'bg-[#252526] text-[#C9A84C]' :
    role === 'Recruiter' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
    role === 'Hybrid' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
    'bg-gray-100 text-gray-700 border border-gray-200';

  return (
    <div className="flex items-center gap-2 text-[10px] flex-wrap">
      <span className="text-gray-400 tracking-wider font-semibold">ADDED BY</span>
      <span className={`px-1.5 py-0.5 rounded font-bold tracking-wide ${badgeStyle(addedByRole)}`}>
        {p.addedBy.toUpperCase()}
      </span>
      <ChevronRight size={10} className="text-gray-300"/>
      <span className="text-gray-400 tracking-wider font-semibold">ASSIGNED</span>
      <span className={`px-1.5 py-0.5 rounded font-bold tracking-wide ${isMe ? 'bg-[#C9A84C] text-[#252526]' : badgeStyle(assignedRole)}`}>
        {isMe ? 'YOU' : p.assignedTo.toUpperCase()}
      </span>
      {p.addedBy !== p.assignedTo && (
        <span className="text-[9px] text-gray-400 italic ml-1">· sourced hand-off</span>
      )}
    </div>
  );
}

/* ─────────────── PIPELINE VIEW (table default, kanban toggle) ─────────────── */
function PipelineView({ prospects, pipelineLayout, setPipelineLayout, openDetail, getDisplayRole, activeUser, selectedProspects, toggleSelection }) {
  const [sortBy, setSortBy] = useState('score');
  const [sortDir, setSortDir] = useState('desc');

  const stages = ['Lead', 'Contacted', 'Meeting Set', 'Interviewing', 'Offer Out'];

  const sorted = useMemo(() => {
    const arr = [...prospects];
    arr.sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [prospects, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 md:px-6 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <div className="text-[11px] tracking-[0.15em] text-gray-500 font-semibold">PIPELINE</div>
          <div className="text-[13px] font-bold text-[#252526] mt-0.5">{prospects.length} active prospects</div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded p-0.5">
          <button
            onClick={() => setPipelineLayout('table')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1.5 transition ${
              pipelineLayout === 'table' ? 'bg-white text-[#252526] shadow-sm' : 'text-gray-500 hover:text-[#252526]'
            }`}
          >
            <List size={12}/>
            Table
          </button>
          <button
            onClick={() => setPipelineLayout('kanban')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded flex items-center gap-1.5 transition ${
              pipelineLayout === 'kanban' ? 'bg-white text-[#252526] shadow-sm' : 'text-gray-500 hover:text-[#252526]'
            }`}
          >
            <LayoutGrid size={12}/>
            Kanban
          </button>
        </div>
      </div>

      {pipelineLayout === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] tracking-wider text-gray-600 font-bold">
                <th className="px-3 py-2.5 w-8"></th>
                <th className="px-3 py-2.5 text-left cursor-pointer hover:text-[#252526]" onClick={() => toggleSort('name')}>
                  NAME {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-2.5 text-left cursor-pointer hover:text-[#252526]" onClick={() => toggleSort('stage')}>
                  STAGE {sortBy === 'stage' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-2.5 text-center cursor-pointer hover:text-[#252526]" onClick={() => toggleSort('daysInStage')}>
                  DAYS {sortBy === 'daysInStage' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-2.5 text-center cursor-pointer hover:text-[#252526]" onClick={() => toggleSort('lastTouch')}>
                  LAST TOUCH {sortBy === 'lastTouch' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-2.5 text-center cursor-pointer hover:text-[#252526]" onClick={() => toggleSort('score')}>
                  SCORE {sortBy === 'score' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-3 py-2.5 text-left">ASSIGNED</th>
                <th className="px-3 py-2.5 text-left">OFFICE</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(p => {
                const isSel = selectedProspects.has(p.id);
                return (
                  <tr
                    key={p.id}
                    onClick={() => openDetail(p.id)}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${isSel ? 'bg-[#fdfaf0]' : ''}`}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => { e.stopPropagation(); toggleSelection(p.id); }}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSel ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-gray-300'}`}>
                        {isSel && <Check size={9} className="text-[#252526]"/>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-bold text-[#252526]">{p.name}</div>
                      <div className="text-[10px] text-gray-500">{p.currentBrokerage || 'New License'}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-700 rounded">
                        {p.stage}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 text-center font-semibold ${p.daysInStage >= 30 ? 'text-orange-600' : 'text-gray-600'}`}>
                      {p.daysInStage}d
                    </td>
                    <td className={`px-3 py-2.5 text-center font-semibold ${p.lastTouch >= 7 ? 'text-red-600' : 'text-gray-600'}`}>
                      {p.lastTouch}d
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex w-8 h-8 rounded-full items-center justify-center text-[11px] font-bold ${
                        p.score >= 90 ? 'bg-[#252526] text-[#C9A84C]' :
                        p.score >= 80 ? 'bg-[#C9A84C] text-[#252526]' :
                        'bg-gray-200 text-gray-700'
                      }`}>{p.score}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-gray-700">{p.assignedTo}</td>
                    <td className="px-3 py-2.5 text-[11px] text-gray-500">{p.office}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 overflow-x-auto">
          <div className="grid grid-cols-5 gap-3 min-w-[800px]">
            {stages.map(stage => {
              const stageProspects = prospects.filter(p => p.stage === stage);
              return (
                <div key={stage} className="bg-gray-50 rounded-md p-3 min-h-[300px]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-bold tracking-[0.12em] text-gray-600">{stage.toUpperCase()}</div>
                    <div className="text-[10px] font-semibold text-gray-400 bg-white px-1.5 py-0.5 rounded">{stageProspects.length}</div>
                  </div>
                  <div className="space-y-2">
                    {stageProspects.map(p => (
                      <div
                        key={p.id}
                        onClick={() => openDetail(p.id)}
                        className="bg-white p-2.5 rounded border border-gray-200 hover:border-[#C9A84C] hover:shadow-sm transition cursor-pointer"
                      >
                        <div className="font-semibold text-[12px] text-[#252526] leading-tight">{p.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{p.currentBrokerage || 'New License'}</div>
                        <div className="flex items-center justify-between mt-2 text-[9px]">
                          <span className="text-gray-400">{p.assignedTo}</span>
                          <span className={`font-semibold ${p.lastTouch >= 7 ? 'text-red-600' : 'text-gray-400'}`}>{p.lastTouch}d</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── SCORECARD VIEW (anonymized peer for recruiters) ─────────────── */
function ScorecardView({ effectiveRole, activeUser, canSeeOthersCloseNumbers, canSeePeerRankOnly, isHybrid, activeMode }) {
  const personalStats = effectiveRole === 'Recruiter' ? {
    sourced: activeUser === 'Rec. 1' ? 24 : 19,
    touches: activeUser === 'Rec. 1' ? 62 : 54,
    meetings: activeUser === 'Rec. 1' ? 11 : 9,
    offers: activeUser === 'Rec. 1' ? 4 : 3,
    closed: activeUser === 'Rec. 1' ? 2 : 1,
    credit: activeUser === 'Rec. 1' ? 2.5 : 1.0,
  } : {
    sourced: activeUser === 'Karina' ? 12 : activeUser === 'Jeff' ? 7 : 4,
    touches: activeUser === 'Karina' ? 38 : activeUser === 'Jeff' ? 19 : 11,
    meetings: activeUser === 'Karina' ? 7 : activeUser === 'Jeff' ? 4 : 2,
    offers: activeUser === 'Karina' ? 2 : activeUser === 'Jeff' ? 1 : 1,
    closed: activeUser === 'Karina' ? 1 : 0,
    credit: activeUser === 'Karina' ? 1.5 : activeUser === 'Jeff' ? 0.5 : 0,
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 md:px-6 py-4 border-b border-gray-200">
        <div className="text-[11px] tracking-[0.15em] text-gray-500 font-semibold">WEEKLY RECRUITING SCORECARD</div>
        <div className="text-lg font-bold text-[#252526] mt-0.5">
          Last 4 weeks · {activeUser}
          {isHybrid && <span className="text-[12px] font-normal text-gray-500 ml-2">({activeMode === 'recruiter' ? 'Recruiter' : 'Manager'} mode)</span>}
        </div>
      </div>

      {/* Hybrid split: show both hats separately */}
      {isHybrid ? (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`rounded border p-4 ${activeMode === 'manager' ? 'border-[#C9A84C] bg-[#fdfaf0]' : 'border-gray-200'}`}>
            <div className="text-[10px] tracking-wider text-gray-500 font-bold mb-2">AS {effectiveRole === 'OfficeManager' ? 'WC MANAGER' : 'MANAGER'}</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-xl font-bold text-[#252526]">7</div><div className="text-[9px] text-gray-500">SOURCED</div></div>
              <div><div className="text-xl font-bold text-[#252526]">1</div><div className="text-[9px] text-gray-500">CLOSED</div></div>
              <div><div className="text-xl font-bold text-[#C9A84C]">1.5</div><div className="text-[9px] text-gray-500">CREDITS</div></div>
            </div>
          </div>
          <div className={`rounded border p-4 ${activeMode === 'recruiter' ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200'}`}>
            <div className="text-[10px] tracking-wider text-blue-700 font-bold mb-2">AS RECRUITER</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><div className="text-xl font-bold text-[#252526]">14</div><div className="text-[9px] text-gray-500">SOURCED</div></div>
              <div><div className="text-xl font-bold text-[#252526]">2</div><div className="text-[9px] text-gray-500">CLOSED</div></div>
              <div><div className="text-xl font-bold text-[#C9A84C]">2.5</div><div className="text-[9px] text-gray-500">CREDITS</div></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-gray-100">
          <ScorecardCell label="Leads Sourced" value={personalStats.sourced} trend="+3" tone="sourced"/>
          <ScorecardCell label="Touches" value={personalStats.touches} trend="+8"/>
          <ScorecardCell label="Meetings" value={personalStats.meetings} trend="+2"/>
          <ScorecardCell label="Offers Out" value={personalStats.offers} trend="0"/>
          <ScorecardCell label="Closed (You)" value={personalStats.closed} trend="+1" tone="closed"/>
        </div>
      )}

      <div className="px-4 md:px-6 py-3 bg-[#fdfaf0] border-t border-[#C9A84C]/30 text-[11px] text-gray-700 flex items-start gap-2">
        <Sparkles size={12} className="text-[#C9A84C] mt-0.5 flex-shrink-0"/>
        <div>
          <span className="font-bold text-[#252526]">Credit scoring:</span> Solo hire = 2.0 credits. Sourced by you, closed by teammate = 1.0 credit. Bonus pays on <span className="font-semibold">Closed (You)</span>.
        </div>
      </div>

      {/* Recruiter: anonymized peer view */}
      {effectiveRole === 'Recruiter' && (
        <div className="px-4 md:px-6 py-5 border-t border-gray-100 bg-blue-50/30">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] tracking-wider text-blue-900 font-semibold">YOUR TEAM POSITION · LAST 4 WEEKS</div>
            <div className="text-[10px] text-gray-500 italic flex items-center gap-1">
              <Lock size={9}/>
              Peer names & numbers hidden
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded border border-blue-200 px-4 py-3">
              <div className="text-[10px] tracking-wider text-gray-500 font-bold">YOUR RANK</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-[#252526]">#{activeUser === 'Rec. 1' ? '1' : '2'}</span>
                <span className="text-[11px] text-gray-500">of 2 recruiters</span>
              </div>
            </div>
            <div className="bg-white rounded border border-blue-200 px-4 py-3">
              <div className="text-[10px] tracking-wider text-gray-500 font-bold">YOUR GOAL PROGRESS</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-[#C9A84C]">{personalStats.closed}/3</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">{activeUser === 'Rec. 1' ? 'On pace' : 'Behind pace'}</div>
            </div>
            <div className="bg-white rounded border border-blue-200 px-4 py-3">
              <div className="text-[10px] tracking-wider text-gray-500 font-bold">CREDITS VS TEAM AVG</div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-[#252526]">{personalStats.credit}</span>
                <span className="text-[11px] text-gray-500">vs 1.75 avg</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Principal: full leaderboard */}
      {effectiveRole === 'Principal' && (
        <div className="px-4 md:px-6 py-5 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] tracking-wider text-gray-500 font-semibold">TEAM LEADERBOARD · LAST 4 WEEKS</div>
            <div className="text-[10px] text-gray-500 flex items-center gap-1">
              <Shield size={9}/>
              Principal view · full visibility
            </div>
          </div>
          <div className="space-y-1.5 overflow-x-auto">
            {[
              { name: 'Rec. 1',  role: 'Recruiter',     sourced: 24, closed: 2, credit: 2.5 },
              { name: 'Steve',   role: 'Hybrid',        sourced: 14, closed: 2, credit: 2.5 },
              { name: 'Rec. 2',  role: 'Recruiter',     sourced: 19, closed: 1, credit: 1.0 },
              { name: 'Karina',  role: 'OfficeManager', sourced: 12, closed: 1, credit: 1.5 },
              { name: 'Jeff',    role: 'OfficeManager', sourced: 7,  closed: 0, credit: 0.5 },
              { name: 'Chuck',   role: 'Principal',     sourced: 4,  closed: 0, credit: 0 },
              { name: 'John',    role: 'Principal',     sourced: 3,  closed: 0, credit: 0 },
            ].sort((a,b) => b.credit - a.credit).map((t, i) => (
              <div key={i} className={`grid grid-cols-12 items-center py-2 px-3 rounded text-[12px] min-w-[560px] ${t.name === activeUser ? 'bg-[#fdfaf0] border border-[#C9A84C]/30' : 'hover:bg-gray-50'} transition`}>
                <div className="col-span-1 text-center text-[11px] font-bold text-gray-400">#{i+1}</div>
                <div className="col-span-4 flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                    t.role === 'Principal' ? 'bg-[#C9A84C] text-[#252526]' :
                    t.role === 'Recruiter' ? 'bg-blue-500 text-white' :
                    t.role === 'Hybrid'    ? 'bg-amber-500 text-white' :
                    'bg-gray-400 text-white'
                  }`}>
                    {t.name === 'Rec. 1' ? 'R1' : t.name === 'Rec. 2' ? 'R2' : t.name[0]}
                  </div>
                  <span className="font-semibold text-[#252526]">{t.name}</span>
                  <span className="text-[10px] text-gray-400 hidden md:inline">
                    {t.role === 'OfficeManager' ? 'Office Mgr' : t.role === 'Hybrid' ? 'Mgr + Rec' : t.role}
                  </span>
                </div>
                <div className="col-span-2 text-center text-blue-700 font-semibold">{t.sourced} <span className="text-[10px] text-gray-400 font-normal">src</span></div>
                <div className="col-span-2 text-center text-green-700 font-semibold">{t.closed} <span className="text-[10px] text-gray-400 font-normal">cls</span></div>
                <div className="col-span-3 text-right pr-3">
                  <span className="text-[#C9A84C] font-bold text-[15px]">{t.credit.toFixed(1)}</span>
                  <span className="text-[10px] text-gray-400 ml-1">credits</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScorecardCell({ label, value, trend, tone }) {
  const labelColor = tone === 'sourced' ? 'text-blue-700' : tone === 'closed' ? 'text-green-700' : 'text-gray-500';
  return (
    <div className="px-4 py-5">
      <div className={`text-[10px] tracking-wider font-semibold ${labelColor}`}>{label.toUpperCase()}</div>
      <div className="text-2xl md:text-3xl font-bold text-[#252526] mt-1">{value}</div>
      <div className={`text-[11px] mt-1 font-semibold ${trend.startsWith('+') ? 'text-green-600' : 'text-gray-400'}`}>{trend} vs prior 4wk</div>
    </div>
  );
}

/* ─────────────── EXCLUSIONS VIEW ─────────────── */
function ExclusionsView({ subTab, setSubTab, canManageAllianceExclusions, canSeeExclusionReasons, effectiveRole, managerOffice, activeUser, isPrincipal }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-[11px] tracking-[0.15em] text-gray-500 font-semibold">RECRUITING EXCLUSIONS</div>
          <div className="text-lg font-bold text-[#252526] mt-0.5">Who we don't pursue</div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-wider rounded ${
          canManageAllianceExclusions ? 'bg-[#252526] text-[#C9A84C]' : 'bg-gray-100 text-gray-600'
        }`}>
          {canManageAllianceExclusions ? <Shield size={11}/> : <Lock size={11}/>}
          {canManageAllianceExclusions ? 'PRINCIPAL · FULL AUTHORITY' : `${effectiveRole === 'OfficeManager' ? managerOffice : 'LOCAL'} · LOCAL ONLY`}
        </div>
      </div>

      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
        {[
          { id: 'offices', label: 'Competitor Offices', count: 19 },
          { id: 'agents',  label: 'Agent Exclusions',  count: 8 },
          { id: 'audit',   label: 'Audit Log',         count: null },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`px-4 md:px-5 py-3 text-[11px] font-bold tracking-[0.1em] transition flex items-center gap-2 whitespace-nowrap ${
              subTab === t.id ? 'bg-white text-[#252526] border-b-2 border-[#C9A84C] -mb-px' : 'text-gray-500 hover:text-[#252526]'
            }`}
          >
            {t.label.toUpperCase()}
            {t.count !== null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${subTab === t.id ? 'bg-[#C9A84C] text-[#252526]' : 'bg-gray-200 text-gray-600'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {subTab === 'offices' && (
        <ExclusionsOfficeSubTab canSeeReasons={canSeeExclusionReasons} canManageAlliance={canManageAllianceExclusions} managerOffice={managerOffice} effectiveRole={effectiveRole} />
      )}
      {subTab === 'agents' && <ExclusionsAgentsSubTab canSeeReasons={canSeeExclusionReasons} />}
      {subTab === 'audit' && <ExclusionsAuditSubTab canSeeReasons={canSeeExclusionReasons} />}
    </div>
  );
}

function ExclusionsOfficeSubTab({ canSeeReasons, canManageAlliance, managerOffice, effectiveRole }) {
  const firms = [
    {
      name: 'Berkshire Hathaway HomeServices',
      offices: [
        { office: 'Wildwood Crest', status: 'alliance', reason: 'CEO relationship with Chuck', by: 'John · Feb 2026' },
        { office: 'Cape May',       status: 'active',   reason: null, by: null },
        { office: 'Ocean City',     status: 'local',    reason: 'OC reciprocity agreement', by: 'Jeff · Mar 2026', scope: 'OC' },
        { office: 'Stone Harbor',   status: 'active',   reason: null, by: null },
      ],
    },
    {
      name: 'Coldwell Banker',
      offices: [
        { office: 'Wildwood Crest', status: 'active', reason: null, by: null },
        { office: 'Cape May',       status: 'local',  reason: 'NCM personal relationship', by: 'Karina · Jan 2026', scope: 'NCM' },
        { office: 'Ocean City',     status: 'active', reason: null, by: null },
        { office: 'Avalon',         status: 'active', reason: null, by: null },
      ],
    },
    {
      name: 'Compass',
      blanket: true,
      offices: [
        { office: 'Cape May',   status: 'alliance', reason: 'Parent-co conflict (Compass acquired)', by: 'John · Nov 2025' },
        { office: 'Ocean City', status: 'alliance', reason: 'Parent-co conflict (Compass acquired)', by: 'John · Nov 2025' },
      ],
    },
  ];

  return (
    <div className="p-4 md:p-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-gray-50 rounded-md px-4 py-3">
          <div className="text-[9px] tracking-wider text-gray-500 font-bold">ACTIVE TARGETS</div>
          <div className="text-xl font-bold text-[#252526] mt-1">181</div>
        </div>
        <div className="bg-red-50 rounded-md px-4 py-3 border border-red-100">
          <div className="text-[9px] tracking-wider text-red-700 font-bold">ALLIANCE-WIDE</div>
          <div className="text-xl font-bold text-red-800 mt-1">7</div>
        </div>
        <div className="bg-amber-50 rounded-md px-4 py-3 border border-amber-100">
          <div className="text-[9px] tracking-wider text-amber-700 font-bold">LOCAL OFFICE</div>
          <div className="text-xl font-bold text-amber-800 mt-1">12</div>
        </div>
        <div className="bg-[#252526] rounded-md px-4 py-3">
          <div className="text-[9px] tracking-wider text-[#C9A84C] font-bold">TOTAL FIRMS</div>
          <div className="text-xl font-bold text-white mt-1">23</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input placeholder="Search brokerage or office..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-[13px]"/>
        </div>
        <select className="px-3 py-2 border border-gray-300 rounded text-[12px] text-gray-700 bg-white">
          <option>All statuses</option>
          <option>Alliance-wide</option>
          <option>Locally excluded</option>
          <option>Active targets</option>
        </select>
      </div>

      <div className="space-y-3">
        {firms.map((f, fi) => (
          <div key={fi} className="border border-gray-200 rounded-md overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Building2 size={13} className="text-gray-500"/>
                <span className="font-bold text-[13px] text-[#252526]">{f.name}</span>
                {f.blanket && (
                  <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-800 rounded font-bold tracking-wider">BLANKET EXCLUSION</span>
                )}
              </div>
              <span className="text-[10px] text-gray-500">{f.offices.length} offices</span>
            </div>
            <div className="divide-y divide-gray-100">
              {f.offices.map((o, oi) => (
                <div key={oi} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition group flex-wrap gap-2">
                  <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <MapPin size={11} className="text-gray-400"/>
                    <span className="text-[13px] text-[#252526] font-medium min-w-[100px]">{o.office}</span>
                    {o.status === 'alliance' && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full">
                        <Ban size={9} className="text-red-700"/>
                        <span className="text-[9px] font-bold tracking-wider text-red-800">ALLIANCE-WIDE</span>
                      </div>
                    )}
                    {o.status === 'local' && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full">
                        <Lock size={9} className="text-amber-700"/>
                        <span className="text-[9px] font-bold tracking-wider text-amber-800">{o.scope} ONLY</span>
                      </div>
                    )}
                    {o.status === 'active' && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full">
                        <Check size={9} className="text-green-700"/>
                        <span className="text-[9px] font-bold tracking-wider text-green-800">ACTIVE TARGET</span>
                      </div>
                    )}
                    {/* Reason — hidden from non-principals for Alliance-wide (Week 4 fix) */}
                    {o.reason && (canSeeReasons || o.status === 'local') && (
                      <span className="text-[11px] text-gray-500 italic">"{o.reason}"</span>
                    )}
                    {o.reason && !canSeeReasons && o.status === 'alliance' && (
                      <span className="text-[10px] text-gray-400 italic flex items-center gap-1">
                        <Lock size={9}/>
                        Reason set by Principals
                      </span>
                    )}
                  </div>
                  {o.by && canSeeReasons && <span className="text-[10px] text-gray-400">{o.by}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!canManageAlliance && (
        <div className="mt-5 bg-blue-50 border border-blue-200 rounded-md px-4 py-3 flex gap-2.5">
          <Lock size={14} className="text-blue-700 flex-shrink-0 mt-0.5"/>
          <div className="text-[12px] text-blue-900 leading-relaxed">
            <span className="font-bold">Local authority only.</span> You can add or remove exclusions for {effectiveRole === 'OfficeManager' ? managerOffice : 'your scope'} only. Alliance-wide exclusions require John or Chuck.
          </div>
        </div>
      )}
    </div>
  );
}

function ExclusionsAgentsSubTab({ canSeeReasons }) {
  const agents = [
    { name: 'Tom Gribbin',   firm: 'RE/MAX · Cape May',    reason: 'Personality fit',              by: 'Karina', expires: 'Oct 2026', days: 178 },
    { name: 'Sarah Beltz',   firm: 'Coldwell Banker · WC', reason: 'Declined 3+ times',            by: 'Jeff',   expires: 'Jun 2026', days: 59 },
    { name: 'Mark Lenahan',  firm: 'Weichert · Ocean City', reason: 'Ethics issue',                by: 'Chuck',  expires: 'Apr 2027', days: 365 },
    { name: 'Diane Patterson', firm: 'Long & Foster · Avalon', reason: 'Personal conflict',        by: 'John',   expires: 'Dec 2026', days: 245 },
    { name: 'Greg Holloway', firm: 'Century 21 Atlantic',  reason: 'Other: prior terminated agent', by: 'John',   expires: 'Never', days: null },
    { name: 'Jennifer Dunn', firm: 'Keller Williams · SH', reason: 'Declined 3+ times',            by: 'Karina', expires: 'Jul 2026', days: 88 },
  ];

  return (
    <div className="p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input placeholder="Search agent..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-[13px]"/>
        </div>
        <button className="bg-[#252526] text-white px-4 py-2 rounded text-[12px] font-bold flex items-center gap-1.5 hover:bg-black transition">
          <Plus size={13}/>
          Flag Agent
        </button>
      </div>

      <div className="border border-gray-200 rounded-md overflow-x-auto">
        <table className="w-full text-[12px] min-w-[560px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[10px] tracking-wider text-gray-600 font-bold">
              <th className="px-4 py-2.5 text-left">AGENT</th>
              <th className="px-4 py-2.5 text-left">CURRENT FIRM</th>
              <th className="px-4 py-2.5 text-left">REASON</th>
              <th className="px-4 py-2.5 text-left">BY</th>
              <th className="px-4 py-2.5 text-right">EXPIRES</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-bold text-[#252526]">{a.name}</td>
                <td className="px-4 py-3 text-gray-600">{a.firm}</td>
                <td className="px-4 py-3 text-gray-700 italic">{a.reason}</td>
                <td className="px-4 py-3 text-gray-500">{a.by}</td>
                <td className="px-4 py-3 text-right">
                  {a.days && a.days < 90 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"/>}
                  <span className={a.days && a.days < 90 ? 'text-amber-700 font-semibold' : 'text-gray-500'}>
                    {a.expires}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExclusionsAuditSubTab({ canSeeReasons }) {
  const events = [
    { date: 'Apr 14, 2026', time: '2:41 PM', user: 'Karina', action: 'added',   target: 'Coldwell Banker · Cape May',        scope: 'NCM office only',        reason: 'Personal relationship' },
    { date: 'Apr 12, 2026', time: '10:15 AM', user: 'John',   action: 'removed', target: 'Agent: Dana Foster',                scope: 'Agent exclusion expired',reason: '12-month auto-expiry reached' },
    { date: 'Apr 8, 2026',  time: '4:22 PM', user: 'Chuck',  action: 'added',   target: 'Agent: Mark Lenahan',               scope: 'Alliance-wide, 12 months',reason: 'Prior ethics issue' },
    { date: 'Apr 3, 2026',  time: '9:07 AM', user: 'Jeff',   action: 'added',   target: 'Berkshire Hathaway · Ocean City',   scope: 'OC office only',         reason: 'OC reciprocity agreement' },
    { date: 'Feb 15, 2026', time: '1:30 PM', user: 'John',   action: 'added',   target: 'Berkshire Hathaway · Wildwood Crest', scope: 'Alliance-wide',        reason: 'CEO relationship with Chuck' },
  ];

  return (
    <div className="p-4 md:p-5">
      <div className="text-[11px] text-gray-500 mb-4">
        Every exclusion change is permanently logged. Exportable for compliance review.
      </div>
      <div className="space-y-0 border-l-2 border-gray-200 ml-2">
        {events.map((e, i) => (
          <div key={i} className="relative pl-5 pb-5 last:pb-0">
            <div className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${e.action === 'added' ? 'bg-red-500' : 'bg-green-500'}`}/>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[11px] text-gray-400 font-mono">{e.date} · {e.time}</span>
              <span className="font-bold text-[#252526] text-[13px]">{e.user}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${
                e.action === 'added' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {e.action.toUpperCase()}
              </span>
              <span className="text-[13px] text-[#252526]">{e.target}</span>
            </div>
            <div className="mt-1 text-[11px] text-gray-600">
              Scope: <span className="font-semibold">{e.scope}</span>
              {canSeeReasons && <> · Reason: <span className="italic">"{e.reason}"</span></>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── DETAIL VIEW (simplified hero per Week 3) ─────────────── */
function DetailView({ prospect, detail, getDisplayRole, userCapabilities, activeUser, currentActorTag, onBack, onCall, onText, onEmail, onLog }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-[#252526] transition mb-4 font-semibold">
        <ChevronLeft size={14}/>
        Back
      </button>

      {/* SIMPLIFIED HERO — 3 rows max */}
      <div className="bg-white rounded-lg border border-gray-200 mb-4 overflow-hidden">
        <div className="px-4 md:px-6 py-4 md:py-5 flex items-start gap-4 flex-wrap">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ${
              prospect.score >= 90 ? 'bg-[#252526] text-[#C9A84C]' :
              prospect.score >= 80 ? 'bg-[#C9A84C] text-[#252526]' :
              'bg-gray-200 text-gray-700'
            }`}>
              {prospect.score}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-[#252526]">{prospect.name}</h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide ${
                prospect.type === 'Experienced' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {prospect.type.toUpperCase()}
              </span>
              {prospect.lastTouch >= 7 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200 tracking-wide">
                  STALE · {prospect.lastTouch}D
                </span>
              )}
            </div>
            <div className="text-[13px] text-gray-600">
              {prospect.currentBrokerage || 'New License'} · {prospect.production || 'No production data'} · {prospect.office} target · Stage: <span className="font-semibold text-[#252526]">{prospect.stage}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[10px] flex-wrap">
              <AttributionBadge prospect={prospect} activeUser={activeUser} getDisplayRole={getDisplayRole}/>
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="px-4 md:px-6 py-3 bg-[#fdfaf0] border-t border-[#C9A84C]/20 flex items-center gap-2 flex-wrap">
          <button onClick={onCall} className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold bg-[#252526] text-white rounded-md hover:bg-black transition">
            <Phone size={14}/>Call
          </button>
          <button onClick={onText} className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold bg-white border border-gray-300 text-[#252526] rounded-md hover:border-[#252526] transition">
            <MessageSquare size={14}/>Text
          </button>
          <button onClick={onEmail} className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold bg-white border border-gray-300 text-[#252526] rounded-md hover:border-[#252526] transition">
            <Mail size={14}/>Email
          </button>
          <div className="flex-1 min-w-0"/>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:text-[#252526]">
            Advance stage →
          </button>
        </div>
      </div>

      {/* Body: timeline + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-4">
          {/* AI Briefing */}
          <div className="bg-[#252526] rounded-lg overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
              <div className="w-1 h-4 bg-[#C9A84C]"/>
              <div className="text-[10px] tracking-[0.2em] text-[#C9A84C] font-bold">AI BRIEFING · PRE-CALL PREP</div>
            </div>
            <div className="px-5 py-4 text-[13px] text-gray-200 leading-relaxed">
              {detail.aiBriefing}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-[10px] tracking-[0.15em] text-gray-500 font-bold">ACTIVITY TIMELINE</div>
                <div className="text-[13px] font-bold text-[#252526] mt-0.5">{detail.activities.length} entries</div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { type: 'note', label: 'Note', icon: StickyNote },
                  { type: 'call', label: 'Call', icon: Phone },
                  { type: 'text', label: 'Text', icon: MessageSquare },
                  { type: 'meeting', label: 'Meeting', icon: Calendar },
                ].map(a => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.type}
                      onClick={() => onLog(a.type)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold bg-white border border-gray-300 rounded hover:border-[#252526] hover:bg-[#252526] hover:text-white transition"
                    >
                      <Icon size={11}/>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-5">
              <div className="border-l-2 border-gray-200 ml-2 space-y-0">
                {detail.activities.map(a => {
                  const typeMap = {
                    note:    { icon: StickyNote,    color: 'bg-gray-400',    label: 'Note' },
                    claim:   { icon: ArrowRightLeft, color: 'bg-[#C9A84C]',  label: 'Claim' },
                    text:    { icon: MessageSquare,  color: 'bg-blue-500',   label: 'Text' },
                    call:    { icon: Phone,          color: 'bg-purple-500', label: 'Call' },
                    intel:   { icon: Sparkles,       color: 'bg-emerald-600',label: 'Intel' },
                    add:     { icon: UserPlus,       color: 'bg-gray-400',   label: 'Added' },
                    meeting: { icon: Calendar,       color: 'bg-indigo-500', label: 'Meeting' },
                  };
                  const t = typeMap[a.type] || typeMap.note;
                  const Icon = t.icon;
                  return (
                    <div key={a.id} className="relative pl-5 pb-4 last:pb-0">
                      <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ${t.color} flex items-center justify-center`}>
                        <Icon size={9} className="text-white"/>
                      </div>
                      <div className="flex items-baseline gap-2 flex-wrap mb-0.5">
                        <span className="text-[10px] text-gray-400 font-mono tracking-wide">{a.date} · {a.time}</span>
                        <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded ${t.color} text-white`}>
                          {t.label.toUpperCase()}
                        </span>
                        <span className="text-[12px] font-bold text-[#252526]">{a.actor}</span>
                        {a.outcome && <span className="text-[10px] text-gray-500 italic">· {a.outcome}</span>}
                        {a.tag && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded tracking-wider">
                            {a.tag.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] text-gray-700 leading-snug">{a.content}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Relationship Map first per critique fix #7 */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:sticky lg:top-4">
            {/* RELATIONSHIP MAP (first) */}
            <div className="px-5 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] tracking-[0.15em] text-gray-500 font-bold">RELATIONSHIP MAP</div>
                <button className="text-[10px] text-[#C9A84C] hover:text-[#b89740] font-bold">+ Add</button>
              </div>
              {detail.relationships.length > 0 ? (
                <div className="space-y-2.5">
                  {detail.relationships.map((r, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className={`w-2 h-2 rounded-full ${
                          r.warmth === 'warm' ? 'bg-red-500' : r.warmth === 'neutral' ? 'bg-amber-500' : 'bg-blue-400'
                        }`}/>
                        <span className="text-[12px] font-bold text-[#252526]">{r.name}</span>
                        <span className="text-[10px] text-gray-400">· {r.role}</span>
                      </div>
                      <div className="text-[11px] text-gray-600 leading-snug pl-4 italic">"{r.context}"</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-gray-400 italic">No connections mapped yet. Who do we know who knows {prospect.name}?</div>
              )}
            </div>

            {/* Production */}
            {detail.production && (
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="text-[10px] tracking-[0.15em] text-gray-500 font-bold mb-3">PRODUCTION · YTD</div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div><div className="text-[9px] text-gray-400 tracking-wider">VOLUME</div><div className="text-[16px] font-bold text-[#252526]">{detail.production.ytd.volume}</div></div>
                  <div><div className="text-[9px] text-gray-400 tracking-wider">UNITS</div><div className="text-[16px] font-bold text-[#252526]">{detail.production.ytd.units}</div></div>
                  <div><div className="text-[9px] text-gray-400 tracking-wider">GCI</div><div className="text-[16px] font-bold text-[#252526]">{detail.production.ytd.gci}</div></div>
                </div>
                <div className="flex items-end gap-0.5 h-10 mb-1">
                  {detail.production.trend.map((v, i) => (
                    <div key={i} className="flex-1 bg-[#C9A84C] rounded-sm" style={{ height: `${(v / 5) * 100}%`, opacity: 0.3 + (i / detail.production.trend.length) * 0.7 }}/>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-gray-400">9 mo trend</span>
                  <span className="text-green-700 font-bold">{detail.production.yoyChange} YoY</span>
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="px-5 py-4 border-b border-gray-200">
              <div className="text-[10px] tracking-[0.15em] text-gray-500 font-bold mb-3">CONTACT</div>
              <div className="space-y-2 text-[12px]">
                <div className="flex items-center gap-2">
                  <Phone size={11} className="text-gray-400"/>
                  <a href={`tel:${detail.contact.phone}`} className="text-[#252526] hover:text-[#C9A84C] font-semibold transition">{detail.contact.phone}</a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={11} className="text-gray-400"/>
                  <a href={`mailto:${detail.contact.email}`} className="text-[#252526] hover:text-[#C9A84C] transition break-all">{detail.contact.email}</a>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={11} className="text-gray-400 mt-0.5 flex-shrink-0"/>
                  <span className="text-gray-700 leading-snug">{detail.contact.address}</span>
                </div>
              </div>
            </div>

            {/* More Info (collapsible) */}
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="w-full px-5 py-3.5 text-left hover:bg-gray-50 transition flex items-center justify-between group"
            >
              <div>
                <div className="text-[10px] tracking-[0.15em] text-gray-500 font-bold">MORE INFO</div>
                <div className="text-[11px] text-gray-500 mt-0.5">License · Notes · Actions</div>
              </div>
              <ChevronDown size={14} className={`text-gray-400 transition-transform ${sidebarExpanded ? 'rotate-180' : ''}`}/>
            </button>

            {sidebarExpanded && (
              <div className="border-t border-gray-200">
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="text-[10px] tracking-wider text-gray-500 font-bold mb-2">LICENSE</div>
                  <div className="space-y-1 text-[12px]">
                    <div className="flex justify-between"><span className="text-gray-500">State</span><span className="text-[#252526] font-semibold">{detail.contact.licensed}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">License #</span><span className="text-[#252526] font-mono text-[11px]">{detail.contact.licenseNumber}</span></div>
                  </div>
                </div>

                {detail.notes.length > 0 && (
                  <div className="px-5 py-4 border-b border-gray-100">
                    <div className="text-[10px] tracking-wider text-gray-500 font-bold mb-2">PINNED NOTES</div>
                    <div className="space-y-2">
                      {detail.notes.map(n => (
                        <div key={n.id} className="bg-yellow-50 border border-yellow-200 rounded p-2.5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] px-1.5 py-0.5 bg-yellow-200 text-yellow-900 font-bold rounded tracking-wider">
                              {n.tag.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-500">· {n.author} · {n.date}</span>
                          </div>
                          <div className="text-[12px] text-gray-800 leading-snug">{n.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="px-5 py-4">
                  <div className="text-[10px] tracking-wider text-gray-500 font-bold mb-2">ACTIONS</div>
                  <div className="space-y-1">
                    <SidebarAction label="Reassign prospect" />
                    <SidebarAction label="Flag as not a fit" />
                    <SidebarAction label="Convert to hire" gold />
                    <SidebarAction label="Archive (not interested)" danger />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarAction({ label, danger, gold }) {
  return (
    <button className={`w-full text-left text-[12px] py-1.5 px-2 rounded transition flex items-center justify-between ${
      danger ? 'text-red-700 hover:bg-red-50' : gold ? 'text-[#C9A84C] hover:bg-[#fdfaf0] font-semibold' : 'text-gray-700 hover:bg-gray-50'
    }`}>
      <span>{label}</span>
      <ChevronRight size={12}/>
    </button>
  );
}

/* ─────────────── CONSOLIDATED INTELLIGENCE PANEL (tabbed, per critique) ─────────────── */
function IntelligencePanel({ activeTab, setActiveTab, morningBriefing, briefingLoading, onRegenerateBriefing, chatMessages, setChatMessages, aiInput, setAiInput, actionList, staleProspects, activeUser, effectiveRole, claimNotifications, automationStatus, setAutomationStatus, setUploadModal }) {
  const handleAiSend = () => {
    if (!aiInput.trim()) return;
    const userMsg = { role: 'user', text: aiInput };
    const q = aiInput.toLowerCase();
    let reply = `I can help with prioritization, re-engagement drafts, or quick stats on your pipeline.`;
    if (q.includes('priorit') || q.includes('who') || q.includes('first')) {
      reply = actionList[0] ? `Start with ${actionList[0].name}. Score ${actionList[0].score}. ${actionList[0].reason}` : `No prospects to prioritize right now.`;
    } else if (q.includes('stale')) {
      reply = `${staleProspects.length} stale lead${staleProspects.length !== 1 ? 's' : ''}: ${staleProspects.map(p => p.name).join(', ')}.`;
    }
    setChatMessages([...chatMessages, userMsg, { role: 'ai', text: reply }]);
    setAiInput('');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden lg:sticky lg:top-4">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {[
          { id: 'briefing', label: 'Briefing', icon: Zap },
          { id: 'ai',       label: 'Ask AI', icon: Sparkles },
          { id: 'activity', label: 'Activity', icon: BellRing },
          { id: 'afi',      label: 'Field Intel', icon: FileText },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 px-2 py-2.5 text-[10px] font-bold tracking-wider transition flex items-center justify-center gap-1 ${
                activeTab === t.id ? 'bg-white text-[#252526] border-b-2 border-[#C9A84C] -mb-px' : 'text-gray-500 hover:text-[#252526]'
              }`}
            >
              <Icon size={11}/>
              {t.label.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* BRIEFING tab - proactive morning intelligence */}
      {activeTab === 'briefing' && (
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-[#C9A84C]"/>
              <div className="text-[10px] tracking-[0.2em] text-gray-600 font-bold">MORNING BRIEFING</div>
            </div>
            <button onClick={onRegenerateBriefing} className="text-[10px] text-gray-400 hover:text-[#C9A84C] flex items-center gap-1 transition">
              <RefreshCw size={10} className={briefingLoading ? 'animate-spin' : ''}/>
              Regenerate
            </button>
          </div>
          {briefingLoading ? (
            <div className="text-[13px] text-gray-400 italic">Analyzing your pipeline...</div>
          ) : morningBriefing ? (
            <div className="text-[13px] text-gray-700 leading-relaxed mb-4">{morningBriefing}</div>
          ) : (
            <div className="text-[13px] text-gray-400">Click Regenerate to get your morning briefing.</div>
          )}

          <div className="border-t border-gray-100 pt-3 mt-3">
            <div className="text-[10px] tracking-wider text-gray-500 font-bold mb-2">QUICK STATS</div>
            <div className="space-y-1.5 text-[12px]">
              <div className="flex items-center justify-between"><span className="text-gray-600">Active prospects</span><span className="font-bold text-[#252526]">{actionList.length}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-600">Stale leads (7+ days)</span><span className={`font-bold ${staleProspects.length > 0 ? 'text-red-600' : 'text-[#252526]'}`}>{staleProspects.length}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-600">Top score today</span><span className="font-bold text-[#C9A84C]">{actionList[0]?.score || '—'}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* AI chat */}
      {activeTab === 'ai' && (
        <div className="bg-[#252526] text-white">
          <div className="p-4 max-h-80 overflow-y-auto space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-[13px] text-gray-400 italic">Ask anything about your pipeline — prioritization, re-engagement, stats.</div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`text-[13px] leading-relaxed ${m.role === 'ai' ? 'text-gray-200' : 'text-[#C9A84C] text-right'}`}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['Who should I call first?', 'Show stale leads'].map(q => (
                <button key={q} onClick={() => setAiInput(q)} className="text-[10px] px-2 py-1 bg-gray-800 text-gray-300 rounded border border-gray-700 hover:border-[#C9A84C] hover:text-[#C9A84C] transition">
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiSend()}
                placeholder="Ask about your pipeline..."
                className="flex-1 bg-gray-900 text-white text-[13px] px-3 py-2 rounded border border-gray-700 focus:border-[#C9A84C] outline-none"
              />
              <button onClick={handleAiSend} className="bg-[#C9A84C] text-[#252526] px-3 rounded hover:bg-[#b89740] transition">
                <Send size={14}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity */}
      {activeTab === 'activity' && (
        <div>
          <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2">
            <div className="relative">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"/>
              <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-500 animate-ping opacity-60"/>
            </div>
            <div className="text-[10px] tracking-[0.15em] text-gray-600 font-bold">TEAM ACTIVITY · RELEVANT TO YOU</div>
          </div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {claimNotifications.slice().reverse().map((n, i) => (
              <div key={`c-${i}`} className="px-4 py-2.5 bg-[#fdfaf0]/40">
                <div className="text-[12px]">
                  <span className="font-bold text-[#252526]">{n.to}</span> claimed <span className="font-semibold text-[#252526]">{n.prospectName}</span> from <span className="font-semibold text-[#252526]">{n.from}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">{n.timestamp} · just now</div>
              </div>
            ))}
            {/* Example: relevance-filtered events */}
            <div className="px-4 py-2.5">
              <div className="text-[12px]">
                <span className="font-bold text-[#252526]">Chuck</span> added <span className="font-semibold text-[#252526]">Jessica Orlov</span> → assigned <span className="font-semibold text-[#252526]">{activeUser}</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">2 days ago</div>
            </div>
          </div>
        </div>
      )}

      {/* Alliance Field Intelligence - simplified */}
      {activeTab === 'afi' && (
        <div>
          <div className="bg-gradient-to-br from-[#252526] to-[#1a1a1b] px-5 py-4 relative">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-[#C9A84C]"/>
              <div className="text-[10px] tracking-[0.2em] text-[#C9A84C] font-bold">ALLIANCE FIELD INTELLIGENCE</div>
            </div>
            <div className="text-white text-[14px] font-bold mt-1">Weekly Briefing · Week 16</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"/>
              <span className="text-[10px] text-gray-300">Auto-refreshed Mon 6:14 AM</span>
            </div>
          </div>

          <div className="grid grid-cols-4 divide-x divide-gray-100">
            <div className="px-2 py-3 text-center"><div className="text-[9px] text-gray-500 font-bold">NEW LIC</div><div className="text-lg font-bold text-[#252526]">3</div></div>
            <div className="px-2 py-3 text-center"><div className="text-[9px] text-gray-500 font-bold">MOVED</div><div className="text-lg font-bold text-[#252526]">2</div></div>
            <div className="px-2 py-3 text-center"><div className="text-[9px] text-gray-500 font-bold">↑ PROD</div><div className="text-lg font-bold text-green-700">4</div></div>
            <div className="px-2 py-3 text-center"><div className="text-[9px] text-gray-500 font-bold">↓ PROD</div><div className="text-lg font-bold text-amber-700">3</div></div>
          </div>

          <div className="p-4 border-t border-gray-100">
            <div className="space-y-2">
              <FieldIntelSummaryRow name="Michael Tan" detail="New license · Cape May resident" type="NEW"/>
              <FieldIntelSummaryRow name="David Chen" detail="KW → Weichert · 8 units YTD" type="MOVED"/>
              <FieldIntelSummaryRow name="Linda Fernandez" detail="+52% YoY at RE/MAX" type="SURGE"/>
              <FieldIntelSummaryRow name="Gary Walsh" detail="-38% YoY at CB" type="SLIP"/>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <button onClick={() => setUploadModal(true)} className="text-[10px] text-gray-500 hover:text-[#252526] font-bold tracking-wider transition flex items-center gap-1">
              <UploadCloud size={10}/>
              Manual upload
            </button>
            <button className="text-[10px] text-[#252526] hover:text-[#C9A84C] font-bold tracking-wider transition">
              FULL BRIEFING →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldIntelSummaryRow({ name, detail, type }) {
  const typeStyles = {
    NEW:    'bg-blue-100 text-blue-800',
    MOVED:  'bg-amber-100 text-amber-800',
    SURGE:  'bg-green-100 text-green-800',
    SLIP:   'bg-red-100 text-red-800',
  };
  return (
    <div className="flex items-center justify-between hover:bg-gray-50 transition px-2 py-1.5 rounded group cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-[12px] text-[#252526]">{name}</span>
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wider ${typeStyles[type] || typeStyles.NEW}`}>{type}</span>
        </div>
        <div className="text-[10px] text-gray-600 mt-0.5">{detail}</div>
      </div>
      <button className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-[#C9A84C] transition">+ ADD</button>
    </div>
  );
}

/* ─────────────── RETENTION VIEW (Week 6 — full new tab) ─────────────── */
function RetentionView({ data, effectiveRole, managerOffice, isPrincipal }) {
  const [riskFilter, setRiskFilter] = useState('all');

  const filtered = data.atRiskAgents.filter(a => {
    if (effectiveRole === 'OfficeManager' && a.office !== managerOffice) return false;
    if (riskFilter !== 'all' && a.riskLevel !== riskFilter) return false;
    return true;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-[11px] tracking-[0.15em] text-gray-500 font-semibold">AT-RISK AGENTS</div>
              <div className="text-lg font-bold text-[#252526] mt-0.5">{filtered.length} agents need attention</div>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded p-0.5">
              {['all', 'critical', 'high', 'medium'].map(r => (
                <button
                  key={r}
                  onClick={() => setRiskFilter(r)}
                  className={`px-2.5 py-1 text-[10px] font-bold tracking-wider rounded transition ${
                    riskFilter === r ? 'bg-white text-[#252526] shadow-sm' : 'text-gray-500 hover:text-[#252526]'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map(a => (
              <div key={a.id} className="px-4 md:px-6 py-4 hover:bg-gray-50 transition group">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${
                    a.riskLevel === 'critical' ? 'bg-red-100 text-red-800' :
                    a.riskLevel === 'high' ? 'bg-amber-100 text-amber-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {a.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-bold text-[#252526] text-[14px]">{a.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold tracking-wider ${
                        a.riskLevel === 'critical' ? 'bg-red-100 text-red-800' :
                        a.riskLevel === 'high' ? 'bg-amber-100 text-amber-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>{a.riskLevel.toUpperCase()} RISK</span>
                      <span className="text-[11px] text-gray-500">· {a.office}</span>
                    </div>
                    <div className="text-[12px] text-gray-600">{a.flagReason}</div>
                  </div>
                  {a.coaching ? (
                    <div className="text-[11px] text-green-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12}/>
                      Coaching {a.coaching}
                    </div>
                  ) : (
                    <button className="text-[11px] font-bold text-[#C9A84C] hover:text-white border border-[#C9A84C] hover:bg-[#C9A84C] rounded px-3 py-1.5 transition">
                      Schedule coaching
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-6 py-12 text-center text-gray-400 text-[13px]">
                No agents match this filter. {effectiveRole === 'OfficeManager' && `Your ${managerOffice} office is in good shape.`}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-[10px] tracking-[0.15em] text-gray-500 font-bold mb-3">RETENTION OVERVIEW</div>
          <div className="space-y-3">
            <OverviewStat label="Total agents" value={data.totals.total}/>
            <OverviewStat label="Active producers" value={data.totals.active} color="text-green-700"/>
            <OverviewStat label="At-risk (H/C)" value={data.totals.atRiskHigh} color="text-red-700"/>
            <OverviewStat label="At-risk (M)" value={data.totals.atRiskMedium} color="text-amber-700"/>
            <div className="border-t border-gray-100 pt-3">
              <OverviewStat label="YTD retained" value={data.totals.ytdRetained} color="text-green-700"/>
              <OverviewStat label="YTD terms" value={data.totals.ytdTerms} color="text-red-700"/>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="text-[10px] tracking-[0.15em] text-gray-500 font-bold mb-3">12-MONTH HEADCOUNT</div>
          <div className="flex items-end gap-1 h-16">
            {data.trend.map((v, i) => (
              <div key={i} className="flex-1 bg-[#C9A84C] rounded-sm" style={{ height: `${((v - 270) / 10) * 100}%`, opacity: i === data.trend.length - 1 ? 1 : 0.5 }}/>
            ))}
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2">
            <span>Apr 25</span>
            <span className="font-bold text-[#252526]">{data.totals.total} now</span>
            <span>Apr 26</span>
          </div>
        </div>

        <div className="bg-[#252526] rounded-lg p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-[#C9A84C]"/>
            <div className="text-[10px] tracking-[0.2em] text-[#C9A84C] font-bold">COACHING INTELLIGENCE</div>
          </div>
          <div className="text-[13px] text-gray-200 leading-relaxed">
            {effectiveRole === 'OfficeManager' ? (
              <>Your {managerOffice} office has {filtered.filter(a => a.riskLevel === 'critical').length} critical-risk agents. Schedule one-on-ones this week to discuss business plans and blockers.</>
            ) : (
              <>WC office shows the highest attrition risk — 4 critical, 2 high. Suggested action: schedule manager meeting with Steve this week to review each agent's business plan.</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewStat({ label, value, color = 'text-[#252526]' }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-gray-600">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODALS
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── SEARCH MODAL (cmd+K) ─── */
function SearchModal({ query, setQuery, results, onSelect, onClose, getDisplayRole }) {
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[10vh] px-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
          <Search size={16} className="text-gray-400"/>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search prospects, brokerages, offices..."
            className="flex-1 text-[14px] outline-none"
          />
          <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500">ESC</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <div className="px-6 py-8 text-center text-[13px] text-gray-400">No matches.</div>
          )}
          {!query.trim() && (
            <div className="px-6 py-8 text-center text-[13px] text-gray-400">Start typing to search across all prospects.</div>
          )}
          {results.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full px-4 py-3 hover:bg-gray-50 transition flex items-center gap-3 text-left"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] flex-shrink-0 ${
                p.score >= 90 ? 'bg-[#252526] text-[#C9A84C]' :
                p.score >= 80 ? 'bg-[#C9A84C] text-[#252526]' :
                'bg-gray-200 text-gray-700'
              }`}>{p.score}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] text-[#252526]">{p.name}</div>
                <div className="text-[11px] text-gray-500">{p.currentBrokerage || 'New License'} · {p.office} · {p.stage}</div>
              </div>
              <span className="text-[10px] text-gray-400">{p.assignedTo}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── SCRIPT MODAL (outreach with send buttons) ─── */
function ScriptModal({ scriptModal, close, generateScript, integrations, handleSend }) {
  const [content, setContent] = useState(generateScript(scriptModal.prospect, scriptModal.channel));
  const channelLabel = scriptModal.channel.charAt(0).toUpperCase() + scriptModal.channel.slice(1);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-wider text-gray-500 font-bold">AI-GENERATED {channelLabel.toUpperCase()} SCRIPT</div>
            <div className="text-lg font-bold text-[#252526]">{scriptModal.prospect.name}</div>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-[#252526]"><X size={18}/></button>
        </div>
        <div className="p-6">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full h-56 text-[13px] p-4 border border-gray-300 rounded-md focus:border-[#C9A84C] outline-none font-mono leading-relaxed resize-none"
          />
          <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
            <Sparkles size={10}/>
            Generated from prospect intel + your signature. Edit before sending.
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center gap-2 flex-wrap">
          <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
            {scriptModal.channel === 'email' ? (
              integrations.gmail.connected ? (
                <><CheckCircle2 size={11} className="text-green-600"/><span>Gmail · {integrations.gmail.account}</span></>
              ) : (
                <><AlertTriangle size={11} className="text-amber-600"/><span>Gmail not connected</span></>
              )
            ) : (
              integrations.openphone.connected ? (
                <><CheckCircle2 size={11} className="text-green-600"/><span>OpenPhone · {integrations.openphone.number}</span></>
              ) : (
                <><AlertTriangle size={11} className="text-amber-600"/><span>OpenPhone not connected</span></>
              )
            )}
          </div>
          <div className="flex-1 min-w-0"/>
          <button onClick={close} className="text-[12px] text-gray-500 hover:text-[#252526] px-4 py-2">Cancel</button>
          <button
            onClick={() => handleSend(scriptModal.prospect, scriptModal.channel, content)}
            className="bg-[#C9A84C] text-[#252526] px-5 py-2 rounded-md text-[13px] font-bold flex items-center gap-2 hover:bg-[#b89740] transition"
          >
            {scriptModal.channel === 'call' ? <PhoneCall size={13}/> : scriptModal.channel === 'text' ? <Smartphone size={13}/> : <Send size={13}/>}
            {scriptModal.channel === 'call' ? 'Start call' : scriptModal.channel === 'text' ? 'Send text' : 'Send email'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── CONFIRM OUTREACH (post-send log prompt) ─── */
function ConfirmOutreachModal({ data, close, openLog }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="text-[11px] tracking-wider text-gray-500 font-bold mb-2">OUTREACH SENT</div>
          <div className="text-lg font-bold text-[#252526] mb-1">Did you reach {data.prospect.name}?</div>
          <div className="text-[12px] text-gray-600 leading-relaxed">We'll log this to their activity timeline so your team sees the touch. Optional: add a note about how it went.</div>
          <div className="flex gap-2 mt-5">
            <button onClick={openLog} className="flex-1 px-4 py-2.5 text-[12px] font-bold bg-[#252526] text-white rounded-md hover:bg-black transition">
              Log with notes
            </button>
            <button onClick={close} className="flex-1 px-4 py-2.5 text-[12px] font-bold border border-gray-300 text-gray-700 rounded-md hover:border-[#252526] transition">
              Just log as sent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ADD PROSPECT MODAL ─── */
function AddProspectModal({ close, currentActorTag }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-lg font-bold text-[#252526]">Add Prospect</div>
          <button onClick={close} className="text-gray-400 hover:text-[#252526]"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="text-[10px] tracking-wider text-gray-500 font-bold">FULL NAME</label>
            <input className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[13px] focus:border-[#C9A84C] outline-none"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] tracking-wider text-gray-500 font-bold">TYPE</label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[13px]">
                <option>Experienced</option>
                <option>New License</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] tracking-wider text-gray-500 font-bold">OFFICE</label>
              <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[13px]">
                <option>NCM</option>
                <option>OC</option>
                <option>WC</option>
                <option>AV</option>
                <option>SH</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] tracking-wider text-gray-500 font-bold">CURRENT BROKERAGE</label>
            <input className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[13px] focus:border-[#C9A84C] outline-none" placeholder="Leave blank for new license"/>
          </div>
          <div>
            <label className="text-[10px] tracking-wider text-gray-500 font-bold">SOURCE</label>
            <select className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[13px]">
              <option>Referral</option>
              <option>MarketView</option>
              <option>Field Intel</option>
              <option>LinkedIn</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] tracking-wider text-gray-500 font-bold">INITIAL NOTE (OPTIONAL)</label>
            <textarea className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[13px] h-20 resize-none focus:border-[#C9A84C] outline-none" placeholder="Why should we pursue this prospect?"/>
          </div>
          <div className="bg-gray-50 rounded px-3 py-2 text-[11px] text-gray-500 flex items-center gap-2">
            <User size={11}/>
            Adding as <span className="font-bold text-[#252526]">{currentActorTag}</span>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button onClick={close} className="text-[12px] text-gray-500 px-4 py-2">Cancel</button>
          <button onClick={close} className="bg-[#C9A84C] text-[#252526] px-5 py-2 rounded-md text-[13px] font-bold hover:bg-[#b89740] transition">
            Add to pipeline
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── UPLOAD MODAL (manual MVB CSV fallback) ─── */
function UploadModal({ close }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-wider text-gray-500 font-bold">MANUAL UPLOAD · FALLBACK</div>
            <div className="text-lg font-bold text-[#252526]">Upload MarketView CSV</div>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-[#252526]"><X size={18}/></button>
        </div>
        <div className="p-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg px-6 py-10 text-center hover:border-[#C9A84C] transition cursor-pointer">
            <UploadCloud size={28} className="text-gray-400 mx-auto mb-3"/>
            <div className="text-[13px] text-gray-600 font-semibold">Drag CSV here or click to browse</div>
            <div className="text-[11px] text-gray-400 mt-1">Accepts .csv from MarketView Broker export</div>
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3 text-[11px] text-blue-900 leading-relaxed">
            <div className="font-bold mb-1">When to use this:</div>
            The weekly auto-pull normally handles this. Use manual upload if automation fails or you need a mid-week refresh. Data gets tagged with its source MLS.
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button onClick={close} className="text-[12px] text-gray-500 px-4 py-2">Cancel</button>
          <button className="bg-[#252526] text-white px-5 py-2 rounded-md text-[13px] font-bold hover:bg-black transition">Process CSV</button>
        </div>
      </div>
    </div>
  );
}

/* ─── CLAIM MODAL ─── */
function ClaimModal({ claimModal, close, activeUser, currentActorTag, getDisplayRole, userCapabilities, confirmClaim }) {
  const [reason, setReason] = useState('');
  const fromUser = claimModal.prospect.assignedTo;
  const fromClean = fromUser.replace(/ \(.+\)$/, '');
  const fromRole = getDisplayRole(fromClean);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-lg font-bold text-[#252526]">Claim Prospect</div>
          <button onClick={close} className="text-gray-400 hover:text-[#252526]"><X size={18}/></button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5 bg-gray-50 rounded-md px-4 py-3">
            <div className="text-center flex-1">
              <div className="text-[9px] tracking-wider text-gray-500 font-bold">FROM</div>
              <div className="text-[13px] font-bold text-[#252526] mt-1">{fromUser}</div>
              <div className="text-[9px] text-gray-400 tracking-wider">{fromRole.toUpperCase()}</div>
            </div>
            <ArrowRightLeft size={18} className="text-[#C9A84C]"/>
            <div className="text-center flex-1">
              <div className="text-[9px] tracking-wider text-gray-500 font-bold">TO</div>
              <div className="text-[13px] font-bold text-[#C9A84C] mt-1">{currentActorTag}</div>
              <div className="text-[9px] text-gray-400 tracking-wider">YOU</div>
            </div>
          </div>
          <div className="text-[13px] text-gray-700 mb-4 leading-relaxed">
            Claiming <span className="font-bold text-[#252526]">{claimModal.prospect.name}</span> will reassign to you. Original sourcer keeps credit on leaderboard. {fromUser} gets notified.
          </div>
          <label className="text-[10px] tracking-wider text-gray-500 font-bold">REASON FOR CLAIM</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder='e.g. "I have a warm intro via Nichole" or "Closer to my office"'
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[13px] h-20 resize-none focus:border-[#C9A84C] outline-none"
          />
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button onClick={close} className="text-[12px] text-gray-500 px-4 py-2">Cancel</button>
          <button
            onClick={() => confirmClaim(reason || 'No reason provided')}
            className="bg-[#C9A84C] text-[#252526] px-5 py-2 rounded-md text-[13px] font-bold hover:bg-[#b89740] transition"
          >
            Confirm claim
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── PASS MODAL ─── */
function PassModal({ passModal, close, activeUser, userCapabilities, getDisplayRole, confirmPass }) {
  const [toUser, setToUser] = useState('');
  const [reason, setReason] = useState('');
  const recipients = Object.keys(userCapabilities).filter(u => u !== activeUser);
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="text-lg font-bold text-[#252526]">Pass to Teammate</div>
          <button onClick={close} className="text-gray-400 hover:text-[#252526]"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-3">
          <div className="text-[13px] text-gray-700 leading-relaxed">
            Pass <span className="font-bold text-[#252526]">{passModal.prospect.name}</span> to another team member. You'll keep sourcing credit.
          </div>
          <div>
            <label className="text-[10px] tracking-wider text-gray-500 font-bold">PASS TO</label>
            <select
              value={toUser}
              onChange={e => setToUser(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[13px]"
            >
              <option value="">Select teammate...</option>
              {recipients.map(u => (
                <option key={u} value={u}>{u} · {getDisplayRole(u)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] tracking-wider text-gray-500 font-bold">REASON (OPTIONAL)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Why the handoff?"
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[13px] h-20 resize-none focus:border-[#C9A84C] outline-none"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button onClick={close} className="text-[12px] text-gray-500 px-4 py-2">Cancel</button>
          <button
            disabled={!toUser}
            onClick={() => confirmPass(toUser, reason)}
            className="bg-[#C9A84C] text-[#252526] px-5 py-2 rounded-md text-[13px] font-bold hover:bg-[#b89740] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Pass prospect
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── LOG ACTIVITY MODAL ─── */
function LogActivityModal({ modal, close, currentActorTag, confirmLog }) {
  const [content, setContent] = useState(modal.preFilledContent || '');
  const [outcome, setOutcome] = useState('');
  const labels = {
    note: 'Note',
    call: 'Call',
    text: 'Text',
    email: 'Email',
    meeting: 'Meeting',
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-wider text-gray-500 font-bold">LOG ACTIVITY</div>
            <div className="text-lg font-bold text-[#252526]">{labels[modal.activityType] || 'Note'}</div>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-[#252526]"><X size={18}/></button>
        </div>
        <div className="p-6 space-y-3">
          {(modal.activityType === 'call' || modal.activityType === 'text' || modal.activityType === 'email') && (
            <div>
              <label className="text-[10px] tracking-wider text-gray-500 font-bold">OUTCOME</label>
              <select
                value={outcome}
                onChange={e => setOutcome(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[13px]"
              >
                <option value="">Select outcome...</option>
                <option>Connected · positive</option>
                <option>Connected · neutral</option>
                <option>Connected · not interested</option>
                <option>Voicemail</option>
                <option>No answer</option>
                <option>Sent · awaiting reply</option>
              </select>
            </div>
          )}
          <div>
            <label className="text-[10px] tracking-wider text-gray-500 font-bold">NOTES</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What happened? Any commitments, pain points, or follow-up needed?"
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded text-[13px] h-24 resize-none focus:border-[#C9A84C] outline-none"
            />
          </div>
          <div className="bg-gray-50 rounded px-3 py-2 text-[11px] text-gray-500 flex items-center gap-2">
            <User size={11}/>
            Logging as <span className="font-bold text-[#252526]">{currentActorTag}</span>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex gap-2 justify-end">
          <button onClick={close} className="text-[12px] text-gray-500 px-4 py-2">Cancel</button>
          <button onClick={confirmLog} className="bg-[#C9A84C] text-[#252526] px-5 py-2 rounded-md text-[13px] font-bold hover:bg-[#b89740] transition">
            Log activity
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── BULK ACTION MODAL (Week 7) ─── */
function BulkActionModal({ selectedCount, close, clearSelection, onDone }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={close}>
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-wider text-gray-500 font-bold">BULK ACTIONS</div>
            <div className="text-lg font-bold text-[#252526]">{selectedCount} prospects selected</div>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-[#252526]"><X size={18}/></button>
        </div>
        <div className="p-2">
          {[
            { label: 'Reassign to teammate',        icon: ArrowRightLeft, action: 'Reassign' },
            { label: 'Send bulk email',             icon: Mail,            action: 'Bulk email' },
            { label: 'Send bulk text',              icon: MessageSquare,   action: 'Bulk text' },
            { label: 'Advance stage',               icon: TrendingUp,      action: 'Stage advance' },
            { label: 'Mark as stale · archive',     icon: Clock,           action: 'Archive' },
            { label: 'Export selected to CSV',      icon: FileText,        action: 'Export' },
          ].map((a, i) => {
            const Icon = a.icon;
            return (
              <button
                key={i}
                onClick={() => onDone(a.action)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition flex items-center gap-3 rounded"
              >
                <Icon size={14} className="text-gray-500"/>
                <span className="text-[13px] text-[#252526] font-semibold">{a.label}</span>
                <ChevronRight size={12} className="text-gray-400 ml-auto"/>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
