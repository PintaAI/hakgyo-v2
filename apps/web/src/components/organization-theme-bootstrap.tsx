import {
  createOrganizationThemeRuntime,
  type OrganizationTheme,
} from "~/lib/organization-theme";

export function OrganizationThemeBootstrap({
  theme,
}: {
  theme: OrganizationTheme | null;
}) {
  if (!theme) return null;

  const runtime = createOrganizationThemeRuntime(theme);
  const serializedRuntime = JSON.stringify(runtime).replaceAll("<", "\\u003c");

  return (
    <script
      data-organization-theme-bootstrap=""
      dangerouslySetInnerHTML={{
        __html: `(function(){var root=document.documentElement;var theme=${serializedRuntime};Object.assign(root.dataset,theme.dataset);Object.entries(theme.properties).forEach(function(entry){root.style.setProperty(entry[0],entry[1]);});})();`,
      }}
    />
  );
}
