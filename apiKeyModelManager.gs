const PROP_MODEL = 'AI_MODEL';
const SCRIPT_PROP_SECRET_NAME = 'SECRET_NAME'; // e.g. "projects/your-project-id/secrets/dataWhispererApiKey"

// Fallback modelservice implementation for model list retrieval
if (typeof modelservice === 'undefined') {
  var modelservice = {
    getAvailableModels: function() {
      if (typeof fetchAndCacheModels !== 'undefined' &&
          typeof fetchAndCacheModels.getCachedProviderModels === 'function') {
        var models = [];
        ['openai', 'azure-openai', 'anthropic', 'cohere', 'vertex-ai'].forEach(function(provider) {
          var m = fetchAndCacheModels.getCachedProviderModels(provider);
          if (Array.isArray(m)) {
            models = models.concat(m);
          }
        });
        return models;
      }
      return [];
    }
  };
}

/**
 * Retrieves the stored API key and model for the current user.
 * The API key is fetched from Google Cloud Secret Manager, and the model from UserProperties.
 * @return {{apiKey: string, model: string}}
 */
function getApiConfig() {
  const userProps = PropertiesService.getUserProperties();
  const model = userProps.getProperty(PROP_MODEL) || '';
  let apiKey = '';
  const secretName = getSecretName_();
  if (secretName) {
    apiKey = retrieveApiKeySecret_(secretName);
  }
  return {
    apiKey: apiKey,
    model: model
  };
}

/**
 * Stores the API key and model for the current user.
 * The API key is stored in Google Cloud Secret Manager, and the model in UserProperties.
 * @param {string} apiKey The API key to store.
 * @param {string} model The model identifier to store.
 * @throws {Error} If arguments are invalid, apiKey is malformed, or model is unsupported.
 */
function setApiConfig(apiKey, model) {
  if (typeof apiKey !== 'string' || typeof model !== 'string') {
    throw new Error('Invalid arguments: apiKey and model must be strings.');
  }
  apiKey = apiKey.trim();
  model = model.trim();
  if (!apiKey) {
    throw new Error('API key must not be empty.');
  }
  validateApiKey_(apiKey);
  const availableModels = getAvailableModels_();
  if (!availableModels || availableModels.indexOf(model) < 0) {
    throw new Error('Unsupported model identifier: ' + model);
  }
  // Store model in UserProperties
  const userProps = PropertiesService.getUserProperties();
  userProps.setProperty(PROP_MODEL, model);
  // Store API key in Secret Manager
  const secretName = getSecretName_();
  if (!secretName) {
    throw new Error('Secret Manager secret name not configured. Set script property "' + SCRIPT_PROP_SECRET_NAME + '".');
  }
  storeApiKeySecret_(secretName, apiKey);
}

/**
 * Validates the format of the API key.
 * @param {string} apiKey
 * @throws {Error} If the key does not match expected pattern.
 * @private
 */
function validateApiKey_(apiKey) {
  // Example pattern: OpenAI keys start with "sk-"
  const pattern = /^sk-[A-Za-z0-9]{16,}$/;
  if (!pattern.test(apiKey)) {
    throw new Error('Invalid API key format.');
  }
}

/**
 * Retrieves the full secret resource name from script properties.
 * @return {string} The secret resource name, e.g. "projects/.../secrets/..."
 * @private
 */
function getSecretName_() {
  return PropertiesService.getScriptProperties().getProperty(SCRIPT_PROP_SECRET_NAME) || '';
}

/**
 * Stores the API key as a new version in Secret Manager.
 * @param {string} secretName The full secret resource name.
 * @param {string} apiKey The API key to store.
 * @private
 */
function storeApiKeySecret_(secretName, apiKey) {
  const url = 'https://secretmanager.googleapis.com/v1/' + encodeURIComponent(secretName) + '/versions';
  const payload = {
    payload: {
      data: Utilities.base64Encode(apiKey)
    }
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('Failed to store API key in Secret Manager: ' + code + ' ' + response.getContentText());
  }
}

/**
 * Retrieves the latest API key from Secret Manager.
 * @param {string} secretName The full secret resource name.
 * @return {string} The decoded API key, or empty string if not found.
 * @private
 */
function retrieveApiKeySecret_(secretName) {
  const version = secretName + '/versions/latest';
  const url = 'https://secretmanager.googleapis.com/v1/' + encodeURIComponent(version) + ':access';
  const options = {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken()
    },
    muteHttpExceptions: true
  };
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  if (code === 404) {
    return '';
  }
  if (code < 200 || code >= 300) {
    throw new Error('Failed to retrieve API key from Secret Manager: ' + code + ' ' + response.getContentText());
  }
  const obj = JSON.parse(response.getContentText());
  const b64 = obj.payload && obj.payload.data;
  if (!b64) {
    return '';
  }
  const bytes = Utilities.base64Decode(b64);
  return Utilities.newBlob(bytes).getDataAsString();
}

/**
 * Retrieves the list of supported model identifiers.
 * Delegates to modelservice.getAvailableModels().
 * @return {string[]} Array of model identifiers.
 * @private
 */
function getAvailableModels_() {
  if (typeof modelservice !== 'undefined' && typeof modelservice.getAvailableModels === 'function') {
    return modelservice.getAvailableModels();
  }
  return [];
}

// Alias for backward compatibility
function getApiKeyModelConfig() {
  return getApiConfig();
}
function setApiKeyModelConfig(apiKey, model) {
  return setApiConfig(apiKey, model);
}