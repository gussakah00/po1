import { authService } from "../utils/auth.js";
import { pushManager } from "../utils/push-manager.js";

class Navigation {
  constructor() {
    this.navElement = null;
    this.updateNavigation = this.updateNavigation.bind(this);
  }

  async init() {
    this.navElement = document.getElementById("nav-list");
    this.updateNavigation();

    window.addEventListener("authchange", this.updateNavigation);

    // Initialize push manager jika user sudah login
    if (authService.isLoggedIn()) {
      console.log("Navigation: Initializing push manager...");
      await pushManager.init();
    }
  }

  updateNavigation() {
    if (!this.navElement) return;

    const isLoggedIn = authService.isLoggedIn();
    const userName = authService.getUserName();

    if (isLoggedIn) {
      this.navElement.innerHTML = `
        <li><a href="#/beranda" class="nav-link">Beranda</a></li>
        <li><a href="#/about" class="nav-link">About</a></li>
        <li><a href="#/add" class="nav-link">Tambah Cerita</a></li>
        <li><a href="#/favorites" class="nav-link">Favorit</a></li>
        <li><a href="#/offline" class="nav-link">Offline</a></li>
        <li class="nav-user">
          <span class="user-name">Halo, ${userName}</span>
          <div class="notification-controls">
            <button id="enable-notifications" class="notification-toggle-btn" style="display: none;">
              🔔 Aktifkan Notifikasi
            </button>
            <button id="disable-notifications" class="notification-toggle-btn secondary" style="display: none;">
              🔕 Matikan Notifikasi
            </button>
          </div>
          <button id="logout-btn" class="logout-button" aria-label="Keluar dari akun">Keluar</button>
        </li>
      `;

      const logoutBtn = document.getElementById("logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", this.handleLogout.bind(this));
      }

      // Setup notification controls
      this._setupNotificationControls();
    } else {
      this.navElement.innerHTML = `
        <li><a href="#/about" class="nav-link">About</a></li>
        <li><a href="#/login" class="nav-link">Masuk</a></li>
        <li><a href="#/register" class="nav-link">Daftar</a></li>
      `;
    }
  }

  _setupNotificationControls() {
    console.log("Navigation: Setting up notification controls...");

    const enableBtn = document.getElementById("enable-notifications");
    const disableBtn = document.getElementById("disable-notifications");

    if (enableBtn && disableBtn) {
      // Update UI berdasarkan status subscription
      this._updateNotificationUI();

      enableBtn.addEventListener("click", async () => {
        console.log("Enable notifications clicked");
        const success = await pushManager.subscribe();
        if (success) {
          this._updateNotificationUI();
        }
      });

      disableBtn.addEventListener("click", async () => {
        console.log("Disable notifications clicked");
        const success = await pushManager.unsubscribe();
        if (success) {
          this._updateNotificationUI();
        }
      });
    }

    console.log("Navigation: Notification controls setup complete");
  }

  _updateNotificationUI() {
    const enableBtn = document.getElementById("enable-notifications");
    const disableBtn = document.getElementById("disable-notifications");

    if (!enableBtn || !disableBtn) return;

    const status = pushManager.getStatus();

    if (status.isSubscribed) {
      enableBtn.style.display = "none";
      disableBtn.style.display = "inline-block";
    } else {
      enableBtn.style.display = "inline-block";
      disableBtn.style.display = "none";
    }

    // Sembunyikan tombol jika notifikasi tidak didukung
    if (!status.isSupported) {
      enableBtn.style.display = "none";
      disableBtn.style.display = "none";
    }
  }

  handleLogout() {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
      authService.logout();
      window.dispatchEvent(new Event("authchange"));
      window.location.hash = "#/about";

      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.innerHTML = `
          <div style="text-align: center; padding: 40px;">
            <h1>Berhasil Keluar</h1>
            <p>Anda telah berhasil keluar dari akun.</p>
            <p>Mengarahkan ke halaman about...</p>
          </div>
        `;
      }
    }
  }
}

export const navigation = new Navigation();
