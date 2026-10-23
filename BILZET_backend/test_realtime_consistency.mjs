import assert from "node:assert";
import { realtimeService } from "./src/services/realtime.service.mjs";

console.log("Running BILZET Real-Time Multi-Tenant Consistency & Synchronization Tests...\n");

class MockSseResponse {
  constructor() {
    this.messages = [];
    this.writableEnded = false;
    this.listeners = {};
  }

  write(chunk) {
    this.messages.push(chunk);
    return true;
  }

  on(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  emit(event, ...args) {
    const handlers = this.listeners[event] || [];
    for (const h of handlers) h(...args);
  }
}

// ── Test 1: Event delivery to active client ──
{
  const businessA = "store_tenant_alpha";
  const mockRes = new MockSseResponse();
  const client = { id: "client_1", res: mockRes };

  realtimeService.addClient(businessA, client);
  assert.strictEqual(realtimeService.getConnectionCount(businessA), 1, "Client should be registered");

  const eventPayload = {
    productId: "prod_101",
    name: "Basmati Rice 5kg",
    newStock: 48,
    previousStock: 50,
  };

  const broadcastResult = realtimeService.broadcastEvent(
    businessA,
    "STOCK_ADJUSTED",
    eventPayload,
    { source: "POS_BILLING" }
  );

  assert.strictEqual(broadcastResult.deliveredToClients, 1, "Should deliver to 1 client");
  assert.strictEqual(mockRes.messages.length, 1, "Should have received 1 SSE message");

  const rawMessage = mockRes.messages[0];
  assert.ok(rawMessage.includes("event: STOCK_ADJUSTED"), "Message has correct event type");
  assert.ok(rawMessage.includes("Basmati Rice 5kg"), "Message has correct payload data");
  console.log("✓ Test 1 Passed: Authoritative business event delivered cleanly to connected client.");
}

// ── Test 2: Tenant isolation (Cross-tenant security) ──
{
  const businessA = "store_tenant_alpha";
  const businessB = "store_tenant_beta";

  const clientBRes = new MockSseResponse();
  realtimeService.addClient(businessB, { id: "client_b", res: clientBRes });

  // Broadcast to Business A
  realtimeService.broadcastEvent(businessA, "PURCHASE_CREATED", {
    invoiceNumber: "PUR-9921",
    amount: 15400,
  });

  // Business B client must NOT have received any messages
  assert.strictEqual(clientBRes.messages.length, 0, "Business B must NOT receive Business A events");
  console.log("✓ Test 2 Passed: Multi-tenant boundary preserved (Business B received 0 cross-tenant events).");
}

// ── Test 3: Event Replay & Buffer Catch-up ──
{
  const businessC = "store_tenant_gamma";
  const res1 = realtimeService.broadcastEvent(businessC, "PRODUCT_CREATED", { id: "p1", name: "Item 1" });
  const res2 = realtimeService.broadcastEvent(businessC, "PRODUCT_UPDATED", { id: "p1", price: 250 });
  const res3 = realtimeService.broadcastEvent(businessC, "CUSTOMER_UPDATED", { id: "c1", balance: 1200 });

  // Client reconnects with lastEventId = res1.eventId
  const missedEvents = realtimeService.getMissedEvents(businessC, res1.eventId);
  assert.strictEqual(missedEvents.length, 2, "Should replay exactly 2 missed events");
  assert.strictEqual(missedEvents[0].eventId, res2.eventId);
  assert.strictEqual(missedEvents[1].eventId, res3.eventId);
  console.log("✓ Test 3 Passed: Replay buffer accurately catches up reconnected clients.");
}

// ── Test 4: Idempotency Protection ──
{
  const businessD = "store_tenant_delta";
  const mockRes = new MockSseResponse();
  realtimeService.addClient(businessD, { id: "client_d", res: mockRes });

  const customEventId = "evt_fixed_idempotent_key_12345";
  const firstBroadcast = realtimeService.broadcastEvent(
    businessD,
    "PAYMENT_RECORDED",
    { amount: 5000 },
    { eventId: customEventId }
  );
  assert.notStrictEqual(firstBroadcast, null, "First event broadcast must succeed");

  // Duplicate event with same ID
  const duplicateBroadcast = realtimeService.broadcastEvent(
    businessD,
    "PAYMENT_RECORDED",
    { amount: 5000 },
    { eventId: customEventId }
  );
  assert.strictEqual(duplicateBroadcast, null, "Duplicate event with same eventId must be skipped");
  assert.strictEqual(mockRes.messages.length, 1, "Client should only have received 1 message, duplicate skipped");
  console.log("✓ Test 4 Passed: Duplicate event IDs rejected by idempotency cache.");
}

// ── Test 5: Clean Client Removal on Disconnect ──
{
  const businessE = "store_tenant_epsilon";
  const mockRes = new MockSseResponse();
  const client = { id: "client_e", res: mockRes };

  realtimeService.addClient(businessE, client);
  assert.strictEqual(realtimeService.getConnectionCount(businessE), 1);

  // Client closes connection
  mockRes.emit("close");
  assert.strictEqual(realtimeService.getConnectionCount(businessE), 0, "Connection count should be 0 after close");
  console.log("✓ Test 5 Passed: Disconnected clients cleaned up without memory leaks.");
}

console.log("\n========================================================");
console.log("ALL REAL-TIME CONSISTENCY & INTEGRITY TESTS PASSED! 🎉");
console.log("========================================================\n");
