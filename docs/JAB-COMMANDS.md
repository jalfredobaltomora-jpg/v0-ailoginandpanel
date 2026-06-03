# 📖 JAB AI Assistant - Complete Command Documentation

## 🤖 Overview

**JAB** is a unified AI assistant featuring:
- **EVA Physical Design** (WALL-E appearance) with 8 dynamic expressions
- **JARVIS Capabilities** (Iron Man-style multifunctional control)
- **Bilingual Support** (Spanish/English)
- **Multi-Platform** (Web, Desktop via Electron, Mobile via Capacitor)
- **Real-time Voice** (Transcription & Text-to-Speech)

---

## 🎯 Quick Start

### Activating JAB
1. **Click the EVA robot** floating on your screen
2. **Speak or type** your command
3. **JAB responds** with voice and expression

### Voice Commands
Say "JAB" followed by a command:
```
"JAB, open Google"
"JAB, what's my battery level?"
"JAB, take a screenshot"
```

---

## 📋 Command Categories

### 1️⃣ **SYSTEM INFORMATION COMMANDS**

#### `jab status`
Get comprehensive system status including:
- Platform (Web/Electron/Mobile)
- Operating System
- Network status
- Battery level (if available)
- Available capabilities

**Example:**
```
User: "JAB, status"
JAB: "🖥️ **SYSTEM STATUS**
Platform: web
OS: Windows 10
Network: ✅ Online (4g)
Battery: 92% (Charging)
Available Capabilities:
  • microphone
  • camera
  • files
  • clipboard"
```

#### `jab battery`
Shows current battery percentage and charging status.

**Example:**
```
User: "JAB, battery"
JAB: "🔋 Battery: 85% (Discharging)"
```

#### `jab location`
Gets your current GPS coordinates (requires permission).

**Example:**
```
User: "JAB, my location"
JAB: "📍 Location: 4.7110, -74.0721"
```

---

### 2️⃣ **FILE MANAGEMENT COMMANDS**

#### `jab ls [directory]`
Lists files in a directory (Desktop/Mobile only).

**Examples:**
```
User: "JAB, list my documents"
JAB: "📁 Files in /Documents:
  • resume.pdf
  • project.docx
  • notes.txt"

User: "JAB, ls /home/user/downloads"
JAB: "📁 Files in /home/user/downloads:
  • image.png
  • video.mp4"
```

#### `jab cat [filepath]`
Reads file contents (first 2000 characters).

**Example:**
```
User: "JAB, read config.txt"
JAB: "[File content displayed...]"
```

#### `jab write [filepath] [content]`
Writes content to a file (Desktop/Mobile only).

**Example:**
```
User: "JAB, write note.txt Hello World"
JAB: "✅ File written: note.txt"
```

---

### 3️⃣ **CLIPBOARD COMMANDS**

#### `jab copy [text]`
Copies text to clipboard.

**Example:**
```
User: "JAB, copy hello world"
JAB: "✅ Copied to clipboard (11 chars)"
```

#### `jab paste`
Reads and displays clipboard contents.

**Example:**
```
User: "JAB, what's in my clipboard?"
JAB: "📋 Clipboard:
Previously copied text here..."
```

---

### 4️⃣ **SCREEN & CAPTURE**

#### `jab screenshot`
Takes a screenshot of current screen.

**Example:**
```
User: "JAB, take a screenshot"
JAB: "📸 Screenshot captured (156.32 KB)"
```

---

### 5️⃣ **BROWSER & APPLICATION COMMANDS**

#### `jab open [url]`
Opens a URL in the default browser.

**Examples:**
```
User: "JAB, open google.com"
JAB: "🔗 Opening: https://google.com"

User: "JAB, open github"
JAB: "🔗 Opening: https://github.com"
```

#### `jab launch [app]`
Launches an application (Desktop/Mobile).

**Examples:**
```
User: "JAB, launch Spotify"
JAB: "🚀 Launched: Spotify"

User: "JAB, open VS Code"
JAB: "🚀 Launched: VS Code"
```

#### `jab exec [command]`
Execute system commands (Desktop/Electron only).

**Examples:**
```
User: "JAB, exec npm start"
JAB: "✅ Command executed:
[command output...]"

User: "JAB, run python script.py"
JAB: "✅ Command executed:
[script output...]"
```

---

### 6️⃣ **PERMISSION MANAGEMENT**

#### `jab permissions`
Request specific permissions.

**Example:**
```
User: "JAB, request camera and microphone access"
JAB: "🔐 Permission Status:
  ✅ microphone
  ✅ camera
  ❌ location"
```

#### `jab canuse [capability]`
Check if a capability is available.

**Examples:**
```
User: "JAB, can you access my files?"
JAB: "✅ files is available"

User: "JAB, do you have GPS?"
JAB: "❌ location is not available"
```

---

### 7️⃣ **NAVIGATION COMMANDS**

#### `jab navigate [page]`
Navigate to different system pages.

**Examples:**
```
User: "JAB, go to dashboard"
JAB: "🔗 Navigating..." [Moves to dashboard]

User: "JAB, open HR section"
JAB: "🔗 Navigating..." [Opens HR module]
```

---

### 8️⃣ **SYSTEM NAVIGATION (Within App)**

