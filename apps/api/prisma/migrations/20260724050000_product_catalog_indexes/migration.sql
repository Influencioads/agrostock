-- F21: index the catalog/search hot paths on Product (FKs are not auto-indexed
-- in Postgres, so these filters were sequential scans).
CREATE INDEX "Product_status_categoryId_idx" ON "Product"("status", "categoryId");
CREATE INDEX "Product_subcategoryId_idx" ON "Product"("subcategoryId");
CREATE INDEX "Product_sellerId_idx" ON "Product"("sellerId");
CREATE INDEX "Product_marketId_idx" ON "Product"("marketId");
CREATE INDEX "Product_isAuction_auctionEndsAt_idx" ON "Product"("isAuction", "auctionEndsAt");
