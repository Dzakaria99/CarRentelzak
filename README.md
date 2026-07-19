# 🚗 DriveNow - Car Rental Booking System

> A modern, full-stack Car Rental Management Platform built with the MERN Stack by **Zakaria Douami**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?logo=mongodb)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)

---

# 📌 Overview

DriveNow is a complete Car Rental Booking Platform designed for rental agencies. It allows customers to search and reserve vehicles online while providing administrators with a powerful dashboard to manage cars, bookings, and customers.

The application is built using the **MERN Stack** with secure authentication, cloud image storage, and a responsive user interface.

---

# ✨ Features

## 👤 Customer

- Browse available vehicles
- Search by pickup location
- Filter by brand, price, category
- View detailed car information
- Select pickup & return dates
- Instant booking
- View booking history
- Responsive mobile-friendly interface

---

## 🔐 Authentication

- JWT Authentication
- Secure Login
- User Registration
- Password Encryption
- Protected Routes

---

## 👨‍💼 Admin Dashboard

- Secure Admin Login
- Add/Edit/Delete Cars
- Upload Multiple Images
- Manage Bookings
- Manage Fleet
- Booking Status Management
- Dashboard Statistics

---

## 🚘 Vehicle Management

- Multiple Pickup Locations
- Car Categories
- Daily Pricing
- Availability Status
- Transmission
- Fuel Type
- Seats
- Air Conditioning
- Car Images

---

## 📅 Booking System

- Real-time Availability
- Pickup & Return Date
- Booking Confirmation
- Booking Status
- Price Calculation
- Reservation History

---

## ☁️ Media Storage

Powered by **ImageKit**

- Fast CDN
- Automatic Optimization
- Secure Upload
- Image Compression

---

# 🛠 Tech Stack

## Frontend

- React.js
- React Router
- Axios
- Context API
- Tailwind CSS
- Vite

---

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication
- ImageKit SDK
- Bcrypt

---

## Database

- MongoDB Atlas

---

## Deployment

- Frontend → Vercel
- Backend → Render
- Database → MongoDB Atlas
- Images → ImageKit

---

# 📂 Project Structure

```
car-rental/
│
├── client/
│   ├── src/
│   ├── assets/
│   ├── components/
│   ├── pages/
│   ├── context/
│   └── App.jsx
│
├── server/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── config/
│   └── server.js
│
└── README.md
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/car-rental.git

cd car-rental
```

---

## Install Frontend

```bash
cd client

npm install
```

---

## Install Backend

```bash
cd ../server

npm install
```

---

# 🔑 Environment Variables

Create a `.env` file inside the server directory.

```env
PORT=4000

MONGO_URI=your_mongodb_uri

JWT_SECRET=your_secret_key

IMAGEKIT_PUBLIC_KEY=

IMAGEKIT_PRIVATE_KEY=

IMAGEKIT_URL_ENDPOINT=
```

---

# ▶️ Running the Project

Backend

```bash
cd server

npm run dev
```

Frontend

```bash
cd client

npm run dev
```

---

# 🌐 Default URLs

Frontend

```
http://localhost:5173
```

Backend

```
http://localhost:4000
```

---

# 📡 API Overview

## Authentication

| Method | Endpoint | Description |
|---------|----------|------------|
| POST | /api/auth/register | Register User |
| POST | /api/auth/login | Login User |

---

## Cars

| Method | Endpoint |
|---------|----------|
| GET | /api/cars |
| GET | /api/cars/:id |
| POST | /api/cars |
| PUT | /api/cars/:id |
| DELETE | /api/cars/:id |

---

## Bookings

| Method | Endpoint |
|---------|----------|
| POST | /api/bookings |
| GET | /api/bookings/me |
| GET | /api/admin/bookings |
| PUT | /api/bookings/:id |

---

# 🔒 Security

- JWT Authentication
- Password Hashing (bcrypt)
- Protected Admin Routes
- Secure Environment Variables
- MongoDB Validation

---

# 🚀 Future Improvements

- Stripe Payments
- Email Notifications
- Google Login
- OTP Verification
- Coupons & Discounts
- Reviews & Ratings
- Admin Analytics
- Multi-language Support

---

# 👨‍💻 Developer

## Zakaria Douami

Full Stack Developer

**Tech Stack**

- React.js
- Node.js
- Express.js
- MongoDB
- JavaScript
- REST APIs
- Tailwind CSS

---

# 📜 License

This project is licensed under the **MIT License**.

---

# ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub.

---

## Made with ❤️ by **Zakaria Douami**
