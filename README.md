# Book of Ra Slot Machine Game

> A fully functional, interactive Book of Ra slot game built with vanilla JavaScript. Play the iconic 5-reel, 10-payline Egyptian-themed slot machine directly in your browser with realistic animations, free spins, expanding wilds, and gamble features.

[![GitHub](https://img.shields.io/badge/GitHub-View%20Repository-181717?logo=github)](https://github.com/Jona-Buck/Book-of-Ra-made-with-ChatGPT)
[![License](https://img.shields.io/badge/License-MIT-green)](#license)
[![Stars](https://img.shields.io/github/stars/Jona-Buck/Book-of-Ra-made-with-ChatGPT?style=flat-square)](https://github.com/Jona-Buck/Book-of-Ra-made-with-ChatGPT/stargazers)
[![Forks](https://img.shields.io/github/forks/Jona-Buck/Book-of-Ra-made-with-ChatGPT?style=flat-square)](https://github.com/Jona-Buck/Book-of-Ra-made-with-ChatGPT/network)
[![Last Commit](https://img.shields.io/github/last-commit/Jona-Buck/Book-of-Ra-made-with-ChatGPT?style=flat-square)](https://github.com/Jona-Buck/Book-of-Ra-made-with-ChatGPT/commits/main)

---

## 🎰 Live Demo

[**Play Book of Ra Now** ▶️](https://jona-buck.github.io/Book-of-Ra-made-with-ChatGPT/)

Launch the game directly on GitHub Pages. No downloads, no installation required—just spin the reels!

---

## ✨ Key Features

- **5-Reel, 10-Payline Slot Machine** – Authentic Book of Ra gameplay mechanics with configurable bet sizes (€0.10–€10.00)
- **Expanding Wild Symbols** – During free spins, special symbols expand to fill entire reels for maximum win potential
- **10 Free Spins Feature** – Triggered by 3+ scatter symbols (Books), with randomly selected expanding symbols
- **50/50 Gamble Feature** – Double your winnings by guessing red or black in the high-risk mini-game
- **Realistic Animations** – Smooth reel spinning with tension deceleration and satisfying win effects using Lottie Web
- **Pay Tables & Paytables** – View detailed symbol values (3-of-a-kind, 4-of-a-kind, 5-of-a-kind payouts)
- **Accurate RTP Simulation** – Return to Player rate calibrated at ~95.1% based on 1.5M spin simulations
- **Auto Spin Mode** – Set and forget with automatic spin sequences
- **Responsive Design** – Fully optimized for desktop, tablet, and mobile devices
- **Sound Control** – Toggle audio feedback for spins and wins
- **Balance & Win Tracking** – Real-time display of current balance, winnings, and total stake
- **Immersive UI** – Egyptian-themed design with gold accents, vintage typography, and atmospheric styling

---

## 🎮 How to Play

### Getting Started

1. **Set Your Bet**: Click the `+` / `−` buttons to adjust your stake (€0.10–€10.00 per spin)
2. **Spin the Reels**: Press the large red `DREHEN` (Spin) button to start
3. **Watch for Wins**: Matching symbols on paylines generate instant payouts
4. **Trigger Free Spins**: Land 3+ Books to activate 10 free spins with an expanding symbol
5. **Gamble Your Winnings**: After a win, press the `50/50` button to risk your winnings on a red/black card game

### Game Mechanics

- **Scatter Symbols (Book)**: Acts as both wild and scatter; 3+ anywhere triggers free spins
- **Expanding Wilds**: During free spins, a randomly selected symbol expands to fill entire reels
- **Payline Wins**: Symbols must connect from left to right across paylines
- **Min. Symbols**: Most symbols need 3+ matches; Explorers (expanding symbol) pay from 2 matches

---

## 🛠️ Technology Stack

| Technology | Purpose |
|-----------|---------|
| **JavaScript (Vanilla)** | Core game engine, reel physics, win calculation |
| **HTML5** | Semantic structure, canvas-ready markup |
| **CSS3** | Responsive styling, animations, visual effects |
| **Lottie Web** | Smooth 60fps animations and particle effects |
| **GitHub Pages** | Free, instant deployment |

### Why Vanilla JavaScript?

No frameworks or build tools needed. The game is lightweight (~30KB minified), loads instantly, and runs smoothly on any device. Perfect for learning advanced JavaScript patterns: DOM manipulation, event handling, timing & animations, and game state management.

---

## 📁 Project Structure

```
Book-of-Ra-made-with-ChatGPT/
├── index.html          # Main HTML entry point
├── js/
│   ├── config.js       # Game configuration (symbols, paylines, bets, RTP settings)
│   ├── engine.js       # Core spin engine, win evaluation, free spin logic
│   ├── reel.js         # Reel animation & physics (momentum, deceleration)
│   ├── ui.js           # UI event handlers & display updates
│   ├── gamble.js       # 50/50 gamble game (red/black card choice)
│   ├── freespins.js    # Free spin state & expanding wild animation
│   └── win.js          # Win animation sequences & visual effects
├── css/
│   └── style.css       # Responsive styling, animations, theme
├── assets/
│   ├── bg.webp         # Reel background image
│   ├── [symbol-names].webp  # Symbol graphics (A, K, Q, J, 10, Isis, Scarab, Adventurer, Book)
│   └── [animation files]    # Lottie JSON animations
└── README.md           # This file

```

### How It Fits Together

1. **Config** sets up symbols, paylines, and bet amounts
2. **Engine** manages the spin sequence: all reels start fast, then stop sequentially with configurable tension
3. **Reel** handles physics-based deceleration and visual positioning
4. **UI** responds to button clicks (spin, auto, bet adjustment, info overlay)
5. **Win** runs animations for payline matches, free spin triggers, and big win effects
6. **Gamble** presents the 50/50 card game on demand

---

## 🚀 Quick Start

### Play Directly (No Installation)

Simply open [the live demo](https://jona-buck.github.io/Book-of-Ra-made-with-ChatGPT/) in your web browser. The game runs entirely in your browser—no server needed.

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Jona-Buck/Book-of-Ra-made-with-ChatGPT.git
   cd Book-of-Ra-made-with-ChatGPT
   ```

2. **Serve locally (pick one):**
   
   **Option A: Python 3**
   ```bash
   python -m http.server 8000
   ```
   
   **Option B: Node.js (http-server)**
   ```bash
   npx http-server
   ```
   
   **Option C: Live Server (VS Code extension)**
   - Install the "Live Server" extension
   - Right-click `index.html` → "Open with Live Server"

3. **Open in browser:**
   ```
   http://localhost:8000 (or your server's port)
   ```

---

## 🎯 Gameplay Rules

### Symbols & Payouts

| Symbol | Name | 3-of-a-Kind | 4-of-a-Kind | 5-of-a-Kind |
|--------|------|-------------|------------|-------------|
| 📘 | Book (Wild/Scatter) | 2× | 20× | 200× |
| 🧑 | Adventurer (Expanding) | 5× | 100× | 1000× |
| 🪲 | Scarab | 4× | 40× | 400× |
| 👑 | Isis | 5× | 50× | 500× |
| 🂡 | Ace | 2× | 23× | 210× |
| 🂮 | King | 2× | 21× | 185× |
| 🂭 | Queen | 2× | 19× | 160× |
| 🂫 | Jack | 2× | 19× | 160× |
| 🔟 | 10 | 2× | 16× | 140× |

### Free Spins Mechanics

- **Trigger**: Land 3, 4, or 5 Books anywhere on the reels
- **Award**: 10 free spins with one expanding symbol (randomly selected)
- **Expanding Wild**: During free spins, if your chosen symbol lands on 3+ reels, it fills all 3 cells of those reels
- **Retrigger**: Free spins end after 10 spins or until you run out of balance

### 50/50 Gamble Feature

- **When Available**: After any winning spin (not during free spins)
- **How It Works**: Guess whether the next card is red or black
- **Win**: Double your current winnings; keep playing or take the money
- **Lose**: Lose all current winnings; return to regular play

### RTP & Odds

- **Return to Player (RTP)**: ~95.1% (calibrated from 1.5 million spin simulations)
- **Free Spin Frequency**: Approximately 1 in 160 spins
- **Bet Range**: €0.10 to €10.00 per spin (total stake = 10 paylines × bet per line)

---

## 🎨 Customization Guide

### Modify Bet Amounts

Edit `js/config.js`:
```javascript
const BETS = [0.1, 0.2, 0.5, 1, 2, 5, 10]; // Add or remove bet values
```

### Adjust Reel Spin Speed

Edit `js/engine.js`:
```javascript
const INIT_MS = 650;      // ms all reels spin before any stops (increase = slower start)
const NORMAL_DECEL = 480; // ms for normal reel stop (increase = slower stop)
const TENSION_DECEL = 1400; // ms for dramatic tension stop (increase = more drama)
```

### Change Starting Balance

Edit `js/config.js`:
```javascript
const S = { bal: 1000, ... }; // Change 1000 to desired starting amount
```

### Swap Symbol Images

Replace WebP files in `/assets/` with your own (same dimensions). Update image paths in `config.js`:
```javascript
const I = { A: "./assets/custom-ace.webp", ... };
```

### Adjust RTP (Return to Player)

Edit symbol weights in `js/config.js`:
```javascript
const SY = [
  { id: 'book', w: 2, ... },   // Increase w = more frequent
  { id: 'exp', w: 3, ... },
  // ...
];
```

---

## 🧪 Code Examples

### Triggering a Manual Spin

```javascript
spin(); // Initiates a single spin (if not already spinning)
```

### Accessing Game State

```javascript
console.log(S.bal);  // Current balance
console.log(S.win);  // Current win amount
console.log(S.fs);   // Remaining free spins
console.log(S.fsym); // Current expanding symbol (during free spins)
```

### Checking Payline Combinations

The game evaluates all 10 paylines (defined in `config.js`):
```javascript
const PL = [
  [1, 1, 1, 1, 1], // Line 1: middle row across all reels
  [0, 0, 0, 0, 0], // Line 2: top row across all reels
  // ... 8 more lines
];
```

---

## 📊 Performance & Optimization

- **Lightweight**: ~30KB total code + assets
- **No Dependencies**: Vanilla JS only; Lottie is loaded via CDN
- **Fast Load Time**: Sub-second page render on modern connections
- **Smooth Animations**: 60 FPS on desktop; optimized for mobile
- **Responsive**: Adapts to all screen sizes (mobile-first CSS)

---

## ❓ FAQ

**Q: Is this a real gambling game?**
A: No. This is a game simulation for entertainment and educational purposes only. It uses a virtual balance with no real money, payouts, or financial implications. Use it to learn JavaScript game development, not for gambling.

**Q: Can I use this code in my own project?**
A: Yes! The project is open-source under the MIT License. You're free to use, modify, and distribute it—just include the original license.

**Q: How do I deploy this to my own website?**
A: Simply upload the entire folder to your web server, or use GitHub Pages (free). No build process, no backend needed.

**Q: Why does the RTP vary from spin to spin?**
A: The RTP of ~95.1% is an average over many spins. Short-term variance is normal in slot games. Play long enough and the average win/loss should converge to the expected RTP.

**Q: Can I modify the symbols or payouts?**
A: Absolutely! Edit `js/config.js` to change symbols, paylines, payouts, and bet amounts. You have full control.

**Q: Is there a mobile app version?**
A: Not yet, but the web version is mobile-responsive and works great on phones/tablets. You can add it to your home screen for a native app experience.

**Q: How do I report a bug?**
A: Open a [GitHub issue](https://github.com/Jona-Buck/Book-of-Ra-made-with-ChatGPT/issues) with details about the bug and steps to reproduce.

---

## 📚 Learning Resources

This project is an excellent resource for learning:

- **DOM Manipulation**: Event listeners, dynamic element updates, CSS class toggling
- **CSS Animations**: Keyframe animations, 3D transforms, responsive design with `clamp()`
- **Game State Management**: Tracking game state (balance, wins, free spins, etc.)
- **Physics Simulation**: Reel momentum and deceleration (easing functions)
- **Event Handling**: Button clicks, window resize, async operations with `setTimeout`
- **Web Performance**: Asset optimization, vanilla JS (no frameworks), CDN usage
- **Responsive Design**: Mobile-first approach, Flexbox, viewport units

---

## 🤝 Contributing

Contributions are welcome! Here's how to help:

1. **Fork** this repository
2. **Create a branch** for your feature (`git checkout -b feature/amazing-feature`)
3. **Make your changes** and test thoroughly
4. **Commit** with clear messages (`git commit -m "Add amazing feature"`)
5. **Push** to your branch (`git push origin feature/amazing-feature`)
6. **Open a Pull Request** with a description of your changes

### Ideas for Contributions

- Add new symbols or paylines
- Implement additional bonus features (mystery wins, progressive jackpot)
- Improve animations or visual effects
- Enhance mobile responsiveness
- Add multilingual support
- Create unit tests
- Optimize performance
- Document code more thoroughly
- Add keyboard controls
- Create a settings/options panel

---

## 📜 License

This project is licensed under the **MIT License**—see the [LICENSE](LICENSE) file for details.

### What You Can Do

✅ Use commercially  
✅ Modify the code  
✅ Distribute copies  
✅ Use privately  

### What You Must Do

📋 Include the original license and copyright notice

---

## 🙏 Acknowledgments

- **Book of Ra Original Game**: Inspiration from the classic Novomaticslot machine
- **Lottie Web**: For smooth, performant animations
- **GitHub Pages**: Free hosting for instant deployment
- **ChatGPT**: Assisted in code generation and optimization
- **Community**: Thanks to everyone who plays, reports issues, and contributes!

---

## 📞 Support & Contact

- **Issues**: [Open a GitHub Issue](https://github.com/Jona-Buck/Book-of-Ra-made-with-ChatGPT/issues)
- **Questions**: Ask in the GitHub Discussions tab
- **GitHub**: [@Jona-Buck](https://github.com/Jona-Buck)

---

## 🎯 Roadmap

### ✅ Completed

- Core 5-reel, 10-payline slot game
- Free spins with expanding wilds
- 50/50 gamble feature
- Responsive design (mobile/tablet/desktop)
- Realistic animations and effects
- Sound toggle

### 🔮 Planned Features

- [ ] Leaderboard / stats tracking (local storage)
- [ ] Multiplayer mode (WebSocket support)
- [ ] Additional bonus games / mini-games
- [ ] Progressive jackpot simulation
- [ ] Theme customization (dark/light mode)
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Progressive Web App (PWA) support
- [ ] Internationalization (i18n) – multiple languages
- [ ] Replay / history of past spins
- [ ] High-score sharing

---

## 📈 GitHub SEO Keywords

**Primary Keywords**: Book of Ra, slot machine game, JavaScript game, 5-reel slots, free spins, web game, HTML5 game, gambling game simulation

**Secondary Keywords**: vanilla JavaScript, game development, casino game, reel animations, RNG, game engine, educational game, open-source game

---

**Made with ❤️ and JavaScript**

[⬆ Back to Top](#book-of-ra-slot-machine-game)
