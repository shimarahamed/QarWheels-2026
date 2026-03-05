'use client';
import { Timestamp } from "firebase/firestore";

export type WithId<T> = T & { id: string };

export type ServiceRecord = {
    userId: string;
    carId: string;
    vendorId: string;
    serviceType: string;
    serviceDescription: string;
    serviceDate: string; // ISO String
    mileageAtService: number;
    cost: number;
    invoiceUrl?: string;
    notes?: string;
    createdAt: any; // serverTimestamp
    updatedAt: any; // serverTimestamp
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
    imageId?: string;
    // This field is deprecated and will be removed.
    serviceHistory?: any[];
};

export type Booking = {
    userId: string;
    vendorId: string;
    vendorName: string;
    carId: string;
    serviceName: string;
    bookingDate: Timestamp | Date | string; // Accomodate various date types
    status: 'Confirmed' | 'Completed' | 'Cancelled';
    cost?: number;
    createdAt: any;
    updatedAt: any;
};

export type Vendor = {
    ownerId: string;
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
    status: 'Pending Approval' | 'Approved' | 'Rejected';
    rating?: number;
    reviewCount?: number;
    imageId?: string;
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

// VENDOR-SPECIFIC TYPES

export type Service = {
    name: string;
    description: string;
    price: number;
    duration: number; // in minutes
};

export type InventoryItem = {
    name: string;
    sku: string;
    stock: number;
    price: number;
    supplier: string;
};

export type StaffMember = {
    name: string;
    email: string;
    role: 'Technician' | 'Service Advisor' | 'Admin';
    status: 'Active' | 'Inactive';
};

export type Promotion = {
    title: string;
    description: string;
    code: string;
    discount: string;
    startDate: string; // ISO String
    endDate: string; // ISO String
    status: 'Active' | 'Expired' | 'Scheduled';
};

export type Review = {
    userId: string;
    customerName: string; // Denormalized for easy display
    rating: number;
    comment: string;
    service: string;
    date: string; // ISO String
};
