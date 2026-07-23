-- F36: meter wrong dispatch-OTP guesses to blunt brute force of the
-- party-visible pickup/delivery handshake codes.
ALTER TABLE "Order" ADD COLUMN "pickupOtpAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "deliveryOtpAttempts" INTEGER NOT NULL DEFAULT 0;
