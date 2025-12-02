// js/host.js

let isEditing = false;
let editId = null;
let map, marker;

document.addEventListener("DOMContentLoaded", async () => {
  const user = getCurrentUser();
  if (!user) { window.location.href = "login.html"; return; }
  updateNavAuth();

  // 1. DATE CONSTRAINTS
  const startInput = document.getElementById("startDate");
  const endInput = document.getElementById("endDate");
  const today = new Date().toISOString().split("T")[0];
  startInput.min = today; endInput.min = today;
  startInput.addEventListener("change", () => {
      if (endInput.value < startInput.value) endInput.value = startInput.value;
      endInput.min = startInput.value;
  });

  // 2. HELPERS
  populateTimeDropdown("slot1Start"); populateTimeDropdown("slot2Start");
  populateDiscountSelect("discSmall"); populateDiscountSelect("discMedium"); populateDiscountSelect("discLarge");

  // 3. MAP INIT
  const defaultLat = -37.8136; 
  const defaultLng = 144.9631;
  map = L.map('map-picker').setView([defaultLat, defaultLng], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

  map.on('click', function(e) { setPin(e.latlng.lat, e.latlng.lng); });
  setPin(defaultLat, defaultLng); 
  
  // 4. IMAGE UPLOAD
  const fileInput = document.getElementById("imageUpload");
  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
        const files = e.target.files;
        if (files.length > 3) { showModal("Limit Reached", "Maximum 3 images allowed.", "error"); fileInput.value = ""; return; }

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) formData.append("photos", files[i]);

        document.getElementById("image-preview").innerHTML = `<span class="text-xs text-orange-600 font-bold animate-pulse">Uploading...</span>`;

        try {
            const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok) {
                document.getElementById("finalImageUrls").value = JSON.stringify(data.images);
                document.getElementById("image-preview").innerHTML = data.images.map(u => `<img src="${u}" class="h-full w-auto rounded-lg border shadow-sm object-cover" />`).join("");
            } else { showModal("Upload Failed", data.message, "error"); document.getElementById("image-preview").innerHTML = ""; }
        } catch (err) { showModal("Error", "Network error uploading images.", "error"); document.getElementById("image-preview").innerHTML = ""; }
    });
  }

  // 5. CHECK EDIT MODE
  const params = new URLSearchParams(window.location.search);
  const id = params.get("edit");
  if (id) { isEditing = true; editId = id; loadExperienceForEdit(id); }
});

// --- FUNCTIONS ---

function setPin(lat, lng) {
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(map);
    document.getElementById('lat').value = lat;
    document.getElementById('lng').value = lng;
}

function populateTimeDropdown(id) {
  const s = document.getElementById(id); s.innerHTML = "<option value=''>Select</option>";
  for(let h=6;h<24;h++) for(let m=0;m<60;m+=30) {
      const t = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      s.appendChild(new Option(t,t));
  }
}
function populateDiscountSelect(id) {
  const s = document.getElementById(id); s.appendChild(new Option("No discount", ""));
  for(let d=5;d<=80;d+=5) s.appendChild(new Option(`${d}%`, d));
}
function addMinutesToTime(start, mins) {
  const [hh,mm] = start.split(":").map(Number);
  const d = new Date(2000,0,1,hh,mm + mins);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

async function loadExperienceForEdit(id) {
    document.querySelector("h1").textContent = "Edit your experience";
    document.querySelector("button[type='submit']").textContent = "Update Experience";
    const res = await fetch(`${API_BASE}/api/experiences/${id}`);
    const exp = await res.json();
    if (!res.ok) return showModal("Error", "Could not load experience.", "error");

    document.getElementById("title").value = exp.title;
    document.getElementById("city").value = exp.city;
    document.getElementById("category").value = exp.tags[0];
    document.getElementById("description").value = exp.description;
    document.getElementById("startDate").value = exp.startDate;
    document.getElementById("endDate").value = exp.endDate;
    document.getElementById("price").value = exp.price;
    document.getElementById("maxGuests").value = exp.maxGuests;
    if(exp.privatePrice) document.getElementById("privatePrice").value = exp.privatePrice;
    if(exp.privateCapacity) document.getElementById("privateCapacity").value = exp.privateCapacity;

    // Map
    if(exp.lat && exp.lng) {
        setPin(exp.lat, exp.lng);
        map.setView([exp.lat, exp.lng], 13);
    }

    // Images
    if(exp.images && exp.images.length > 0) {
        document.getElementById("finalImageUrls").value = JSON.stringify(exp.images);
        document.getElementById("image-preview").innerHTML = exp.images.map(u => `<img src="${u}" class="h-full w-auto rounded-lg border shadow-sm object-cover" />`).join("");
    }
}

async function handleCreateExperience(e) {
  e.preventDefault();
  const token = getToken();
  
  const rawImages = document.getElementById("finalImageUrls").value;
  const images = rawImages ? JSON.parse(rawImages) : [];

  const s1Start = document.getElementById("slot1Start").value;
  const s1Dur = document.getElementById("slot1Duration").value;
  
  // Validation
  if (!s1Start || !s1Dur) {
      showModal("Missing Info", "Please select a start time and duration.", "error");
      return;
  }

  const slots = [`${s1Start}-${addMinutesToTime(s1Start, Number(s1Dur))}`];
  
  // Slot 2 (Optional)
  const s2Start = document.getElementById("slot2Start").value;
  const s2Dur = document.getElementById("slot2Duration").value;
  if(s2Start && s2Dur) slots.push(`${s2Start}-${addMinutesToTime(s2Start, Number(s2Dur))}`);

  const payload = {
    title: document.getElementById("title").value,
    city: document.getElementById("city").value,
    price: Number(document.getElementById("price").value),
    maxGuests: Number(document.getElementById("maxGuests").value) || 10,
    description: document.getElementById("description").value,
    startDate: document.getElementById("startDate").value,
    endDate: document.getElementById("endDate").value,
    tags: [document.getElementById("category").value],
    timeSlots: slots,
    lat: document.getElementById("lat").value,
    lng: document.getElementById("lng").value,
    images: images,
    imageUrl: images[0] || "",
    privateCapacity: Number(document.getElementById("privateCapacity").value) || null,
    privatePrice: Number(document.getElementById("privatePrice").value) || null,
    dynamicDiscounts: {}
  };

  const url = isEditing ? `${API_BASE}/api/experiences/${editId}` : `${API_BASE}/api/experiences`;
  const method = isEditing ? "PUT" : "POST";

  const statusEl = document.getElementById("status-message");
  statusEl.textContent = "Processing...";

  try {
    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
        showModal("Success!", isEditing ? "Experience updated." : "Experience published.", "success");
        setTimeout(() => window.location.href = "my-bookings.html?view=hosting", 1500);
    } else {
        const data = await res.json();
        showModal("Error", data.message, "error");
        statusEl.textContent = "";
    }
  } catch (err) { showModal("Error", "Network error.", "error"); statusEl.textContent = ""; }
}