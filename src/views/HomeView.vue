<template>
  <div class="homeview_container">
    <el-alert
      title="Pro Tip: Use the Browser Extension for System Audio"
      type="info"
      description="To capture the interviewer's voice clearly from meetings (Zoom/Teams/Meet), use our custom browser extension. Setup instructions are in the Settings page."
      show-icon
      class="premium-alert"
      style="margin-bottom: 20px;">
    </el-alert>
    
    <div class="title_function_bar">
      <el-button
          type="success"
          class="pulse-btn start-btn"
          @click="startCopilot" v-show="state==='end'" :loading="copilot_starting"
          :disabled="copilot_starting"><i class="el-icon-mic"></i> Start Copilot
      </el-button>
      <el-button
          type="danger"
          class="pulse-btn stop-btn"
          :loading="copilot_stopping"
          @click="userStopCopilot" v-show="state==='ing'"><i class="el-icon-turn-off"></i> Stop Copilot
      </el-button>
      <MyTimer ref="MyTimer" v-show="state==='ing'" class="timer-display"/>
    </div>

    <div class="center_container">
      <div class="panel left-panel">
        <div class="panel-header">
          <i class="el-icon-microphone"></i> <span>Speech Recognition Results</span>
        </div>
        <div v-show="!currentText && state !== 'ing'" class="empty-state">No Content - Start Copilot</div>
        <el-input
          type="textarea"
          v-model="currentText"
          readonly
          placeholder="Speech recognition will appear here..."
          class="premium-input asr_content_input"
          :autosize="{ minRows: 8, maxRows: 12 }">
        </el-input>
        
        <div class="panel-header" style="margin-top: 25px;">
          <i class="el-icon-edit"></i> <span>Manual Input</span>
        </div>
        <el-input
          type="textarea"
          v-model="manualText"
          placeholder="Type manually here... (e.g. interviewer's question or your own notes)"
          class="premium-input manual_content_input"
          :autosize="{ minRows: 4, maxRows: 6 }"
          @keyup.enter.native.ctrl="submitManualText">
        </el-input>
        
        <div class="single_part_bottom_bar">
          <el-button class="action-btn submit-btn" icon="el-icon-position" type="primary" :disabled="!manualText" @click="submitManualText">
            Submit Manual Input
          </el-button>
          <el-button class="action-btn clear-btn" icon="el-icon-delete" type="danger" plain :disabled="!currentText && !manualText" @click="clearASRContent">
            Clear
          </el-button>
        </div>
      </div>
      
      <div class="panel right-panel">
        <div class="panel-header collapsable-header" @click="show_gpt_settings = !show_gpt_settings">
          <div style="display: flex; align-items: center; gap: 8px;"><i class="el-icon-s-custom"></i> <span>GPT Answer</span></div>
          <i :class="show_gpt_settings ? 'el-icon-arrow-up' : 'el-icon-setting'" class="toggle-icon"></i>
        </div>
        
        <el-collapse-transition>
          <div v-show="show_gpt_settings" class="gpt-settings-panel">
            <el-select v-model="gpt_prompt_template" @change="onPromptTemplateChange" placeholder="Select Prompt Template" filterable allow-create size="small" style="width: 100%; margin-bottom: 12px;" class="premium-select">
              <el-option v-for="item in prompt_presets" :key="item.label" :label="item.label" :value="item.value"></el-option>
            </el-select>
            
            <div class="settings-toggles">
              <div class="toggle-item">
                <span class="toggle-label">Auto Ask GPT</span>
                <el-switch v-model="auto_ask_gpt" class="premium-switch"></el-switch>
              </div>
              <div class="toggle-item">
                <span class="toggle-label">Use Context/Persona</span>
                <el-switch v-model="use_personalization" class="premium-switch"></el-switch>
              </div>
            </div>

            <div class="pre-run-context">
              <div class="context-title">Pre-Run Context</div>
              <el-select v-model="agent_role" filterable allow-create @change="onPreRunContextChange('agent_role')" placeholder="Agent Role" size="small" style="width: 100%; margin-bottom: 10px;" class="premium-select">
                <el-option v-for="role in agent_roles" :key="role" :label="role" :value="role"></el-option>
              </el-select>
              <el-select v-model="agent_tone" filterable allow-create @change="onPreRunContextChange('agent_tone')" placeholder="Agent Tone / Personality" size="small" style="width: 100%; margin-bottom: 10px;" class="premium-select">
                <el-option v-for="tone in agent_tones" :key="tone" :label="tone" :value="tone"></el-option>
              </el-select>
              <el-select v-model="interview_difficulty" filterable allow-create @change="onPreRunContextChange('interview_difficulty')" placeholder="Interview Difficulty / Level" size="small" style="width: 100%;" class="premium-select">
                <el-option v-for="diff in interview_difficulties" :key="diff" :label="diff" :value="diff"></el-option>
              </el-select>
            </div>

            <div class="request-preview">
              <div class="context-title">Request Preview</div>
              <el-collapse v-model="expandedPreviewSections" class="preview-accordion">
                <el-collapse-item title="System Prompt" name="system">
                  <el-input
                    type="textarea"
                    :value="baseSystemPromptPreview"
                    readonly
                    :autosize="{ minRows: 3, maxRows: 8 }"
                    class="premium-input preview-area">
                  </el-input>
                </el-collapse-item>
                <el-collapse-item title="Agent Personalization" name="personalization">
                  <el-input
                    type="textarea"
                    :value="agentPersonalizationPreview"
                    readonly
                    :autosize="{ minRows: 3, maxRows: 8 }"
                    class="premium-input preview-area">
                  </el-input>
                </el-collapse-item>
                <el-collapse-item title="Interview Context" name="context">
                  <el-input
                    type="textarea"
                    :value="interviewContextPreview"
                    readonly
                    :autosize="{ minRows: 3, maxRows: 8 }"
                    class="premium-input preview-area">
                  </el-input>
                </el-collapse-item>
                <el-collapse-item title="Expected Q&A" name="qa">
                  <el-input
                    type="textarea"
                    :value="expectedQaPreview"
                    readonly
                    :autosize="{ minRows: 3, maxRows: 8 }"
                    class="premium-input preview-area">
                  </el-input>
                </el-collapse-item>
                <el-collapse-item title="User Prompt" name="user">
                  <el-input
                    type="textarea"
                    :value="resolvedUserPrompt"
                    readonly
                    :autosize="{ minRows: 3, maxRows: 8 }"
                    class="premium-input preview-area">
                  </el-input>
                </el-collapse-item>
              </el-collapse>
            </div>
          </div>
        </el-collapse-transition>

        <div v-if="ai_result" class="markdown-body ai_result_content" v-html="renderedAiResult"></div>
        <div v-else-if="!show_ai_thinking_effect" class="empty-state" style="margin-top: 40px;">Waiting for GPT response...</div>
        
        <LoadingIcon v-show="show_ai_thinking_effect" style="margin: 40px auto;"/>
        
        <div class="single_part_bottom_bar" style="margin-top: auto; padding-top: 15px;">
          <el-button class="action-btn ask-btn" icon="el-icon-thumb" type="success" @click="askCurrentText" :disabled="!isGetGPTAnswerAvailable">
            Ask GPT
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { marked } from 'marked';
import Assert from "assert-js"
import LoadingIcon from "@/components/LoadingIcon.vue";
import MyTimer from "@/components/MyTimer.vue";
import * as SpeechSDK from "microsoft-cognitiveservices-speech-sdk";
import OpenAI from "openai";
import config_util from "../utils/config_util"

