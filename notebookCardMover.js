// ==UserScript==
// @name         NotebookLM Chat Card Mover - Draggable & Safe
// @namespace    http://tampermonkey.net/
// @version      v2.2.0
// @description  Navigate between chat cards with draggable floating buttons (Boundary Safe)
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
            if (currentCard) {
                currentCard.style.outline = '';
            }
            currentCard = newCard;
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

        const hasPrevious = !!parentContainer.previousElementSibling;
        const hasNext = !!parentContainer.nextElementSibling;

        upBtn.disabled = !hasPrevious;
        upBtn.style.opacity = hasPrevious ? '1' : '0.3';
        upBtn.style.cursor = hasPrevious ? 'pointer' : 'not-allowed';

        downBtn.disabled = !hasNext;
        downBtn.style.opacity = hasNext ? '1' : '0.3';
        downBtn.style.cursor = hasNext ? 'pointer' : 'not-allowed';
    }

    function moveCardUp() {
        if (!currentCard) return;
        const parentContainer = currentCard.closest('div.chat-message-pair');
        if (!parentContainer) return;

        const previousContainer = parentContainer.previousElementSibling;
        if (previousContainer) {
            const previousCard = previousContainer.querySelector('chat-message > div > mat-card');
            if (previousCard) {
                previousCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
                setTimeout(() => {
                    currentCard.style.outline = '';
                    currentCard = nextCard;
                    currentCard.style.outline = '2px solid rgba(66, 133, 244, 0.5)';
                    updateFloatingControlsState();
                }, 500);
            }
        }
    }

    // ★★★ 核心修改：增加邊界檢查的拖曳功能 ★★★
    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        element.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            // 允許拖曳，但避免選取文字
            e.preventDefault();

            // 獲取滑鼠初始位置
            pos3 = e.clientX;
            pos4 = e.clientY;

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;

            element.style.cursor = 'grabbing';
            element.style.transition = 'none';
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();

            // 計算位移量
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            // 計算新的 Top 和 Left
            let newTop = element.offsetTop - pos2;
            let newLeft = element.offsetLeft - pos1;

            // --- 防呆邏輯開始 ---
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const elWidth = element.offsetWidth;
            const elHeight = element.offsetHeight;

            // 設定邊界 (保留 0px 的邊距，確保完全在畫面內)
            const minTop = 0;
            const maxTop = windowHeight - elHeight;
            const minLeft = 0;
            const maxLeft = windowWidth - elWidth;

            // 限制 Top
            if (newTop < minTop) newTop = minTop;
            if (newTop > maxTop) newTop = maxTop;

            // 限制 Left
            if (newLeft < minLeft) newLeft = minLeft;
            if (newLeft > maxLeft) newLeft = maxLeft;
            // --- 防呆邏輯結束 ---

            // 應用新位置
            element.style.top = newTop + "px";
            element.style.left = newLeft + "px";
            element.style.right = 'auto'; // 清除舊的 right 設定
            element.style.bottom = 'auto';
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            element.style.cursor = 'move';
            element.style.transition = 'opacity 0.3s';
        }
    }

    // ★★★ 新增：確保按鈕始終在視窗內的函數 (用於視窗縮放時) ★★★
    function ensureControlsInView() {
        if (!floatingControls) return;

        const rect = floatingControls.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let newTop = floatingControls.offsetTop;
        let newLeft = floatingControls.offsetLeft;
        let needsUpdate = false;

        // 檢查下方邊界
        if (newTop + rect.height > windowHeight) {
            newTop = windowHeight - rect.height - 10; // 留 10px 緩衝
            needsUpdate = true;
        }
        // 檢查右方邊界
        if (newLeft + rect.width > windowWidth) {
            newLeft = windowWidth - rect.width - 10;
            needsUpdate = true;
        }
        // 檢查上方邊界
        if (newTop < 0) {
            newTop = 10;
            needsUpdate = true;
        }
        // 檢查左方邊界
        if (newLeft < 0) {
            newLeft = 10;
            needsUpdate = true;
        }

        if (needsUpdate) {
            floatingControls.style.top = `${newTop}px`;
            floatingControls.style.left = `${newLeft}px`;
            floatingControls.style.right = 'auto';
        }
    }

    // 創建懸浮控制面板
    function createFloatingControls() {
        if (floatingControls) return;

        const container = document.createElement('div');
        container.className = 'card-mover-floating-controls';

        container.style.cssText = `
            position: fixed;
            top: 20px;
            left: calc(100% - 80px); /* 預設放在右上角 */
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
            cursor: move;
            user-select: none;
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
        upButton.textContent = '⬆️';
        upButton.title = '跳到上一張卡片';
        upButton.style.cssText = buttonStyle;
        upButton.onmouseover = () => { if (!upButton.disabled) upButton.style.background = 'rgba(255, 255, 255, 0.2)'; };
        upButton.onmouseout = () => { upButton.style.background = 'rgba(255, 255, 255, 0.1)'; };
        upButton.onclick = moveCardUp;

        const downButton = document.createElement('button');
        downButton.className = 'move-down-btn';
        downButton.textContent = '⬇️';
        downButton.title = '跳到下一張卡片';
        downButton.style.cssText = buttonStyle;
        downButton.onmouseover = () => { if (!downButton.disabled) downButton.style.background = 'rgba(255, 255, 255, 0.2)'; };
        downButton.onmouseout = () => { downButton.style.background = 'rgba(255, 255, 255, 0.1)'; };
        downButton.onclick = moveCardDown;

        container.appendChild(upButton);
        container.appendChild(downButton);
        document.body.appendChild(container);

        makeDraggable(container);

        floatingControls = container;
        console.log('✅ Floating controls created');
    }

    const throttledUpdate = throttle(updateCurrentCard, 150);

    function init() {
        const panel = document.querySelector('div.chat-panel-content');
        if (!panel) return;

        createFloatingControls();

        panel.addEventListener('scroll', throttledUpdate);

        // 合併原本的 resize 事件與新的防呆事件
        window.addEventListener('resize', () => {
            debounce(updateCurrentCard, 300)();
            ensureControlsInView(); // 視窗縮放時，把按鈕推回來
        });

        const contentObserver = new MutationObserver(debounce(updateCurrentCard, 200));
        contentObserver.observe(panel, { childList: true, subtree: true });

        updateCurrentCard();
    }

    const initObserver = new MutationObserver(() => {
        const panel = document.querySelector('div.chat-panel-content');
        if (panel) {
            initObserver.disconnect();
            init();
        }
    });

    initObserver.observe(document.body, { childList: true, subtree: true });

})();