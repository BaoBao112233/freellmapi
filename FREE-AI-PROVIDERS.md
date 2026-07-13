# Drawin AI — Hướng dẫn lấy API key AI miễn phí

Tổng hợp link đăng ký lấy API key miễn phí từ các nhà cung cấp để bỏ vào Drawin AI.

---

## 🚀 URL truy cập hệ thống (local)

| Mục đích | URL |
|---|---|
| **👤 Dashboard — đăng ký / đăng nhập tài khoản admin** | **http://localhost:5173** |
| API endpoint (cho app/SDK gọi qua proxy) | http://localhost:3001/v1 |

> ⚠️ **KHÔNG mở** `http://localhost:3001` trực tiếp ở chế độ dev — nó chỉ là API, sẽ báo lỗi `ENOENT ... client/dist/index.html`. Dashboard nằm ở cổng **5173**.

**Unified API key** (key mà app/SDK của bạn dùng để gọi proxy — không phải để đăng nhập dashboard):

```
drawin-e5b28380b75aa6640d0758046cf2f8a802d0596645aecfa5
```

---

## 🆓 Nhóm KHÔNG cần key (bật là chạy ngay — dễ nhất để test)

Vào dashboard bật trong **Fallback Chain** là dùng được, không cần đăng ký gì.

| Provider | Model | Link |
|---|---|---|
| **Pollinations** | GPT-OSS 20B | https://pollinations.ai |
| **LLM7** | GPT-OSS, Llama 3.1, GLM | https://llm7.io |
| **OVH AI Endpoints** | Qwen3, Llama 3.3 | https://endpoints.ai.cloud.ovh.net |
| **Kilo Gateway** | routes `:free` | https://kilo.ai |
| **AI Horde** | Llama, Gemma, Cydonia (dùng key `0000000000`) | https://aihorde.net |

---

## 🔑 Nhóm cần đăng ký lấy key free (chất lượng tốt hơn)

| Provider | Link lấy API key | Model / Ghi chú |
|---|---|---|
| **Groq** ⚡ | https://console.groq.com/keys | ⭐ Nhanh nhất — Llama 3.3, Llama 4, GPT-OSS, Qwen3 |
| **Google Gemini** | https://aistudio.google.com/apikey | ⭐ Thông minh nhất free tier — Gemini 2.5 Flash |
| **Cerebras** ⚡ | https://cloud.cerebras.ai | ⭐ Cực nhanh — Qwen3 235B |
| **Mistral** | https://console.mistral.ai/api-keys | Large 3, Medium 3.5, Codestral, Devstral |
| **OpenRouter** | https://openrouter.ai/keys | 21 model free |
| **GitHub Models** | https://github.com/settings/tokens (tạo Personal Access Token) | GPT-4.1, GPT-4o |
| **Cloudflare Workers AI** | https://dash.cloudflare.com → AI | Kimi K2, GLM-4.7, GPT-OSS, Granite 4 |
| **Cohere** | https://dashboard.cohere.com/api-keys | Command R+ (⚠️ ToS cấm dùng cá nhân) |
| **NVIDIA NIM** | https://build.nvidia.com | 40 RPM (⚠️ chỉ dùng để eval) |
| **Z.ai / Zhipu** | https://docs.z.ai | GLM-4.5, GLM-4.7 Flash |
| **HuggingFace** | https://huggingface.co/settings/tokens | DeepSeek V4, Kimi K2.6, Qwen3 |
| **Ollama Cloud** | https://ollama.com | GLM-4.7, Kimi K2, gpt-oss, Qwen3 |
| **OpenCode Zen** | https://opencode.ai/auth | Big Pickle, DeepSeek V4 Flash, Nemotron 3 Ultra (⚠️ promo có thời hạn, model hay bị gỡ) |
| **Agnes AI** | https://platform.agnes-ai.com | Model Agnes riêng, đang $0/token (promo, ~30 request đồng thời) |
| **Reka** | https://platform.reka.ai | reka-flash-3, reka-edge (multimodal — nhận ảnh/video), credit cấp lại hàng tháng |
| **SiliconFlow** | https://siliconflow.com | Chủ yếu cho **tạo ảnh (FLUX.1-schnell) + TTS (CosyVoice2)** free — chat KHÔNG free |
| **Routeway** | https://routeway.ai | Aggregator, model đuôi `:free` = $0 (docs nói 20 RPM nhưng thực tế ~5 RPM) |
| **BazaarLink** | https://bazaarlink.ai | Aggregator, chỉ route `auto:free` là free (tự chọn model $0 đang rảnh) |
| **AINative Studio** | https://ainative.studio | Aggregator, quảng cáo ~10M tokens/tháng free (chưa kiểm chứng) |

> **AI Horde** không nằm trong bảng này vì không cần đăng ký — xem nhóm "KHÔNG cần key" ở trên (dùng key `0000000000`, chạy trên máy tình nguyện viên nên **chậm**, phải xếp hàng).

---

## 💡 Gợi ý bắt đầu nhanh nhất

Lấy **3 key này** là đủ mạnh và dễ nhất (đăng ký free ~2 phút, chỉ cần tài khoản Google/GitHub):

1. **Groq** → https://console.groq.com/keys
2. **Google Gemini** → https://aistudio.google.com/apikey
3. **Cerebras** → https://cloud.cerebras.ai

---

## 📝 Cách dùng key sau khi lấy

1. Mở dashboard **http://localhost:5173** → đăng nhập
2. Vào trang **Keys** → chọn provider → dán key vào → **Save**
3. Vào **Playground** để test chat, hoặc gọi bằng curl:

```bash
curl http://localhost:3001/v1/chat/completions \
  -H "Authorization: Bearer drawin-e5b28380b75aa6640d0758046cf2f8a802d0596645aecfa5" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Xin chào"}]
  }'
```

---

## 🖥️ Cách chạy lại hệ thống

```bash
cd d:\Projects\drawin-ai
npm run dev        # server :3001 + dashboard :5173 (dev, có hot-reload)
```

Hoặc bản production (gộp UI + API vào 1 cổng 3001):

```bash
npm run build
node server/dist/index.js
```

---

## ⚠️ Lưu ý về Terms of Service

Rule of thumb để không vi phạm ToS: **1 account/provider**, **không bán lại**, **không chia sẻ endpoint cho người khác**, **không dùng free tier như backend production**.

- ❌ **Cohere** — ToS cấm mục đích cá nhân/gia đình
- ⚠️ **NVIDIA NIM, GitHub Models** — chỉ để eval / thử nghiệm
- ⚠️ **Google Gemini, Z.ai** — điều khoản mơ hồ, cân nhắc

Đây là dự án để học tập / thử nghiệm cá nhân, **không dùng cho production**.
