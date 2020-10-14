export var HookType;
(function (HookType) {
    HookType[HookType["useState"] = 1] = "useState";
    HookType[HookType["useReducer"] = 2] = "useReducer";
    HookType[HookType["useEffect"] = 3] = "useEffect";
    HookType[HookType["useLayoutEffect"] = 4] = "useLayoutEffect";
    HookType[HookType["useRef"] = 5] = "useRef";
    HookType[HookType["useImperativeHandle"] = 6] = "useImperativeHandle";
    HookType[HookType["useMemo"] = 7] = "useMemo";
    HookType[HookType["useCallback"] = 8] = "useCallback";
    HookType[HookType["useContext"] = 9] = "useContext";
    HookType[HookType["useErrorBoundary"] = 10] = "useErrorBoundary";
    // Not a real hook, but the devtools treat is as such
    HookType[HookType["useDebugvalue"] = 11] = "useDebugvalue";
})(HookType || (HookType = {}));
