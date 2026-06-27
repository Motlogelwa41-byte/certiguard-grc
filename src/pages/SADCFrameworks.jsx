import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Plus, Download, CheckCircle, Clock, BookOpen, Globe, Star, ChevronDown, ChevronUp, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

// ─── SADC Framework Library ────────────────────────────────────────────────
const SADC_LIBRARY = [
  {
    id: "popia",
    region: "South Africa",
    flag: "🇿🇦",
    name: "POPIA",
    full_name: "Protection of Personal Information Act",
    version: "2013 (Effective 2021)",
    category: "Data Privacy",
    authority: "Information Regulator (South Africa)",
    description: "South Africa's primary data protection legislation modelled on GDPR principles. Mandatory for any entity processing personal information in South Africa.",
    mandatory: true,
    controls_count: 48,
    key_requirements: ["Lawful processing conditions", "Data subject rights", "Security safeguards", "Breach notification (72h)", "PAIA alignment", "Trans-border data flows"],
    related_international: ["GDPR", "ISO 27001"],
    tags: ["privacy", "data protection", "south africa", "mandatory"],
  },
  {
    id: "fsra_bw",
    region: "Botswana",
    flag: "🇧🇼",
    name: "FSRA Cyber Rules",
    full_name: "Financial Services Regulatory Authority Cyber Rules",
    version: "2021",
    category: "Financial Services",
    authority: "FSRA Botswana",
    description: "Cybersecurity requirements for regulated financial entities in Botswana including banks, insurers, and capital market participants.",
    mandatory: true,
    controls_count: 34,
    key_requirements: ["Cyber risk governance", "Incident response plans", "Third-party risk management", "Penetration testing", "Business continuity", "SIEM implementation"],
    related_international: ["ISO 27001", "NIST CSF"],
    tags: ["financial services", "botswana", "cyber", "mandatory"],
  },
  {
    id: "dpa_zw",
    region: "Zimbabwe",
    flag: "🇿🇼",
    name: "Zimbabwe DPA",
    full_name: "Data Protection Act (Chapter 11:22)",
    version: "2021",
    category: "Data Privacy",
    authority: "Postal & Telecommunications Regulatory Authority (POTRAZ)",
    description: "Zimbabwe's data protection legislation establishing rights of data subjects and obligations for data controllers processing personal data.",
    mandatory: true,
    controls_count: 38,
    key_requirements: ["Data subject consent", "Registration with POTRAZ", "Data localisation requirements", "Security measures", "Cross-border transfer controls", "Breach reporting"],
    related_international: ["GDPR", "POPIA"],
    tags: ["privacy", "zimbabwe", "mandatory"],
  },
  {
    id: "cybersecurity_zw",
    region: "Zimbabwe",
    flag: "🇿🇼",
    name: "Zimbabwe Cyber Act",
    full_name: "Cyber & Data Protection Act",
    version: "2021",
    category: "Cybersecurity",
    authority: "Ministry of ICT (Zimbabwe)",
    description: "Comprehensive cybersecurity legislation addressing cybercrime, electronic evidence, and critical infrastructure protection in Zimbabwe.",
    mandatory: true,
    controls_count: 29,
    key_requirements: ["Critical infrastructure protection", "Cybercrime prevention", "Electronic evidence", "Computer emergency response", "Encryption standards"],
    related_international: ["Budapest Convention", "AU Convention"],
    tags: ["cybersecurity", "zimbabwe", "mandatory"],
  },
  {
    id: "cbk_kenya",
    region: "Kenya",
    flag: "🇰🇪",
    name: "CBK Cyber Guidelines",
    full_name: "Central Bank of Kenya Cybersecurity Guidelines",
    version: "2023",
    category: "Financial Services",
    authority: "Central Bank of Kenya",
    description: "Mandatory cybersecurity framework for all institutions regulated by the Central Bank of Kenya covering risk governance, technical controls, and incident reporting.",
    mandatory: true,
    controls_count: 52,
    key_requirements: ["Board-level cyber governance", "Cyber risk appetite", "Vendor risk management", "Threat intelligence sharing", "24h incident reporting", "Annual cyber assessments"],
    related_international: ["ISO 27001", "PCI DSS", "NIST CSF"],
    tags: ["financial services", "kenya", "cyber", "mandatory"],
  },
  {
    id: "dpa_ke",
    region: "Kenya",
    flag: "🇰🇪",
    name: "Kenya DPA",
    full_name: "Data Protection Act (Kenya)",
    version: "2019",
    category: "Data Privacy",
    authority: "Office of the Data Protection Commissioner",
    description: "Kenya's data protection law establishing a comprehensive framework for personal data processing, storage, and transfer.",
    mandatory: true,
    controls_count: 41,
    key_requirements: ["Data controller registration", "Privacy impact assessments", "Data subject rights (access, erasure)", "72h breach notification", "Privacy by design", "DPO appointment"],
    related_international: ["GDPR", "POPIA"],
    tags: ["privacy", "kenya", "mandatory"],
  },
  {
    id: "tan_dpa",
    region: "Tanzania",
    flag: "🇹🇿",
    name: "Tanzania DPA",
    full_name: "Tanzania Personal Data Protection Act",
    version: "2022",
    category: "Data Privacy",
    authority: "Tanzania Communications Regulatory Authority (TCRA)",
    description: "Tanzania's personal data protection law establishing rights of data subjects and obligations of controllers and processors.",
    mandatory: true,
    controls_count: 35,
    key_requirements: ["Lawful basis for processing", "Data subject rights", "Security measures", "Breach notification", "Cross-border transfers", "TCRA registration"],
    related_international: ["GDPR", "AU Data Policy Framework"],
    tags: ["privacy", "tanzania", "mandatory"],
  },
  {
    id: "au_cybersecurity",
    region: "African Union",
    flag: "🌍",
    name: "AU Cyber Framework",
    full_name: "African Union Cybersecurity and Personal Data Protection Convention",
    version: "Malabo Convention 2014",
    category: "Cybersecurity",
    authority: "African Union Commission",
    description: "The primary pan-African legal framework for cybersecurity, electronic commerce, and personal data protection.",
    mandatory: false,
    controls_count: 45,
    key_requirements: ["Electronic transactions", "Personal data protection", "Cybersecurity measures", "Critical infrastructure", "Cybercrime legislation", "Regional cooperation"],
    related_international: ["Budapest Convention", "GDPR"],
    tags: ["africa", "cybersecurity", "privacy", "regional"],
  },
  {
    id: "sadc_finance",
    region: "SADC Region",
    flag: "🌍",
    name: "SADC Finance Protocol",
    full_name: "SADC Protocol on Finance & Investment — ICT Annex",
    version: "2006 (amended)",
    category: "Financial Services",
    authority: "SADC Secretariat",
    description: "Regional harmonisation framework for financial services regulation across SADC member states including cybersecurity and data governance principles.",
    mandatory: false,
    controls_count: 22,
    key_requirements: ["Cross-border data governance", "Financial data standards", "AML/CFT integration", "Interoperability requirements"],
    related_international: ["FATF", "Basel III"],
    tags: ["finance", "sadc", "regional"],
  },
  {
    id: "bou_cyber",
    region: "Uganda",
    flag: "🇺🇬",
    name: "BOU Cyber Guidelines",
    full_name: "Bank of Uganda Cybersecurity Framework",
    version: "2022",
    category: "Financial Services",
    authority: "Bank of Uganda",
    description: "Cybersecurity risk management framework for financial institutions licensed by the Bank of Uganda.",
    mandatory: true,
    controls_count: 38,
    key_requirements: ["Cyber risk governance", "Vulnerability management", "Incident management", "Business continuity", "Staff awareness", "Regulatory reporting"],
    related_international: ["ISO 27001", "NIST CSF", "PCI DSS"],
    tags: ["financial services", "uganda", "cyber", "mandatory"],
  },
  {
    id: "mra_malawi",
    region: "Malawi",
    flag: "🇲🇼",
    name: "Malawi Cyber Act",
    full_name: "Electronic Transactions and Cybersecurity Act",
    version: "2016",
    category: "Cybersecurity",
    authority: "Malawi Communications Regulatory Authority (MACRA)",
    description: "Malawi's primary cybersecurity legislation governing electronic transactions, cybercrime, and digital evidence.",
    mandatory: true,
    controls_count: 24,
    key_requirements: ["Electronic evidence admissibility", "Cybercrime offences", "Critical system protection", "Authentication standards"],
    related_international: ["Budapest Convention"],
    tags: ["cybersecurity", "malawi", "mandatory"],
  },
  {
    id: "zambia_cyber",
    region: "Zambia",
    flag: "🇿🇲",
    name: "Zambia Cyber Act",
    full_name: "Cyber Security and Cyber Crimes Act",
    version: "2021",
    category: "Cybersecurity",
    authority: "Zambia Information & Communications Technology Authority (ZICTA)",
    description: "Zambia's cybersecurity law addressing cyber threats, criminal offences, and establishing the national CSIRT.",
    mandatory: true,
    controls_count: 31,
    key_requirements: ["National CSIRT reporting", "Critical infrastructure protection", "Cybercrime offences", "Digital forensics", "Incident reporting"],
    related_international: ["AU Malabo Convention", "Budapest Convention"],
    tags: ["cybersecurity", "zambia", "mandatory"],
  },
];

