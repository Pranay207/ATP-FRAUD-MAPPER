const LOCAL_USER = {
  id: "local-officer-1",
  name: "SI Venkatesh Goud",
  role: "admin",
  department: "Cyber Crime Cell",
};

export const appClient = {
  auth: {
    async me() {
      return LOCAL_USER;
    },
    logout() {
      window.location.assign("/");
    },
    redirectToLogin() {
      window.location.assign("/");
    },
  },
};

export const getLocalUser = () => LOCAL_USER;
