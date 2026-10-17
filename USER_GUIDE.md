# 🚀 PocketCloud — User & Installation Guide

PocketCloud হল আপনার কম্পিউটারে লোকাল ক্লাউড, ক্লিন লিনাক্স VPS এবং কাস্টম সিমুলেটেড ইন্টারনেট চালানোর একটি সম্পূর্ণ অফলাইন-ফার্স্ট স্যান্ডবক্স।

---

## 📥 দ্রুত ডাউনলোড লিংকসমূহ (Direct Download Links)

| প্ল্যাটফর্ম | প্যাকেজের ধরণ | ডাউনলোড লিংক | সাইজ |
|---|---|---|---|
| **Windows 10 / 11** | Setup Installer (.exe) | [**PocketCloud-Setup-0.1.0.exe**](https://github.com/IamFreak10/PocketCloud/raw/master/dist-windows/PocketCloud-Setup-0.1.0.exe) | 3.6 MB |
| **Windows 10 / 11** | MSI Package (.msi) | [**PocketCloud-0.1.0.msi**](https://github.com/IamFreak10/PocketCloud/raw/master/dist-windows/PocketCloud-0.1.0.msi) | 3.6 MB |
| **Windows 10 / 11** | Portable Standalone (.exe) | [**PocketCloud.exe**](https://github.com/IamFreak10/PocketCloud/raw/master/dist-windows/PocketCloud.exe) | 7.6 MB |
| **Linux (Ubuntu/Debian)** | Debian Package (.deb) | [**PocketCloud_0.1.0_amd64.deb**](https://github.com/IamFreak10/PocketCloud/raw/master/dist-linux/PocketCloud_0.1.0_amd64.deb) | 4.7 MB |
| **Linux (Fedora/RHEL)** | RPM Package (.rpm) | [**PocketCloud-0.1.0-1.x86_64.rpm**](https://github.com/IamFreak10/PocketCloud/raw/master/dist-linux/PocketCloud-0.1.0-1.x86_64.rpm) | 4.7 MB |

---

## 💻 ১. সিস্টেমে আগে থেকে কী কী থাকা লাগবে? (Prerequisites)

PocketCloud সম্পূর্ণ আইসোলেটেড লিনাক্স কন্টেইনার চালায়। তাই ডিভাইসে নিচের উপাদানগুলো প্রয়োজন:

### 🔹 সাধারণ হার্ডওয়্যার রিকোয়ারমেন্ট:
- **Processor:** 64-bit x86_64 CPU (Intel বা AMD) — BIOS-এ **Virtualization (VT-x / AMD-V)** চালু থাকতে হবে।
- **RAM:** ন্যূনতম 4 GB (8 GB বা 16 GB রেকমেন্ডেড, যাতে একাধিক কন্টেইনার ও ডাটাবেস একসাথে চলতে পারে)।
- **Storage:** ন্যূনতম 2 GB ফ্রি স্পেস।

---

### 🔹 উইন্ডোজ ব্যবহারকারীদের জন্য (Windows 10 / 11):
1. **WSL 2 (Windows Subsystem for Linux):**
   - উইন্ডোজ স্টার্ট মেন্যুতে গিয়ে PowerShell (Run as Administrator) খুলুন এবং রান করুন:
     ```powershell
     wsl --install
     ```
   - রিস্টার্ট চাইলে কম্পিউটার একবার রিস্টার্ট দিন।
2. **Docker Desktop for Windows:**
   - [Docker Desktop](https://www.docker.com/products/docker-desktop/) ডাউনলোড করে ইনস্টল করুন এবং চালু রাখুন।
3. **Microsoft Edge WebView2:**
   - উইন্ডোজ ১০ এবং ১১-এ এটি ডিফল্টভাবেই প্রি-ইনস্টল থাকে।

---

### 🔹 লিনাক্স ব্যবহারকারীদের জন্য (Ubuntu / Debian / Fedora / Arch):
- শুধু **Docker Engine** ইনস্টল করে চালু থাকতে হবে:
  ```bash
  sudo apt update && sudo apt install -y docker.io
  sudo usermod -aG docker $USER
  sudo systemctl enable --now docker
  ```

---

## 📦 ২. PocketCloud কীভাবে ইনস্টল করবেন? (Installation)

### 🪟 Windows ইনস্টলেশন:
- **অপশন ১ (সবচেয়ে সহজ - Setup Wizard):**
  `PocketCloud-Setup-0.1.0.exe` ডাউনলোড করে ডাবল ক্লিক করুন -> `Next` -> `Install`। ডেস্কটপ ও স্টার্ট মেন্যুতে স্বয়ংক্রিয়ভাবে শর্টকাট তৈরি হবে।
- **অপশন ২ (MSI Installer):**
  `PocketCloud-0.1.0.msi` ডাবল ক্লিক করলেই সাইলেন্টলি `C:\Program Files\PocketCloud` এ ইনস্টল হয়ে যাবে।
- **অপশন ৩ (পোর্টেবল মোড):**
  `PocketCloud.exe` ডাউনলোড করে কোনো ইনস্টলেশন ছাড়াই সরাসরি রান করা যায় (পেনড্রাইভেও বহনযোগ্য)।

### 🐧 Linux ইনস্টলেশন:
- **Ubuntu / Debian (.deb):**
  ```bash
  sudo dpkg -i PocketCloud_0.1.0_amd64.deb
  ```
- **Fedora / RHEL (.rpm):**
  ```bash
  sudo rpm -i PocketCloud-0.1.0-1.x86_64.rpm
  ```

---

## 🎮 ৩. ধাপে ধাপে কীভাবে ব্যবহার করবেন? (Step-by-step Usage)

### 🔄 ধাপ ১: অ্যাপ ওপেন ও স্বয়ংক্রিয় ডায়াগনস্টিক লোডিং স্ক্রিন
PocketCloud ওপেন করার সাথে সাথেই একটি **System Initialization & Diagnostics Screen** চালু হবে:
- এটি আপনার পিসির সিপিইউ, মেমোরি, ডকার সকেট, লোকাল গেটওয়ে (18080), ভার্চুয়াল ডিএনএস এবং উবুন্টু ভিআইপিএস এনভায়রনমেন্ট স্বয়ংক্রিয়ভাবে যাচাই করবে।
- **ডকার চালু থাকলে:** ৫টি চেকমার্ক সবুজ হয়ে স্বয়ংক্রিয়ভাবে ড্যাশবোর্ডে প্রবেশ করবে।
- **ডকার চালু না থাকলে:** লোডিং স্ক্রিন আটকে থাকবে না—স্ক্রিনে **[Download Docker Desktop]**, **[Re-scan Environment]** এবং **[Enter PocketCloud (Offline Sandbox Mode)]** অপশন ভেসে উঠবে। আপনি সাথে সাথেই অ্যাপে প্রবেশ করতে পারবেন।

---

### 🚀 ধাপ ২: ক্লিন উবুন্টু VPS লঞ্চ করা
- ড্যাশবোর্ডে থাকা **`"Launch Clean Ubuntu VPS"`** বাটনে ক্লিক করুন।
- এটি তাৎক্ষণিকভাবে ব্যাকগ্রাউন্ডে একটি একদম নতুন, ফ্রেশ **Ubuntu 24.04 LTS** ক্লাউড VPS ইনস্ট্যান্স রান করবে।
- **স্মার্ট অটো-পুল:** আপনার পিসিতে আগে থেকে কোনো ইমেজ তৈরি করতে হবে না—PocketCloud নিজে ব্যাকগ্রাউন্ডে অফিশিয়াল ডকার হাব থেকে উবুন্টু ইমেজ নামিয়ে SSH সার্ভার ও রুট অ্যাক্সেস কনফিগার করে নেয়।
- এই VPS একদম আনম্যানেজড সার্ভারের মতো ক্লিন—কোনো ব্লটওয়্যার বা প্রাক-ইনস্টল করা Nginx/Node থাকবে না।

---

### 💻 ধাপ ৩: রুট টার্মিনালে কাজ করা
PocketCloud-এর ভেতরেই একটি হাই-এন্ড ডার্ক লিনাক্স টার্মিনাল দেওয়া আছে:
- বামপাশের সাইডবার থেকে **`Ubuntu VPS Terminal`**-এ ক্লিক করুন।
- সরাসরি উবুন্টুর রুট টার্মিনাল চালু হয়ে যাবে:
  ```bash
  whoami
  # output: root
  ```
- আপনি আপনার পছন্দমতো প্যাকেজ ইনস্টল করতে পারবেন:
  ```bash
  apt update && apt install -y curl git nginx python3
  ```

---

### 🔑 ধাপ ৪: বাইরের টার্মিনাল থেকে SSH দিয়ে লগইন করা (PowerShell / PuTTY / Linux)
PocketCloud এর VPS পোর্ট `18022`-এ লাইভ OpenSSH সার্ভার রান করে।
আপনার নিজস্ব কম্পিউটারের টার্মিনাল (PowerShell / CMD / Linux Bash) থেকেও লগইন করতে পারেন:
```bash
ssh -p 18022 root@127.0.0.1
```
- **Port:** `18022`
- **Username:** `root`
- **Password:** `netlab123`
- আপনি সরাসরি রুট শেল পেয়ে যাবেন!

---

### 🌐 ধাপ ৫: ইন্টারনেট সিমুলেটর ও কাস্টম ডোমেইন টেস্ট (Simulated Internet)
PocketCloud-এ রয়েছে একাধিক গ্লোবাল ক্লায়েন্ট এজ স্টেশনসহ ইন্টারনেট সিমুলেটর:
1. **VPS-এ ওয়েবসাইট রান করুন:** উবুন্টু VPS-এর ভেতর Nginx বা যেকোনো ওয়েব সার্ভিস চালান:
   ```bash
   apt install -y nginx && nginx
   ```
2. **ভার্চুয়াল DNS এ ডোমেইন সেট করুন:**
   - সাইডবার থেকে **`Virtual DNS Engine`**-এ যান।
   - যেকোনো ডোমেইন নাম দিন (যেমন: `shop.test`) এবং IP ম্যাপ করুন।
3. **কাস্টম ব্রাউজারে সাইট ব্রাউজ করুন:**
   - সাইডবার থেকে **`Internet Simulator`** ওপেন করুন।
   - এড্রেস বারে লিখুন: `http://shop.test`
   - বিভিন্ন গ্লোবাল স্টেশন (London 🇬🇧, Tokyo 🇯🇵, Frankfurt 🇩🇪, Singapore 🇸🇬) থেকে লাইভ পিং ল্যাটেন্সি ও HTTP রেসপন্স স্ট্যাটাসসহ সাইটটি অফলাইনে লোড হবে!
4. **ইন্টারনেট সিমুলেটরের বিল্ট-ইন SSH টার্মিনাল:**
   - ব্রাউজারের পাশেই রয়েছে ফুল-ফিচার্ড SSH টার্মিনাল।
   - এক ক্লিকে `Check Nginx`, `Reload Nginx`, `Curl Test Site`, `Copy Logs` রান করতে পারবেন।

---

### 🖥️ ধাপ ৬: লোকাল পিসি ব্রাউজার দিয়ে অ্যাক্সেস (Host Gateway)
যদি আপনি আপনার পিসির ক্রোম (Google Chrome) বা এজ (Edge) ব্রাউজার দিয়ে ল্যাবের সাইট দেখতে চান:
- পিসির ব্রাউজারে যান: `http://127.0.0.1:18080`
- PocketCloud এর নিজস্ব রিভার্স প্রক্সি সরাসরি হোস্ট ব্রাউজার ট্রাফিককে ভেতরের ল্যাব কন্টেইনারে ফরোয়ার্ড করবে।

---

## 🛠️ সারসংক্ষেপ (Cheat Sheet)

| ফিচার | বিস্তারিত তথ্য |
|------|---------------|
| **Default SSH Port** | `18022` |
| **Default SSH User** | `root` |
| **Default SSH Password** | `netlab123` |
| **Host Gateway Proxy** | `http://127.0.0.1:18080` |
| **Internal DNS Engine** | `.test`, `.lab`, `.local` ডোমেইন সাপোর্ট (RFC 6761) |
| **Supported Containers** | Ubuntu 24.04 VPS, Alpine, Nginx, PostgreSQL 16 |
| **Simulated Stations** | London (10.99.1.101), Tokyo (10.99.1.102), Frankfurt, Singapore |
