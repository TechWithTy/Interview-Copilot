// const def_prompt = `The following is a transcript of an interview dialogue. Please extract the last question asked by the interviewer and provide an answer. If it is an algorithm question, please provide the approach and code implementation. If no question is found, there is no need to respond.`


function gpt_system_prompt() {
    return process.env.VUE_APP_GPT_SYSTEM_PROMPT || localStorage.getItem("gpt_system_prompt") || ""
}

function azure_language() {
    return process.env.VUE_APP_AZURE_LANGUAGE || localStorage.getItem("azure_language") || "en-US"
}

function azure_region() {
    return process.env.VUE_APP_WHISPER_API_KEY_LOCATION || process.env.VUE_APP_AZURE_REGION || localStorage.getItem("azure_region") || "eastasia"
}

function gpt_model() {
    return process.env.VUE_APP_GPT_MODEL || localStorage.getItem("gpt_model") || "gpt-3.5-turbo"
}

function gpt_prompt_template() {
    return process.env.VUE_APP_GPT_PROMPT_TEMPLATE || localStorage.getItem("gpt_prompt_template") || ""
}

function agent_role() {
    return localStorage.getItem("agent_role") || ""
}

function agent_tone() {
    return localStorage.getItem("agent_tone") || ""
}

function interview_difficulty() {
    return localStorage.getItem("interview_difficulty") || ""
}

function resume_text() {
    return localStorage.getItem("resume_text") || ""
}

function job_description() {
    return localStorage.getItem("job_description") || ""
}

function expected_qa() {
    return localStorage.getItem("expected_qa") || ""
}

function api_credit_mode() {
    return localStorage.getItem("api_credit_mode") || "unlimited"
}

function api_allotted_credits() {
    return parseInt(localStorage.getItem("api_allotted_credits")) || 100
}

function api_credits_used() {
    return parseInt(localStorage.getItem("api_credits_used")) || 0
}

function api_rate_limit() {
    return parseInt(localStorage.getItem("api_rate_limit")) || 10
}

function openai_key() {
    return process.env.VUE_APP_OPEN_API_KEY || localStorage.getItem("openai_key") || ""
}

function azure_token() {
    return process.env.VUE_APP_WHISPER_API_KEY_1 || localStorage.getItem("azure_token") || ""
}

export default {
    openai_key,
    azure_token,
    gpt_system_prompt,
    gpt_prompt_template,
    azure_language,
    azure_region,
    gpt_model,
    agent_role,
    agent_tone,
    interview_difficulty,
    resume_text,
    job_description,
    expected_qa,
    api_credit_mode,
    api_allotted_credits,
    api_credits_used,
    api_rate_limit
}