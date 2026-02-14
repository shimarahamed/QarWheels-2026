export type VendorBooking = {
  id: string;
  customerName: string;
  customerPhone: string;
  carModel: string;
  service: string;
  date: string;
  status: "Upcoming" | "In Progress" | "Completed" | "Cancelled";
  cost: number;
};

export type VendorService = {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: number; // in minutes
};

export type VendorCustomer = {
    id: string;
    name: string;
    phone: string;
    email: string;
    vehicleCount: number;
    firstVisit: string;
};

export type VendorInventoryItem = {
    id: string;
    name: string;
    sku: string;
    stock: number;
    price: number;
    supplier: string;
};

export type VendorStaffMember = {
    id: string;
    name: string;
    email: string;
    role: 'Technician' | 'Service Advisor' | 'Admin';
    status: 'Active' | 'Inactive';
};

export type VendorPromotion = {
    id: string;
    title: string;
    description: string;
    code: string;
    discount: string;
    startDate: string;
    endDate: string;
    status: 'Active' | 'Expired' | 'Scheduled';
};

export type VendorReview = {
    id: string;
    customerName: string;
    rating: number;
    comment: string;
    date: string;
    service: string;
};

export const mockVendorBookings: VendorBooking[] = [
    { id: "vb-1", customerName: "John Doe", customerPhone: "+974 5555 1234", carModel: "2022 Toyota Land Cruiser", service: "Full Synthetic Oil Change", date: "2024-08-15T10:00:00Z", status: "Upcoming", cost: 350 },
    { id: "vb-2", customerName: "Jane Smith", customerPhone: "+974 5555 5678", carModel: "2023 Nissan Patrol", service: "Brake Inspection", date: "2024-08-15T11:00:00Z", status: "Upcoming", cost: 150 },
    { id: "vb-3", customerName: "Ahmed Al-Mansoori", customerPhone: "+974 5555 9012", carModel: "2021 Land Rover Range Rover", service: "AC System Check", date: "2024-08-14T14:00:00Z", status: "Completed", cost: 250 },
    { id: "vb-4", customerName: "Fatima Al-Abdullah", customerPhone: "+974 5555 3456", carModel: "2020 BMW X5", service: "Full Detailing", date: "2024-08-14T09:00:00Z", status: "In Progress", cost: 1200 },
    { id: "vb-5", customerName: "Michael Chen", customerPhone: "+974 5555 7890", carModel: "2022 Toyota Camry", service: "Tire Rotation & Balancing", date: "2024-08-13T16:00:00Z", status: "Completed", cost: 200 },
    { id: "vb-6", customerName: "Carlos Gomez", customerPhone: "+974 5555 2345", carModel: "2019 Ford F-150", service: "Engine Diagnostic", date: "2024-08-16T09:30:00Z", status: "Upcoming", cost: 300 },
    { id: "vb-7", customerName: "Li Wei", customerPhone: "+974 5555 6789", carModel: "2023 Lexus LX", service: "Paint Protection Film", date: "2024-08-12T10:00:00Z", status: "Cancelled", cost: 4500 },
];

export const mockVendorServices: VendorService[] = [
    { id: "vs-1", name: "Full Synthetic Oil Change", description: "Using premium 5W-30 synthetic oil and OEM filter.", price: 350, duration: 45 },
    { id: "vs-2", name: "Brake Pad Replacement", description: "Inspection of brake system and replacement of front or rear pads.", price: 800, duration: 90 },
    { id: "vs-3", name: "AC System Check & Recharge", description: "Check for leaks, system pressure, and recharge refrigerant.", price: 250, duration: 60 },
    { id: "vs-4", name: "Full Detailing", description: "Interior and exterior deep cleaning, polishing, and waxing.", price: 1200, duration: 240 },
    { id: "vs-5", name: "Tire Rotation & Balancing", description: "Rotate tires and balance wheels for even wear.", price: 200, duration: 45 },
    { id: "vs-6", name: "Engine Diagnostic", description: "Computerized diagnostics to identify engine issues.", price: 300, duration: 60 },
];

export const mockVendorCustomers: VendorCustomer[] = [
    { id: "vc-1", name: "John Doe", phone: "+974 5555 1234", email: "john.doe@email.com", vehicleCount: 1, firstVisit: "2023-01-15" },
    { id: "vc-2", name: "Jane Smith", phone: "+974 5555 5678", email: "jane.smith@email.com", vehicleCount: 1, firstVisit: "2024-08-15" },
    { id: "vc-3", name: "Ahmed Al-Mansoori", phone: "+974 5555 9012", email: "ahmed.m@email.com", vehicleCount: 2, firstVisit: "2022-11-20" },
    { id: "vc-4", name: "Fatima Al-Abdullah", phone: "+974 5555 3456", email: "fatima.a@email.com", vehicleCount: 1, firstVisit: "2024-02-10" },
    { id: "vc-5", name: "Michael Chen", phone: "+974 5555 7890", email: "michael.chen@email.com", vehicleCount: 1, firstVisit: "2023-08-01" },
];

