(async function initTwitchSpoilerDetector() {
  const rules = await window.SpoilerRules.loadRules();
  const PROCESSED_ATTR = 'data-spoiler-detector-processed';
  const observerConfig = { childList: true, subtree: true };

  function getChatContainer() {
    return document.querySelector('[data-test-selector="chat-scrollable-area__message-container"]')
      || document.querySelector('.chat-scrollable-area__message-container')
      || document.querySelector('[aria-label="Chat messages"]')
      || document.querySelector('.chat-room__content');
  }

  function extractUsername(messageNode) {
    const usernameElement = messageNode.querySelector('[data-a-target="chat-message-username"]')
      || messageNode.querySelector('.chat-author__display-name')
      || messageNode.querySelector('[class*="username"]');

    return usernameElement ? usernameElement.textContent.trim() : 'unknown';
  }

  function extractMessageText(messageNode) {
    const messageElement = messageNode.querySelector('[data-a-target="chat-message-text"]')
      || messageNode.querySelector('.text-fragment')
      || messageNode;

    return messageElement ? messageElement.textContent.trim() : '';
  }

  function isProbablyChatMessage(node) {
    if (!(node instanceof HTMLElement)) return false;
    const text = extractMessageText(node);
    if (!text || text.length < 2) return false;

    return Boolean(
      node.querySelector('[data-a-target="chat-message-text"]')
      || node.querySelector('[data-a-target="chat-message-username"]')
      || node.getAttribute('data-a-target') === 'chat-line-message'
      || node.className.toString().includes('chat-line')
    );
  }

  function createRevealButton(originalText) {
    const button = document.createElement('button');
    button.className = 'tsd-reveal-button';
    button.textContent = 'Reveal';
    button.type = 'button';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const spoilerBox = button.closest('.tsd-spoiler-wrapper');
      if (spoilerBox) {
        spoilerBox.classList.toggle('tsd-visible');
        button.textContent = spoilerBox.classList.contains('tsd-visible') ? 'Hide' : 'Reveal';
      }
    });
    button.title = originalText;
    return button;
  }

  function markAsSpoiler(messageNode, detection, originalText) {
    messageNode.classList.add('tsd-spoiler-message');
    messageNode.setAttribute('title', `Spoiler detected by ${detection.method}: ${detection.matchedRule}`);

    const messageElement = messageNode.querySelector('[data-a-target="chat-message-text"]')
      || messageNode.querySelector('.text-fragment')
      || messageNode;

    if (!messageElement || messageElement.querySelector('.tsd-spoiler-wrapper')) return;

    const wrapper = document.createElement('span');
    wrapper.className = 'tsd-spoiler-wrapper';

    const label = document.createElement('span');
    label.className = 'tsd-spoiler-label';
    label.textContent = `⚠ SPOILER (${detection.method})`;

    const hiddenText = document.createElement('span');
    hiddenText.className = 'tsd-hidden-text';
    hiddenText.textContent = originalText;

    const revealButton = createRevealButton(originalText);

    messageElement.textContent = '';
    wrapper.appendChild(label);
    wrapper.appendChild(hiddenText);
    wrapper.appendChild(revealButton);
    messageElement.appendChild(wrapper);
  }

  async function processMessageNode(messageNode) {
    const { spoilerDetectorEnabled = false } = await chrome.storage.local.get(['spoilerDetectorEnabled']);
    if (!spoilerDetectorEnabled) return;
    if (!isProbablyChatMessage(messageNode)) return;
    if (messageNode.getAttribute(PROCESSED_ATTR) === 'true') return;

    messageNode.setAttribute(PROCESSED_ATTR, 'true');

    const message = extractMessageText(messageNode);
    const username = extractUsername(messageNode);
    const detection = window.SpoilerDetector.detectSpoiler(message, rules);

    if (detection.isSpoiler) {
      markAsSpoiler(messageNode, detection, message);
    }

    await window.SpoilerLogger.appendDetectionLog({
      timestamp: new Date().toISOString(),
      channel: window.SpoilerLogger.getCurrentChannel(),
      username,
      message,
      isSpoiler: detection.isSpoiler,
      method: detection.method,
      matchedRule: detection.matchedRule,
      processingTimeMs: detection.processingTimeMs,
      comparisons: detection.comparisons
    });
  }

  function processAddedNodes(nodes) {
    nodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;

      if (isProbablyChatMessage(node)) {
        processMessageNode(node);
      }

      const nestedMessages = node.querySelectorAll?.('[data-a-target="chat-line-message"], .chat-line__message');
      nestedMessages?.forEach((nestedNode) => processMessageNode(nestedNode));
    });
  }

  function processVisibleMessages() {
    const container = getChatContainer();
    if (!container) return;

    processAddedNodes(container.children);
    container
      .querySelectorAll?.('[data-a-target="chat-line-message"], .chat-line__message')
      .forEach((messageNode) => processMessageNode(messageNode));
  }

  function startObserver() {
    const container = getChatContainer();
    if (!container) {
      setTimeout(startObserver, 1000);
      return;
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => processAddedNodes(mutation.addedNodes));
    });

    observer.observe(container, observerConfig);
    processVisibleMessages();
    console.info('[Twitch Spoiler Detector] Observer started.');
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.spoilerDetectorEnabled?.newValue === true) {
      processVisibleMessages();
    }
  });

  startObserver();
})();
