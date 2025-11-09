class IDBManager {
  constructor() {
    this.dbName = "CeritaDatabase";
    this.version = 2;
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

  // CRUD Operations untuk Stories
  async saveStories(stories) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction(["stories"], "readwrite");
    const store = transaction.objectStore("stories");

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

  async searchStories(query) {
    const stories = await this.getStories();
    const searchTerm = query.toLowerCase();

    return stories.filter(
      (story) =>
        story.name?.toLowerCase().includes(searchTerm) ||
        story.description?.toLowerCase().includes(searchTerm) ||
        (story.lat && story.lon && `lokasi peta`.includes(searchTerm))
    );
  }

  // Advanced filtering
  async filterStories(filters = {}) {
    let stories = await this.getStories();

    if (filters.hasLocation) {
      stories = stories.filter((story) => story.lat && story.lon);
    }

    if (filters.dateRange) {
      stories = stories.filter((story) => {
        const storyDate = new Date(story.createdAt);
        return (
          storyDate >= filters.dateRange.start &&
          storyDate <= filters.dateRange.end
        );
      });
    }

    if (filters.favoritesOnly) {
      const favorites = await this.getFavorites();
      const favoriteIds = favorites.map((fav) => fav.storyId);
      stories = stories.filter((story) => favoriteIds.includes(story.id));
    }

    return stories;
  }

  // Advanced sorting
  async sortStories(
    sortBy = "createdAt",
    order = "desc",
    secondarySort = null
  ) {
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
      if (order === "desc") {
        primaryResult = bVal - aVal;
      } else {
        primaryResult = aVal - bVal;
      }

      // Secondary sort jika diperlukan
      if (primaryResult === 0 && secondarySort) {
        const aSec = a[secondarySort.field];
        const bSec = b[secondarySort.field];
        return secondarySort.order === "desc" ? bSec - aSec : aSec - bSec;
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
}

export const idbManager = new IDBManager();
