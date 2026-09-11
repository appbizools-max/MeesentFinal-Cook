import React, { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import toast from 'react-hot-toast';
import { Package, Plus, Trash2 } from 'lucide-react';

// Product Categories (separate from service categories)
const PRODUCT_CATEGORIES = [
  { id: 'industrial_plant', name: 'Industrial Plant & Machinery' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'construction_equipment', name: 'Construction Equipment' },
  { id: 'medical_equipment', name: 'Medical Equipment' },
  { id: 'agriculture_equipment', name: 'Agriculture Equipment' },
  { id: 'automotive_parts', name: 'Automotive Parts' },
  { id: 'chemicals', name: 'Chemicals' },
  { id: 'packaging_materials', name: 'Packaging Materials' },
  { id: 'safety_equipment', name: 'Safety Equipment' },
  { id: 'tools_hardware', name: 'Tools & Hardware' },
];

const PRODUCT_SUB_CATEGORIES = {
  industrial_plant: ['Boilers', 'Turbines', 'Generators', 'Compressors', 'Pumps', 'Motors', 'Transformers', 'Furnaces', 'Conveyors', 'Cranes', 'Material Handling', 'Process Equipment'],
  electronics: ['Computers', 'Laptops', 'Mobile Phones', 'Tablets', 'Televisions', 'Cameras', 'Audio Systems', 'Home Appliances', 'Office Equipment', 'Networking', 'Components'],
  construction_equipment: ['Excavators', 'Bulldozers', 'Cranes', 'Loaders', 'Mixers', 'Compactors', 'Concrete Pumps', 'Scaffolding', 'Power Tools', 'Hand Tools'],
  medical_equipment: ['Diagnostic Equipment', 'Surgical Instruments', 'Patient Monitoring', 'Imaging Systems', 'Lab Equipment', 'Hospital Furniture', 'Dental Equipment', 'Orthopedic', 'Consumables'],
  agriculture_equipment: ['Tractors', 'Harvesters', 'Plows', 'Seeders', 'Irrigation Systems', 'Sprayers', 'Crop Processing', 'Livestock Equipment', 'Greenhouse', 'Storage'],
  automotive_parts: ['Engine Parts', 'Transmission', 'Brakes', 'Suspension', 'Electrical', 'Body Parts', 'Accessories', 'Tires', 'Filters', 'Fluids'],
  chemicals: ['Industrial Chemicals', 'Solvents', 'Acids', 'Alkalis', 'Polymers', 'Resins', 'Adhesives', 'Coatings', 'Specialty Chemicals', 'Raw Materials'],
  packaging_materials: ['Boxes', 'Containers', 'Bottles', 'Bags', 'Labels', 'Wrapping', 'Pallets', 'Strapping', 'Foam', 'Cushioning'],
  safety_equipment: ['Protective Clothing', 'Safety Helmets', 'Gloves', 'Eye Protection', 'Footwear', 'Respirators', 'Fall Protection', 'Fire Safety', 'First Aid', 'Signage'],
  tools_hardware: ['Hand Tools', 'Power Tools', 'Measuring Tools', 'Cutting Tools', 'Fasteners', 'Hardware', 'Electrical Tools', 'Plumbing Tools', 'Welding Equipment', 'Storage'],
};

// Service Categories from the mobile app
const CATEGORIES = [
  { id: 'daily_needs', name: 'Daily Needs' },
  { id: 'food', name: 'Food' },
  { id: 'automobile', name: 'Automobile' },
  { id: 'baby_care', name: 'Baby Care' },
  { id: 'banquets', name: 'Banquets & Venues' },
  { id: 'beauty', name: 'Beauty & Personal Care' },
  { id: 'bills', name: 'Bills & Recharge' },
  { id: 'borewell', name: 'Borewell Services' },
  { id: 'bulk_comm', name: 'Bulk Communication Services' },
  { id: 'cake_shops', name: 'Cake Shops' },
  { id: 'caterers', name: 'Caterers' },
  { id: 'contractors', name: 'Contractors' },
  { id: 'consultants', name: 'Consultants' },
  { id: 'decorators', name: 'Decorators' },
  { id: 'doctors', name: 'Doctors & Medical' },
  { id: 'event_organizers', name: 'Event Organizers' },
  { id: 'florists', name: 'Florists' },
  { id: 'housekeeping', name: 'Housekeeping' },
  { id: 'interior_designers', name: 'Interior Designers' },
  { id: 'internet_digital', name: 'Internet & Digital' },
  { id: 'language_classes', name: 'Language Classes' },
  { id: 'modular_kitchen', name: 'Modular Kitchen' },
  { id: 'packers_movers', name: 'Packers & Movers' },
  { id: 'party_services', name: 'Party Services' },
  { id: 'pest_control', name: 'Pest Control' },
  { id: 'pet_care', name: 'Pet & Pet Care' },
  { id: 'real_estate', name: 'Real Estate' },
  { id: 'rent_hire', name: 'Rent & Hire' },
  { id: 'repairs_services', name: 'Repairs & Services' },
  { id: 'security_cctv', name: 'Security & CCTV' },
  { id: 'training_institutes', name: 'Training Institutes' },
];

const SUB_CATEGORIES = {
  daily_needs: ['Movies', 'Grocery', 'Fruits', 'Vegetables', 'Milk & Dairy', 'Medicines', 'Electricians', 'Plumbers', 'AC Repair', 'Stationery', 'Milkman', 'Paperwala', 'Gardener', 'Home Cleaning', 'Pest Control', 'Carpenter', 'Painter', 'Electronics Repair', 'Gas Agency', 'Water Supply', 'Laundry', 'Security Guard', 'Pooja Needs'],
  food: ['Restaurants', 'Breakfast', 'Lunch', 'Dinner', 'Biryani & Pulao', 'Pizza & Burger', 'Rolls & Sandwiches', 'Chinese', 'South Indian', 'North Indian', 'Sweets & Desserts', 'Bakery', 'Street Food', 'Juices & Shakes', 'Cafe & Coffee', 'Home Delivery', 'Takeaway', 'Catering Services'],
  automobile: ['New Cars', 'Used Cars', 'Sell Cars', 'New Two-Wheelers', 'Used Two-Wheelers', 'Sell Two-Wheelers', 'Car Repairs', 'Bike Repairs', 'Auto Accessories', 'Vehicle Insurance', 'Car Rentals'],
  baby_care: ['Babysitters', 'Baby Bedding', 'Baby Clothes', 'Baby Creams', 'Diapers', 'Baby Footwear', 'Grooming', 'Safety Products', 'Toys', 'Baby Health'],
  banquets: ['All Banquet Halls', '5-Star Banquet Halls', 'AC Banquet Halls', 'Non-AC Banquet Halls', 'Lawn for Events', 'Rooftop Banquet Halls', 'Wedding Venues', 'Party Halls'],
  beauty: ['Beauty Parlours', 'Beauty Services', 'Bridal Makeup', 'Bridegroom Makeup', 'Salons', 'Spas', 'Skin Care Clinics', 'Hair Care Services'],
  bills: ['Mobile Recharge', 'Electricity Bill', 'Gas Bill', 'DTH Recharge', 'Broadband Recharge', 'Water Bill'],
  borewell: ['Borewell Contractors', 'Borewell Cleaning', 'Borewell Scanning', 'Borewell Drilling'],
  bulk_comm: ['Bulk SMS', 'Bulk Email', 'IVR Services', 'VOIP Services', 'Call Centre Solutions'],
  cake_shops: ['Cake Shops', 'Cake Delivery', 'Wedding Cakes', 'Customised Cakes', 'Photo Cakes', 'Bakery'],
  caterers: ['All Caterers', 'Birthday Party Caterers', 'Housewarming Caterers', 'Wedding Caterers', 'Corporate Caterers'],
  contractors: ['Civil Contractors', 'Carpentry Contractors', 'Electrical Contractors', 'Flooring Contractors', 'Furniture Contractors', 'Plumbing Contractors', 'Builders', 'Aluminium Partition Contractors', 'Sliding Window Contractors', 'Roofing Contractors', 'Waterproofing Contractors', 'Gypsum False Ceiling Contractors', 'POP Contractors', 'PVC False Ceiling Contractors', 'Painting Contractors (Residential)', 'Painting Contractors (Commercial)', 'Painting Contractors (Interior)'],
  consultants: ['Lawyers', 'Chartered Accountants', 'Auditors', 'Income Tax Consultants', 'GST Consultants', 'Valuers', 'Business Consultants'],
  decorators: ['Mandap Decorators', 'Wedding Decorators', 'Flower Decorators', 'Party Decorators', 'Birthday Decorators', 'Balloon Decorators', 'Stage Decorators', 'Lighting Decorators', 'Hall Decorators', 'Pandal Decorators', 'Exhibition Decorators'],
  doctors: ['Ayurvedic Doctors', 'Orthopaedic Doctors', 'Cardiologists', 'Chest Specialists', 'Child Specialists', 'Dentists', 'Dermatologists', 'Diabetologists', 'ENT Specialists', 'Eye Specialists', 'Gastroenterologists', 'General Physicians', 'Gynaecologists', 'Homeopathic Doctors', 'Neurologists', 'Neurosurgeons', 'Oncologists', 'Ophthalmologists', 'Paediatricians', 'Physiotherapists', 'Psychiatrists', 'Psychologists', 'Skin & Hair Specialists', 'Urologists', 'Emergency Doctors', 'Diagnostic Centres', 'Surgeons'],
  event_organizers: ['Private Party Organizers', 'Seminar Organizers', 'Stage Show Organizers', 'Trade Fair Organizers', 'Wedding Organizers', 'Corporate Event Organizers'],
  florists: ['Florists', 'Flower Shops', 'Home Delivery Florists', '24-Hour Florists', 'Wedding Florists', 'Chocolate Bouquet Florists'],
  housekeeping: ['Cooks', 'Maids', 'Drivers', 'Gardeners', 'Laundry Services', 'Cleaning Services', 'Security Staff'],
  interior_designers: ['Architects', 'Residential Interior Designers', 'Commercial Interior Designers', 'Interior Decorators', 'Modular Kitchen Designers', 'Interior Architects', 'Furnishing Contractors'],
  internet_digital: ['Internet Service Providers', 'Web Designers', 'Cyber Cafes', 'WiFi Providers', 'Digital Marketing Services'],
  language_classes: ['Chinese', 'English', 'French', 'German', 'Hindi', 'Japanese', 'Spanish', 'IELTS / TOEFL Coaching'],
  modular_kitchen: ['Chimneys', 'Cabinets', 'Gas Stoves', 'Built-in Hobs', 'Shutters', 'U-Shaped Kitchens', 'Complete Modular Kitchens'],
  packers_movers: ['Local', 'National', 'International', 'Automobile Movers', 'Commercial Movers', 'Transporters'],
  party_services: ['DJ on Hire', 'Event Organisers', 'Photographers', 'Party Organisers for Children', 'Playback Singers', 'Anchors / MCs'],
  pest_control: ['Residential Pest Control', 'Commercial Pest Control', 'Termite Control', 'Rodent Control'],
  pet_care: ['Pet Accessories', 'Pet Food', 'Pet Shops', 'Veterinary Doctors', 'Grooming Services'],
  real_estate: ['Buy Property', 'Rent Property', 'Sell Property', 'Post Free Property Ads', 'Commercial Property'],
  rent_hire: ['Car on Rent', 'Costumes on Rent', 'Mini Bus on Rent', 'AC on Rent', 'Furniture on Rent', 'Generator on Rent'],
  repairs_services: ['AC Repair', 'Car Repair', 'Computer Repair', 'Laptop Repair', 'Mobile Repair', 'Motorcycle Repair', 'Refrigerator Repair', 'TV Repair', 'Washing Machine Repair', 'Water Purifier Repair'],
  security_cctv: ['Bodyguards', 'CCTV Cameras', 'Detectives', 'Locks', 'Security Services', 'Walkie Talkies', 'Access Control Systems'],
  training_institutes: ['Basic Computing', 'Computer Hardware', 'Networking', 'Database Training', 'Engineering Design', 'Mobile Development', 'Multimedia & Design', 'Software Development', 'Spoken English'],
};

export const Brand = () => {
  const [activeTab, setActiveTab] = useState('service');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [brandName, setBrandName] = useState('');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setSubCategory('');
  };

  // Get the appropriate categories based on active tab
  const currentCategories = activeTab === 'product' ? PRODUCT_CATEGORIES : CATEGORIES;
  const currentSubCategories = activeTab === 'product' ? PRODUCT_SUB_CATEGORIES : SUB_CATEGORIES;

  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (!category || !subCategory || !brandName) {
      toast.error('Please fill all required fields');
      return;
    }

    if (activeTab === 'product' && !productName) {
      toast.error('Please enter product name');
      return;
    }

    setLoading(true);
    try {
      const categoryName = currentCategories.find((c) => c.id === category)?.name || category;
      const brandData = {
        category,
        categoryName,
        subCategory,
        brandName,
        type: activeTab,
        createdAt: new Date().toISOString(),
      };

      if (activeTab === 'product') {
        brandData.productName = productName;
        brandData.productDescription = productDescription;
        brandData.productPrice = productPrice;
      }

      await addDoc(collection(db, 'brands'), brandData);
      toast.success(`${activeTab === 'product' ? 'Product' : 'Brand'} added successfully`);
      setBrandName('');
      setProductName('');
      setProductDescription('');
      setProductPrice('');
      setCategory('');
      setSubCategory('');
      fetchBrands();
    } catch (error) {
      toast.error('Failed to add brand');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const q = query(collection(db, 'brands'), where('type', '==', activeTab));
      const snapshot = await getDocs(q);
      const brandsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBrands(brandsData);
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    }
  };

  React.useEffect(() => {
    fetchBrands();
  }, [activeTab]);

  const handleDeleteBrand = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await deleteDoc(doc(db, 'brands', id));
      toast.success('Brand deleted successfully');
      fetchBrands();
    } catch (error) {
      toast.error('Failed to delete brand');
    }
  };

  return (
    <Layout>
      <div className="flex-1 bg-[#F8FAFC] min-h-screen">
        <div className="p-10">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Brand Management</h1>
            <p className="text-sm font-bold text-gray-400 mt-2">Manage brands for services and products</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveTab('service')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'service'
                  ? 'bg-[#bc36ad] text-white shadow-lg shadow-[#bc36ad]/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab('product')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === 'product'
                  ? 'bg-[#bc36ad] text-white shadow-lg shadow-[#bc36ad]/20'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Products
            </button>
          </div>

          {/* Add Brand Form */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 mb-8">
            <h2 className="text-xl font-black text-gray-900 mb-6">Add New {activeTab === 'product' ? 'Product' : 'Brand'}</h2>
            <form onSubmit={handleAddBrand} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={handleCategoryChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                  >
                    <option value="">Select Category</option>
                    {currentCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Sub Category
                  </label>
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    required
                    disabled={!category}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold disabled:opacity-50"
                  >
                    <option value="">Select Sub Category</option>
                    {category && currentSubCategories[category]?.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    required
                    placeholder="Enter brand name"
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                  />
                </div>
              </div>

              {activeTab === 'product' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      required
                      placeholder="Enter product name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Product Price
                    </label>
                    <input
                      type="text"
                      value={productPrice}
                      onChange={(e) => setProductPrice(e.target.value)}
                      placeholder="Enter product price"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Product Description
                    </label>
                    <input
                      type="text"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      placeholder="Enter product description"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-6 py-3 rounded-xl bg-[#bc36ad] text-white font-black uppercase tracking-widest shadow-lg shadow-[#bc36ad]/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60"
              >
                <Plus className="w-4 h-4 mr-2" />
                {loading ? 'Adding...' : `Add ${activeTab === 'product' ? 'Product' : 'Brand'}`}
              </button>
            </form>
          </div>

          {/* Brands List */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
            <h2 className="text-xl font-black text-gray-900 mb-6">
              {activeTab === 'service' ? 'Service Brands' : 'Product Brands'}
            </h2>
            {brands.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-bold">No brands added yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{brand.brandName}</p>
                      <p className="text-sm text-gray-500">
                        {brand.categoryName || (brand.type === 'product' ? PRODUCT_CATEGORIES.find((c) => c.id === brand.category)?.name : CATEGORIES.find((c) => c.id === brand.category)?.name)} → {brand.subCategory}
                      </p>
                      {brand.type === 'product' && brand.productName && (
                        <div className="mt-2 text-sm">
                          <p className="text-gray-700"><strong>Product:</strong> {brand.productName}</p>
                          {brand.productPrice && <p className="text-gray-600"><strong>Price:</strong> {brand.productPrice}</p>}
                          {brand.productDescription && <p className="text-gray-500 text-xs mt-1">{brand.productDescription}</p>}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteBrand(brand.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};
