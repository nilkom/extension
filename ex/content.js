class ElementSelector {
  constructor() {
    this.selectedElement = null;
    this.enabled = false;
    this.isKeyPressed = false;
    this.currentAnswer = null;
    this.questionsData = [];
    this.init();
    this.loadQuestionData();
  }

  async loadQuestionData() {
    this.questionsData = await this.getQuestionData();
  }

  init() {
    this.injectStyles();
    this.addEventListeners();
    this.createUI();
  }

  injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
        .element-highlight {
          outline: 2px solid rgb(145, 145, 145) !important;
          cursor: crosshair !important;
        }
        .answer-overlay {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 15px;
          border-radius: 8px;
          z-index: 999999;
          max-width: 300px;
        }
      `;
    document.head.appendChild(style);
  }

  createUI() {
    this.overlay = document.createElement("div");
    this.overlay.className = "answer-overlay";
    this.overlay.style.opacity = "0";
    document.body.appendChild(this.overlay);
  }

  addEventListeners() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && !e.shiftKey) {
        this.isKeyPressed = true;
        this.showAnswer();
      }
    });

    document.addEventListener("keyup", (e) => {
      if (e.key === "Control" && !e.shiftKey) {
        this.isKeyPressed = false;
        this.hideAnswer();
      }
    });

    document.addEventListener(
      "mousedown",
      (e) => {
        if (e.ctrlKey) {
          if (e.shiftKey && e.button === 0) {
            this.currentAnswer = null;
            this.hideAnswer();
            this.selectElement(e);
          }
        }
      },
      true
    );

    document.addEventListener("mouseover", this.highlightElement.bind(this));
    document.addEventListener("mouseout", this.removeHighlight.bind(this));
  }

  normalizeText(text) {
    return text
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  showAnswer() {
    if (this.selectedElement) {
      this.overlay.style.opacity = "1";
    }
  }

  hideAnswer() {
    this.overlay.style.opacity = "0";
  }

  enableSelectionMode() {
    this.enabled = true;
    document.body.style.cursor = "crosshair";
  }

  highlightElement(e) {
    if (!this.enabled) return;
    this.removeHighlight();
    this.hoveredElement = e.target;
    this.hoveredElement.classList.add("element-highlight");
  }

  removeHighlight() {
    if (this.hoveredElement) {
      this.hoveredElement.classList.remove("element-highlight");
    }
  }

  tokenSortRatio(a, b) {
    const tokenize = (str) => [...new Set(str.split(" ").sort())];
    const aTokens = tokenize(a);
    const bTokens = tokenize(b);

    const intersection = aTokens.filter((t) => bTokens.includes(t)).length;
    const union = new Set([...aTokens, ...bTokens]).size;

    return Math.round((intersection / union) * 100);
  }

  findAllMatches(inputText) {
    const cleanInput = this.normalizeText(inputText);
    const matches = [];

    for (const item of this.questionsData) {
      const cleanQuestion = this.normalizeText(item.question);
      const score = this.tokenSortRatio(cleanInput, cleanQuestion);

      if (score > 65) {
        matches.push({
          variant: item.variant,
          score: score,
        });
      }
    }

    return this.processMatches(matches);
  }

  findBestMatch(inputText) {
    const matches = this.findAllMatches(inputText);
    return matches.length > 0 ? matches[0].variant : null;
  }

  processMatches(matches) {
    const sorted = matches.sort((a, b) => {
      if (b.score === a.score) {
        return a.variant.localeCompare(b.variant);
      }
      return b.score - a.score;
    });

    const seen = new Set();
    return sorted.filter((m) => {
      if (seen.has(m.variant)) return false;
      seen.add(m.variant);
      return true;
    });
  }

  async getAnswer(text) {
    const matches = this.findAllMatches(text);
    return {
      answer: matches.map((m) => m.variant),
      originalText: text,
    };
  }

  async selectElement(e) {
    e.preventDefault();
    this.selectedElement = e.target;
    this.enabled = false;
    document.body.style.cursor = "default";
    this.removeHighlight();
    if (!this.selectedElement) return;
    const response = await this.getAnswer(
      this.getCleanText(this.selectedElement)
    );
    // console.log(response.answer)
    this.currentAnswer = response.answer;

    this.overlay.innerHTML = this.currentAnswer
      ? this.currentAnswer
          .map(
            (answer, index) =>
              `<div style="color:rgb(145, 145, 145);">${
                index + 1
              }. ${answer}</div>`
          )
          .join("")
      : `<div style="color: #ff4757;">Ответ не найден</div>`;
  }

  async showAnswerForElement() {
    this.overlay.style.opacity = 1;
  }

  getCleanText(element) {
    return element.textContent
      .replace(/[\n\t]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async getQuestionData() {
    try {
      const response = await fetch(chrome.runtime.getURL('qna.json'));
      if (!response.ok) {
        throw new Error('Failed to load questions data');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error loading question data:', error);
      return [];
    }
  }
}

new ElementSelector();
