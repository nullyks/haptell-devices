import { defineConfig } from "vitepress";

const repository = "https://github.com/nullyks/haptell-devices";

export default defineConfig({
  base: "/haptell-devices/",
  lang: "en",
  title: "Haptell Devices",
  description: "Wiring, firmware and first tests for the Haptell haptic prototypes.",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "Start here", link: "/start" },
      { text: "Devices", link: "/devices/" },
      { text: "Tools", link: "/tools" },
      { text: "Troubleshooting", link: "/troubleshooting" },
      { text: "Reference", link: "/reference" },
    ],
    sidebar: [
      {
        text: "Get started",
        items: [
          { text: "Arduino and WiFi setup", link: "/start" },
          { text: "Compare devices", link: "/devices/" },
        ],
      },
      {
        text: "Device guides",
        items: [
          { text: "01 · Coin vibration motor", link: "/devices/haptell-01" },
          { text: "02 · Choose an LRA variant", link: "/devices/haptell-02" },
          { text: "02 · DRV2605L + VG1040003D", link: "/devices/haptell-02-drv2605l" },
          { text: "02 · PAM8403 + VG2230001H", link: "/devices/haptell-02-pam8403" },
          { text: "03 · Audio exciter", link: "/devices/haptell-03" },
          { text: "04 · Three vibration motors", link: "/devices/haptell-04" },
          { text: "05 · Weighted servo", link: "/devices/haptell-05" },
          { text: "06 · Single Peltier", link: "/devices/haptell-06" },
          { text: "07 · Dual Peltier", link: "/devices/haptell-07" },
        ],
      },
      {
        text: "Tools and reference",
        items: [
          { text: "Find a sender or editor", link: "/tools" },
          { text: "Troubleshooting", link: "/troubleshooting" },
          { text: "Reference overview", link: "/reference" },
          { text: "Firmware compatibility", link: "/firmware-variants" },
          { text: "UDP commands", link: "/command-protocol" },
        ],
      },
    ],
    search: { provider: "local" },
    socialLinks: [{ icon: "github", link: repository }],
    editLink: {
      pattern: `${repository}/edit/main/docs/:path`,
      text: "Edit this page on GitHub",
    },
  },
});
