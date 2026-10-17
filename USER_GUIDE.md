# 🚀 PocketCloud — User & Installation Guide

PocketCloud হল আপনার কম্পিউটারে লোকাল ক্লাউড, ক্লিন লিনাক্স VPS এবং কাস্টম সিমুলেটেড ইন্টারনেট চালানোর একটি সম্পূর্ণ অফলাইন-ফার্স্ট স্যান্ডবক্স।

---

## 💻 ১. সিস্টেমে আগে থেকে কী কী থাকা লাগবে? (Prerequisites)

PocketCloud ব্যবহার করতে ব্যবহারকারীর কম্পিউটারে নিচের উপাদানগুলো প্রয়োজন:

### 🔹 সাধারণ হার্ডওয়্যার রিকোয়ারমেন্ট:
- **Processor:** 64-bit x86_64 CPU (Intel বা AMD) — BIOS-এ **Virtualization (VT-x / AMD-V)** অন থাকতে হবে।
- **RAM:** ন্যূনতম 4 GB (8 GB বা 16 GB রেকমেন্ডেড, যাতে একাধিক কন্টেইনার স্বাচ্ছন্দ্যে চলতে পারে)।
- **Storage:** ন্যূনতম 2 GB ফ্রি স্পেস (কন্টেইনার ইমেজ ও ফাইলের জন্য)।

---

### 🔹 উইন্ডোজ ব্যবহারকারীদের জন্য (Windows 10 / 11):
1. **WSL 2 (Windows Subsystem for Linux):**
   - পাওয়ারশেল (PowerShell as Admin) খুলে রান করুন:
     ```powershell
     wsl --install
     ```
   - কম্পিউটার রিস্টার্ট করুন।
2. **Docker Desktop:**
   - [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) ডাউনলোড করে ইনস্টল করুন।
   - ইনস্টলের পর Docker Desktop ওপেন করে নিশ্চিত হোন যে **Docker Engine Running** দেখাচ্ছে।
3. **Microsoft Edge WebView2:**
   - Windows 10 এবং 11-এ এটি আগে থেকেই ইনস্টল করা থাকে। (যদি না থাকে তবে মাইক্রোসফটের অফিসিয়াল সাইট থেকে WebView2 Runtime ইনস্টল করতে হয়)।

---

### 🔹 লিনাক্স ব্যবহারকারীদের জন্য (Ubuntu / Debian / Fedora / Arch):
1. **Docker Engine:**
   - উবুন্টু/ডেবিয়ান হলে:
     ```bash
     sudo apt update && sudo apt install -y docker.io
     ```
   - রুট ছাড়া ডকার চালাতে কারেন্ট ইউজারকে docker গ্রুপে যোগ করুন:
     ```bash
     sudo usermod -aG docker $USER
     newgrp docker
     ```
   - সার্ভিস চালু করুন:
     ```bash
     sudo systemctl enable --now docker
     ```

---

## 📦 ২. PocketCloud কীভাবে ইনস্টল করবেন? (Installation)

### 🪟 Windows ইনস্টলেশন (৩টি সহজ উপায়):

| প্যাকেজের নাম | ফাইলের লোকেশন | কীভাবে চালাবেন? |
|--------------|--------------|-----------------|
| **Setup Wizard Installer** | `dist-windows/PocketCloud-Setup-0.1.0.exe` | ডাবল ক্লিক করুন -> `Next` -> `Install`। ডেস্কটপ ও স্টার্ট মেন্যুতে শর্টকাট তৈরি হবে। |
| **Enterprise MSI Installer** | `dist-windows/PocketCloud-0.1.0.msi` | ডাবল ক্লিক করলেই সাইলেন্টলি `C:\Program Files\PocketCloud` এ ইনস্টল হয়ে যাবে। |
| **Portable Standalone EXE** | `dist-windows/PocketCloud.exe` | কোনো ইনস্টলেশন ছাড়াই সরাসরি ডাবল ক্লিক করে চালানো যায় (পেনড্রাইভেও রাখা যায়)। |

### 🐧 Linux ইনস্টলেশন:
- **Ubuntu / Debian (.deb):**
  ```bash
  sudo dpkg -i dist-linux/PocketCloud_0.1.0_amd64.deb
  ```
- **Fedora / RHEL (.rpm):**
  ```bash
  sudo rpm -i dist-linux/PocketCloud-0.1.0-1.x86_64.rpm
  ```
