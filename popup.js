document.getElementById("save").addEventListener("click", () => {
  const title = document.getElementById("title").value;
  const date = document.getElementById("date").value;

  const entry = {
    id: crypto.randomUUID(),
    title,
    date
  };

  chrome.storage.local.get({ entries: [] }, (data) => {
    const updated = [...data.entries, entry];

    chrome.storage.local.set({ entries: updated }, () => {
      console.log("Saved:", entry);
      window.close();
    });
  });
});
