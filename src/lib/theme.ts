import { get, writable } from "svelte/store";

export type Theme = "dark" | "light";
const KEY = "guru.theme";

function initial(): Theme {
	if (typeof localStorage === "undefined") return "dark";
	return localStorage.getItem(KEY) === "light" ? "light" : "dark";
}

export const theme = writable<Theme>(initial());

function apply(value: Theme) {
	if (typeof document === "undefined") return;
	document.documentElement.dataset.theme = value;
	document.documentElement.style.colorScheme = value;
	localStorage.setItem(KEY, value);
	const meta = document.querySelector('meta[name="theme-color"]');
	if (meta) meta.setAttribute("content", value === "light" ? "#f5f4ef" : "#060607");
}

if (typeof document !== "undefined") {
	apply(get(theme));
	theme.subscribe(apply);
}

export function toggleTheme(): void {
	theme.update((value) => (value === "dark" ? "light" : "dark"));
}

export function setTheme(value: Theme): void {
	theme.set(value);
}
