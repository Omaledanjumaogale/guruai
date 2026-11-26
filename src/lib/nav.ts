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
	{ href: "/home", label: "Dashboard", icon: "home", group: "Workspace", blurb: "Your workspace at a glance" },
	{ href: "/chat", label: "Chat", icon: "chat", group: "Workspace", blurb: "Multi-model AI chat with GuruRoute", shortcut: "C" },
	{ href: "/notes", label: "Notes", icon: "notes", group: "Workspace", blurb: "Keep-style pin, color and tag notes", shortcut: "N" },
	{ href: "/agents", label: "Agents", icon: "agents", group: "Workspace", blurb: "Build and run multi-step AI workflows" },
	{ href: "/inbox", label: "Messages", icon: "inbox", group: "Workspace", blurb: "Private conversations with the team", authOnly: true, permission: "messages.read.participant" },
	{ href: "/notifications", label: "Notifications", icon: "notifications", group: "Workspace", blurb: "Updates, security alerts and announcements", authOnly: true },

	{ href: "/images", label: "Image Studio", icon: "images", group: "Studios", blurb: "Text-to-image generation (DeepAI engine)" },
	{ href: "/video", label: "Video Studio", icon: "video", group: "Studios", blurb: "Text-to-video generation" },
	{ href: "/music", label: "Music Studio", icon: "music", group: "Studios", blurb: "Text-to-music generation" },
	{ href: "/visuals", label: "Visuals", icon: "visuals", group: "Studios", blurb: "Turn text into diagrams (Napkin-style)" },
	{ href: "/humanizer", label: "Humanizer", icon: "humanizer", group: "Studios", blurb: "Rewrite AI text into natural human prose" },
	{ href: "/tools", label: "AI Toolbox", icon: "tools", group: "Studios", blurb: "Model grid: summarize, translate, analyze" },

	{ href: "/keywords", label: "Keywords", icon: "keywords", group: "Research", blurb: "Seed → question & comparison clusters" },
	{ href: "/transcript", label: "Transcripts", icon: "transcript", group: "Research", blurb: "YouTube video → transcript + summary" },
	{ href: "/convert", label: "Convert", icon: "convert", group: "Research", blurb: "Images, JSON/CSV/YAML, base64, units" },

	{ href: "/reverse-api", label: "Reverse API Lab", icon: "reverse-api", group: "Platform", blurb: "HAR → typed API clients + key extractor" },
	{ href: "/connectors", label: "Connector Vault", icon: "connectors", group: "Platform", blurb: "API keys that power every engine" },
	{ href: "/models", label: "GuruRoute", icon: "models", group: "Platform", blurb: "Model routing rules per task type" },
	{ href: "/analytics", label: "Analytics", icon: "analytics", group: "Platform", blurb: "Usage, reliability and workspace trends", authOnly: true },

	{ href: "/hub", label: "E-WIN Hub", icon: "hub", group: "Organization", blurb: "Central ecosystem identity and sync", authOnly: true },
	{ href: "/team", label: "Team", icon: "team", group: "Organization", blurb: "Directory, roles and plan coverage", authOnly: true, permission: "admin.users.read" },
	{ href: "/activity", label: "Activity", icon: "activity", group: "Organization", blurb: "Your audit trail and workspace usage", authOnly: true },
	{ href: "/security", label: "Security", icon: "security", group: "Organization", blurb: "Sessions, identity and account safety", authOnly: true },
	{ href: "/admin", label: "Admin Console", icon: "admin", group: "Organization", blurb: "Accounts, approvals, broadcasts, audit", authOnly: true, permission: "admin.users.read" },

	{ href: "/profile", label: "Profile", icon: "profile", group: "Account", blurb: "Your name, photo and public details", authOnly: true },
	{ href: "/roles", label: "Roles & Access", icon: "roles", group: "Account", blurb: "Request roles and see your permissions", authOnly: true },
	{ href: "/subscription", label: "Plan", icon: "subscription", group: "Account", blurb: "Entitlements, usage and plan history", authOnly: true },
	{ href: "/settings", label: "Settings", icon: "settings", group: "Account", blurb: "Workspace, install, deploy and data" }
];

export const GROUPS = ["Workspace", "Studios", "Research", "Platform", "Organization", "Account"];

/** Primary destinations for the mobile bottom bar. */
export const MOBILE_NAV = ["/home", "/chat", "/images", "/inbox", "/settings"].map((href) => NAV.find((n) => n.href === href)!);
