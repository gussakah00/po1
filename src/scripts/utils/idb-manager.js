class IDBManager {
  constructor() {
    this.dbName = 'CeritaDatabase';
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
        if (!db.objectStoreNames.contains('stories')) {
          const storyStore = db.createObjectStore('stories', { keyPath: 'id' });
          storyStore.createIndex('createdAt', 'createdAt', { unique: false });
          storyStore.createIndex('hasLocation', 'hasLocation', { unique: false });
        }

        // Store untuk stories offline
        if (!db.objectStoreNames.contains('offlineStories')) {
          const offlineStore = db.createObjectStore('offlineStories', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          offlineStore.createIndex('createdAt', 'createdAt', { unique: false });
          offlineStore.createIndex('synced', 'synced', { unique: false });
        }

        // Store untuk favorites
        if (!db.objectStoreNames.contains('favorites')) {
          const favoriteStore = db.createObjectStore('favorites', { keyPath: 'storyId' });
          favoriteStore.createIndex('addedAt', 'addedAt', { unique: false });
        }
      };
    });
  }

  // CRUD Operations untuk Stories
  async saveStories(stories) {
    if (!this.db) await this.init();
    
    const transaction = this.db.transaction(['stories'], 'readwrite');
    const store = transaction.objectStore('stories');

    stories.forEach(story => {
      store.put({
        ...story,
        hasLocation: !!(story.lat && story.lon),
        cachedAt: new Date().toISOString()
      });
    });

    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve();
    });
  }

  async getStories() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['stories'], 'readonly');
      const store = transaction.objectStore('stories');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteStory(storyId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['stories'], 'readwrite');
      const store = transaction.objectStore('stories');
      const request = store.delete(storyId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Offline Stories Management
  async saveOfflineStory(storyData) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineStories'], 'readwrite');
      const store = transaction.objectStore('offlineStories');
      
      const offlineStory = {
        ...storyData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        synced: false
      };

      const request = store.add(offlineStory);

      request.onsuccess = () => resolve(offlineStory.id);
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineStories() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineStories'], 'readonly');
      const store = transaction.objectStore('offlineStories');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOfflineStory(storyId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineStories'], 'readwrite');
      const store = transaction.objectStore('offlineStories');
      const request = store.delete(storyId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Favorites Management
  async addFavorite(storyId, storyData) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['favorites'], 'readwrite');
      const store = transaction.objectStore('favorites');
      
      const favorite = {
        storyId,
        ...storyData,
        addedAt: new Date().toISOString()
      };

      const request = store.add(favorite);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeFavorite(storyId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['favorites'], 'readwrite');
      const store = transaction.objectStore('favorites');
      const request = store.delete(storyId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getFavorites() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['favorites'], 'readonly');
      const store = transaction.objectStore('favorites');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async isFavorite(storyId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['favorites'], 'readonly');
      const store = transaction.objectStore('favorites');
      const request = store.get(storyId);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Search and Filter
  async searchStories(query) {
    const stories = await this.getStories();
    return stories.filter(story => 
      story.name.toLowerCase().includes(query.toLowerCase()) ||
      story.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  async filterStoriesByLocation(hasLocation) {
    const stories = await this.getStories();
    return stories.filter(story => 
      hasLocation ? story.hasLocation : !story.hasLocation
    );
  }

  async sortStories(sortBy = 'createdAt', order = 'desc') {
    const stories = await this.getStories();
    return stories.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (order === 'desc') {
        return new Date(bVal) - new Date(aVal);
      } else {
        return new Date(aVal) - new Date(bVal);
      }
    });
  }

  // Sync Management
  async markOfflineStoryAsSynced(storyId) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['offlineStories'], 'readwrite');
      const store = transaction.objectStore('offlineStories');
      
      const getRequest = store.get(storyId);
      getRequest.onsuccess = () => {
        const story = getRequest.result;
        if (story) {
          story.synced = true;
          const updateRequest = store.put(story);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getUnsyncedStories() {
    const offlineStories = await this.getOfflineStories();
    return offlineStories.filter(story => !story.synced);
  }
}

export const idbManager = new IDBManager();