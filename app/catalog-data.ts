// Shared catalogue types and the built-in starter catalogue.
// The starter products seed the database the first time it is connected; after that the
// owner dashboard is the source of truth. With no database the site shows this list as-is.
import type { Hours, Offer } from './showroom-config';

export type Product = {
  id: string; name: string; category: string; type: string; description: string; tag: string;
  suits: string; sizes: string; ask: string;
  price: number | null; // whole rupees; null = "enquire for price", not orderable
  inStock: boolean;
  image?: string; brand?: string; model?: string;
};
export type Zone = 'ludhiana' | 'punjab' | 'other';
// A fee of null means "the store confirms the delivery charge after you order".
export type Delivery = { ludhiana: number | null; punjab: number | null; other: number | null; note: string };
export type Settings = { delivery: Delivery; hours: Hours | null; brands: string[]; offers: Offer[] };
export type Catalog = { shop: boolean; products: Product[]; settings: Settings };
export type User = { id: string; name: string; email: string; phone: string; role: 'customer' | 'owner' };
export type OrderItem = { id: string; name: string; price: number; qty: number };
export type Order = {
  id: number; code: string; name: string; phone: string; address: string; city: string; state: string; pincode: string;
  zone: Zone; items: OrderItem[]; subtotal: number; deliveryFee: number | null; status: string; note: string; createdAt: string;
};

export const categories = [
  { id: 'air-conditioners', name: 'Air conditioners', desc: 'Find your comfortable temperature.', type: 'ac', tag: 'Living room' },
  { id: 'refrigerators', name: 'Refrigerators', desc: 'A fresh start for your kitchen.', type: 'fridge', tag: 'Kitchen' },
  { id: 'washing-machines', name: 'Washing machines', desc: 'Make room for the things you love.', type: 'washer', tag: 'Utility room' },
  { id: 'air-coolers', name: 'Air coolers', desc: 'Comfort for your everyday spaces.', type: 'cooler', tag: 'Living room' },
  { id: 'kitchen-appliances', name: 'Kitchen appliances', desc: 'Little helpers. Big possibilities.', type: 'microwave', tag: 'Kitchen' },
  { id: 'crockery', name: 'Crockery & glassware', desc: 'For everyday meals and special moments.', type: 'plates', tag: 'Dining room' },
];
// Code-drawn illustrations available when a product has no photo.
export const illustrations = ['ac', 'fridge', 'washer', 'topwasher', 'cooler', 'microwave', 'mixer', 'plates', 'glasses'];
export const orderStatuses = ['new', 'confirmed', 'out for delivery', 'delivered', 'cancelled'];
export const states = ['Punjab', 'Chandigarh', 'Haryana', 'Himachal Pradesh', 'Delhi', 'Jammu and Kashmir', 'Rajasthan', 'Uttar Pradesh', 'Uttarakhand', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'West Bengal', 'Other'];

export const zoneFor = (state: string, city: string): Zone =>
  state !== 'Punjab' ? 'other' : /ludhiana/i.test(city) ? 'ludhiana' : 'punjab';

export const defaultSettings: Settings = {
  delivery: { ludhiana: null, punjab: null, other: null, note: '' },
  hours: null, brands: [], offers: [],
};

// General buying-guide notes per product type (not stock or model claims).
const guide = [
  [['Bedrooms and living rooms', 'Commonly 1 to 2 ton', 'Star rating, condenser type and installation'], ['Rooms cooled for long hours', 'Commonly 1 to 2 ton', 'Star rating, compressor warranty and stabiliser needs']],
  [['Families of three to five', 'Commonly 230 to 350 litres', 'Frost-free cooling, star rating and shelf layout'], ['Larger households', 'Commonly 350 litres and above', 'Door style, convertible modes and compressor warranty']],
  [['Gentle care with less water', 'Commonly 6 to 9 kg', 'Spin speed, wash programmes and in-built heater'], ['Quick, easy everyday loads', 'Commonly 6 to 8 kg', 'Fully or semi-automatic, tub material and water use']],
  [['Large rooms and dry heat', 'Commonly 50 litres and above', 'Tank size, air throw and cooling pads'], ['Small rooms and spot cooling', 'Commonly 20 to 40 litres', 'Tank size, noise level and castor wheels']],
  [['Reheating and everyday cooking', 'Commonly 20 to 30 litres', 'Solo, grill or convection cooking'], ['Daily grinding and fresh juices', 'Commonly 500 to 750 watts', 'Number of jars, motor warranty and overload protection']],
  [['Everyday family meals', 'Sets in a range of piece counts', 'Material, microwave-safe use and piece count'], ['Water, juice and guests', 'Usually sold in sets of six', 'Capacity, glass type and set size']],
];
const first = ['Split air conditioner', 'Double-door refrigerator', 'Front-load washing machine', 'Desert air cooler', 'Countertop microwave', 'Everyday dinnerware'];
const firstDesc = ['Explore cooling options for your room size and daily routine.', 'Explore storage layouts that fit your family and kitchen.', 'Discover a gentler way to take care of your everyday clothes.', 'Explore air cooling for the warmer days ahead.', 'Find a kitchen companion for reheating and everyday cooking.', 'Bring a little occasion to your everyday table.'];
const second = ['Inverter air conditioner', 'Family refrigerator', 'Top-load washing machine', 'Personal air cooler', 'Juicer & mixer', 'Drinking glasses'];
const secondType = ['ac', 'fridge', 'topwasher', 'cooler', 'mixer', 'glasses'];
const secondTag = ['Bedroom', 'Kitchen', 'Utility room', 'Bedroom', 'Kitchen', 'Dining room'];

export const defaultProducts: Product[] = categories.flatMap((c, i) => [
  { id: c.id + '-1', name: first[i], category: c.id, type: c.type, description: firstDesc[i], tag: c.tag, suits: guide[i][0][0], sizes: guide[i][0][1], ask: guide[i][0][2], price: null, inStock: true },
  { id: c.id + '-2', name: second[i], category: c.id, type: secondType[i], description: 'Visit the showroom to compare available models, finishes and features in person.', tag: secondTag[i], suits: guide[i][1][0], sizes: guide[i][1][1], ask: guide[i][1][2], price: null, inStock: true },
]);
