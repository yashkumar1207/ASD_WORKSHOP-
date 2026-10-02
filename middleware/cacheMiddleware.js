const cache = new Map();
let cacheTtlMs = 60 * 1000;

function normalizeCacheKey(url) {
  return url.replace(/\/$/, '') || '/';
}

function cacheMiddleware(req, res, next) {
  if (req.method !== 'GET') {
    return next();
  }

  const key = normalizeCacheKey(req.originalUrl || req.url);
  const cachedEntry = cache.get(key);
  const now = Date.now();

  if (cachedEntry) {
    const age = now - cachedEntry.createdAt;

    if (age < cacheTtlMs) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Created-At', new Date(cachedEntry.createdAt).toISOString());
      return res.json(cachedEntry.data);
    }

    cache.delete(key);
  }

  res.setHeader('X-Cache', 'MISS');

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      cache.set(key, {
        data: body,
        createdAt: Date.now(),
      });
    }
    return originalJson(body);
  };

  next();
}

function invalidateCache() {
  cache.clear();
}

function invalidateCacheMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      invalidateCache();
    }
    return originalJson(body);
  };

  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      invalidateCache();
    }
  });

  next();
}

function setCacheTtl(milliseconds) {
  cacheTtlMs = milliseconds;
}

function getCacheTtl() {
  return cacheTtlMs;
}

function getCacheStore() {
  return cache;
}

module.exports = {
  cacheMiddleware,
  invalidateCacheMiddleware,
  invalidateCache,
  clearCache: invalidateCache,
  setCacheTtl,
  getCacheTtl,
  getCacheStore,
};
