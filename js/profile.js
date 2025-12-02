// js/profile.js

document.addEventListener("DOMContentLoaded", async () => {
    const token = getToken();
    if (!token) { window.location.href = "login.html?redirect=profile.html"; return; }
    updateNavAuth();

    // --- LOAD DATA ---
    try {
        const res = await fetch(`${API_BASE}/api/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) { logout(); return; }

        const user = await res.json();

        // Fill Form
        document.getElementById("display-name").value = user.name || "";
        document.getElementById("display-email").value = user.email || "";
        document.getElementById("bio").value = user.bio || "";
        document.getElementById("mobile").value = user.mobile || "";
        document.getElementById("location").value = user.location || "";
        
        // Header Info
        document.getElementById("profile-name-display").textContent = user.name || "User";
        document.getElementById("profile-email-display").textContent = user.email || "";

        // Avatar Handling
        const avatarContainer = document.getElementById("profile-initial").parentElement;
        if (user.profilePic) {
            avatarContainer.innerHTML = `<img src="${user.profilePic}" class="w-full h-full object-cover rounded-full" />`;
            document.getElementById("profile-pic-url").value = user.profilePic;
        } else {
            const initial = (user.name || "U").charAt(0).toUpperCase();
            document.getElementById("profile-initial").textContent = initial;
        }

        // Checkboxes
        const userPrefs = user.preferences || [];
        document.querySelectorAll("input[name='prefs']").forEach(cb => {
            if (userPrefs.includes(cb.value)) cb.checked = true;
        });

        // Host Status Card & Vacation Mode
        const hostCard = document.getElementById("host-status-card");
        hostCard.classList.remove("hidden");
        
        if (user.isHost) {
            const isVacation = user.vacationMode || false;
            
            // VERIFIED HOST VIEW + VACATION TOGGLE
            hostCard.innerHTML = `
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-green-200 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <div class="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl">✅</div>
                        <div>
                            <h2 class="text-lg font-bold text-gray-900">Verified Host Account</h2>
                            <p class="text-sm text-gray-500">Your payout details are active.</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-4">
                        <div class="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                            <span class="text-sm font-bold text-gray-700">Vacation Mode</span>
                            <div class="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                                <input type="checkbox" id="vacation-toggle" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300" ${isVacation ? 'checked' : ''}/>
                                <label for="vacation-toggle" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
                            </div>
                        </div>
                        <a href="my-bookings.html?view=hosting" class="px-5 py-2 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition text-sm">Go to Dashboard</a>
                    </div>
                </div>
                ${isVacation ? '<div class="mt-2 text-center text-xs font-bold text-orange-600 bg-orange-50 p-2 rounded">⚠️ Your listings are currently hidden from search results.</div>' : ''}
                `;

            // Attach Listener
            document.getElementById("vacation-toggle").addEventListener("change", handleVacationToggle);

        } else {
            // GUEST VIEW (Upsell)
            hostCard.innerHTML = `
                <div class="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl shadow-sm border border-orange-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 class="text-xl font-bold mb-2 text-gray-900">Become a Host</h2>
                        <p class="text-gray-600 text-sm max-w-md">Earn money by sharing your culture. You just need to set up your Australian bank details.</p>
                    </div>
                    <a href="my-bookings.html?view=hosting" class="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg hover:bg-orange-700 transition transform hover:scale-105 whitespace-nowrap">
                        Set up Host Account
                    </a>
                </div>`;
        }

    } catch (err) { console.error(err); }
});

// --- VACATION TOGGLE HANDLER ---
async function handleVacationToggle(e) {
    const isPaused = e.target.checked;
    const token = getToken();
    
    try {
        const res = await fetch(`${API_BASE}/api/me`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ vacationMode: isPaused })
        });
        
        if (res.ok) {
            showModal("Updated", isPaused ? "Vacation Mode ON. Your listings are hidden." : "Welcome back! Your listings are visible.", "info");
            // Reload to update UI text
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showModal("Error", "Could not update status.", "error");
            e.target.checked = !isPaused; // Revert
        }
    } catch(err) {
        showModal("Error", "Network error.", "error");
        e.target.checked = !isPaused;
    }
}

// --- IMAGE UPLOAD LOGIC ---
document.getElementById("upload-btn").addEventListener("click", () => {
    document.getElementById("file-input").click();
});

document.getElementById("file-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const btn = document.getElementById("upload-btn");
    const originalText = btn.textContent;
    btn.textContent = "Uploading...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append("photos", file);

    try {
        const res = await fetch(`${API_BASE}/api/upload`, { method: "POST", body: formData });
        const data = await res.json();
        
        if (res.ok && data.images.length > 0) {
            const url = data.images[0];
            const avatarContainer = document.getElementById("profile-initial").parentElement;
            avatarContainer.innerHTML = `<img src="${url}" class="w-full h-full object-cover rounded-full" />`;
            document.getElementById("profile-pic-url").value = url;
            showModal("Success", "Photo uploaded! Click 'Save Changes' to make it permanent.", "success");
        } else {
            showModal("Error", "Upload failed.", "error");
        }
    } catch (err) {
        showModal("Error", "Network error.", "error");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// --- SAVE LOGIC ---
document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = getToken();
    const btn = e.target.querySelector("button[type='submit']");
    const originalText = btn.textContent;
    
    btn.textContent = "Saving..."; 
    btn.disabled = true;

    const prefs = Array.from(document.querySelectorAll("input[name='prefs']:checked")).map(cb => cb.value);

    const body = {
        name: document.getElementById("display-name").value,
        bio: document.getElementById("bio").value,
        mobile: document.getElementById("mobile").value,
        location: document.getElementById("location").value,
        profilePic: document.getElementById("profile-pic-url").value,
        preferences: prefs
    };

    try {
        const res = await fetch(`${API_BASE}/api/me`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const user = await res.json();
            setAuth(token, user); 
            updateNavAuth();
            const msg = document.getElementById("save-msg");
            msg.classList.remove("hidden");
            setTimeout(() => msg.classList.add("hidden"), 3000);
        } else {
            showModal("Error", "Failed to update profile.", "error");
        }
    } catch (err) {
        showModal("Network Error", "Please check your connection.", "error");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});