export type FabricProduct = {
  id: string
  name: string
  image: string
  gsm: string
  width: string
  composition: string
  price: number
  colors: string[]
  colorNames?: string[]
  extraColors?: number
  supplier: string
  rating: number
  orders: number
  location: string
  moq: number
  inStock: boolean
  category: string
  description: string
  reviews: number
  weave: string
  defaultColor: string
  deliveryDays: string
  badge?: string
  forYou?: boolean
  forYouReason?: string
  onTimeDelivery: number
  features: string[]
  whyChoose: string[]
}

export const marketplaceProducts: FabricProduct[] = [
  {
    id: '1',
    name: 'Premium Cotton Poplin',
    image: '/images/fabric-cotton.png',
    gsm: '220 GSM',
    width: '58"',
    composition: '100% Cotton',
    price: 180,
    colors: ['#f5f0e8', '#1a2744', '#c4a882', '#2d5016', '#6b7280', '#111111'],
    colorNames: ['Off White', 'Navy', 'Tan', 'Olive', 'Grey', 'Black'],
    extraColors: 6,
    supplier: 'Verified Supplier',
    rating: 4.8,
    orders: 2340,
    location: 'Surat, Gujarat',
    moq: 100,
    inStock: true,
    category: 'Cotton',
    description:
      'Premium quality cotton poplin with a smooth finish and excellent drape. Perfect for shirts, dresses, and lightweight garments. Breathable and comfortable for all-day wear.',
    reviews: 234,
    weave: 'Plain Weave',
    defaultColor: 'Off White',
    deliveryDays: '3–5 days',
    badge: 'Best Seller',
    onTimeDelivery: 98,
    features: ['Breathable', 'Soft Touch', 'Durable', 'Easy to Care'],
    whyChoose: [
      'Premium quality 100% cotton',
      'Smooth finish with beautiful drape',
      'Ideal for all seasons',
      'Easy to stitch and maintain',
    ],
  },
  {
    id: '2',
    name: 'Pure Linen Fabric',
    image: '/images/fabric-linen.png',
    gsm: '180 GSM',
    width: '58"',
    composition: '100% Linen',
    price: 320,
    colors: ['#d4c4a8', '#8b7355', '#f0ebe0'],
    colorNames: ['Natural', 'Brown', 'Cream'],
    extraColors: 1,
    supplier: 'Verified Supplier',
    rating: 4.9,
    orders: 1890,
    location: 'Bhilwara, Rajasthan',
    moq: 50,
    inStock: true,
    category: 'Linen',
    description:
      'Pure European linen with a natural slub texture and exceptional breathability. Ideal for summer wear, resort collections, and premium casual garments.',
    reviews: 189,
    weave: 'Plain Weave',
    defaultColor: 'Natural',
    deliveryDays: '4–6 days',
    onTimeDelivery: 97,
    features: ['Breathable', 'Natural Texture', 'Durable', 'Easy to Care'],
    whyChoose: [
      '100% pure linen fibers',
      'Excellent moisture absorption',
      'Gets softer with every wash',
      'Perfect for warm climates',
    ],
  },
  {
    id: '3',
    name: 'Denim 12 Oz',
    image: '/images/fabric-denim.png',
    gsm: '12 Oz',
    width: '58"',
    composition: '100% Cotton',
    price: 250,
    colors: ['#1e3a5f', '#4a5568', '#2c5282'],
    colorNames: ['Indigo', 'Grey', 'Navy'],
    supplier: 'Verified Supplier',
    rating: 4.7,
    orders: 3120,
    location: 'Ahmedabad, Gujarat',
    moq: 200,
    inStock: true,
    category: 'Denim',
    description:
      'Classic 12 oz denim with authentic indigo dye and durable twill construction. Perfect for jeans, jackets, and workwear applications.',
    reviews: 312,
    weave: 'Twill Weave',
    defaultColor: 'Indigo',
    deliveryDays: '5–7 days',
    badge: 'Popular',
    onTimeDelivery: 96,
    features: ['Heavy Duty', 'Color Fast', 'Durable', 'Structured'],
    whyChoose: [
      'Authentic indigo dye process',
      'Develops character with wear',
      'Ideal for jeans and jackets',
      'Consistent shrinkage control',
    ],
  },
  {
    id: '4',
    name: 'Viscose Satin',
    image: '/images/fabric-silk.png',
    gsm: '110 GSM',
    width: '57"',
    composition: '100% Viscose',
    price: 210,
    colors: ['#f5e6d3', '#722f37', '#1a1a2e', '#c9a227'],
    colorNames: ['Champagne', 'Wine', 'Midnight', 'Gold'],
    extraColors: 3,
    supplier: 'Verified Supplier',
    rating: 4.6,
    orders: 1560,
    location: 'Surat, Gujarat',
    moq: 100,
    inStock: true,
    category: 'Silk',
    description:
      'Luxurious viscose satin with a brilliant sheen and fluid drape. Perfect for evening wear, blouses, and lining applications.',
    reviews: 156,
    weave: 'Satin Weave',
    defaultColor: 'Champagne',
    deliveryDays: '3–5 days',
    onTimeDelivery: 99,
    features: ['Lustrous Sheen', 'Fluid Drape', 'Lightweight', 'Smooth Touch'],
    whyChoose: [
      'Brilliant natural sheen',
      'Excellent drape quality',
      'Ideal for evening wear',
      'Wide color range available',
    ],
  },
  {
    id: '5',
    name: 'Organic Cotton Twill',
    image: '/images/fabric-cotton.png',
    gsm: '200 GSM',
    width: '58"',
    composition: '100% Organic Cotton',
    price: 195,
    colors: ['#e8e4dc', '#3d5a3d', '#8b6914'],
    colorNames: ['Natural', 'Forest', 'Khaki'],
    supplier: 'Verified Supplier',
    rating: 4.8,
    orders: 980,
    location: 'Coimbatore, Tamil Nadu',
    moq: 150,
    inStock: true,
    category: 'Cotton',
    description:
      'GOTS-certified organic cotton twill with a soft hand feel and diagonal weave pattern. Sustainable choice for conscious brands.',
    reviews: 98,
    weave: 'Twill Weave',
    defaultColor: 'Natural',
    deliveryDays: '4–6 days',
    badge: 'Sustainable',
    onTimeDelivery: 97,
    features: ['Organic', 'Soft Touch', 'Durable', 'Eco-Friendly'],
    whyChoose: [
      'GOTS certified organic cotton',
      'Sustainable production process',
      'Soft diagonal twill texture',
      'Ideal for chinos and uniforms',
    ],
  },
  {
    id: '6',
    name: 'Belgian Linen Blend',
    image: '/images/fabric-linen.png',
    gsm: '160 GSM',
    width: '54"',
    composition: '55% Linen, 45% Cotton',
    price: 285,
    colors: ['#ebe4d4', '#6b5b4f', '#c9b896'],
    colorNames: ['Oatmeal', 'Taupe', 'Sand'],
    extraColors: 2,
    supplier: 'Verified Supplier',
    rating: 4.5,
    orders: 720,
    location: 'Mumbai, Maharashtra',
    moq: 75,
    inStock: true,
    category: 'Linen',
    description:
      'Premium Belgian linen-cotton blend combining linen breathability with cotton softness. Versatile for shirts, trousers, and home textiles.',
    reviews: 72,
    weave: 'Plain Weave',
    defaultColor: 'Oatmeal',
    deliveryDays: '5–7 days',
    onTimeDelivery: 95,
    features: ['Breathable', 'Blended Comfort', 'Durable', 'Easy to Care'],
    whyChoose: [
      'Belgian linen quality blend',
      'Reduced wrinkling vs pure linen',
      'Versatile for multiple applications',
      'Premium hand feel',
    ],
  },
  {
    id: '7',
    name: 'Stretch Denim 10 Oz',
    image: '/images/fabric-denim.png',
    gsm: '10 Oz',
    width: '58"',
    composition: '98% Cotton, 2% Elastane',
    price: 275,
    colors: ['#2d3748', '#4a5568'],
    colorNames: ['Dark Wash', 'Medium Wash'],
    supplier: 'Verified Supplier',
    rating: 4.7,
    orders: 2100,
    location: 'Ludhiana, Punjab',
    moq: 150,
    inStock: false,
    category: 'Denim',
    description:
      'Comfort stretch denim with 2% elastane for enhanced mobility. Lighter weight ideal for slim-fit jeans and contemporary styles.',
    reviews: 210,
    weave: 'Twill Weave',
    defaultColor: 'Dark Wash',
    deliveryDays: '7–10 days',
    onTimeDelivery: 94,
    features: ['Stretch Comfort', 'Lightweight', 'Durable', 'Modern Fit'],
    whyChoose: [
      '2% elastane for comfort stretch',
      'Lighter 10 oz weight',
      'Ideal for slim-fit styles',
      'Made to order with custom wash',
    ],
  },
  {
    id: '8',
    name: 'Silk Chiffon',
    image: '/images/fabric-silk.png',
    gsm: '30 GSM',
    width: '44"',
    composition: '100% Silk',
    price: 450,
    colors: ['#fff5ee', '#800020', '#191970', '#ffd700'],
    colorNames: ['Ivory', 'Burgundy', 'Navy', 'Gold'],
    extraColors: 4,
    supplier: 'Verified Supplier',
    rating: 4.9,
    orders: 890,
    location: 'Varanasi, Uttar Pradesh',
    moq: 30,
    inStock: true,
    category: 'Silk',
    description:
      'Pure silk chiffon with ethereal lightness and delicate transparency. The choice for sarees, overlays, and luxury evening wear.',
    reviews: 89,
    weave: 'Plain Weave',
    defaultColor: 'Ivory',
    deliveryDays: '3–5 days',
    badge: 'Premium',
    onTimeDelivery: 99,
    features: ['Sheer', 'Lightweight', 'Luxurious', 'Fluid Drape'],
    whyChoose: [
      '100% pure mulberry silk',
      'Ethereal sheer quality',
      'Handwoven in Varanasi',
      'Perfect for luxury collections',
    ],
  },
]

export function getProductById(id: string): FabricProduct | undefined {
  return marketplaceProducts.find((p) => p.id === id)
}

export const categoryFilters = [
  { label: 'All Fabrics', count: null },
  { label: 'Cotton', count: null },
  { label: 'Linen', count: null },
  { label: 'Denim', count: null },
  { label: 'Silk', count: null },
  { label: 'Synthetic', count: null },
]

export const categoryPills = [
  'All Fabrics',
  'Cotton',
  'Linen',
  'Denim',
  'Silk',
  'Synthetic',
]
