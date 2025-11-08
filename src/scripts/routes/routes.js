import HomePage from "../pages/home/home-page.js";
import AboutPage from "../pages/about/about-page.js";
import AddPage from "../pages/add/add-page.js";
import LoginPage from "../pages/auth/login-page.js";
import RegisterPage from "../pages/auth/register-page.js";
import FavoritesPage from "../pages/favorites/favorites-page.js";
import OfflinePage from "../pages/offline/offline-page.js";

const routes = {
  "/beranda": HomePage,
  "/about": AboutPage,
  "/add": AddPage,
  "/login": LoginPage,
  "/register": RegisterPage,
  "/favorites": FavoritesPage,
  "/offline": OfflinePage,
};

export default routes;