export default {
  name: 'HomeView',
  props: {},
  computed: {
    isDevMode() {
      return (process.env.NODE_ENV === 'development')
    },
    isGetGPTAnswerAvailable() {
      // return this.state === "ing" && !!this.currentText
      return !!this.currentText || !!this.manualText
    },
    renderedAiResult() {
      if (!this.ai_result) return "";
      return marked(this.ai_result);
    },
    baseSystemPromptPreview() {
      const prompt = (config_util.effective_gpt_system_prompt ? config_util.effective_gpt_system_prompt() : config_util.gpt_system_prompt()) || "";
      return prompt.trim() || "Empty";
    },
    agentPersonalizationPreview() {
      if (!this.use_personalization) return "Disabled";
      const parts = [];
      if (this.agent_role) parts.push(`Role: ${this.agent_role}`);
      if (this.agent_tone) parts.push(`Tone: ${this.agent_tone}`);
      if (this.interview_difficulty) parts.push(`Difficulty: ${this.interview_difficulty}`);
      return parts.join("\n") || "Empty";
    },
    interviewContextPreview() {
      if (!this.use_personalization) return "Disabled";
      const parts = [];
      const resume = config_util.resume_text();
      const jd = config_util.job_description();
      if (resume) parts.push(`Candidate Resume:\n${resume}`);
      if (jd) parts.push(`Job Description:\n${jd}`);
      return parts.join("\n\n") || "Empty";
    },
    expectedQaPreview() {
      if (!this.use_personalization) return "Disabled";
      return config_util.expected_qa() || "Empty";
    },
    resolvedUserPrompt() {
      const parts = [];
      const gptTemplate = this.gpt_prompt_template || config_util.gpt_prompt_template() || "";
      if (gptTemplate) parts.push(gptTemplate);
      if (this.currentText) parts.push(this.currentText);
      if (this.manualText) parts.push(`[Manual Note]: ${this.manualText}`);
      return parts.join("\n\n").trim() || "Empty";
    },
    resolvedSystemPrompt() {
      const sections = [this.baseSystemPromptPreview];
      if (this.use_personalization) {
        if (this.agentPersonalizationPreview && this.agentPersonalizationPreview !== "Empty") sections.push(this.agentPersonalizationPreview);
        if (this.interviewContextPreview && this.interviewContextPreview !== "Empty") sections.push(this.interviewContextPreview);
        if (this.expectedQaPreview && this.expectedQaPreview !== "Empty") sections.push(this.expectedQaPreview);
      }
      return sections.filter(Boolean).join("\n\n").trim();
    }
  },
  components: {LoadingIcon, MyTimer},
  data() {
    return {
      currentText: "",
      manualText: "",
      state: "end", //end\ing
      ai_result: null,
      copilot_starting: false, //显示loading
      copilot_stopping: false,
      show_ai_thinking_effect: false,
      popStyle: {},
      sysStream: null,
      micStream: null,
      originalGetUserMedia: null,
      recognizers: [],
      auto_ask_gpt: false,
      use_personalization: true,
      agent_role: "",
      agent_tone: "",
      interview_difficulty: "",
      gpt_prompt_template: "",
      auto_ask_timer: null,
      show_gpt_settings: true,
      expandedPreviewSections: ["system", "personalization", "context", "qa", "user"],
      prompt_presets: [
        { label: "Default Interviewer", value: "The following is a transcript of an interview dialogue. Please extract the last question asked by the interviewer and provide an answer. If it is an algorithm question, please provide the approach and code implementation. If no question is found, there is no need to respond." },
        { label: "Software Engineer", value: "You are an assistant for a Software Engineering Interview. Listen to the transcript, extract the last question asked, and provide a comprehensive, accurate, and concise technical response with code examples if applicable." },
        { label: "Product Manager", value: "You are an assistant for a Product Manager Interview. Listen to the transcript, extract the last question asked, and provide a strategic, user-centric, and clear response highlighting metrics, user needs, and product vision." },
        { label: "Data Scientist", value: "You are an assistant for a Data Scientist Interview. Extract the last question from the transcript and provide a detailed response focusing on statistical accuracy, data modeling techniques, and practical business applications." },
        { label: "System Design", value: "You are an assistant for a System Design Interview. Extract the latest question from the transcript and provide a scalable, highly-available, and performant architectural solution. Discuss trade-offs, bottlenecks, and components (e.g. load balancers, caching, databases)." }
      ],
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
    }
  },
  async mounted() {
    console.log("mounted")
    if (this.isDevMode) {
      // this.currentText = demo_text
    }
    this.gpt_prompt_template = config_util.gpt_prompt_template() || "";
    this.auto_ask_gpt = localStorage.getItem("auto_ask_gpt") === "true";
    this.use_personalization = localStorage.getItem("use_personalization") !== "false";
    this.agent_role = localStorage.getItem("agent_role") || "";
    this.agent_tone = localStorage.getItem("agent_tone") || "";
    this.interview_difficulty = localStorage.getItem("interview_difficulty") || "";
  },
  watch: {
    auto_ask_gpt(val) {
      localStorage.setItem("auto_ask_gpt", val);
    },
    use_personalization(val) {
      localStorage.setItem("use_personalization", val);
    }
  },
  beforeDestroy() {
  },
  methods: {
    onPromptTemplateChange(val) {
      localStorage.setItem("gpt_prompt_template", val);
    },
    onPreRunContextChange(key) {
      localStorage.setItem(key, this[key]);
    },
    async askCurrentText() {
      const apiKey = config_util.openai_key()
      
      this.ai_result = ""
      this.show_ai_thinking_effect = true
      const model = config_util.gpt_model()
      const messages = []
      if (this.resolvedSystemPrompt && this.resolvedSystemPrompt !== "Empty") {
        messages.push({ role: "system", content: this.resolvedSystemPrompt })
      }
      messages.push({ role: "user", content: this.resolvedUserPrompt })

      try {
        if (!apiKey) {
          throw new Error("You should setup an Open AI Key!")
        }

        // Check Credits
        const mode = config_util.api_credit_mode() || 'unlimited'
        let used = parseInt(localStorage.getItem("api_credits_used")) || 0
        const allotted = config_util.api_allotted_credits() || 100
        
        if (mode === 'allotted' && used >= allotted) {
           throw new Error("You have reached your allotted API credits limit. Please reset your usage or switch to unlimited in settings.")
        }

        // Check Rate Limit
        const rateLimit = config_util.api_rate_limit() || 10
        let timestamps = JSON.parse(localStorage.getItem("api_request_timestamps") || "[]")
        const now = Date.now()
        timestamps = timestamps.filter(ts => now - ts < 60000)
        
        if (timestamps.length >= rateLimit) {
           throw new Error(`Rate limit exceeded: You are limited to ${rateLimit} requests per minute.`)
        }
        
        // Update Tracking
        timestamps.push(now)
        localStorage.setItem("api_request_timestamps", JSON.stringify(timestamps))
        
        used += 1
        localStorage.setItem("api_credits_used", used)

        const openai = new OpenAI({apiKey: apiKey, dangerouslyAllowBrowser: true})
        const stream = await openai.chat.completions.create({
          model: model,
          messages,
          stream: true,
        });
        this.show_ai_thinking_effect = false

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ""
          this.ai_result += text
        }
      } catch (e) {
        this.show_ai_thinking_effect = false
        this.ai_result = "" + e
      }
    },
    clearASRContent() {
      this.currentText = ""
      this.manualText = ""
    },
    submitManualText() {
      if (!this.manualText) return;
      if (this.currentText) {
        this.currentText += "\n[Manual Note]: " + this.manualText;
      } else {
        this.currentText = "[Manual Note]: " + this.manualText;
      }
      this.manualText = "";
    },
    async startCopilot() {
      this.copilot_starting = true
      const token = config_util.azure_token()
      const region = config_util.azure_region()
      const language = config_util.azure_language()
      const openai_key = config_util.openai_key()
      console.log({region, language})
      try {
        if (!openai_key) {
          throw new Error("You should setup Open AI API Token")
        }
        if (!token) {
          throw new Error("You should setup Azure token")
        }
        if (!region) {
          throw new Error("You should setup Azure region")
        }

        // 1. Get Speaker (System) Audio
        this.sysStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        if (this.sysStream.getAudioTracks().length === 0) {
            this.sysStream.getTracks().forEach(track => track.stop());
            throw new Error("No system audio captured. Make sure to check 'Share audio' when selecting the screen/tab.");
        }

        const onStreamEnded = () => {
            if (this.state === "ing") {
                this.userStopCopilot();
            }
        };
        this.sysStream.getTracks().forEach(track => track.addEventListener('ended', onStreamEnded));

        // 2. Get Microphone Audio
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        this.recognizers = [];
        this.originalGetUserMedia = navigator.mediaDevices.getUserMedia;

        const startRecognizer = (stream, label) => {
            return new Promise((resolve, reject) => {
                // Mock getUserMedia temporarily for this specific recognizer
                navigator.mediaDevices.getUserMedia = async () => stream;

                const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(token, region);
                speechConfig.speechRecognitionLanguage = language;
                const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
                const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

                recognizer.recognized = (sender, event) => {
                    if (SpeechSDK.ResultReason.RecognizedSpeech === event.result.reason && event.result.text.length > 0) {
                        const text = event.result.text;
                        const prefix = this.currentText ? "\n[" + label + "]: " : "[" + label + "]: ";
                        this.currentText = this.currentText + prefix + text;
                        
                        if (label === "Interviewer" && this.auto_ask_gpt) {
                            if (this.auto_ask_timer) {
                                clearTimeout(this.auto_ask_timer);
                            }
                            this.auto_ask_timer = setTimeout(() => {
                                if (this.state === "ing" && this.isGetGPTAnswerAvailable) {
                                    this.askCurrentText();
                                }
                            }, 2500);
                        } else if (label === "Me" && this.auto_ask_timer) {
                            clearTimeout(this.auto_ask_timer);
                            this.auto_ask_timer = null;
                        }
                        
                    } else if (SpeechSDK.ResultReason.NoMatch === event.result.reason) {
                        console.log("Speech could not be recognized for " + label);
                    }
                };
                
                recognizer.sessionStopped = (sender, event) => {
                    console.log(`Recognition stopped for ${label}`);
                };

                recognizer.startContinuousRecognitionAsync(
                    () => {
                        this.recognizers.push(recognizer);
                        resolve();
                    },
                    (err) => {
                        reject(err);
                    }
                );
            });
        };

        await startRecognizer(this.sysStream, "Interviewer");
        await startRecognizer(this.micStream, "Me");

        // Restore original getUserMedia
        if (this.originalGetUserMedia) {
            navigator.mediaDevices.getUserMedia = this.originalGetUserMedia;
        }

        this.copilot_starting = false;
        this.state = "ing";
        this.$refs.MyTimer.start();
        window.console.log("recognition started for both streams");
      } catch (e) {
        if (this.originalGetUserMedia) {
            navigator.mediaDevices.getUserMedia = this.originalGetUserMedia;
        }
        this.currentText = "Start Failed: " + (e.message || e)
        this.copilot_starting = false
        if (this.sysStream) this.sysStream.getTracks().forEach(track => track.stop());
        if (this.micStream) this.micStream.getTracks().forEach(track => track.stop());
        return
      }
    },
    userStopCopilot() {
      this.copilot_stopping = true;
      if (this.recognizers && this.recognizers.length > 0) {
          const stopPromises = this.recognizers.map((recognizer) => {
              return new Promise((resolve) => {
                  recognizer.stopContinuousRecognitionAsync(() => {
                      resolve();
                  }, (err) => {
                      console.error("Stop error:", err);
                      resolve();
                  });
              });
          });

          Promise.all(stopPromises).then(() => {
              console.log("Both Recognizers stopped");
              this.finishStopCopilot();
          });
      } else {
          this.finishStopCopilot();
      }
    },
    finishStopCopilot() {
        this.copilot_stopping = false;
        this.state = "end";
        this.$refs.MyTimer.stop();
        if (this.sysStream) this.sysStream.getTracks().forEach(track => track.stop());
        if (this.micStream) this.micStream.getTracks().forEach(track => track.stop());
        this.sysStream = null;
        this.micStream = null;
        this.recognizers = [];
    }
  }
}


