export type NavItem = { href: string; label: string; icon: string; group: string; blurb: string; shortcut?: string };

/** The harmonized Guru AI module map. */
export const NAV: NavItem[] = [
	{ href: "/", label: "Dashboard", icon: "◧", group: "Workspace", blurb: "Overview, activity and quick actions" },
	{ href: "/chat", label: "Chat", icon: "◈", group: "Intelligence", blurb: "Multi-model AI chat with GuruRoute", shortcut: "C" },
	{ href: "/images", label: "Image Studio", icon: "▦", group: "Intelligence", blurb: "Text-to-image generation (DeepAI engine)" },
	{ href: "/video", label: "Video Studio", icon: "▶", group: "Intelligence", blurb: "Text-to-video generation" },
	{ href: "/music", label: "Music Studio", icon: "♪", group: "Intelligence", blurb: "Text-to-music generation" },
	{ href: "/visuals", label: "Visuals", icon: "✦", group: "Intelligence", blurb: "Turn text into diagrams (Napkin-style)" },
	{ href: "/humanizer", label: "Humanizer", icon: "✎", group: "Intelligence", blurb: "Rewrite AI text into natural human prose" },
	{ href: "/tools", label: "AI Toolbox", icon: "⬡", group: "Intelligence", blurb: "Model grid: summarize, translate, analyze" },
	{ href: "/keywords", label: "Keywords", icon: "⌕", group: "Research", blurb: "Seed → question & comparison clusters" },
	{ href: "/transcript", label: "Transcripts", icon: "≡", group: "Research", blurb: "YouTube video → transcript + summary" },
	{ href: "/convert", label: "Convert", icon: "⇄", group: "Research", blurb: "Images, JSON/CSV/YAML, base64, units" },
	{ href: "/notes", label: "Notes", icon: "▤", group: "Workspace", blurb: "Keep-style pin, color and tag notes", shortcut: "N" },
	{ href: "/agents", label: "Agents", icon: "⚙", group: "Workspace", blurb: "Build and run multi-step AI workflows" },
	{ href: "/reverse-api", label: "Reverse API Lab", icon: "⟲", group: "Developer", blurb: "HAR → typed API clients + key extractor" },
	{ href: "/connectors", label: "Connector Vault", icon: "⚿", group: "Developer", blurb: "API keys that power every engine" },
	{ href: "/models", label: "GuruRoute", icon: "⇉", group: "Developer", blurb: "Model routing rules per task type" },
	{ href: "/settings", label: "Settings", icon: "◑", group: "Developer", blurb: "Workspace, install, deploy and data" },
	{ href: "/admin", label: "Super Admin", icon: "★", group: "Developer", blurb: "Accounts, engines and deployment control" }
];

export const GROUPS = ["Workspace", "Intelligence", "Research", "Developer"];
