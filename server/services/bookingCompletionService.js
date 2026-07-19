import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import {
  buildCompletionUrl,
  generateCompletionToken,
  hashToken,
  isTokenExpired,
} from "./completionToken.js";
import { sendCompletionInviteEmail, sendFinalConfirmationEmail } from "./emailService.js";
import {
  generateInvoicePdf,
  generateRentalContractPdf,
  publicUploadUrl,
} from "./pdfDocuments.js";
import { notifyNewReservationWhatsApp } from "./whatsappNotify.js";
import { logAudit } from "../utils/adminOps.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { storeDataUrlImage } from "./documentStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const formatDt = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString("en-GB", { hour12: false });
};

/**
 * Issue (or refresh) a secure completion token and notify the customer.
 * Called when admin confirms a reservation.
 */
export const initiateBookingCompletion = async (bookingId, { resend = false } = {}) => {
  const booking = await Booking.findById(bookingId).populate("car");
  if (!booking) throw new Error("Booking not found");
  if (booking.status === "cancelled") throw new Error("Cancelled reservations cannot be completed");

  const { token, tokenHash, expiresAt } = generateCompletionToken();
  booking.completion = booking.completion || {};
  booking.completion.tokenHash = tokenHash;
  booking.completion.tokenExpiresAt = expiresAt;
  // linkSentAt is set only after SMTP accepts the message

  if (booking.status === "pending") {
    booking.status = "confirmed";
  }

  await booking.save();

  const completionUrl = buildCompletionUrl(token);
  const vehicle = booking.car ? `${booking.car.brand} ${booking.car.model}` : "Vehicle";
  const currency = process.env.CURRENCY || "MAD";

  const emailResult = await sendCompletionInviteEmail({
    to: booking.customerEmail,
    customerName: booking.customerName,
    reservationId: booking.reservationId,
    completionUrl,
    vehicle,
    pickupDate: formatDt(booking.pickupDate),
    returnDate: formatDt(booking.returnDate),
    total: booking.price,
    currency,
  });

  // Persist honest delivery status — do not claim "sent" unless SMTP accepted
  booking.completion.lastEmail = {
    type: "completion_invite",
    to: emailResult.to || booking.customerEmail,
    success: Boolean(emailResult.success),
    skipped: Boolean(emailResult.skipped),
    reason: emailResult.reason || "",
    messageId: emailResult.messageId || "",
    at: new Date(),
  };
  if (emailResult.success) {
    booking.completion.linkSentAt = new Date();
  }
  await booking.save();

  if (!emailResult.success) {
    console.error(
      "[email] Completion invite NOT delivered:",
      emailResult.reason || emailResult.error,
      { to: booking.customerEmail, reservationId: booking.reservationId }
    );
  }

  // WhatsApp text with completion link (best-effort)
  try {
    const enabled = String(process.env.WHATSAPP_ENABLED || "").toLowerCase() === "true";
    if (enabled && booking.customerPhone) {
      await notifyNewReservationWhatsApp({
        reservationId: booking.reservationId,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        customerEmail: booking.customerEmail,
        vehicle,
        pickupLocation: booking.pickupLocation,
        returnLocation: booking.returnLocation,
        pickupDate: booking.pickupDate,
        returnDate: booking.returnDate,
        price: booking.price,
        notes: `Complete booking: ${completionUrl}`,
      });
    }
  } catch (e) {
    console.error("Completion WhatsApp notify failed:", e.message);
  }

  try {
    await logAudit({
      owner: booking.owner,
      action: resend ? "booking.completion_link_resent" : "booking.completion_link_sent",
      entityType: "Booking",
      entityId: booking._id,
      details: emailResult.success
        ? `Completion email accepted by SMTP for ${booking.reservationId} → ${booking.customerEmail}`
        : `Completion link created for ${booking.reservationId} but EMAIL FAILED: ${emailResult.reason || "unknown"}`,
    });
  } catch { /* ignore */ }

  return {
    booking,
    completionUrl,
    emailResult,
    token,
  };
};

export const findBookingByCompletionToken = async (rawToken) => {
  if (!rawToken || String(rawToken).length < 20) return null;
  const tokenHash = hashToken(rawToken);
  const booking = await Booking.findOne({ "completion.tokenHash": tokenHash }).populate("car");
  if (!booking) return null;
  if (isTokenExpired(booking.completion?.tokenExpiresAt)) {
    const err = new Error("This completion link has expired. Please contact the agency.");
    err.code = "TOKEN_EXPIRED";
    throw err;
  }
  if (["cancelled"].includes(booking.status)) {
    const err = new Error("This reservation is no longer available.");
    err.code = "CANCELLED";
    throw err;
  }
  return booking;
};

export const refreshCompletionFlags = (booking) => {
  const c = booking.completion || {};
  c.documentsComplete = Boolean(
    c.drivingLicenseUrl && c.identityDocumentUrl && (c.identityType === "national_id" || c.identityType === "passport")
  );
  c.paymentComplete = Boolean(c.paymentCompletedAt && (c.amountPaid > 0 || booking.paymentStatus === "paid"));
  c.signatureComplete = Boolean(c.signatureUrl && c.signatureSignedAt);
  booking.completion = c;
  return c;
};

