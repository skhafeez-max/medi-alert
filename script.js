
const $ = id => document.getElementById(id);

const STORAGE_KEY = "mediAlertDataV1";

let data = loadData();
let notified = new Set();

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);

            if (Array.isArray(parsed.medicines) &&
                Array.isArray(parsed.readings)) {
                return parsed;
            }
        }
    } catch (error) {
        console.error("Could not load saved data:", error);
    }

    return { medicines: [], readings: [] };
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
    } catch (error) {
        alert("Could not save data. Your browser storage may be full.");
        console.error(error);
        return false;
    }
}

function today() {
    const date = new Date();

    return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
}

function createId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 10);
}

function showMessage(id, text, error = false) {
    $(id).textContent = text;
    $(id).style.color = error ? "#dc3545" : "#087f8c";
}

function makeElement(tag, text, className = "") {
    const element = document.createElement(tag);
    element.textContent = text;

    if (className) {
        element.className = className;
    }

    return element;
}

function displayDate() {
    $("currentDate").textContent =
        new Date().toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        });
}

// Add a medicine.
$("medicineForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const name = $("medicineName").value.trim();
    const dosage = $("dosage").value.trim();
    const time = $("medicineTime").value;
    const stock = Number($("medicineStock").value);
    const expiry = $("expiryDate").value;

    if (!name || !dosage || !time || !expiry ||
        !Number.isInteger(stock) || stock < 1) {
        alert("Please enter valid medicine details.");
        return;
    }

    if (expiry < today()) {
        alert("The expiry date cannot be in the past.");
        return;
    }

    data.medicines.push({
        id: createId(),
        name,
        dosage,
        time,
        stock,
        expiry,
        lastTaken: "",
        lastNotifiedDate: ""
    });

    if (saveData()) {
        $("medicineForm").reset();
        renderAll();
    }
});

// Mark one scheduled dose as taken and reduce the quantity.
function markTaken(id) {
    const medicine = data.medicines.find(item => item.id === id);

    if (!medicine) return;

    if (medicine.lastTaken === today()) {
        alert("This medicine is already marked as taken today.");
        return;
    }

    if (medicine.expiry < today()) {
        alert("This medicine is expired. Check with a pharmacist before use.");
        return;
    }

    if (medicine.stock < 1) {
        alert("No medicine stock remains.");
        return;
    }

    if (!confirm("Mark " + medicine.name + " as taken?")) {
        return;
    }

    medicine.lastTaken = today();
    medicine.stock -= 1;

    if (saveData()) {
        renderAll();
    }
}

// Delete a medicine.
function deleteMedicine(id) {
    const medicine = data.medicines.find(item => item.id === id);

    if (!medicine) return;

    if (!confirm("Delete " + medicine.name + "?")) {
        return;
    }

    data.medicines = data.medicines.filter(item => item.id !== id);

    if (saveData()) {
        renderAll();
    }
}

// Display medicines.
function displayMedicines() {
    const list = $("medicineList");
    list.replaceChildren();

    if (data.medicines.length === 0) {
        list.appendChild(makeElement(
            "p", "No medicines added yet.", "empty-message"
        ));
        return;
    }

    data.medicines.forEach(medicine => {
        const card = makeElement("article", "", "medicine-card");
        const details = document.createElement("div");

        details.appendChild(makeElement("h3", medicine.name));

        [
            "Dosage: " + medicine.dosage,
            "Reminder: " + medicine.time,
            "Quantity remaining: " + medicine.stock,
            "Expiry date: " + medicine.expiry
        ].forEach(text => {
            details.appendChild(makeElement("p", text));
        });

        const expired = medicine.expiry < today();
        const taken = medicine.lastTaken === today();

        let statusText = "Pending today";
        let statusClass = "status";

        if (expired) {
            statusText = "Expired";
            statusClass += " expired";
        } else if (taken) {
            statusText = "Taken today";
            statusClass += " taken";
        } else if (medicine.stock === 0) {
            statusText = "Out of stock";
        }

        details.appendChild(makeElement(
            "span", statusText, statusClass
        ));

        const actions = makeElement("div", "", "card-actions");

        if (!taken && !expired && medicine.stock > 0) {
            const takenButton = makeElement(
                "button", "Mark Taken", "taken-button"
            );

            takenButton.type = "button";
            takenButton.onclick = () => markTaken(medicine.id);
            actions.appendChild(takenButton);
        }

        const deleteButton = makeElement(
            "button", "Delete", "delete-button"
        );

        deleteButton.type = "button";
        deleteButton.onclick = () => deleteMedicine(medicine.id);
        actions.appendChild(deleteButton);

        card.append(details, actions);
        list.appendChild(card);
    });
}

// Save a health reading.
$("healthForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const type = $("healthType").value;
    const value = $("healthValue").value.trim();

    if (!type || !value) {
        alert("Please enter a reading type and value.");
        return;
    }

    data.readings.unshift({
        id: createId(),
        type,
        value,
        date: today(),
        createdAt: new Date().toISOString()
    });

    if (saveData()) {
        $("healthForm").reset();
        renderAll();
    }
});

// Delete a health reading.
function deleteReading(id) {
    if (!confirm("Delete this health reading?")) {
        return;
    }

    data.readings = data.readings.filter(item => item.id !== id);

    if (saveData()) {
        renderAll();
    }
}

