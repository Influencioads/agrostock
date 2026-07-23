-- F08/F09: idempotency key so a replayed money operation collides instead of
-- double-applying the balance change.
ALTER TABLE "WalletTx" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "WalletTx_idempotencyKey_key" ON "WalletTx"("idempotencyKey");
CREATE INDEX "WalletTx_walletId_idx" ON "WalletTx"("walletId");
