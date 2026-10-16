const INITIAL_CATEGORIES = [
  {
    id: 'daily_needs',
    name: 'Daily Needs',
    icon: 'shopping-basket',
    icon8: 'https://img.icons8.com/color/96/shopping-basket.png',
    subCategories: ['Grocery', 'Fruits', 'Vegetables', 'Milk & Dairy', 'Medicines', 'Electricians', 'Plumbers', 'AC Repair', 'Stationery', 'Milkman', 'Paperwala', 'Gardener', 'Home Cleaning', 'Pest Control', 'Carpenter', 'Painter', 'Electronics Repair', 'Gas Agency', 'Water Supply', 'Laundry', 'Security Guard', 'Pooja Needs']
  },

  {
    id: 'food',
    name: 'Food',
    icon: 'utensils',
    icon8: 'https://img.icons8.com/color/96/restaurant.png',
    subCategories: ['Restaurants', 'Breakfast', 'Lunch', 'Dinner', 'Biryani & Pulao', 'Pizza & Burger', 'Rolls & Sandwiches', 'Chinese', 'South Indian', 'North Indian', 'Sweets & Desserts', 'Bakery', 'Street Food', 'Juices & Shakes', 'Cafe & Coffee', 'Home Delivery', 'Takeaway', 'Catering Services']
  },
  {
    id: 'automobile',
    name: 'Automobile',
    icon: 'car',
    icon8: 'https://img.icons8.com/color/96/car.png',
    subCategories: ['New Cars', 'Used Cars', 'Sell Cars', 'New Two-Wheelers', 'Used Two-Wheelers', 'Sell Two-Wheelers', 'Car Repairs', 'Bike Repairs', 'Auto Accessories', 'Vehicle Insurance', 'Car Rentals']
  },

  {
    id: 'baby_care',
    name: 'Baby Care',
    icon: 'baby',
    icon8: 'https://img.icons8.com/color/96/baby-bottle.png',
    subCategories: ['Babysitters', 'Baby Bedding', 'Baby Clothes', 'Baby Creams', 'Diapers', 'Baby Footwear', 'Grooming', 'Safety Products', 'Toys', 'Baby Health']
  },
  {
    id: 'banquets',
    name: 'Banquets & Venues',
    icon: 'glass-cheers',
    icon8: 'https://img.icons8.com/color/96/party-baloons.png',
    subCategories: ['All Banquet Halls', '5-Star Banquet Halls', 'AC Banquet Halls', 'Non-AC Banquet Halls', 'Lawn for Events', 'Rooftop Banquet Halls', 'Wedding Venues', 'Party Halls']
  },
  {
    id: 'beauty',
    name: 'Beauty & Personal Care',
    icon: 'spa',
    icon8: 'https://img.icons8.com/color/96/cosmetic-brush.png',
    subCategories: ['Beauty Parlours', 'Beauty Services', 'Bridal Makeup', 'Bridegroom Makeup', 'Salons', 'Spas', 'Skin Care Clinics', 'Hair Care Services']
  },
  {
    id: 'bills',
    name: 'Bills & Recharge',
    icon: 'file-invoice-dollar',
    icon8: 'https://img.icons8.com/color/96/bill.png',
    subCategories: ['Mobile Recharge', 'Electricity Bill', 'Gas Bill', 'DTH Recharge', 'Broadband Recharge', 'Water Bill']
  },
  {
    id: 'borewell',
    name: 'Borewell Services',
    icon: 'tint',
    icon8: 'https://img.icons8.com/color/96/water.png',
    subCategories: ['Borewell Contractors', 'Borewell Cleaning', 'Borewell Scanning', 'Borewell Drilling']
  },
  {
    id: 'bulk_comm',
    name: 'Bulk Communication Services',
    icon: 'sms',
    icon8: 'https://img.icons8.com/color/96/sms.png',
    subCategories: ['Bulk SMS', 'Bulk Email', 'IVR Services', 'VOIP Services', 'Call Centre Solutions']
  },
  {
    id: 'cake_shops',
    name: 'Cake Shops',
    icon: 'birthday-cake',
    icon8: 'https://img.icons8.com/color/96/birthday-cake.png',
    subCategories: ['Cake Shops', 'Cake Delivery', 'Wedding Cakes', 'Customised Cakes', 'Photo Cakes', 'Bakery']
  },
  {
    id: 'caterers',
    name: 'Caterers',
    icon: 'concierge-bell',
    icon8: 'https://img.icons8.com/color/96/waiter.png',
    subCategories: ['All Caterers', 'Birthday Party Caterers', 'Housewarming Caterers', 'Wedding Caterers', 'Corporate Caterers']
  },
  {
    id: 'contractors',
    name: 'Contractors',
    icon: 'hammer',
    icon8: 'https://img.icons8.com/color/96/worker.png',
    subCategories: ['Civil Contractors', 'Carpentry Contractors', 'Electrical Contractors', 'Flooring Contractors', 'Furniture Contractors', 'Plumbing Contractors', 'Builders', 'Aluminium Partition Contractors', 'Sliding Window Contractors', 'Roofing Contractors', 'Waterproofing Contractors', 'Gypsum False Ceiling Contractors', 'POP Contractors', 'PVC False Ceiling Contractors', 'Painting Contractors (Residential)', 'Painting Contractors (Commercial)', 'Painting Contractors (Interior)']
  },
  {
    id: 'consultants',
    name: 'Consultants',
    icon: 'user-tie',
    icon8: 'https://img.icons8.com/color/96/consultation.png',
    subCategories: ['Lawyers', 'Chartered Accountants', 'Auditors', 'Income Tax Consultants', 'GST Consultants', 'Valuers', 'Business Consultants']
  },
  {
    id: 'decorators',
    name: 'Decorators',
    icon: 'palette',
    icon8: 'https://img.icons8.com/color/96/paint-palette.png',
    subCategories: ['Mandap Decorators', 'Wedding Decorators', 'Flower Decorators', 'Party Decorators', 'Birthday Decorators', 'Balloon Decorators', 'Stage Decorators', 'Lighting Decorators', 'Hall Decorators', 'Pandal Decorators', 'Exhibition Decorators']
  },
  {
    id: 'doctors',
    name: 'Doctors & Medical',
    icon: 'stethoscope',
    icon8: 'https://img.icons8.com/color/96/stethoscope.png',
    subCategories: ['Ayurvedic Doctors', 'Orthopaedic Doctors', 'Cardiologists', 'Chest Specialists', 'Child Specialists', 'Dentists', 'Dermatologists', 'Diabetologists', 'ENT Specialists', 'Eye Specialists', 'Gastroenterologists', 'General Physicians', 'Gynaecologists', 'Homeopathic Doctors', 'Neurologists', 'Neurosurgeons', 'Oncologists', 'Ophthalmologists', 'Paediatricians', 'Physiotherapists', 'Psychiatrists', 'Psychologists', 'Skin & Hair Specialists', 'Urologists', 'Emergency Doctors', 'Diagnostic Centres', 'Surgeons']
  },
  {
    id: 'event_organizers',
    name: 'Event Organizers',
    icon: 'calendar-alt',
    icon8: 'https://img.icons8.com/color/96/calendar.png',
    subCategories: ['Private Party Organizers', 'Seminar Organizers', 'Stage Show Organizers', 'Trade Fair Organizers', 'Wedding Organizers', 'Corporate Event Organizers']
  },
  {
    id: 'florists',
    name: 'Florists',
    icon: 'leaf',
    icon8: 'https://img.icons8.com/color/96/flower.png',
    subCategories: ['Florists', 'Flower Shops', 'Home Delivery Florists', '24-Hour Florists', 'Wedding Florists', 'Chocolate Bouquet Florists']
  },
  {
    id: 'housekeeping',
    name: 'Housekeeping',
    icon: 'broom',
    icon8: 'https://img.icons8.com/color/96/broom.png',
    subCategories: ['Cooks', 'Maids', 'Drivers', 'Gardeners', 'Laundry Services', 'Cleaning Services', 'Security Staff']
  },
  {
    id: 'interior_designers',
    name: 'Interior Designers',
    icon: 'paint-roller',
    icon8: 'https://img.icons8.com/color/96/interior.png',
    subCategories: ['Architects', 'Residential Interior Designers', 'Commercial Interior Designers', 'Interior Decorators', 'Modular Kitchen Designers', 'Interior Architects', 'Furnishing Contractors']
  },
  {
    id: 'internet_digital',
    name: 'Internet & Digital',
    icon: 'wifi',
    icon8: 'https://img.icons8.com/color/96/wifi.png',
    subCategories: ['Internet Service Providers', 'Web Designers', 'Cyber Cafes', 'WiFi Providers', 'Digital Marketing Services']
  },
  {
    id: 'language_classes',
    name: 'Language Classes',
    icon: 'language',
    icon8: 'https://img.icons8.com/color/96/translation.png',
    subCategories: ['Chinese', 'English', 'French', 'German', 'Hindi', 'Japanese', 'Spanish', 'IELTS / TOEFL Coaching']
  },
  {
    id: 'modular_kitchen',
    name: 'Modular Kitchen',
    icon: 'fire',
    icon8: 'https://img.icons8.com/color/96/kitchen.png',
    subCategories: ['Chimneys', 'Cabinets', 'Gas Stoves', 'Built-in Hobs', 'Shutters', 'U-Shaped Kitchens', 'Complete Modular Kitchens']
  },
  {
    id: 'packers_movers',
    name: 'Packers & Movers',
    icon: 'truck',
    icon8: 'https://img.icons8.com/color/96/delivery-truck.png',
    subCategories: ['Local', 'National', 'International', 'Automobile Movers', 'Commercial Movers', 'Transporters']
  },
  {
    id: 'party_services',
    name: 'Party Services',
    icon: 'music',
    icon8: 'https://img.icons8.com/color/96/music.png',
    subCategories: ['DJ on Hire', 'Event Organisers', 'Photographers', 'Party Organisers for Children', 'Playback Singers', 'Anchors / MCs']
  },
  {
    id: 'pest_control',
    name: 'Pest Control',
    icon: 'bug',
    icon8: 'https://img.icons8.com/color/96/insect.png',
    subCategories: ['Residential Pest Control', 'Commercial Pest Control', 'Termite Control', 'Rodent Control']
  },
  {
    id: 'pet_care',
    name: 'Pet & Pet Care',
    icon: 'paw',
    icon8: 'https://img.icons8.com/color/96/dog.png',
    subCategories: ['Pet Accessories', 'Pet Food', 'Pet Shops', 'Veterinary Doctors', 'Grooming Services']
  },
  {
    id: 'pg_hostel',
    name: 'PG/Hostel',
    icon: 'bed',
    icon8: 'https://img.icons8.com/color/96/bed.png',
    subCategories: ['PG for Men', 'PG for Women', 'Co-living PG', 'Student Hostel', 'Working Women Hostel', 'Working Men Hostel', 'Day Scholar Hostel', 'Luxury PG', 'Budget PG']
  },
  {
    id: 'real_estate',
    name: 'Real Estate',
    icon: 'city',
    icon8: 'https://img.icons8.com/color/96/home.png',
    subCategories: ['Buy Property', 'Rent Property', 'Sell Property', 'Post Free Property Ads', 'Commercial Property']
  },
  {
    id: 'rent_hire',
    name: 'Rent & Hire',
    icon: 'key',
    icon8: 'https://img.icons8.com/color/96/key.png',
    subCategories: ['Car on Rent', 'Costumes on Rent', 'Mini Bus on Rent', 'AC on Rent', 'Furniture on Rent', 'Generator on Rent']
  },
  {
    id: 'repairs_services',
    name: 'Repairs & Services',
    icon: 'tools',
    icon8: 'https://img.icons8.com/color/96/wrench.png',
    subCategories: ['AC Repair', 'Car Repair', 'Computer Repair', 'Laptop Repair', 'Mobile Repair', 'Motorcycle Repair', 'Refrigerator Repair', 'TV Repair', 'Washing Machine Repair', 'Water Purifier Repair']
  },
  {
    id: 'security_cctv',
    name: 'Security & CCTV',
    icon: 'shield-alt',
    icon8: 'https://img.icons8.com/color/96/shield.png',
    subCategories: ['Bodyguards', 'CCTV Cameras', 'Detectives', 'Locks', 'Security Services', 'Walkie Talkies', 'Access Control Systems']
  },
  {
    id: 'training_institutes',
    name: 'Training Institutes',
    icon: 'graduation-cap',
    icon8: 'https://img.icons8.com/color/96/graduation-cap.png',
    subCategories: ['Basic Computing', 'Computer Hardware', 'Networking', 'Database Training', 'Engineering Design', 'Mobile Development', 'Multimedia & Design', 'Software Development', 'Spoken English']
  }
];

