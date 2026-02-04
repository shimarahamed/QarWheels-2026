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

export const mockVendorBookings: VendorBooking[] = [
    { id: "vb-1", customerName: "John Doe", customerPhone: "+974 5555 1234", carModel: "2022 Toyota Land Cruiser", service: "Full Synthetic Oil Change", date: "2024-08-15T10:00:00Z", status: "Upcoming", cost: 350 },
    { id: "vb-2", customerName: "Jane Smith", customerPhone: "+974 5555 5678", carModel: "2023 Nissan Patrol", service: "Brake Inspection", date: "2024-08-15T11:00:00Z", status: "Upcoming", cost: 150 },
    { id: "vb-3", customerName: "Ahmed Al-Mansoori", customerPhone: "+974 5555 9012", carModel: "2021 Land Rover Range Rover", service: "AC System Check", date: "2024-08-14T14:00:00Z", status: "Completed", cost: 250 },
    { id: "vb-4", customerName: "Fatima Al-Abdullah", customerPhone: "+974 5555 3456", carModel: "2020 BMW X5", service: "Full Detailing", date: "2024-08-14T09:00:00Z", status: "Completed", cost: 1200 },
    { id: "vb-5", customerName: "Michael Chen", customerPhone: "+974 5555 7890", carModel: "2022 Toyota Camry", service: "Tire Rotation & Balancing", date: "2024-08-13T16:00:00Z", status: "Completed", cost: 200 },
    { id: "vb-6", customerName: "Carlos Gomez", customerPhone: "+974 5555 2345", carModel: "2019 Ford F-150", service: "Engine Diagnostic", date: "2024-08-16T09:30:00Z", status: "Upcoming", cost: 300 },
    { id: "vb-7", customerName: "Li Wei", customerPhone: "+974 5555 6789", carModel: "2023 Lexus LX", service: "Paint Protection Film", date: "2024-08-12T10:00:00Z", status: "Cancelled", cost: 4500 },
];

export const mockVendorServices: VendorService[] = [
    { id: "vs-1", name: "Full Synthetic Oil Change", description: "Using premium 5W-30 synthetic oil and OEM filter.", price: 350, duration: 45 },
    { id: "vs-2", name: "Brake Inspection & Pad Replacement", description: "Inspection of brake system and replacement of front or rear pads.", price: 800, duration: 90 },
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
};
