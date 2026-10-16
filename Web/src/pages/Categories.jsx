import React, { useState, useEffect } from 'react';
import { Layout } from '../components/layout/Layout';
import { db } from '../services/firebase';
import { collection, getDocs, setDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import {
  LayoutGrid, Tag, Package, Briefcase, Plus, Trash2,
  Edit2, Check, X, ChevronDown, ChevronUp, Loader2, Search, PlusCircle, Save, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Default Base Data ───
const BASE = {
  services: [
    { id: "s1", name: "Daily Needs", subs: ["Grocery","Fruits","Vegetables","Milk & Dairy","Medicines","Electricians","Plumbers","AC Repair","Stationery","Milkman","Paperwala","Gardener","Home Cleaning","Pest Control","Carpenter","Painter","Electronics Repair","Gas Agency","Water Supply","Laundry","Security Guard","Pooja Needs"] },
    { id: "s2", name: "Food", subs: ["Restaurants","Breakfast","Lunch","Dinner","Biryani & Pulao","Pizza & Burger","Rolls & Sandwiches","Chinese","South Indian","North Indian","Sweets & Desserts","Bakery","Street Food","Juices & Shakes","Cafe & Coffee","Home Delivery","Takeaway","Catering Services"] },
    { id: "s3", name: "Automobile", subs: ["New Cars","Used Cars","Sell Cars","New Two-Wheelers","Used Two-Wheelers","Sell Two-Wheelers","Car Repairs","Bike Repairs","Auto Accessories","Vehicle Insurance","Car Rentals"] },
    { id: "s28", name: "Baby Care", subs: ["Babysitters","Baby Bedding","Baby Clothes","Baby Creams","Diapers","Baby Footwear","Grooming","Safety Products","Toys","Baby Health"] },
    { id: "s5", name: "Banquets & Venues", subs: ["All Banquet Halls","5-Star Banquet Halls","AC Banquet Halls","Non-AC Banquet Halls","Lawn for Events","Rooftop Banquet Halls","Wedding Venues","Party Halls"] },
    { id: "s4", name: "Beauty & Personal Care", subs: ["Beauty Parlours","Beauty Services","Bridal Makeup","Bridegroom Makeup","Salons","Spas","Skin Care Clinics","Hair Care Services"] },
    { id: "s31", name: "Bills & Recharge", subs: ["Mobile Recharge","Electricity Bill","Gas Bill","DTH Recharge","Broadband Recharge","Water Bill"] },
    { id: "s23", name: "Borewell Services", subs: ["Borewell Contractors","Borewell Cleaning","Borewell Scanning","Borewell Drilling"] },
    { id: "s30", name: "Bulk Communication Services", subs: ["Bulk SMS","Bulk Email","IVR Services","VOIP Services","Call Centre Solutions"] },
    { id: "s32", name: "Cake Shops", subs: ["Cake Shops","Cake Delivery","Wedding Cakes","Customised Cakes","Photo Cakes","Bakery"] },
    { id: "s21", name: "Caterers", subs: ["All Caterers","Birthday Party Caterers","Housewarming Caterers","Wedding Caterers","Corporate Caterers"] },
    { id: "s7", name: "Contractors", subs: ["Civil Contractors","Carpentry Contractors","Electrical Contractors","Flooring Contractors","Furniture Contractors","Plumbing Contractors","Builders","Aluminium Partition Contractors","Sliding Window Contractors","Roofing Contractors","Waterproofing Contractors","Gypsum False Ceiling Contractors","POP Contractors","PVC False Ceiling Contractors","Painting Contractors (Residential)","Painting Contractors (Commercial)","Painting Contractors (Interior)"] },
    { id: "s8", name: "Consultants", subs: ["Lawyers","Chartered Accountants","Auditors","Income Tax Consultants","GST Consultants","Valuers","Business Consultants"] },
    { id: "s26", name: "Decorators", subs: ["Mandap Decorators","Wedding Decorators","Flower Decorators","Party Decorators","Birthday Decorators","Balloon Decorators","Stage Decorators","Lighting Decorators","Hall Decorators","Pandal Decorators","Exhibition Decorators"] },
    { id: "s6", name: "Doctors & Medical", subs: ["Ayurvedic Doctors","Orthopaedic Doctors","Cardiologists","Chest Specialists","Child Specialists","Dentists","Dermatologists","Diabetologists","ENT Specialists","Eye Specialists","Gastroenterologists","General Physicians","Gynaecologists","Homeopathic Doctors","Neurologists","Neurosurgeons","Oncologists","Ophthalmologists","Paediatricians","Physiotherapists","Psychiatrists","Psychologists","Skin & Hair Specialists","Urologists","Emergency Doctors","Diagnostic Centres","Surgeons"] },
    { id: "s9", name: "Event Organizers", subs: ["Private Party Organizers","Seminar Organizers","Stage Show Organizers","Trade Fair Organizers","Wedding Organizers","Corporate Event Organizers"] },
    { id: "s20", name: "Florists", subs: ["Florists","Flower Shops","Home Delivery Florists","24-Hour Florists","Wedding Florists","Chocolate Bouquet Florists"] },
    { id: "s19", name: "Housekeeping", subs: ["Cooks","Maids","Drivers","Gardeners","Laundry Services","Cleaning Services","Security Staff"] },
    { id: "s15", name: "Interior Designers", subs: ["Architects","Residential Interior Designers","Commercial Interior Designers","Interior Decorators","Modular Kitchen Designers","Interior Architects","Furnishing Contractors"] },
    { id: "s22", name: "Internet & Digital", subs: ["Internet Service Providers","Web Designers","Cyber Cafes","WiFi Providers","Digital Marketing Services"] },
    { id: "s29", name: "Language Classes", subs: ["Chinese","English","French","German","Hindi","Japanese","Spanish","IELTS / TOEFL Coaching"] },
    { id: "s25", name: "Modular Kitchen", subs: ["Chimneys","Cabinets","Gas Stoves","Built-in Hobs","Shutters","U-Shaped Kitchens","Complete Modular Kitchens"] },
    { id: "s10", name: "Packers & Movers", subs: ["Local","National","International","Automobile Movers","Commercial Movers","Transporters"] },
    { id: "s24", name: "Party Services", subs: ["DJ on Hire","Event Organisers","Photographers","Party Organisers for Children","Playback Singers","Anchors / MCs"] },
    { id: "s16", name: "Pest Control", subs: ["Residential Pest Control","Commercial Pest Control","Termite Control","Rodent Control"] },
    { id: "s17", name: "Pet & Pet Care", subs: ["Pet Accessories","Pet Food","Pet Shops","Veterinary Doctors","Grooming Services"] },
    { id: "s18", name: "PG/Hostel", subs: ["PG for Men","PG for Women","Co-living PG","Student Hostel","Working Women Hostel","Working Men Hostel","Day Scholar Hostel","Luxury PG","Budget PG"] },
    { id: "s12", name: "Real Estate", subs: ["Buy Property","Rent Property","Sell Property","Post Free Property Ads","Commercial Property"] },
    { id: "s27", name: "Rent & Hire", subs: ["Car on Rent","Costumes on Rent","Mini Bus on Rent","AC on Rent","Furniture on Rent","Generator on Rent"] },
    { id: "s11", name: "Repairs & Services", subs: ["AC Repair","Car Repair","Computer Repair","Laptop Repair","Mobile Repair","Motorcycle Repair","Refrigerator Repair","TV Repair","Washing Machine Repair","Water Purifier Repair"] },
    { id: "s13", name: "Security & CCTV", subs: ["Bodyguards","CCTV Cameras","Detectives","Locks","Security Services","Walkie Talkies","Access Control Systems"] },
    { id: "s14", name: "Training Institutes", subs: ["Basic Computing","Computer Hardware","Networking","Database Training","Engineering Design","Mobile Development","Multimedia & Design","Software Development","Spoken English"] },
  ],
  industrial: [
    { id: "i1", name: "Industrial Plants & Machinery", subs: ["Heavy Machinery & Equipment","Food Processing Machines","Construction Machinery","Woodworking Machinery"] },
    { id: "i2", name: "Consumer Electronics & Appliances", subs: ["Kitchen Appliances","Washing Machines & Dryers","Air Conditioners & Coolers","Television & Audio Systems"] },
    { id: "i3", name: "Industrial & Engineering Spares", subs: ["Industrial Valves & Fittings","Pumps & Pumping Systems","Fasteners","Bearings & Power Transmission"] },
    { id: "i4", name: "Building Construction Material", subs: ["Bricks, Cement & Sand","Steel & Iron Bars","Tiles, Marble & Granite","Sanitary Ware & Fittings"] },
    { id: "i5", name: "Apparel & Clothing", subs: ["Men’s, Women’s & Kids' Wear","Sarees & Ethnic Wear","Uniforms & Workwear","Fabrics & Textiles"] },
    { id: "i6", name: "FMCG and Grocery Items", subs: ["Rice, Atta & Dal","Oil & Ghee","Spices & Masala","Sugar, Salt & Jaggery","Snacks & Biscuits","Beverages & Soft Drinks","Dry Fruits & Nuts","Noodles & Instant Food","Dairy, Bread & Eggs","Chocolates & Candies","Pooja Needs","Cleaning & Household"] },
    { id: "i7", name: "Medical & Healthcare", subs: ["Pharmaceutical Drugs & Medicines","Medical Implants & Devices","Surgical Instruments","Diagnostic Equipment"] },
    { id: "i14", name: "Packaging Material & Machines", subs: ["Packaging Boxes & Cartons","Pouch Packing Machines","Plastic & Paper Bags","Labeling & Sealing Machines"] },
    { id: "i8", name: "Chemicals & Dyes", subs: ["Industrial Chemicals","Dyes & Pigments","Laboratory Chemicals","Water Treatment Chemicals"] },
    { id: "i9", name: "Mechanical Components", subs: ["Gears & Gear Boxes","Springs & Wire Forms","Hydraulic & Pneumatic Parts","Casting & Forging Parts"] },
    { id: "i23", name: "Scientific & Lab Instruments", subs: ["Lab Glassware & Plasticware","Measuring Tools","Microscopes & Optical Instruments","Testing & Calibration Equipment"] },
    { id: "i12", name: "Furniture & Hardware", subs: ["Home & Office Furniture","Furniture Fittings & Handles","Wood & Plywood","Upholstery & Fabrics"] },
    { id: "i16", name: "Agro Machines & Poultry", subs: ["Agricultural Fertilizers","Hybrid Seeds & Plants","Tractors & Farm Tools","Poultry & Livestock Equipment"] },
    { id: "i15", name: "Automobiles & Spares", subs: ["Two & Four Wheeler Spare Parts","Tyres, Tubes & Batteries","Car Accessories & Decor","Lubricants & Engine Oils"] },
    { id: "i31", name: "Housewares & Decor", subs: ["Home Decor & Art Pieces","Kitchenware & Utensils","Cleaning Supplies & Tools","Lamps & Lighting Fixtures"] },
    { id: "i13", name: "Metals, Minerals & Alloys", subs: ["Iron & Steel Products","Aluminum & Copper Alloys","Industrial Ores & Minerals","Metal Bars, Rods & Sheets"] },
    { id: "i11", name: "Tools & Power Tools", subs: ["Electric Power Tools","Hand Tools","Cutting & Grinding Tools","Precision Measuring Tools"] },
    { id: "i24", name: "Gifts, Crafts & Antiques", subs: ["Corporate & Promotional Gifts","Handicrafts & Traditional Art","Antique Items & Collectibles","Artificial Flowers & Decor"] },
    { id: "i32", name: "Kitchenware & Tableware", subs: ["Stainless Steel Utensils","Gas Stoves & Burners","Non-stick Cookware","Dinner Sets & Tableware"] },
    { id: "i17", name: "Textiles, Yarn & Fabrics", subs: ["Cotton, Silk & Synthetic Fabrics","Industrial Yarns & Threads","Textile Processing Chemicals","Garment Manufacturing Supplies"] },
    { id: "i25", name: "Stationery & Books", subs: ["Office & School Stationery","Educational Books & Manuals","Writing Pens & Pencils","Presentation Boards & Supplies"] },
    { id: "i18", name: "Cosmetics & Personal Care", subs: ["Skin Care & Beauty Products","Hair Care & Shampoos","Fragrances & Perfumes","Personal Hygiene Supplies"] },
    { id: "i33", name: "Home Furnishings", subs: ["Curtains & Blinds","Bed Linens & Pillows","Carpets & Floor Mats","Cushion Covers & Upholstery"] },
    { id: "i34", name: "Industrial & Engineering Services", subs: ["Engineering Project Consultancy","Industrial Maintenance Services","Quality Testing Services","Environmental & Safety Solutions"] },
    { id: "i20", name: "Gems & Jewellery", subs: ["Gold & Silver Jewellery","Precious & Semi-Precious Stones","Vaastu Shastra Items","Astrological Consultation & Remedies"] },
    { id: "i21", name: "Computers & IT Support", subs: ["Desktop & Laptop Computers","Business & Industry Software","Networking & IT Hardware","Website & App Development Services"] },
    { id: "i35", name: "Fashion Accessories", subs: ["Footwear","Belts, Wallets & Handbags","Watches & Sunglasses","Buttons, Zips & Trimmings"] },
    { id: "i27", name: "Ayurvedic & Herbal Product", subs: ["Herbal Supplements & Tonics","Ayurvedic Cosmetics","Natural Essential Oils","Immunity Boosters"] },
    { id: "i19", name: "Security & Safety Systems", subs: ["CCTV Cameras & Surveillance","Fire Safety Equipment","Biometric & Access Control","Personal Protective Equipment"] },
    { id: "i28", name: "Sports Goods & Toys", subs: ["Indoor & Outdoor Sports Gear","Fitness & Gym Equipment","Kids' Toys & Educational Games","Playground equipment"] },
    { id: "i36", name: "Telecom Products", subs: ["Mobile Handsets and Smartphones","Networking Routers and Modems","Fiber Optic Cables and Connectors","Transmission Towers and Antennas"] },
    { id: "i37", name: "Stationery and Paper", subs: ["Notebooks, Diaries, and Notepads","Writing Instruments","Office Printing and Photocopy Papers","Envelopes, Files, and Folders"] },
    { id: "i30", name: "Bags & Luggage", subs: ["Travel Suitcases and Trolley Bags","Ladies Handbags and Cluches","Men’s Leather Wallets and Belts","School and Laptop Backpacks"] },
    { id: "i38", name: "Stones & Marble", subs: ["Polished Granite Slabs and Tiles","Decorative Marble and Floorings","Sandstone and Limestone Blocks","Natural Paving and Cobble Stones"] },
    { id: "i39", name: "Bicycles & Spares", subs: ["Mountain, Road, and Hybrid Bicycles","Cycle Spare Parts","Passenger and Cargo Rickshaws","Safety Gear"] },
    { id: "i40", name: "Railway & Aviation Products", subs: ["Railway Track and Coach Components","Marine Engine Parts and Anchors","Aircraft Interior and Cabin Equipment","Navigation and Signaling Systems"] },
    { id: "i41", name: "Leather Products", subs: ["Leather Jackets and Apparel","Formal and Casual Leather Footwear","Industrial Leather Gloves and Aprons","Leather Briefcases and Travel Bags"] },
    { id: "i42", name: "Electronics Components", subs: ["Integrated Circuits (ICs) and Microchips","Resistors, Capacitors, and Diodes","Printed Circuit Boards (PCB)","Sensors and Electronic Modules"] },
    { id: "i10", name: "Electrical Equipment", subs: ["Power Transformers and Generators","Electrical Wires and Industrial Cables","Switchgears and Circuit Breakers","Industrial Motors and Power Inverters"] },
    { id: "i22", name: "Pharma & Medicines", subs: ["Prescription Medicines and Tablets","Vitamins and Nutritional Supplements","Surgical Instruments and Medical Tools","Diagnostic Kits and Health Monitors"] },
    { id: "i26", name: "Go & Green Products", subs: ["Eco-friendly Products","Solar Energy Equipment","Biodegradable Items","Organic Products"] },
    { id: "i43", name: "FMCG Essentials", subs: ["Toiletries & Hygiene","Household Cleaning","Paper Products","Personal Care"] },
    { id: "i44", name: "Office & School Supplies", subs: ["Stationery Items","Office Furniture","Computers & Laptops","Printers & Scanners"] },
    { id: "i29", name: "Home Appliances", subs: ["Kitchen Appliances","Refrigerators","Washing Machines","Air Conditioners"] },
    { id: "i45", name: "Sports & Fitness", subs: ["Gym Equipment","Sports Gear","Yoga & Meditation","Outdoor Activities"] },
  ],
  jobs: [

    { id: 'j1',  name: 'Private Jobs',          subs: ['Full Time','Part Time','Contract','Freelance','Internship','Work From Home'] },
    { id: 'j2',  name: 'Central Govt',          subs: ['Railway','Defence','Banking','PSU','Civil Services','Teaching'] },
    { id: 'j3',  name: 'State Govt',            subs: ['State PSC','Municipal','State Police','Revenue Dept','Health Dept'] },
    { id: 'j4',  name: 'Software Development',  subs: ['Frontend','Backend','Full Stack','Mobile Dev','DevOps','QA'] },
    { id: 'j5',  name: 'Graphic Design',        subs: ['UI/UX Design','Logo Design','Print Design','Video Editing','Animation'] },
    { id: 'j6',  name: 'Digital Marketing',     subs: ['SEO','Social Media','Content Writing','PPC','Email Marketing'] },
    { id: 'j7',  name: 'Sales & Marketing',     subs: ['Field Sales','Tele Sales','Marketing Executive','Business Development'] },
    { id: 'j8',  name: 'Customer Support',      subs: ['Call Centre','Chat Support','Back Office','Technical Support'] },
    { id: 'j9',  name: 'Accounting',            subs: ['Accountant','Tally','GST','Audit','Finance'] },
    { id: 'j10', name: 'Teaching/Education',    subs: ['School Teacher','College Lecturer','Tutor','Training'] },
    { id: 'j11', name: 'Construction/Civil',    subs: ['Civil Engineer','Site Supervisor','Architect','Labour'] },
    { id: 'j12', name: 'Other',                 subs: ['Driver','Security','Housekeeping','Cook','Helper'] },
  ],
};

const TABS = [
  { id: 'services',   label: 'Main Services',  icon: Tag,       color: 'blue',    colRef: 'cat_services'   },
  { id: 'industrial', label: 'Industrial Mart', icon: Package,   color: 'orange',  colRef: 'cat_industrial' },
  { id: 'jobs',       label: 'Jobs',            icon: Briefcase, color: 'emerald', colRef: 'cat_jobs'       },
];

const COLORS = {
  blue:    { btn:'bg-blue-600 border-blue-600',    dot:'bg-blue-500',    badge:'bg-blue-50 text-blue-600 border-blue-100',    pill:'bg-blue-50 text-blue-700 border-blue-100'    },
  orange:  { btn:'bg-orange-500 border-orange-500',dot:'bg-orange-500',  badge:'bg-orange-50 text-orange-600 border-orange-100',pill:'bg-orange-50 text-orange-700 border-orange-100'  },
  emerald: { btn:'bg-emerald-600 border-emerald-600',dot:'bg-emerald-500',badge:'bg-emerald-50 text-emerald-600 border-emerald-100',pill:'bg-emerald-50 text-emerald-700 border-emerald-100'},
};

// ── Category Row Component ───
const CategoryRow = ({ cat, color, onDelete, onUpdate }) => {
  const [open, setOpen] = useState(false);
  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState(cat.name);
  const [newSub, setNewSub] = useState('');
  const [editSubIdx, setEditSubIdx] = useState(null);
  const [editSubVal, setEditSubVal] = useState('');
  const c = COLORS[color];

  const saveName = () => {
    if (nameVal.trim() && nameVal !== cat.name) onUpdate(cat.id, { name: nameVal.trim(), subs: cat.subs });
    setEditName(false);
  };
  const addSub = () => {
    if (!newSub.trim()) return;
    onUpdate(cat.id, { name: cat.name, subs: [...cat.subs, newSub.trim()] });
    setNewSub('');
  };
  const deleteSub = (i) => onUpdate(cat.id, { name: cat.name, subs: cat.subs.filter((_, idx) => idx !== i) });
  const saveSub = (i) => {
    if (editSubVal.trim()) onUpdate(cat.id, { name: cat.name, subs: cat.subs.map((s, idx) => idx === i ? editSubVal.trim() : s) });
    setEditSubIdx(null);
  };

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-center px-4 py-3 gap-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />

        {editName ? (
          <div className="flex-1 flex items-center gap-1.5">
            <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameVal(cat.name); setEditName(false); } }}
              className="flex-1 text-sm font-semibold text-slate-800 border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button onClick={saveName} className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => { setNameVal(cat.name); setEditName(false); }} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <span className="flex-1 text-sm font-semibold text-slate-800 truncate">{cat.name}</span>
        )}

        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0 ${c.badge}`}>{cat.subs.length} subs</span>

        {!editName && (
          <button onClick={() => setEditName(true)} className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all flex-shrink-0" title="Rename">
            <Edit2 className="w-3 h-3" />
          </button>
        )}
        <button onClick={() => onDelete(cat.id)} className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all flex-shrink-0" title="Delete">
          <Trash2 className="w-3 h-3" />
        </button>
        <button onClick={() => setOpen(o => !o)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors flex-shrink-0">
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Sub-categories */}
      {open && (
        <div className="px-4 pb-3 pt-2 border-t border-slate-50 bg-slate-50/30 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {cat.subs.map((sub, i) => (
              editSubIdx === i ? (
                <div key={i} className="flex items-center gap-1">
                  <input autoFocus value={editSubVal} onChange={e => setEditSubVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveSub(i); if (e.key === 'Escape') setEditSubIdx(null); }}
                    className="text-[11px] border border-blue-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 w-28"
                  />
                  <button onClick={() => saveSub(i)} className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-3 h-3" /></button>
                  <button onClick={() => setEditSubIdx(null)} className="p-0.5 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <span key={i} className={`group inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${c.pill}`}>
                  {sub}
                  <button onClick={() => { setEditSubIdx(i); setEditSubVal(sub); }} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" title="Edit">
                    <Edit2 className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => deleteSub(i)} className="opacity-0 group-hover:opacity-100 transition-opacity" title="Remove">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              )
            ))}
          </div>

          {/* Add sub */}
          <div className="flex items-center gap-2">
            <input value={newSub} onChange={e => setNewSub(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSub()}
              placeholder="+ Add sub-category..."
              className="flex-1 text-[11px] border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white placeholder-slate-300"
            />
            <button onClick={addSub} disabled={!newSub.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-40">
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Page Component ───
export const Categories = () => {
  const [activeTab, setActiveTab] = useState('services');
  // Local active working data state
  const [data, setData] = useState({ services: [...BASE.services], industrial: [...BASE.industrial], jobs: [...BASE.jobs] });
  // Committed data state from DB (used to compare for dirty state and discard operations)
  const [dbData, setDbData] = useState({ services: [...BASE.services], industrial: [...BASE.industrial], jobs: [...BASE.jobs] });
  
  const [search, setSearch] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingChanges, setSavingChanges] = useState(false);

  const currentTab = TABS.find(t => t.id === activeTab);

  // Load Categories from Firestore on Mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const loaded = { services: [...BASE.services], industrial: [...BASE.industrial], jobs: [...BASE.jobs] };
      
      for (const tab of TABS) {
        try {
          const snap = await getDocs(collection(db, tab.colRef));
          if (!snap.empty) {
            const firestoreDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            const baseCopy = JSON.parse(JSON.stringify(BASE[tab.id]));
            const merged = [...baseCopy];
            
            firestoreDocs.forEach(fd => {
              const idx = merged.findIndex(m => m.id === fd.id);
              if (idx !== -1) merged[idx] = { ...merged[idx], ...fd };
              else if (!fd._deleted) merged.push(fd);
            });
            
            const deletedIds = firestoreDocs.filter(d => d._deleted).map(d => d.id);
            loaded[tab.id] = merged.filter(m => !deletedIds.includes(m.id));
          }
        } catch (e) {
          console.error(`Error fetching Firestore ${tab.colRef}:`, e);
        }
      }
      
      setData(JSON.parse(JSON.stringify(loaded)));
      setDbData(JSON.parse(JSON.stringify(loaded)));
      setLoading(false);
    };
    load();
  }, []);

  // Update in local state
  const handleUpdate = (id, payload) => {
    setData(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(c => c.id === id ? { ...c, ...payload } : c),
    }));
  };

  // Delete in local state (mark deleted or remove if custom newly added)
  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    setData(prev => {
      const list = prev[activeTab];
      const isCustomNew = id.startsWith(activeTab[0] + 'custom_') && !dbData[activeTab].some(c => c.id === id);
      
      if (isCustomNew) {
        // Completely remove custom unsaved category
        return { ...prev, [activeTab]: list.filter(c => c.id !== id) };
      } else {
        // Mark deleted so it gets deleted in Firestore upon saving
        return { ...prev, [activeTab]: list.map(c => c.id === id ? { ...c, _deleted: true } : c) };
      }
    });
  };

  // Add new in local state
  const handleAdd = () => {
    if (!newCatName.trim()) return;
    const id = `${activeTab[0]}custom_${Date.now()}`;
    const newCat = { id, name: newCatName.trim(), subs: [] };
    setData(prev => ({ ...prev, [activeTab]: [...prev[activeTab], newCat] }));
    setNewCatName('');
    setShowAddForm(false);
    toast.success('Category added locally. Click "Save Changes" to apply.');
  };

  // Save changes to Firestore
  const handleSaveToDb = async () => {
    setSavingChanges(true);
    try {
      // Find differences in each tab and save to Firestore
      for (const tab of TABS) {
        const localList = data[tab.id];
        const dbList = dbData[tab.id];
        
        // Find modified, added or deleted docs
        for (const localItem of localList) {
          const original = dbList.find(d => d.id === localItem.id);
          const isDirty = !original || 
            original.name !== localItem.name || 
            JSON.stringify(original.subs) !== JSON.stringify(localItem.subs) ||
            localItem._deleted;
            
          if (isDirty) {
            const docRef = doc(db, tab.colRef, localItem.id);
            if (localItem._deleted) {
              // Delete or set deleted flag in DB
              await setDoc(docRef, { _deleted: true, updatedAt: serverTimestamp() }, { merge: true });
            } else {
              // Save / Update doc
              await setDoc(docRef, {
                id: localItem.id || '',
                name: localItem.name || '',
                subs: localItem.subs || [],
                updatedAt: serverTimestamp()
              }, { merge: true });
            }
          }
        }
        
        // Handle categories that were in dbList but completely missing in localList
        for (const dbItem of dbList) {
          const exists = localList.some(l => l.id === dbItem.id);
          if (!exists) {
            await setDoc(doc(db, tab.colRef, dbItem.id), { _deleted: true, updatedAt: serverTimestamp() }, { merge: true });
          }
        }
      }
      
      setDbData(JSON.parse(JSON.stringify(data)));
      toast.success('Changes saved successfully to database!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes: ' + err.message);
    } finally {
      setSavingChanges(false);
    }
  };

  // Discard changes
  const handleDiscardChanges = () => {
    if (!window.confirm('Discard all unsaved changes?')) return;
    setData(JSON.parse(JSON.stringify(dbData)));
    toast.success('Changes discarded');
  };

  // Check if any tab has unsaved changes
  const isDirty = JSON.stringify(data) !== JSON.stringify(dbData);

  const filtered = (data[activeTab] || []).filter(c =>
    !c._deleted && (
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      (c.subs || []).some(s => s.toLowerCase().includes(search.toLowerCase()))
    )
  );

  return (
    <Layout>
      <div className="p-6 space-y-5">

        {/* Permanent Top Banner for Unsaved Changes (Enhanced Visibility) */}
        <div className={`p-4 rounded-2xl border transition-all duration-300 ${
          isDirty 
            ? 'bg-amber-50 border-amber-200 shadow-md text-amber-900' 
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider">
                {isDirty ? '⚠️ You have unsaved changes' : '✓ All changes saved'}
              </h3>
              <p className="text-[10px] font-medium mt-0.5">
                {isDirty 
                  ? 'Please click "Save Changes" on the right to apply updates to the database.' 
                  : 'Your database is fully up to date. Edits made below will require saving.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDiscardChanges}
                disabled={!isDirty || savingChanges}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Discard
              </button>
              <button
                onClick={handleSaveToDb}
                disabled={!isDirty || savingChanges}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-black rounded-xl active:scale-95 transition-all shadow-md ${
                  isDirty 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20' 
                    : 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
                }`}
              >
                {savingChanges ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900" style={{ fontFamily: "'Sora', sans-serif" }}>Categories</h1>
              <p className="text-[11px] text-slate-400 font-medium">All {filtered.length} categories — add, rename, edit sub-categories</p>
            </div>
          </div>
          <button onClick={() => setShowAddForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/20">
            <PlusCircle className="w-4 h-4" /> Add Category
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => {
            const c = COLORS[tab.color];
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch(''); setShowAddForm(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  active ? `${c.btn} text-white shadow-md` : 'bg-white text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-200'
                }`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {(data[tab.id] || []).filter(c => !c._deleted).length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl border border-blue-100 shadow-lg p-4 flex items-center gap-3 animate-fade-in">
            <input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAddForm(false); }}
              placeholder={`New ${currentTab.label} category name...`}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button onClick={handleAdd} disabled={!newCatName.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50">
              <Plus className="w-4 h-4" /> Add
            </button>
            <button onClick={() => setShowAddForm(false)} className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${currentTab.label} categories or sub-categories...`}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm text-slate-400 font-medium">Loading categories…</p>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <currentTab.icon className={`w-4 h-4 ${activeTab === 'services' ? 'text-blue-600' : activeTab === 'industrial' ? 'text-orange-500' : 'text-emerald-600'}`} />
              <h2 className="text-sm font-black text-slate-800">{currentTab.label}</h2>
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${COLORS[currentTab.color].badge}`}>
                {filtered.length} {search ? 'found' : 'categories'}
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {filtered.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-slate-400 text-sm font-medium">
                  {search ? `No results for "${search}"` : 'No categories yet'}
                </div>
              ) : filtered.map(cat => (
                <CategoryRow key={cat.id} cat={cat} color={currentTab.color}
                  onDelete={handleDelete} onUpdate={handleUpdate} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
