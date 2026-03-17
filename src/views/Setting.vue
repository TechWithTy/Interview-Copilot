<template>
  <div>

    <div class="desc_text">
      The following settings are only retained locally in your browser.
      See <a :href="github_url" target="_blank">Github</a> for setup instructions.
    </div>

    <h1>Open AI</h1>
    <div class="desc_text">To use GPT, you need an API Key from the <a :href="open_ai_api_url" target="_blank">Open
      AI</a>
    </div>

    <div>
      <el-input placeholder="sk-xxxx" v-model="display_openai_key" @change="onOpenAIKeyChange">
        <template slot="prepend">API Key:</template>
      </el-input>
    </div>

    <div class="separator">
      GPT Model:
      <el-select v-model="gpt_model" filterable allow-create @change="onKeyChange('gpt_model')" placeholder="Select or type model">
        <el-option v-for="model in gpt_models" :key="model" :label="model" :value="model"></el-option>
      </el-select>
    </div>

    <div class="separator">
      <div class="desc_text">System Prompt Source:</div>
      <div class="desc_text" style="font-size: 12px; margin-bottom: 5px;">Choose whether the assistant uses a preset system prompt or your custom override.</div>
      <el-radio-group v-model="system_prompt_mode" @change="onSystemPromptModeChange" style="margin-bottom: 10px;">
        <el-radio label="preset">Preset</el-radio>
        <el-radio label="custom">Custom</el-radio>
      </el-radio-group>
    </div>

    <div class="separator system-prompt-block" :class="{ 'is-inactive': system_prompt_mode === 'custom' }">
      <div class="desc_text">System Prompt Preset:</div>
      <div class="desc_text" style="font-size: 12px; margin-bottom: 5px;">Generic and company presets are combined here. This is active only when `Preset` is selected above.</div>
      <el-select v-model="selected_system_prompt_preset" @change="onSystemPromptPresetChange" placeholder="Select a system prompt preset..." filterable :disabled="system_prompt_mode === 'custom'" style="width: 100%; margin-bottom: 10px;">
        <el-option-group v-for="group in system_prompt_preset_groups" :key="group.company" :label="group.label">
          <el-option v-for="item in group.options" :key="item.value" :label="item.label" :value="item.value"></el-option>
        </el-option-group>
      </el-select>
      <div class="desc_text" style="font-size: 12px; margin-bottom: 10px;">Selected preset: <b>{{ activeSystemPromptPresetLabel }}</b></div>
    </div>

    <div class="separator">
      <div class="desc_text">User Prompt Template:</div>
      <div class="desc_text" style="font-size: 12px; margin-bottom: 5px;">This is separate from the system prompt. It becomes part of the user message sent with the transcript. Leave it empty if you do not want any extra user prompt template.</div>
      <el-select v-model="gpt_prompt_template" @change="onKeyChange('gpt_prompt_template')" placeholder="Select a preset..." filterable style="width: 100%; margin-bottom: 10px;">
        <el-option v-for="item in prompt_presets" :key="item.label" :label="item.label" :value="item.value"></el-option>
      </el-select>
      <el-input type="textarea" placeholder="Describe the task here..." :rows="3"
                v-model="gpt_prompt_template" @change="onKeyChange('gpt_prompt_template')"/>
      <el-button v-if="gpt_prompt_template" size="mini" plain @click="clearPromptTemplate" style="margin-top: 8px;">Clear User Prompt Template</el-button>
    </div>

    <div class="separator system-prompt-block" :class="{ 'is-inactive': system_prompt_mode === 'preset' }">
      <div class="desc_text">System Prompt:</div>
      <div class="desc_text" style="font-size: 12px; margin-bottom: 5px;">{{ system_prompt_mode === 'preset' ? 'Showing the selected preset prompt. Switch to `Custom` to edit your own prompt.' : 'Custom prompt is active. Edit it below.' }}</div>
      <el-input
        type="textarea"
        placeholder="e.g. You are a world-class hiring manager."
        :rows="6"
        :value="systemPromptEditorValue"
        @input="onSystemPromptEditorInput"
        :disabled="system_prompt_mode === 'preset'"/>
      <div class="desc_text" style="font-size: 12px; margin-top: 5px;">Current source: <b>{{ effectiveSystemPromptSource }}</b></div>
      <el-button v-if="gpt_system_prompt" size="mini" plain @click="clearSystemPromptOverride" style="margin-top: 8px;">Clear Custom Prompt</el-button>
    </div>

    <h1>Interview Context</h1>
    <div class="desc_text">Provide context about yourself and the role so the AI can provide tailored answers.</div>

    <div class="separator">
      <div class="desc_text">Your Resume:</div>
      <el-upload
        action=""
        :auto-upload="false"
        :show-file-list="false"
        accept=".txt,.md,.pdf,.docx"
        :on-change="handleResumeUpload"
        style="margin-bottom: 5px;">
        <el-button size="mini" type="primary" plain>Upload Resume File (.txt, .md, .pdf, .docx)</el-button>
      </el-upload>
      <el-input placeholder="e.g. https://linkedin.com/in/... or personal site" v-model="resume_url"
                @input="onKeyChange('resume_url')" style="margin-bottom: 5px;">
        <template slot="prepend">Resume URL</template>
        <el-button slot="append" icon="el-icon-download" @click="fetchAndParseURL('resume_url', 'resume_text')">Parse URL</el-button>
      </el-input>
      <el-input type="textarea" placeholder="Paste your resume content here..." :rows="5"
                v-model="resume_text" @input="onKeyChange('resume_text')"/>
    </div>

    <div class="separator">
      <div class="desc_text">Job Description:</div>
      <el-upload
        action=""
        :auto-upload="false"
        :show-file-list="false"
        accept=".txt,.md,.pdf,.docx"
        :on-change="handleJdUpload"
        style="margin-bottom: 5px;">
        <el-button size="mini" type="primary" plain>Upload Job Description File (.txt, .md, .pdf, .docx)</el-button>
      </el-upload>
      <el-input placeholder="e.g. https://linkedin.com/jobs/..." v-model="jd_url"
                @input="onKeyChange('jd_url')" style="margin-bottom: 5px;">
        <template slot="prepend">JD URL</template>
        <el-button slot="append" icon="el-icon-download" @click="fetchAndParseURL('jd_url', 'job_description')">Parse URL</el-button>
      </el-input>
      <el-input type="textarea" placeholder="Paste the JD text here..." :rows="5"
                v-model="job_description" @input="onKeyChange('job_description')"/>
    </div>

    <div class="separator settings-panel">
      <div class="desc_text">Expected Questions & Answers:</div>
      <div class="desc_text" style="font-size: 12px; margin-bottom: 5px;">Input Q&As generalized for interviews that you may be asked.</div>
      
      <div v-for="(item, index) in expected_qa_list" :key="index" class="qa-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span class="qa-card-title">Question {{ index + 1 }}</span>
          <el-button type="danger" icon="el-icon-delete" circle size="mini" @click="removeQA(index)"></el-button>
        </div>
        <el-select 
          v-model="item.question" 
          filterable 
          allow-create 
          placeholder="Select a default question or type your own..." 
          style="width: 100%; margin-bottom: 10px;" 
          @change="saveQAList">
          <el-option v-for="q in default_questions" :key="q" :label="q" :value="q"></el-option>
        </el-select>
        <el-input 
          v-if="item.question"
          type="textarea" 
          placeholder="Type your corresponding answer here..." 
          :rows="3"
          v-model="item.answer" 
          @change="saveQAList"/>
      </div>
      
      <el-button type="primary" plain size="small" icon="el-icon-plus" @click="addQA" style="margin-top: 5px;">Add Expected Q&A</el-button>
    </div>

    <h1>Agent Personalization</h1>
    <div class="desc_text">Customize how the AI behaves during the interview.</div>
    
    <div class="separator settings-panel">
      <div style="margin-bottom: 5px; color: #606266; font-size: 14px;">Agent Role:</div>
      <el-select v-model="agent_role" filterable allow-create @change="onKeyChange('agent_role')" placeholder="e.g. strict interviewer" style="width: 100%;">
        <el-option v-for="role in agent_roles" :key="role" :label="role" :value="role"></el-option>
      </el-select>

      <div style="margin-bottom: 5px; color: #606266; font-size: 14px;">Agent Tone/Personality:</div>
      <el-select v-model="agent_tone" filterable allow-create @change="onKeyChange('agent_tone')" placeholder="e.g. friendly and encouraging" style="width: 100%;">
        <el-option v-for="tone in agent_tones" :key="tone" :label="tone" :value="tone"></el-option>
      </el-select>

      <div style="margin-bottom: 5px; color: #606266; font-size: 14px;">Interview Difficulty / Level:</div>
      <el-select v-model="interview_difficulty" filterable allow-create @change="onKeyChange('interview_difficulty')" placeholder="e.g. Senior Software Engineer" style="width: 100%;">
        <el-option v-for="diff in interview_difficulties" :key="diff" :label="diff" :value="diff"></el-option>
      </el-select>
    </div>

    <h1>API Limits & Usage</h1>
    <div class="desc_text">Manage your API usage and rate limits.</div>
    <div class="separator">
      <div style="margin-bottom: 5px; color: #606266; font-size: 14px;">Credit Mode:</div>
      <el-radio-group v-model="api_credit_mode" @change="onKeyChange('api_credit_mode')">
        <el-radio label="allotted">Allotted Amounts</el-radio>
        <el-radio label="unlimited">Unlimited (Rate Limited)</el-radio>
      </el-radio-group>
    </div>
    <div class="separator" v-if="api_credit_mode === 'allotted'">
      <div style="margin-bottom: 5px; color: #606266; font-size: 14px;">Allotted API Credits:</div>
      <el-input-number v-model="api_allotted_credits" :min="1" @change="onKeyChange('api_allotted_credits')"></el-input-number>
      <div style="margin-top: 5px; color: #606266; font-size: 14px;">Credits Used: {{ api_credits_used }}</div>
      <el-button size="mini" @click="resetUsage">Reset Usage</el-button>
    </div>
    <div class="separator">
      <div style="margin-bottom: 5px; color: #606266; font-size: 14px;">Rate Limit (Requests per Minute):</div>
      <el-input-number v-model="api_rate_limit" :min="1" @change="onKeyChange('api_rate_limit')"></el-input-number>
    </div>


    <h1>Audio Recorder Extension</h1>
    <div class="desc_text">
      The Interview Copilot browser extension can be used to capture audio from your browser tab and microphone.
      You can load this unpacked extension via Developer Mode on Google Chrome or Microsoft Edge.
    </div>
    <div class="separator" style="margin-bottom: 20px;">
      <b>Installation steps:</b>
      <ol style="margin-top: 5px; font-size: 14px; color: #606266; padding-left: 20px;">
        <li>Go to your extensions page (<code>chrome://extensions</code> or <code>edge://extensions</code>).</li>
        <li>Enable <b>Developer mode</b>.</li>
        <li>Click <b>Load unpacked</b> and select the <code>browser-extension/extension/chrome</code> folder from the repository.</li>
        <li>Click the extension icon or pin it to your toolbar to launch the dashboard and record meetings on any platform!</li>
      </ol>
    </div>

    <h1>Azure Speech Recognition</h1>
    <div class="desc_text">
      We use Microsoft Azure's speech recognition service. You can apply for a free Azure token by referring to <a
        :href="azure_application_url" target="_blank">this tutorial</a>:
    </div>
    <el-input placeholder="Input Your Azure Speech Resource Token (KEY 1)" v-model="display_azure_token"
              @change="onAzureTokenChange">
      <template slot="prepend">Azure token:</template>
    </el-input>
    <div class="separator">
      <div style="margin-bottom: 5px; color: #606266; font-size: 14px;">Location/Region:</div>
      <el-select v-model="azure_region" filterable allow-create @change="onKeyChange('azure_region')" placeholder="e.g. eastasia" style="width: 100%;">
        <el-option v-for="region in azure_regions" :key="region" :label="region" :value="region"></el-option>
      </el-select>
    </div>
    <div class="separator">
      <div style="margin-bottom: 5px; color: #606266; font-size: 14px;">Recognition Language:</div>
      <el-select v-model="azure_language" filterable allow-create @change="onKeyChange('azure_language')" placeholder="e.g. en-US" style="width: 100%;">
        <el-option v-for="lang in azure_languages" :key="lang" :label="lang" :value="lang"></el-option>
      </el-select>
    </div>

    <div class="desc_text">
      <span style="text-decoration: gray">zh-CN</span> for Chinese, See <a :href="full_language_codec_url"
                                                                           target="_blank">here</a> for
      other language codes
    </div>

<!--    <div>-->
<!--      <el-button @click="toDef">set all setting to default</el-button>-->
<!--    </div>-->

  </div>
</template>

<script>
import config_util from "../utils/config_util"
import {
  GENERIC_PROMPT_PRESETS,
  getCompanyPromptByKey,
  getAllCompanyPromptOptions,
  getPromptPresetByValue,
} from "../utils/interview_presets"

export default {
  name: 'HelloWorld',
  props: {},
  computed: {
    effectiveSystemPromptSource() {
      return this.system_prompt_mode === "custom" ? "Custom prompt" : "Preset"
    },
    activeSystemPromptPresetLabel() {
      const preset = getPromptPresetByValue(this.selected_system_prompt_preset)
      if (preset) {
        return preset.label
      }

      const fallbackPreset = getCompanyPromptByKey(this.selected_company, this.selected_company_prompt_key)
      return fallbackPreset.label || "None"
    },
    selectedPresetCompany() {
      const preset = getPromptPresetByValue(this.selected_system_prompt_preset)
      return preset?.company || "generic"
    },
    selectedPresetKey() {
      const preset = getPromptPresetByValue(this.selected_system_prompt_preset)
      return preset?.key || ""
    },
    selectedPresetPromptValue() {
      const preset = getPromptPresetByValue(this.selected_system_prompt_preset)
      return preset?.value || ""
    },
    isCustomPromptActive() {
      return this.system_prompt_mode === "custom"
    },
    systemPromptEditorValue() {
      if (this.system_prompt_mode === "preset") {
        return this.selectedPresetPromptValue
      }

      return this.gpt_system_prompt
    }
  },
  data() {
    return {
      display_openai_key: "",
      gpt_model: "gpt-3.5-turbo",
      gpt_system_prompt: "",
      gpt_prompt_template: "",
      system_prompt_mode: "preset",
      selected_system_prompt_preset: "generic:generic-default",
      selected_company: "generic",
      selected_company_prompt_key: "",
      system_prompt_preset_groups: getAllCompanyPromptOptions(),
      resume_text: "",
      resume_url: "",
      job_description: "",
      jd_url: "",
      agent_role: "",
      agent_tone: "",
      interview_difficulty: "",
      expected_qa: "",
      expected_qa_list: [],
      default_questions: [
        "Tell me about yourself.",
        "What are your greatest strengths?",
        "What do you consider to be your weaknesses?",
        "Why do you want to work here?",
        "Where do you see yourself in five years?",
        "Why should we hire you?",
        "Tell me about a time you faced a challenge at work and how you dealt with it.",
        "What are your salary expectations?"
      ],
      api_credit_mode: "unlimited",
      api_allotted_credits: 100,
      api_credits_used: 0,
      api_rate_limit: 10,
      display_azure_token: "",
      azure_region: "",
      azure_language: "",
      open_ai_api_url: "https://platform.openai.com/api-keys",
      github_url: "https://github.com/interview-copilot/Interview-Copilot",
      azure_application_url: "https://github.com/interview-copilot/Interview-Copilot/blob/main/docs/azure_speech_service_tutorial.md",
      full_language_codec_url: "https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt#speech-to-text",
      gpt_models: [
        "gpt-5.3-codex", "gpt-5.2", "gpt-5.2-instant", "gpt-5-mini", "gpt-5-nano",
        "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano",
        "o4-mini", "o4-mini-high", "o3", "o3-mini",
        "gpt-4o", "gpt-4o-2024-11-20", "gpt-4o-2024-08-06", "gpt-4o-2024-05-13",
        "gpt-4o-mini", "gpt-4o-mini-2024-07-18",
        "o1", "o1-preview", "o1-mini",
        "gpt-4-turbo", "gpt-4-turbo-preview", "gpt-4", "gpt-4-32k",
        "gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-3.5-turbo-1106", "gpt-3.5-turbo-0125"
      ],
      selected_preset_prompt: "",
      prompt_presets: GENERIC_PROMPT_PRESETS,
      agent_roles: [
        "Interviewer (Ask questions, critique answers)",
        "Co-Pilot/Helper (Provide hints, solve questions for me)",
        "Evaluator/Recruiter (Assess overall communication)"
      ],
      agent_tones: [
        "Strict & Direct", "Friendly & Encouraging", "Professional & Formal", "Conversational & Relaxed"
      ],
      interview_difficulties: [
        "Internship", "Junior / Entry-Level", "Mid-Level", "Senior", "Staff / Lead / Principal"
      ],
      azure_regions: [
        "southafricanorth", "eastasia", "southeastasia", "australiaeast", "australiasoutheast", "australiacentral",
        "centralindia", "southindia", "westindia", "japaneast", "japanwest", "koreacentral", "koreasouth",
        "canadacentral", "canadaeast", "northeurope", "westeurope", "francecentral", "germanywestcentral", 
        "norwayeast", "swedencentral", "switzerlandnorth", "switzerlandwest", "uksouth", "ukwest",
        "brazilsouth", "uaenorth", "eastus", "eastus2", "southcentralus", "westus", "westus2", "westus3",
        "centralus", "northcentralus", "westcentralus", "chinaeast2", "chinanorth2", "chinanorth3"
      ],
      azure_languages: [
        "af-ZA", "am-ET", "ar-AE", "ar-BH", "ar-DZ", "ar-EG", "ar-IQ", "ar-JO", "ar-KW", "ar-LB", "ar-LY", "ar-MA", "ar-OM", "ar-QA", "ar-SA", "ar-SY", "ar-TN", "ar-YE",
        "az-AZ", "bg-BG", "bn-IN", "bs-BA", "ca-ES", "cs-CZ", "cy-GB", "da-DK", "de-AT", "de-CH", "de-DE", "el-GR",
        "en-AU", "en-CA", "en-GB", "en-HK", "en-IE", "en-IN", "en-KE", "en-NG", "en-NZ", "en-PH", "en-SG", "en-TZ", "en-US", "en-ZA",
        "es-AR", "es-BO", "es-CL", "es-CO", "es-CR", "es-CU", "es-DO", "es-EC", "es-ES", "es-GQ", "es-GT", "es-HN", "es-MX", "es-NI", "es-PA", "es-PE", "es-PR", "es-PY", "es-SV", "es-US", "es-UY", "es-VE",
        "et-EE", "eu-ES", "fa-IR", "fi-FI", "fil-PH", "fr-BE", "fr-CA", "fr-CH", "fr-FR", "gl-ES", "gu-IN", "he-IL", "hi-IN", "hr-HR", "hu-HU", "hy-AM",
        "id-ID", "is-IS", "it-CH", "it-IT", "ja-JP", "jv-ID", "ka-GE", "kk-KZ", "km-KH", "kn-IN", "ko-KR", "lo-LA", "lt-LT", "lv-LV", "mk-MK", "ml-IN", "mn-MN", "mr-IN", "ms-MY", "mt-MT", "my-MM",
        "nb-NO", "ne-NP", "nl-BE", "nl-NL", "pl-PL", "ps-AF", "pt-BR", "pt-PT", "ro-RO", "ru-RU", "si-LK", "sk-SK", "sl-SI", "sq-AL", "sr-RS", "sv-SE", "sw-KE", "sw-TZ",
        "ta-IN", "te-IN", "th-TH", "tr-TR", "uk-UA", "uz-UZ", "vi-VN", "wuu-CN", "yue-CN", "zh-CN", "zh-HK", "zh-TW"
      ]
    }
  },
  mounted() {
    this.system_prompt_mode = config_util.system_prompt_mode()
    this.selected_system_prompt_preset = config_util.selected_system_prompt_preset()
    const selectedPreset = getPromptPresetByValue(this.selected_system_prompt_preset)
    this.selected_company = selectedPreset?.company || config_util.selected_company()
    this.selected_company_prompt_key = selectedPreset?.key || config_util.selected_company_prompt_key()
    this.gpt_system_prompt = config_util.gpt_system_prompt()
    this.gpt_prompt_template = config_util.gpt_prompt_template()
    this.resume_text = localStorage.getItem("resume_text") || ""
    this.resume_url = localStorage.getItem("resume_url") || ""
    this.job_description = localStorage.getItem("job_description") || ""
    this.jd_url = localStorage.getItem("jd_url") || ""
    this.agent_role = localStorage.getItem("agent_role") || ""
    this.agent_tone = localStorage.getItem("agent_tone") || ""
    this.interview_difficulty = localStorage.getItem("interview_difficulty") || ""
    this.expected_qa = localStorage.getItem("expected_qa") || ""
    try {
      const storedQAList = localStorage.getItem("expected_qa_list");
      if (storedQAList) {
        this.expected_qa_list = JSON.parse(storedQAList);
      } else {
        this.expected_qa_list = [];
      }
    } catch(e) {
      this.expected_qa_list = [];
    }
    this.api_credit_mode = localStorage.getItem("api_credit_mode") || "unlimited"
    this.api_allotted_credits = parseInt(localStorage.getItem("api_allotted_credits")) || 100
    this.api_credits_used = parseInt(localStorage.getItem("api_credits_used")) || 0
    this.api_rate_limit = parseInt(localStorage.getItem("api_rate_limit")) || 10
    this.gpt_model = config_util.gpt_model()
    this.display_openai_key = this.redactKey(config_util.openai_key())
    this.display_azure_token = this.redactKey(config_util.azure_token())
    this.azure_region = config_util.azure_region()
    this.azure_language = config_util.azure_language()
  },
  methods: {
    onSystemPromptModeChange(val) {
      this.system_prompt_mode = val
      localStorage.setItem("system_prompt_mode", val)
    },
    onSystemPromptPresetChange(val) {
      this.selected_system_prompt_preset = val
      localStorage.setItem("selected_system_prompt_preset", val)
      const preset = getPromptPresetByValue(val)
      if (preset) {
        this.selected_company = preset.company
        this.selected_company_prompt_key = preset.key
        localStorage.setItem("selected_company", preset.company)
        localStorage.setItem("selected_company_prompt_key", preset.key)
      }
    },
    onSystemPromptOverrideInput() {
      this.onKeyChange("gpt_system_prompt")
    },
    onSystemPromptEditorInput(val) {
      if (this.system_prompt_mode === "preset") {
        return
      }

      this.gpt_system_prompt = val
      this.onSystemPromptOverrideInput()
    },
    clearSystemPromptOverride() {
      this.gpt_system_prompt = ""
      this.onKeyChange("gpt_system_prompt")
      this.system_prompt_mode = "preset"
      localStorage.setItem("system_prompt_mode", "preset")
      this.$message.success(`Custom system prompt cleared. Using "${this.activeSystemPromptPresetLabel}" preset.`)
    },
    clearPromptTemplate() {
      this.gpt_prompt_template = ""
      this.onKeyChange("gpt_prompt_template")
      this.$message.success("User prompt template cleared.")
    },
    getFileExtension(name = "") {
      const parts = name.toLowerCase().split(".");
      return parts.length > 1 ? parts.pop() : "";
    },
    async readTextFile(file) {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result || "");
        reader.onerror = () => reject(new Error("Failed to read text file."));
        reader.readAsText(file);
      });
    },
    async readArrayBuffer(file) {
      if (file && typeof file.arrayBuffer === "function") {
        return await file.arrayBuffer();
      }

      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsArrayBuffer(file);
      });
    },
    async extractPdfText(fileOrBlob) {
      const pdfjsModule = await import("pdfjs-dist/build/pdf");
      const pdfjs = pdfjsModule.default || pdfjsModule;
      const pdfWorkerModule = await import("pdfjs-dist/build/pdf.worker.entry");
      const pdfWorker = pdfWorkerModule.default || pdfWorkerModule;
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
      const arrayBuffer = await this.readArrayBuffer(fileOrBlob);
      const pdf = await pdfjs.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
      }).promise;
      const pageTexts = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        pageTexts.push(text);
      }

      return pageTexts.join("\n").replace(/\s+/g, " ").trim();
    },
    async extractDocxText(fileOrBlob) {
      const mammothModule = await import("mammoth");
      const mammoth = mammothModule.default || mammothModule;
      const arrayBuffer = await this.readArrayBuffer(fileOrBlob);
      const result = await mammoth.extractRawText({ arrayBuffer });
      return (result.value || "").replace(/\s+/g, " ").trim();
    },
    async extractTextFromFile(fileOrBlob, filename = "", mimeType = "") {
      const extension = this.getFileExtension(filename);
      const normalizedMimeType = (mimeType || "").toLowerCase();

      if (extension === "txt" || extension === "md" || normalizedMimeType.startsWith("text/")) {
        return await this.readTextFile(fileOrBlob);
      }

      if (extension === "pdf" || normalizedMimeType === "application/pdf") {
        return await this.extractPdfText(fileOrBlob);
      }

      if (
        extension === "docx" ||
        normalizedMimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        return await this.extractDocxText(fileOrBlob);
      }

      throw new Error(`Unsupported file type: ${filename || mimeType || "unknown"}`);
    },
    async populateTextFromFile(file, targetKey, label) {
      if (!file) return;

      try {
        const extractedText = await this.extractTextFromFile(file, file.name, file.type);
        this[targetKey] = extractedText;
        this.onKeyChange(targetKey);
        this.$message.success(`${label} parsed successfully.`);
      } catch (error) {
        console.error(error);
        this.$message.error(`Failed to parse ${label}. Supported formats: .txt, .md, .pdf, .docx`);
      }
    },
    redactKey(key) {
      if (!key) return "";
      if (key.length <= 8) return "********";
      return key.substring(0, 4) + "...." + key.substring(key.length - 4);
    },
    onOpenAIKeyChange(val) {
      if (val && !val.includes("....")) {
        localStorage.setItem("openai_key", val);
        this.display_openai_key = this.redactKey(val);
      } else if (!val) {
        localStorage.removeItem("openai_key");
        this.display_openai_key = this.redactKey(config_util.openai_key());
      } else {
        this.display_openai_key = this.redactKey(config_util.openai_key());
      }
    },
    onAzureTokenChange(val) {
      if (val && !val.includes("....")) {
        localStorage.setItem("azure_token", val);
        this.display_azure_token = this.redactKey(val);
      } else if (!val) {
        localStorage.removeItem("azure_token");
        this.display_azure_token = this.redactKey(config_util.azure_token());
      } else {
        this.display_azure_token = this.redactKey(config_util.azure_token());
      }
    },
    addQA() {
      this.expected_qa_list.push({ question: "", answer: "" });
    },
    removeQA(index) {
      this.expected_qa_list.splice(index, 1);
      this.saveQAList();
    },
    saveQAList() {
      localStorage.setItem("expected_qa_list", JSON.stringify(this.expected_qa_list));
      const qaString = this.expected_qa_list
        .filter(item => item.question && item.answer)
        .map(item => `Q: ${item.question}\n\nA: ${item.answer}`)
        .join('\n\n---\n\n');
      this.expected_qa = qaString;
      localStorage.setItem("expected_qa", qaString);
    },
    onKeyChange(key_name) {
      console.log("setItem", key_name, this[key_name])
      localStorage.setItem(key_name, this[key_name])
    },
    resetUsage() {
      this.api_credits_used = 0;
      this.onKeyChange('api_credits_used');
    },
    async handleResumeUpload(file) {
      if (!file || !file.raw) return;
      await this.populateTextFromFile(file.raw, "resume_text", "resume");
    },
    async handleJdUpload(file) {
      if (!file || !file.raw) return;
      await this.populateTextFromFile(file.raw, "job_description", "job description");
    },
    toDef() {
      localStorage.clear();
    },
    async fetchAndParseURL(urlKey, textKey) {
      const url = this[urlKey];
      if (!url) {
        this.$message.warning("Please enter a valid URL first.");
        return;
      }
      this.$message.info("Extracting text from URL...");
      try {
         const pathname = (() => {
           try {
             return new URL(url).pathname;
           } catch (error) {
             return url;
           }
         })();
         const extension = this.getFileExtension(pathname);
         let directResponse = null;

         try {
           directResponse = await fetch(url);
         } catch (error) {
           directResponse = null;
         }

         const contentType = directResponse
           ? (directResponse.headers.get("content-type") || "").toLowerCase()
           : "";
         const isDocumentUrl =
           extension === "pdf" ||
           extension === "docx" ||
           contentType.includes("application/pdf") ||
           contentType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document");

         if (isDocumentUrl) {
           if (!directResponse || !directResponse.ok) {
             throw new Error("Document URL must be publicly accessible and allow direct download.");
           }

           const blob = await directResponse.blob();
           const extracted = await this.extractTextFromFile(blob, pathname, contentType);
           this[textKey] = extracted;
           this.onKeyChange(textKey);
           this.$message.success("Successfully parsed URL!");
           return;
         }

         let html = "";
         try {
           if (!directResponse.ok) throw new Error("Network response was not ok");
           html = await directResponse.text();
         } catch (error) {
           const proxyResponse = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
           if (!proxyResponse.ok) throw new Error("Network response was not ok");
           const proxyData = await proxyResponse.json();
           html = proxyData.contents || "";
         }

         const parser = new DOMParser();
         const doc = parser.parseFromString(html, "text/html");
         const bodyText = doc.body ? doc.body.innerText || "" : html;

         const extracted = bodyText.replace(/\s+/g, ' ').trim();
         this[textKey] = extracted;
         this.onKeyChange(textKey);

         this.$message.success("Successfully parsed URL!");
      } catch (e) {
         console.error(e);
         this.$message.error("Failed to parse URL. Make sure it's accessible, public, and in HTML, PDF, or DOCX format.");
      }
    }
  }


}


</script>
<style scoped>
.separator {
  margin-top: 10px;
}

.settings-panel {
  border: 1px solid var(--settings-border);
  background: var(--settings-panel-bg);
  border-radius: 6px;
  padding: 12px;
}

.qa-card {
  margin-bottom: 15px;
  border: 1px solid var(--settings-border);
  padding: 15px;
  border-radius: 4px;
  background-color: var(--settings-card-bg);
}

.qa-card-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--settings-text);
}

.desc_text {
  color: var(--settings-muted);
  font-size: small;
  margin-bottom: 3px;
}

:host, .separator {
  --settings-panel-bg: #ffffff;
  --settings-card-bg: #fafafa;
  --settings-border: #ebeef5;
  --settings-text: #606266;
  --settings-muted: gray;
}

@media (prefers-color-scheme: dark) {
  :host, .separator {
    --settings-panel-bg: #111827;
    --settings-card-bg: #0f172a;
    --settings-border: #374151;
    --settings-text: #e5e7eb;
    --settings-muted: #cbd5e1;
  }
}

</style>
