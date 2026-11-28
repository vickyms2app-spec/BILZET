-- CreateEnum
CREATE TYPE "SubscriptionOrderStatus" AS ENUM ('CREATED', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "subscription_orders" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "business_id" TEXT,
    "user_id" TEXT NOT NULL,
    "plan_tier" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "SubscriptionOrderStatus" NOT NULL DEFAULT 'CREATED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_orders_order_id_key" ON "subscription_orders"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_orders_payment_id_key" ON "subscription_orders"("payment_id");

-- CreateIndex
CREATE INDEX "subscription_orders_business_id_idx" ON "subscription_orders"("business_id");

-- CreateIndex
CREATE INDEX "subscription_orders_user_id_idx" ON "subscription_orders"("user_id");

-- CreateIndex
CREATE INDEX "subscription_orders_status_idx" ON "subscription_orders"("status");

-- CreateIndex
CREATE INDEX "subscription_orders_created_at_idx" ON "subscription_orders"("created_at");

-- AddForeignKey
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

