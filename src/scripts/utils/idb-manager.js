class IDBManager {
  constructor() {
    this.dbName = "CeritaDatabase";
    this.version = 5; // Increased version for relevancy search
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store untuk stories dari API
        if (!db.objectStoreNames.contains("stories")) {
          const storyStore = db.createObjectStore("stories", { keyPath: "id" });
          storyStore.createIndex("createdAt", "createdAt", { unique: false });
          storyStore.createIndex("hasLocation", "hasLocation", {
            unique: false,
          });
          storyStore.createIndex("name", "name", { unique: false });
          storyStore.createIndex("description", "description", {
            unique: false,
          });
        }

        // Store untuk stories offline
        if (!db.objectStoreNames.contains("offlineStories")) {
          const offlineStore = db.createObjectStore("offlineStories", {
            keyPath: "id",
            autoIncrement: true,
          });
          offlineStore.createIndex("createdAt", "createdAt", { unique: false });
          offlineStore.createIndex("synced", "synced", { unique: false });
        }

        // Store untuk favorites
        if (!db.objectStoreNames.contains("favorites")) {
          const favoriteStore = db.createObjectStore("favorites", {
            keyPath: "storyId",
          });
          favoriteStore.createIndex("addedAt", "addedAt", { unique: false });
        }
      };
    });
  }

  // SEARCH DENGAN RELEVANCY SCORING - YANG PALING MIRIP DIATAS
  async searchStories(query) {
    console.log("🔍 IDBManager: Searching for:", query);

    if (!query || query.trim() === "") {
      console.log("🔍 IDBManager: Empty query, returning all stories");
      const allStories = await this.getStories();
      return allStories.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    try {
      const stories = await this.getStories();
      const searchTerm = query.toLowerCase().trim();

      console.log("🔍 IDBManager: Total stories to search:", stories.length);

      // Define location-related keywords
      const locationKeywords = [
        "lokasi",
        "peta",
        "map",
        "location",
        "tempat",
        "alamat",
        "maps",
      ];

      // Hitung relevansi untuk setiap story
      const storiesWithRelevancy = stories.map((story) => {
        let score = 0;
        const storyName = story.name?.toLowerCase() || "";
        const storyDesc = story.description?.toLowerCase() || "";

        // Exact match di name - score tertinggi
        if (storyName === searchTerm) score += 100;

        // Exact match di description - score tinggi
        if (storyDesc === searchTerm) score += 80;

        // Starts with search term di name
        if (storyName.startsWith(searchTerm)) score += 60;

        // Starts with search term di description
        if (storyDesc.startsWith(searchTerm)) score += 40;

        // Contains search term di name
        if (storyName.includes(searchTerm)) score += 30;

        // Contains search term di description
        if (storyDesc.includes(searchTerm)) score += 20;

        // Word boundary matches (lebih spesifik)
        const nameWords = storyName.split(/\s+/);
        const descWords = storyDesc.split(/\s+/);

        nameWords.forEach((word) => {
          if (word === searchTerm) score += 25;
          if (word.startsWith(searchTerm)) score += 15;
        });

        descWords.forEach((word) => {
          if (word === searchTerm) score += 15;
          if (word.startsWith(searchTerm)) score += 10;
        });

        // Location search - score khusus
        const isLocationQuery = locationKeywords.some(
          (keyword) =>
            searchTerm.includes(keyword) || keyword.includes(searchTerm)
        );

        if (story.lat && story.lon && isLocationQuery) {
          score += 35; // Score untuk stories dengan lokasi
        }

        // Recent stories sedikit bonus
        const storyDate = new Date(story.createdAt);
        const daysAgo =
          (Date.now() - storyDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysAgo < 7) score += 5; // Story dalam 7 hari terakhir
        if (daysAgo < 1) score += 10; // Story hari ini

        return {
          ...story,
          _relevancyScore: score,
          _matchedInName: storyName.includes(searchTerm),
          _matchedInDesc: storyDesc.includes(searchTerm),
          _exactMatch: storyName === searchTerm || storyDesc === searchTerm,
        };
      });

      // Filter hanya stories dengan score > 0 dan urutkan berdasarkan relevansi
      const relevantStories = storiesWithRelevancy
        .filter((story) => story._relevancyScore > 0)
        .sort((a, b) => {
          // Prioritas: score tertinggi dulu
          if (b._relevancyScore !== a._relevancyScore) {
            return b._relevancyScore - a._relevancyScore;
          }

          // Jika score sama, prioritaskan exact match
          if (a._exactMatch && !b._exactMatch) return -1;
          if (b._exactMatch && !a._exactMatch) return 1;

          // Jika masih sama, prioritaskan match di name daripada description
          if (a._matchedInName && !b._matchedInName) return -1;
          if (b._matchedInName && !a._matchedInName) return 1;

          // Terakhir, yang terbaru dulu
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

      console.log(
        "🔍 IDBManager: Search results with relevancy:",
        relevantStories.length
      );
      console.log(
        "🔍 IDBManager: Top results:",
        relevantStories.slice(0, 3).map((s) => ({
          name: s.name,
          score: s._relevancyScore,
          exact: s._exactMatch,
          inName: s._matchedInName,
        }))
      );

      // Hapus properti scoring sebelum return
      return relevantStories.map(
        ({
          _relevancyScore,
          _matchedInName,
          _matchedInDesc,
          _exactMatch,
          ...story
        }) => story
      );
    } catch (error) {
      console.error("❌ IDBManager: Search error:", error);
      return [];
    }
  }

  // CRUD Operations untuk Stories
  async saveStories(stories) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(["stories"], "readwrite");
    const store = transaction.objectStore("stories");

    // Clear existing stories before saving new ones
    store.clear();

    stories.forEach((story) => {
      store.put({
        ...story,
        hasLocation: !!(story.lat && story.lon),
        cachedAt: new Date().toISOString(),
      });
    });

    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve();
    });
  }

  async getStories() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["stories"], "readonly");
      const store = transaction.objectStore("stories");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteStory(storyId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["stories"], "readwrite");
      const store = transaction.objectStore("stories");
      const request = store.delete(storyId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Offline Stories Management
  async saveOfflineStory(storyData) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["offlineStories"], "readwrite");
      const store = transaction.objectStore("offlineStories");

      const offlineStory = {
        ...storyData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        synced: false,
      };

      const request = store.add(offlineStory);

      request.onsuccess = () => resolve(offlineStory.id);
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineStories() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["offlineStories"], "readonly");
      const store = transaction.objectStore("offlineStories");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOfflineStory(storyId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["offlineStories"], "readwrite");
      const store = transaction.objectStore("offlineStories");
      const request = store.delete(storyId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Favorites Management
  async addFavorite(storyId, storyData) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["favorites"], "readwrite");
      const store = transaction.objectStore("favorites");

      const favorite = {
        storyId,
        ...storyData,
        addedAt: new Date().toISOString(),
      };

      const request = store.add(favorite);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeFavorite(storyId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["favorites"], "readwrite");
      const store = transaction.objectStore("favorites");
      const request = store.delete(storyId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFavorites() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["favorites"], "readonly");
      const store = transaction.objectStore("favorites");
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async isFavorite(storyId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["favorites"], "readonly");
      const store = transaction.objectStore("favorites");
      const request = store.get(storyId);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Advanced filtering dengan debug
  async filterStories(filters = {}) {
    console.log("🔍 IDBManager: Applying filters:", filters);

    let stories = await this.getStories();
    console.log(
      "🔍 IDBManager: Total stories before filtering:",
      stories.length
    );

    if (filters.hasLocation) {
      stories = stories.filter((story) => story.lat && story.lon);
      console.log("🔍 IDBManager: After location filter:", stories.length);
    }

    if (filters.dateRange) {
      stories = stories.filter((story) => {
        const storyDate = new Date(story.createdAt);
        return (
          storyDate >= filters.dateRange.start &&
          storyDate <= filters.dateRange.end
        );
      });
      console.log("🔍 IDBManager: After date filter:", stories.length);
    }

    if (filters.favoritesOnly) {
      const favorites = await this.getFavorites();
      const favoriteIds = favorites.map((fav) => fav.storyId);
      stories = stories.filter((story) => favoriteIds.includes(story.id));
      console.log("🔍 IDBManager: After favorites filter:", stories.length);
    }

    return stories;
  }

  // Advanced sorting dengan debug
  async sortStories(
    sortBy = "createdAt",
    order = "desc",
    secondarySort = null
  ) {
    console.log(`🔍 IDBManager: Sorting by ${sortBy} ${order}`);

    const stories = await this.getStories();

    return stories.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      // Handle different data types
      if (sortBy === "createdAt") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      let primaryResult = 0;
      if (aVal < bVal) primaryResult = -1;
      else if (aVal > bVal) primaryResult = 1;
      else primaryResult = 0;

      if (order === "desc") {
        primaryResult = -primaryResult;
      }

      // Secondary sort jika diperlukan
      if (primaryResult === 0 && secondarySort) {
        const aSec = a[secondarySort.field];
        const bSec = b[secondarySort.field];
        let secResult = 0;
        if (aSec < bSec) secResult = -1;
        else if (aSec > bSec) secResult = 1;

        return secondarySort.order === "desc" ? -secResult : secResult;
      }

      return primaryResult;
    });
  }

  // Offline sync functionality
  async syncOfflineStories() {
    const offlineStories = await this.getOfflineStories();
    const unsyncedStories = offlineStories.filter((story) => !story.synced);

    const syncResults = {
      successful: [],
      failed: [],
    };

    for (const story of unsyncedStories) {
      try {
        // Simulate API call untuk sync
        await this._syncStoryToAPI(story);
        await this.markOfflineStoryAsSynced(story.id);
        syncResults.successful.push(story.id);
      } catch (error) {
        syncResults.failed.push({
          id: story.id,
          error: error.message,
        });
      }
    }

    return syncResults;
  }

  async markOfflineStoryAsSynced(storyId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["offlineStories"], "readwrite");
      const store = transaction.objectStore("offlineStories");
      const getRequest = store.get(storyId);

      getRequest.onsuccess = () => {
        const story = getRequest.result;
        if (story) {
          story.synced = true;
          const putRequest = store.put(story);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async _syncStoryToAPI(story) {
    // Simulasi API call untuk sync
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.2) {
          // 80% success rate untuk simulasi
          resolve({ success: true, id: story.id });
        } else {
          reject(new Error("Sync failed"));
        }
      }, 1000);
    });
  }

  // Utility method untuk clear database (development only)
  async clearDatabase() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        ["stories", "offlineStories", "favorites"],
        "readwrite"
      );

      transaction.objectStore("stories").clear();
      transaction.objectStore("offlineStories").clear();
      transaction.objectStore("favorites").clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Method untuk mendapatkan stats
  async getStats() {
    const stories = await this.getStories();
    const offlineStories = await this.getOfflineStories();
    const favorites = await this.getFavorites();

    return {
      totalStories: stories.length,
      storiesWithLocation: stories.filter((story) => story.lat && story.lon)
        .length,
      offlineStories: offlineStories.length,
      unsyncedStories: offlineStories.filter((story) => !story.synced).length,
      favorites: favorites.length,
    };
  }

  // Method untuk mendapatkan story by ID
  async getStoryById(storyId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["stories"], "readonly");
      const store = transaction.objectStore("stories");
      const request = store.get(storyId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Method untuk update story
  async updateStory(storyId, updates) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["stories"], "readwrite");
      const store = transaction.objectStore("stories");
      const getRequest = store.get(storyId);

      getRequest.onsuccess = () => {
        const story = getRequest.result;
        if (story) {
          const updatedStory = { ...story, ...updates };
          const putRequest = store.put(updatedStory);
          putRequest.onsuccess = () => resolve(updatedStory);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error("Story not found"));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}

export const idbManager = new IDBManager();
