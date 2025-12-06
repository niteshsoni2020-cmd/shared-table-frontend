// public/js/profile.js

// 1. Check Auth immediately
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}

const API_URL = 'https://the-shared-table.onrender.com/api'; // Or 'http://localhost:5000/api' for local

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
const hostPaymentSection = document.getElementById('host-payment-section');
const bsbInput = document.getElementById('bsb');
const accountInput = document.getElementById('account-number');

// Cloudinary Configuration
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dkqf90k20/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

// 2. Load Profile Data on Page Load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load profile');

        const user = await res.json();

        // Populate Form
        nameInput.value = user.name || '';
        emailInput.value = user.email || '';
        bioInput.value = user.bio || '';
        
        // Handle Profile Picture
        if (user.profilePic) {
            profilePicPreview.src = user.profilePic;
        }

        // Handle Host Payment Details
        if (user.isHost) {
            hostPaymentSection.classList.remove('hidden');
            if (user.payoutDetails) {
                bsbInput.value = user.payoutDetails.bsb || '';
                // Mask account number for display if it exists
                if (user.payoutDetails.accountNumber) {
                    accountInput.value = user.payoutDetails.accountNumber; 
                }
            }
        }

    } catch (err) {
        console.error(err);
        alert('Could not load profile. Please login again.');
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    }
});

// 3. Handle File Selection
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        // Show local preview immediately
        const reader = new FileReader();
        reader.onload = (e) => {
            profilePicPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
        
        // Show Upload Button
        uploadBtn.classList.remove('hidden');
        uploadStatus.textContent = "Click 'Upload & Save' to confirm.";
    }
});

// 4. Handle Image Upload to Cloudinary
uploadBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    // Show loading state
    uploadSpinner.classList.remove('hidden');
    uploadBtn.disabled = true;
    uploadStatus.textContent = "Uploading to secure cloud...";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
        const res = await fetch(CLOUDINARY_URL, {
            method: "POST",
            body: formData
        });

        if (!res.ok) throw new Error("Cloudinary upload failed");

        const data = await res.json();
        const imageUrl = data.secure_url;

        // Auto-save the profile with the new image URL immediately
        await saveProfile(imageUrl);

        uploadStatus.textContent = "Profile picture updated!";
        uploadStatus.className = "text-xs text-green-600 mt-1 font-bold";
        uploadBtn.classList.add('hidden'); // Hide button after success

    } catch (err) {
        console.error(err);
        uploadStatus.textContent = "Upload failed. Try again.";
        uploadStatus.className = "text-xs text-red-600 mt-1";
    } finally {
        uploadSpinner.classList.add('hidden');
        uploadBtn.disabled = false;
    }
});

// 5. Save Profile Function (Called by Form Submit OR Image Upload)
async function saveProfile(newProfilePicUrl = null) {
    const updateData = {
        name: nameInput.value,
        bio: bioInput.value,
        payoutDetails: {
            bsb: bsbInput.value,
            accountNumber: accountInput.value
        }
    };

    // If this was called by the image uploader, include the new URL
    if (newProfilePicUrl) {
        updateData.profilePic = newProfilePicUrl;
    }

    try {
        const res = await fetch(`${API_URL}/auth/update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        if (!res.ok) throw new Error('Update failed');

        const updatedUser = await res.json();
        
        // Update local storage user info if needed or just notify
        // (Optional: Update the navbar avatar immediately if we had one)
        
        return updatedUser;

    } catch (err) {
        throw err;
    }
}

// 6. Handle General Form Submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        await saveProfile();
        alert('Profile saved successfully!');
    } catch (err) {
        console.error(err);
        alert('Failed to save profile.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});