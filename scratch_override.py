import os

css_override = """
/* =========================================================
   FRONTEND-DESIGN OVERRIDE: VIBRANT & PLAYFUL
   ========================================================= */
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Nunito:wght@400;600;800&display=swap');

:root {
  --bg: #0f172a !important; /* Deep Midnight Blue */
  --surface: #1e293b !important; /* Soft Slate */
  --surface2: #334155 !important;
  --border: #475569 !important;
  --accent: #fde047 !important; /* Sunny Yellow */
  --accent2: #ec4899 !important; /* Playful Pink */
  --text: #f8fafc !important;
  --muted: #94a3b8 !important;
  
  /* Super vibrant status colors */
  --quiet: #34d399 !important; /* Mint Green */
  --busy: #fbbf24 !important; /* Amber */
  --vbusy: #f43f5e !important; /* Rose Red */
  --offline: #94a3b8 !important; /* Slate */
  
  --font-display: 'Fredoka', sans-serif !important;
  --font-mono: 'Nunito', sans-serif !important; /* Swapped to Nunito for friendly readability */
}

body {
  background: var(--bg) !important;
  color: var(--text) !important;
  font-family: var(--font-mono) !important;
  letter-spacing: 0.01em !important;
}

/* Remove old noise for a clean, vibrant look */
body::before {
  display: none !important;
}

/* Background blob gradients for playfulness */
body::after {
  content: "";
  position: fixed;
  inset: 0;
  background: 
    radial-gradient(circle at 15% 50%, rgba(236, 72, 153, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 85% 30%, rgba(6, 182, 212, 0.08) 0%, transparent 40%);
  z-index: -1 !important;
  pointer-events: none !important;
}

/* Typography Overrides */
h1, h2, h3, .branch-name, .logo {
  font-family: var(--font-display) !important;
  font-weight: 700 !important;
  letter-spacing: 0.02em !important;
}

/* Make everything super bouncy and soft */
* {
  transition-property: transform, box-shadow, background-color, border-color, color !important;
  transition-duration: 0.3s !important;
  transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1) !important; /* Bouncy easing */
}

/* Soft, pill-like shapes everywhere */
.btn, .status-badge, .search-input, .form-control, .hero-tag, .tab {
  border-radius: 50px !important;
}
.branch-card, .wait-hero-box, .report-item, .summary-card, .auth-card, .admin-stat-card, .modal {
  border-radius: 24px !important;
  border: none !important;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5) !important;
}

/* Nav & Header */
nav {
  background: rgba(15, 23, 42, 0.8) !important;
  border-bottom: none !important;
  box-shadow: 0 4px 30px rgba(0,0,0,0.1) !important;
}
.nav-links a {
  font-size: 0.95rem !important;
  font-weight: 800 !important;
}
.nav-links a:hover, .nav-links a.active {
  color: var(--accent) !important;
  transform: translateY(-2px) !important;
}

.logo-dot {
  background: var(--accent2) !important;
  border-radius: 50% !important;
  box-shadow: 0 0 15px var(--accent2) !important;
}

/* Buttons */
.btn {
  font-family: var(--font-display) !important;
  font-weight: 700 !important;
  font-size: 1rem !important;
  padding: 0.7rem 1.6rem !important;
  border: none !important;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2) !important;
}
.btn-primary {
  background: linear-gradient(135deg, var(--accent2), #8b5cf6) !important;
  color: #fff !important;
}
.btn-primary:hover {
  transform: translateY(-4px) scale(1.02) !important;
  box-shadow: 0 12px 25px rgba(236, 72, 153, 0.4) !important;
}

/* Cards */
.branch-card {
  background: var(--surface) !important;
  position: relative !important;
  overflow: hidden !important;
  border-top: 6px solid var(--status-color, var(--surface2)) !important;
}
.branch-card:hover {
  transform: translateY(-8px) scale(1.02) !important;
  box-shadow: 0 20px 40px -10px rgba(0,0,0,0.4) !important;
  background: #253347 !important;
}

/* Floating Status Badges */
.status-badge {
  padding: 0.4rem 0.9rem !important;
  font-family: var(--font-display) !important;
  font-size: 0.8rem !important;
  border: none !important;
}

.wait-number {
  font-family: var(--font-display) !important;
  font-size: 3.5rem !important;
  background: linear-gradient(135deg, #f8fafc, #cbd5e1) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

/* Tabs */
.tab {
  border: none !important;
  background: var(--surface2) !important;
}
.tab.active, .tab:hover {
  background: var(--accent2) !important;
  color: #fff !important;
  transform: translateY(-2px) !important;
}

/* Inputs */
.search-input, .form-control {
  background: rgba(255,255,255,0.05) !important;
  border: 2px solid transparent !important;
  padding: 1rem 1.5rem !important;
}
.search-input:focus, .form-control:focus {
  background: rgba(255,255,255,0.1) !important;
  border-color: var(--accent2) !important;
  box-shadow: 0 0 0 4px rgba(236, 72, 153, 0.2) !important;
  transform: translateY(-2px) !important;
}

/* Game Cell */
.ttt-cell {
  background: var(--surface2) !important;
  border-radius: 20px !important;
  font-family: var(--font-display) !important;
  font-size: 3rem !important;
  color: var(--accent) !important;
  border: none !important;
  box-shadow: inset 0 4px 10px rgba(0,0,0,0.2) !important;
}
.ttt-cell:hover {
  background: #475569 !important;
  transform: scale(0.95) !important;
}
"""

path = os.path.join('public', 'css', 'style.css')
with open(path, 'a', encoding='utf-8') as f:
    f.write('\n' + css_override)

print('Successfully appended playful override to style.css')
