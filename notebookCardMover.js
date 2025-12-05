// ==UserScript==
// @name         NotebookLM Chat Card Mover - Fixed Resize Issue
// @namespace    http://tampermonkey.net/
// @version      v1.1.0
// @description
// @author       You
// @match        https://notebooklm.google.com/notebook/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 實用工具函數：Debounce (去抖動)
    function debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
    
    // --- 核心移動邏輯 (不變) ---

    function moveCardUp(element) {
        const parentContainer = element.closest('div.chat-message-pair');
        if (!parentContainer) return;
        const previousContainer = parentContainer.previousElementSibling;
        if (previousContainer) {
            parentContainer.parentNode.insertBefore(parentContainer, previousContainer);
        }
    }

    function moveCardDown(element) {
        const parentContainer = element.closest('div.chat-message-pair');
        if (!parentContainer) return;
        const nextContainer = parentContainer.nextElementSibling;
        if (nextContainer) {
            parentContainer.parentNode.insertBefore(parentContainer, nextContainer.nextElementSibling);
        }
    }

    /**
     * 在 mat-card 旁邊插入上/下移動按鈕。
     * @param {HTMLElement} card - mat-card 元素
     */
    function insertMoveButtons(card) {
        const parent = card.parentNode;
        if (!parent) return;

        // 改進的檢查：不只檢查標記，還要確認按鈕容器真的存在
        const existingButtons = parent.querySelector('.card-mover-buttons');
        if (existingButtons) {
            return; // 按鈕已存在，不需重複添加
        }

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'card-mover-buttons';
        buttonContainer.style.cssText = `
            position: absolute;
            top: 0px;
            right: 0px;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            opacity: 0.2;
            transition: opacity 0.2s;
        `;
        
        // 確保 mat-card 的父元素是定位基準
        parent.style.position = 'relative'; 
        parent.addEventListener('mouseenter', () => buttonContainer.style.opacity = '1');
        parent.addEventListener('mouseleave', () => buttonContainer.style.opacity = '0.2');

        const upButton = document.createElement('button');
        upButton.textContent = '⬆️';
        upButton.title = '上移卡片';
        upButton.style.cssText = 'background: #fff; border: 1px solid #ccc; cursor: pointer; padding: 2px 5px; margin-bottom: 2px;';
        upButton.onclick = (e) => {
            e.stopPropagation();
            moveCardUp(card);
        };
        
        const downButton = document.createElement('button');
        downButton.textContent = '⬇️';
        downButton.title = '下移卡片';
        downButton.style.cssText = 'background: #fff; border: 1px solid #ccc; cursor: pointer; padding: 2px 5px;';
        downButton.onclick = (e) => {
            e.stopPropagation();
            moveCardDown(card);
        };

        buttonContainer.appendChild(upButton);
        buttonContainer.appendChild(downButton);
        parent.appendChild(buttonContainer);
    }
    
    // --- 核心掃描與綁定邏輯 ---

    /**
     * 掃描 chat-panel-content 內的所有卡片並添加按鈕。
     */
    function scanAndAttachButtons() {
        const panel = document.querySelector('div.chat-panel-content');
        if (!panel) {
            return;
        }
        
        // 抓取所有聊天訊息的容器
        const messageContainers = panel.querySelectorAll('div.chat-message-pair');

        // 遍歷容器，尋找 mat-card 並添加按鈕
        messageContainers.forEach(container => {
            const card = container.querySelector('chat-message > div > mat-card');
            
            if (card) {
                insertMoveButtons(card);
            }
        });
    }

    // 將掃描函數去抖動化
    const debouncedScan = debounce(scanAndAttachButtons, 100);
    
    // 新增：處理視窗大小改變
    const debouncedResizeScan = debounce(scanAndAttachButtons, 300);

    // --- 啟動監聽 ---

    // 使用 MutationObserver 專門等待 chat-panel-content 出現
    const initObserver = new MutationObserver((mutationsList, observer) => {
        const panel = document.querySelector('div.chat-panel-content');
        if (panel) {
            observer.disconnect();
            console.log("Chat panel content found. Attaching listeners and initial scan.");
            
            // A. 綁定滾動事件
            panel.addEventListener('scroll', debouncedScan);
            
            // B. 綁定內容變化事件
            const contentObserver = new MutationObserver(debouncedScan);
            contentObserver.observe(panel, { childList: true, subtree: true });

            // C. 綁定視窗大小改變事件 (修復重點!)
            window.addEventListener('resize', debouncedResizeScan);

            // D. 執行首次掃描
            scanAndAttachButtons();
        }
    });

    // 從 body 開始監聽，直到 chat-panel-content 出現
    initObserver.observe(document.body, { childList: true, subtree: true });

})();