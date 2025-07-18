document.getElementById("csvFile").addEventListener("change", handleFile);
document.getElementById("monthFilter").addEventListener("change", renderTable);

let allData = [];

function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const rows = Papa.parse(text, { header: true }).data;

    // Clean and filter
    allData = rows.filter(row =>
      row["Actual Complete Date"] &&
      row["Task Owner"] &&
      row["Service Delivery Order - Customer PON"] &&
      row["Task Type"]
    );

    populateMonthDropdown(allData);
    renderTable();
  };
  reader.readAsText(file);
}

function populateMonthDropdown(data) {
  const monthSet = new Set();

  data.forEach(row => {
    const date = new Date(row["Actual Complete Date"]);
    if (!isNaN(date)) {
      const label = date.toLocaleString("default", { month: "long", year: "numeric" });
      monthSet.add(label);
    }
  });

  const sortedMonths = Array.from(monthSet).sort((a, b) => new Date(a) - new Date(b));
  const monthFilter = document.getElementById("monthFilter");
  monthFilter.innerHTML = `<option value="All">All Months</option>`;
  sortedMonths.forEach(month => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    monthFilter.appendChild(option);
  });
}

function renderTable() {
  const selectedMonth = document.getElementById("monthFilter").value;
  const container = document.getElementById("tableContainer");
  container.innerHTML = "";

  const filteredData = allData.filter(row => {
    const date = new Date(row["Actual Complete Date"]);
    if (selectedMonth === "All") return true;
    const label = date.toLocaleString("default", { month: "long", year: "numeric" });
    return label === selectedMonth;
  });

  const grouped = {};
  filteredData.forEach(row => {
    let owner = row["Task Owner"] || "Unassigned";
    owner = owner.replace(/<.*?>/, "").trim(); // clean name
    if (!grouped[owner]) grouped[owner] = [];
    grouped[owner].push(row);
  });

  let totalTasks = 0;

  Object.entries(grouped).forEach(([owner, tasks]) => {
    totalTasks += tasks.length;

    const section = document.createElement("div");
    section.className = "task-group";

    const header = document.createElement("div");
    header.className = "task-header";

    // Count escalated and taken-after-escalation tasks
    let escalatedCount = 0;
    let takenAfterEscalationCount = 0;

    tasks.forEach(row => {
      const escalated = row["Escalated Task?"]?.toLowerCase() === "yes";
      const assignDate = row["Task Assignment Date"] ? new Date(row["Task Assignment Date"]) : null;
      const escalationTime = row["Task Escalation Time"] ? new Date(row["Task Escalation Time"]) : null;

      if (escalated) {
        escalatedCount++;
        if (assignDate && escalationTime && assignDate > escalationTime) {
          takenAfterEscalationCount++;
        }
      }
    });

    // Set header
    header.innerHTML = `<span class="toggle-btn">[+]</span> ${owner} <span class="task-count">(${tasks.length} tasks | ${escalatedCount} escalated | ${takenAfterEscalationCount} taken after escalation)</span>`;
    header.addEventListener("click", () => {
      const isVisible = content.style.display === "block";
      content.style.display = isVisible ? "none" : "block";
      header.querySelector(".toggle-btn").textContent = isVisible ? "[+]" : "[-]";
    });

    const content = document.createElement("div");
    content.className = "task-content";
    content.style.display = "none";

    const table = document.createElement("table");
    table.className = "task-table";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>Order Name</th>
        <th>Task Type</th>
        <th>Complete Date</th>
        <th>Escalated Task?</th>
        <th>Task Escalation Time</th>
        <th>Task Assignment Date</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    tasks.forEach(row => {
      const tr = document.createElement("tr");

      const escalated = row["Escalated Task?"]?.toLowerCase() === "yes";
      const assignDate = row["Task Assignment Date"] ? new Date(row["Task Assignment Date"]) : null;
      const escalationTime = row["Task Escalation Time"] ? new Date(row["Task Escalation Time"]) : null;

      if (escalated && assignDate && escalationTime && assignDate > escalationTime) {
        tr.style.backgroundColor = "#ffe5e5"; // Light red for taken after escalation
      }

      tr.innerHTML = `
        <td>${row["Service Delivery Order - Customer PON"]}</td>
        <td>${row["Task Type"]}</td>
        <td>${row["Actual Complete Date"]}</td>
        <td>${row["Escalated Task?"] || ""}</td>
        <td>${row["Task Escalation Time"] || ""}</td>
        <td>${row["Task Assignment Date"] || ""}</td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    content.appendChild(table);
    section.appendChild(header);
    section.appendChild(content);
    container.appendChild(section);
  });

  const totalDiv = document.createElement("div");
  totalDiv.className = "total-summary";
  totalDiv.textContent = `Total Tasks: ${totalTasks}`;
  container.appendChild(totalDiv);
}
