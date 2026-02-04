# **App Name**: QarWheels Automotive Platform

## Core Features:

- VIN-based Car Creation: Allows users to add their cars to the platform by simply entering their VIN, which prefills vehicle information using an external API. This simplifies the car registration process. All pages are mobile-friendly. Store user and car data in Firestore.
- AI-Powered Service Prediction: Leverages an AI model tool to predict upcoming maintenance needs based on VIN data, mileage, service history, and Qatar's climate conditions. Store and surface these predictions in the user dashboard. Uses a Python microservice called via Firebase Cloud Functions. All pages are mobile-friendly.
- Garage & Parts Search: Enables users to search for garages and spare parts compatible with their car, filtering by location, service type, and availability. Results are displayed on a map and as a list. All pages are mobile-friendly.
- Booking & RFQ System: Provides a system for users to book services at garages or request quotations (RFQs) for spare parts. Manages booking statuses, vendor assignments, and communication between users and vendors. All pages are mobile-friendly.
- Service History Timeline: Presents a chronological timeline of the user's car service history, including service types, dates, vendor information, and invoices. Integrates with Firebase Storage for storing invoice documents. All pages are mobile-friendly.
- Vendor Onboarding & Management: Streamlines the vendor registration and approval process. Allows vendors to manage their profiles, list their services or parts, and track their bookings and orders. Admin approval workflow included. All pages are mobile-friendly.
- Admin Dashboard: Provides a centralized admin dashboard for managing vendors, categories, car data, user roles, revenue, and analytics. Implements role-based access control via Firebase custom claims. All pages are mobile-friendly.

## Style Guidelines:

- Primary color: Vibrant blue (#29ABE2), symbolizing trust and reliability in automotive services.
- Background color: Light blue (#E1F5FE), providing a clean and airy feel.
- Accent color: Orange (#FF9800), drawing attention to important CTAs.
- Body and headline font: 'PT Sans', a humanist sans-serif combining modernity and warmth for readability.
- Code font: 'Source Code Pro' for displaying code snippets.
- Use a modern, line-based icon set to represent services, parts, and features.
- Subtle transition animations and loading indicators to enhance user experience and provide feedback during data processing.