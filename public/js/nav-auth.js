// nav-auth.js
document.addEventListener("DOMContentLoaded", async () => {
  let user = null;
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      user = data.user;
    }
  } catch (err) {
    // network error or not authenticated
  }

  // Update nav links visibility based on role
  const navLinks = document.querySelector(".nav-links");
  if (navLinks) {
    const listItems = navLinks.querySelectorAll("li");
    
    if (user && user.Role === "admin") {
      // Admin: show Admin and Branches, hide others
      listItems.forEach(li => {
        const anchor = li.querySelector("a");
        if (anchor) {
          const text = anchor.textContent.trim().toLowerCase();
          if (text !== "admin") {
            li.style.display = "none";
          } else {
            li.style.display = "";
          }
        }
      });
    } else {
      // Not admin (regular user or not logged in): hide Admin, keep others
      listItems.forEach(li => {
        const anchor = li.querySelector("a");
        if (anchor) {
          const text = anchor.textContent.trim().toLowerCase();
          if (text === "admin") {
            li.style.display = "none";
          } else {
            li.style.display = "";
          }
        }
      });
    }
  }

  // Update the right-side nav buttons (Login/Register -> User info / Logout) if logged in
  if (user) {
    const navRightDivs = document.querySelectorAll('nav > div');
    const lastNavDiv = navRightDivs[navRightDivs.length - 1];

    if (lastNavDiv && !lastNavDiv.classList.contains('logo')) {
      const authButtons = lastNavDiv.querySelectorAll('a[href="auth.html"]');
      if (authButtons.length > 0) {
        let badgeHTML = '';
        if (user.Role === 'admin') {
          badgeHTML = `<span style="font-family:'Space Mono',monospace;font-size:0.72rem;color:var(--accent);background:rgba(245,197,24,0.1);border:1px solid rgba(245,197,24,0.3);padding:0.3rem 0.7rem;border-radius:4px;margin-right:0.6rem">ADMIN</span>`;
        } else {
          badgeHTML = `<span style="font-size:0.8rem;font-weight:600;margin-right:0.6rem;color:var(--text)">${user.FullName}</span>`;
        }
        
        lastNavDiv.innerHTML = badgeHTML + `<a href="#" class="btn btn-outline" style="font-size: 0.8rem" onclick="handleGlobalLogout(event)">Logout</a>`;
      }
    }
  }
});

async function handleGlobalLogout(e) {
  e.preventDefault();
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "index.html";
  } catch (err) {
    console.error("Logout failed", err);
  }
}
