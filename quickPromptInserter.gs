var QUICK_PROMPTS_KEY = 'QUICK_PROMPTS';
var MAX_PROMPTS = 50;
var MAX_PROMPT_LENGTH = 1000;

function getQuickPrompts() {
  var stored = PropertiesService.getDocumentProperties().getProperty(QUICK_PROMPTS_KEY);
  if (!stored) {
    return [];
  }
  try {
    var prompts = JSON.parse(stored);
    return Array.isArray(prompts) ? prompts : [];
  } catch (e) {
    Logger.log('Error parsing quick prompts: ' + e);
    return [];
  }
}

function saveQuickPrompts(prompts) {
  try {
    var json = JSON.stringify(prompts);
  } catch (e) {
    throw new Error('Error serializing quick prompts: ' + e);
  }
  try {
    PropertiesService.getDocumentProperties().setProperty(QUICK_PROMPTS_KEY, json);
  } catch (e) {
    throw new Error('Error saving quick prompts: ' + e);
  }
}

function addQuickPrompt(text) {
  if (typeof text !== 'string') {
    throw new Error('Invalid prompt text: not a string');
  }
  var trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Prompt text cannot be empty');
  }
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    throw new Error('Prompt text exceeds maximum length of ' + MAX_PROMPT_LENGTH + ' characters');
  }
  var prompts = getQuickPrompts();
  if (prompts.length >= MAX_PROMPTS) {
    throw new Error('Maximum number of quick prompts (' + MAX_PROMPTS + ') reached');
  }
  var newPrompt = {
    id: Utilities.getUuid(),
    text: trimmed,
    createdAt: new Date().toISOString()
  };
  prompts.push(newPrompt);
  saveQuickPrompts(prompts);
  return newPrompt;
}

function updateQuickPrompt(id, newText) {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Invalid prompt id for update');
  }
  if (typeof newText !== 'string') {
    throw new Error('Invalid new text for update');
  }
  var trimmed = newText.trim();
  if (!trimmed) {
    throw new Error('Updated prompt text cannot be empty');
  }
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    throw new Error('Updated prompt text exceeds maximum length of ' + MAX_PROMPT_LENGTH + ' characters');
  }
  var prompts = getQuickPrompts();
  var idx = prompts.findIndex(function(p) { return p.id === id; });
  if (idx === -1) {
    throw new Error('Quick prompt not found for id: ' + id);
  }
  prompts[idx].text = trimmed;
  prompts[idx].updatedAt = new Date().toISOString();
  saveQuickPrompts(prompts);
  return prompts[idx];
}

function removeQuickPrompt(id) {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Invalid id for removeQuickPrompt');
  }
  var prompts = getQuickPrompts();
  var filtered = prompts.filter(function(p) { return p.id !== id; });
  if (filtered.length === prompts.length) {
    throw new Error('Quick prompt not found for id: ' + id);
  }
  saveQuickPrompts(filtered);
  return true;
}

function getQuickPromptText(id) {
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error('Invalid id for getQuickPromptText');
  }
  var prompts = getQuickPrompts();
  for (var i = 0; i < prompts.length; i++) {
    if (prompts[i].id === id) {
      return prompts[i].text;
    }
  }
  throw new Error('Quick prompt not found for id: ' + id);
}