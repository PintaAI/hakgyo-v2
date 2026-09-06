import type { SidebarSection } from "./types";

export function buildSidebarSections(): SidebarSection[] {
  return [
    {
      label: "Learning",
      area: "main",
      items: [
        {
          id: "home",
          label: "Today",
          icon: { ios: "house.fill", android: "home" },
          route: "/(home)/(tabs)/home",
          activePaths: ["/home"],
          replace: true,
        },
        {
          id: "learn",
          label: "Learn",
          icon: { ios: "book.fill", android: "menu_book" },
          route: "/(home)/(tabs)/learn",
          activePaths: ["/learn", "/courses"],
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
          label: "Practice",
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
