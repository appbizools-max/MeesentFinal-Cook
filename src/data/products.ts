const INITIAL_PRODUCTS = [
  {
    id: 'prod1',
    name: 'Industrial Plants & Machinery',
    subCategories: ['Heavy Machinery & Equipment', 'Food Processing Machines', 'Construction Machinery', 'Woodworking Machinery']
  },
  {
    id: 'prod2',
    name: 'Consumer Electronics & Appliances',
    subCategories: ['Kitchen Appliances', 'Washing Machines & Dryers', 'Air Conditioners & Coolers', 'Television & Audio Systems']
  },
  {
    id: 'prod3',
    name: 'Industrial & Engineering Spares',
    subCategories: ['Industrial Valves & Fittings', 'Pumps & Pumping Systems', 'Fasteners', 'Bearings & Power Transmission']
  },
  {
    id: 'prod4',
    name: 'Building Construction Material',
    subCategories: ['Bricks, Cement & Sand', 'Steel & Iron Bars', 'Tiles, Marble & Granite', 'Sanitary Ware & Fittings']
  },
  {
    id: 'prod5',
    name: 'Apparel & Clothing',
    subCategories: ['Men’s, Women’s & Kids\' Wear', 'Sarees & Ethnic Wear', 'Uniforms & Workwear', 'Fabrics & Textiles']
  },
  {
    id: 'prod6',
    name: 'FMCG and Grocery Items',
    subCategories: ['Rice, Atta & Dal', 'Oil & Ghee', 'Spices & Masala', 'Sugar, Salt & Jaggery', 'Snacks & Biscuits', 'Beverages & Soft Drinks', 'Dry Fruits & Nuts', 'Noodles & Instant Food', 'Dairy, Bread & Eggs', 'Chocolates & Candies', 'Pooja Needs', 'Cleaning & Household']
  },
  {
    id: 'prod7',
    name: 'Medical & Healthcare',
    subCategories: ['Pharmaceutical Drugs & Medicines', 'Medical Implants & Devices', 'Surgical Instruments', 'Diagnostic Equipment']
  },
  {
    id: 'prod8',
    name: 'Packaging Material & Machines',
    subCategories: ['Packaging Boxes & Cartons', 'Pouch Packing Machines', 'Plastic & Paper Bags', 'Labeling & Sealing Machines']
  },
  {
    id: 'prod9',
    name: 'Chemicals & Dyes',
    subCategories: ['Industrial Chemicals', 'Dyes & Pigments', 'Laboratory Chemicals', 'Water Treatment Chemicals']
  },
  {
    id: 'prod10',
    name: 'Mechanical Components',
    subCategories: ['Gears & Gear Boxes', 'Springs & Wire Forms', 'Hydraulic & Pneumatic Parts', 'Casting & Forging Parts']
  },
  {
    id: 'prod11',
    name: 'Scientific & Lab Instruments',
    subCategories: ['Lab Glassware & Plasticware', 'Measuring Tools', 'Microscopes & Optical Instruments', 'Testing & Calibration Equipment']
  },
  {
    id: 'prod12',
    name: 'Furniture & Hardware',
    subCategories: ['Home & Office Furniture', 'Furniture Fittings & Handles', 'Wood & Plywood', 'Upholstery & Fabrics']
  },
  {
    id: 'prod13',
    name: 'Agro Machines & Poultry',
    subCategories: ['Agricultural Fertilizers', 'Hybrid Seeds & Plants', 'Tractors & Farm Tools', 'Poultry & Livestock Equipment']
  },
  {
    id: 'prod14',
    name: 'Automobiles & Spares',
    subCategories: ['Two & Four Wheeler Spare Parts', 'Tyres, Tubes & Batteries', 'Car Accessories & Decor', 'Lubricants & Engine Oils']
  },
  {
    id: 'prod15',
    name: 'Housewares & Decor',
    subCategories: ['Home Decor & Art Pieces', 'Kitchenware & Utensils', 'Cleaning Supplies & Tools', 'Lamps & Lighting Fixtures']
  },
  {
    id: 'prod16',
    name: 'Metals, Minerals & Alloys',
    subCategories: ['Iron & Steel Products', 'Aluminum & Copper Alloys', 'Industrial Ores & Minerals', 'Metal Bars, Rods & Sheets']
  },
  {
    id: 'prod17',
    name: 'Tools & Power Tools',
    subCategories: ['Electric Power Tools', 'Hand Tools', 'Cutting & Grinding Tools', 'Precision Measuring Tools']
  },
  {
    id: 'prod18',
    name: 'Gifts, Crafts & Antiques',
    subCategories: ['Corporate & Promotional Gifts', 'Handicrafts & Traditional Art', 'Antique Items & Collectibles', 'Artificial Flowers & Decor']
  },
  {
    id: 'prod19',
    name: 'Kitchenware & Tableware',
    subCategories: ['Stainless Steel Utensils', 'Gas Stoves & Burners', 'Non-stick Cookware', 'Dinner Sets & Tableware']
  },
  {
    id: 'prod20',
    name: 'Textiles, Yarn & Fabrics',
    subCategories: ['Cotton, Silk & Synthetic Fabrics', 'Industrial Yarns & Threads', 'Textile Processing Chemicals', 'Garment Manufacturing Supplies']
  },
  {
    id: 'prod21',
    name: 'Stationery & Books',
    subCategories: ['Office & School Stationery', 'Educational Books & Manuals', 'Writing Pens & Pencils', 'Presentation Boards & Supplies']
  },
  {
    id: 'prod22',
    name: 'Cosmetics & Personal Care',
    subCategories: ['Skin Care & Beauty Products', 'Hair Care & Shampoos', 'Fragrances & Perfumes', 'Personal Hygiene Supplies']
  },
  {
    id: 'prod23',
    name: 'Home Furnishings',
    subCategories: ['Curtains & Blinds', 'Bed Linens & Pillows', 'Carpets & Floor Mats', 'Cushion Covers & Upholstery']
  },
  {
    id: 'prod24',
    name: 'Industrial & Engineering Services',
    subCategories: ['Engineering Project Consultancy', 'Industrial Maintenance Services', 'Quality Testing Services', 'Environmental & Safety Solutions']
  },
  {
    id: 'prod25',
    name: 'Gems & Jewellery',
    subCategories: ['Gold & Silver Jewellery', 'Precious & Semi-Precious Stones', 'Vaastu Shastra Items', 'Astrological Consultation & Remedies']
  },
  {
    id: 'prod26',
    name: 'Computers & IT Support',
    subCategories: ['Desktop & Laptop Computers', 'Business & Industry Software', 'Networking & IT Hardware', 'Website & App Development Services']
  },
  {
    id: 'prod27',
    name: 'Fashion Accessories',
    subCategories: ['Footwear', 'Belts, Wallets & Handbags', 'Watches & Sunglasses', 'Buttons, Zips & Trimmings']
  },
  {
    id: 'prod28',
    name: 'Ayurvedic & Herbal Product',
    subCategories: ['Herbal Supplements & Tonics', 'Ayurvedic Cosmetics', 'Natural Essential Oils', 'Immunity Boosters']
  },
  {
    id: 'prod29',
    name: 'Security & Safety Systems',
    subCategories: ['CCTV Cameras & Surveillance', 'Fire Safety Equipment', 'Biometric & Access Control', 'Personal Protective Equipment']
  },
  {
    id: 'prod30',
    name: 'Sports Goods & Toys',
    subCategories: ['Indoor & Outdoor Sports Gear', 'Fitness & Gym Equipment', 'Kids\' Toys & Educational Games', 'Playground equipment']
  },
  {
    id: 'prod31',
    name: 'Telecom Products',
    subCategories: ['Mobile Handsets and Smartphones', 'Networking Routers and Modems', 'Fiber Optic Cables and Connectors', 'Transmission Towers and Antennas']
  },
  {
    id: 'prod32',
    name: 'Stationery and Paper',
    subCategories: ['Notebooks, Diaries, and Notepads', 'Writing Instruments', 'Office Printing and Photocopy Papers', 'Envelopes, Files, and Folders']
  },
  {
    id: 'prod33',
    name: 'Bags & Luggage',
    subCategories: ['Travel Suitcases and Trolley Bags', 'Ladies Handbags and Cluches', 'Men’s Leather Wallets and Belts', 'School and Laptop Backpacks']
  },
  {
    id: 'prod34',
    name: 'Stones & Marble',
    subCategories: ['Polished Granite Slabs and Tiles', 'Decorative Marble and Floorings', 'Sandstone and Limestone Blocks', 'Natural Paving and Cobble Stones']
  },
  {
    id: 'prod35',
    name: 'Bicycles & Spares',
    subCategories: ['Mountain, Road, and Hybrid Bicycles', 'Cycle Spare Parts', 'Passenger and Cargo Rickshaws', 'Safety Gear']
  },
  {
    id: 'prod36',
    name: 'Railway & Aviation Products',
    subCategories: ['Railway Track and Coach Components', 'Marine Engine Parts and Anchors', 'Aircraft Interior and Cabin Equipment', 'Navigation and Signaling Systems']
  },
  {
    id: 'prod37',
    name: 'Leather Products',
    subCategories: ['Leather Jackets and Apparel', 'Formal and Casual Leather Footwear', 'Industrial Leather Gloves and Aprons', 'Leather Briefcases and Travel Bags']
  },
  {
    id: 'prod38',
    name: 'Electronics Components',
    subCategories: ['Integrated Circuits (ICs) and Microchips', 'Resistors, Capacitors, and Diodes', 'Printed Circuit Boards (PCB)', 'Sensors and Electronic Modules']
  },
  {
    id: 'prod39',
    name: 'Electrical Equipment',
    subCategories: ['Power Transformers and Generators', 'Electrical Wires and Industrial Cables', 'Switchgears and Circuit Breakers', 'Industrial Motors and Power Inverters']
  },
  {
    id: 'prod40',
    name: 'Pharma & Medicines',
    subCategories: ['Prescription Medicines and Tablets', 'Vitamins and Nutritional Supplements', 'Surgical Instruments and Medical Tools', 'Diagnostic Kits and Health Monitors']
  },
  {
    id: 'prod41',
    name: 'Go & Green Products',
    subCategories: ['Eco-friendly Products', 'Solar Energy Equipment', 'Biodegradable Items', 'Organic Products']
  },
  {
    id: 'prod42',
    name: 'FMCG Essentials',
    subCategories: ['Toiletries & Hygiene', 'Household Cleaning', 'Paper Products', 'Personal Care']
  },
  {
    id: 'prod43',
    name: 'Office & School Supplies',
    subCategories: ['Stationery Items', 'Office Furniture', 'Computers & Laptops', 'Printers & Scanners']
  },
  {
    id: 'prod44',
    name: 'Home Appliances',
    subCategories: ['Kitchen Appliances', 'Refrigerators', 'Washing Machines', 'Air Conditioners']
  },
  {
    id: 'prod45',
    name: 'Sports & Fitness',
    subCategories: ['Gym Equipment', 'Sports Gear', 'Yoga & Meditation', 'Outdoor Activities']
  }
];

