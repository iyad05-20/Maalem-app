/**
 * test_large_submit.mjs
 * Validates that sending a large base64 data URL (e.g. 2MB generated image)
 * in the from-scratch Atelier submit request succeeds without 413 PayloadTooLargeError.
 */

const API_BASE = 'http://localhost:3001/api';

async function run() {
  console.log('🧪 Testing POST /api/atelier/submit with large base64 image payload...');

  // Create a 2MB dummy base64 string
  const dummyChunk = 'A'.repeat(1024);
  const largeBase64 = 'data:image/png;base64,' + dummyChunk.repeat(2048); // ~2MB
  console.log(`  Payload image size: ${(largeBase64.length / (1024 * 1024)).toFixed(2)} MB`);

  const sessionId = 'sess_large_test_' + Date.now();

  // 1. Send chat message to create session in scratch mode
  const msgRes = await fetch(`${API_BASE}/atelier/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message: 'je veux fabriquer un grand tajine en fer gris décoré'
    })
  });
  const msgData = await msgRes.json();
  console.log('  Chat message response:', msgData.sessionId ? 'OK' : msgData);

  // 2. Submit with the large base64 image
  const submitRes = await fetch(`${API_BASE}/atelier/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      userId: 'client-test-large',
      requestType: 'scratch',
      generatedImageUrl: largeBase64,
      targetArtisanId: 'artisan-open'
    })
  });

  const submitStatus = submitRes.status;
  const submitData = await submitRes.json();

  console.log(`  Submit Status Code: ${submitStatus}`);
  console.log('  Submit Response:', submitData);

  if (submitStatus === 200 && submitData.success) {
    console.log('✅ TEST PASSED: Successfully submitted large request without entity too large error!');
  } else {
    console.error('❌ TEST FAILED:', submitData);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
