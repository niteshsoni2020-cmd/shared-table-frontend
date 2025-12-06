// Frontend/js/host.js

// 🔴 CONFIG
const API_BASE = 'https://shared-table-api.onrender.com/api';

const form = document.getElementById('create-experience-form');
const imageInput = document.getElementById('imageInput');
const uploadPreview = document.getElementById('upload-preview');
const uploadPlaceholder = document.getElementById('upload-placeholder');
const submitBtn = document.getElementById('submit-btn');

// Cloudinary Config
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dkqf90k20/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

let isEditing = false;
let editId = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Auth Check
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Check for Edit Mode (URL params)
    const params = new URLSearchParams(window.location.search);
    const id = params.get("edit");
    if (id) {
        isEditing = true;
        editId = id;
        loadExperienceForEdit(id);
    }
});

// --- IMAGE PREVIEW LOGIC ---
if (imageInput) {
    imageInput.addEventListener('change', () => {
        if (imageInput.files.length > 0) {
            uploadPreview.classList.remove('hidden');
            uploadPlaceholder.classList.add('hidden');
        }
    });
}

// --- LOAD DATA (For Editing) ---
async function loadExperienceForEdit(id) {
    submitBtn.textContent = "Loading...";
    try {
        const res = await fetch(`${API_BASE}/experiences/${id}`);
        const exp = await res.json();

        // Populate basic fields
        document.getElementById("title").value = exp.title;
        document.getElementById("city").value = exp.city;
        document.getElementById("description").value = exp.description;
        document.getElementById("price").value = exp.price;
        document.getElementById("maxGuests").value = exp.maxGuests;
        document.getElementById("availableDays").value = exp.availableDays.join(', ');
        document.getElementById("startDate").value = exp.startDate;
        document.getElementById("endDate").value = exp.endDate;

        // 🔴 POPULATE 3 PILLARS (Permutations)
        // We loop through the saved tags and check the matching boxes
        if (exp.tags && Array.isArray(exp.tags)) {
            exp.tags.forEach(tag => {
                const checkbox = document.querySelector(`input[name="tags"][value="${tag}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        // Show image preview if exists
        if (exp.imageUrl) {
            uploadPreview.classList.remove('hidden');
            uploadPlaceholder.classList.add('hidden');
        }

        submitBtn.textContent = "Update Experience";
    } catch (err) {
        console.error(err);
        alert("Failed to load experience details.");
    }
}

// --- FORM SUBMISSION ---
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        submitBtn.textContent = isEditing ? "Updating..." : "Publishing...";
        submitBtn.disabled = true;

        try {
            // 1. Handle Image Upload (Only if new file selected)
            let imageUrl = null;
            if (imageInput.files.length > 0) {
                const file = imageInput.files[0];
                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

                const uploadRes = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
                const uploadData = await uploadRes.json();
                imageUrl = uploadData.secure_url;
            }

            // 🔴 2. COLLECT 3 PILLARS (Permutations Logic)
            // This grabs ALL checked boxes, allowing for "Food" AND "Culture"
            const selectedTags = [];
            const checkboxes = document.querySelectorAll('input[name="tags"]:checked');
            checkboxes.forEach((checkbox) => {
                selectedTags.push(checkbox.value);
            });

            if (selectedTags.length === 0) {
                throw new Error("Please select at least one Category (Culture, Food, or Nature).");
            }

            // 3. Build Payload
            const experienceData = {
                title: document.getElementById('title').value,
                tags: selectedTags, // Send the array of tags
                city: document.getElementById('city').value,
                description: document.getElementById('description').value,
                price: Number(document.getElementById('price').value),
                maxGuests: Number(document.getElementById('maxGuests').value),
                availableDays: document.getElementById('availableDays').value.split(',').map(s => s.trim()),
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
            };

            // Only update image if a new one was uploaded
            if (imageUrl) {
                experienceData.images = [imageUrl];
                experienceData.imageUrl = imageUrl;
            }

            // 4. Send to API
            const url = isEditing ? `${API_BASE}/experiences/${editId}` : `${API_BASE}/experiences`;
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(experienceData)
            });

            if (res.ok) {
                alert(isEditing ? "Experience Updated!" : "Experience Published!");
                window.location.href = 'explore.html';
            } else {
                const errData = await res.json();
                throw new Error(errData.message || "Failed to save experience");
            }

        } catch (err) {
            console.error(err);
            alert(err.message);
            submitBtn.textContent = isEditing ? "Update Experience" : "Publish Experience";
            submitBtn.disabled = false;
        }
    });
}