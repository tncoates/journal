document.addEventListener("DOMContentLoaded", () => {
  const remindCheckbox = document.getElementById("remindMe");
  const reminderOptions = document.getElementById("reminderOptions");

  reminderOptions.hidden = !remindCheckbox.checked;

  remindCheckbox.addEventListener("change", () => {
    reminderOptions.hidden = !remindCheckbox.checked;
  });


  document.getElementById("save").addEventListener("click", () => {
    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const date = document.getElementById("date").value;

    const remindMe = remindCheckbox.checked;
    const remindAmount = Number(document.getElementById("remindAmount").value);
    const remindUnit = document.getElementById("remindUnit").value;

    if (!title || !date) {
      alert("Title and date are required");
      return;
    }

    const entry = {
      id: crypto.randomUUID(),
      title,
      description,
      date,
      reminder: remindMe
        ? {
            amount: remindAmount,
            unit: remindUnit
          }
        : null,
      createdAt: new Date().toISOString()
    };

    chrome.storage.local.get({ entries: [] }, (data) => {
      chrome.storage.local.set(
        { entries: [...data.entries, entry] },
        () => window.close()
      );
    });
  });
});
