-- Order lifecycle (timeline, dispatch snapshot, two-OTP handshake, trip bridge),
-- buyer RFQ / reverse auction, and the invoicing domain.
-- Every change is additive: new columns are nullable or defaulted, so the
-- previous API build keeps running against this schema.

-- ── Enums ────────────────────────────────────────────────────────
CREATE TYPE "OrderEventType" AS ENUM ('enquiry_raised', 'seller_quoted', 'order_placed', 'paid', 'packed', 'dispatched', 'pickup_verified', 'delivery_verified', 'cancelled', 'disputed', 'note');
CREATE TYPE "DispatchMode" AS ENUM ('platform', 'external');
CREATE TYPE "RfqMode" AS ENUM ('quote', 'auction');
CREATE TYPE "RfqStatus" AS ENUM ('open', 'awarded', 'closed', 'cancelled');
CREATE TYPE "RfqQuoteStatus" AS ENUM ('submitted', 'awarded', 'rejected', 'withdrawn');
CREATE TYPE "InvoiceKind" AS ENUM ('order', 'trip', 'loaderjob', 'assignment');
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'issued', 'paid', 'void');

-- ── Order: numeric money, dispatch snapshot, OTPs, trip bridge ───
ALTER TABLE "Order"
  ADD COLUMN "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "unitPriceCents"     INTEGER,
  ADD COLUMN "amountCents"        INTEGER,
  ADD COLUMN "qtyValue"           DOUBLE PRECISION,
  ADD COLUMN "qtyUnit"            TEXT DEFAULT 'MT',
  ADD COLUMN "currency"           TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN "note"               TEXT,
  ADD COLUMN "dispatchMode"       "DispatchMode",
  ADD COLUMN "transporterName"    TEXT,
  ADD COLUMN "transporterPhone"   TEXT,
  ADD COLUMN "vehiclePlate"       TEXT,
  ADD COLUMN "driverName"         TEXT,
  ADD COLUMN "dispatchedAt"       TIMESTAMP(3),
  ADD COLUMN "pickupOtp"          TEXT,
  ADD COLUMN "pickupVerifiedAt"   TIMESTAMP(3),
  ADD COLUMN "deliveryOtp"        TEXT,
  ADD COLUMN "deliveryVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "tripId"             TEXT;

CREATE UNIQUE INDEX "Order_tripId_key" ON "Order"("tripId");
CREATE INDEX "Order_buyerId_status_idx" ON "Order"("buyerId", "status");
CREATE INDEX "Order_sellerId_status_idx" ON "Order"("sellerId", "status");
ALTER TABLE "Order" ADD CONSTRAINT "Order_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Profile: uploaded avatar photo ───────────────────────────────
ALTER TABLE "Profile" ADD COLUMN "avatarUrl" TEXT;

-- ── OrderEvent: append-only lifecycle timeline ───────────────────
CREATE TABLE "OrderEvent" (
  "id"         TEXT NOT NULL,
  "type"       "OrderEventType" NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus"   "OrderStatus",
  "note"       TEXT,
  "meta"       JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "orderId"    TEXT NOT NULL,
  "actorId"    TEXT,
  CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Rfq / RfqQuote ───────────────────────────────────────────────
CREATE TABLE "Rfq" (
  "id"                 TEXT NOT NULL,
  "reference"          TEXT NOT NULL,
  "mode"               "RfqMode" NOT NULL DEFAULT 'quote',
  "status"             "RfqStatus" NOT NULL DEFAULT 'open',
  "title"              TEXT NOT NULL,
  "productName"        TEXT NOT NULL,
  "qtyValue"           DOUBLE PRECISION NOT NULL,
  "qtyUnit"            TEXT NOT NULL DEFAULT 'MT',
  "targetPriceCents"   INTEGER,
  "currency"           TEXT NOT NULL DEFAULT 'USD',
  "deliveryPlace"      TEXT,
  "destinationCountry" TEXT,
  "deadline"           TIMESTAMP(3),
  "auctionEndsAt"      TIMESTAMP(3),
  "notes"              TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "categoryId"         TEXT,
  "productId"          TEXT,
  "buyerId"            TEXT NOT NULL,
  "awardedQuoteId"     TEXT,
  "orderId"            TEXT,
  CONSTRAINT "Rfq_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Rfq_reference_key" ON "Rfq"("reference");
CREATE UNIQUE INDEX "Rfq_awardedQuoteId_key" ON "Rfq"("awardedQuoteId");
CREATE UNIQUE INDEX "Rfq_orderId_key" ON "Rfq"("orderId");
CREATE INDEX "Rfq_status_mode_idx" ON "Rfq"("status", "mode");
CREATE INDEX "Rfq_buyerId_idx" ON "Rfq"("buyerId");
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RfqQuote" (
  "id"         TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "qtyValue"   DOUBLE PRECISION NOT NULL,
  "etaDays"    INTEGER,
  "message"    TEXT,
  "status"     "RfqQuoteStatus" NOT NULL DEFAULT 'submitted',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rfqId"      TEXT NOT NULL,
  "sellerId"   TEXT NOT NULL,
  CONSTRAINT "RfqQuote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RfqQuote_rfqId_priceCents_idx" ON "RfqQuote"("rfqId", "priceCents");
CREATE INDEX "RfqQuote_sellerId_idx" ON "RfqQuote"("sellerId");
ALTER TABLE "RfqQuote" ADD CONSTRAINT "RfqQuote_rfqId_fkey"
  FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RfqQuote" ADD CONSTRAINT "RfqQuote_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Invoicing ────────────────────────────────────────────────────
CREATE TABLE "Invoice" (
  "id"              TEXT NOT NULL,
  "number"          TEXT NOT NULL,
  "kind"            "InvoiceKind" NOT NULL,
  "status"          "InvoiceStatus" NOT NULL DEFAULT 'issued',
  "currency"        TEXT NOT NULL DEFAULT 'USD',
  "subtotalCents"   INTEGER NOT NULL,
  "taxCents"        INTEGER NOT NULL DEFAULT 0,
  "totalCents"      INTEGER NOT NULL,
  "notes"           TEXT,
  "issuedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt"           TIMESTAMP(3),
  "paidAt"          TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "issuerId"        TEXT NOT NULL,
  "recipientId"     TEXT NOT NULL,
  "orderId"         TEXT,
  "tripId"          TEXT,
  "loaderJobId"     TEXT,
  "jobAssignmentId" TEXT,
  CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");
CREATE INDEX "Invoice_issuerId_idx" ON "Invoice"("issuerId");
CREATE INDEX "Invoice_recipientId_idx" ON "Invoice"("recipientId");
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_issuerId_fkey"
  FOREIGN KEY ("issuerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_loaderJobId_fkey"
  FOREIGN KEY ("loaderJobId") REFERENCES "LoaderJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobAssignmentId_fkey"
  FOREIGN KEY ("jobAssignmentId") REFERENCES "JobAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InvoiceLine" (
  "id"             TEXT NOT NULL,
  "description"    TEXT NOT NULL,
  "qty"            DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unit"           TEXT,
  "unitPriceCents" INTEGER NOT NULL,
  "amountCents"    INTEGER NOT NULL,
  "sort"           INTEGER NOT NULL DEFAULT 0,
  "invoiceId"      TEXT NOT NULL,
  CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Monotonic sequence allocator for invoice numbers.
CREATE TABLE "Counter" (
  "key"   TEXT NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Counter_pkey" PRIMARY KEY ("key")
);
