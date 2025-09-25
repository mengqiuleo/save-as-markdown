import type { PlasmoCSConfig } from "plasmo"
import TurndownService from "turndown"
// https://github.com/mixmark-io/turndown

// 进行 content_scripts 的配置
export const config: PlasmoCSConfig = {
  matches: [
    "https://juejin.cn/*",
    "https://*.zhihu.com/*",
    "https://*.csdn.net/*",
    "https://mp.weixin.qq.com/*",
    "https://*.yuque.com/*",
    "https://*.feishu.cn/*",
    "https://*.larksuite.com/*",
  ]
}


const turndownService = new TurndownService()

const waitForElement = (selector: string): Promise<HTMLElement> => {
  return new Promise((resolve) => {
    const el = document.querySelector(selector)
    if (el) return resolve(el as HTMLElement)

    const observer = new MutationObserver((_mutations, obs) => {
      const el = document.querySelector(selector)
      if (el) {
        resolve(el as HTMLElement)
        obs.disconnect()
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
  })
}

function normalizeYuqueContent(root: HTMLElement): string {
  const container = document.createElement("div")

  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      // 纯文本节点
      const text = node.textContent?.trim()
      if (text) {
        const p = document.createElement("p")
        p.textContent = text
        container.appendChild(p)
      }
    } else if (node instanceof HTMLElement) {
      // 段落
      if (node.classList.contains("ne-paragraph")) {
        const p = document.createElement("p")
        p.innerHTML = node.innerHTML
        container.appendChild(p)
      }
      // 标题
      else if (node.classList.contains("ne-heading")) {
        const level = node.dataset.level || "1"
        const h = document.createElement(`h${level}`)
        h.innerHTML = node.innerHTML
        container.appendChild(h)
      }
      // 代码块
      else if (node.classList.contains("ne-code")) {
        const pre = document.createElement("pre")
        const code = document.createElement("code")
        code.textContent = node.textContent || ""
        pre.appendChild(code)
        container.appendChild(pre)
      }
      // 图片
      else if (node.classList.contains("ne-image")) {
        const imgEl = node.querySelector("img")
        if (imgEl?.src) {
          const img = document.createElement("img")
          img.setAttribute("src", imgEl.src)
          img.setAttribute("alt", imgEl.alt || "")
          container.appendChild(img)
        }
      }
      // 其他容器，递归处理
      else {
        const html = normalizeYuqueContent(node)
        if (html) {
          const div = document.createElement("div")
          div.innerHTML = html
          container.appendChild(div)
        }
      }
    }
  })

  return container.innerHTML
}






const extractContent = async (): Promise<string | null> => {
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
  } else if (hostname.includes("feishu.cn") || hostname.includes("larksuite.com")) {
    contentEl = await waitForElement(".protyle-wysiwyg, .docs-article, .ce-paragraph")
  } else if (hostname.includes("yuque.com")) {
    // contentEl = document.querySelector("article.article-content")
    contentEl = await waitForElement("div.ne-viewer-body")
  }

  console.log("%c[Content Script] Extracted content element:", "color: green; font-weight: bold;", contentEl)


  if (hostname.includes("yuque.com") && contentEl) {
    const normalizedHTML = normalizeYuqueContent(contentEl)
    return normalizedHTML
  }

  return contentEl?.innerHTML || null
}


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === "get-markdown") {
    extractContent().then((html) => {
      if (!html) {
        sendResponse("未识别该页面或未提取到正文内容")
        return
      }

      turndownService.remove("style")

      if (window.location.hostname.includes("mp.weixin.qq.com")) {
        turndownService.addRule("customImage", {
          filter: "img",
          replacement: (content, node: HTMLImageElement) => {
            const src = node.getAttribute("data-src") || node.getAttribute("src")
            const alt = node.getAttribute("alt") || ""
            return src ? `![${alt}](${src})` : ""
          }
        })
      }

      if (window.location.hostname.includes("feishu.cn") || window.location.hostname.includes("larksuite.com")) {
        turndownService.addRule("feishuImage", {
          filter: "img",
          replacement: (content, node: HTMLImageElement) => {
            const src = node.getAttribute("data-src") || node.getAttribute("src")
            const alt = node.getAttribute("alt") || ""
            return src ? `![${alt}](${src})` : ""
          }
        })
      }

      if (window.location.hostname.includes("yuque.com")) {
        turndownService.addRule("yuqueImage", {
          filter: "img",
          replacement: (content, node: HTMLImageElement) => {
            const src = node.getAttribute("data-src") || node.getAttribute("src")
            const alt = node.getAttribute("alt") || ""
            return src ? `![${alt}](${src})` : ""
          }
        })
      }

      const markdown = turndownService.turndown(html)
      sendResponse(markdown)
    })

    return true
  }
})
