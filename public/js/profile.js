// ─── profile.js — QueueWatch SA Profile Page Controller ───

document.addEventListener("DOMContentLoaded", async () => {
  let currentUser = null;

  // Helpers for formatting
  function waitLabel(w) {
    if (!w || w === 0) return { num: '—', unit: 'no reports yet' };
    if (w < 60)        return { num: w,   unit: 'min wait' };
    const h = (w / 60).toFixed(1).replace('.0', '');
    return { num: h, unit: h === '1' ? 'hr wait' : 'hrs wait' };
  }

  function timeAgo(dateStr) {
    if (!dateStr) return 'some time ago';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 1)  return 'just now';
    if (diff < 60) return `${diff} min ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h} hr${h > 1 ? 's' : ''} ago`;
    const d = Math.floor(h / 24);
    return `${d} day${d > 1 ? 's' : ''} ago`;
  }

  // Toast utility
  function showToast(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.style.display = "block";
    setTimeout(() => { t.style.display = "none"; }, 3000);
  }

  // Check login state
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) {
      // Redirect to login if not logged in
      window.location.href = "auth.html";
      return;
    }
    const data = await res.json();
    currentUser = data.user;
  } catch (err) {
    console.error("Auth check failed:", err);
    window.location.href = "auth.html";
    return;
  }

  // Render header & populate form
  if (currentUser) {
    // Populate form values
    document.getElementById("profile-name").value = currentUser.FullName;
    document.getElementById("profile-email").value = currentUser.Email;
    
    // Update profile header details
    document.getElementById("header-name").textContent = currentUser.FullName;
    document.getElementById("header-email").textContent = currentUser.Email;
    
    // Dynamically set role badge
    const roleBadge = document.getElementById("header-role-badge");
    if (currentUser.Role === "admin") {
      roleBadge.textContent = "ADMIN";
      roleBadge.style.background = "rgba(245, 197, 24, 0.1)";
      roleBadge.style.border = "1px solid rgba(245, 197, 24, 0.3)";
      roleBadge.style.color = "var(--accent)";
    } else {
      roleBadge.textContent = "MEMBER";
      roleBadge.style.background = "rgba(0, 184, 148, 0.1)";
      roleBadge.style.border = "1px solid rgba(0, 184, 148, 0.3)";
      roleBadge.style.color = "var(--quiet)";
    }

    // Set dynamic 2-character avatar initials
    const initials = currentUser.FullName.split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    document.getElementById("header-avatar").textContent = initials || "U";
  }

  // Hook up Logout buttons (both in Navbar and Profile panel)
  const logoutButtons = document.querySelectorAll('a[href="index.html"]');
  logoutButtons.forEach(btn => {
    // Check if it's the Logout button
    if (btn.textContent.trim().toLowerCase() === "logout") {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
          window.location.href = "index.html";
        } catch (err) {
          console.error("Logout failed:", err);
          window.location.href = "index.html";
        }
      });
    }
  });

  // Fetch and render user reports & calculate statistics
  async function loadUserReports() {
    try {
      const res = await fetch("/api/reports/user", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load user reports");
      
      const reports = await res.json();
      
      // Calculate dynamic stats
      const reportsCount = reports.length;
      
      const uniqueBranches = new Set(reports.map(r => r.BranchID)).size;
      
      const flaggedCount = reports.filter(r => r.IsFlagged === 1).length;
      const accuracyRate = reportsCount > 0 
        ? Math.round(((reportsCount - flaggedCount) / reportsCount) * 100) 
        : 100;

      // Update statistics UI
      document.getElementById("stat-reports-count").textContent = reportsCount;
      document.getElementById("stat-accuracy-rate").textContent = `${accuracyRate}%`;
      document.getElementById("stat-branches-count").textContent = uniqueBranches;

      // Render reports list
      const reportsContainer = document.getElementById("user-reports-list");
      reportsContainer.innerHTML = "";

      if (reportsCount === 0) {
        reportsContainer.innerHTML = `
          <div style="background: var(--surface); border: 1px dashed var(--border); border-radius: 12px; padding: 3rem; text-align: center; color: var(--muted);">
            <div style="font-size: 2rem; margin-bottom: 0.5rem;"> 📝</div>
            <p>You haven't submitted any queue reports yet.</p>
            <a href="report.html" class="btn btn-outline" style="display: inline-block; margin-top: 1rem; font-size: 0.8rem;">Submit your first report</a>
          </div>
        `;
        return;
      }

      reports.forEach(r => {
        const wl = waitLabel(r.WaitMinutes);
        const relativeTime = timeAgo(r.CreatedAt);
        
        let badgeClass = "status-offline";
        if (r.Status === "Quiet") badgeClass = "status-quiet";
        else if (r.Status === "Busy") badgeClass = "status-busy";
        else if (r.Status === "Very Busy") badgeClass = "status-vbusy";

        const reportCard = document.createElement("div");
        reportCard.className = "report-item";
        if (r.IsFlagged === 1) {
          reportCard.style.borderColor = "var(--vbusy)";
          reportCard.style.background = "rgba(235, 94, 40, 0.03)";
        }

        reportCard.innerHTML = `
          <div class="report-item-top">
            <div>
              <span class="report-user">${r.BranchName}</span>
              <span class="report-time">${relativeTime}</span>
              ${r.IsFlagged === 1 ? '<span style="font-family:\'Space Mono\',monospace; font-size:0.6rem; color:var(--vbusy); background:rgba(235, 94, 40, 0.1); padding:0.1rem 0.4rem; border-radius:3px; margin-left:0.5rem;">FLAGGED</span>' : ''}
            </div>
            <div class="status-badge ${badgeClass}" style="font-size: 0.65rem">${r.Status}</div>
          </div>
          <div style="display: flex; align-items: baseline; gap: 0.3rem; margin: 0.5rem 0;">
            <span style="font-size: 1.4rem; font-weight: 800; color: var(--${badgeClass === 'status-vbusy' ? 'vbusy' : badgeClass === 'status-busy' ? 'busy' : badgeClass === 'status-quiet' ? 'quiet' : 'offline'})">${wl.num}</span>
            <span style="font-size: 0.75rem; color: var(--muted); font-family: 'Space Mono', monospace;">${wl.unit}</span>
          </div>
          ${r.Notes ? `<div class="report-note">"${r.Notes}"</div>` : ''}
        `;
        reportsContainer.appendChild(reportCard);
      });

    } catch (err) {
      console.error("Error rendering user reports:", err);
      showToast("Error loading your queue reports");
    }
  }

  // Load the reports and stats
  await loadUserReports();

  // Handle Save Changes button
  const saveBtn = document.getElementById("profile-save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      
      const fullName = document.getElementById("profile-name").value.trim();
      const email = document.getElementById("profile-email").value.trim();
      const newPassword = document.getElementById("profile-password").value.trim();

      if (!fullName || !email) {
        showToast("Full Name and Email are required");
        return;
      }

      // Basic email regex validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        showToast("Please enter a valid email address");
        return;
      }

      if (newPassword && newPassword.length > 0) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
          showToast("New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
          return;
        }
      }

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving Changes...";

        const res = await fetch("/api/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ fullName, email, newPassword }),
          credentials: "include"
        });

        const data = await res.json();
        
        if (!res.ok) {
          showToast(data.error || "Failed to update profile");
        } else {
          showToast("Profile updated successfully!");
          
          // Dynamically refresh elements
          document.getElementById("header-name").textContent = fullName;
          document.getElementById("header-email").textContent = email;
          
          // Re-generate initials
          const initials = fullName.split(" ")
            .map(n => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();
          document.getElementById("header-avatar").textContent = initials || "U";
          
          // Clear password field
          document.getElementById("profile-password").value = "";
        }
      } catch (err) {
        console.error("Update profile failed:", err);
        showToast("An error occurred. Please try again.");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Changes";
      }
    });
  }
});
