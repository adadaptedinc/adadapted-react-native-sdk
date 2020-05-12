/**
 * Global imports and initialization for Jest unit tests.
 * @module
 */
// React depends on "requestAnimationFrame", which does not exist in the Node environment.
// This polyfill meets the requirements of React.
// NOTE: raf/polyfill must be imported BEFORE enzyme to avoid warnings about React depending on requestAnimationFrame.
import "raf/polyfill";
import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

/**
 * Set up Enzyme to mount to DOM, simulate events,
 * and inspect the DOM in tests.
 */
Enzyme.configure({ adapter: new Adapter() });
