import { useState } from "react";

function IndexPopup() {
  const [status, setStatus] = useState("")

  const handleCopyMarkdown = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab?.id) {
      setStatus("❌ 无法获取当前标签页")
      return
    }

    chrome.tabs.sendMessage(tab.id, "get-markdown", (response) => {
      if (!response || typeof response !== "string") {
        setStatus("❌ 未识别内容或未支持的网站")
        return
      }
      navigator.clipboard.writeText(response).then(() => {
        setStatus("✅ 已复制 Markdown 到剪贴板")
      })
    })
  }

  return (
    <div
      style={{
        padding: 16
      }}>
      <button onClick={handleCopyMarkdown}>copy as markdown🚀</button>
      <p>{status}</p>
    </div>
  )
}

export default IndexPopup
