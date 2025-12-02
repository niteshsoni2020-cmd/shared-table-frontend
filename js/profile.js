// js/profile.js

document.addEventListener("DOMContentLoaded", async () => {
    const token = getToken();
    if (!token) { window.location.href = "login.html"; return; }
    updateNavAuth();

    try {
        const res = await fetch(`${API_BASE}/api/me`, { headers: { "Authorization": `Bearer ${token}` } });
        const user = await res.json();

        // Fill Text Fields
        document.getElementById("display-name").value = user.name || "";
        document.getElementById("display-email").value = user.email || "";
        document.getElementById("bio").value = user.bio || "";
        document.getElementById("mobile").value = user.mobile || "";
        document.getElementById("location").value = user.location || "";
        
        // Fill Checkboxes (Preferences)
        const userPrefs = user.preferences || [];
        document.querySelectorAll("input[name='prefs']").forEach(cb => {
            if (userPrefs.includes(cb.value)) cb.checked = true;
        });

        // Host Status
        if (user.isHost) {
            const hostSection = document.getElementById("host-section");
            hostSection.className = "bg-white p-8 rounded-2xl shadow-sm border border-green-200 flex items-center justify-between";
            hostSection.innerHTML = `<div class="flex items-center gap-4"><div class="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl">✅</div><div><h2 class="text-xl font-bold text-gray-900">Verified Host</h2><p class="text-sm text-gray-500">Payout details active.</p></div></div><a href="my-bookings.html?view=hosting" class="px-6 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg">Dashboard</a>`;
        }
    } catch (err) { console.error(err); }
});

document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = getToken();
    const btn = e.target.querySelector("button");
    btn.textContent = "Saving..."; btn.disabled = true;

    // Collect Checkboxes
    const prefs = Array.from(document.querySelectorAll("input[name='prefs']:checked")).map(cb => cb.value);

    const body = {
        name: document.getElementById("display-name").value,
        bio: document.getElementById("bio").value,
        mobile: document.getElementById("mobile").value,
        location: document.getElementById("location").value,
        preferences: prefs // Send to server
    };

    try {
        const res = await fetch(`${API_BASE}/api/me`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            setAuth(token, await res.json());
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get("redirect");
            window.location.href = (redirect && redirect !== "null") ? decodeURIComponent(redirect) : "explore.html";
        } else {
            alert("Error saving profile.");
            btn.textContent = "Save & Continue"; btn.disabled = false;
        }
    } catch (err) { alert("Network error"); }
});

function openHostModal() { document.getElementById("host-modal").classList.remove("hidden"); }

document.getElementById("host-onboard-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = getToken();
    if(!document.getElementById("host-declare").checked) { alert("Indemnity required."); return; }

    const body = {
        accountName: document.getElementById("bank-name").value,
        bsb: document.getElementById("bank-bsb").value,
        accountNumber: document.getElementById("bank-acc").value,
        declarationAgreed: true
    };

    try {
        const res = await fetch(`${API_BASE}/api/host/onboard`, {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(body)
        });
        if (res.ok) window.location.reload();
    } catch (err) { alert("Network error"); }
});