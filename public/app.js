function showMessage(msg, type = 'info') {
  let msgDiv = document.getElementById('message');
  if (!msgDiv) {
    msgDiv = document.createElement('div');
    msgDiv.id = 'message';
    msgDiv.className = 'message';
    document.body.insertBefore(msgDiv, document.body.firstChild.nextSibling);
  }
  msgDiv.textContent = msg;
  msgDiv.className = 'message ' + type;
}

async function download() {
  const url = document.getElementById("urlInput").value.trim();
  if (!url) {
    showMessage("Please enter a valid URL.", "error");
    return;
  }
  showMessage("Downloading...", "info");
  try {
    const response = await fetch("/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (response.ok) {
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "downloaded-media.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
      showMessage("Download complete!", "success");
    } else {
      const err = await response.json().catch(() => ({}));
      showMessage(err.error || "Download failed.", "error");
    }
  } catch (e) {
    showMessage("Network error. Please try again.", "error");
  }
}
