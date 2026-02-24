<template>
  <div class="homeview_container">
    <div class="center_container">
      <div class="box">
        <div class="func_desc">
          <i class="el-icon-microphone"></i>
          Speech Recognition Results
        </div>
        <div v-show="!currentText && state !== 'ing'" style="color: gray; margin-bottom: 5px; font-size: 14px;">No Content - Start Copilot</div>
        <el-input
          type="textarea"
          v-model="currentText"
          readonly
          placeholder="Speech recognition will appear here..."
          class="asr_content_input"
          :autosize="{ minRows: 6, maxRows: 10 }">
        </el-input>
        
        <div class="func_desc" style="margin-top: 15px;">
          <i class="el-icon-edit"></i>
          Manual Input
        </div>
        <el-input
          type="textarea"
          v-model="manualText"
          placeholder="Type manually here... (e.g. interviewer's question or your own notes)"
          class="manual_content_input"
          :autosize="{ minRows: 4, maxRows: 6 }">
        </el-input>
        
        <div class="single_part_bottom_bar">
          <el-button icon="el-icon-position" type="primary" :disabled="!manualText" @click="submitManualText">
            Submit Manual Input
          </el-button>
          <el-button icon="el-icon-delete" :disabled="!currentText && !manualText" @click="clearASRContent" style="margin-left: 10px;">
            Clear
          </el-button>
        </div>
      </div>
      <div class="box" style="border-left: none;">
        <div class="func_desc" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div><i class="el-icon-s-custom"></i> GPT Answer</div>
          <el-button type="text" size="medium" :icon="show_gpt_settings ? 'el-icon-arrow-up' : 'el-icon-setting'" @click="show_gpt_settings = !show_gpt_settings">
            {{ show_gpt_settings ? 'Hide Settings' : 'Settings' }}
          </el-button>
        </div>
        
        <el-collapse-transition>
          <div v-show="show_gpt_settings" class="gpt-settings-panel">
            <el-select v-model="gpt_prompt_template" @change="onPromptTemplateChange" placeholder="Select Prompt Template" filterable allow-create size="small" style="width: 100%;">
              <el-option v-for="item in prompt_presets" :key="item.label" :label="item.label" :value="item.value"></el-option>
            </el-select>
            
            <div style="display: flex; gap: 20px; align-items: center;">
              <el-switch v-model="auto_ask_gpt" active-text="Auto Ask GPT"></el-switch>
              <el-switch v-model="use_personalization" active-text="Use Context/Persona"></el-switch>
            </div>
          </div>
        </el-collapse-transition>

        <LoadingIcon v-show="show_ai_thinking_effect"/>
        <div class="ai_result_content">{{ ai_result }}</div>
        <div class="single_part_bottom_bar">
          <el-button icon="el-icon-thumb" @click="askCurrentText" :disabled="!isGetGPTAnswerAvailable">
            Ask GPT
          </el-button>
        </div>
      </div>
    </div>
    <div class="title_function_bar">
      <el-button
          type="success"
          @click="startCopilot" v-show="state==='end'" :loading="copilot_starting"
          :disabled="copilot_starting">Start Copilot
      </el-button>
      <el-button
          :loading="copilot_stopping"
          @click="userStopCopilot" v-show="state==='ing'">Stop Copilot
      </el-button>
      <MyTimer ref="MyTimer"/>
    </div>

  </div>
</template>

<script>
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
      gpt_prompt_template: "",
      auto_ask_timer: null,
      show_gpt_settings: false,
      prompt_presets: [
        { label: "Default Interviewer", value: "The following is a transcript of an interview dialogue. Please extract the last question asked by the interviewer and provide an answer. If it is an algorithm question, please provide the approach and code implementation. If no question is found, there is no need to respond." },
        { label: "Software Engineer", value: "You are an assistant for a Software Engineering Interview. Listen to the transcript, extract the last question asked, and provide a comprehensive, accurate, and concise technical response with code examples if applicable." },
        { label: "Product Manager", value: "You are an assistant for a Product Manager Interview. Listen to the transcript, extract the last question asked, and provide a strategic, user-centric, and clear response highlighting metrics, user needs, and product vision." },
        { label: "Data Scientist", value: "You are an assistant for a Data Scientist Interview. Extract the last question from the transcript and provide a detailed response focusing on statistical accuracy, data modeling techniques, and practical business applications." },
        { label: "System Design", value: "You are an assistant for a System Design Interview. Extract the latest question from the transcript and provide a scalable, highly-available, and performant architectural solution. Discuss trade-offs, bottlenecks, and components (e.g. load balancers, caching, databases)." }
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
    async askCurrentText() {
      const apiKey = config_util.openai_key()
      let content = this.currentText
      
      this.ai_result = ""
      this.show_ai_thinking_effect = true
      const model = config_util.gpt_model()
      let gpt_system_prompt = config_util.gpt_system_prompt() || ""
      const gpt_template = this.gpt_prompt_template || config_util.gpt_prompt_template() || ""
      
      if (this.use_personalization) {
          const role = config_util.agent_role()
          const tone = config_util.agent_tone()
          const difficulty = config_util.interview_difficulty()
          const resume = config_util.resume_text()
          const jd = config_util.job_description()
          const qa = config_util.expected_qa()
          
          if (role) gpt_system_prompt += `\nYour Role: ${role}.`
          if (tone) gpt_system_prompt += `\nYour Tone/Personality: ${tone}.`
          if (difficulty) gpt_system_prompt += `\nInterview Difficulty Level: ${difficulty}.`
          if (resume) gpt_system_prompt += `\nCandidate's Resume:\n${resume}\n`
          if (jd) gpt_system_prompt += `\nJob Description:\n${jd}\n`
          if (qa) gpt_system_prompt += `\nExpected Q&A:\n${qa}\n`
      }
      
      content = gpt_system_prompt + "\n" + gpt_template + "\n" + content

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
          messages: [{role: "user", content: content}],
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

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

.homeview_container {
  display: flex;
  flex-direction: column;
}

.title_function_bar {
  margin-top: 10px;
  text-align: center;
  margin-bottom: 10px;
}

.center_container {
  flex-grow: 1;
  display: flex;
  height: calc(100vh - 150px);
}

.box {
  flex: 1; /* 设置flex属性为1，使两个div平分父容器的宽度 */
  border: 1px lightgray solid; /* 为了演示，添加边框样式 */
  padding: 10px; /* 为了演示，添加内边距 */
  white-space: pre-wrap;
  display: flex;
  flex-direction: column;
}

.asr_content_input, .manual_content_input {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
.asr_content_input >>> .el-textarea__inner, .manual_content_input >>> .el-textarea__inner {
  flex-grow: 1;
  resize: none;
  font-family: inherit;
  font-size: 14px;
}

.func_desc {
  text-align: center;
}

.single_part_bottom_bar {
  display: flex;
}

.single_part_bottom_bar > .el-button {
  flex-grow: 1;
}


.ai_result_content {
  overflow-y: auto;
  flex-grow: 1;
}

.popup-tag {
  position: absolute;
  display: none;
  background-color: #785448d4;
  color: white;
  padding: 5px;
  font-size: 15px;
  font-weight: bold;
  text-decoration: underline;
  cursor: pointer;
  -webkit-filter: drop-shadow(0 1px 10px rgba(113, 158, 206, 0.8));
}

.error_msg {
  color: red;
  text-align: center;
}

.gpt-settings-panel {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: rgba(128, 128, 128, 0.05);
  padding: 10px;
  border-radius: 4px;
  border: 1px solid rgba(128, 128, 128, 0.15);
}

</style>
