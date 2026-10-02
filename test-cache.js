const app = require('./server');
const { setCacheTtl, getCacheTtl } = require('./middleware/cacheMiddleware');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');
const originalDbContent = fs.readFileSync(dbPath, 'utf-8');

async function runCacheAndApiTests() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`\n========================================`);
  console.log(`Starting Cache & Architecture Test Suite`);
  console.log(`Running on port: ${port}`);
  console.log(`========================================\n`);

  try {
    console.log('TEST 1: GET /products (Initial - Expect Cache MISS)');
    const firstRequestStartedAt = Date.now();
    const firstProductsResponse = await fetch(`${baseUrl}/products`);
    const firstRequestDurationMs = Date.now() - firstRequestStartedAt;
    const firstCacheStatus = firstProductsResponse.headers.get('x-cache');
    const firstProductList = await firstProductsResponse.json();
    console.log(`Status: ${firstProductsResponse.status}, X-Cache: ${firstCacheStatus}, Time: ${firstRequestDurationMs}ms, Items: ${firstProductList.length}`);
    if (firstCacheStatus !== 'MISS') throw new Error(`Expected X-Cache: MISS, got ${firstCacheStatus}`);
    if (firstRequestDurationMs < 1000) throw new Error(`Expected simulated DB latency >= 1000ms, got ${firstRequestDurationMs}ms`);
    console.log('✓ PASS: Cache MISS on initial request with DB fetch\n');

    console.log('TEST 2: GET /products (Second time - Expect Cache HIT)');
    const secondRequestStartedAt = Date.now();
    const cachedProductsResponse = await fetch(`${baseUrl}/products`);
    const cachedRequestDurationMs = Date.now() - secondRequestStartedAt;
    const cachedResponseStatus = cachedProductsResponse.headers.get('x-cache');
    const cacheCreatedAt = cachedProductsResponse.headers.get('x-cache-created-at');
    await cachedProductsResponse.json();
    console.log(`Status: ${cachedProductsResponse.status}, X-Cache: ${cachedResponseStatus}, Time: ${cachedRequestDurationMs}ms, CreatedAt: ${cacheCreatedAt}`);
    if (cachedResponseStatus !== 'HIT') throw new Error(`Expected X-Cache: HIT, got ${cachedResponseStatus}`);
    if (!cacheCreatedAt) throw new Error('Expected X-Cache-Created-At header to be present');
    if (cachedRequestDurationMs > 100) throw new Error(`Expected sub-100ms response for cache HIT, got ${cachedRequestDurationMs}ms`);
    console.log('✓ PASS: Instant Cache HIT with headers and stored createdAt\n');

    console.log('TEST 3: GET /products/1 (Cache MISS then HIT)');
    const resId1 = await fetch(`${baseUrl}/products/1`);
    const cacheHeaderId1 = resId1.headers.get('x-cache');
    const dataId1 = await resId1.json();
    console.log(`1st GET /products/1 -> Status: ${resId1.status}, X-Cache: ${cacheHeaderId1}, Product: ${dataId1.name}`);
    if (cacheHeaderId1 !== 'MISS') throw new Error(`Expected X-Cache: MISS, got ${cacheHeaderId1}`);

    const resId2 = await fetch(`${baseUrl}/products/1`);
    const cacheHeaderId2 = resId2.headers.get('x-cache');
    const dataId2 = await resId2.json();
    console.log(`2nd GET /products/1 -> Status: ${resId2.status}, X-Cache: ${cacheHeaderId2}, Product: ${dataId2.name}`);
    if (cacheHeaderId2 !== 'HIT') throw new Error(`Expected X-Cache: HIT, got ${cacheHeaderId2}`);
    console.log('✓ PASS: GET /products/:id correctly cached\n');

    console.log('TEST 4: POST /products (Adding a product should invalidate cache)');
    const postRes = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Webcam', price: 59.99 }),
    });
    const newProduct = await postRes.json();
    console.log(`POST Status: ${postRes.status}, Created product ID: ${newProduct.id}`);
    if (postRes.status !== 201) throw new Error(`Expected 201, got ${postRes.status}`);

    const resAfterPost = await fetch(`${baseUrl}/products`);
    const cacheHeaderAfterPost = resAfterPost.headers.get('x-cache');
    const dataAfterPost = await resAfterPost.json();
    console.log(`GET /products after POST -> X-Cache: ${cacheHeaderAfterPost}, Items: ${dataAfterPost.length}`);
    if (cacheHeaderAfterPost !== 'MISS') throw new Error(`Expected X-Cache: MISS after POST, got ${cacheHeaderAfterPost}`);
    const foundNew = dataAfterPost.find((p) => p.name === 'Webcam');
    if (!foundNew) throw new Error('New product not found in fresh GET');
    console.log('✓ PASS: POST successfully invalidated stale cache\n');

    console.log('TEST 5: PUT /products/1 (Updating product should invalidate cache)');
    await fetch(`${baseUrl}/products/1`);
    const checkCached = await fetch(`${baseUrl}/products/1`);
    if (checkCached.headers.get('x-cache') !== 'HIT') throw new Error('Expected /products/1 to be HIT');

    const putRes = await fetch(`${baseUrl}/products/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Mechanical Keyboard', price: 99.99 }),
    });
    console.log(`PUT Status: ${putRes.status}`);
    if (putRes.status !== 200) throw new Error(`Expected 200, got ${putRes.status}`);

    const resAfterPut = await fetch(`${baseUrl}/products/1`);
    const cacheAfterPut = resAfterPut.headers.get('x-cache');
    const dataAfterPut = await resAfterPut.json();
    console.log(`GET /products/1 after PUT -> X-Cache: ${cacheAfterPut}, Name: ${dataAfterPut.name}, Price: ${dataAfterPut.price}`);
    if (cacheAfterPut !== 'MISS') throw new Error(`Expected X-Cache: MISS after PUT, got ${cacheAfterPut}`);
    if (dataAfterPut.name !== 'Mechanical Keyboard') throw new Error('Expected updated product name');
    console.log('✓ PASS: PUT successfully invalidated cache\n');

    console.log('TEST 6: PATCH /products/1 (Patching product price should invalidate cache)');
    await fetch(`${baseUrl}/products/1`);
    const patchRes = await fetch(`${baseUrl}/products/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 109.99 }),
    });
    console.log(`PATCH Status: ${patchRes.status}`);
    if (patchRes.status !== 200) throw new Error(`Expected 200, got ${patchRes.status}`);

    const resAfterPatch = await fetch(`${baseUrl}/products/1`);
    const cacheAfterPatch = resAfterPatch.headers.get('x-cache');
    const dataAfterPatch = await resAfterPatch.json();
    console.log(`GET /products/1 after PATCH -> X-Cache: ${cacheAfterPatch}, Price: ${dataAfterPatch.price}`);
    if (cacheAfterPatch !== 'MISS') throw new Error(`Expected X-Cache: MISS after PATCH, got ${cacheAfterPatch}`);
    if (dataAfterPatch.price !== 109.99) throw new Error('Expected patched price');
    console.log('✓ PASS: PATCH successfully invalidated cache\n');

    console.log('TEST 7: DELETE /products/:id (Deleting product should invalidate cache)');
    await fetch(`${baseUrl}/products`);
    const delRes = await fetch(`${baseUrl}/products/${newProduct.id}`, { method: 'DELETE' });
    console.log(`DELETE Status: ${delRes.status}`);
    if (delRes.status !== 200) throw new Error(`Expected 200, got ${delRes.status}`);

    const resAfterDel = await fetch(`${baseUrl}/products`);
    const cacheAfterDel = resAfterDel.headers.get('x-cache');
    const dataAfterDel = await resAfterDel.json();
    console.log(`GET /products after DELETE -> X-Cache: ${cacheAfterDel}, Items: ${dataAfterDel.length}`);
    if (cacheAfterDel !== 'MISS') throw new Error(`Expected X-Cache: MISS after DELETE, got ${cacheAfterDel}`);
    if (dataAfterDel.find((p) => p.id === newProduct.id)) throw new Error('Deleted item still present!');
    console.log('✓ PASS: DELETE successfully invalidated cache\n');

    console.log('TEST 8: Failed mutation (404/400) should NOT invalidate cache');
    await fetch(`${baseUrl}/products`);
    const hitCheck = await fetch(`${baseUrl}/products`);
    if (hitCheck.headers.get('x-cache') !== 'HIT') throw new Error('Expected /products to be HIT before test');

    const failPut = await fetch(`${baseUrl}/products/99999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'None', price: 0 }),
    });
    console.log(`Failed PUT Status: ${failPut.status}`);
    if (failPut.status !== 404) throw new Error('Expected 404');

    const checkStillHit = await fetch(`${baseUrl}/products`);
    const stillHitHeader = checkStillHit.headers.get('x-cache');
    console.log(`GET /products after failed PUT -> X-Cache: ${stillHitHeader}`);
    if (stillHitHeader !== 'HIT') throw new Error(`Expected cache to remain HIT after failed modification, got ${stillHitHeader}`);
    console.log('✓ PASS: Cache preserved on failed mutation\n');

    console.log('TEST 9: TTL (Time to Live) Expiration check');
    console.log('Current default TTL:', getCacheTtl(), 'ms (1 minute)');
    setCacheTtl(1000);
    console.log('Temporarily set TTL to 1000ms for fast test verification');

    await fetch(`${baseUrl}/products`);
    const hitBeforeExpiry = await fetch(`${baseUrl}/products`);
    if (hitBeforeExpiry.headers.get('x-cache') !== 'HIT') throw new Error('Expected HIT before expiry');
    console.log('Cache is populated and returns HIT');

    console.log('Waiting 1100ms for cache entry to exceed TTL...');
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const resAfterExpiry = await fetch(`${baseUrl}/products`);
    const cacheHeaderAfterExpiry = resAfterExpiry.headers.get('x-cache');
    console.log(`GET /products after TTL expiry -> X-Cache: ${cacheHeaderAfterExpiry}`);
    if (cacheHeaderAfterExpiry !== 'MISS') {
      throw new Error(`Expected X-Cache: MISS after TTL expiry, got ${cacheHeaderAfterExpiry}`);
    }

    const resRefreshed = await fetch(`${baseUrl}/products`);
    const cacheHeaderRefreshed = resRefreshed.headers.get('x-cache');
    console.log(`GET /products refreshed -> X-Cache: ${cacheHeaderRefreshed}`);
    if (cacheHeaderRefreshed !== 'HIT') {
      throw new Error(`Expected X-Cache: HIT after refreshing cache, got ${cacheHeaderRefreshed}`);
    }

    setCacheTtl(60 * 1000);
    console.log('Reset TTL back to default:', getCacheTtl(), 'ms (1 minute)');
    console.log('✓ PASS: TTL expiration and automatic re-caching working as specified\n');

    console.log('========================================');
    console.log('ALL TESTS PASSED SUCCESSFULLY! (9/9)');
    console.log('========================================\n');
  } finally {
    fs.writeFileSync(dbPath, originalDbContent, 'utf-8');
    console.log('Restored original db.json');
    server.close();
  }
}

runCacheAndApiTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  try {
    fs.writeFileSync(dbPath, originalDbContent, 'utf-8');
  } catch (_) {}
  process.exit(1);
});
