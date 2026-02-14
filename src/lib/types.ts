export type ServiceRecord = {
    id: string;
    date: string;
    service: string;
    description: string;
    cost: number;
};

export type Car = {
    id: string;
    userId: string;
    vin: string;
    make: string;
    model: string;
    year: number;
    mileage: number;
    imageId: string;
    serviceHistory: ServiceRecord[];
};

export type Booking = {
    id: string;
    carId: string;
    garageName: string;
    serviceType: string;
    date: string;
    status: 'Confirmed' | 'Completed' | 'Cancelled';
    cost?: number;
};

export type Garage = {
    id: string;
    name: string;
    address: string;
    rating: number;
    reviewCount: number;
    services: string[];
    imageId: string;
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
