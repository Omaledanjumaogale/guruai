export type NavItem = {
	href: string;
	label: string;
	icon: string;
	group: string;
	blurb: string;
	shortcut?: string;
	/** Permission required to see the entry (super admins bypass every check). */
	permission?: string;
	/** Hidden until the visitor has an account. */
	authOnly?: boolean;
};

/** The harmonized Guru AI module map. */
export const NAV: NavItem[] = [
	{ href: "/", label: "Overview", icon: "◈", group: "Explore", blurb: "The Guru AI product tour", shortcut: "O" },
	{ href: "/home", label: "Dashboard", icon: "◧", group: "Workspace", blurb: "Your workspace at a glance" },
	{ href: "/inbox", label: "Messages", icon: "✉", group: "Workspace", blurb: "Private conversations with the team", authOnly: true, permission: "messages.read.participant" },
	{ href: "/notifications", label: "Notifications", icon: "◔", group: "Workspace", blurb: "Updates, security alerts and announcements", authOnly: true },
	{ href: "/notes", label: "Notes", icon: "▤", group: "Workspace", blurb: "Keep-style pin, color and tag notes", shortcut: "N" },
	{ href: "/agents", label: "Agents", icon: "⚙", group: "Workspace", blurb: "Build and run multi-step AI workflows" },
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
	{ href: "/reverse-api", label: "Reverse API Lab", icon: "⟲", group: "Developer", blurb: "HAR → typed API clients + key extractor" },
	{ href: "/connectors", label: "Connector Vault", icon: "⚿", group: "Developer", blurb: "API keys that power every engine" },
	{ href: "/models", label: "GuruRoute", icon: "⇉", group: "Developer", blurb: "Model routing rules per task type" },
	{ href: "/settings", label: "Settings", icon: "◑", group: "Developer", blurb: "Workspace, install, deploy and data" },
	{ href: "/profile", label: "Profile", icon: "◉", group: "Governance", blurb: "Your name, photo and public details", authOnly: true },
	{ href: "/roles", label: "Roles & Access", icon: "⚖", group: "Governance", blurb: "Request roles and see your permissions", authOnly: true },
	{ href: "/subscription", label: "Plan", icon: "◆", group: "Governance", blurb: "Entitlements, usage and plan history", authOnly: true },
	{ href: "/admin", label: "Admin Console", icon: "★", group: "Governance", blurb: "Accounts, approvals, broadcasts, audit", authOnly: true, permission: "admin.users.read" }
];

export const GROUPS = ["Explore", "Workspace", "Intelligence", "Research", "Developer", "Governance"];

/** Primary destinations for the mobile bottom bar. */
export const MOBILE_NAV = ["/home", "/chat", "/images", "/inbox", "/settings"].map((href) => NAV.find((n) => n.href === href)!);