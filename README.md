# WhistlerBrew.com - Mike's Digital Playground

A retro-to-modern web experience that takes visitors on a journey from 1980s Commodore 64 aesthetics to a modern Pacific Northwest digital forest.

## 🎮 Features

### Interactive Commodore 64 Terminal
- **Click on the terminal** to activate it and start typing
- **Easter Egg Commands:**
  - Type `LOAD "*",8` to discover a hidden message
  - Write BASIC programs like:
    ```
    10 PRINT "HELLO WORLD"
    20 GOTO 10
    RUN
    ```
  - Use `LIST` to see your program
  - Use `NEW` to clear your program
  - Use `RUN` to execute your program (limited to 20 iterations to prevent infinite loops)

### Scroll-Triggered Transitions
As you scroll down the page, you'll experience:
1. **C64 Era (1980s)** - Classic blue background with green text terminal
2. **Transition Zone** - Gradual shift from retro to modern
3. **Modern Web** - Dark theme with cyan accents showcasing Mike's interests
4. **PNW Forest** - Green forest scene with SVG trees and code overlay

### Sections
- **Structure & Wildland Firefighting** - Because someone's gotta save those homes
- **Mexico Escapes** - Beach time and strategic WiFi avoidance
- **Excel & Power BI** - Yes, Mike unironically loves spreadsheets
- **AI Everything** - ChatGPT, Gemini, Claude, and whatever's next

## 📁 File Structure

```
whistlerbrew-demos/
├── index.html                    # Main landing page with C64 terminal
├── stuff-i-build.html            # Projects and demos showcase
├── things-im-working-on.html     # Current work-in-progress timeline
├── other-stuff.html              # Miscellaneous content
├── banner.png                    # Original banner image (kept for reference)
└── README.md                     # This file
```

## 🎨 Design Philosophy

**Tongue-in-Cheek Approach**: This isn't a "real" corporate website—it's a playground where Mike experiments with tech, breaks things, and occasionally fixes them.

**Retro-to-Modern Journey**: The scroll experience takes you through computing history, from 1982 to 2025, reflecting the evolution of web design and Mike's journey through tech.

**Personality-Driven**: Every section has character, from self-deprecating humor to dad jokes in the footer.

## 🛠️ Tech Stack

- **Pure HTML/CSS/JavaScript** - No frameworks, no build tools, just clean code
- **Google Fonts** - VT323 (retro terminal), Courier Prime (code), Roboto (modern)
- **SVG** - Hand-coded trees for the forest section
- **Intersection Observer API** - Smooth scroll-triggered animations
- **Responsive Design** - Works on mobile, tablet, and desktop

## 🚀 Future Enhancements

### Terminal Games
In the future, you could add loadable C64-style games:
- Pong
- Snake
- Breakout
- Text adventures

To implement this, extend the `handleCommand()` function in index.html to recognize specific LOAD commands and launch game modules.

### Image Replacements
The current design uses:
- **SVG trees** - Can be replaced with photos of Pacific Northwest forests
- **Placeholder sections** - Add real project screenshots and photos

**Free stock photo suggestions:**
- [Unsplash](https://unsplash.com) - Search "pacific northwest forest" or "firefighter"
- [Pexels](https://pexels.com) - Search "mexico beach" or "forest"
- [Pixabay](https://pixabay.com) - All royalty-free

### Content Ideas
- **Stuff I Build**: Add real project cards with links, screenshots, GitHub repos
- **Things I'm Working On**: Regular updates on current projects
- **Other Stuff**: Blog posts, tutorials, resource links, contact form

## 🎯 How to Use This Site

1. **For development**: Just open `index.html` in a browser - no server needed!
2. **For deployment**: Upload all files to any web host (GitHub Pages, Netlify, etc.)
3. **For customization**: All styles are inline in each HTML file - easy to modify

## 📝 Code Documentation

### Key JavaScript Functions (index.html)

- `activateTerminal()` - Enables keyboard input on the C64 terminal
- `handleCommand(cmd)` - Processes C64 BASIC commands
- `runBasicProgram()` - Executes stored BASIC program lines
- `IntersectionObserver` - Triggers fade-in animations on scroll

### CSS Custom Properties

Colors are defined as CSS variables in `:root` for easy theming:
- `--c64-bg` / `--c64-text` - Commodore 64 colors
- `--modern-bg` / `--modern-text` - Modern section theme
- `--forest-bg` / `--forest-accent` - Forest section theme
- `--fire-orange` / `--fire-red` - Firefighter-themed accents

## 💡 Easter Eggs

1. **C64 Terminal** - Click and type LOAD "*",8
2. **BASIC Programming** - Write your own programs in the terminal
3. **Code Comments** - Check the HTML source for dad jokes
4. **Footer Text** - "Made with caffeine, stubbornness, and a concerning amount of AI assistance"

## 🤝 Contributing

This is Mike's personal playground, but if you're Mike and you're reading this from the future: good job, past Mike. Now go add some actual content to those placeholder pages.

---

**Built**: December 2025
**Status**: Live & Evolving
**Maintenance**: Whenever Mike has free time (so... eventually)
