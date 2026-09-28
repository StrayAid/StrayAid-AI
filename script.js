// StrayAid AI - image assessment and rescue handoff demo.

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const previewContainer = document.getElementById("preview-container");
const imagePreview = document.getElementById("image-preview");
const analyzeBtn = document.getElementById("analyze-btn");
const resultCard = document.getElementById("result-card");
const resultCondition = document.getElementById("result-condition");
const resultConfidence = document.getElementById("result-confidence");
const resultExplanation = document.getElementById("result-explanation");
const resultRecommendation = document.getElementById("result-recommendation");
const reviewActions = document.getElementById("review-actions");
const confirmInjuredBtn = document.getElementById("confirm-injured-btn");
const confirmHealthyBtn = document.getElementById("confirm-healthy-btn");
const analyzeAnotherBtn = document.getElementById("analyze-another-btn");
const changePhotoBtn = document.getElementById("change-photo-btn");
const rescueAlert = document.getElementById("rescue-alert");
const resultStatusBadge = document.getElementById("result-status-badge");
const nearestRescueText = document.getElementById("nearest-rescue-text");
const sendAlertBtn = document.getElementById("send-alert-btn");
const alertStatus = document.getElementById("alert-status");
const rescueListEl = document.getElementById("rescue-list");
const locateBtn = document.getElementById("locate-btn");
const locationStatus = document.getElementById("location-status");
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/VgGwHHK93/";

const CONDITIONS = {
  Healthy: {
    label: "Appears healthy",
    tone: "healthy",
    explanation: "The animal appears to be in good physical condition with no obvious visible signs of distress.",
    recommendation: "Keep observing from a safe distance. If the animal is stray, consider notifying a local shelter."
  },
  Injured: {
    label: "Possible injury",
    tone: "urgent",
    explanation: "The image may show signs of a physical injury, such as a wound, swelling, or limping posture.",
    recommendation: "Contact a nearby animal rescue organization or veterinarian as soon as possible."
  },
  Malnourished: {
    label: "Needs support",
    tone: "watch",
    explanation: "The animal may appear underweight or weak, which can indicate malnutrition or illness.",
    recommendation: "Reach out to a local rescue group for feeding support and a professional evaluation."
  },
  "Visible Health Issue": {
    label: "Visible health issue",
    tone: "urgent",
    explanation: "The image may show signs of a skin condition, infection, or another visible health concern.",
    recommendation: "Contact a veterinarian or animal welfare organization for further evaluation."
  },
  "Needs review": {
    label: "Needs human review",
    tone: "watch",
    explanation: "This demo cannot reliably determine the animal's condition from this photo alone.",
    recommendation: "Check the image yourself. If you see bleeding, swelling, a wound, or difficulty moving, report it as an injury."
  }
};

let uploadedImageFile = null;
let currentPrediction = null;
let currentLocation = null;
let nearestRescue = RESCUE_CENTERS[0];
let model = null;
let modelLoadPromise = null;

dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => {
  if (event.target.files.length > 0) handleImageFile(event.target.files[0]);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");
  if (event.dataTransfer.files.length > 0) handleImageFile(event.dataTransfer.files[0]);
});

