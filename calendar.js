document.addEventListener("DOMContentLoaded", () => {

    const container = document.getElementById("entries");

    chrome.storage.local.get({ entries: [] }, (data) => {

        if (data.entries.length === 0) {
            container.textContent = "No entries yet.";
            return;
        }

        const sorted = [...data.entries].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
        );

        sorted.forEach((entry) => {

            const div = document.createElement("div");
            div.className = "entry";
            div.innerHTML = `
                <div class="entry-title">${entry.title}</div>
                <div class="entry-date">
                    ${new Date(entry.date).toLocaleString()}
                </div>
                ${
                    entry.description
                        ? `<div class="entry-desc">${entry.description}</div>`
                        : ""
                }
                ${
                    entry.reminder
                        ? `<div class="entry-reminder">
                            ⏰ ${entry.reminder.amount} ${entry.reminder.unit} before
                        </div>`
                        : ""
                }
            `;

            container.appendChild(div);
        });

    });
});