import { Timestamp } from "firebase/firestore";

export type ServiceRecord = {
    id: string;
    date: string;
    service: string;
    description: string;
    cost: number;
    serviceType: string;
    serviceDescription: string;
    serviceDate: string;
    mileageAtService: number;
    invoiceUrl?: string;
    notes?: string;
};

export type Car = {
    id: string;
    userId: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    licensePlate?: string;
    color?: string;
    engineType?: string;
    currentMileage: number;
    lastMileageUpdateDate: string;
    purchaseDate?: string;
    imageUrl?: string;
    createdAt: any; // serverTimestamp
    updatedAt: any; // serverTimestamp
    serviceHistory: ServiceRecord[];
    // This was the old field, replacing with currentMileage
    mileage?: number; 
    imageId?: string;
};

export type Booking = {
    id: string;
    userId: string;
    vendorId: string;
    vendorName: string;
    carId: string;
    serviceName: string;
    bookingDate: Timestamp | string; // Firestore returns Timestamp, but we send string
    status: 'Confirmed' | 'Completed' | 'Cancelled';
    cost?: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
};


export type Garage = {
    id: string;
    name: string;
    address: string;
    rating: number;
    reviewCount: number;
    services: string[];
    imageId: string;
    lat: number;
    lng: number;
};

export type User = {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl: string;
    notificationPreferences: {
        bookingConfirmations: boolean;
        serviceReminders: boolean;
        promotionalOffers: boolean;
    };
};

    