export type ComponentChild =
	| VNode<any>
	| object
	| string
	| number
	| boolean
	| null
	| undefined;
export type ComponentChildren = ComponentChild[] | ComponentChild;

export interface ComponentClass<P = {}, S = {}> {
	new (props: P, context?: any): Component<P, S>;
	displayName?: string;
	defaultProps?: Partial<P>;
	getDerivedStateFromProps?(
		props: Readonly<P>,
		state: Readonly<S>
	): Partial<S> | null;
	getDerivedStateFromError?(error: any): Partial<S> | null;
}

export type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;
export type Key = string | number | any;

interface FunctionComponent<P = {}> {
	(props: RenderableProps<P>, context?: any): VNode<any> | null;
	displayName?: string;
	defaultProps?: Partial<P>;
}

interface Attributes {
	key?: Key;
	jsx?: boolean;
}

type RenderableProps<P, RefType = any> = P &
	Readonly<Attributes & { children?: ComponentChildren }>;

interface VNode<P = {}> {
	type: ComponentType<P> | string;
	props: P & { children: ComponentChildren };
	key: Key;
	/**
	 * The time this `vnode` started rendering. Will only be set when
	 * the devtools are attached.
	 * Default value: `0`
	 */
	startTime?: number;
	/**
	 * The time that the rendering of this `vnode` was completed. Will only be
	 * set when the devtools are attached.
	 * Default value: `-1`
	 */
	endTime?: number;
}

interface Context<T> {
	Consumer: Consumer<T>;
	Provider: Provider<T>;
}

interface Consumer<T>
	extends FunctionComponent<{
		children: (value: T) => ComponentChildren;
	}> {}
interface PreactConsumer<T> extends Consumer<T> {}

interface Provider<T>
	extends FunctionComponent<{
		value: T;
		children: ComponentChildren;
	}> {}

export interface Component<P, S> {
	constructor(props?: P, context?: any);

	displayName?: string;
	defaultProps?: any;
	contextType?: Context<any>;

	// Static members cannot reference class type parameters. This is not
	// supported in TypeScript. Reusing the same type arguments from `Component`
	// will lead to an impossible state where one cannot satisfy the type
	// constraint under no circumstances, see #1356.In general type arguments
	// seem to be a bit buggy and not supported well at the time of this
	// writing with TS 3.3.3333.
	getDerivedStateFromProps?(
		props: Readonly<object>,
		state: Readonly<object>
	): object | null;
	getDerivedStateFromError?(error: any): object | null;

	state: Readonly<S>;
	props: RenderableProps<P>;
	context: any;
	base?: Element | Text;

	// From https://github.com/DefinitelyTyped/DefinitelyTyped/blob/e836acc75a78cf0655b5dfdbe81d69fdd4d8a252/types/react/index.d.ts#L402
	// // We MUST keep setState() as a unified signature because it allows proper checking of the method return type.
	// // See: https://github.com/DefinitelyTyped/DefinitelyTyped/issues/18365#issuecomment-351013257
	setState<K extends keyof S>(
		state:
			| ((
					prevState: Readonly<S>,
					props: Readonly<P>
			  ) => Pick<S, K> | Partial<S> | null)
			| (Pick<S, K> | Partial<S> | null),
		callback?: () => void
	): void;

	forceUpdate(callback?: () => void): void;

	render(
		props?: RenderableProps<P>,
		state?: Readonly<S>,
		context?: any
	): ComponentChild;
}

export interface PreactElement extends HTMLElement, Text {
	_children?: VNode<any> | null;
	/** Event listeners to support event delegation */
	_listeners: Record<string, (e: Event) => void>;

	// Preact uses this attribute to detect SVG nodes
	ownerSVGElement?: SVGElement | null;

	// style: HTMLElement["style"]; // From HTMLElement

	data?: string | number; // From Text node
}
