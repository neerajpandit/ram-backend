const apiBase = "/api/v1/logs-dashboard";

// DOM elements
const rootFilesList = document.getElementById("rootFiles");
const categoriesList = document.getElementById("categories");
const logContent = document.getElementById("logContent");

// Fetch root logs
async function fetchRootLogs() {
  const res = await fetch(`${apiBase}/`);
  const data = await res.json();
  rootFilesList.innerHTML = "";

  if (data.success) {
    data.files.forEach((file) => {
      const li = document.createElement("li");

      // File link
      const fileLink = document.createElement("a");
      fileLink.href = "#";
      fileLink.textContent = file;
      fileLink.addEventListener("click", () => viewRootFile(file));

      // Download link
      const downloadLink = document.createElement("a");
      downloadLink.href = `${apiBase}/download/${file}`;
      downloadLink.textContent = "Download";
      downloadLink.className = "download-link";
      downloadLink.setAttribute("download", "");

      li.appendChild(fileLink);
      li.appendChild(downloadLink);
      rootFilesList.appendChild(li);
    });
  }
}

// Fetch categories
async function fetchCategories() {
  const res = await fetch(`${apiBase}/users/`);
  const data = await res.json();
  categoriesList.innerHTML = "";

  if (data.success) {
    data.categories.forEach((cat) => {
      const li = document.createElement("li");

      // Category div
      const categoryDiv = document.createElement("div");
      categoryDiv.className = "category";
      categoryDiv.innerHTML = `${cat} <span class="arrow">&#9654;</span>`;

      // Files container
      const filesList = document.createElement("ul");
      filesList.className = "category-files";
      filesList.id = `cat-${cat}`;

      // Toggle event listener
      categoryDiv.addEventListener("click", () =>
        toggleCategoryFiles(categoryDiv, cat, filesList)
      );

      li.appendChild(categoryDiv);
      li.appendChild(filesList);
      categoriesList.appendChild(li);
    });
  }
}

// Toggle category files
async function toggleCategoryFiles(categoryDiv, category, filesList) {
  const arrow = categoryDiv.querySelector(".arrow");

  if (filesList.style.display === "block") {
    filesList.style.display = "none";
    arrow.classList.remove("open");
  } else {
    // Fetch files if not already fetched
    if (!filesList.hasChildNodes()) {
      const res = await fetch(`${apiBase}/users/${category}`);
      const data = await res.json();
      if (data.success) {
        data.files.forEach((file) => {
          const li = document.createElement("li");

          // File link
          const fileLink = document.createElement("a");
          fileLink.href = "#";
          fileLink.textContent = file;
          fileLink.addEventListener("click", () => viewFile(category, file));

          // Download link
          const downloadLink = document.createElement("a");
          downloadLink.href = `${apiBase}/users/${category}/${file}`;
          downloadLink.textContent = "Download";
          downloadLink.className = "download-link";
          downloadLink.setAttribute("download", "");

          li.appendChild(fileLink);
          li.appendChild(downloadLink);
          filesList.appendChild(li);
        });
      }
    }

    filesList.style.display = "block";
    arrow.classList.add("open");
  }
}

// View root log file
async function viewRootFile(file) {
  const res = await fetch(`${apiBase}/${file}`);
  if (res.ok) {
    const text = await res.text();
    logContent.textContent = text;
  } else {
    logContent.textContent = "Failed to load file.";
  }
}

// View category log file
async function viewFile(category, file) {
  const res = await fetch(`${apiBase}/users/${category}/${file}`);
  if (res.ok) {
    const text = await res.text();
    logContent.textContent = text;
  } else {
    logContent.textContent = "Failed to load file.";
  }
}

// Initial load
fetchRootLogs();
fetchCategories();
