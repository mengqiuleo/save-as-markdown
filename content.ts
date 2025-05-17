import type { PlasmoCSConfig } from "plasmo"
import TurndownService from "turndown"
// https://github.com/mixmark-io/turndown

// 进行 content_scripts 的配置
export const config: PlasmoCSConfig = {
  matches: [
    "https://juejin.cn/*",
    "https://*.zhihu.com/*",
    "https://*.csdn.net/*",
    "https://mp.weixin.qq.com/*"
  ]
}

const turndownService = new TurndownService()

const extractContent = (): string | null => {
  const hostname = window.location.hostname
  let contentEl: HTMLElement | null = null

  if (hostname.includes("juejin.cn")) {
    contentEl = document.querySelector(".markdown-body")
  } else if (hostname.includes("zhihu.com")) {
    contentEl = document.querySelector(".Post-RichTextContainer")
  } else if (hostname.includes("csdn.net")) {
    contentEl = document.querySelector("#content_views")
  } else if (hostname.includes("mp.weixin.qq.com")) {
    contentEl = document.querySelector("#js_content")
  }

  return contentEl?.innerHTML || null
}

const markdown = (() => {
  const html = extractContent()
  if (!html) {
    return "未识别该页面或未提取到正文内容"
  }
  turndownService.remove('style')

  if (window.location.hostname.includes("mp.weixin.qq.com")) {
    turndownService.addRule("customImage", {
      filter: "img",
      replacement: function (content, node: HTMLImageElement) {
        const src = node.getAttribute("data-src") || node.getAttribute("src")
        const alt = node.getAttribute("alt") || ""
        return src ? `![${alt}](${src})` : ""
      }
    })
  }
  return turndownService.turndown(html)
})()

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === "get-markdown") {
    sendResponse(markdown)
  }
})
