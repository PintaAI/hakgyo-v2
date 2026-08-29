import type { SidebarSection } from "./types";

// Placeholder navigation until the final mobile information architecture lands.
export function buildSidebarSections(): SidebarSection[] {
  return [
    {
      label: "Workspace",
      area: "main",
      items: [
        {
          id: "home",
          label: "Home",
          icon: { ios: "house.fill", android: "home" },
          route: "/(home)/(tabs)/home",
          activePaths: ["/home"],
          replace: true,
        },
        {
          id: "cohorts",
          label: "Cohorts",
          icon: { ios: "person.3.fill", android: "groups" },
          route: "/(home)/(tabs)/cohorts",
          activePaths: ["/cohorts"],
          replace: true,
        },
        {
          id: "assessments",
          label: "Assessments",
          icon: { ios: "checklist", android: "checklist" },
          route: "/(home)/(tabs)/assessments",
          activePaths: ["/assessments"],
          replace: true,
        },
      ],
    },
    {
      label: "Account",
      area: "main",
      items: [
        {
          id: "profile",
          label: "Profile",
          icon: {
            ios: "person.crop.circle.fill",
            android: "account_circle",
          },
          route: "/(home)/(tabs)/profile",
          activePaths: ["/profile"],
          replace: true,
        },
      ],
    },
  ];
}
