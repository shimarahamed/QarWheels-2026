// ─── INITIAL DATA ────────────────────────────────────────────────────────────
export const INIT_VEHICLES = [
  { id: "v1", userId: "u1", nickname: "Desert Runner", make: "Toyota", model: "Land Cruiser", year: 2021, vin: "JTMB3FJV1MD123456", mileage: 42300, engine: "4.0L V6", color: "#0B3C5D", lastService: "2025-11-10", fuelType: "Petrol" },
  { id: "v2", userId: "u1", nickname: "City Glider", make: "Lexus", model: "RX 350", year: 2022, vin: "2T2BZMCA5NC234567", mileage: 28100, engine: "3.5L V6", color: "#00B4D8", lastService: "2025-12-01", fuelType: "Hybrid" },
  { id: "v3", userId: "u1", nickname: "Falcon", make: "Porsche", model: "Cayenne", year: 2023, vin: "WP1AA2AY3NDA34567", mileage: 11600, engine: "3.0L Turbo", color: "#E76F51", lastService: "2026-01-15", fuelType: "Petrol" },
];
export const INIT_VENDORS = [
  { id: "vnd1", businessName: "AlFardan AutoCare", ownerName: "Khalid AlFardan", email: "khalid@alfardan.qa", phone: "+974 4422 1100", type: "garage", area: "Al Sadd", approved: true, rating: 4.9, reviews: 312, totalBookings: 1240, revenue: 187500, tradeLicense: "TL-2021-4481", joined: "2021-03-12", services: ["Oil Change","AC Service","Engine Repair","Diagnostics","Tyre Change"], workingHours: "7:00 AM – 9:00 PM", logo: "🏎️" },
  { id: "vnd2", businessName: "Qatar Speed Workshop", ownerName: "Hassan Al-Nasr", email: "hassan@qspeed.qa", phone: "+974 4411 9922", type: "garage", area: "Industrial Area", approved: true, rating: 4.7, reviews: 189, totalBookings: 876, revenue: 120000, tradeLicense: "TL-2020-3319", joined: "2020-07-22", services: ["Brakes","Suspension","Body Work","Wheel Alignment","Exhaust"], workingHours: "8:00 AM – 8:00 PM", logo: "⚡" },
  { id: "vnd3", businessName: "Doha German Tech", ownerName: "Rami Khoury", email: "rami@germantechdoha.qa", phone: "+974 4433 7788", type: "garage", area: "West Bay", approved: false, rating: 4.8, reviews: 241, totalBookings: 0, revenue: 0, tradeLicense: "TL-2024-7721", joined: "2024-11-01", services: ["BMW","Mercedes","Audi","Software Update","Full Service"], workingHours: "9:00 AM – 7:00 PM", logo: "🇩🇪" },
  { id: "vnd4", businessName: "Gulf Parts Trading", ownerName: "Yousef Al-Marri", email: "yousef@gulfparts.qa", phone: "+974 4455 6677", type: "parts", area: "Al Mansoura", approved: true, rating: 4.6, reviews: 98, totalBookings: 540, revenue: 95000, tradeLicense: "TL-2022-5512", joined: "2022-01-14", services: ["OEM Parts","Aftermarket","Used Parts","Import Orders"], workingHours: "8:30 AM – 6:00 PM", logo: "🔩" },
];
export const INIT_BOOKINGS = [
  { id: "BK-4821", userId: "u1", vehicleId: "v1", vendorId: "vnd1", service: "Full AC Service + Oil Change", date: "2026-03-10", time: "10:00 AM", status: "confirmed", notes: "Please check AC compressor", price: 320, createdAt: "2026-03-01" },
  { id: "BK-4756", userId: "u1", vehicleId: "v2", vendorId: "vnd2", service: "Brake Inspection & Pad Replacement", date: "2026-02-28", time: "2:00 PM", status: "completed", notes: "", price: 480, createdAt: "2026-02-20" },
  { id: "BK-4690", userId: "u1", vehicleId: "v1", vendorId: "vnd1", service: "Engine Diagnostic Full Scan", date: "2026-02-15", time: "11:00 AM", status: "completed", notes: "Check engine light came on", price: 150, createdAt: "2026-02-10" },
  { id: "BK-4512", userId: "u1", vehicleId: "v3", vendorId: "vnd2", service: "Wheel Alignment & Balancing", date: "2026-03-15", time: "9:00 AM", status: "pending", notes: "", price: 180, createdAt: "2026-03-03" },
];
export const INIT_PARTS = [
  { id: "p1", vendorId: "vnd4", name: "Castrol EDGE 5W-40 5L", category: "Engine Oil", price: 85, condition: "OEM", compatible: ["Toyota Land Cruiser","Lexus RX 350","Porsche Cayenne"], stock: 24, sku: "CO-5W40-5L", img: "🛢️" },
  { id: "p2", vendorId: "vnd4", name: "Brembo Front Brake Pad Set", category: "Brakes", price: 320, condition: "OEM", compatible: ["Toyota Land Cruiser 2018-2023"], stock: 8, sku: "BR-FBP-LC200", img: "🔴" },
  { id: "p3", vendorId: "vnd4", name: "Denso AC Compressor", category: "AC System", price: 1250, condition: "Aftermarket", compatible: ["Toyota V6 2019+","Lexus V6 2019+"], stock: 3, sku: "DN-ACC-TV6", img: "❄️" },
  { id: "p4", vendorId: "vnd4", name: "K&N Performance Air Filter", category: "Air Filter", price: 145, condition: "Aftermarket", compatible: ["Multiple Toyota Models"], stock: 15, sku: "KN-AF-TOY", img: "💨" },
  { id: "p5", vendorId: "vnd4", name: "NGK Spark Plugs Set x4", category: "Ignition", price: 110, condition: "OEM", compatible: ["Toyota 4.0L V6","Lexus 3.5L V6"], stock: 30, sku: "NGK-SP-SET4", img: "⚡" },
  { id: "p6", vendorId: "vnd4", name: "Bilstein B4 Shock Absorber", category: "Suspension", price: 680, condition: "OEM", compatible: ["Porsche Cayenne 2020+"], stock: 5, sku: "BLS-B4-PCY", img: "🔧" },
];
export const PREDICT = [
  { service: "Engine Oil Change", urgency: "critical", km: 1800, confidence: 96, icon: "🛢️", desc: "Oil degradation detected · heat stress from Qatar climate" },
  { service: "Brake Pad Replacement", urgency: "warning", km: 4500, confidence: 87, icon: "🛑", desc: "Front pads approaching minimum threshold" },
  { service: "AC System Service", urgency: "warning", km: 3200, confidence: 91, icon: "❄️", desc: "Qatar summer prep · compressor stress elevated" },
  { service: "Air Filter Replacement", urgency: "info", km: 7800, confidence: 78, icon: "💨", desc: "Desert dust accumulation — earlier than standard" },
  { service: "Tire Rotation & Balance", urgency: "info", km: 9200, confidence: 82, icon: "⚙️", desc: "Uneven wear predicted from driving analysis" },
];
export const AREAS = ["Al Sadd","West Bay","Industrial Area","Al Mansoura","Msheireb","The Pearl","Al Wakrah","Lusail"];
export const SERVICES_LIST = ["Oil Change","AC Service","Engine Repair","Brakes","Suspension","Diagnostics","Tyre Change","Body Work","Wheel Alignment","Software Update","Full Service","Exhaust","Battery Replacement"];
export const MAKES = ["Toyota","Lexus","BMW","Mercedes-Benz","Porsche","Audi","Nissan","Hyundai","Ford","Chevrolet","Honda","Kia"];
export const MODELS = { Toyota: ["Land Cruiser","Prado","Camry","Corolla","Hilux","Yaris"], Lexus: ["RX 350","LX 570","ES 250","GX 460"], BMW: ["X5","X7","5 Series","7 Series","M3"], "Mercedes-Benz": ["GLE","S-Class","C-Class","GLC","AMG GT"], Porsche: ["Cayenne","911","Macan","Panamera"], Audi: ["Q7","A6","A4","Q5","RS6"], Nissan: ["Patrol","Altima","X-Trail","Sunny"], Hyundai: ["Tucson","Santa Fe","Sonata","Elantra"], Ford: ["Expedition","F-150","Explorer","Mustang"], Chevrolet: ["Tahoe","Suburban","Malibu","Camaro"], Honda: ["Accord","Civic","CR-V","Pilot"], Kia: ["Telluride","Sportage","K5","Carnival"] };

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export const uid = () => Math.random().toString(36).slice(2, 9);
export const fmtQar = (n: number) => `QAR ${Number(n).toLocaleString()}`;
export const statusMeta = { confirmed: { color: "#00B4D8", label: "Confirmed" }, pending: { color: "#F59E0B", label: "Pending" }, completed: { color: "#22C55E", label: "Completed" }, cancelled: { color: "#EF4444", label: "Cancelled" }, in_progress: { color: "#8B5CF6", label: "In Progress" } };
export const urgMeta = { critical: { color: "#EF4444", bg: "#FEF2F2", darkBg: "rgba(239,68,68,0.12)", label: "CRITICAL NOW" }, warning: { color: "#F59E0B", bg: "#FFFBEB", darkBg: "rgba(245,158,11,0.12)", label: "DUE SOON" }, info: { color: "#00B4D8", bg: "#E0F7FB", darkBg: "rgba(0,180,216,0.1)", label: "UPCOMING" } };
