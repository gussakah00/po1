class PushManager {
  constructor() {
    this.isSubscribed = false;
    this.registration = null;
    this.subscription = null;
    this.VAPID_PUBLIC_KEY =
      "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";
    this._isInitialized = false;
    this._initPromise = null;
  }

  async init() {
    console.log("PushManager: Initializing...");

    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = new Promise(async (resolve, reject) => {
      if (!this._isSupported()) {
        console.log("PushManager: Not supported");
        this._isInitialized = true;
        resolve(false);
        return;
      }

      try {
        this.registration = await navigator.serviceWorker.ready;
        console.log("PushManager: Service Worker ready");

        this.subscription =
          await this.registration.pushManager.getSubscription();
        this.isSubscribed = !(this.subscription === null);

        this._isInitialized = true;
        console.log("PushManager: Initialized, subscribed:", this.isSubscribed);
        resolve(true);
      } catch (error) {
        console.error("PushManager: Init error:", error);
        this._isInitialized = true;
        resolve(false);
      }
    });

    return this._initPromise;
  }

  _isSupported() {
    return "serviceWorker" in navigator && "PushManager" in window;
  }

  async subscribe() {
    if (!this._isInitialized) {
      await this.init();
    }

    if (!this.registration) {
      throw new Error("Service Worker not ready");
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Izin notifikasi ditolak");
      }

      // Unsubscribe existing subscription first
      if (this.subscription) {
        await this.subscription.unsubscribe();
      }

      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this._urlBase64ToUint8Array(
          this.VAPID_PUBLIC_KEY
        ),
      });

      this.isSubscribed = true;

      console.log("PushManager: Subscription created:", this.subscription);

      // Coba kirim ke server, tapi jangan block jika gagal
      const serverResult = await this._sendSubscriptionToServer();
      if (!serverResult.success) {
        console.warn(
          "PushManager: Server subscription failed, but local subscription created"
        );
      }

      this._showLocalNotification(
        "🔔 Notifikasi Diaktifkan",
        "Anda akan menerima notifikasi cerita baru."
      );

      return true;
    } catch (error) {
      console.error("PushManager: Subscribe error:", error);
      this._showLocalNotification(
        "❌ Gagal",
        "Tidak dapat mengaktifkan notifikasi: " + error.message
      );
      return false;
    }
  }

  async unsubscribe() {
    if (!this.subscription) {
      return true;
    }

    try {
      const success = await this.subscription.unsubscribe();
      if (!success) {
        throw new Error("Unsubscribe failed");
      }

      this.subscription = null;
      this.isSubscribed = false;

      // Coba hapus dari server
      const serverResult = await this._removeSubscriptionFromServer();
      if (!serverResult.success) {
        console.warn(
          "PushManager: Server unsubscription failed, but local subscription removed"
        );
      }

      this._showLocalNotification(
        "🔕 Notifikasi Dimatikan",
        "Anda tidak akan menerima notifikasi lagi."
      );

      return true;
    } catch (error) {
      console.error("PushManager: Unsubscribe error:", error);
      this._showLocalNotification(
        "⚠️ Peringatan",
        "Notifikasi dimatikan secara lokal, tetapi mungkin masih aktif di server."
      );
      return false;
    }
  }

  async _sendSubscriptionToServer() {
    if (!this.subscription) {
      return { success: false, error: "No subscription" };
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      console.log("PushManager: No auth token, skipping server registration");
      return { success: false, error: "No auth token" };
    }

    try {
      const subscriptionJSON = this.subscription.toJSON();

      // Pastikan format data sesuai dengan yang diharapkan server
      const requestBody = {
        endpoint: subscriptionJSON.endpoint,
        keys: {
          p256dh: subscriptionJSON.keys.p256dh,
          auth: subscriptionJSON.keys.auth,
        },
      };

      console.log("PushManager: Sending subscription to server:", requestBody);

      const response = await fetch(
        "https://story-api.dicoding.dev/v1/notifications/subscribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "PushManager: Server returned error:",
          response.status,
          errorText
        );

        if (response.status === 400) {
          return {
            success: false,
            error:
              "Bad Request - Mungkin subscription sudah ada atau format salah",
          };
        } else if (response.status === 401) {
          return {
            success: false,
            error: "Unauthorized - Token mungkin expired",
          };
        }

        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("PushManager: Subscription saved on server:", result);
      return { success: true, data: result };
    } catch (error) {
      console.warn(
        "PushManager: Failed to save subscription on server:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  async _removeSubscriptionFromServer() {
    if (!this.subscription) {
      return { success: false, error: "No subscription" };
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      return { success: false, error: "No auth token" };
    }

    try {
      const subscriptionJSON = this.subscription.toJSON();

      const response = await fetch(
        "https://story-api.dicoding.dev/v1/notifications/subscribe",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            endpoint: subscriptionJSON.endpoint,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(
          "PushManager: Server unsubscription failed:",
          response.status,
          errorText
        );
        return { success: false, error: `Server returned ${response.status}` };
      }

      console.log("PushManager: Subscription removed from server");
      return { success: true };
    } catch (error) {
      console.warn(
        "PushManager: Failed to remove subscription from server:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  _showLocalNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body: body,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
        });
      } catch (error) {
        console.log(
          "PushManager: Could not show notification, using alert:",
          error
        );
        alert(`${title}: ${body}`);
      }
    } else {
      alert(`${title}: ${body}`);
    }
  }

  _urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  getStatus() {
    return {
      isSubscribed: this.isSubscribed,
      isSupported: this._isSupported(),
      permission: Notification.permission,
      isInitialized: this._isInitialized,
      subscription: this.subscription ? this.subscription.toJSON() : null,
    };
  }

  // Method untuk debug
  async debugSubscription() {
    const status = this.getStatus();
    console.log("PushManager Debug Info:", status);

    if (this.subscription) {
      console.log("Subscription Details:", this.subscription.toJSON());
    }

    return status;
  }
}

export const pushManager = new PushManager();