const demo_text = `
Hello, thank you for coming for the interview. Please introduce yourself.

I'm Jhon, currently an undergraduate student majoring in Data Science at HK University. I am in the top 10% of my class, specializing in deep learning and proficient in web development. Additionally, I have contributed to several well-known open-source projects as mentioned in my resume.

Alright, let me ask you a machine learning question.

Sure, go ahead.

Can you explain the Hidden Markov Model?
`

async function sleep(ms) {
  return new Promise((resolve => setTimeout(resolve, ms)))
}


</script>

<style>
/* CSS Variables for Dynamic Theming */
body {
  --bg-primary: #f5f7fa;
  --bg-panel: #ffffff;
  --border-color: #e4e7ed;
  --text-primary: #303133;
  --text-secondary: #909399;
  --brand-primary: #409EFF;
  --brand-success: #67C23A;
  --brand-danger: #F56C6C;
  --btn-hover: rgba(64, 158, 255, 0.1);
  --shadow-sm: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 16px 0 rgba(0, 0, 0, 0.08);
}

body.dark-mode {
  --bg-primary: #121212;
  --bg-panel: #1e1e1e;
  --border-color: #333333;
  --text-primary: #e0e0e0;
  --text-secondary: #888888;
  --brand-primary: #3a8ee6;
  --brand-success: #5daf34;
  --brand-danger: #f78989;
  --btn-hover: rgba(58, 142, 230, 0.15);
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.4);
}

