"use client";

import {
  APP_PREFERENCES_RUNTIME_KEY,
  AppPreferencesSync,
} from "~/components/app-settings";

/**
 * Applies the last device appearance (font, size, density, radius, shadow and,
 * without an organization theme, colors) before hydration so pages do not
 * render with defaults first, then keeps it applied through AppPreferencesSync.
 * Render it inside OrganizationThemeProvider when a page has one.
 */
export function AppPreferencesBootstrap({
  organizationTheme = false,
}: {
  /** Organization colors win; only replay device layout preferences. */
  organizationTheme?: boolean;
}) {
  return (
    <>
      <script
        data-app-preferences-bootstrap=""
        type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var runtime=JSON.parse(localStorage.getItem(${JSON.stringify(APP_PREFERENCES_RUNTIME_KEY)})||"null");if(!runtime||!runtime.dataset||!runtime.properties)return;var root=document.documentElement;var layoutOnly=${organizationTheme};Object.keys(runtime.dataset).forEach(function(key){if(layoutOnly&&key==="appColor")return;root.dataset[key]=runtime.dataset[key];});Object.keys(runtime.properties).forEach(function(name){if(layoutOnly&&name.indexOf("--app-shadow-")!==0)return;root.style.setProperty(name,runtime.properties[name]);});}catch(error){}})();`,
        }}
      />
      <AppPreferencesSync />
    </>
  );
}
