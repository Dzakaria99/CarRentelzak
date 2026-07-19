import express from "express";
import {
  confirmDemoPayment,
  confirmStripePayment,
  createCompletionPayment,
  getCompletionBooking,
  resendCompletionLink,
  submitCompletionSignature,
  uploadCompletionDocument,
  emailDiagnostics,
  sendTestEmail,
} from "../controllers/bookingCompletionController.js";
import { protect } from "../middleware/auth.js";
import { requireOwner } from "../middleware/ownerAuth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import upload, { handleMulterError } from "../middleware/multer.js";

const completionRouter = express.Router();

const tokenLimit = rateLimit({ windowMs: 60_000, max: 40, message: "Too many requests" });

// Owner routes first so they are not captured by :token
completionRouter.post("/owner/resend-link", protect, requireOwner, resendCompletionLink);
completionRouter.get("/owner/email-diagnostics", protect, requireOwner, emailDiagnostics);
completionRouter.post("/owner/test-email", protect, requireOwner, sendTestEmail);

completionRouter.get("/:token", tokenLimit, getCompletionBooking);
completionRouter.post(
  "/:token/documents",
  tokenLimit,
  upload.single("file"),
  handleMulterError,
  uploadCompletionDocument
);
completionRouter.post("/:token/payment/create", tokenLimit, createCompletionPayment);
completionRouter.post("/:token/payment/demo-confirm", tokenLimit, confirmDemoPayment);
completionRouter.post("/:token/payment/stripe-confirm", tokenLimit, confirmStripePayment);
completionRouter.post("/:token/signature", tokenLimit, submitCompletionSignature);

export default completionRouter;
