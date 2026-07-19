# Project Structure Guide

This guide makes the project easier to customize and maintain by showing where the main pages, reusable components, styles, and API hooks live.

## 1. Main app entry points

- Client entry: [client/src/main.jsx](client/src/main.jsx)
- App routes and layout: [client/src/App.jsx](client/src/App.jsx)
- Global styles and theme variables: [client/src/index.css](client/src/index.css)
- Shared app state and API configuration: [client/src/context/AppContext.jsx](client/src/context/AppContext.jsx)
- Backend entry: [server/server.js](server/server.js)

---

## 2. Page map

### Home page
- Full file: [client/src/pages/Home.jsx](client/src/pages/Home.jsx)
- Main component: Home
- Child components:
  - [client/src/components/Hero.jsx](client/src/components/Hero.jsx)
  - [client/src/components/FeaturedSection.jsx](client/src/components/FeaturedSection.jsx)
  - [client/src/components/Banner.jsx](client/src/components/Banner.jsx)
  - [client/src/components/Testimonial.jsx](client/src/components/Testimonial.jsx)
  - [client/src/components/Newsletter.jsx](client/src/components/Newsletter.jsx)
- Styling: [client/src/index.css](client/src/index.css) plus Tailwind classes in the page and child components
- API/service files used:
  - [client/src/context/AppContext.jsx](client/src/context/AppContext.jsx)
  - [server/routes/userRoutes.js](server/routes/userRoutes.js)
  - [server/controllers/userController.js](server/controllers/userController.js)

### Cars page
- Full file: [client/src/pages/Cars.jsx](client/src/pages/Cars.jsx)
- Main component: Cars
- Child components:
  - [client/src/components/CarCard.jsx](client/src/components/CarCard.jsx)
  - [client/src/components/Title.jsx](client/src/components/Title.jsx)
- Styling: [client/src/index.css](client/src/index.css)
- API/service files used:
  - [client/src/context/AppContext.jsx](client/src/context/AppContext.jsx)
  - [server/routes/userRoutes.js](server/routes/userRoutes.js)
  - [server/controllers/bookingController.js](server/controllers/bookingController.js)

### Car Details page
- Full file: [client/src/pages/CarDetails.jsx](client/src/pages/CarDetails.jsx)
- Main component: CarDetails
- Child components:
  - [client/src/components/Loader.jsx](client/src/components/Loader.jsx)
- Styling: [client/src/index.css](client/src/index.css)
- API/service files used:
  - [client/src/context/AppContext.jsx](client/src/context/AppContext.jsx)
  - [server/routes/bookingRoutes.js](server/routes/bookingRoutes.js)
  - [server/controllers/bookingController.js](server/controllers/bookingController.js)

### Booking page
- Full file: [client/src/pages/MyBookings.jsx](client/src/pages/MyBookings.jsx)
- Main component: MyBookings
- Child components:
  - [client/src/components/Title.jsx](client/src/components/Title.jsx)
- Styling: [client/src/index.css](client/src/index.css)
- API/service files used:
  - [client/src/context/AppContext.jsx](client/src/context/AppContext.jsx)
  - [server/routes/bookingRoutes.js](server/routes/bookingRoutes.js)
  - [server/controllers/bookingController.js](server/controllers/bookingController.js)

### About page
- Status: not implemented in the current version
- Recommended location for future implementation:
  - [client/src/pages/About.jsx](client/src/pages/About.jsx)
- If added, register it in [client/src/App.jsx](client/src/App.jsx)

### Contact page
- Status: not implemented in the current version
- Recommended location for future implementation:
  - [client/src/pages/Contact.jsx](client/src/pages/Contact.jsx)
- If added, register it in [client/src/App.jsx](client/src/App.jsx)

### Login page
- Full file: [client/src/components/Login.jsx](client/src/components/Login.jsx)
- Main component: Login
- Child components: none
- Styling: [client/src/index.css](client/src/index.css)
- API/service files used:
  - [client/src/context/AppContext.jsx](client/src/context/AppContext.jsx)
  - [server/routes/userRoutes.js](server/routes/userRoutes.js)
  - [server/controllers/userController.js](server/controllers/userController.js)