// Display health history.
function displayReadings() {
    const list = $("healthList");
    list.replaceChildren();

    if (data.readings.length === 0) {
        list.appendChild(makeElement(
            "p", "No health readings recorded yet.", "empty-message"
        ));
        return;
    }

    data.readings.forEach(reading => {
        const card = makeElement("article", "", "health-card");
        const details = document.createElement("div");

        details.appendChild(makeElement("h3", reading.type));
        details.appendChild(makeElement("p", "Value: " + reading.value));
        details.appendChild(makeElement("p", "Date: " + reading.date));

        const button = makeElement(
            "button", "Delete", "delete-button"
        );

        button.type = "button";
        button.onclick = () => deleteReading(reading.id);

        card.append(details, button);
        list.appendChild(card);
    });
}

// Show stock and expiry alerts.
function displayAlerts() {
    const list = $("alerts");
    list.replaceChildren();

    data.medicines.forEach(medicine => {
        const days = Math.round(
            (new Date(medicine.expiry + "T00:00:00") -
             new Date(today() + "T00:00:00")) / 86400000
        );

        if (days < 0) {
            addAlert(
                medicine.name + " has expired. Check with a pharmacist.",
                true
            );
        } else if (days <= 7) {
            addAlert(
                medicine.name + " expires in " + days + " day(s).",
                true
            );
        }

        if (medicine.stock <= 5 && days >= 0) {
            addAlert(
                "Low stock: " + medicine.name + " has " +
                medicine.stock + " unit(s) remaining.",
                false
            );
        }

        if (medicine.stock === 0) {
            addAlert(medicine.name + " is out of stock.", true);
        }
    });

    if (list.childElementCount === 0) {
        list.appendChild(makeElement(
            "p", "No alerts at the moment.", "empty-message"
        ));
    }
}

function addAlert(text, danger) {
    const className = danger ? "alert-item danger" : "alert-item";
    $("alerts").appendChild(makeElement("div", text, className));
}

// Update dashboard numbers.
function updateDashboard() {
    $("totalMedicines").textContent = data.medicines.length;

    $("pendingMedicines").textContent =
        data.medicines.filter(medicine =>
            medicine.lastTaken !== today()
        ).length;

    $("takenMedicines").textContent =
        data.medicines.filter(medicine =>
            medicine.lastTaken === today()
        ).length;

    $("totalReadings").textContent = data.readings.length;
}

function renderAll() {
    displayMedicines();
    displayReadings();
    displayAlerts();
    updateDashboard();
}

// Ask permission for browser notifications.
$("enableNotificationsBtn").addEventListener("click", async function() {
    if (!("Notification" in window)) {
        showMessage(
            "notificationStatus",
            "This browser does not support notifications.",
            true
        );
        return;
    }

    try {
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
            showMessage(
                "notificationStatus",
                "Notifications enabled. Keep this page open."
            );

            new Notification("Medi Alert", {
                body: "Medicine reminders are enabled."
            });
        } else {
            showMessage(
                "notificationStatus",
                "Notifications were not allowed. Check browser settings.",
                true
            );
        }
    } catch (error) {
        showMessage(
            "notificationStatus",
            "Could not enable notifications. Use the website over HTTPS or localhost.",
            true
        );
    }
});

// Check medicine reminders every 10 seconds.
function checkReminders() {
    if (!("Notification" in window) ||
        Notification.permission !== "granted") {
        return;
    }

    const now = new Date();
    const day = today();

    const time = String(now.getHours()).padStart(2, "0") +
        ":" + String(now.getMinutes()).padStart(2, "0");

    data.medicines.forEach(medicine => {
        if (medicine.time !== time ||
            medicine.lastTaken === day ||
            medicine.lastNotifiedDate === day ||
            medicine.expiry < day ||
            medicine.stock < 1) {
            return;
        }

        const key = day + "_" + medicine.id;

        if (notified.has(key)) return;

        notified.add(key);
        medicine.lastNotifiedDate = day;
        saveData();

        try {
            new Notification("Medicine reminder: " + medicine.name, {
                body: "Time for " + medicine.dosage +
                    ". Open Medi Alert to record your dose."
            });
        } catch (error) {
            console.error("Notification error:", error);
        }
    });
}

// Export a backup JSON file.
$("exportBtn").addEventListener("click", function() {
    const backup = new Blob(
        [JSON.stringify(data, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(backup);
    const link = document.createElement("a");

    link.href = url;
    link.download = "medi-alert-backup.json";
    link.click();

    URL.revokeObjectURL(url);
    showMessage("dataMessage", "Backup exported.");
});

// Import a previous backup.
$("importBtn").addEventListener("click", function() {
    $("importFile").click();
});

$("importFile").addEventListener("change", async function() {
    const file = this.files[0];

    if (!file) return;

    try {
        const imported = JSON.parse(await file.text());

        if (!imported ||
            !Array.isArray(imported.medicines) ||
            !Array.isArray(imported.readings)) {
            throw new Error("Invalid backup format.");
        }

        if (!confirm("Import this backup and replace current data?")) {
            this.value = "";
            return;
        }

        data = {
            medicines: imported.medicines,
            readings: imported.readings
        };

        if (saveData()) {
            notified = new Set();
            renderAll();
            showMessage("dataMessage", "Backup imported successfully.");
        }
    } catch (error) {
        showMessage(
            "dataMessage",
            "Could not import this file. Select a valid Medi Alert backup.",
            true
        );
    }

    this.value = "";
});

// Delete all local records.
$("clearBtn").addEventListener("click", function() {
    if (!confirm("Permanently delete all Medi Alert data from this browser?")) {
        return;
    }

    data = { medicines: [], readings: [] };

    if (saveData()) {
        notified.clear();
        renderAll();
        showMessage("dataMessage", "All local data has been deleted.");
    }
});

// Start the website.
displayDate();
renderAll();
checkReminders();
setInterval(checkReminders, 10000);
setInterval(displayDate, 60000);
