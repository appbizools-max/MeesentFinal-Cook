import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

// ── Hardcoded fallback data (used if Firestore unavailable) ──────────────────
const FALLBACK_JOB_CATEGORIES = [
  'All Categories', 'Private Jobs', 'Central Govt', 'State Govt',
  'Software Development', 'Graphic Design', 'Digital Marketing',
  'Sales & Marketing', 'Customer Support', 'Accounting',
  'Teaching/Education', 'Construction/Civil', 'Other',
];

const FALLBACK_SERVICES_CATEGORIES = [
  'Daily Needs', 'Food', 'Automobile', 'Beauty & Personal Care',
  'Banquets & Venues', 'Doctors & Medical', 'Contractors', 'Consultants',
  'Event Organizers', 'Packers & Movers', 'Repairs & Services', 'Real Estate',
  'Security & CCTV', 'Training Institutes', 'Interior Designers',
  'Pest Control', 'Pet & Pet Care', 'PG/Hostel', 'Housekeeping', 'Florists',
  'Caterers', 'Internet & Digital', 'Borewell Services', 'Party Services',
  'Modular Kitchen', 'Decorators', 'Rent & Hire', 'Baby Care',
  'Language Classes', 'Bulk Communication',
];

const FALLBACK_INDUSTRIAL_CATEGORIES = [
  'Industrial Plants & Machinery', 'Consumer Electronics & Appliances',
  'Industrial & Engineering Spares', 'Building Construction Material',
  'Apparel & Clothing', 'FMCG and Grocery Items', 'Medical & Healthcare',
  'Chemicals & Dyes', 'Mechanical Components', 'Electrical Equipment',
  'Tools & Power Tools', 'Furniture & Hardware', 'Metals, Minerals & Alloys',
  'Packaging Material & Machines', 'Automobiles & Spares',
  'Agro Machines & Poultry', 'Cosmetics & Personal Care',
  'Security & Safety Systems', 'Gems & Jewellery', 'Computers & IT Support',
  'Pharma & Medicines', 'Scientific & Lab Instruments', 'Gifts, Crafts & Antiques',
  'Stationery & Books', 'Go & Green Products', 'Ayurvedic & Herbal Product',
  'Sports Goods & Toys', 'Home Appliances', 'Bags & Luggage',
];

// ── Generic Firestore category fetcher ───────────────────────────────────────
async function fetchCategoryNames(colName: string, fallback: string[]): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, colName));
    if (!snap || snap.empty) return fallback;
    const names = snap.docs
      .map((d: any) => d.data())
      .filter((d: any) => !d._deleted && d.name)
      .map((d: any) => d.name as string);
    return names.length > 0 ? names : fallback;
  } catch {
    return fallback;
  }
}

// ── Hook: job categories (cat_jobs collection) ───────────────────────────────
export function useJobCategories() {
  const [categories, setCategories] = useState<string[]>(FALLBACK_JOB_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryNames('cat_jobs', FALLBACK_JOB_CATEGORIES.filter(c => c !== 'All Categories')).then(names => {
      setCategories(['All Categories', ...names]);
      setLoading(false);
    });
  }, []);

  return { categories, loading };
}

// ── Hook: services categories (cat_services collection) ──────────────────────
export function useServicesCategories() {
  const [categories, setCategories] = useState<string[]>(FALLBACK_SERVICES_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryNames('cat_services', FALLBACK_SERVICES_CATEGORIES).then(names => {
      setCategories(names);
      setLoading(false);
    });
  }, []);

  return { categories, loading };
}

// ── Hook: industrial categories (cat_industrial collection) ──────────────────
export function useIndustrialCategories() {
  const [categories, setCategories] = useState<string[]>(FALLBACK_INDUSTRIAL_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryNames('cat_industrial', FALLBACK_INDUSTRIAL_CATEGORIES).then(names => {
      setCategories(names);
      setLoading(false);
    });
  }, []);

  return { categories, loading };
}

// ── Hook: sub-categories for a specific category name ────────────────────────
export function useSubCategories(colName: string, categoryName: string) {
  const [subs, setSubs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryName) { setLoading(false); return; }
    getDocs(collection(db, colName))
      .then(snap => {
        if (!snap || !snap.docs) { setSubs([]); return; }
        const match = snap.docs
          .map(d => ({ ...d.data() } as any))
          .find(d => !d._deleted && d.name === categoryName);
        setSubs(match?.subs || []);
      })
      .catch(() => setSubs([]))
      .finally(() => setLoading(false));
  }, [colName, categoryName]);

  return { subs, loading };
}
