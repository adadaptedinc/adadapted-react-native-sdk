/**
 * Global imports and initialization for Jest unit tests.
 * @module
 */
// React depends on "requestAnimationFrame", which does not exist in the Node environment.
// This polyfill meets the requirements of React.
// NOTE: raf/polyfill must be imported BEFORE enzyme to avoid warnings about React depending on requestAnimationFrame.
import "raf/polyfill";
import Enzyme from "enzyme";
import * as ReactSeventeenAdapter from "@wojtekmaj/enzyme-adapter-react-17";
// TODO: Enable this again when enzyme-adapter-react-17 is released
//  and remove the @wojtekmaj/enzyme-adapter-react-17 package.
// import * as Adapter from "enzyme-adapter-react-16";

// Enzyme must be configured with the correct React adapter before we can use it.
Enzyme.configure({ adapter: new (ReactSeventeenAdapter as any)() });

// TODO: Enable this again when enzyme-adapter-react-17 is released
//  and remove the @wojtekmaj/enzyme-adapter-react-17 package.
// Enzyme.configure({ adapter: new Adapter() });
