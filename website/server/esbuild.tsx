/** @jsx createElement */
import {promises as fs} from "fs";
import * as path from "path";
import * as ESBuild from "esbuild";
import {createElement} from "@b9g/crank/crank.js";
import type {Children, Context} from "@b9g/crank/crank.js";
import postcssPlugin from "./postcss-plugin.js";
import postcssPresetEnv from "postcss-preset-env";
import postcssNested from "postcss-nested";

function isWithinDir(dir: string, name: string) {
	const resolved = path.resolve(dir, name);
	return resolved.startsWith(dir);
}

type CachedResult = ESBuild.BuildResult & {
	outputFiles: Array<ESBuild.OutputFile>;
};

// TODO: better names for these options
export interface StorageOptions {
	dirname: string;
	publicPath?: string | undefined;
}

export class Storage {
	dirname: string;
	publicPath: string;
	cache: Map<string, CachedResult>;

	constructor({dirname, publicPath = "/static/"}: StorageOptions) {
		if (!path.isAbsolute(dirname)) {
			throw new Error(`path (${dirname}) is not absolute`);
		}

		this.dirname = path.normalize(dirname);
		this.publicPath = publicPath;
		this.cache = new Map();
	}

	async build(filename: string): Promise<Array<ESBuild.OutputFile>> {
		let result = this.cache.get(filename);
		if (result != null) {
			return result.outputFiles;
		} else if (!isWithinDir(this.dirname, filename)) {
			throw new Error("filename outside directory");
		}

		const entryname = path.resolve(this.dirname, filename);
		result = await ESBuild.build({
			entryPoints: [entryname],
			entryNames: "[name]-[hash]",
			bundle: true,
			write: false,
			minify: false,
			allowOverwrite: true,
			outbase: this.dirname,
			outdir: this.dirname,
			sourcemap: true,
			plugins: [
				postcssPlugin({plugins: [postcssPresetEnv() as any, postcssNested()]}),
			],
			watch: {
				onRebuild: (error, result) => {
					if (error) {
						console.error(error);
					} else {
						this.cache.set(filename, result as CachedResult);
					}
				},
			},
		});

		this.cache.set(filename, result);
		return result.outputFiles;
	}

	async url(filename: string, extension: string): Promise<string> {
		const outputs = await this.build(filename);
		const output = outputs.find((output) => output.path.endsWith(extension));
		if (!output) {
			// TODO: More descriptive error message
			throw new Error("Unknown extension");
		}

		return path.posix.join(
			this.publicPath,
			path.relative(this.dirname, output.path),
		);
	}

	async write(dirname: string): Promise<void> {
		const outputs = Array.from(this.cache.values()).flatMap(
			(result) => result.outputFiles,
		);

		await Promise.all(
			outputs.map(async (output) => {
				const filename = path.join(
					dirname,
					path.relative(this.dirname, output.path),
				);

				await fs.writeFile(filename, output.contents);
			}),
		);
	}

	clear(): void {
		for (const result of this.cache.values()) {
			result.stop!();
		}
	}
}

const StorageKey = Symbol.for("esbuild.StorageKey");
declare global {
	namespace Crank {
		interface ProvisionMap {
			[StorageKey]: Storage;
		}
	}
}

export interface PageProps {
	storage: Storage;
	children: Children;
}

export function* Page(this: Context, {storage, children}: PageProps) {
	this.provide(StorageKey, storage);
	let newStorage: Storage;
	for ({storage: newStorage} of this) {
		if (storage !== newStorage) {
			this.provide(StorageKey, newStorage);
			storage = newStorage;
		}

		yield children;
	}
}

export async function Script(this: Context, props: Record<string, any>) {
	const storage = this.consume(StorageKey);
	if (storage == null) {
		throw new Error("Storage not found");
	}

	let src: string;
	({src, ...props} = props);
	src = await storage.url(src, ".js");
	return <script src={src} {...props} />;
}

export async function Link(this: Context, props: Record<string, any>) {
	const storage = this.consume(StorageKey);
	if (storage == null) {
		throw new Error("Storage not found");
	}

	let href: string;
	let rel: string;
	({href, rel = "stylesheet", ...props} = props);
	href = await storage.url(href, ".css");
	return <link href={href} rel={rel} {...props} />;
}
