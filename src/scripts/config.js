const getBasePath = () => {
  if (window.APP_CONFIG && window.APP_CONFIG.basePath) {
    return window.APP_CONFIG.basePath;
  }

  if (window.location.pathname.includes("/po1/")) {
    return "/po1/";
  }

  return "/";
};

const CONFIG = {
  BASE_URL: "https://story-api.dicoding.dev/v1",
  BASE_PATH: getBasePath(),
  IS_PRODUCTION:
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1",
};

export default CONFIG;
