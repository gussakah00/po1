import { getActiveRoute } from "../routes/url-parser.js";
import { navigation } from "../components/navigation.js";
import { authService } from "../utils/auth.js";

// Import routes sebagai function loader
const routes = {
  "/beranda": () => import("../pages/home/home-page.js"),
  "/about": () => import("../pages/about/about-page.js"),
  "/add": () => import("../pages/add/add-page.js"),
  "/login": () => import("../pages/auth/login-page.js"),
  "/register": () => import("../pages/auth/register-page.js"),
  "/favorites": () => import("../pages/favorites/favorites-page.js"),
  "/offline": () => import("../pages/offline/offline-page.js"),
};

class App {
  _content = null;
  _drawerButton = null;
  _navigationDrawer = null;
  _isRendering = false;
  _currentPage = null;
  _previousRoute = null;
  _currentRoute = null;

  // Definisikan urutan halaman untuk menentukan arah
  _pageOrder = {
    "/beranda": 1,
    "/about": 2,
    "/add": 3,
    "/favorites": 4,
    "/offline": 5,
    "/login": 6,
    "/register": 7,
  };

  constructor({ navigationDrawer, drawerButton, content }) {
    this._content = content;
    this._drawerButton = drawerButton;
    this._navigationDrawer = navigationDrawer;
    this._isRendering = false;
    this._currentPage = null;
    this._previousRoute = null;
    this._currentRoute = null;

    this._setupDrawer();
    this._setupSkipLink();
    this._initRouter();
    this._initNavigation();
  }

  _initNavigation() {
    navigation.init();
  }

  _initRouter() {
    // Debounce untuk prevent multiple calls
    const debounce = (func, wait) => {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };

    const debouncedRender = debounce(() => this.renderPage(), 100);

    window.addEventListener("hashchange", debouncedRender);
    window.addEventListener("load", () => this.renderPage());
    window.addEventListener("authchange", () => {
      this.renderPage();
      navigation.init();
    });
  }

