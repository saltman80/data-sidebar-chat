// Utilities for managing AI provider configuration and calls

const PROP_PROVIDER = 'AI_PROVIDER';
const PROP_MODEL = 'AI_MODEL';
const PROP_OPENAI_KEY = 'OPENAI_API_KEY';
const PROP_OPENROUTER_KEY = 'OPENROUTER_API_KEY';

function setProvider(provider) {
  PropertiesService.getUserProperties().setProperty(PROP_PROVIDER, provider);
}

function getProvider() {
  return PropertiesService.getUserProperties().getProperty(PROP_PROVIDER) || 'openai';
}

function setModel(model) {
  PropertiesService.getUserProperties().setProperty(PROP_MODEL, model);
}

function getModel() {
  return PropertiesService.getUserProperties().getProperty(PROP_MODEL) || '';
}

function getOpenRouterModel() {
  return getModel();
}

function setApiKey(apiKey) {
  var props = PropertiesService.getUserProperties();
  var provider = getProvider();
  if (provider === 'openrouter') {
    props.setProperty(PROP_OPENROUTER_KEY, apiKey);
  } else {
    props.setProperty(PROP_OPENAI_KEY, apiKey);
  }
}

function getOpenAIApiKey() {
  return PropertiesService.getUserProperties().getProperty(PROP_OPENAI_KEY);
}

function getOpenRouterApiKey() {
  return PropertiesService.getUserProperties().getProperty(PROP_OPENROUTER_KEY);
}

function getApiKey() {
  var provider = getProvider();
  return provider === 'openrouter' ? getOpenRouterApiKey() : getOpenAIApiKey();
}

function getApiSettings() {
  return {
    provider: getProvider(),
    apiKey: getApiKey(),
    model: getModel()
  };
}

function AI_OpenRouter() {
  Logger.log('Calling OpenRouter with args:', arguments);
  var prompt = Array.prototype.slice.call(arguments).join(' ');
  var apiKey = getApiKey();
  var model = getOpenRouterModel();
  if (!apiKey) {
    Browser.msgBox('No OpenRouter API Key Set. To use this function, please set the API key first by using the Set API Key menu item.');
    return;
  }
  if (!model) {
    Browser.msgBox('No AI Model Set. Please select a model using the Set AI Model menu.');
    return;
  }
  var url = 'https://openrouter.ai/api/v1/chat/completions';
  var input = {
    model: model,
    messages: [{ role: 'user', content: prompt }]
  };
  var options = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
      'HTTP-Referer': 'https://www.aahsheet.com',
      'X-Title': 'AAH Sheet'
    },
    method: 'post',
    payload: JSON.stringify(input)
  };
  var attempts = 0;
  var emailSent = false;
  while (attempts < 3) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      var json = response.getContentText();
      var data = JSON.parse(json);
      return data.choices[0].message.content;
    } catch (error) {
      attempts++;
      Logger.log('OpenRouter API call failed. Attempt: ' + attempts + '. Error: ' + error);
      if (!emailSent && error.toString().toLowerCase().includes('billing')) {
        if (typeof handleBillingError === 'function') handleBillingError(error);
        emailSent = true;
      }
    }
  }
  if (attempts >= 3) {
    Browser.msgBox('OpenRouter API failed. They are busy. Try again shortly.');
    throw new Error('OpenRouter API call failed after ' + attempts + ' attempts. Check the log for error details.');
  }
}

function AI_OpenAI() {
  Logger.log('Calling OpenAI with args:', arguments);
  var prompt = Array.prototype.slice.call(arguments).join(' ');
  var apiKey = getApiKey();
  var model = getModel();
  if (!apiKey) {
    Browser.msgBox('No OpenAI API Key Set. To use this function, please set the API key first by using the Set API Key menu item.');
    return;
  }
  if (!model) {
    Browser.msgBox('No AI Model Set. Please select a model using the Set AI Model menu.');
    return;
  }
  var url = 'https://api.openai.com/v1/chat/completions';
  var input = {
    model: model,
    messages: [{ role: 'user', content: prompt }]
  };
  var options = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    method: 'post',
    payload: JSON.stringify(input)
  };
  var attempts = 0;
  var emailSent = false;
  while (attempts < 3) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      var json = response.getContentText();
      var data = JSON.parse(json);
      return data.choices[0].message.content;
    } catch (error) {
      attempts++;
      Logger.log('OpenAI API call failed. Attempt: ' + attempts + '. Error: ' + error);
      if (!emailSent && error.toString().toLowerCase().includes('billing')) {
        if (typeof handleBillingError === 'function') handleBillingError(error);
        emailSent = true;
      }
    }
  }
  if (attempts >= 3) {
    Browser.msgBox('OpenAI API failed. They are busy. Try again shortly.');
    throw new Error('OpenAI API call failed after ' + attempts + ' attempts. Check the log for error details.');
  }
}

function fetchOpenRouterModelsFromAPI() {
  var apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API Key is not set.');
  }
  var url = 'https://openrouter.ai/api/v1/models';
  var options = { method: 'GET', headers: { Authorization: 'Bearer ' + apiKey } };
  try {
    var response = UrlFetchApp.fetch(url, options);
    var data = JSON.parse(response.getContentText());
    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error('Unexpected response format from OpenRouter API.');
    }
    data.data.sort(function(a, b) {
      var nameA = a.name || '';
      var nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
    return data.data.map(function(model) {
      return { name: model.name || 'N/A', id: model.id || 'N/A' };
    });
  } catch (e) {
    throw new Error('Failed to fetch OpenRouter models: ' + e.message);
  }
}

function fetchOpenAIModels() {
  var apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API Key is not set.');
  }
  var url = 'https://api.openai.com/v1/models';
  var options = {
    method: 'get',
    headers: { Authorization: 'Bearer ' + apiKey },
    muteHttpExceptions: true
  };
  try {
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    if (responseCode !== 200) {
      throw new Error('Failed to fetch. Code: ' + responseCode + ' | ' + responseText);
    }
    var data = JSON.parse(responseText);
    if (!data || !Array.isArray(data.data)) {
      throw new Error('Invalid data format returned from OpenAI API.');
    }
    return data.data.map(function(item) { return { id: item.id }; });
  } catch (e) {
    throw new Error('Error fetching OpenAI models: ' + e.message);
  }
}

function fetchModels(provider) {
  if (provider === 'openrouter') {
    return fetchOpenRouterModelsFromAPI();
  }
  return fetchOpenAIModels();
}

