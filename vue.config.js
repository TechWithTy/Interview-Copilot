const { defineConfig } = require('@vue/cli-service')

// Parse terminal arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const split = args[i].indexOf('=');
    let key, val;
    if (split !== -1) {
      key = args[i].substring(2, split);
      val = args[i].substring(split + 1);
    } else {
      key = args[i].substring(2);
      if (i + 1 < args.length && !args[i+1].startsWith('--')) {
        val = args[i + 1];
        i++;
      } else {
        val = "true";
      }
    }
    
    // Windows terminal might pass quotes, strip them cleanly
    if (typeof val === 'string') {
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      }
    }

    if (key === 'gpt-system-prompt') process.env.VUE_APP_GPT_SYSTEM_PROMPT = val;
    if (key === 'gpt-prompt-template') process.env.VUE_APP_GPT_PROMPT_TEMPLATE = val;
    if (key === 'gpt-model') process.env.VUE_APP_GPT_MODEL = val;
    if (key === 'azure-region') process.env.VUE_APP_AZURE_REGION = val;
    if (key === 'azure-language') process.env.VUE_APP_AZURE_LANGUAGE = val;
  }
}

// Map custom .env variables so Vue CLI bundles them
if (process.env.OPEN_API_KEY) {
  process.env.VUE_APP_OPEN_API_KEY = process.env.OPEN_API_KEY;
}
if (process.env.WHISPER_API_KEY_1) {
  process.env.VUE_APP_WHISPER_API_KEY_1 = process.env.WHISPER_API_KEY_1;
}
if (process.env.WHISPER_API_KEY_LOCATION) {
  process.env.VUE_APP_WHISPER_API_KEY_LOCATION = process.env.WHISPER_API_KEY_LOCATION;
}

module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: '' // 设置publicPath为空字符串
})