/* Dark mode fix for deep alert items */
body.dark-mode .premium-alert {
  background-color: #1e1e1e !important;
  border-color: #333 !important;
  color: #a0a0a0 !important;
}
body.dark-mode .premium-alert .el-alert__title {
  color: #e0e0e0 !important;
}
body.dark-mode .premium-alert .el-alert__description {
  color: #a0a0a0 !important;
}
body.dark-mode .premium-switch .el-switch__label {
  color: var(--text-primary) !important;
}
</style>

<style scoped>
.homeview_container {
  display: flex;
  flex-direction: column;
  background-color: transparent;
  min-height: calc(100vh - 80px);
  padding: 10px 20px;
  box-sizing: border-box;
}

/* Alert Styling Overrides */
.premium-alert {
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-panel);
  box-shadow: var(--shadow-sm);
}

/* Action Bar */
.title_function_bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  background-color: var(--bg-panel);
  padding: 15px 30px;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  margin-bottom: 20px;
}

.timer-display {
  font-family: inherit;
  font-weight: 600;
  font-size: 1.2rem;
  color: var(--text-primary);
  background: var(--bg-primary);
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

/* Pulse Buttons for Main Actions */
.pulse-btn {
  border-radius: 8px !important;
  padding: 10px 24px !important;
  font-weight: 600 !important;
  letter-spacing: 0.5px;
  transition: all 0.3s ease !important;
}
.pulse-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15) !important;
}

