async function download() {
  const url = document.getElementById("urlInput").value.trim();
  if (!url) {
    alert("Please enter a valid URL.");
    return;
  }
  const response = await fetch("http://localhost:8000/download", {
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
  } else {
    alert("Download failed.");
  }
}