export const ALL_CATEGORIES = [...INITIAL_CATEGORIES];

// ── Firestore live sync mapping ──
import { db } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const ADMIN_ID_MAP: Record<string, string> = {
  's1': 'daily_needs',
  's2': 'food',
  's3': 'automobile',
  's4': 'beauty',
  's5': 'banquets',
  's6': 'doctors',
  's7': 'contractors',
  's8': 'consultants',
  's9': 'event_organizers',
  's10': 'packers_movers',
  's11': 'repairs_services',
  's12': 'real_estate',
  's13': 'security_cctv',
  's14': 'training_institutes',
  's15': 'interior_designers',
  's16': 'pest_control',
  's17': 'pet_care',
  's18': 'pg_hostel',
  's19': 'housekeeping',
  's20': 'florists',
  's21': 'caterers',
  's22': 'internet_digital',
  's23': 'borewell',
  's24': 'party_services',
  's25': 'modular_kitchen',
  's26': 'decorators',
  's27': 'rent_hire',
  's28': 'baby_care',
  's29': 'language_classes',
  's30': 'bulk_comm',
  's31': 'bills',
  's32': 'cake_shops'
};

// Listen for updates on cat_services in real-time
try {
  onSnapshot(collection(db, 'cat_services'), (snap) => {
    if (!snap || snap.empty || !snap.docs) return;
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
    // Copy the original base categories
    const baseCopy = JSON.parse(JSON.stringify(INITIAL_CATEGORIES));
    const finalCats: any[] = [];

    // Map each base category
    baseCopy.forEach((baseCat: any) => {
      // Find matching doc from Firestore
      const docId = Object.keys(ADMIN_ID_MAP).find(key => ADMIN_ID_MAP[key] === baseCat.id);
      const matchedDoc = docId ? docs.find(d => d.id === docId) : docs.find(d => d.name?.toLowerCase() === baseCat.name?.toLowerCase());

      if (matchedDoc) {
        if (matchedDoc._deleted) return; // Skip if marked deleted
        baseCat.name = matchedDoc.name || baseCat.name;
        baseCat.subCategories = matchedDoc.subs || baseCat.subCategories;
      }
      finalCats.push(baseCat);
    });

    // Add new custom categories added by the admin
    docs.forEach(doc => {
      const isCustom = !ADMIN_ID_MAP[doc.id] && !baseCopy.some((bc: any) => bc.name?.toLowerCase() === doc.name?.toLowerCase());
      if (isCustom && !doc._deleted && doc.name) {
        finalCats.push({
          id: doc.id,
          name: doc.name,
          icon: 'tag',
          icon8: 'https://img.icons8.com/color/96/tag.png',
          subCategories: doc.subs || []
        });
      }
    });

    // Mutate exported array in-place
    ALL_CATEGORIES.length = 0;
    ALL_CATEGORIES.push(...finalCats);
  });
} catch (e) {
  console.log('Error initializing categories live sync:', e);
}

