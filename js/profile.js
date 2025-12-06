// Frontend/js/profile.js

// 🔴 THE CRITICAL FIX
const API_URL = 'https://shared-table-api.onrender.com/api';

const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

// Cloudinary
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dkqf90k20/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

const form = document.getElementById('profile-form');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const bioInput = document.getElementById('bio');
const profilePicPreview = document.getElementById('profile-pic-preview');
const fileInput = document.getElementById('file-upload');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
const uploadSpinner = document.getElementById('upload-spinner');
const hostPaymentSection = document.getElementById('host-payment-section');
const bsbInput = document.getElementById('bsb');
const accountInput = document.getElementById('account-number');

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed');
        const user = await res.json();
        
        nameInput.value = user.name || '';
        emailInput.value = user.email || '';
        bioInput.value = user.bio || '';
        if (user.profilePic) profilePicPreview.src = user.profilePic;
        
        if (user.isHost && hostPaymentSection) {
            hostPaymentSection.classList.remove('hidden');
            if (user.payoutDetails) {
                bsbInput.value = user.payoutDetails.bsb || '';
                if (user.payoutDetails.accountNumber) accountInput.value = user.payoutDetails.accountNumber; 
            }
        }
    } catch (err) {}
});

if(fileInput) {
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
}

if(uploadBtn) {
    uploadBtn.addEventListener('click', async (e) => {
        e.preventDefault(); 
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
            await saveProfile(data.secure_url);
            uploadStatus.textContent = "Profile picture updated!";
            uploadStatus.className = "text-xs text-green-600 mt-1 font-bold";
            uploadBtn.classList.add('hidden');
        } catch (err) {
            uploadStatus.textContent = "Upload failed.";
        } finally {
            uploadSpinner.classList.add('hidden');
            uploadBtn.disabled = false;
        }
    });
}

async function saveProfile(newProfilePicUrl = null) {
    const updateData = { name: nameInput.value, bio: bioInput.value, payoutDetails: { bsb: bsbInput ? bsbInput.value : '', accountNumber: accountInput ? accountInput.value : '' } };
    if (newProfilePicUrl) updateData.profilePic = newProfilePicUrl;

    const res = await fetch(`${API_URL}/auth/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updateData)
    });
    if (!res.ok) throw new Error('Update failed');
    return await res.json();
}

if(form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try { await saveProfile(); alert('Profile saved successfully!'); } 
        catch (err) { alert('Failed to save profile.'); }
    });
}