function handleImageFile(file) {
  if (!file.type.startsWith("image/")) {
    alert("Please upload an image file.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("Please choose an image smaller than 10 MB.");
    return;
  }

  uploadedImageFile = file;
  imagePreview.src = URL.createObjectURL(file);
  previewContainer.classList.remove("hidden");
  resultCard.classList.add("hidden");
  rescueAlert.classList.add("hidden");
  alertStatus.textContent = "";
  sendAlertBtn.disabled = false;
  sendAlertBtn.innerHTML = "Send alert to nearest NGO <span>→</span>";
}

analyzeBtn.addEventListener("click", async () => {
  analyzeBtn.innerHTML = "Assessing <span class=\"button-spinner\"></span>";
  analyzeBtn.disabled = true;
  try {
    const prediction = await predictWithTeachableMachine(imagePreview);
    displayResult(prediction);
  } catch (error) {
    console.error("Model assessment failed:", error);
    displayResult({ className: "Needs review", confidence: 0 });
  }
  analyzeBtn.innerHTML = "Run assessment <span>→</span>";
  analyzeBtn.disabled = false;
});

async function loadModel() {
  if (!modelLoadPromise) {
    modelLoadPromise = tmImage.load(`${MODEL_URL}model.json`, `${MODEL_URL}metadata.json`)
      .then((loadedModel) => {
        model = loadedModel;
        return model;
      });
  }
  return modelLoadPromise;
}

async function predictWithTeachableMachine(imageElement) {
  const loadedModel = await loadModel();
  const predictions = await loadedModel.predict(imageElement);
  const bestPrediction = predictions.reduce((best, current) => current.probability > best.probability ? current : best);
  const label = bestPrediction.className.trim().toLowerCase();
  const className = label.includes("injur") || label.includes("hurt") || label.includes("wound")
    ? "Injured"
    : label.includes("malnour") || label.includes("thin") || label.includes("weak")
      ? "Malnourished"
      : label.includes("healthy")
        ? "Healthy"
        : "Needs review";

  return { className, confidence: bestPrediction.probability };
}

function displayResult(prediction) {
  const info = CONDITIONS[prediction.className];
  currentPrediction = prediction;
  resultStatusBadge.textContent = info.label;
  resultStatusBadge.className = `status-badge ${info.tone}`;
  resultCondition.textContent = prediction.className === "Healthy"
    ? "No visible distress detected"
    : prediction.className === "Needs review" ? "A human should review this photo" : "This animal may need help";
  resultConfidence.textContent = `${Math.round(prediction.confidence * 100)}% visual confidence`;
  resultExplanation.textContent = info.explanation;
  resultRecommendation.textContent = info.recommendation;

  reviewActions.classList.toggle("hidden", prediction.className === "Healthy");
  if (prediction.className === "Healthy") {
    rescueAlert.classList.add("hidden");
  } else if (prediction.className === "Needs review") {
    rescueAlert.classList.add("hidden");
  } else {
    rescueAlert.classList.remove("hidden");
    updateNearestRescue();
  }

  resultCard.classList.remove("hidden");
  resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
}

analyzeAnotherBtn.addEventListener("click", resetAssessment);
changePhotoBtn.addEventListener("click", () => fileInput.click());

confirmInjuredBtn.addEventListener("click", () => {
  currentPrediction = { className: "Injured", confidence: 1 };
  displayResult(currentPrediction);
});

confirmHealthyBtn.addEventListener("click", () => {
  currentPrediction = { className: "Healthy", confidence: 1 };
  displayResult(currentPrediction);
});

function resetAssessment() {
  uploadedImageFile = null;
  currentPrediction = null;
  fileInput.value = "";
  previewContainer.classList.add("hidden");
  resultCard.classList.add("hidden");
  alertStatus.textContent = "";
}

function renderRescueCenters() {
  rescueListEl.innerHTML = "";
  RESCUE_CENTERS.forEach((center) => {
    const card = document.createElement("div");
    card.className = "rescue-card";
    card.innerHTML = `
      <div class="rescue-card-heading"><span class="rescue-pin">+</span><div>
        <h3>${center.name}</h3>
        <p class="rescue-location">${center.location}${center.distance ? ` · ${center.distance} km away` : ""}</p>
      </div></div>
      <p>${center.description}</p>
      <a href="${center.link}">View demo partner <span>↗</span></a>
    `;
    rescueListEl.appendChild(card);
  });
}

renderRescueCenters();

locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationStatus.textContent = "Geolocation is not supported by your browser.";
    return;
  }

  locationStatus.textContent = "Finding the closest rescue partner...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude.toFixed(3);
      const lon = position.coords.longitude.toFixed(3);
      currentLocation = { lat: Number(lat), lon: Number(lon) };
      rankRescueCenters(position.coords.latitude, position.coords.longitude);
      locationStatus.textContent = `Location found · ${lat}, ${lon}. Rescue partners are ready.`;
      updateNearestRescue();
      renderRescueCenters();
    },
    () => {
      locationStatus.textContent = "Location access denied or unavailable. Showing all demo rescue partners instead.";
    }
  );
});

function rankRescueCenters(latitude, longitude) {
  RESCUE_CENTERS.forEach((center) => {
    center.distance = haversineDistance(latitude, longitude, center.latitude, center.longitude).toFixed(1);
  });
  RESCUE_CENTERS.sort((first, second) => Number(first.distance) - Number(second.distance));
  nearestRescue = RESCUE_CENTERS[0];
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;
  const latDifference = (lat2 - lat1) * Math.PI / 180;
  const lonDifference = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(latDifference / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(lonDifference / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateNearestRescue() {
  if (!nearestRescue || !currentPrediction || currentPrediction.className === "Healthy") return;
  nearestRescueText.textContent = `Nearest partner: ${nearestRescue.name} in ${nearestRescue.location}. Add your location, then send a handoff alert.`;
}

sendAlertBtn.addEventListener("click", () => {
  if (!currentPrediction || currentPrediction.className === "Healthy") return;
  const locationText = currentLocation ? `${currentLocation.lat}, ${currentLocation.lon}` : "Location not shared yet";
  alertStatus.textContent = `Demo alert prepared for ${nearestRescue.name}. Location: ${locationText}. No real message was sent.`;
  sendAlertBtn.textContent = "Alert sent ✓";
  sendAlertBtn.disabled = true;
});

(() => {
  const pageSections = [...document.querySelectorAll("body > .section")];

  function showPage(id, updateHistory = false) {
    const activeSection = pageSections.find((section) => section.id === id)
      || pageSections.find((section) => section.id === "home");
    if (!activeSection) return;

    pageSections.forEach((section) => {
      section.hidden = section !== activeSection;
    });

    document.querySelectorAll(".nav-links a").forEach((link) => {
      if (link.hash === `#${activeSection.id}`) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (updateHistory) {
      history.pushState(null, "", `#${activeSection.id}`);
    }

    window.scrollTo(0, 0);
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.hash.slice(1);
    if (!pageSections.some((section) => section.id === id)) return;

    event.preventDefault();
    showPage(id, true);
  });

  window.addEventListener("popstate", () => {
    showPage(window.location.hash.slice(1) || "home");
  });

  showPage(window.location.hash.slice(1) || "home");
})();