### Register page
- Status: currently handled inside the login modal in [client/src/components/Login.jsx](client/src/components/Login.jsx)
- Main component: Login
- Styling: [client/src/index.css](client/src/index.css)
- API/service files used:
  - [server/routes/userRoutes.js](server/routes/userRoutes.js)
  - [server/controllers/userController.js](server/controllers/userController.js)

### Admin Dashboard
- Full file: [client/src/pages/owner/Dashboard.jsx](client/src/pages/owner/Dashboard.jsx)
- Main component: Dashboard
- Child components:
  - [client/src/components/owner/Title.jsx](client/src/components/owner/Title.jsx)
- Styling: [client/src/index.css](client/src/index.css)
- API/service files used:
  - [client/src/context/AppContext.jsx](client/src/context/AppContext.jsx)
  - [server/routes/ownerRoutes.js](server/routes/ownerRoutes.js)
  - [server/controllers/ownerController.js](server/controllers/ownerController.js)

### Customers page
- Full file: [client/src/pages/owner/Customers.jsx](client/src/pages/owner/Customers.jsx)
- Main component: Customers
- Child components:
  - [client/src/components/owner/Title.jsx](client/src/components/owner/Title.jsx)
- Styling: [client/src/index.css](client/src/index.css)
- API/service files used:
  - [client/src/context/AppContext.jsx](client/src/context/AppContext.jsx)
  - [server/routes/ownerRoutes.js](server/routes/ownerRoutes.js)
  - [server/controllers/ownerController.js](server/controllers/ownerController.js)

### Reservations page
- Full file: [client/src/pages/owner/ManageBookings.jsx](client/src/pages/owner/ManageBookings.jsx)
- Main component: ManageBookings
- Child components:
  - [client/src/components/owner/Title.jsx](client/src/components/owner/Title.jsx)
- Styling: [client/src/index.css](client/src/index.css)
- API/service files used:
  - [client/src/context/AppContext.jsx](client/src/context/AppContext.jsx)
  - [server/routes/bookingRoutes.js](server/routes/bookingRoutes.js)
  - [server/controllers/bookingController.js](server/controllers/bookingController.js)

### Vehicles page
- Public vehicle listing: [client/src/pages/Cars.jsx](client/src/pages/Cars.jsx)
- Admin vehicle management: [client/src/pages/owner/ManageCars.jsx](client/src/pages/owner/ManageCars.jsx)
- Main components:
  - Cars
  - ManageCars
- Child components:
  - [client/src/components/CarCard.jsx](client/src/components/CarCard.jsx)
  - [client/src/components/owner/Title.jsx](client/src/components/owner/Title.jsx)
- Styling: [client/src/index.css](client/src/index.css)
- API/service files used:
  - [client/src/context/AppContext.jsx](client/src/context/AppContext.jsx)
  - [server/routes/ownerRoutes.js](server/routes/ownerRoutes.js)
  - [server/controllers/ownerController.js](server/controllers/ownerController.js)

---

## 3. Where to edit the main visual elements

### Website colors
- Main theme variables are defined in [client/src/index.css](client/src/index.css)
- Tailwind utility classes such as bg-primary, text-primary, hover:bg-primary-dull are used throughout the UI
- Common places to change colors:
  - [client/src/components/Navbar.jsx](client/src/components/Navbar.jsx)
  - [client/src/components/Footer.jsx](client/src/components/Footer.jsx)
  - [client/src/components/Hero.jsx](client/src/components/Hero.jsx)
  - [client/src/components/CarCard.jsx](client/src/components/CarCard.jsx)
  - [client/src/pages/CarDetails.jsx](client/src/pages/CarDetails.jsx)

### Logo
- Source asset: [client/src/assets/logo.svg](client/src/assets/logo.svg)
- Central reference: [client/src/assets/assets.js](client/src/assets/assets.js)
- Used in:
  - [client/src/components/Navbar.jsx](client/src/components/Navbar.jsx)
  - [client/src/components/Footer.jsx](client/src/components/Footer.jsx)

### Website name
- There is no single global brand-name constant yet
- Current visible brand text is spread across:
  - [client/src/components/Navbar.jsx](client/src/components/Navbar.jsx)
  - [client/src/components/Footer.jsx](client/src/components/Footer.jsx)
  - [client/src/components/Hero.jsx](client/src/components/Hero.jsx)

