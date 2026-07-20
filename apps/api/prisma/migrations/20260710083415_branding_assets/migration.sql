-- CreateTable
CREATE TABLE "Branding" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "logoUrl" TEXT,
    "appIconUrl" TEXT,
    "faviconUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branding_pkey" PRIMARY KEY ("id")
);
