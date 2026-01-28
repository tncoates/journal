// calendar.js - renders one month grid, groups entries by local date (YYYY-MM-DD),
// allows prev/next month navigation and clicking dates to filter the list.

document.addEventListener("DOMContentLoaded", () => {
    // DOM refs
    const listEl = document.getElementById("list");
    const gridEl = document.getElementById("grid");
    const monthLabel = document.getElementById("monthLabel");
    const prevBtn = document.getElementById("prev");
    const nextBtn = document.getElementById("next");
    const clearFilter = document.getElementById("clearFilter");

    // modal refs
    const editModal = document.getElementById("editModal");
    const editTitle = document.getElementById("editTitle");
    const editDescription = document.getElementById("editDescription");
    const editDate = document.getElementById("editDate");
    const cancelEditBtn = document.getElementById("cancelEdit");
    const saveEditBtn = document.getElementById("saveEdit");

    let editingEntryId = null;

    // state
    let entries = [];
    let entriesMap = {}; // { 'YYYY-MM-DD': [entry,...] }
    let selectedYMD = null;
    let viewDate = new Date(); // month/year being viewed

    // --- helpers ---
    function ymdFromLocalISO(iso) {
        const d = new Date(iso);
        // produce local Y-M-D (not UTC)
        const Y = d.getFullYear();
        const M = String(d.getMonth() + 1).padStart(2, "0");
        const D = String(d.getDate()).padStart(2, "0");
        return `${Y}-${M}-${D}`;
    }

    function buildEntriesMap() {
        entriesMap = {};
        entries.forEach((e) => {
            // handle if someone used an all-day date or time; we'll use local date of the timestamp
            const ymd = ymdFromLocalISO(e.date);
            if (!entriesMap[ymd]) entriesMap[ymd] = [];
            entriesMap[ymd].push(e);
        });
    }

    function formatMonthLabel(date) {
        return date.toLocaleString(undefined, { month: "long", year: "numeric" });
    }

    function daysInMonth(year, monthIndex) {
        // monthIndex 0-11
        return new Date(year, monthIndex + 1, 0).getDate();
    }

    function deleteEntry(id) {
        if (!confirm("Delete this entry?")) return;

        entries = entries.filter(e => e.id !== id);

        chrome.storage.local.set({ entries }, () => {
            buildEntriesMap();
            renderList(selectedYMD);
            renderCalendar();
        });
    }

    function editEntry(id) {
        const entry = entries.find(e => e.id === id);
        if (!entry) return;

        editingEntryId = id;

        editTitle.value = entry.title;
        editDescription.value = entry.description || "";
        editDate.value = entry.date.slice(0, 16); // datetime-local format

        editModal.classList.remove("hidden");
    }



    // --- render list ---
    function renderList(filteredYMD = null) {
        listEl.innerHTML = "";
        let toShow = entries;
        if (filteredYMD) {
            toShow = entriesMap[filteredYMD] || [];
        }

        if (toShow.length === 0) {
            const p = document.createElement("div");
            p.textContent = filteredYMD ? `No entries for ${filteredYMD}` : "No entries yet.";
            listEl.appendChild(p);
            return;
        }

        // sort descending by date/time
        toShow = [...toShow].sort((a, b) => new Date(b.date) - new Date(a.date));

        toShow.forEach((entry) => {
            const div = document.createElement("div");
            div.className = "entry";
            div.dataset.id = entry.id;
            div.innerHTML = `
        <div class="entry-main">
            <div class="entry-title">${escapeHTML(entry.title)}</div>
            <div class="entry-date">${new Date(entry.date).toLocaleString()}</div>
            ${entry.description ? `<div class="entry-desc">${escapeHTML(entry.description)}</div>` : ""}
        </div>

        <div class="entry-actions">
            <button class="edit-btn">✏️</button>
            <button class="delete-btn">🗑️</button>
        </div>
        `;

            listEl.appendChild(div);
        });


    }

    listEl.addEventListener("click", (e) => {
        const entryEl = e.target.closest(".entry");
        if (!entryEl) return;

        const id = entryEl.dataset.id;

        if (e.target.classList.contains("delete-btn")) {
            deleteEntry(id);
        }

        if (e.target.classList.contains("edit-btn")) {
            editEntry(id);
        }
    });

    // small escape for text insertion
    function escapeHTML(s) {
        return String(s)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    // --- render calendar grid for viewDate month ---
    function renderCalendar() {
        gridEl.innerHTML = "";
        const year = viewDate.getFullYear();
        const monthIndex = viewDate.getMonth();

        monthLabel.textContent = formatMonthLabel(viewDate);

        const firstDay = new Date(year, monthIndex, 1).getDay(); // 0=Sun..6=Sat
        const daysThisMonth = daysInMonth(year, monthIndex);

        // previous month tail days
        const prevMonthDays = daysInMonth(year, monthIndex - 1 < 0 ? 11 : monthIndex - 1);

        // we'll render a 6x7 grid (42 cells)
        const cells = 42;
        for (let idx = 0; idx < cells; idx++) {
            const cell = document.createElement("div");
            cell.className = "cell";

            // compute date number and ymd
            const dayNum = idx - firstDay + 1;
            let cellDate, isMuted;

            if (dayNum <= 0) {
                // previous month
                const d = prevMonthDays + dayNum;
                const prevMonthIndex = (monthIndex - 1 + 12) % 12;
                const prevYear = monthIndex === 0 ? year - 1 : year;
                cellDate = new Date(prevYear, prevMonthIndex, d);
                isMuted = true;
            } else if (dayNum > daysThisMonth) {
                // next month
                const d = dayNum - daysThisMonth;
                const nextMonthIndex = (monthIndex + 1) % 12;
                const nextYear = monthIndex === 11 ? year + 1 : year;
                cellDate = new Date(nextYear, nextMonthIndex, d);
                isMuted = true;
            } else {
                // in-month date
                cellDate = new Date(year, monthIndex, dayNum);
                isMuted = false;
            }

            const ymd = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, "0")}-${String(cellDate.getDate()).padStart(2, "0")}`;

            // number
            const num = document.createElement("div");
            num.className = "num";
            num.textContent = String(cellDate.getDate());
            cell.appendChild(num);

            // indicators (dots / count)
            const hasEntries = entriesMap[ymd] && entriesMap[ymd].length > 0;
            const indicators = document.createElement("div");
            indicators.className = "indicators";

            if (hasEntries) {
                const dot = document.createElement("div");
                dot.className = "dot";
                indicators.appendChild(dot);

                const badge = document.createElement("div");
                badge.className = "countBadge";
                badge.textContent = entriesMap[ymd].length > 1 ? `${entriesMap[ymd].length} entries` : "1 entry";
                indicators.appendChild(badge);
            } else {
                // keep empty so layout consistent
                const spacer = document.createElement("div");
                spacer.style.marginTop = "auto";
                indicators.appendChild(spacer);
            }
            cell.appendChild(indicators);

            // classes: muted / today / selected
            if (isMuted) cell.classList.add("muted");
            const today = new Date();
            if (
                cellDate.getFullYear() === today.getFullYear() &&
                cellDate.getMonth() === today.getMonth() &&
                cellDate.getDate() === today.getDate()
            ) {
                cell.classList.add("today");
            }
            if (selectedYMD === ymd) {
                cell.classList.add("selected");
            }

            // click behavior: select date and filter list
            cell.addEventListener("click", () => {
                if (selectedYMD === ymd) {
                    // toggle off
                    selectedYMD = null;
                    renderList(null);
                } else {
                    selectedYMD = ymd;
                    renderList(selectedYMD);
                }
                // rerender to show selection highlight
                renderCalendar();
                // scroll the list to top
                listEl.scrollTop = 0;
            });

            gridEl.appendChild(cell);
        }
    }

    // --- navigation & wheel ---
    function goMonth(delta) {
        viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
        renderCalendar();
    }

    prevBtn.addEventListener("click", () => goMonth(-1));
    nextBtn.addEventListener("click", () => goMonth(1));
    clearFilter.addEventListener("click", () => {
        selectedYMD = null;
        renderList(null);
        renderCalendar();
    });

    saveEditBtn.addEventListener("click", () => {
        if (!editingEntryId) return;

        entries = entries.map(e =>
            e.id === editingEntryId
                ? {
                    ...e,
                    title: editTitle.value.trim(),
                    description: editDescription.value.trim(),
                    date: editDate.value
                }
                : e
        );

        chrome.storage.local.set({ entries }, () => {
            buildEntriesMap();
            renderList(selectedYMD);
            renderCalendar();
            closeEditModal();
        });
    });

    function closeEditModal() {
        editingEntryId = null;
        editModal.classList.add("hidden");
    }

    cancelEditBtn.addEventListener("click", closeEditModal);

    // click outside modal to close
    editModal.addEventListener("click", (e) => {
        if (e.target === editModal) closeEditModal();
    });



    // optional: change month with mouse wheel when hovering over the grid
    /*
    gridEl.addEventListener("wheel", (ev) => {
      // small threshold so small scrolls don't jump months
      if (Math.abs(ev.deltaY) < 40) return;
      ev.preventDefault();
      if (ev.deltaY > 0) goMonth(1);
      else goMonth(-1);
    }, { passive: false });
    */

    // --- load entries from storage and initialize ---
    function loadEntriesAndInit() {
        chrome.storage.local.get({ entries: [] }, (data) => {
            entries = data.entries || [];
            buildEntriesMap();
            renderList(null);
            renderCalendar();
        });
    }

    // run it
    loadEntriesAndInit();

    // if you want to listen for changes in storage (e.g., popup saved new entry),
    // we can re-load automatically:
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.entries) {
            entries = changes.entries.newValue || [];
            buildEntriesMap();
            // keep selectedYMD if possible, else clear
            renderList(selectedYMD);
            renderCalendar();
        }
    });
});
