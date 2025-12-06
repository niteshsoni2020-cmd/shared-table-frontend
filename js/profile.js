// Frontend/js/profile.js

// 🔴 CONFIG
const API_URL = 'https://shared-table-api.onrender.com/api';

const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

// Cloudinary Config
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dkqf90k20/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

// DOM Elements
const form = document.getElementById('profile-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const bioInput = document.getElementById('bio');
const profilePicPreview = document.getElementById('profile-pic-preview');
const fileInput = document.getElementById('file-upload');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
const uploadSpinner = document.getElementById('upload-spinner');

// Host Section Elements
const hostPaymentSection = document.getElementById('host-payment-section');
const bsbInput = document.getElementById('bsb');
const accountInput = document.getElementById('account-number');
const vacationToggle = document.getElementById('vacation-mode'); // NEW

// 1. Load Profile
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load profile');

        const user = await res.json();

        // Populate Common Fields
        nameInput.value = user.name || '';
        emailInput.value = user.email || '';
        bioInput.value = user.bio || '';
        if (user.profilePic) profilePicPreview.src = user.profilePic;

        // Populate Host Fields
        if (user.isHost) {
            hostPaymentSection.classList.remove('hidden');
            
            // Payouts
            if (user.payoutDetails) {
                bsbInput.value = user.payoutDetails.bsb || '';
                if (user.payoutDetails.accountNumber) accountInput.value = user.payoutDetails.accountNumber; 
            }

            // Vacation Mode (NEW)
            if (vacationToggle) {
                vacationToggle.checked = user.vacationMode || false;
            }
        }

    } catch (err) {
        console.error(err);
    }
});

// 2. Handle File Selection (Existing Logic)
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => profilePicPreview.src = e.target.result;
        reader.readAsDataURL(file);
        uploadBtn.classList.remove('hidden');
        uploadStatus.textContent = "Click 'Upload & Save' to confirm.";
    }
});

// 3. Handle Image Upload (Existing Logic)
uploadBtn.addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent form submit
    const file = fileInput.files[0];
    if (!file) return;

    uploadSpinner.classList.remove('hidden');
    uploadBtn.disabled = true;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
        const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
        if (!res.ok) throw new Error("Cloudinary upload failed");
        
        const data = await res.json();
        await saveProfile(data.secure_url); // Auto-save after upload
        
        uploadStatus.textContent = "Profile picture updated!";
        uploadStatus.className = "text-xs text-green-600 mt-1 font-bold";
        uploadBtn.classList.add('hidden');

    } catch (err) {
        console.error(err);
        uploadStatus.textContent = "Upload failed.";
    } finally {
        uploadSpinner.classList.add('hidden');
        uploadBtn.disabled = false;
    }
});

// 4. Save Profile Function (Updated to include Vacation Mode)
async function saveProfile(newProfilePicUrl = null) {
    const updateData = {
        name: nameInput.value,
        bio: bioInput.value,
        payoutDetails: {
            bsb: bsbInput.value,
            accountNumber: accountInput.value
        },
        vacationMode: vacationToggle ? vacationToggle.checked : false // Send toggle state
    };

    if (newProfilePicUrl) updateData.profilePic = newProfilePicUrl;

    const res = await fetch(`${API_URL}/auth/update`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
    });

    if (!res.ok) throw new Error('Update failed');
    return await res.json();
}

// 5. Form Submit Handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        await saveProfile();
        alert('Profile settings saved!');
    } catch (err) {
        alert('Failed to save settings.');
    } finally {
        btn.textContent = 'Save Changes';
        btn.disabled = false;
    }
});