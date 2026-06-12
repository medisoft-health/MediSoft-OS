/**
 * MediSport — WADA Banned Substance Check
 *
 * Reference dataset based on the WADA Prohibited List categories.
 * Lets athletes check whether a substance/medication is prohibited,
 * in which context (in/out of competition), and possible alternatives.
 *
 * NOTE: This is an educational reference; always confirm with the
 * latest official WADA Prohibited List and a sports physician.
 */

export type ProhibitionStatus = "prohibited" | "prohibited_in_competition" | "monitored" | "permitted";

export interface WadaSubstance {
  id: string;
  nameAr: string;
  nameEn: string;
  // common brand / synonyms for search
  synonyms: string[];
  category: string; // WADA class
  categoryAr: string;
  status: ProhibitionStatus;
  notesAr: string;
  notesEn: string;
  alternativesAr?: string;
  alternativesEn?: string;
}

export const WADA_SUBSTANCES: WadaSubstance[] = [
  {
    id: "stanozolol",
    nameAr: "ستانوزولول",
    nameEn: "Stanozolol",
    synonyms: ["winstrol", "ونسترول"],
    category: "S1 Anabolic Agents",
    categoryAr: "S1 العوامل الابتنائية",
    status: "prohibited",
    notesAr: "ستيرويد ابتنائي محظور دائماً داخل وخارج المنافسات.",
    notesEn: "Anabolic steroid prohibited at all times, in and out of competition.",
  },
  {
    id: "testosterone",
    nameAr: "تستوستيرون (خارجي)",
    nameEn: "Testosterone (exogenous)",
    synonyms: ["test", "تستو"],
    category: "S1 Anabolic Agents",
    categoryAr: "S1 العوامل الابتنائية",
    status: "prohibited",
    notesAr: "محظور دائماً ما لم يكن هناك إعفاء علاجي معتمد (TUE).",
    notesEn: "Prohibited at all times unless a valid Therapeutic Use Exemption (TUE) exists.",
  },
  {
    id: "epo",
    nameAr: "إريثروبويتين",
    nameEn: "Erythropoietin (EPO)",
    synonyms: ["epo", "ايبو"],
    category: "S2 Peptide Hormones",
    categoryAr: "S2 الهرمونات الببتيدية",
    status: "prohibited",
    notesAr: "محظور دائماً، يزيد إنتاج خلايا الدم الحمراء.",
    notesEn: "Prohibited at all times, increases red blood cell production.",
  },
  {
    id: "salbutamol",
    nameAr: "سالبوتامول",
    nameEn: "Salbutamol",
    synonyms: ["ventolin", "فينتولين", "albuterol"],
    category: "S3 Beta-2 Agonists",
    categoryAr: "S3 ناهضات بيتا-2",
    status: "monitored",
    notesAr: "مسموح به استنشاقاً ضمن حد أقصى (1600 ميكروغرام/24 ساعة). تجاوز الحد محظور.",
    notesEn: "Permitted by inhalation within limits (1600 mcg/24h). Exceeding limits is prohibited.",
    alternativesAr: "استشر طبيب الرياضة لضبط الجرعة المسموحة.",
    alternativesEn: "Consult a sports physician to stay within permitted dosing.",
  },
  {
    id: "pseudoephedrine",
    nameAr: "سودوإيفيدرين",
    nameEn: "Pseudoephedrine",
    synonyms: ["sudafed", "سودافيد"],
    category: "S6 Stimulants",
    categoryAr: "S6 المنشطات",
    status: "prohibited_in_competition",
    notesAr: "محظور داخل المنافسات عند تركيز بولي يتجاوز 150 ميكروغرام/مل.",
    notesEn: "Prohibited in-competition when urinary concentration exceeds 150 mcg/mL.",
    alternativesAr: "استخدم مزيلات احتقان موضعية أو مضادات هيستامين غير محظورة.",
    alternativesEn: "Use topical decongestants or non-prohibited antihistamines.",
  },
  {
    id: "caffeine",
    nameAr: "الكافيين",
    nameEn: "Caffeine",
    synonyms: ["coffee", "قهوة"],
    category: "Monitoring Program",
    categoryAr: "برنامج المراقبة",
    status: "monitored",
    notesAr: "ضمن برنامج المراقبة وليس محظوراً حالياً، لكنه قيد الرصد.",
    notesEn: "On the Monitoring Program, not currently prohibited but under surveillance.",
  },
  {
    id: "morphine",
    nameAr: "مورفين",
    nameEn: "Morphine",
    synonyms: ["مورفين"],
    category: "S7 Narcotics",
    categoryAr: "S7 المخدرات",
    status: "prohibited_in_competition",
    notesAr: "محظور داخل المنافسات فقط.",
    notesEn: "Prohibited in-competition only.",
    alternativesAr: "استخدم مسكنات غير أفيونية مثل الباراسيتامول.",
    alternativesEn: "Use non-opioid analgesics such as paracetamol.",
  },
  {
    id: "cannabis",
    nameAr: "القنب (THC)",
    nameEn: "Cannabis (THC)",
    synonyms: ["thc", "marijuana", "حشيش"],
    category: "S8 Cannabinoids",
    categoryAr: "S8 القنبيات",
    status: "prohibited_in_competition",
    notesAr: "محظور داخل المنافسات.",
    notesEn: "Prohibited in-competition.",
  },
  {
    id: "furosemide",
    nameAr: "فوروسيميد",
    nameEn: "Furosemide",
    synonyms: ["lasix", "لازيكس"],
    category: "S5 Diuretics & Masking Agents",
    categoryAr: "S5 مدرات البول وعوامل الإخفاء",
    status: "prohibited",
    notesAr: "محظور دائماً لأنه قد يُستخدم لإخفاء مواد أخرى.",
    notesEn: "Prohibited at all times as it may mask other substances.",
  },
  {
    id: "paracetamol",
    nameAr: "باراسيتامول",
    nameEn: "Paracetamol",
    synonyms: ["acetaminophen", "panadol", "بنادول"],
    category: "—",
    categoryAr: "—",
    status: "permitted",
    notesAr: "مسموح به، مسكن وخافض حرارة غير محظور.",
    notesEn: "Permitted, a non-prohibited analgesic and antipyretic.",
  },
  {
    id: "ibuprofen",
    nameAr: "إيبوبروفين",
    nameEn: "Ibuprofen",
    synonyms: ["brufen", "بروفين"],
    category: "—",
    categoryAr: "—",
    status: "permitted",
    notesAr: "مسموح به، مضاد التهاب غير ستيرويدي غير محظور.",
    notesEn: "Permitted, a non-prohibited NSAID.",
  },
  {
    id: "creatine",
    nameAr: "كرياتين",
    nameEn: "Creatine",
    synonyms: ["كرياتين"],
    category: "—",
    categoryAr: "—",
    status: "permitted",
    notesAr: "مكمل غذائي مسموح به وغير محظور.",
    notesEn: "A permitted, non-prohibited dietary supplement.",
  },
  {
    id: "ghrp",
    nameAr: "ببتيدات إفراز هرمون النمو",
    nameEn: "Growth Hormone Releasing Peptides",
    synonyms: ["ghrp", "ghs", "sermorelin"],
    category: "S2 Peptide Hormones",
    categoryAr: "S2 الهرمونات الببتيدية",
    status: "prohibited",
    notesAr: "محظورة دائماً.",
    notesEn: "Prohibited at all times.",
  },
  {
    id: "clenbuterol",
    nameAr: "كلينبوتيرول",
    nameEn: "Clenbuterol",
    synonyms: ["كلين", "clen"],
    category: "S1 Anabolic Agents",
    categoryAr: "S1 العوامل الابتنائية",
    status: "prohibited",
    notesAr: "محظور دائماً.",
    notesEn: "Prohibited at all times.",
  },
  {
    id: "beta-blockers",
    nameAr: "حاصرات بيتا",
    nameEn: "Beta-Blockers",
    synonyms: ["propranolol", "بروبرانولول", "atenolol"],
    category: "P1 Beta-Blockers",
    categoryAr: "P1 حاصرات بيتا",
    status: "prohibited_in_competition",
    notesAr: "محظورة في رياضات معينة (الرماية، الرماية بالقوس، الغولف) داخل المنافسات.",
    notesEn: "Prohibited in certain sports (shooting, archery, golf) in-competition.",
  },
];

export function searchWada(query: string): WadaSubstance[] {
  if (!query.trim()) return WADA_SUBSTANCES;
  const q = query.toLowerCase().trim();
  return WADA_SUBSTANCES.filter(
    (s) =>
      s.nameAr.includes(query) ||
      s.nameEn.toLowerCase().includes(q) ||
      s.synonyms.some((syn) => syn.toLowerCase().includes(q) || syn.includes(query))
  );
}

export function getWadaById(id: string): WadaSubstance | undefined {
  return WADA_SUBSTANCES.find((s) => s.id === id);
}
