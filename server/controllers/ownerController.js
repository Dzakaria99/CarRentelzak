import fs from 'fs';
import mongoose from 'mongoose';

import Booking from "../models/Booking.js";
import Car from "../models/Car.js";
import User from "../models/User.js";
import { cleanupUploadedFile } from "../middleware/multer.js";
import { escapeRegex } from "../utils/helpers.js";
import {
  generateFleetId,
  normalizeCategory,
  normalizePlate,
  normalizeVin,
} from "../utils/fleetAssets.js";
import {
  applyLocationsToCar,
  getCarLocations,
  normalizeLocations,
} from "../utils/carLocations.js";



const assertOwnerCar = async (carId, ownerId) => {
  if (!mongoose.isValidObjectId(carId)) return null;
  const car = await Car.findById(carId);
  if (!car || !car.owner || car.owner.toString() !== ownerId.toString()) return null;
  return car;
};

const ensureUniqueFleetId = async (ownerId, preferred = '') => {
  let fleetId = String(preferred || '').trim().toUpperCase();
  if (fleetId) {
    const clash = await Car.findOne({ owner: ownerId, fleetId });
    if (clash) throw Object.assign(new Error('Fleet ID already exists for another vehicle'), { status: 409 });
    return fleetId;
  }
  for (let i = 0; i < 12; i++) {
    fleetId = generateFleetId();
    const exists = await Car.exists({ owner: ownerId, fleetId });
    if (!exists) return fleetId;
  }
  return `FLT-${Date.now().toString(36).toUpperCase()}`;
};

const assertUniqueAssetFields = async (ownerId, { vin, licensePlate, fleetId }, excludeId = null) => {
  const checks = [];
  if (vin) checks.push({ field: 'VIN', query: { owner: ownerId, vin } });
  if (licensePlate) checks.push({ field: 'License plate', query: { owner: ownerId, licensePlate } });
  if (fleetId) checks.push({ field: 'Fleet ID', query: { owner: ownerId, fleetId } });

  for (const { field, query } of checks) {
    if (excludeId) query._id = { $ne: excludeId };
    const hit = await Car.findOne(query).select('_id');
    if (hit) {
      const err = new Error(`${field} is already assigned to another vehicle in your fleet`);
      err.status = 409;
      throw err;
    }
  }
};

/** Backfill fleetId / locations for legacy cars */
const backfillFleetIds = async (ownerId) => {
  const missing = await Car.find({
    owner: ownerId,
    $or: [
      { fleetId: '' },
      { fleetId: null },
      { fleetId: { $exists: false } },
      { locations: { $exists: false } },
      { locations: { $size: 0 } },
    ],
  });
  for (const car of missing) {
    if (!car.fleetId) {
      car.fleetId = await ensureUniqueFleetId(ownerId);
    }
    if (!car.branch && car.location) car.branch = car.location;
    const locs = getCarLocations(car);
    if (locs.length) {
      applyLocationsToCar(car, locs);
    }
    await car.save();
  }
};

export const addCar = async (req, res) => {
  let imageFile = req.file;
  try {
    const { _id } = req.user;

    if (!imageFile) {
      return res.status(400).json({ success: false, message: 'Car image is required' });
    }
    if (!req.body.carData) {
      return res.status(400).json({ success: false, message: 'Car data is required' });
    }

    let car;
    try {
      car = JSON.parse(req.body.carData);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid car data format' });
    }

    const required = ['brand', 'model', 'year', 'category', 'transmission', 'fuel_type', 'seating_capacity', 'description', 'pricePerDay'];
    for (const field of required) {
      if (!car[field] && car[field] !== 0) {
        return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
      }
    }

    const locations = normalizeLocations(car.locations, car.location);
    if (!locations.length) {
      return res.status(400).json({
        success: false,
        message: 'Select at least one pickup location where this vehicle is available',
      });
    }

    const vin = normalizeVin(car.vin);
    const licensePlate = normalizePlate(car.licensePlate);
    const branch = String(car.branch || locations[0] || '').trim();
    const fleetId = await ensureUniqueFleetId(_id, car.fleetId);
    await assertUniqueAssetFields(_id, { vin, licensePlate, fleetId });

    
    cleanupUploadedFile(imageFile);
    imageFile = null;

    const created = await Car.create({
      ...car,
      category: normalizeCategory(car.category),
      owner: _id,
      image,
      isAvaliable: true,
      fleetId,
      vin,
      licensePlate,
      branch,
      locations,
      location: locations[0],
      mileage: Number(car.mileage) || 0,
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle added to fleet',
      car: created,
    });
  } catch (error) {
    console.error(error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Failed to add car',
    });
  } finally {
    cleanupUploadedFile(imageFile);
  }
};

