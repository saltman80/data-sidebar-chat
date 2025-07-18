function callAiProvider(prompt, dataJson) {
  const cfg = getProviderConfig();
  // Validate required config values
  if (cfg.modelProvider !== 'openai' && cfg.modelProvider !== 'openrouter') {
    throw new Error('Unsupported AI provider: ' + cfg.modelProvider);
  }
  if (cfg.modelProvider === 'openai' && !cfg.openaiApiKey) {
    throw new Error('Missing OpenAI API key.');
  }
  if (cfg.modelProvider === 'openrouter' && !cfg.openrouterApiKey) {
    throw new Error('Missing OpenRouter API key.');
  }
  const payload = buildPayload(cfg.modelProvider, prompt, dataJson, cfg);
  let url;
  let options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  if (cfg.modelProvider === 'openai') {
    url = cfg.openaiApiUrl;
    options.headers = { Authorization: 'Bearer ' + cfg.openaiApiKey };
  } else if (cfg.modelProvider === 'openrouter') {
    url = cfg.openrouterApiUrl;
    options.headers = {
      Authorization: 'Bearer ' + cfg.openrouterApiKey,
      'HTTP-Referer': 'https://www.aahsheet.com',
      'X-Title': 'AAH Sheet'
    };
  }
  const response = fetchWithRetry(url, options, cfg.modelProvider);
  let json;
  try {
    json = JSON.parse(response.getContentText());
  } catch (e) {
    throw new Error('Invalid JSON response from ' + cfg.modelProvider + ': ' + e.message);
  }
  return parseAiResponse(cfg.modelProvider, json);
}

function fetchWithRetry(url, options, providerName) {
  const maxRetries = 3;
  const baseDelayMs = 1000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let response;
    try {
      response = UrlFetchApp.fetch(url, options);
    } catch (e) {
      if (attempt === maxRetries) {
        throw new Error(`Network error when calling ${providerName}: ${e.message}`);
      } else {
        const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
        Utilities.sleep(delay);
        continue;
      }
    }
    const code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      return response;
    }
    const body = response.getContentText();
    if (isRetryableStatus(code) && attempt < maxRetries) {
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
      Utilities.sleep(delay);
      continue;
    } else {
      throw new Error(`HTTP error ${code} from ${providerName}: ${body}`);
    }
  }
  throw new Error(`Failed to fetch from ${providerName} after ${maxRetries} attempts.`);
}

function isRetryableStatus(code) {
  return code === 429 || (code >= 500 && code < 600);
}

function getProviderConfig() {
  const props = PropertiesService.getUserProperties();
  const secretName = props.getProperty('SECRET_NAME');
  let secretConfig = {};
  if (secretName) {
    try {
      const secretString = retrieveApiKeySecret_(secretName);
      secretConfig = JSON.parse(secretString);
    } catch (e) {
      throw new Error('Unable to retrieve API config from Secret Manager: ' + e.message);
    }
  }
  return {
    modelProvider:
      props.getProperty('PROP_MODEL') ||
      props.getProperty('MODEL_PROVIDER') ||
      secretConfig.modelProvider ||
      'openai',
    openaiApiKey:
      secretConfig.openaiApiKey || props.getProperty('OPENAI_API_KEY') || '',
    openaiApiUrl:
      secretConfig.openaiApiUrl ||
      props.getProperty('OPENAI_API_URL') ||
      'https://api.openai.com/v1/chat/completions',
    openaiModel:
      secretConfig.openaiModel || props.getProperty('OPENAI_MODEL') || 'gpt-3.5-turbo',
    openrouterApiKey:
      secretConfig.openrouterApiKey || props.getProperty('OPENROUTER_API_KEY') || '',
    openrouterApiUrl:
      secretConfig.openrouterApiUrl ||
      props.getProperty('OPENROUTER_API_URL') ||
      'https://openrouter.ai/api/v1/chat/completions',
    openrouterModel:
      secretConfig.openrouterModel || props.getProperty('OPENROUTER_MODEL') || ''
  };
}

function buildPayload(provider, prompt, dataJson, cfg) {
  if (provider === 'openai') {
    return {
      model: cfg.openaiModel,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt + '\n\nData:\n' + dataJson }
      ],
      temperature: 0.7,
      max_tokens: 1024
    };
  } else if (provider === 'openrouter') {
    return {
      model: cfg.openrouterModel,
      messages: [
        { role: 'user', content: prompt + '\n\nData:\n' + dataJson }
      ],
      temperature: 0.7,
      max_tokens: 1024
    };
  }
  throw new Error('Unsupported AI provider: ' + provider);
}

function parseAiResponse(provider, json) {
  if (json.choices && json.choices.length > 0) {
    return json.choices
      .map(function(choice) {
        return choice.message && choice.message.content
          ? choice.message.content
          : '';
      })
      .join('\n');
  }
  throw new Error('Unexpected response from ' + provider + ': ' + JSON.stringify(json));
}
