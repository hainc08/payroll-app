import { useMemo } from 'react';
import { theme } from 'antd';

export default function useWireframeTokens() {
  const { token } = theme.useToken();

  return useMemo(
    () => ({
      '--font': "'IBM Plex Sans', sans-serif",
      '--font-mono': "'IBM Plex Mono', monospace",
      '--bg-base': token.colorBgLayout || token.colorBgBase || token.colorBgContainer,
      '--bg-surface': token.colorBgContainer,
      '--bg-elevated': token.colorBgElevated,
      '--bg-overlay': token.colorFillAlter,
      '--border': token.colorBorder,
      '--border-light': token.colorBorderSecondary || token.colorBorder,
      '--text-primary': token.colorText,
      '--text-secondary': token.colorTextSecondary,
      '--text-muted': token.colorTextTertiary || token.colorTextQuaternary || token.colorTextSecondary,
      '--blue': token.colorInfo,
      '--blue-bg': token.colorInfoBg,
      '--blue-border': token.colorInfoBorder,
      '--green': token.colorSuccess,
      '--green-bg': token.colorSuccessBg,
      '--green-border': token.colorSuccessBorder,
      '--yellow': token.colorWarning,
      '--yellow-bg': token.colorWarningBg,
      '--yellow-border': token.colorWarningBorder,
      '--red': token.colorError,
      '--red-bg': token.colorErrorBg,
      '--red-border': token.colorErrorBorder,
      '--purple': token.colorPrimaryHover,
      '--purple-bg': token.colorPrimaryBg,
      '--radius-sm': '4px',
      '--radius-md': '6px',
      '--radius-lg': '10px',
      '--radius-xl': '14px',
      '--sidebar-w': '210px',
      '--topbar-h': '52px',
    }),
    [token]
  );
}