export const mockInventory: VendorInventoryItem[] = [
    { id: "inv-1", name: "Synthetic Oil 5W-30 (1L)", sku: "OIL-SYN-5W30-1L", stock: 150, price: 75, supplier: "Global Parts Co." },
    { id: "inv-2", name: "OEM Oil Filter - Toyota", sku: "FIL-TYT-001", stock: 80, price: 45, supplier: "Global Parts Co." },
    { id: "inv-3", name: "Front Brake Pads - Nissan Patrol", sku: "BRK-NIS-PAT-F", stock: 8, price: 350, supplier: "AutoPro Imports" },
    { id: "inv-4", name: "R134a Refrigerant Can", sku: "AC-REF-R134A", stock: 200, price: 100, supplier: "Cooling Systems Inc." },
    { id: "inv-5", name: "Microfiber Towel Pack (10)", sku: "DET-MIC-TOW-10", stock: 45, supplier: "Detailing Kings" },
];

export const mockStaff: VendorStaffMember[] = [
    { id: "staff-1", name: "Khalid Al-Baker", email: "khalid@precisionauto.qa", role: "Admin", status: "Active" },
    { id: "staff-2", name: "Mohammed Hassan", email: "mohammed@precisionauto.qa", role: "Service Advisor", status: "Active" },
    { id: "staff-3", name: "Rajesh Kumar", email: "rajesh@precisionauto.qa", role: "Technician", status: "Active" },
    { id: "staff-4", name: "David Williams", email: "d.williams@precisionauto.qa", role: "Technician", status: "Inactive" },
];

export const mockPromotions: VendorPromotion[] = [
    { id: "promo-1", title: "Summer AC Check-up", description: "20% off on all AC services.", code: "SUMMER20", discount: "20%", startDate: "2024-06-01", endDate: "2024-08-31", status: "Active" },
    { id: "promo-2", title: "National Day Special", description: "15% off all services.", code: "QATAR15", discount: "15%", startDate: "2024-12-15", endDate: "2024-12-18", status: "Scheduled" },
    { id: "promo-3", title: "Ramadan Oil Change Offer", description: "Get a free interior cleaning with every oil change.", code: "RAMADAN", discount: "N/A", startDate: "2024-03-10", endDate: "2024-04-09", status: "Expired" },
];

export const mockReviews: VendorReview[] = [
    { id: "rev-1", customerName: "Ahmed Al-Mansoori", rating: 5, comment: "Excellent service as always. My Range Rover feels brand new. Highly recommend their AC check.", date: "2024-08-14", service: "AC System Check" },
    { id: "rev-2", customerName: "Fatima Al-Abdullah", rating: 5, comment: "The detailing service is top-notch! My car has never been cleaner. It's expensive but worth every riyal.", date: "2024-08-14", service: "Full Detailing" },
    { id: "rev-3", customerName: "Michael Chen", rating: 4, comment: "Good and quick service for tire rotation. Waiting area could be more comfortable.", date: "2024-08-13", service: "Tire Rotation & Balancing" },
    { id: "rev-4", customerName: "John Doe", rating: 5, comment: "Used them for the first time for my Land Cruiser. Professional staff and fair pricing.", date: "2023-01-15", service: "Oil Change" },
];

export const mockAnalyticsData = {
    revenue: [
        { month: "Jan", total: 23450 },
        { month: "Feb", total: 28900 },
        { month: "Mar", total: 31200 },
        { month: "Apr", total: 29800 },
        { month: "May", total: 35400 },
        { month: "Jun", total: 41500 },
        { month: "Jul", total: 38900 },
    ],
    bookings: [
        { service: "Oil Change", count: 120, fill: "var(--chart-1)" },
        { service: "Brakes", count: 75, fill: "var(--chart-2)" },
        { service: "Detailing", count: 50, fill: "var(--chart-3)" },
        { service: "AC Service", count: 90, fill: "var(--chart-4)" },
        { service: "Tires", count: 65, fill: "var(--chart-5)" },
    ],
    retention: [
        { month: 'Jan', new: 30, returning: 15 },
        { month: 'Feb', new: 35, returning: 20 },
        { month: 'Mar', new: 40, returning: 25 },
        { month: 'Apr', new: 38, returning: 28 },
        { month: 'May', new: 45, returning: 32 },
        { month: 'Jun', new: 50, returning: 38 },
        { month: 'Jul', new: 48, returning: 42 },
    ],
    peakHours: [
        { hour: '8am', bookings: 5 },
        { hour: '9am', bookings: 12 },
        { hour: '10am', bookings: 18 },
        { hour: '11am', bookings: 15 },
        { hour: '12pm', bookings: 8 },
        { hour: '1pm', bookings: 10 },
        { hour: '2pm', bookings: 14 },
        { hour: '3pm', bookings: 22 },
        { hour: '4pm', bookings: 25 },
        { hour: '5pm', bookings: 19 },
    ],
    pendingQuotes: 3,
    shopRating: 4.8,
};
