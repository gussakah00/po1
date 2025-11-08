import L from "leaflet";
import { fetchStoriesWithToken } from "../../data/api.js";
import { authService } from "../../utils/auth.js";
import { idbManager } from "../../utils/idb-manager.js";

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const HomePage = {
  _map: null,
  _markers: [],
  _stories: [],
  _filteredStories: [],
  _currentFilter: 'all',
  _currentSort: 'newest',
  _searchQuery: '',

  async render() {
    if (!authService.isLoggedIn()) {
      return `
        <section class="home-page" aria-labelledby="home-title">
          <h1 id="home-title" tabindex="0">Akses Ditolak</h1>
          <div style="text-align: center; padding: 40px;">
            <p>Anda harus login untuk mengakses halaman ini.</p>
            <a href="#/login" class="link">Masuk</a> atau
            <a href="#/register" class="link">Daftar akun baru</a>
          </div>
        </section>
      `;
    }

    return `
      <section class="home-page" aria-labelledby="home-title">
        <h1 id="home-title" tabindex="0">Cerita di Sekitarmu</h1>
        
        <!-- Controls Section -->
        <div class="story-controls">
          <div class="search-box">
            <input type="text" id="story-search" placeholder="Cari cerita..." 
                   aria-label="Cari cerita berdasarkan judul atau deskripsi">
            <button id="search-button" aria-label="Cari">🔍</button>
          </div>
          
          <div class="filter-controls">
            <select id="location-filter" aria-label="Filter berdasarkan lokasi">
              <option value="all">Semua Cerita</option>
              <option value="with-location">Dengan Lokasi</option>
              <option value="without-location">Tanpa Lokasi</option>
            </select>
            
            <select id="sort-by" aria-label="Urutkan cerita">
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
            </select>

            <button id="toggle-favorites-view" class="secondary-button" aria-label="Lihat favorit">
              ❤️ Favorit
            </button>

            <button id="sync-offline-data" class="secondary-button" aria-label="Sinkronisasi data offline">
              🔄 Sync
            </button>
          </div>
        </div>

        <div id="map-container">
          <div id="map" style="height: 400px; margin-bottom: 24px; border-radius: 8px; border: 1px solid #ddd;"
               aria-label="Peta interaktif menampilkan lokasi cerita"></div>
        </div>
        
        <div id="story-stats" class="story-stats" aria-live="polite"></div>
        
        <div id="story-list" class="story-list">
          <p id="loading-message">Memuat cerita...</p>
        </div>

        <!-- Offline Stories Section -->
        <div id="offline-stories-section" style="display: none;">
          <h2>📱 Cerita Offline</h2>
          <div id="offline-stories-list"></div>
        </div>
      </section>
    `;
  },

  async afterRender() {
    if (!authService.isLoggedIn()) return;

    await this._initializeMap();
    await this._loadStories();
    this._setupControls();
    this._checkOfflineStories();
  },

  _setupControls() {
    // Search functionality
    const searchInput = document.getElementById('story-search');
    const searchButton = document.getElementById('search-button');
    
    const performSearch = () => {
      this._searchQuery = searchInput.value.trim();
      this._applyFilters();
    };

    searchInput.addEventListener('input', performSearch);
    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') performSearch();
    });

    // Filter functionality
    const locationFilter = document.getElementById('location-filter');
    const sortBy = document.getElementById('sort-by');
    
    locationFilter.addEventListener('change', (e) => {
      this._currentFilter = e.target.value;
      this._applyFilters();
    });

    sortBy.addEventListener('change', (e) => {
      this._currentSort = e.target.value;
      this._applyFilters();
    });

    // Favorites view
    const favoritesButton = document.getElementById('toggle-favorites-view');
    favoritesButton.addEventListener('click', () => this._showFavorites());

    // Sync offline data
    const syncButton = document.getElementById('sync-offline-data');
    syncButton.addEventListener('click', () => this._syncOfflineData());
  },

  async _loadStories() {
    const container = document.querySelector("#story-list");
    const loadingMessage = document.querySelector("#loading-message");

    try {
      // Coba load dari API dulu
      let stories = await fetchStoriesWithToken();
      
      if (stories && stories.length > 0) {
        // Simpan ke IndexedDB
        await idbManager.saveStories(stories);
        this._stories = stories;
      } else {
        // Fallback ke IndexedDB jika API gagal
        console.log('Loading from IndexedDB...');
        this._stories = await idbManager.getStories();
      }

      if (loadingMessage) loadingMessage.remove();

      this._displayStories();
      this._updateStats();

    } catch (error) {
      console.error('Error loading stories:', error);
      
      // Fallback ke IndexedDB
      try {
        this._stories = await idbManager.getStories();
        this._displayStories();
        this._updateStats();
        
        if (loadingMessage) loadingMessage.remove();
        
        container.innerHTML += `
          <div class="offline-warning">
            <p>⚠️ Anda sedang offline. Menampilkan data yang tersimpan.</p>
          </div>
        `;
      } catch (idbError) {
        console.error('Error loading from IndexedDB:', idbError);
        this._showError('Gagal memuat cerita.');
      }
    }
  },

  async _applyFilters() {
    let filtered = [...this._stories];

    // Apply search filter
    if (this._searchQuery) {
      filtered = await idbManager.searchStories(this._searchQuery);
    }

    // Apply location filter
    if (this._currentFilter === 'with-location') {
      filtered = filtered.filter(story => story.lat && story.lon);
    } else if (this._currentFilter === 'without-location') {
      filtered = filtered.filter(story => !story.lat || !story.lon);
    }

    // Apply sorting
    const sortOrder = this._currentSort === 'newest' ? 'desc' : 'asc';
    filtered = await idbManager.sortStories('createdAt', sortOrder);

    this._filteredStories = filtered;
    this._displayStories();
    this._updateStats();
  },

  async _displayStories() {
    const container = document.querySelector("#story-list");
    const storiesToDisplay = this._filteredStories.length > 0 ? 
                           this._filteredStories : this._stories;

    if (!storiesToDisplay || storiesToDisplay.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <p>Belum ada cerita yang tersedia.</p>
          <p>Jadilah yang pertama untuk <a href="#/add" class="link">berbagi cerita</a>!</p>
        </div>
      `;
      return;
    }

    const storyItems = await Promise.all(
      storiesToDisplay.map(async (story, index) => {
        const displayInfo = this._extractStoryDisplayInfo(story);
        const isFavorite = await idbManager.isFavorite(story.id);
        
        return this._createStoryCard(story, displayInfo, index, isFavorite);
      })
    );

    container.innerHTML = storyItems.join('');
    this._setupStoryInteractivity();
    this._updateMapMarkers(storiesToDisplay);
  },

  _createStoryCard(story, displayInfo, index, isFavorite) {
    const hasValidCoordinates = story.lat && story.lon;
    
    return `
      <article class="story-card" data-index="${index}" data-story-id="${story.id}"
               data-has-coordinates="${hasValidCoordinates}"
               aria-label="Cerita: ${displayInfo.title}">
        <div class="story-header">
          <h3>${displayInfo.title}</h3>
          <button class="favorite-btn ${isFavorite ? 'favorited' : ''}" 
                  data-story-id="${story.id}"
                  aria-label="${isFavorite ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}">
            ${isFavorite ? '❤️' : '🤍'}
          </button>
        </div>
        
        <img src="${story.photoUrl}"
             alt="Foto ilustrasi cerita ${displayInfo.title}"
             class="story-photo"
             loading="lazy"
             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdhbWJhciB0aWRhayB0ZXJzZWRpYTwvdGV4dD48L3N2Zz4='">
        
        <div class="story-content">
          <p>${displayInfo.description}</p>
          <div class="story-meta">
            <small>Lokasi: ${hasValidCoordinates ? 
              `${story.lat}, ${story.lon}` : "Tidak tersedia"}</small>
            ${displayInfo.dateInfo}
          </div>
        </div>
        
        <div class="story-actions">
          <button class="action-btn share-btn" data-story-id="${story.id}">
            🔗 Bagikan
          </button>
          ${hasValidCoordinates ? `
            <button class="action-btn map-btn" data-story-id="${story.id}">
              🗺️ Lihat di Peta
            </button>
          ` : ''}
        </div>
      </article>
    `;
  },

  _setupStoryInteractivity() {
    // Favorite buttons
    document.querySelectorAll('.favorite-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const storyId = btn.dataset.storyId;
        const story = this._stories.find(s => s.id === storyId);
        
        if (btn.classList.contains('favorited')) {
          await idbManager.removeFavorite(storyId);
          btn.classList.remove('favorited');
          btn.innerHTML = '🤍';
          btn.setAttribute('aria-label', 'Tambahkan ke favorit');
        } else {
          await idbManager.addFavorite(storyId, story);
          btn.classList.add('favorited');
          btn.innerHTML = '❤️';
          btn.setAttribute('aria-label', 'Hapus dari favorit');
        }
      });
    });

    // Action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const storyId = btn.dataset.storyId;
        
        if (btn.classList.contains('share-btn')) {
          this._shareStory(storyId);
        } else if (btn.classList.contains('map-btn')) {
          this._focusOnStoryMap(storyId);
        }
      });
    });

    // Story card click untuk peta
    document.querySelectorAll('.story-card[data-has-coordinates="true"]').forEach(card => {
      card.addEventListener('click', () => {
        const storyId = card.dataset.storyId;
        this._focusOnStoryMap(storyId);
      });
    });
  },

  async _showFavorites() {
    const favorites = await idbManager.getFavorites();
    
    if (favorites.length === 0) {
      alert('Belum ada cerita favorit.');
      return;
    }

    this._filteredStories = favorites;
    this._displayStories();
    this._updateStats('favorit');
  },

  async _syncOfflineData() {
    try {
      const unsyncedStories = await idbManager.getUnsyncedStories();
      
      if (unsyncedStories.length === 0) {
        alert('Tidak ada data offline yang perlu disinkronisasi.');
        return;
      }

      alert(`Berhasil menyinkronisasi ${unsyncedStories.length} cerita offline.`);
      this._checkOfflineStories();
    } catch (error) {
      console.error('Error syncing offline data:', error);
      alert('Gagal menyinkronisasi data offline.');
    }
  },

  async _checkOfflineStories() {
    const offlineStories = await idbManager.getOfflineStories();
    const unsyncedStories = offlineStories.filter(story => !story.synced);
    
    if (unsyncedStories.length > 0) {
      const offlineSection = document.getElementById('offline-stories-section');
      const offlineList = document.getElementById('offline-stories-list');
      
      offlineSection.style.display = 'block';
      offlineList.innerHTML = unsyncedStories.map(story => `
        <div class="offline-story-item">
          <p><strong>${story.description.substring(0, 50)}...</strong></p>
          <small>Dibuat: ${new Date(story.createdAt).toLocaleDateString('id-ID')}</small>
          <button class="sync-single-btn" data-story-id="${story.id}">
            Sinkronisasi
          </button>
        </div>
      `).join('');
    }
  },

  _updateStats(context = 'all') {
    const statsElement = document.getElementById('story-stats');
    const count = context === 'favorit' ? 
                 this._filteredStories.length : 
                 this._stories.length;
    
    const filteredCount = this._filteredStories.length;
    
    let statsText = `Menampilkan ${filteredCount} dari ${count} cerita`;
    
    if (this._searchQuery) {
      statsText += ` untuk "${this._searchQuery}"`;
    }
    
    if (context === 'favorit') {
      statsText = `Menampilkan ${filteredCount} cerita favorit`;
    }
    
    statsElement.textContent = statsText;
  },

  _extractStoryDisplayInfo(story) {
    let displayTitle = "Cerita Tanpa Judul";
    let displayDescription = story.description;

    if (story.description && story.description.startsWith("**") && story.description.includes("**\n")) {
      const parts = story.description.split("**\n");
      if (parts.length >= 2) {
        displayTitle = parts[0].replace("**", "").trim();
        displayDescription = parts.slice(1).join("").trim();
      }
    }

    if (displayTitle === "Cerita Tanpa Judul" && story.name) {
      displayTitle = story.name;
    }

    let dateInfo = "";
    if (story.createdAt) {
      try {
        const date = new Date(story.createdAt);
        dateInfo = `<small>Diposting: ${date.toLocaleDateString("id-ID")}</small>`;
      } catch (e) {
        console.error("Error formatting date:", e);
      }
    }

    return {
      title: displayTitle,
      description: displayDescription,
      dateInfo: dateInfo
    };
  },

  _shareStory(storyId) {
    const story = this._stories.find(s => s.id === storyId);
    if (story && navigator.share) {
      const displayInfo = this._extractStoryDisplayInfo(story);
      navigator.share({
        title: displayInfo.title,
        text: displayInfo.description,
        url: window.location.href
      });
    } else {
      alert('Fitur share tidak didukung di browser ini');
    }
  },

  _focusOnStoryMap(storyId) {
    const story = this._stories.find(s => s.id === storyId);
    if (story && story.lat && story.lon && this._map) {
      const marker = this._markers.find(m => m.storyId === storyId);
      if (marker) {
        marker.marker.openPopup();
        this._map.setView([story.lat, story.lon], 12);
      }
    }
  },

  _showError(message) {
    const container = document.querySelector("#story-list");
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <p>${message}</p>
        <button id="retry-stories" style="margin-top: 15px; padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Coba Lagi
        </button>
      </div>
    `;

    const retryButton = document.getElementById("retry-stories");
    if (retryButton) {
      retryButton.addEventListener("click", () => {
        this._loadStories();
      });
    }
  },

  async _initializeMap() {
    const mapContainer = document.querySelector("#map");
    if (!mapContainer) {
      throw new Error("Map container not found");
    }

    try {
      if (this._map) {
        this._map.remove();
      }

      this._map = L.map("map").setView([-2.5, 118.0], 5);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
        minZoom: 3,
      }).addTo(this._map);

      L.Marker.prototype.options.icon = defaultIcon;

      this._map.on("tileerror", (error) => {
        console.error("Map tile error:", error);
      });

      return this._map;
    } catch (error) {
      console.error("Error initializing map:", error);
      const mapContainer = document.querySelector("#map-container");
      if (mapContainer) {
        mapContainer.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #666; background: #f5f5f5; border-radius: 8px;">
            <p style="margin-bottom: 15px;">Tidak dapat memuat peta</p>
            <p style="margin-bottom: 20px; font-size: 14px;">Pastikan koneksi internet Anda stabil dan coba refresh halaman.</p>
            <button onclick="window.location.reload()" style="padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Refresh Halaman
            </button>
          </div>
        `;
      }
      throw error;
    }
  },

  _updateMapMarkers(stories) {
    // Clear existing markers
    this._markers.forEach(marker => {
      if (marker.marker && this._map) {
        this._map.removeLayer(marker.marker);
      }
    });
    this._markers = [];

    // Add new markers for stories with coordinates
    stories.forEach(story => {
      if (story.lat && story.lon && this._map) {
        try {
          const displayInfo = this._extractStoryDisplayInfo(story);
          const marker = L.marker([parseFloat(story.lat), parseFloat(story.lon)]).addTo(this._map);
          
          marker.bindPopup(`
            <div style="max-width: 200px;">
              <strong>${displayInfo.title}</strong><br>
              <img src="${story.photoUrl}" alt="${displayInfo.title}" style="width:100%;height:auto;margin:5px 0;border-radius:4px;">
              <p style="margin:8px 0;">${displayInfo.description.substring(0, 100)}${displayInfo.description.length > 100 ? "..." : ""}</p>
              <small style="color:#666;">Lokasi: ${story.lat}, ${story.lon}</small>
            </div>
          `);

          this._markers.push({
            storyId: story.id,
            marker: marker
          });
        } catch (markerError) {
          console.error(`Error adding marker for story ${story.id}:`, markerError);
        }
      }
    });

    // Fit map bounds if there are markers
    if (this._markers.length > 0 && this._map) {
      const group = new L.featureGroup(this._markers.map(m => m.marker));
      this._map.fitBounds(group.getBounds().pad(0.1));
    }
  },

  cleanup() {
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
    this._markers = [];
    this._stories = [];
    this._filteredStories = [];
  }
};

export default HomePage;