const REGIONS = ["All Regions", "South Africa", "Botswana", "Zimbabwe", "Kenya", "Tanzania", "Uganda", "Malawi", "Zambia", "African Union", "SADC Region"];
const CATEGORIES = ["All Categories", "Data Privacy", "Cybersecurity", "Financial Services"];

const categoryColors = {
  "Data Privacy": "bg-purple-100 text-purple-700",
  "Cybersecurity": "bg-blue-100 text-blue-700",
  "Financial Services": "bg-emerald-100 text-emerald-700",
};

export default function SADCFrameworks() {
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All Regions");
  const [category, setCategory] = useState("All Categories");
  const [expanded, setExpanded] = useState(null);
  const [importing, setImporting] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Framework.list().then(d => { setFrameworks(d || []); setLoading(false); });
  }, []);

  const isImported = (libId) => frameworks.some(f => f.name.toLowerCase().includes(SADC_LIBRARY.find(l => l.id === libId)?.name?.toLowerCase() || "XNONE"));

  const handleImport = async (lib) => {
    setImporting(lib.id);
    try {
      await base44.entities.Framework.create({
        name: lib.name,
        version: lib.version,
        description: `${lib.full_name}. ${lib.description}`,
        status: "not_started",
        readiness_score: 0,
        total_controls: lib.controls_count,
        passing_controls: 0,
      });
      const updated = await base44.entities.Framework.list();
      setFrameworks(updated);
      toast({ title: `${lib.name} imported`, description: `Added to your Frameworks with ${lib.controls_count} controls pre-configured.` });
    } catch (e) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
    setImporting(null);
  };

  const filtered = SADC_LIBRARY.filter(lib => {
    const matchSearch = !search || lib.name.toLowerCase().includes(search.toLowerCase()) || lib.full_name.toLowerCase().includes(search.toLowerCase()) || lib.tags.some(t => t.includes(search.toLowerCase()));
    const matchRegion = region === "All Regions" || lib.region === region;
    const matchCat = category === "All Categories" || lib.category === category;
    return matchSearch && matchRegion && matchCat;
  });

  const mandatoryCount = SADC_LIBRARY.filter(l => l.mandatory).length;
  const importedCount = SADC_LIBRARY.filter(l => frameworks.some(f => f.name.toLowerCase().includes(l.name.toLowerCase()))).length;

  return (
    <div>
      <PageHeader
        title="SADC Framework Library"
        subtitle="Pre-built compliance frameworks for Southern & Eastern Africa — your regional competitive edge"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Frameworks Available", value: SADC_LIBRARY.length, icon: BookOpen, color: "text-primary" },
          { label: "Mandatory (Legal)", value: mandatoryCount, icon: Shield, color: "text-red-500" },
          { label: "Countries Covered", value: 9, icon: Globe, color: "text-blue-500" },
          { label: "Imported to My Stack", value: importedCount, icon: CheckCircle, color: "text-emerald-500" },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search frameworks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={region} onChange={e => setRegion(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          {REGIONS.map(r => <option key={r}>{r}</option>)}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Library cards */}
      <div className="space-y-3">
        {filtered.map(lib => {
          const imported = frameworks.some(f => f.name.toLowerCase().includes(lib.name.toLowerCase()));
          const isOpen = expanded === lib.id;
          return (
            <div key={lib.id} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Header row */}
              <div className="flex items-start gap-4 p-4">
                <div className="text-2xl shrink-0">{lib.flag}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-heading font-bold text-foreground">{lib.name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColors[lib.category] || "bg-slate-100 text-slate-600"}`}>{lib.category}</span>
                    {lib.mandatory && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">⚠ Mandatory</span>}
                    {imported && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">✓ Imported</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{lib.full_name} · {lib.version}</p>
                  <p className="text-xs text-muted-foreground">{lib.region} · {lib.authority}</p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{lib.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-lg font-bold text-foreground">{lib.controls_count}</p>
                    <p className="text-[10px] text-muted-foreground">controls</p>
                  </div>
                  <Button
                    size="sm"
                    variant={imported ? "outline" : "default"}
                    disabled={imported || importing === lib.id}
                    onClick={() => handleImport(lib)}
                  >
                    {importing === lib.id ? (
                      <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Importing…</span>
                    ) : imported ? (
                      <><CheckCircle className="w-3.5 h-3.5 mr-1" />Imported</>
                    ) : (
                      <><Download className="w-3.5 h-3.5 mr-1" />Import</>
                    )}
                  </Button>
                  <button onClick={() => setExpanded(isOpen ? null : lib.id)} className="p-1.5 rounded hover:bg-muted">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div className="border-t border-border bg-muted/30 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" />Key Requirements</p>
                    <ul className="space-y-1">
                      {lib.key_requirements.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Star className="w-3.5 h-3.5 text-blue-500" />Related International Frameworks</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lib.related_international.map((r, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{r}</span>
                      ))}
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-foreground mb-1.5">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {lib.tags.map((t, i) => (
                          <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No frameworks match your filters.</p>
        </div>
      )}
    </div>
  );
}