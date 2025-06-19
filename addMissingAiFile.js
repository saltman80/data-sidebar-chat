const fs = require('fs/promises');
const path = require('path');
const { constants } = require('fs');

async function fileExists(filePath) {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function copyTemplate(templatePath, destinationPath) {
  await fs.copyFile(templatePath, destinationPath);
}

async function createDefaultFile(destinationPath) {
  const defaultContent = `// Auto-generated AI helper functions

/**
 * Fetches AI response for a given prompt.
 * @param {string} prompt
 * @returns {Promise<string>} AI response
 */
export async function fetchAIResponse(prompt) {
  throw new Error('fetchAIResponse not implemented. Provide your AI implementation.');
}
`;
  await fs.writeFile(destinationPath, defaultContent, 'utf8');
}

async function addMissingAiFile({ dir = '.', filename = 'ai.js', template }) {
  const targetPath = path.resolve(dir, filename);
  if (await fileExists(targetPath)) {
    console.log(\`AI file already exists at \${targetPath}\`);
    return;
  }
  if (template) {
    const templatePath = path.resolve(template);
    if (await fileExists(templatePath)) {
      await copyTemplate(templatePath, targetPath);
      console.log(\`Copied template to \${targetPath}\`);
      return;
    } else {
      console.warn(\`Template not found at \${templatePath}, generating default file.\`);
    }
  }
  await createDefaultFile(targetPath);
  console.log(\`Created default AI file at \${targetPath}\`);
}

function showUsage() {
  console.log(\`
Usage: node addMissingAiFile.js [options]

Options:
  --dir <directory>       Target directory (default: current directory)
  --filename <name>       Filename to create (default: ai.js)
  --template <path>       Path to a template file to copy
  -h, --help              Show this help message
\`);
}

(async () => {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--dir':
      case '--filename':
      case '--template': {
        const next = args[i + 1];
        if (!next || next.startsWith('-')) {
          console.error(\`Error: Missing value for \${arg}\`);
          showUsage();
          process.exit(1);
        }
        if (arg === '--dir') options.dir = next;
        else if (arg === '--filename') options.filename = next;
        else if (arg === '--template') options.template = next;
        i++;
        break;
      }
      case '-h':
      case '--help':
        showUsage();
        process.exit(0);
      default:
        console.warn(\`Unknown argument: \${arg}\`);
    }
  }
  try {
    await addMissingAiFile(options);
  } catch (error) {
    console.error(\`Error: \${error.message}\`);
    process.exit(1);
  }
})();