- **Universal AppImage (যেকোনো লিনাক্সে চলবে):**
  ```bash
  chmod +x PocketCloud_0.1.0_amd64.AppImage
  ./PocketCloud_0.1.0_amd64.AppImage
  ```

---

## 🎮 ৩. অ্যাপ্লিকেশন কীভাবে ব্যবহার করবেন? (Step-by-step Usage)

###  ধাপ ১: অ্যাপ ওপেন করা
PocketCloud চালু করলে আপনি রেট্রো প্যাস্টেল ড্যাশবোর্ড দেখতে পাবেন:
- উপরের হেডারে **`Docker: 29.x (Operational)`** ব্যাজ সবুজ আছে কিনা দেখে নিন।
- যদি ডকার চালু না থাকে, তবে ডকার ডেস্কটপ ওপেন করুন।

---

### ধাপ ২: ক্লিন উবুন্টু VPS লঞ্চ করা
- ড্যাশবোর্ডে থাকা **`"Launch Clean Ubuntu VPS"`** বাটনে ক্লিক করুন।
- এটি তাৎক্ষণিকভাবে একটি একদম নতুন, ফ্রেশ **Ubuntu 24.04 LTS** ক্লাউড VPS ইনস্ট্যান্স রান করবে।
- এই VPS-এ আগে থেকে কোনো Nginx বা Node ইন্সটল করা থাকে না (একদম রিয়েল হোস্টিং প্রোভাইডার থেকে কেনা আনম্যানেজড VPS-এর মতো)।

---

### ধাপ ৩: রুট টার্মিনালে কাজ করা
PocketCloud-এর ভেতরেই টার্মিনাল দেওয়া আছে:
- বামপাশের সাইডবার থেকে **`Ubuntu VPS Terminal`**-এ ক্লিক করুন।
- সরাসরি উবুন্টুর রুট টার্মিনাল চালু হয়ে যাবে:
  ```bash
  whoami
  # output: root
  ```
- আপনি আপনার পছন্দমতো প্যাকেজ ইনস্টল করতে পারবেন:
  ```bash
  apt update
  apt install -y curl git python3
  ```

---

### ধাপ ৪: বাইরে থেকে SSH দিয়ে লগইন করা (PuTTY / PowerShell / Terminal)
PocketCloud এর VPS পোর্ট `18022`-এ লাইভ OpenSSH সার্ভার রান করে।
আপনার নিজস্ব কম্পিউটারের টার্মিনাল (PowerShell / CMD / Linux Bash) থেকেও লগইন করতে পারেন:
```bash
ssh -p 18022 root@127.0.0.1
```
- **Password:** `netlab123`
- আপনি সরাসরি রুট শেল পেয়ে যাবেন!

---

### ধাপ ৫: ওয়েবসাইট হোস্ট ও ডোমেইন টেস্ট করা (Simulated Internet)
1. **ওয়েব সার্ভার রান করুন:** উবুন্টু VPS-এর ভেতর Nginx বা পাইথন সার্ভার চালু করুন:
   ```bash
   apt install -y nginx
   systemctl start nginx  # অথবা nginx
   ```
2. **ভার্চুয়াল DNS এ ডোমেইন সেট করুন:**
   - সাইডবার থেকে **`Virtual DNS Engine`**-এ যান।
   - যেকোনো ডোমেইন নাম দিন (যেমন: `mywebsite.test`) এবং IP ম্যাপ করুন।
3. **কাস্টম ব্রাউজারে সাইট ব্রাউজ করুন:**
   - সাইডবার থেকে **`Internet Simulator`** ওপেন করুন।
   - অ্যাড্রেস বারে লিখুন: `http://mywebsite.test`
   - আপনার VPS-এ চলা ওয়েবসাইটটি সিমুলেটেড ইন্টারনেটে লাইভ লোড হবে!

---

### ধাপ ৬: লোকাল পিসি ব্রাউজার দিয়ে অ্যাক্সেস (Host Gateway)
যদি আপনি আপনার পিসির ক্রোম (Google Chrome) বা ফায়ারফক্স ব্রাউজার দিয়ে ল্যাবের সাইট দেখতে চান:
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
| **Internal DNS Engine** | `.test`, `.lab`, `.local` ডোমেইন সাপোর্ট |
| **Supported Containers** | Ubuntu 24.04 VPS, Alpine, Nginx, PostgreSQL |
