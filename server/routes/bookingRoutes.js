import express from "express";
import {
    changeBookingStatus,
    changePaymentStatus,
    checkAvailabilityOfCar,
    createBooking,
    createWalkInBooking,
    deleteBooking,
    exportOwnerBookings,
    getCalendarBookings,
    getOwnerBookings,
    updateBooking
} from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";
import { requireOwner } from "../middleware/ownerAuth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import { rateLimit } from "../middleware/rateLimit.js";

const bookingRouter = express.Router();
const bookingsGate = [protect, requireOwner, requirePermission('bookings')];
const calendarGate = [protect, requireOwner, requirePermission('calendar')];

bookingRouter.post('/check-availability', rateLimit({ windowMs: 60_000, max: 30 }), checkAvailabilityOfCar);
bookingRouter.post('/create', rateLimit({ windowMs: 60_000, max: 10, message: 'Too many booking attempts' }), createBooking);
bookingRouter.post('/owner/walk-in', ...bookingsGate, createWalkInBooking);
bookingRouter.get('/owner', ...bookingsGate, getOwnerBookings);
bookingRouter.get('/owner/export', ...bookingsGate, exportOwnerBookings);
bookingRouter.get('/owner/calendar', ...calendarGate, getCalendarBookings);
bookingRouter.post('/change-status', ...bookingsGate, changeBookingStatus);
bookingRouter.post('/change-payment-status', ...bookingsGate, changePaymentStatus);
bookingRouter.post('/update', ...bookingsGate, updateBooking);
bookingRouter.post('/delete', ...bookingsGate, deleteBooking);

export default bookingRouter;