export const getOwnerCars = async (req, res) => {
  try {
    const { _id } = req.user;
    await backfillFleetIds(_id);

    const {
      search = '',
      fleetId = '',
      vin = '',
      plate = '',
      status = '',
      branch = '',
      category = '',
    } = req.query;

    const filter = { owner: _id };
    if (status) filter.status = status;
    if (branch) filter.branch = new RegExp(escapeRegex(branch), 'i');
    if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
    if (fleetId) filter.fleetId = new RegExp(escapeRegex(fleetId), 'i');
    if (vin) filter.vin = new RegExp(escapeRegex(vin), 'i');
    if (plate) filter.licensePlate = new RegExp(escapeRegex(plate), 'i');

    if (search.trim()) {
      const q = escapeRegex(search.trim());
      filter.$or = [
        { fleetId: new RegExp(q, 'i') },
        { vin: new RegExp(q, 'i') },
        { licensePlate: new RegExp(q, 'i') },
        { brand: new RegExp(q, 'i') },
        { model: new RegExp(q, 'i') },
        { branch: new RegExp(q, 'i') },
        { location: new RegExp(q, 'i') },
        { locations: new RegExp(q, 'i') },
      ];
    }

    const cars = await Car.find(filter).sort({ fleetId: 1, createdAt: -1 });
    const branches = await Car.distinct('branch', { owner: _id, branch: { $nin: ['', null] } });

    res.json({ success: true, cars, branches });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch cars' });
  }
};

export const getOwnerCarById = async (req, res) => {
  try {
    const car = await assertOwnerCar(req.params.id, req.user._id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }
    res.json({ success: true, car });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch car' });
  }
};

