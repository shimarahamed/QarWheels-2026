'use client';
import { Timestamp } from "firebase/firestore";

export type WithId<T> = T & { id: string };

export type ServiceRecord = {
    serviceType: string;
    serviceDescription: string;
    serviceDate: string;
    mileageAtService: number;
    cost: number;
    invoiceUrl?: string;
    notes?: string;
};

export type Car = {
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
    serviceHistory: WithId<ServiceRecord>[];
    // This was the old field, replacing with currentMileage
    mileage?: number; 
    imageId?: string;
};

export type Booking = {
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

export type Vendor = {
    name: string;
    type: 'Garage' | 'Parts Store' | 'Both';
    description?: string;
    address: string;
    city: string;
    country: string;
    phoneNumber: string;
    email: string;
    websiteUrl?: string;
    latitude: number;
    longitude: number;
    status: 'Pending Approval' | 'Approved' | 'Rejected' | 'Active' | 'Inactive';
    rating: number;
    reviewCount: number;
    services: string[];
    imageId: string;
    createdAt: any;
    updatedAt: any;
};

export type UserProfile = {
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    createdAt: any; // serverTimestamp
    updatedAt: any; // serverTimestamp
};