  _setupDrawer() {
    if (!this._drawerButton || !this._navigationDrawer) {
      console.error("Drawer elements not found in DOM.");
      return;
    }

    this._drawerButton.addEventListener("click", () => {
      const isExpanded = this._navigationDrawer.classList.toggle("open");
      this._drawerButton.setAttribute("aria-expanded", isExpanded);

      if (isExpanded) {
        this._drawerButton.innerHTML = "✕";
        this._drawerButton.setAttribute("aria-label", "Tutup menu navigasi");
      } else {
        this._drawerButton.innerHTML = "☰";
        this._drawerButton.setAttribute("aria-label", "Buka menu navigasi");
      }
    });

    document.body.addEventListener("click", (event) => {
      if (
        !this._navigationDrawer.contains(event.target) &&
        !this._drawerButton.contains(event.target) &&
        this._navigationDrawer.classList.contains("open")
      ) {
        this._navigationDrawer.classList.remove("open");
        this._drawerButton.setAttribute("aria-expanded", "false");
        this._drawerButton.innerHTML = "☰";
        this._drawerButton.setAttribute("aria-label", "Buka menu navigasi");
      }
    });

    this._navigationDrawer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 768) {
          this._navigationDrawer.classList.remove("open");
          this._drawerButton.setAttribute("aria-expanded", "false");
          this._drawerButton.innerHTML = "☰";
          this._drawerButton.setAttribute("aria-label", "Buka menu navigasi");
        }
      });
    });
  }

  _setupSkipLink() {
    const skipLink = document.querySelector(".skip-link");
    const mainContent = document.querySelector("#main-content");

    if (skipLink && mainContent) {
      skipLink.addEventListener("click", (e) => {
        e.preventDefault();

        mainContent.focus();
        mainContent.scrollIntoView({ behavior: "smooth" });

        mainContent.style.outline = "2px dashed lightskyblue";
        mainContent.style.outlineOffset = "2px";

        setTimeout(() => {
          mainContent.style.outline = "none";
        }, 3000);
      });
    }
  }

  async renderPage() {
    if (!this._content) {
      console.error("Content container not found in DOM.");
      return;
    }

    // Prevent double execution
    if (this._isRendering) {
      console.log("App: Already rendering, skipping...");
      return;
    }

    this._isRendering = true;

    try {
      let url = getActiveRoute();

      if (!url || url === "#" || url === "/") {
        if (authService.isLoggedIn()) {
          url = "#/beranda";
        } else {
          url = "#/about";
        }
        window.location.hash = url;
        this._isRendering = false;
        return;
      }

      if (!authService.isLoggedIn()) {
        const protectedRoutes = ["/beranda", "/add", "/favorites", "/offline"];
        if (protectedRoutes.includes(url)) {
          console.log("Redirecting to about page - user not logged in");
          url = "#/about";
          window.location.hash = url;
          this._isRendering = false;
          return;
        }
      }

      if (authService.isLoggedIn()) {
        const authRoutes = ["/login", "/register"];
        if (authRoutes.includes(url)) {
          console.log("Redirecting to home page - user already logged in");
          url = "#/beranda";
          window.location.hash = url;
          this._isRendering = false;
          return;
        }
      }

      const pageLoader = routes[url];

      if (!pageLoader) {
        this._showErrorPage(
          "404 - Halaman Tidak Ditemukan",
          "Halaman yang Anda cari tidak ditemukan."
        );
        this._isRendering = false;
        return;
      }

      // Tentukan arah transisi
      const direction = this._getTransitionDirection(url);
      console.log(
        `🔄 Navigation: ${this._previousRoute} → ${url} (${direction})`
      );

      // Use View Transitions API if supported
      if (document.startViewTransition) {
        console.log(`🎬 Using ${direction} View Transition`);

        const transition = document.startViewTransition(() => {
          return this._performPageRender(pageLoader, url, direction);
        });

        await transition.finished;
      } else {
        // Fallback for browsers that don't support View Transitions
        console.log("⚠️ View Transitions not supported, using fallback");
        await this._performPageRender(pageLoader, url, direction);
      }

      // Update route history
      this._previousRoute = this._currentRoute;
      this._currentRoute = url;
    } catch (error) {
      console.error("Error rendering page:", error);
      this._showErrorPage(
        "Terjadi Kesalahan",
        "Maaf, terjadi kesalahan saat menampilkan halaman."
      );
    } finally {
      this._isRendering = false;
    }
  }

  // Method untuk menentukan arah transisi berdasarkan urutan halaman
  _getTransitionDirection(newRoute) {
    if (!this._currentRoute) return "none"; // First load

    const currentOrder = this._pageOrder[this._currentRoute] || 0;
    const newOrder = this._pageOrder[newRoute] || 0;

    if (newOrder > currentOrder) {
      return "forward"; // Kanan ke kiri (seperti next)
    } else if (newOrder < currentOrder) {
      return "backward"; // Kiri ke kanan (seperti back)
    } else {
      return "none"; // Same page
    }
  }

  async _performPageRender(pageLoader, url, direction) {
    try {
      // Cleanup previous page
      if (
        this._currentPage &&
        typeof this._currentPage.cleanup === "function"
      ) {
        await this._currentPage.cleanup();
      }

      // Apply directional view transition
      this._applyDirectionalTransition(direction);

      // Add loading state
      this._content.style.opacity = "0";
      this._content.style.transition = "opacity 0.3s ease";

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Dynamic import
      const pageModule = await pageLoader();
      const page = pageModule.default;

      this._content.innerHTML = await page.render();
      this._currentPage = page;

      if (typeof page.afterRender === "function") {
        try {
          await page.afterRender();
        } catch (afterRenderError) {
          console.error("Error in afterRender:", afterRenderError);
        }
      }

      this._content.style.opacity = "1";
      this._updateDocumentTitle(url);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error in page render:", error);
      throw error;
    }
  }

  _applyDirectionalTransition(direction) {
    // Hapus class transisi sebelumnya
    this._content.classList.remove(
      "transition-forward",
      "transition-backward",
      "transition-none"
    );

    // Tambah class berdasarkan arah
    if (direction === "forward") {
      this._content.classList.add("transition-forward");
    } else if (direction === "backward") {
      this._content.classList.add("transition-backward");
    } else {
      this._content.classList.add("transition-none");
    }

    // Set view transition name berdasarkan arah
    if (this._content) {
      this._content.style.viewTransitionName = `page-${direction}`;
    }
  }

  _showErrorPage(title, message) {
    this._content.innerHTML = `
      <section class="error-page" style="text-align: center; padding: 60px 20px;">
        <h1>${title}</h1>
        <p style="margin: 20px 0; color: #666;">${message}</p>
        <div style="margin-top: 30px;">
          <a href="#/beranda" class="primary-button" style="margin-right: 10px;">🏠 Ke Beranda</a>
          <a href="#/about" class="secondary-button">ℹ️ Ke About</a>
        </div>
      </section>
    `;
    this._content.style.opacity = 1;
  }

  _updateDocumentTitle(route) {
    const titleMap = {
      "/beranda": "Beranda - Cerita di Sekitarmu",
      "/about": "Tentang - Cerita di Sekitarmu",
      "/add": "Tambah Cerita - Cerita di Sekitarmu",
      "/login": "Masuk - Cerita di Sekitarmu",
      "/register": "Daftar - Cerita di Sekitarmu",
      "/favorites": "Favorit - Cerita di Sekitarmu",
      "/offline": "Offline - Cerita di Sekitarmu",
    };

    document.title = titleMap[route] || "Cerita di Sekitarmu";
  }

  refresh() {
    this.renderPage();
  }

  isUserLoggedIn() {
    return authService.isLoggedIn();
  }

  getUserInfo() {
    return authService.getUser();
  }
}

export default App;
