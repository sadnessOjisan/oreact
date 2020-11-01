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

export type PropsType = {
	// createElementのoption
	is?: string;
	// form
	checked?: any;
	// form
	value?: any;
};

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
	type: string | ComponentFactory<P>;
	props: P & { children: ComponentChildren };
	_children: Array<VNode<any>> | null;
	_parent: VNode | null;
	_depth: number | null;
	/**
	 * The [first (for Fragments)] DOM child of a VNode
	 */
	_dom: PreactElement | null;
	/**
	 * The last dom child of a Fragment, or components that return a Fragment
	 */
	_nextDom: PreactElement | null;
	_component: Component | null;
	_hydrating: boolean | null;
	constructor: undefined;
	// 初回レンダリングでは与えられないが、renderComponent から詰め込まれていく
	_original?: VNode | null | string | number;
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

export interface Component<P = {}, S = {}> {
	// When component is functional component, this is reset to functional component
	constructor: preact.ComponentType<P>;
	state: S; // Override Component["state"] to not be readonly for internal use, specifically Hooks
	base?: PreactElement;

	_dirty: boolean;
	_force?: boolean;
	_renderCallbacks: Array<Component>; // Component は実質 () => void
	_globalContext?: any;
	_vnode?: VNode<P> | null;
	// setStateが呼ばれるとこの値に置き換える
	_nextState?: S | null; // Only class components
	/** Only used in the devtools to later dirty check if state has changed */
	_prevState?: S | null;
	/**
	 * Pointer to the parent dom node. This is only needed for top-level Fragment
	 * components or array returns.
	 */
	_parentDom?: PreactElement | null;
	// Always read, set only when handling error
	_processingException?: Component<any, any> | null;
	// Always read, set only when handling error. This is used to indicate at diffTime to set _processingException
	_pendingError?: Component<any, any> | null;
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
