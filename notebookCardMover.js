// ==UserScript==
// @name         NotebookLM Chat Card Mover - Floating Controls
// @namespace    http://tampermonkey.net/
// @version      v2.0.0
// @description  Navigate between chat cards with fixed floating buttons
// @author       You
// @match        https://notebooklm.google.com/notebook/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    let currentCard = null;
    let floatingControls = null;

    // 實用工具函數：Debounce
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    // 實用工具函數：Throttle (節流)
    function throttle(func, delay) {
        let lastCall = 0;
        return function(...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func.apply(this, args);
            }
        };
    }

    // 檢查元素是否在視窗中可見
    function isElementInViewport(el, threshold = 0.5) {
        const rect = el.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;

        const vertInView = rect.top <= windowHeight * (1 - threshold) && rect.bottom >= windowHeight * threshold;
        const horInView = rect.left <= windowWidth && rect.right >= 0;

        return vertInView && horInView;
    }

    // 找出當前最可見的卡片
    function findMostVisibleCard() {
        const panel = document.querySelector('div.chat-panel-content');
        if (!panel) return null;

        const messageContainers = panel.querySelectorAll('div.chat-message-pair');
        let mostVisibleCard = null;
        let maxVisibility = 0;

        messageContainers.forEach(container => {
            const card = container.querySelector('chat-message > div > mat-card');
            if (!card) return;

            const rect = card.getBoundingClientRect();
            const windowHeight = window.innerHeight || document.documentElement.clientHeight;

            // 計算可見度百分比
            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(windowHeight, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const visibility = visibleHeight / rect.height;

            if (visibility > maxVisibility && visibility > 0.3) {
                maxVisibility = visibility;
                mostVisibleCard = card;
            }
        });

        return mostVisibleCard;
    }

    // 更新當前選中的卡片
    function updateCurrentCard() {
        const newCard = findMostVisibleCard();

        if (newCard !== currentCard) {
            // 移除舊卡片的高亮
            if (currentCard) {
                currentCard.style.outline = '';
            }

            currentCard = newCard;

            // 添加新卡片的高亮
            if (currentCard) {
                currentCard.style.outline = '2px solid rgba(66, 133, 244, 0.5)';
                updateFloatingControlsState();
            }
        }
    }

    // 更新懸浮按鈕的啟用/禁用狀態
    function updateFloatingControlsState() {
        if (!floatingControls || !currentCard) return;

        const upBtn = floatingControls.querySelector('.move-up-btn');
        const downBtn = floatingControls.querySelector('.move-down-btn');

        const parentContainer = currentCard.closest('div.chat-message-pair');
        if (!parentContainer) return;

        // 檢查是否有上一個/下一個元素
        const hasPrevious = !!parentContainer.previousElementSibling;
        const hasNext = !!parentContainer.nextElementSibling;

        upBtn.disabled = !hasPrevious;
        upBtn.style.opacity = hasPrevious ? '1' : '0.3';
        upBtn.style.cursor = hasPrevious ? 'pointer' : 'not-allowed';

        downBtn.disabled = !hasNext;
        downBtn.style.opacity = hasNext ? '1' : '0.3';
        downBtn.style.cursor = hasNext ? 'pointer' : 'not-allowed';
    }

    // 滾動到上一張卡片
    function moveCardUp() {
        if (!currentCard) return;
        const parentContainer = currentCard.closest('div.chat-message-pair');
        if (!parentContainer) return;

        const previousContainer = parentContainer.previousElementSibling;
        if (previousContainer) {
            const previousCard = previousContainer.querySelector('chat-message > div > mat-card');
            if (previousCard) {
                previousCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // 等待滾動完成後更新當前卡片
                setTimeout(() => {
                    currentCard.style.outline = '';
                    currentCard = previousCard;
                    currentCard.style.outline = '2px solid rgba(66, 133, 244, 0.5)';
                    updateFloatingControlsState();
                }, 500);
            }
        }
    }

    function moveCardDown() {
        if (!currentCard) return;
        const parentContainer = currentCard.closest('div.chat-message-pair');
        if (!parentContainer) return;

        const nextContainer = parentContainer.nextElementSibling;
        if (nextContainer) {
            const nextCard = nextContainer.querySelector('chat-message > div > mat-card');
            if (nextCard) {
                nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // 等待滾動完成後更新當前卡片
                setTimeout(() => {
                    currentCard.style.outline = '';
                    currentCard = nextCard;
                    currentCard.style.outline = '2px solid rgba(66, 133, 244, 0.5)';
                    updateFloatingControlsState();
                }, 500);
            }
        }
    }

    // 創建懸浮控制面板
    function createFloatingControls() {
        if (floatingControls) return;

        const container = document.createElement('div');
        container.className = 'card-mover-floating-controls';
        container.style.cssText = `
            position: fixed;
            top: 0px;
            right: 50%;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(10px);
            padding: 12px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            transition: opacity 0.3s;
        `;

        const buttonStyle = `
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            cursor: pointer;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 20px;
            transition: all 0.2s;
            min-width: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const upButton = document.createElement('button');
        upButton.className = 'move-up-btn';
        upButton.id = 'myUpButton';
        upButton.textContent = '⬆️';  // 改用 textContent 避免 TrustedHTML 錯誤
        upButton.title = '跳到上一張卡片';
        upButton.style.cssText = buttonStyle;
        console.log('✅ Up button created:', upButton);
        upButton.onmouseover = () => {
            if (!upButton.disabled) {
                upButton.style.background = 'rgba(255, 255, 255, 0.2)';
                upButton.style.transform = 'scale(1.05)';
            }
        };
        upButton.onmouseout = () => {
            upButton.style.background = 'rgba(255, 255, 255, 0.1)';
            upButton.style.transform = 'scale(1)';
        };
        upButton.onclick = moveCardUp;

        const downButton = document.createElement('button');
        downButton.className = 'move-down-btn';
        downButton.id = 'myDownButton';
        downButton.textContent = '⬇️';  // 改用 textContent 避免 TrustedHTML 錯誤
        downButton.title = '跳到下一張卡片';
        downButton.style.cssText = buttonStyle;
        console.log('✅ Down button created:', downButton);
        downButton.onmouseover = () => {
            if (!downButton.disabled) {
                downButton.style.background = 'rgba(255, 255, 255, 0.2)';
                downButton.style.transform = 'scale(1.05)';
            }
        };
        downButton.onmouseout = () => {
            downButton.style.background = 'rgba(255, 255, 255, 0.1)';
            downButton.style.transform = 'scale(1)';
        };
        downButton.onclick = moveCardDown;

        container.appendChild(upButton);
        container.appendChild(downButton);
        document.body.appendChild(container);

        console.log('✅ Floating controls appended to body!');
        console.log('🔍 Check buttons in DOM:');
        console.log('  - Up button:', document.getElementById('myUpButton'));
        console.log('  - Down button:', document.getElementById('myDownButton'));

        floatingControls = container;
    }

    // 節流版本的更新函數
    const throttledUpdate = throttle(updateCurrentCard, 150);

    // 初始化
    function init() {
        const panel = document.querySelector('div.chat-panel-content');
        if (!panel) {
            console.log("Panel not found yet...");
            return;
        }

        console.log("✅ Chat panel found. Initializing floating controls...");
        console.log("Panel element:", panel);

        // 創建懸浮控制面板
        createFloatingControls();

        // 綁定滾動事件
        panel.addEventListener('scroll', throttledUpdate);

        // 綁定視窗大小改變事件
        window.addEventListener('resize', debounce(updateCurrentCard, 300));

        // 監聽 DOM 變化
        const contentObserver = new MutationObserver(debounce(updateCurrentCard, 200));
        contentObserver.observe(panel, { childList: true, subtree: true });

        // 初始化當前卡片
        updateCurrentCard();
    }

    // 等待頁面載入
    console.log("🚀 Script started, waiting for chat-panel-content...");

    const initObserver = new MutationObserver(() => {
        const panel = document.querySelector('div.chat-panel-content');
        if (panel) {
            console.log("🎯 Panel detected! Disconnecting observer and initializing...");
            initObserver.disconnect();
            init();
        }
    });

    initObserver.observe(document.body, { childList: true, subtree: true });

})();