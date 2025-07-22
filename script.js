const teamMembers = [
  "Fitim Ahmeti", "Shpend Ajeti", "Festim Asllani", "Tim Corey",
  "Vlora Ibrahimi", "Vanja Petrushevski", "Edi Sermaxhaj", "Ermal Shala"
];

document.getElementById("csvFile").addEventListener("change", handleFile);
document.getElementById("monthFilter").addEventListener("change", renderTable);
document.getElementById("yearFilter").addEventListener("change", renderTable);
document.getElementById("memberFilter").addEventListener("change", renderTable);

let allData = [];

// ✅ Read CSV file
function handleFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const rows = Papa.parse(text, { header: true }).data;

    allData = rows.filter(row => row["Actual Complete Date"] && row["Task Owner"]);
    populateMonthDropdown(allData);
    populateYearDropdown(allData);
    populateMemberDropdown();
    renderTable();
  };
  reader.readAsText(file);
}

// ✅ Month Dropdown
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
  monthFilter.innerHTML = '<option value="All">All Months</option>';

  sortedMonths.forEach(month => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    monthFilter.appendChild(option);
  });

  if (sortedMonths.length > 0) {
    monthFilter.value = sortedMonths[sortedMonths.length - 1];
  }
}

// ✅ Year Dropdown
function populateYearDropdown(data) {
  const yearSet = new Set();
  data.forEach(row => {
    const date = new Date(row["Actual Complete Date"]);
    if (!isNaN(date)) {
      yearSet.add(date.getFullYear());
    }
  });

  const sortedYears = Array.from(yearSet).sort((a, b) => b - a);
  const yearFilter = document.getElementById("yearFilter");
  yearFilter.innerHTML = '<option value="">Select Year</option>';

  sortedYears.forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  });

  const currentYear = new Date().getFullYear();
  if (yearSet.has(currentYear)) {
    yearFilter.value = currentYear;
  }
}

// ✅ Team Member Dropdown
function populateMemberDropdown() {
  const memberFilter = document.getElementById("memberFilter");
  memberFilter.innerHTML = '<option value="All">Show All</option>';

  teamMembers.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    memberFilter.appendChild(option);
  });
}

// ✅ Render Filtered Data
function renderTable() {
  const selectedMonth = document.getElementById("monthFilter").value;
  const selectedYear = document.getElementById("yearFilter").value;
  const selectedMember = document.getElementById("memberFilter").value;
  const container = document.getElementById("tableContainer");
  container.innerHTML = "";

  const filteredData = allData.filter(row => {
    const date = new Date(row["Actual Complete Date"]);
    if (isNaN(date)) return false;

    const monthLabel = date.toLocaleString("default", { month: "long", year: "numeric" });
    const yearMatch = date.getFullYear().toString() === selectedYear;
    const monthMatch = selectedMonth === "All" || monthLabel === selectedMonth;
    const cleanOwner = (row["Task Owner"] || "Unassigned").replace(/<.*?>/, "").trim();
    const memberMatch = selectedMember === "All"
      ? teamMembers.includes(cleanOwner)
      : cleanOwner === selectedMember;
    return monthMatch && yearMatch && memberMatch;
  });

  const grouped = {};
  filteredData.forEach(row => {
    let owner = row["Task Owner"] || "Unassigned";
    owner = owner.replace(/<.*?>/, "").trim();
    if (!grouped[owner]) grouped[owner] = [];
    grouped[owner].push(row);
  });

  let totalTasks = 0;

  Object.entries(grouped).forEach(([owner, tasks]) => {
    totalTasks += tasks.length;

    const section = document.createElement("div");
    section.className = "task-group";

    const content = document.createElement("div");
    content.className = "task-content";
    content.style.display = "none";

    // 📊 Task Type Summary Table
    const taskTypeCounts = {};
    tasks.forEach(row => {
      const type = (row["Task Type"] || "").trim();
      if (type) {
        taskTypeCounts[type] = (taskTypeCounts[type] || 0) + 1;
      }
    });

    const summaryTable = document.createElement("table");
    summaryTable.className = "task-table";
    summaryTable.innerHTML = `<thead><tr><th>Task Type</th><th>Count</th></tr></thead>`;
    const summaryBody = document.createElement("tbody");
    for (const [type, count] of Object.entries(taskTypeCounts)) {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${type}</td><td>${count}</td>`;
      summaryBody.appendChild(row);
    }
    const totalRow = document.createElement("tr");
    totalRow.innerHTML = `<td><strong>Total Completed</strong></td><td><strong>${tasks.length}</strong></td>`;
    summaryBody.appendChild(totalRow);
    summaryTable.appendChild(summaryBody);
    content.appendChild(summaryTable);

    // 🔺 Escalation Summary Table
    let escalated = 0;
    let pickedAfterEscalation = 0;

    tasks.forEach(row => {
      const isEscalated = row["Escalated Task?"]?.toLowerCase() === "yes";
      if (isEscalated) {
        escalated++;
        const escalationDate = new Date(row["Task Escalation Time"]);
        const assignmentDate = new Date(row["Task Assignment Date"]);
        if (assignmentDate > escalationDate) pickedAfterEscalation++;
      }
    });

    const escalationTable = document.createElement("table");
    escalationTable.className = "task-table escalation-summary";
    escalationTable.innerHTML = `
      <thead><tr><th colspan="2">Escalation Orders</th></tr></thead>
      <tbody>
        <tr><td>Picked up after escalation</td><td>${pickedAfterEscalation}</td></tr>
        <tr><td>Total escalation completed</td><td>${escalated}</td></tr>
        <tr><td><strong>Total Completed</strong></td><td><strong>${tasks.length}</strong></td></tr>
      </tbody>
    `;
    content.appendChild(escalationTable);

    // 📋 Task Detail Table
    const detailTable = document.createElement("table");
    detailTable.className = "task-table";
    detailTable.innerHTML = `
      <thead>
        <tr>
          <th>Order Name</th>
          <th>Task Type</th>
          <th>Complete Date</th>
          <th>Escalated Task?</th>
          <th>Task Escalation Time</th>
          <th>Task Assignment Date</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement("tbody");
    tasks.forEach(row => {
      const isEscalated = row["Escalated Task?"]?.toLowerCase() === "yes";
      const escalationDate = new Date(row["Task Escalation Time"]);
      const assignmentDate = new Date(row["Task Assignment Date"]);
      const isLate = isEscalated && assignmentDate > escalationDate;

      const tr = document.createElement("tr");
      if (isLate) tr.classList.add("taken-after-escalation");

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

    detailTable.appendChild(tbody);
    content.appendChild(detailTable);

    // ⬇️ Collapsible Header
    const header = document.createElement("div");
    header.className = "task-header";
    header.innerHTML = `<span class="toggle-btn">[+]</span> ${owner} <span class="task-count">(${tasks.length} completed | ${escalated} escalated | ${pickedAfterEscalation} picked up after escalation)</span>`;
    header.addEventListener("click", () => {
      const isVisible = content.style.display === "block";
      content.style.display = isVisible ? "none" : "block";
      header.querySelector(".toggle-btn").textContent = isVisible ? "[+]" : "[-]";
    });

    section.appendChild(header);
    section.appendChild(content);
    container.appendChild(section);
  });

  // ✅ Total Summary Footer
  const totalDiv = document.createElement("div");
  totalDiv.className = "total-summary";
  totalDiv.textContent = `Total Tasks: ${totalTasks}`;
  container.appendChild(totalDiv);
}