export const ALL_PRODUCTS = [...INITIAL_PRODUCTS];

// ── Firestore live sync mapping for Industrial Mart ──
import { db } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const ADMIN_ID_MAP: Record<string, string> = {
  'i1': 'prod1',
  'i2': 'prod2',
  'i3': 'prod3',
  'i4': 'prod4',
  'i5': 'prod5',
  'i6': 'prod6',
  'i7': 'prod7',
  'i8': 'prod9',
  'i9': 'prod10',
  'i10': 'prod39',
  'i11': 'prod17',
  'i12': 'prod12',
  'i13': 'prod16',
  'i14': 'prod8',
  'i15': 'prod14',
  'i16': 'prod13',
  'i17': 'prod20',
  'i18': 'prod22',
  'i19': 'prod29',
  'i20': 'prod25',
  'i21': 'prod26',
  'i22': 'prod40',
  'i23': 'prod11',
  'i24': 'prod18',
  'i25': 'prod21',
  'i26': 'prod41',
  'i27': 'prod28',
  'i28': 'prod30',
  'i29': 'prod44',
  'i30': 'prod33',
  'i31': 'prod15',
  'i32': 'prod19',
  'i33': 'prod23',
  'i34': 'prod24',
  'i35': 'prod27',
  'i36': 'prod31',
  'i37': 'prod32',
  'i38': 'prod34',
  'i39': 'prod35',
  'i40': 'prod36',
  'i41': 'prod37',
  'i42': 'prod38',
  'i43': 'prod42',
  'i44': 'prod43',
  'i45': 'prod45'
};

