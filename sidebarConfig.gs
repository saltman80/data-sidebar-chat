function getSidebarConfig() {
  var cfg = {};
  try {
    if (typeof getApiKeyModelConfig === 'function') {
      cfg = getApiKeyModelConfig() || {};
    } else if (typeof getApiConfig === 'function') {
      cfg = getApiConfig() || {};
    }
  } catch (e) {
    Logger.log('Error retrieving API config: ' + e);
    cfg = {};
  }
  var models = [];
  try {
    if (typeof modelservice !== 'undefined' &&
        typeof modelservice.getAvailableModels === 'function') {
      models = modelservice.getAvailableModels() || [];
    }
  } catch (e) {
    Logger.log('Error retrieving model list: ' + e);
    models = [];
  }
  if (!Array.isArray(models)) models = [];
  return {
    models: models,
    defaultModel: cfg.model || (models.length > 0 ? models[0] : ''),
    theme: 'light'
  };
}
