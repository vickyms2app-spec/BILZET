-- CreateEnum
CREATE TYPE "WhatsAppConnectionStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTING', 'WAITING_FOR_QR', 'CONNECTED', 'RECONNECTING', 'DISCONNECTED', 'AUTH_FAILED', 'CONNECTION_ERROR');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "connection_status" "WhatsAppConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "phone_number" TEXT,
    "last_connected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'INVOICE_PDF',
    "message_status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "external_message_id" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_business_id_key" ON "whatsapp_sessions"("business_id");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_connection_status_idx" ON "whatsapp_sessions"("connection_status");

-- CreateIndex
CREATE INDEX "whatsapp_messages_business_id_idx" ON "whatsapp_messages"("business_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_invoice_id_idx" ON "whatsapp_messages"("invoice_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_message_status_idx" ON "whatsapp_messages"("message_status");

-- CreateIndex
CREATE INDEX "whatsapp_messages_created_at_idx" ON "whatsapp_messages"("created_at");

-- AddForeignKey
ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

