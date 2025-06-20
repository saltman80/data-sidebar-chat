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
  if (provider === 'openai') {
    return fetchOpenAIModels();
  }
  if (provider === 'openrouter') {
    return fetchOpenRouterModels();
  }
  return [];
}

function fetchOpenAIModels() {
  var apiKey = getUserProperty('OPENAI_API_KEY');
  if (!apiKey) return [];
  var url = 'https://api.openai.com/v1/models';
  var res;
  try {
    res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + apiKey },
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Network error fetching OpenAI models: ' + err);
    return [];
  }
  if (res.getResponseCode() !== 200) {
    Logger.log('Unexpected response code fetching OpenAI models: ' + res.getResponseCode());
    return [];
  }
  var data;
  try {
    data = JSON.parse(res.getContentText());
  } catch (err) {
    Logger.log('Error parsing OpenAI models response: ' + err);
    return [];
  }
  if (!data.data || !Array.isArray(data.data)) return [];
  return data.data.map(function(m) { return m.id; });
}

function fetchOpenRouterModels() {
  var apiKey = getUserProperty('OPENROUTER_API_KEY');
  if (!apiKey) return [];
  var url = 'https://openrouter.ai/api/v1/models';
  var res;
  try {
    res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + apiKey },
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Network error fetching OpenRouter models: ' + err);
    return [];
  }
  if (res.getResponseCode() !== 200) {
    Logger.log('Unexpected response code fetching OpenRouter models: ' + res.getResponseCode());
    return [];
  }
  var data;
  try {
    data = JSON.parse(res.getContentText());
  } catch (err) {
    Logger.log('Error parsing OpenRouter models response: ' + err);
    return [];
  }
  if (!data.data || !Array.isArray(data.data)) return [];
  return data.data.map(function(m) {
    return m.id || m.name;
  });
}


function getUserProperty(key) {
  return PropertiesService.getUserProperties().getProperty(key);
}
