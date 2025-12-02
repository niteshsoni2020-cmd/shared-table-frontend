// js/about.js

document.addEventListener("DOMContentLoaded", () => {
    updateNavAuth(); // Ensure navbar is active
});

document.getElementById("contact-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const btn = e.target.querySelector("button");
    const originalText = btn.textContent;
    btn.textContent = "Sending...";
    btn.disabled = true;

    const body = {
        name: document.getElementById("contact-name").value,
        email: document.getElementById("contact-email").value,
        subject: document.getElementById("contact-subject").value,
        message: document.getElementById("contact-message").value
    };

    try {
        const res = await fetch(`${API_BASE}/api/contact`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            showModal("Message Sent! 📬", "Thank you for reaching out. We will get back to you shortly.", "success");
            e.target.reset();
        } else {
            showModal("Error", "Could not send message. Please try again.", "error");
        }
    } catch (err) {
        console.error(err);
        showModal("Network Error", "Please check your connection.", "error");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});