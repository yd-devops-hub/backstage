/** BUI CSS custom properties for the Aperture theme (light and dark modes). */
export const apertureBuiCss = `
:root,
[data-theme-mode='light'] {
  --bui-font-regular: Roboto, sans-serif;
  --bui-font-weight-regular: 400;
  --bui-font-weight-bold: 700;
  --bui-black: #000;
  --bui-white: #fff;
  --bui-fg-primary: #172B48;
  --bui-fg-secondary: #6E6E6E;
  --bui-fg-disabled: rgba(0, 0, 0, 0.38);
  --bui-fg-solid: #fff;
  --bui-fg-solid-disabled: rgba(0, 0, 0, 0.38);
  --bui-fg-danger: #FF5630;
  --bui-fg-warning: #FFAB00;
  --bui-fg-success: #36B37E;
  --bui-fg-info: #0065FF;
  --bui-fg-danger-on-bg: #DE350B;
  --bui-fg-warning-on-bg: #FF8B00;
  --bui-fg-success-on-bg: #006644;
  --bui-fg-info-on-bg: #0747A6;
  --bui-bg-app: #FFFFFF;
  --bui-bg-neutral-1: #fff;
  --bui-bg-neutral-2: #FFFFFF;
  --bui-bg-neutral-3: #FFFFFF;
  --bui-bg-solid: #0052CC;
  --bui-bg-solid-hover: rgb(12, 63, 141);
  --bui-bg-solid-pressed: #172B4D;
  --bui-bg-solid-disabled: rgba(0, 0, 0, 0.12);
  --bui-bg-danger: #FF8F73;
  --bui-bg-warning: #FFE380;
  --bui-bg-success: #79F2C0;
  --bui-bg-info: #4C9AFF;
  --bui-border-danger: #FF5630;
  --bui-border-warning: #FFAB00;
  --bui-border-success: #36B37E;
  --bui-border-info: #0065FF;
  --bui-border-2: #E6E6E6;
  --bui-ring: #FFFBCC;
}

[data-theme-mode='dark'] {
  --bui-font-regular: Roboto, sans-serif;
  --bui-font-weight-regular: 400;
  --bui-font-weight-bold: 700;
  --bui-fg-primary: #fff;
  --bui-fg-secondary: #CCCCCC;
  --bui-fg-disabled: rgba(255, 255, 255, 0.5);
  --bui-fg-solid: rgba(0, 0, 0, 0.87);
  --bui-fg-solid-disabled: rgba(255, 255, 255, 0.5);
  --bui-fg-danger: #f44336;
  --bui-fg-warning: #ffa726;
  --bui-fg-success: #66bb6a;
  --bui-fg-info: #29b6f6;
  --bui-fg-danger-on-bg: #d32f2f;
  --bui-fg-warning-on-bg: #f57c00;
  --bui-fg-success-on-bg: #388e3c;
  --bui-fg-info-on-bg: #0288d1;
  --bui-bg-app: #333333;
  --bui-bg-neutral-1: #424242;
  --bui-bg-neutral-2: #333333;
  --bui-bg-neutral-3: #333333;
  --bui-bg-solid: #2684FF;
  --bui-bg-solid-hover: rgb(38, 116, 219);
  --bui-bg-solid-pressed: #0052CC;
  --bui-bg-solid-disabled: rgba(255, 255, 255, 0.12);
  --bui-bg-danger: #e57373;
  --bui-bg-warning: #ffb74d;
  --bui-bg-success: #81c784;
  --bui-bg-info: #4fc3f7;
  --bui-border-danger: #f44336;
  --bui-border-warning: #ffa726;
  --bui-border-success: #66bb6a;
  --bui-border-info: #29b6f6;
  --bui-border-2: #555555;
  --bui-ring: #FFFBCC;
}
`;
