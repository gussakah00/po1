class PushManager {
  constructor() {
    this.isSubscribed = false;
    this.registration = null;
    this.subscription = null;
    this.VAPID_PUBLIC_KEY =
      "BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk";
    this.API_BASE = "https://story-api.dicoding.dev/v1";
  }

  async init() {
    console.log("PushManager: Initializing...");

    if (!("serviceWorker" in navigator)) {
      console.log("PushManager: Service Worker not supported");
      return false;
    }

    if (!("PushManager" in window)) {
      console.log("PushManager: Push notifications not supported");
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.ready;
      console.log("PushManager: Service Worker ready");

      this.subscription = await this.registration.pushManager.getSubscription();
      this.isSubscribed = !(this.subscription === null);

      console.log("PushManager: Subscription status:", this.isSubscribed);
      return true;
    } catch (error) {
      console.error("PushManager: Error initializing:", error);
      return false;
    }
  }

  async subscribe() {
    console.log("PushManager: Starting subscription process...");

    if (!this.registration) {
      console.error("PushManager: Service Worker not ready");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log("PushManager: Permission result:", permission);

      if (permission !== "granted") {
        throw new Error("Izin notifikasi tidak diberikan");
      }

      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY),
      });

      console.log("PushManager: Subscription successful");

      this.isSubscribed = true;

      this.showNotification(
        "Notifikasi Diaktifkan",
        "Anda akan menerima notifikasi cerita baru."
      );

      console.log("PushManager: Subscription completed successfully");
      return true;
    } catch (error) {
      console.error("PushManager: Error subscribing:", error);
      this.showNotification(
        "Gagal",
        "Tidak dapat mengaktifkan notifikasi: " + error.message
      );
      return false;
    }
  }

  async unsubscribe() {
    console.log("PushManager: Starting unsubscribe process...");

    if (!this.subscription) {
      console.log("PushManager: No subscription to unsubscribe");
      return true;
    }

    try {
      const success = await this.subscription.unsubscribe();
      if (!success) {
        throw new Error("Gagal berhenti berlangganan");
      }

      this.subscription = null;
      this.isSubscribed = false;

      this.showNotification(
        "Notifikasi Dinonaktifkan",
        "Anda tidak akan menerima notifikasi lagi."
      );

      console.log("PushManager: Unsubscribe completed successfully");
      return true;
    } catch (error) {
      console.error("PushManager: Error unsubscribing:", error);
      this.showNotification("Gagal", "Tidak dapat menonaktifkan notifikasi.");
      return false;
    }
  }

  urlBase64ToUint8Array(base64String) {
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

  showNotification(title, message) {
    console.log("PushManager: Showing notification:", title, message);

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notification = new Notification(title, {
          body: message,
          icon: "/icons/icon-192x192.png",
        });

        notification.onclick = () => {
          console.log("PushManager: Notification clicked");
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error("PushManager: Error showing notification:", error);
        alert(`${title}: ${message}`);
      }
    } else {
      alert(`${title}: ${message}`);
    }
  }

  getStatus() {
    return {
      isSubscribed: this.isSubscribed,
      isSupported: "serviceWorker" in navigator && "PushManager" in window,
      permission: Notification.permission,
    };
  }
}

export const pushManager = new PushManager();
