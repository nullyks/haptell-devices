import DefaultTheme from "vitepress/theme";
import WiringDiagram from "./WiringDiagram.vue";
import "./style.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("WiringDiagram", WiringDiagram);
  },
};
