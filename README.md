# QarWheels

**QarWheels** is a modern, AI-powered web application designed to help car owners in Qatar intelligently manage their vehicles. It provides predictive maintenance suggestions, a digital service passport, and a curated directory of trusted local garages.

## ✨ Features

*   **User Portal**:
    *   **AI-Powered Dashboards**: Get at-a-glance statistics on your vehicles, including upcoming appointments and total maintenance costs.
    *   **Digital Car Passport**: Add your vehicles via VIN and maintain a complete digital history of service records.
    *   **AI Maintenance Predictions**: Leverages Genkit and the Gemini API to analyze your car's service history and mileage to forecast future maintenance needs.
    *   **AI Service Analysis**: Get an AI-generated summary of your vehicle's service history to identify potential issues.
    *   **Find & Book Garages**: Search a map of approved garages, view their services and reviews, and book appointments directly through the platform.
*   **Vendor Portal**:
    *   **Workshop Command Center**: A dedicated dashboard for garage owners to manage their business.
    *   **Service & Inventory Management**: Add and price services, and manage a real-time inventory of parts.
    *   **Booking Management**: View and update customer appointments.
    *   **Customer & Staff Directory**: Manage customer information and staff roles.
    *   **Promotions & Reviews**: Create promotional offers and view customer feedback.
*   **Modern Tech**: Built with Next.js, React, TypeScript, and styled with Tailwind CSS and ShadCN UI components for a sleek, responsive experience.
*   **Secure Backend**: Powered by Firebase for secure authentication and a scalable Firestore database with granular security rules.

## 🚀 Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **AI/Generative**: [Firebase Genkit](https://firebase.google.com/docs/genkit) with Google Gemini
*   **UI**: [React](https://reactjs.org/), [ShadCN UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
*   **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore, Hosting)
*   **Form Management**: [React Hook Form](https://react-hook-form.com/) with [Zod](https://zod.dev/) for validation
*   **Charting**: [Recharts](https://recharts.org/)

## 🏁 Getting Started

To run the project locally, you will need Node.js and npm installed.

### 1. Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd qarwheels
npm install
```

### 2. Firebase Setup

This project requires a Firebase project to run.

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  Navigate to your project's settings and find your Firebase configuration object.
3.  Copy this object into the `src/firebase/config.ts` file, replacing the placeholder values.
4.  In the Firebase Console, go to **Build > Firestore Database** and create a new database in **Production mode**. Then, go to the **Rules** tab and paste the contents of the `firestore.rules` file from this repository.
5.  Go to **Build > Authentication** and enable the **Email/Password** and **Anonymous** sign-in providers.

### 3. Running the Development Server

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at `http://localhost:9002`.

### 4. Running Genkit (for AI Features)

The AI features are powered by Genkit. To use them, you'll need a Google AI API key.

1.  Create a `.env` file in the root of the project.
2.  Add your API key to the file:
    ```
    GEMINI_API_KEY=your_api_key_here
    ```
3.  In a separate terminal, start the Genkit development server:
    ```bash
    npm run genkit:dev
    ```

This will run the AI flows that the Next.js application calls.
