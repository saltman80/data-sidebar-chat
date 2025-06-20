const MODEL_CACHE_TTL_HOURS = 24;

function fetchAndCacheModels() {
  var providers = ['openai', 'openrouter'];
  var results = {};
  providers.forEach(function(provider) {
    try {
      results[provider] = getCachedProviderModels(provider);
    } catch (err) {
      Logger.log('Error fetching models for ' + provider + ': ' + err);
      results[provider] = [];
    }
  });
  return results;
}

function getCachedProviderModels(provider) {
  var cache = CacheService.getUserCache();
  var cacheKey = 'models_' + provider;
  var ttlSeconds = MODEL_CACHE_TTL_HOURS * 3600;
  var cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      // corrupted cache, fall through to re-fetch
    }
  }
  var models;
  try {
    models = fetchProviderModels(provider) || [];
  } catch (e) {
    Logger.log('Error in fetchProviderModels for ' + provider + ': ' + e);
    models = [];
  }
  try {
    cache.put(cacheKey, JSON.stringify(models), ttlSeconds);
  } catch (e) {
    Logger.log('Error caching models for ' + provider + ': ' + e);
  }
  return models;
}

function fetchProviderModels(provider) {
  try {
    return fetchModels(provider);
  } catch (e) {
    Logger.log('Error fetching models from ' + provider + ': ' + e);
    return [];
  }
}

// Expose helper for other scripts expecting a namespaced function
fetchAndCacheModels.getCachedProviderModels = getCachedProviderModels;


