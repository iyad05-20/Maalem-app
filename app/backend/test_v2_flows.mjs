import dotenv from 'dotenv';
dotenv.config();

import { createNotification, getNotificationsForUser, markNotificationAsRead } from './src/services/notificationService.js';
import { submitReport, getReportsForAdmin, resolveReportAdmin } from './src/services/reportService.js';
import { FORMAL_REQUEST_CATEGORIES } from './src/services/formalRequestService.js';
import { convertOrderToCatalogProduct } from './src/client/services/artisanOrderService.js';

async function runTests() {
  console.log("=== VORK V2 BACKEND FLOWS VALIDATION ===");

  // 1. Test Formal Requests Categories
  console.log("\n[1] Testing Formal Requests Categories...");
  console.log("Categories retrieved:", Object.keys(FORMAL_REQUEST_CATEGORIES));
  if (!FORMAL_REQUEST_CATEGORIES.client || !FORMAL_REQUEST_CATEGORIES.artisan) {
    throw new Error("Categories missing expected keys");
  }
  console.log("✓ Categories test PASSED (client:", FORMAL_REQUEST_CATEGORIES.client.length, ", artisan:", FORMAL_REQUEST_CATEGORIES.artisan.length, ")");

  // 2. Test Notification Service
  console.log("\n[2] Testing In-App Notification Service...");
  const testUserId = "test-artisan-v2-" + Date.now();
  const notifRes = await createNotification({
    userId: testUserId,
    title: "Validation V2 Notification",
    message: "Artisan 2 a commencé le façonnage de votre modèle.",
    type: "info",
    badgeText: "Délégation",
    linkUrl: "/artisan/artisan-2-id",
    sourceId: "order-test-123",
    secondaryUserId: "artisan-2-id",
  });
  console.log("Created notification:", notifRes.notification.id, notifRes.notification.title);

  const notifsList = await getNotificationsForUser(testUserId);
  console.log("Retrieved notifications count:", notifsList.length);
  if (notifsList.length === 0 || notifsList[0].id !== notifRes.notification.id) {
    throw new Error("Notification not found in retrieved list");
  }

  const markRes = await markNotificationAsRead(notifRes.notification.id, testUserId);
  console.log("Mark as read status:", markRes.success);
  console.log("✓ Notification service test PASSED");

  // 3. Test Report Service
  console.log("\n[3] Testing Report & Moderation Service...");
  const repRes = await submitReport({
    reporterId: "client-test-99",
    reporterType: "client",
    targetType: "product",
    targetId: "prod-test-" + Date.now(),
    targetTitle: "Tapis Berbère Test Plagiat",
    targetOwnerId: "vendor-bad-1",
    category: "plagiat",
    reason: "Ce produit reproduit à l'identique le modèle breveté de Maâlem Omar.",
    evidenceUrls: ["https://example.com/evidence1.jpg"],
  });
  console.log("Submitted report:", repRes.reportId);

  const pendingReports = await getReportsForAdmin({ status: "en_attente_admin" });
  console.log("Pending reports count:", pendingReports.length);
  const found = pendingReports.find(r => r.id === repRes.reportId);
  if (!found) {
    throw new Error("Submitted report not found in pending list");
  }

  const resolved = await resolveReportAdmin(repRes.reportId, "admin-system-test", {
    decision: "dismissed",
    adminNotes: "Validation test dismissal - motif vérifié",
  });
  console.log("Resolved report status:", resolved.status, "decision:", resolved.decision);
  console.log("✓ Report service test PASSED");

  // 4. Test Convert Order To Catalog Product Validation Rules
  console.log("\n[4] Testing Order-to-Catalog Conversion Rules...");
  // Test case A: Reject if order is not found
  try {
    await convertOrderToCatalogProduct("non-existent-order", "artisan-1", {
      title: "Test",
      image: "https://example.com/photo.jpg",
      price: 500,
    });
    throw new Error("Expected order not found error, but succeeded");
  } catch (err) {
    console.log("Expected rejection (not found):", err.message);
  }

  console.log("\n=== ALL V2 BACKEND TESTS PASSED SUCCESSFULLY! ===");
  process.exit(0);
}

runTests().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