### Navigation menu
- Main navigation links are defined in [client/src/assets/assets.js](client/src/assets/assets.js)
- Rendered in [client/src/components/Navbar.jsx](client/src/components/Navbar.jsx)

### Footer
- Main footer content is in [client/src/components/Footer.jsx](client/src/components/Footer.jsx)

### Fonts
- Global font import and family are in [client/src/index.css](client/src/index.css)

### Icons
- Icons are imported and exported from [client/src/assets/assets.js](client/src/assets/assets.js)
- Assets live in [client/src/assets](client/src/assets)

### Images
- Shared image references are centralized in [client/src/assets/assets.js](client/src/assets/assets.js)
- Actual image files are in [client/src/assets](client/src/assets)

### Hero banner
- Main hero section: [client/src/components/Hero.jsx](client/src/components/Hero.jsx)
- Hero image asset is referenced through [client/src/assets/assets.js](client/src/assets/assets.js)

### Homepage sections
- Homepage composition: [client/src/pages/Home.jsx](client/src/pages/Home.jsx)
- Section components:
  - [client/src/components/Hero.jsx](client/src/components/Hero.jsx)
  - [client/src/components/FeaturedSection.jsx](client/src/components/FeaturedSection.jsx)
  - [client/src/components/Banner.jsx](client/src/components/Banner.jsx)
  - [client/src/components/Testimonial.jsx](client/src/components/Testimonial.jsx)
  - [client/src/components/Newsletter.jsx](client/src/components/Newsletter.jsx)

### Car cards
- Card UI: [client/src/components/CarCard.jsx](client/src/components/CarCard.jsx)
- Card data comes from the app context and API response in [client/src/context/AppContext.jsx](client/src/context/AppContext.jsx)

### Buttons
- Button styles are currently written directly inside component JSX files
- Common examples:
  - [client/src/components/Navbar.jsx](client/src/components/Navbar.jsx)
  - [client/src/components/Hero.jsx](client/src/components/Hero.jsx)
  - [client/src/components/CarCard.jsx](client/src/components/CarCard.jsx)
  - [client/src/pages/CarDetails.jsx](client/src/pages/CarDetails.jsx)

### Forms
- Login/register form: [client/src/components/Login.jsx](client/src/components/Login.jsx)
- Booking form: [client/src/pages/CarDetails.jsx](client/src/pages/CarDetails.jsx)
- Add car form (admin): [client/src/pages/owner/AddCar.jsx](client/src/pages/owner/AddCar.jsx)

### Animations
- Animations are implemented with the motion library in components such as:
  - [client/src/components/Hero.jsx](client/src/components/Hero.jsx)
  - [client/src/components/FeaturedSection.jsx](client/src/components/FeaturedSection.jsx)
  - [client/src/components/CarCard.jsx](client/src/components/CarCard.jsx)
  - [client/src/components/Footer.jsx](client/src/components/Footer.jsx)
  - [client/src/pages/Cars.jsx](client/src/pages/Cars.jsx)
  - [client/src/pages/CarDetails.jsx](client/src/pages/CarDetails.jsx)

---

## 4. Project structure overview

### Client
- [client/src/components](client/src/components) — reusable UI pieces such as navbar, footer, hero, cards, and admin sidebar
- [client/src/pages](client/src/pages) — page-level components for public and admin views
- [client/src/context](client/src/context) — app-wide state and shared Axios setup
- [client/src/assets](client/src/assets) — images, icons, logos, and shared asset registry
- [client/src/index.css](client/src/index.css) — global styles and theme tokens

### Server
- [server/controllers](server/controllers) — business logic for users, bookings, and owners
- [server/routes](server/routes) — API endpoint definitions
- [server/models](server/models) — database schemas
- [server/middleware](server/middleware) — authentication and uploads
- [server/configs](server/configs) — database and external service configuration

---

## 5. Maintenance tips

- Keep page-specific logic inside page files in [client/src/pages](client/src/pages)
- Keep reusable UI in [client/src/components](client/src/components)
- Keep shared data and API setup in [client/src/context/AppContext.jsx](client/src/context/AppContext.jsx)
- Keep global brand styling in [client/src/index.css](client/src/index.css)
- Keep image and icon references centralized in [client/src/assets/assets.js](client/src/assets/assets.js)
- When adding a new page, add it to [client/src/App.jsx](client/src/App.jsx) and place its source under [client/src/pages](client/src/pages)