try {
  onSnapshot(collection(db, 'cat_industrial'), (snap) => {
    if (!snap || snap.empty || !snap.docs) return;
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    
    const baseCopy = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    const finalProds: any[] = [];

    baseCopy.forEach((baseProd: any) => {
      const docId = Object.keys(ADMIN_ID_MAP).find(key => ADMIN_ID_MAP[key] === baseProd.id);
      const matchedDoc = docId ? docs.find(d => d.id === docId) : docs.find(d => d.name?.toLowerCase() === baseProd.name?.toLowerCase());

      if (matchedDoc) {
        if (matchedDoc._deleted) return;
        baseProd.name = matchedDoc.name || baseProd.name;
        baseProd.subCategories = matchedDoc.subs || baseProd.subCategories;
      }
      finalProds.push(baseProd);
    });

    docs.forEach(doc => {
      const isCustom = !ADMIN_ID_MAP[doc.id] && !baseCopy.some((bp: any) => bp.name?.toLowerCase() === doc.name?.toLowerCase());
      if (isCustom && !doc._deleted && doc.name) {
        finalProds.push({
          id: doc.id,
          name: doc.name,
          subCategories: doc.subs || []
        });
      }
    });

    ALL_PRODUCTS.length = 0;
    ALL_PRODUCTS.push(...finalProds);
  });
} catch (e) {
  console.log('Error initializing products live sync:', e);
}