/* Center Container (Left & Right Panels) */
.center_container {
  display: flex;
  gap: 20px;
  flex-grow: 1;
}

.panel {
  flex: 1;
  background-color: var(--bg-panel);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  padding: 24px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
  overflow: hidden;
}

.panel-header {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel-header i {
  color: var(--text-secondary);
}

.collapsable-header {
  cursor: pointer;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: var(--bg-primary);
  transition: background-color 0.2s;
  border: 1px solid var(--bg-primary);
}
.collapsable-header:hover {
  background-color: var(--btn-hover);
  border-color: var(--border-color);
}
.toggle-icon {
  color: var(--text-secondary);
  font-weight: bold;
}

/* Status Text */
.empty-state {
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.95rem;
}

/* Customizing Inputs for IDE-like feel */
.premium-input {
  box-shadow: none !important;
}
.asr_content_input, .manual_content_input {
  display: flex;
  flex-direction: column;
}

.asr_content_input >>> .el-textarea__inner, .manual_content_input >>> .el-textarea__inner {
  resize: vertical;
  background-color: var(--bg-primary) !important;
  border: 1px solid var(--border-color) !important;
  color: var(--text-primary) !important;
  border-radius: 8px;
  padding: 16px;
  font-size: 0.95rem;
  line-height: 1.6;
  font-family: inherit;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.asr_content_input >>> .el-textarea__inner:focus, .manual_content_input >>> .el-textarea__inner:focus {
  border-color: var(--brand-primary) !important;
  box-shadow: 0 0 0 1px var(--brand-primary) !important;
}

/* Settings Panel */
.gpt-settings-panel {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}
.settings-toggles {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-label {
  color: var(--text-primary);
  font-weight: 500;
}

.pre-run-context {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-color);
}

.request-preview {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-color);
}

.context-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.preview-accordion {
  border-top: none;
  border-bottom: none;
  background: transparent;
}

.preview-accordion >>> .el-collapse-item__header {
  background: transparent;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  font-weight: 600;
}

.preview-accordion >>> .el-collapse-item__wrap {
  background: transparent;
  border-bottom: 1px solid var(--border-color);
}

.preview-accordion >>> .el-collapse-item__content {
  padding-bottom: 12px;
}

.preview-area >>> .el-textarea__inner {
  background-color: var(--bg-primary) !important;
  border: 1px solid var(--border-color) !important;
  color: var(--text-primary) !important;
  border-radius: 8px;
  padding: 12px;
  line-height: 1.5;
}

/* AI Results Area & Markdown Styling */
.ai_result_content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 16px;
  background-color: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 1rem;
  line-height: 1.6;
}

.markdown-body {
  word-wrap: break-word;
}
.markdown-body >>> h1, .markdown-body >>> h2, .markdown-body >>> h3 {
  margin-top: 20px;
  margin-bottom: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.markdown-body >>> p { margin-bottom: 12px; }
.markdown-body >>> pre {
  background-color: #2b2b2b;
  color: #a9b7c6;
  border-radius: 6px;
  padding: 12px;
  overflow: auto;
  border: 1px solid var(--border-color);
}
.markdown-body >>> code {
  font-family: monospace;
  background-color: rgba(127, 127, 127, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
}
.markdown-body >>> ul, .markdown-body >>> ol {
  padding-left: 2em;
  margin-bottom: 12px;
}

/* Action Buttons Bottom */
.single_part_bottom_bar {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}
.action-btn {
  flex: 1;
  border-radius: 8px !important;
  font-weight: bold !important;
  transition: all 0.2s !important;
}

.premium-switch .el-switch__label,
.premium-switch .el-switch__label * {
  color: var(--text-primary) !important;
}
</style>
