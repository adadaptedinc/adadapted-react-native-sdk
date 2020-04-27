import * as React from "react";

/**
 * A type that can be null or undefined.
 */
export type nil = null | undefined;

/**
 * Extracts the type of a React component's props from the React component type T.
 * Usage example: type MyComponentProps = ExtractReactPropsType<typeof MyComponent>;
 */
export type ExtractReactPropsType<T> = T extends React.ComponentType<infer P>
    ? P
    : T extends React.Component<infer P>
    ? P
    : never;
