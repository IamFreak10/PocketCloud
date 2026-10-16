# PocketCloud User Manual: Virtual Ubuntu Setup Guide

> **PocketCloud Developer Guide**: This manual provides a step-by-step walkthrough on how to set up and run a virtual Ubuntu Linux VPS environment on your computer with zero cloud costs and minimal resource usage.

---

## 📌 Table of Contents
1. [Two Ubuntu Setup Approaches](#1-two-ubuntu-setup-approaches)
2. [Approach 1: Container-Based Ubuntu VPS in PocketCloud (Recommended)](#2-approach-1-container-based-ubuntu-vps-in-pocketcloud-recommended)
3. [Approach 2: Full QEMU/KVM Virtual Machine Setup](#3-approach-2-full-qemukvm-virtual-machine-setup)
4. [Essential Terminal Commands & Verification](#4-essential-terminal-commands--verification)
5. [Troubleshooting Common Issues](#5-troubleshooting-common-issues)

---

## 1. Two Ubuntu Setup Approaches

Depending on your requirements and hardware resources, you can run virtual Ubuntu in two distinct ways:

| Feature | Approach 1: PocketCloud Ubuntu VPS (Recommended) | Approach 2: Manual QEMU/KVM VM |
| :--- | :--- | :--- |
| **RAM Usage** | 512 MB – 1 GB (PocketCloud default) | 1 GB to 4 GB |
| **Boot Speed** | 1 to 2 seconds | 30 to 60 seconds (with KVM) |
| **Package Manager** | Native `apt`, `apt-get` | Native `apt`, `apt-get` |
| **Ideal For** | Full-stack development, Nginx, Node.js, Python, Databases | Kernel driver testing, deep systemd development |
| **Setup Complexity** | 1-Click instant launch | Manual CLI flags and BIOS virtualization configuration |

---

## 2. Approach 1: Container-Based Ubuntu VPS in PocketCloud (Recommended)

PocketCloud utilizes an optimized Ubuntu 24.04 LTS environment with native OpenSSH server, pre-baked toolchains (Node.js, npm, Nginx, PM2), and persistent filesystem storage across restarts.

### Step 1: Launch PocketCloud
1. Open the desktop application or navigate to `http://localhost:1420/`.
2. From the navigation sidebar, click on **"My Labs"** or **"VPS Control Suite"**.

### Step 2: Create a Lab and Add Node
1. Click **"Create New Lab"**:
   - **Lab Name**: `Ubuntu VPS Lab`
   - **Description**: `Virtual Ubuntu 24.04 LTS Playground`
2. In the lab component section, click **"Add Component"**:
   - **Component Name**: `Ubuntu 24.04 Node`
   - **Type**: `VPS Node`
   - **Runtime Mode**: `Docker Container`
   - **Image**: `netlab/ubuntu-vps:24.04`
   - **Port Forwarding**: Host Port `18023` -> Container Port `22` (SSH)
3. Click **"Save Component"**.

### Step 3: Start the VPS
1. Click the green **"Start"** button on the component card.
2. Within 1-2 seconds, the status will transition to **"Running"**.

### Step 4: Open Terminal
1. Navigate to the **"Terminal"** tab in the sidebar.
2. Select your `Ubuntu 24.04 Node` from the dropdown.
3. You will immediately have a live root shell:
   ```bash
   root@ubuntu-24:~#
   ```

---

## 3. Approach 2: Full QEMU/KVM Virtual Machine Setup

If you need a dedicated Linux kernel with complete `systemd` supervisor support, follow these steps:

### Step 1: Verify Hardware Virtualization
Check if your CPU supports hardware virtualization (Intel VT-x or AMD-V):
```bash
egrep -c '(vmx|svm)' /proc/cpuinfo
```
*(An output greater than `0` confirms virtualization is active. If `0`, enable **SVM Mode** or **Intel VT-x** in your computer's BIOS settings).*

### Step 2: Install KVM & QEMU Packages
On your Linux workstation:
```bash
sudo apt update
sudo apt install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virt-manager
sudo usermod -aG kvm,libvirt $USER
```
*(Log out and back in for group changes to take effect).*

### Step 3: Download Official Ubuntu Cloud Image
```bash
mkdir -p ~/pocketcloud-vms && cd ~/pocketcloud-vms
wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img
```

### Step 4: Create Dynamic Virtual Disk
```bash
qemu-img create -f qcow2 -F qcow2 -b noble-server-cloudimg-amd64.img ubuntu-disk.qcow2 20G
```

### Step 5: Launch Virtual Machine
```bash
qemu-system-x86_64 \
  -enable-kvm \
  -m 2048 \
  -smp 2 \
  -hda ubuntu-disk.qcow2 \
  -net nic -net user,hostfwd=tcp::2222-:22 \
  -nographic
```

---

## 4. Essential Terminal Commands & Verification

Inside your virtual Ubuntu environment, verify basic system utilities:

### A. Inspect OS & Kernel Release
```bash
cat /etc/os-release
uname -a
```
**Expected Output:** `NAME="Ubuntu"`, `VERSION="24.04 LTS (Noble Numbat)"`

### B. Update Packages & Install Tools
```bash
apt update
apt install -y curl git nano htop
```

### C. Install and Run Nginx Web Server
```bash
apt install -y nginx
service nginx start
curl http://localhost
```

### D. Create a Standard Non-Root User
```bash
adduser devuser
usermod -aG sudo devuser
su - devuser
```

---

## 5. Troubleshooting Common Issues

### Issue 1: `apt update` shows `Could not resolve host`
- **Cause**: DNS resolution is missing inside the environment.
- **Solution**:
  ```bash
  echo "nameserver 8.8.8.8" > /etc/resolv.conf
  apt update
  ```

### Issue 2: `/dev/kvm: Permission denied`
- **Cause**: User is not a member of the `kvm` system group.
- **Solution**:
  ```bash
  sudo usermod -aG kvm $USER
  sudo chmod 666 /dev/kvm
  ```

### Issue 3: Slow VM Boot Times
- **Cause**: `/dev/kvm` hardware acceleration is missing, falling back to software emulation.
- **Solution**: Enable hardware virtualization in BIOS settings, ensure KVM kernel modules are loaded (`sudo modprobe kvm_intel` or `sudo modprobe kvm_amd`), and reboot.

---

**Success!** Your virtual Ubuntu environment is ready for full-stack and networking experiments.