export const updateCar = async (req, res) => {
  let imageFile = req.file;
  try {
    const { carId } = req.body;
    const car = await assertOwnerCar(carId, req.user._id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    if (req.body.carData) {
      let updates;
      try {
        updates = JSON.parse(req.body.carData);
      } catch {
        return res.status(400).json({ success: false, message: 'Invalid car data format' });
      }

      const allowed = [
        'brand', 'model', 'year', 'category', 'transmission', 'fuel_type',
        'seating_capacity', 'description', 'pricePerDay', 'features',
        'licensePlate', 'mileage', 'fleetId', 'vin', 'branch',
      ];
      for (const key of allowed) {
        if (updates[key] !== undefined) car[key] = updates[key];
      }

      if (updates.category !== undefined) car.category = normalizeCategory(updates.category);
      if (updates.vin !== undefined) car.vin = normalizeVin(updates.vin);
      if (updates.licensePlate !== undefined) car.licensePlate = normalizePlate(updates.licensePlate);
      if (updates.fleetId !== undefined) car.fleetId = String(updates.fleetId || '').trim().toUpperCase();
      if (updates.branch !== undefined) car.branch = String(updates.branch || '').trim();
      if (updates.mileage !== undefined) car.mileage = Number(updates.mileage) || 0;

      if (updates.locations !== undefined || updates.location !== undefined) {
        const locations = normalizeLocations(updates.locations, updates.location);
        if (!locations.length) {
          return res.status(400).json({
            success: false,
            message: 'Select at least one pickup location where this vehicle is available',
          });
        }
        applyLocationsToCar(car, locations);
      }

      if (!car.fleetId) {
        car.fleetId = await ensureUniqueFleetId(req.user._id);
      }

      await assertUniqueAssetFields(
        req.user._id,
        { vin: car.vin, licensePlate: car.licensePlate, fleetId: car.fleetId },
        car._id
      );
    }

    if (imageFile) {
      
      cleanupUploadedFile(imageFile);
      imageFile = null;
    }

    await car.save();
    res.json({ success: true, message: 'Vehicle updated', car });
  } catch (error) {
    console.error(error.message);
    res.status(error.status || 500).json({
      success: false,
      message: error.status ? error.message : 'Failed to update car',
    });
  } finally {
    cleanupUploadedFile(imageFile);
  }
};

export const toggleCarAvailability = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;

    const car = await assertOwnerCar(carId, _id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    car.isAvaliable = !car.isAvaliable;
    await car.save();

    res.json({ success: true, message: 'Availability updated' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to toggle availability' });
  }
};

export const deleteCar = async (req, res) => {
  try {
    const { _id } = req.user;
    const { carId } = req.body;

    const car = await assertOwnerCar(carId, _id);
    if (!car) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }

    const activeBooking = await Booking.findOne({
      car: carId,
      status: { $in: ['pending', 'confirmed', 'active'] },
    });

    if (activeBooking) {
      return res.status(409).json({ success: false, message: 'Cannot remove a car with active reservations' });
    }

    car.owner = null;
    car.isAvaliable = false;
    await car.save();

    res.json({ success: true, message: 'Car removed from fleet' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to remove car' });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const { _id } = req.user;

    const cars = await Car.find({ owner: _id });
    const bookings = await Booking.find({ owner: _id }).populate('car').sort({ createdAt: -1 });

    const pendingBookings = await Booking.countDocuments({ owner: _id, status: 'pending' });
    const confirmedBookings = await Booking.countDocuments({ owner: _id, status: 'confirmed' });
    const activeBookings = await Booking.countDocuments({ owner: _id, status: 'active' });
    const completedBookings = await Booking.countDocuments({ owner: _id, status: 'completed' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const todayBookings = await Booking.countDocuments({ owner: _id, createdAt: { $gte: today } });

    const upcomingPickups = await Booking.find({
      owner: _id,
      status: { $in: ['confirmed', 'active'] },
      pickupDate: { $gte: today, $lte: nextWeek },
    }).populate('car').sort({ pickupDate: 1 }).limit(5);

    const upcomingReturns = await Booking.find({
      owner: _id,
      status: { $in: ['active', 'confirmed'] },
      returnDate: { $gte: today, $lte: nextWeek },
    }).populate('car').sort({ returnDate: 1 }).limit(5);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyBookings = bookings.filter((b) =>
      ['confirmed', 'active', 'completed'].includes(b.status) &&
      new Date(b.createdAt) >= startOfMonth,
    );
    const monthlyRevenue = monthlyBookings.reduce((acc, booking) => acc + booking.price, 0);

    const totalCars = cars.length;
    const availableVehicles = cars.filter((car) => car.isAvaliable).length;
    const rentedVehicles = totalCars - availableVehicles;
    const occupancyRate = totalCars > 0 ? Math.round((rentedVehicles / totalCars) * 100) : 0;

    res.json({
      success: true,
      dashboardData: {
        totalCars,
        totalBookings: bookings.length,
        pendingBookings,
        confirmedBookings,
        activeBookings,
        completedBookings,
        todayBookings,
        availableVehicles,
        rentedVehicles,
        occupancyRate,
        upcomingPickups,
        upcomingReturns,
        recentBookings: bookings.slice(0, 5),
        monthlyRevenue,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
};

export const getAdminOverview = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const cars = await Car.find({ owner: ownerId }).lean();
    const bookings = await Booking.find({ owner: ownerId }).populate('car').sort({ createdAt: -1 }).lean();

    const customers = await Booking.aggregate([
      { $match: { owner: ownerId, customerEmail: { $ne: '' } } },
      { $group: { _id: { $toLower: '$customerEmail' } } },
    ]);

    const revenue = bookings
      .filter((item) => ['confirmed', 'active', 'completed'].includes(item.status))
      .reduce((acc, item) => acc + item.price, 0);

    res.json({
      success: true,
      overview: {
        totalVehicles: cars.length,
        totalReservations: bookings.length,
        availableVehicles: cars.filter((car) => car.isAvaliable).length,
        rentedVehicles: cars.filter((car) => !car.isAvaliable).length,
        totalCustomers: customers.length,
        revenue,
        recentReservations: bookings.slice(0, 6),
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch overview' });
  }
};

export const getCustomers = async (req, res) => {
  try {
    const bookings = await Booking.find({ owner: req.user._id })
      .select('customerName customerEmail customerPhone createdAt status price')
      .sort({ createdAt: -1 })
      .lean();

    const byEmail = new Map();
    for (const booking of bookings) {
      const email = (booking.customerEmail || '').toLowerCase().trim();
      if (!email) continue;
      const existing = byEmail.get(email);
      if (!existing) {
        byEmail.set(email, {
          _id: email,
          name: booking.customerName || 'Guest',
          email: booking.customerEmail,
          phone: booking.customerPhone || '',
          bookingsCount: 1,
          lastBookingAt: booking.createdAt,
          totalSpent: ['confirmed', 'active', 'completed'].includes(booking.status) ? booking.price : 0,
        });
      } else {
        existing.bookingsCount += 1;
        if (['confirmed', 'active', 'completed'].includes(booking.status)) {
          existing.totalSpent += booking.price || 0;
        }
        if (new Date(booking.createdAt) > new Date(existing.lastBookingAt)) {
          existing.lastBookingAt = booking.createdAt;
          existing.name = booking.customerName || existing.name;
          existing.phone = booking.customerPhone || existing.phone;
        }
      }
    }

    const customers = Array.from(byEmail.values()).sort(
      (a, b) => new Date(b.lastBookingAt) - new Date(a.lastBookingAt),
    );

    res.json({ success: true, customers });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
};

export const updateUserImage = async (req, res) => {
  let imageFile = req.file;
  try {
    const { _id } = req.user;

    if (!imageFile) {
      return res.status(400).json({ success: false, message: 'Image is required' });
    }

    
    cleanupUploadedFile(imageFile);
    imageFile = null;

    await User.findByIdAndUpdate(_id, { image });
    res.json({ success: true, message: 'Profile image updated' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: 'Failed to update profile image' });
  } finally {
    cleanupUploadedFile(imageFile);
  }
};