/**
 * When docs + payment + signature are done → Ready for Pickup + PDFs + final email.
 */
export const tryFinalizeBookingCompletion = async (bookingId) => {
  const booking = await Booking.findById(bookingId).populate("car");
  if (!booking) return null;

  const flags = refreshCompletionFlags(booking);
  await booking.save();

  if (!flags.documentsComplete || !flags.paymentComplete || !flags.signatureComplete) {
    return { finalized: false, booking, flags };
  }

  if (booking.status === "ready_for_pickup" && booking.completion.completedAt) {
    return { finalized: true, booking, flags, alreadyDone: true };
  }

  // Persist signature locally for PDF embedding when possible
  let signaturePath = null;
  if (booking.completion.signatureUrl?.startsWith("data:")) {
    // Should already be uploaded — skip
  } else if (booking.completion.signatureUrl?.includes("/uploads/")) {
    const rel = booking.completion.signatureUrl.split("/uploads/")[1];
    if (rel) {
      const candidate = path.join(__dirname, "..", "uploads", rel);
      if (fs.existsSync(candidate)) signaturePath = candidate;
    }
  }

  const contractPath = await generateRentalContractPdf(booking, { signaturePath });
  const invoicePath = await generateInvoicePdf(booking);

  booking.completion.contractPdfUrl = publicUploadUrl(contractPath);
  booking.completion.invoicePdfUrl = publicUploadUrl(invoicePath);
  booking.completion.completedAt = new Date();
  booking.status = "ready_for_pickup";
  booking.paymentStatus = "paid";
  await booking.save();

  await Payment.findOneAndUpdate(
    { booking: booking._id },
    {
      status: "paid",
      amount: booking.completion.amountPaid || booking.price,
      gateway: booking.completion.stripeSessionId ? "stripe" : (process.env.PAYMENT_MODE || "demo"),
      method: booking.completion.paymentType || "online",
      reference: booking.reservationId,
    },
    { upsert: true }
  );

  const vehicle = booking.car ? `${booking.car.brand} ${booking.car.model}` : "Vehicle";
  const currency = process.env.CURRENCY || "MAD";
  const detailsHtml = `
    <ul>
      <li>Pickup: ${booking.pickupLocation || "—"} · ${formatDt(booking.pickupDate)}</li>
      <li>Return: ${booking.returnLocation || "—"} · ${formatDt(booking.returnDate)}</li>
      <li>Total: ${currency}${booking.price}</li>
      <li>Paid: ${currency}${booking.completion.amountPaid} (${booking.completion.paymentType})</li>
    </ul>
  `;

  const finalEmailResult = await sendFinalConfirmationEmail({
    to: booking.customerEmail,
    customerName: booking.customerName,
    reservationId: booking.reservationId,
    vehicle,
    detailsHtml,
    contractPath,
    invoicePath,
  });

  booking.completion.lastEmail = {
    type: "final_confirmation",
    to: finalEmailResult.to || booking.customerEmail,
    success: Boolean(finalEmailResult.success),
    skipped: Boolean(finalEmailResult.skipped),
    reason: finalEmailResult.reason || "",
    messageId: finalEmailResult.messageId || "",
    at: new Date(),
  };
  await booking.save();

  if (!finalEmailResult.success) {
    console.error(
      "[email] Final confirmation NOT delivered:",
      finalEmailResult.reason,
      { to: booking.customerEmail, reservationId: booking.reservationId }
    );
  }

  try {
    await logAudit({
      owner: booking.owner,
      action: "booking.ready_for_pickup",
      entityType: "Booking",
      entityId: booking._id,
      details: finalEmailResult.success
        ? `${booking.reservationId} ready for pickup — final email accepted by SMTP`
        : `${booking.reservationId} ready for pickup — final EMAIL FAILED: ${finalEmailResult.reason || "unknown"}`,
    });
  } catch { /* ignore */ }

  return { finalized: true, booking, flags, emailResult: finalEmailResult };
};

export const markCompletionPayment = async (booking, { paymentType, amount, stripeSessionId = "" }) => {
  booking.completion = booking.completion || {};
  booking.completion.paymentType = paymentType;
  booking.completion.amountDue = amount;
  booking.completion.amountPaid = amount;
  booking.completion.paymentCompletedAt = new Date();
  booking.completion.stripeSessionId = stripeSessionId || booking.completion.stripeSessionId || "";
  booking.paymentStatus = "paid";
  refreshCompletionFlags(booking);
  await booking.save();
  return tryFinalizeBookingCompletion(booking._id);
};

export const saveSignatureAndMaybeFinalize = async (booking, signatureDataUrl) => {
  const url = await storeDataUrlImage(signatureDataUrl, `signature-${booking.reservationId}.png`);
  booking.completion = booking.completion || {};
  booking.completion.signatureUrl = url;
  booking.completion.signatureSignedAt = new Date();
  refreshCompletionFlags(booking);
  await booking.save();
  return tryFinalizeBookingCompletion(booking._id);
};

export default {
  initiateBookingCompletion,
  findBookingByCompletionToken,
  refreshCompletionFlags,
  tryFinalizeBookingCompletion,
  markCompletionPayment,
  saveSignatureAndMaybeFinalize,
};
