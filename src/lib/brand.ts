/** Shared brand copy. The landing page and the in-app banners read from here so a
 * single edit keeps every inscription unique and consistent. */

export type Slide = {
	src: string;
	srcset: string;
	alt: string;
	eyebrow: string;
	title: string;
	copy: string;
	href: string;
	cta: string;
};

export const SLIDES: Slide[] = [
	{
		src: "/images/generated/promo-slide-01.webp",
		srcset: "/images/responsive/promo-slide-01-640.webp 640w, /images/responsive/promo-slide-01-1024.webp 1024w, /images/generated/promo-slide-01.webp 1536w",
		alt: "A creative director at a glass desk surrounded by a calm arc of glowing workspace panels",
		eyebrow: "One workspace",
		title: "Every AI tool you reach for, finally in one place",
		copy: "Chat, imagery, video, music, diagrams, research, transcripts, converters, notes and agents — harmonised into a single, fast workspace.",
		href: "/home",
		cta: "Open the workspace"
	},
	{
		src: "/images/generated/promo-slide-02.webp",
		srcset: "/images/responsive/promo-slide-02-640.webp 640w, /images/responsive/promo-slide-02-1024.webp 1024w, /images/generated/promo-slide-02.webp 1536w",
		alt: "A research analyst reading a wall of connected question clusters",
		eyebrow: "Research",
		title: "See the questions your market is already asking",
		copy: "Turn one seed phrase into grouped questions, preposition clusters and comparisons — then hand them straight to the writer.",
		href: "/keywords",
		cta: "Explore keywords"
	},
	{
		src: "/images/generated/promo-slide-03.webp",
		srcset: "/images/responsive/promo-slide-03-640.webp 640w, /images/responsive/promo-slide-03-1024.webp 1024w, /images/generated/promo-slide-03.webp 1536w",
		alt: "An operations lead watching a multi-step automated workflow complete",
		eyebrow: "Automation",
		title: "Multi-step agents that finish the work",
		copy: "Chain prompting, humanising, keyword research, imagery and notes into a repeatable agent — then watch each step land live.",
		href: "/agents",
		cta: "Build an agent"
	}
];

export type StoryStage = {
	step: string;
	title: string;
	copy: string;
	image: string;
	alt: string;
};

export const STORY: StoryStage[] = [
	{
		step: "01",
		title: "The scattered morning",
		copy: "A chat window here, an image generator there, a keyword tool in another tab. The work starts before the work does.",
		image: "story-customer",
		alt: "A founder at dawn surrounded by scattered devices and browser windows"
	},
	{
		step: "02",
		title: "The discovery",
		copy: "One workspace opens. The same engines, the same keys you already own — arranged around the way the work actually moves.",
		image: "story-discovery",
		alt: "The founder leaning toward a single calm workspace glowing on a laptop"
	},
	{
		step: "03",
		title: "A guided path",
		copy: "GuruRoute picks the model, the studios share one prompt language, and every run is logged so nothing disappears.",
		image: "story-guide",
		alt: "A person walking beside a glowing pathway of light through a dark gallery"
	},
	{
		step: "04",
		title: "The craft",
		copy: "Humanise the draft, sharpen the questions, generate the visual — without exporting a thing or losing the thread.",
		image: "feature-learning",
		alt: "A writer refining a draft in a warm, book-lined study"
	},
	{
		step: "05",
		title: "The workflow",
		copy: "Automate the repeatable part: research, draft, visual, note. Agents run the steps and show you each result as it lands.",
		image: "feature-workflow",
		alt: "Two colleagues mapping a content workflow on a glass wall"
	},
	{
		step: "06",
			title: "The outcome",
		copy: "A complete ecosystem of modules, one set of credentials, and a workspace your whole team can trust.",
		image: "dashboard-ecosystem",
		alt: "An abstract ecosystem of translucent panels arranged around a glowing core"
	}
];

export type Feature = { title: string; copy: string; image: string; alt: string; href: string };

export const FEATURES: Feature[] = [
	{
		title: "A human voice, on demand",
		copy: "The humanizer rewrites machine text into prose that reads like a person wrote it — tone, rhythm and specificity intact.",
		image: "feature-learning",
		alt: "A writer editing a document in a warm study",
		href: "/humanizer"
	},
	{
		title: "Workflows that keep running",
		copy: "Build an agent from prompts, humanising, keyword research, images and notes. Run it again tomorrow with one click.",
		image: "feature-workflow",
		alt: "Colleagues mapping a workflow on a glass wall",
		href: "/agents"
	},
	{
		title: "Built for a team, not a tab",
		copy: "Shared workspaces, role-based access, private support conversations, announcements and an audit trail that proves who did what.",
		image: "feature-community",
		alt: "A diverse community of makers sharing work around a table",
		href: "/roles"
	}
];

export type Banner = {
	id: string;
	eyebrow: string;
	title: string;
	inscription: string;
	variant: "mesh" | "orbit" | "grid" | "wave" | "bars" | "rings";
};

/** One banner, one inscription, one route. Nothing is reused. */
export const BANNERS: Record<string, Banner> = {
	chat: {
		id: "banner-chat",
		eyebrow: "Intelligence",
		title: "One thread, every model",
		inscription: "GuruRoute chooses the engine; you keep the conversation.",
		variant: "mesh"
	},
	images: {
		id: "banner-images",
		eyebrow: "Image Studio",
		title: "Describe it. See it.",
		inscription: "Your prompt, the DeepAI engine, a finished visual in seconds.",
		variant: "orbit"
	},
	keywords: {
		id: "banner-keywords",
		eyebrow: "Research",
		title: "Questions people actually ask",
		inscription: "Seed one phrase; surface the questions, prepositions and comparisons around it.",
		variant: "grid"
	},
	transcript: {
		id: "banner-transcript",
		eyebrow: "Transcripts",
		title: "Every word, searchable",
		inscription: "Paste a link, get the transcript and the summary you can act on.",
		variant: "wave"
	},
	notes: {
		id: "banner-notes",
		eyebrow: "Memory",
		title: "Notes that stay put",
		inscription: "Pin, colour and tag the thinking you cannot afford to lose.",
		variant: "bars"
	},
	admin: {
		id: "banner-admin",
		eyebrow: "Governance",
		title: "Control with a paper trail",
		inscription: "Roles, plans, messages and broadcasts — every decision recorded.",
		variant: "rings"
	}
};

export const TRUST = [
	{ value: "18", label: "harmonised modules" },
	{ value: "5", label: "creative studios" },
	{ value: "3", label: "engine families" },
	{ value: "1", label: "set of credentials" }
];