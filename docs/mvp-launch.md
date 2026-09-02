# QarWheel MVP Launch Document

## 1. Product Overview

QarWheel is an AI-enhanced automotive platform for car owners and service providers in Qatar. The MVP focuses on delivering core digital vehicle management, intelligent maintenance guidance, and a vendor marketplace for garages.

### Target users
- Car owners who want a simple digital car passport and maintenance advisor
- Garage operators who need a lightweight way to manage bookings and customer requests
- Customers who want trusted local service discovery and easy appointment booking

## 2. MVP Features

### 2.1 User Portal

- **VIN-based car registration**
  - Users can add a car simply by entering its VIN.
  - The system automatically retrieves make, model, and year details from an external VIN lookup flow.

- **Digital car passport**
  - Stores vehicles and service records in a secure Firestore database.
  - Provides a centralized dashboard for each car.

- **AI maintenance predictions**
  - Uses vehicle data, current mileage, and service history to forecast upcoming maintenance needs.
  - Includes confidence-level context so users understand how the answer was generated.

- **AI service history summary**
  - Analyzes the customer’s service record and highlights key patterns and potential issues.
  - Helps users understand whether their vehicle needs attention.

- **Garage discovery and booking**
  - Displays nearby approved garages on a map.
  - Allows users to search for service providers and request bookings.

### 2.2 Vendor Portal

- **Vendor login and dashboard**
  - Garage owners sign in to a dedicated vendor experience.

- **Booking management**
  - Vendors can view and manage incoming customer appointments.

- **Service listing**
  - Vendors can present their service offerings and pricing.

### 2.3 Platform Infrastructure

- **Modern web stack**
  - Built with Next.js, TypeScript, React, Tailwind CSS, and ShadCN UI.

- **Secure backend**
  - Uses Firebase Authentication and Firestore for scalable data storage.

- **AI integration**
  - Powered by Genkit with Google Gemini for conversational and predictive AI features.

## 3. How the AI functions work

### 3.1 VIN lookup flow: `getVinDetails`

- Implemented in `src/ai/flows/get-vin-details.ts`.
- Accepts a 17-character VIN and returns:
  - `make`
  - `model`
  - `year`
- The flow uses an AI tool wrapper around a VIN lookup simulation.
- In MVP mode, it returns deterministic mock results for example VIN prefixes:
  - `JN1` → Nissan Patrol 2023
  - `SAL` → Land Rover Range Rover 2022
  - `WBA` → BMW X5 2021
  - default → Toyota Camry 2020

### 3.2 Predictive maintenance: `predictMaintenance`

- Implemented in `src/ai/flows/predictive-maintenance-suggestions.ts`.
- Input includes:
  - `vin`
  - `mileage`
  - `serviceHistory`
  - `qatarClimate`
- The prompt instructs the model to act as an expert automotive technician for Qatar.
- Output includes:
  - `predictedMaintenanceNeeds`
  - `confidenceLevel`
- This function produces recommendations such as oil changes, brake inspections, filter replacements, and other maintenance based on mileage, history, and climate.

### 3.3 Service history summary: `summarizeServiceHistory`

- Implemented in `src/ai/flows/summarize-service-history.ts`.
- Input includes:
  - `serviceHistory`
  - `vin`
  - `make`
  - `model`
  - `year`
- The AI generates:
  - `summary`
  - `potentialIssues`
- The goal is to synthesize the car’s history into clear, actionable insights for the user.

## 4. How the application works end to end

1. **User signs up / logs in** using Firebase Authentication.
2. **User adds a car** by entering its VIN.
3. The app calls the VIN lookup AI flow and stores the resulting vehicle details.
4. The user can view the car dashboard, service history, and upcoming recommendations.
5. When service data is available, the app calls the AI maintenance prediction flow for proactive guidance.
6. The service history summary flow generates an easy-to-read summary for the user.
7. Users can browse garages and submit bookings through the platform.
8. Vendors receive bookings in their portal and can manage appointment updates.

## 5. MVP launch value proposition

- **Digital convenience**: Replace paper service logs with a mobile-first digital vehicle passport.
- **AI guidance**: Provide smart, contextual maintenance recommendations rather than raw data.
- **Local relevance**: Tailored for Qatar’s climate and car ownership conditions.
- **Faster service decisions**: Help users choose garages and prepare for upcoming work earlier.

## 6. Deployment notes for launch

- Requires Firebase configuration in `src/firebase/config.ts`.
- Firestore rules are defined in `firestore.rules` and must be deployed along with the database.
- AI features require a valid Google Gemini API key and Genkit setup.
- Development commands:
  - `npm install`
  - `npm run dev`
  - `npm run genkit:dev` for AI flow support

## 7. Recommended next steps after MVP

- Connect the VIN lookup flow with a real VIN API for production accuracy.
- Expand garage booking to support live availability and pricing.
- Add more detailed service record entry and invoice upload support.
- Introduce admin controls for vendor approval and marketplace moderation.

---

This document is designed to support customer-facing MVP launch communication and provide a concise technical summary of the key features and AI-driven functions in QarWheel.