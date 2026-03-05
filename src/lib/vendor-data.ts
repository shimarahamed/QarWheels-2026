export const mockAnalyticsData = {
    bookings: [
        { service: 'Oil Change', count: 120 },
        { service: 'Brake Check', count: 75 },
        { service: 'Tire Rotation', count: 90 },
        { service: 'Engine Tune-up', count: 45 },
        { service: 'AC Service', count: 60 },
        { service: 'Detailing', count: 30 },
    ],
    peakHours: [
        { hour: '9 AM', bookings: 15 },
        { hour: '10 AM', bookings: 25 },
        { hour: '11 AM', bookings: 30 },
        { hour: '12 PM', bookings: 22 },
        { hour: '1 PM', bookings: 18 },
        { hour: '2 PM', bookings: 28 },
        { hour: '3 PM', bookings: 35 },
        { hour: '4 PM', bookings: 40 },
        { hour: '5 PM', bookings: 20 },
    ],
    retention: [
        { month: 'Jan', new: 45, returning: 20 },
        { month: 'Feb', new: 50, returning: 25 },
        { month: 'Mar', new: 55, returning: 30 },
        { month: 'Apr', new: 60, returning: 35 },
        { month: 'May', new: 58, returning: 40 },
        { month: 'Jun', new: 62, returning: 45 },
    ]
};
