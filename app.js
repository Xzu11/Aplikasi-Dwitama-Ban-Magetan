// ==========================================
// ISI DENGAN URL WEB APP GOOGLE APPS SCRIPT-MU
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwAQUDV_0iZz35V54k1Ltu5umaQVd9SKcyEQuxB-80S6RGFopXkn6M74aMT0AUdsv7S/exec";

// ─── FULL VIEW TOGGLE ─────────────────────────────────────
let fullViewActive = false;

function toggleFullView() {
  fullViewActive = !fullViewActive;
  document.body.classList.toggle("full-view", fullViewActive);

  const buttons = document.querySelectorAll("#btnFullView, #btnFullViewInput");
  buttons.forEach((btn) => {
    if (fullViewActive) {
      btn.innerHTML = '<i class="fa-solid fa-compress"></i> Exit Full';
      btn.classList.add("active-full");
    } else {
      btn.innerHTML = '<i class="fa-solid fa-expand"></i> Full View';
      btn.classList.remove("active-full");
    }
  });

  // If switching to full view, ensure we're on the tampilan page
  if (fullViewActive) {
    const activePage = document.querySelector(".page.active");
    if (activePage && activePage.id !== "page-tampilan") {
      switchPage("tampilan");
    }
  }
}

// ─── PAGE SWITCH ──────────────────────────────────────────
function switchPage(pageName) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));

  document.getElementById("page-" + pageName).classList.add("active");
  document.getElementById("btn-" + pageName).classList.add("active");

  if (pageName === "tampilan") {
    loadData();
  }

  // If full view is active, stay in full view but update the button state
  // for the input page if needed
  if (fullViewActive && pageName === "input") {
    // When switching to input page in full view, we exit full view because
    // full view is primarily for viewing the table
    // But we'll let the user toggle back if they want
    // Actually, let's just keep full view state but the input page doesn't benefit much
    // We'll auto-exit full view when going to input
    if (pageName === "input" && fullViewActive) {
      toggleFullView(); // exit full view when going to input
    }
  }
}

// ─── LOAD DATA ────────────────────────────────────────────
async function loadData() {
  const tbody = document.getElementById("tabel-barang");
  tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:40px 0;color:var(--text-muted);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size:20px;display:block;margin-bottom:8px;"></i>
            Memuat data stok dari spreadsheet…
        </td></tr>`;

  try {
    const resp = await fetch(SCRIPT_URL);
    const data = await resp.json();

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:40px 0;color:var(--text-muted);">
                    <i class="fa-solid fa-inbox" style="font-size:28px;display:block;margin-bottom:8px;opacity:0.5;"></i>
                    Belum ada data barang.
                </td></tr>`;
      updateStats([]);
      return;
    }

    let totalStok = 0;
    const ukuranSet = new Set();

    data.forEach((item) => {
      const stok = Number(item.stok) || 0;
      totalStok += stok;
      if (item.ukuran) ukuranSet.add(item.ukuran.trim());

      const stockClass = stok <= 0 ? "low" : stok <= 3 ? "medium" : "high";

      tbody.innerHTML += `
                <tr>
                    <td><span class="badge-id">${escapeHtml(item.id || "—")}</span></td>
                    <td style="font-weight:500;">${escapeHtml(item.nama || "—")}</td>
                    <td><span class="badge-size">${escapeHtml(item.ukuran || "—")}</span></td>
                    <td class="text-right price-cell">Rp ${Number(item.harga).toLocaleString("id-ID")}</td>
                    <td class="text-center stock-cell">
                        <span class="stock-badge ${stockClass}">${stok}</span>
                    </td>
                </tr>
            `;
    });

    updateStats(data);
  } catch (err) {
    console.error("Error load data:", err);
    tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:40px 0;color:#ef4444;">
                <i class="fa-solid fa-circle-exclamation" style="font-size:24px;display:block;margin-bottom:8px;"></i>
                Gagal memuat data. Periksa URL Apps Script Anda.
            </td></tr>`;
    updateStats([]);
  }
}

// ─── UPDATE STATS ─────────────────────────────────────────
function updateStats(data) {
  const total = data.length || 0;
  let stokTotal = 0;
  const ukuranSet = new Set();
  let rendah = 0;

  data.forEach((item) => {
    const s = Number(item.stok) || 0;
    stokTotal += s;
    if (item.ukuran) ukuranSet.add(item.ukuran.trim());
    if (s <= 3) rendah++;
  });

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-stok").textContent = stokTotal;
  document.getElementById("stat-ukuran").textContent = ukuranSet.size;
  document.getElementById("stat-rendah").textContent = rendah;
}

// ─── SIMPAN DATA ──────────────────────────────────────────
async function simpanData(e) {
  e.preventDefault();

  const btn = document.getElementById("btn-submit-form");
  const orig = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Menyimpan ke Cloud…';

  const payload = {
    id_barang: document.getElementById("id_barang").value.trim(),
    nama: document.getElementById("nama").value.trim(),
    ukuran: document.getElementById("ukuran").value.trim(),
    harga: Number(document.getElementById("harga").value),
    stok: Number(document.getElementById("stok").value),
  };

  try {
    const resp = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const result = await resp.json();

    if (result.status === "success") {
      alert("✅ Mantap! Data berhasil masuk ke Google Spreadsheet.");
      document.getElementById("form-barang").reset();
      switchPage("tampilan");
    } else {
      alert("⚠️ Gagal menyimpan: " + (result.message || "unknown error"));
    }
  } catch (err) {
    console.error("Error simpan data:", err);
    alert('❌ Gagal menyimpan data. Pastikan status Deployment Apps Script sudah "Anyone".');
  } finally {
    btn.disabled = false;
    btn.innerHTML = orig;
  }
}

// ─── UTILITY ──────────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return "";
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(str).replace(/[&<>"']/g, (m) => map[m]);
}

// ─── AUTO LOAD ────────────────────────────────────────────
window.onload = loadData;
