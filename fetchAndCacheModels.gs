const MODEL_CACHE_TTL_HOURS = 24;

function fetchAndCacheModels() {
  var providers = ['openai', 'azure_openai', 'anthropic', 'cohere', 'vertexai'];
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
  switch (provider) {
    case 'openai':
      return fetchOpenAIModels();
    case 'azure_openai':
      return fetchAzureOpenAIModels();
    case 'anthropic':
      return fetchAnthropicModels();
    case 'cohere':
      return fetchCohereModels();
    case 'vertexai':
      return fetchVertexAIModels();
    default:
      return [];
  }
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

function fetchAzureOpenAIModels() {
  var apiKey = getUserProperty('AZURE_OPENAI_API_KEY');
  var endpoint = getUserProperty('AZURE_OPENAI_ENDPOINT');
  var apiVersion = getUserProperty('AZURE_OPENAI_API_VERSION') || '2023-05-15';
  if (!apiKey || !endpoint) return [];

  // Validate and parse endpoint
  var parsedUrl;
  try {
    parsedUrl = new URL(endpoint);
    if (parsedUrl.protocol !== 'https:') {
      Logger.log('Invalid Azure OpenAI endpoint protocol: ' + parsedUrl.protocol);
      return [];
    }
  } catch (e) {
    Logger.log('Invalid Azure OpenAI endpoint URL: ' + e);
    return [];
  }

  // Build URL safely
  var base = parsedUrl.origin + parsedUrl.pathname.replace(/\/+$/, '');
  var url = `${base}/openai/models?api-version=${encodeURIComponent(apiVersion)}`;

  var res;
  try {
    res = UrlFetchApp.fetch(url, {
      headers: { 'api-key': apiKey },
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Network error fetching Azure OpenAI models: ' + err);
    return [];
  }
  if (res.getResponseCode() !== 200) {
    Logger.log('Unexpected response code fetching Azure OpenAI models: ' + res.getResponseCode());
    return [];
  }
  var data;
  try {
    data = JSON.parse(res.getContentText());
  } catch (err) {
    Logger.log('Error parsing Azure OpenAI models response: ' + err);
    return [];
  }
  var list = data.value || data.data || [];
  if (!Array.isArray(list)) return [];
  return list.map(function(m) { return m.name || m.id; });
}

function fetchAnthropicModels() {
  var apiKey = getUserProperty('ANTHROPIC_API_KEY');
  if (!apiKey) return [];
  var url = 'https://api.anthropic.com/v1/models';
  var res;
  try {
    res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + apiKey },
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Network error fetching Anthropic models: ' + err);
    return [];
  }
  if (res.getResponseCode() !== 200) {
    Logger.log('Unexpected response code fetching Anthropic models: ' + res.getResponseCode());
    return [];
  }
  var data;
  try {
    data = JSON.parse(res.getContentText());
  } catch (err) {
    Logger.log('Error parsing Anthropic models response: ' + err);
    return [];
  }
  if (!data.models || !Array.isArray(data.models)) return [];
  return data.models.map(function(m) { return m.name; });
}

function fetchCohereModels() {
  var apiKey = getUserProperty('COHERE_API_KEY');
  if (!apiKey) return [];
  var url = 'https://api.cohere.ai/models';
  var res;
  try {
    res = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + apiKey },
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('Network error fetching Cohere models: ' + err);
    return [];
  }
  if (res.getResponseCode() !== 200) {
    Logger.log('Unexpected response code fetching Cohere models: ' + res.getResponseCode());
    return [];
  }
  var data;
  try {
    data = JSON.parse(res.getContentText());
  } catch (err) {
    Logger.log('Error parsing Cohere models response: ' + err);
    return [];
  }
  if (!data.models || !Array.isArray(data.models)) return [];
  return data.models.map(function(m) { return m.name; });
}

function fetchVertexAIModels() {
  throw new Error('Vertex AI model listing is not implemented. Please configure OAuth2 or use a supported provider.');
}

function getUserProperty(key) {
  return PropertiesService.getUserProperties().getProperty(key);
}