#### Search Commands
```
User: "JAB, search for employee Juan"
JAB: "Searching... [Results displayed]"

User: "JAB, find QA reports"
JAB: "🔍 Searching..." [Shows QA reports]
```

#### Page Navigation
```
User: "JAB, take me to the agenda"
JAB: "🔗 Opening agenda..." [Navigates to agenda]

User: "JAB, go to IT Manager"
JAB: "🔗 Navigating..." [Opens IT Manager page]
```

---

### 9️⃣ **UTILITY COMMANDS**

#### Music
```
User: "JAB, play some music"
JAB: "🎵 Opening music player..."

User: "JAB, search for Jazz music"
JAB: "🎵 Searching YouTube for Jazz..."
```

#### Notes
```
User: "JAB, save this note: Important meeting at 3pm"
JAB: "📝 Note saved successfully"
```

#### Language
```
User: "JAB, switch to English"
JAB: "🌐 Switched to English"

User: "JAB, cambiar a español"
JAB: "🌐 Cambiado a español"
```

---

## 🎨 JAB Expressions

JAB changes its appearance based on context:

| Expression | When It Happens | Visual |
|-----------|-----------------|--------|
| **Idle** | Normal operation | Calm eyes, neutral stance |
| **Happy** | Successful action | Crescent eyes, sparkles |
| **Thinking** | Processing request | Eyes looking up |
| **Surprised** | Unexpected result | Large bright eyes |
| **Curious** | Scanning/investigating | Asymmetric wide eyes |
| **Scanning** | Listening/analyzing | Focused intense eyes |
| **Processing** | Computing response | Cycling eye colors |
| **Concerned** | Error/problem | Worried expression |

---

## 🗣️ Natural Language Conversations

JAB also understands natural language and can have conversations:

```
User: "Who are you?"
JAB: "Soy JAB! Tu asistente virtual inteligente con cuerpo EVA 🤖 
Trabajo 24/7 para ayudarte. Puedo navegar el sistema, investigar 
en Google, poner música de YouTube, tomar notas, escribir por ti, 
y mucho más."

User: "What can you do?"
JAB: "I can help you with:
• System navigation
• Google searches
• YouTube music
• Taking notes
• System commands
• File management
• And much more!"

User: "How are you?"
JAB: "I'm full of energy and ready to help! 
What do you need?"
```

---

## 💡 Pro Tips

### 1. **Voice Commands Are Faster**
- Click the microphone icon
- Speak clearly
- JAB transcribes and executes

### 2. **Mixed Input**
- You can use voice OR text
- JAB handles both equally

### 3. **System Integration**
- On Desktop (Electron): Access full system commands
- On Mobile: Limited to device capabilities
- On Web: Browser-limited features

### 4. **Multi-Language**
- JAB auto-detects your language
- Can switch anytime: "JAB, English" or "JAB, Español"

### 5. **Keyboard Shortcuts**
- `Enter` to send text message
- `Esc` to minimize chat
- Click JAB to toggle quick actions

---

## 🔧 Advanced Usage

### System Command Execution (Desktop Only)
```
User: "JAB, exec npm install react"
JAB: "Executing: npm install react
[Installation progress...]"
```

### Batch File Operations
```
User: "JAB, list all PDFs in documents"
JAB: "📁 Files:
  • report1.pdf
  • report2.pdf
  • contract.pdf"
```

### Multi-Step Tasks
```
User: "JAB, open browser and search for React documentation"
JAB: "[Opens browser]
🔍 Searching React docs..."
```

---

## ⚙️ Settings & Preferences

### Language
- Spanish: "JAB, español"
- English: "JAB, English"

### Volume & Speech
- Mute: Click speaker icon
- Speed: Can be adjusted (1.05x default)
- Pitch: Male voice (0.95x pitch)

### Visibility
- Hide: "JAB, hide" or click eye icon
- Show: Click hidden button to reveal

---

## 🐛 Troubleshooting

### Microphone not working
1. Check browser permissions
2. Click the microphone button
3. Grant audio access when prompted

### Commands not recognized
1. Speak clearly and slowly
2. Use exact command keywords
3. Try typing instead of speaking

### JAB not responding
1. Refresh the page
2. Check internet connection
3. Ensure API key is configured

---

## 📱 Platform-Specific Features

### Web Browser
✅ Voice input/output
✅ Navigation
✅ Music search
✅ Google search
✅ Notes taking
✅ Clipboard access

### Desktop (Electron)
✅ All web features +
✅ System commands
✅ File operations
✅ App launching
✅ Screenshots

### Mobile (Android)
✅ All web features +
✅ Battery status
✅ GPS location
✅ Device info
✅ Local files

---

## 🚀 Getting Started

1. **See JAB** - Look for EVA robot floating on screen
2. **Click JAB** - Tap to open chat or quick actions
3. **Speak or Type** - Give a command
4. **JAB Responds** - Voice and expression response
5. **Done!** - JAB executes your command

---

## 📞 Need Help?

- Ask JAB: "What can you do?"
- Check expressions: Watch JAB's face change
- Try natural language: "JAB, help"
- Report issues in GitHub

---

**Version:** 1.0  
**Last Updated:** June 2026  
**Status:** Production Ready ✅
